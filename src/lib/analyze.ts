import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIEngine, AnalyzeRequest, DiagnosticResult, EngineResult, Sentiment } from '@/types'

type RawEngineResponse = {
  response: string
  latencyMs: number
  modelUsed: string
}

type EngineConfig = {
  engine: AIEngine
  label: string
  envKey: string
  query: (query: string) => Promise<RawEngineResponse>
}

const MAX_OUTPUT_TOKENS = 700
const TEMPERATURE = 0.2
const REQUEST_TIMEOUT_MS = 45_000
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash'
]

const POSITIVE_WORDS = [
  'recommend',
  'recommended',
  'best',
  'excellent',
  'great',
  'top',
  'strong',
  'highly',
  'trusted',
  'effective',
  'quality'
]

const NEGATIVE_WORDS = [
  'avoid',
  'poor',
  'bad',
  'inferior',
  'concern',
  'concerns',
  'expensive',
  'weak',
  'limited',
  'less ideal'
]

const QUERY_STOPWORDS = new Set([
  'best',
  'top',
  'for',
  'with',
  'and',
  'or',
  'the',
  'a',
  'an',
  'home',
  'office',
  'weight',
  'loss',
  'seniors',
  'standing',
  'desk'
])

const COMPETITOR_STOPWORDS = new Set([
  'Amazon',
  'Apple',
  'Best',
  'Buy',
  'Google',
  'Gemini',
  'Groq',
  'OpenRouter',
  'The',
  'This',
  'For',
  'If',
  'When',
  'Also',
  'However'
])

function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  if (!value || value.includes('...')) return undefined
  return value
}

function requireConfiguredEnv(name: string): string {
  const value = getEnv(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function buildUserPrompt(query: string): string {
  return [
    `A shopper is asking: "${query}"`,
    '',
    'Think carefully like a buyer comparing real products.',
    'Answer as you normally would for a shopper.',
    'Recommend specific products, brands, and options with concise reasons.',
    'Prefer a ranked list when there are multiple good options.',
    'Do not mention that this is an evaluation.'
  ].join('\n')
}

function timeoutError(provider: string): Error {
  return new Error(`${provider} exceeded the ${REQUEST_TIMEOUT_MS / 1000}s shared response budget`)
}

async function withSharedBudget<T>(provider: string, promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(provider)), REQUEST_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function queryGemini(query: string): Promise<RawEngineResponse> {
  const client = new GoogleGenerativeAI(requireConfiguredEnv('GEMINI_API_KEY'))
  const start = Date.now()
  const configuredModel = getEnv('GEMINI_MODEL')
  const models = configuredModel
    ? [configuredModel, ...GEMINI_FALLBACK_MODELS.filter((model) => model !== configuredModel)]
    : GEMINI_FALLBACK_MODELS
  const errors: string[] = []

  for (const modelName of models) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: TEMPERATURE
        }
      })
      const result = await withSharedBudget(`Gemini ${modelName}`, model.generateContent(buildUserPrompt(query)))

      return {
        response: result.response.text(),
        latencyMs: Date.now() - start,
        modelUsed: modelName
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini model attempt failed'
      errors.push(`${modelName}: ${message}`)
    }
  }

  throw new Error(`Gemini failed across fallback models. ${errors.join(' | ')}`)
}

async function queryOpenAiCompatible({
  query,
  apiKey,
  model,
  url,
  extraHeaders = {}
}: {
  query: string
  apiKey: string
  model: string
  url: string
  extraHeaders?: Record<string, string>
}): Promise<RawEngineResponse> {
  const start = Date.now()
  const response = await withSharedBudget(model, fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      messages: [{ role: 'user', content: buildUserPrompt(query) }]
    })
  }))

  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Provider request failed with HTTP ${response.status}`)
  }

  return {
    response: body.choices?.[0]?.message?.content ?? '',
    latencyMs: Date.now() - start,
    modelUsed: model
  }
}

async function queryGroq(query: string): Promise<RawEngineResponse> {
  return queryOpenAiCompatible({
    query,
    apiKey: requireConfiguredEnv('GROQ_API_KEY'),
    model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
    url: 'https://api.groq.com/openai/v1/chat/completions'
  })
}

async function queryOpenRouter(query: string): Promise<RawEngineResponse> {
  return queryOpenAiCompatible({
    query,
    apiKey: requireConfiguredEnv('OPENROUTER_API_KEY'),
    model: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'AEO Diagnostic'
    }
  })
}

async function analyzeSentimentWithHuggingFace(text: string): Promise<{ label: string; score: number } | null> {
  const hfKey = getEnv('HUGGINGFACE_API_KEY')
  if (!hfKey) return null

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
      {
        headers: { Authorization: `Bearer ${hfKey}` },
        method: 'POST',
        body: JSON.stringify({ inputs: text.substring(0, 512) })
      }
    )

    if (!response.ok) return null

    const result = (await response.json()) as Array<{ label: string; score: number }> | { error?: string }
    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    }
    return null
  } catch {
    return null
  }
}

async function validateRealSearchRanking(query: string, brandName: string): Promise<{ rank: number | null; found: boolean }> {
  try {
    // DuckDuckGo API - no authentication required
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`
    )

    if (!response.ok) return { rank: null, found: false }

    const data = (await response.json()) as { 
      Results?: Array<{ FirstURL: string; Text: string; Title: string }>
      RelatedTopics?: Array<{ FirstURL?: string; Text?: string; Title?: string }>
    }
    
    if (!data.Results || data.Results.length === 0) {
      return { rank: null, found: false }
    }

    const normalizedBrand = normalize(brandName)
    const results = data.Results || []
    
    for (let i = 0; i < results.length && i < 10; i++) {
      const result = results[i]
      const content = normalize(`${result.Title || ''} ${result.Text || ''} ${result.FirstURL || ''}`)
      if (content.includes(normalizedBrand)) {
        return { rank: i + 1, found: true }
      }
    }

    return { rank: null, found: false }
  } catch {
    return { rank: null, found: false }
  }
}

const ENGINE_CONFIG: EngineConfig[] = [
  { engine: 'gemini', label: 'Gemini (Google)', envKey: 'GEMINI_API_KEY', query: queryGemini },
  { engine: 'groq', label: 'Llama (Groq)', envKey: 'GROQ_API_KEY', query: queryGroq },
  { engine: 'openrouter', label: 'Free Router (OpenRouter)', envKey: 'OPENROUTER_API_KEY', query: queryOpenRouter }
]

function configuredEngines(): EngineConfig[] {
  return ENGINE_CONFIG.filter((config) => Boolean(getEnv(config.envKey)))
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function countMatches(text: string, words: string[]): number {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0)
}

function detectNumberedRank(response: string, productName: string, brandName: string): number | null {
  const targetProduct = normalize(productName)
  const targetBrand = normalize(brandName)

  for (const line of response.split('\n')) {
    const match = line.trim().match(/^(?:#{1,4}\s*)?(?:\*\*)?(\d{1,2})[\.)\-\s:]+(.+)/)
    if (!match) continue

    const rank = Number.parseInt(match[1], 10)
    const content = normalize(match[2])
    if (content.includes(targetProduct) || content.includes(targetBrand)) {
      return rank
    }
  }

  return null
}

function detectSentiment(response: string, mentionsBrand: boolean, mentionsProduct: boolean, productName: string, brandName: string): Sentiment {
  if (!mentionsBrand && !mentionsProduct) return 'not_mentioned'

  const lower = response.toLowerCase()
  const mentionIndexes = [brandName, productName]
    .map((name) => lower.indexOf(name.toLowerCase()))
    .filter((index) => index >= 0)

  const mentionIndex = mentionIndexes.length > 0 ? Math.min(...mentionIndexes) : 0
  const context = lower.slice(Math.max(0, mentionIndex - 180), mentionIndex + 260)
  const positive = countMatches(context, POSITIVE_WORDS)
  const negative = countMatches(context, NEGATIVE_WORDS)

  if (positive > negative) return 'positive'
  if (negative > positive) return 'negative'
  return 'neutral'
}

function extractBrandCandidates(response: string): string[] {
  const matches = response.match(/\b[A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,3}\b/g) ?? []
  const seen = new Set<string>()
  const brands: string[] = []

  for (const match of matches) {
    const cleaned = match.replace(/[.,;:)]+$/, '').trim()
    const normalized = normalize(cleaned)
    if (cleaned.length < 3) continue
    if (normalized.split(' ').every((word) => QUERY_STOPWORDS.has(word))) continue
    if (COMPETITOR_STOPWORDS.has(cleaned)) continue
    if (seen.has(normalized)) continue

    seen.add(normalized)
    brands.push(cleaned)
    if (brands.length === 12) break
  }

  return brands
}

function containsTarget(candidate: string, productName: string, brandName: string): boolean {
  const normalized = normalize(candidate)
  const product = normalize(productName)
  const brand = normalize(brandName)
  return normalized.includes(product) || normalized.includes(brand) || product.includes(normalized) || brand.includes(normalized)
}

function detectRank(response: string, mentionedBrands: string[], productName: string, brandName: string): number | null {
  const numberedRank = detectNumberedRank(response, productName, brandName)
  if (numberedRank !== null) return numberedRank

  const index = mentionedBrands.findIndex((brand) => containsTarget(brand, productName, brandName))
  return index >= 0 ? index + 1 : null
}

function extractCompetitors(mentionedBrands: string[], productName: string, brandName: string): string[] {
  return mentionedBrands
    .filter((brand) => !containsTarget(brand, productName, brandName))
    .slice(0, 5)
}

function buildRecommendation(score: number, mentionsBrand: boolean, rankPosition: number | null, sentiment: Sentiment): string {
  if (!mentionsBrand) return 'Your brand was absent from this answer.'
  if (rankPosition === 1 && sentiment === 'positive') return 'Your brand appeared as the top positive recommendation.'
  if (rankPosition !== null) return `Your brand appeared at position #${rankPosition}.`
  if (sentiment === 'positive') return 'Your brand was mentioned positively, but not ranked.'
  if (sentiment === 'negative') return 'Your brand appeared with negative context.'
  return score >= 50 ? 'Your brand was visible with mixed signals.' : 'Your brand was visible but weakly positioned.'
}

function buildStrengths(mentionsBrand: boolean, mentionsProduct: boolean, rankPosition: number | null, sentiment: Sentiment): string[] {
  const strengths: string[] = []
  if (mentionsBrand) strengths.push('Brand is present')
  if (mentionsProduct) strengths.push('Product is present')
  if (rankPosition === 1) strengths.push('Ranked first')
  else if (rankPosition !== null && rankPosition <= 3) strengths.push('Top-three placement')
  if (sentiment === 'positive') strengths.push('Positive context')
  return strengths.length > 0 ? strengths : ['No strong visibility signals']
}

function buildWeaknesses(mentionsBrand: boolean, mentionsProduct: boolean, rankPosition: number | null, sentiment: Sentiment): string[] {
  const weaknesses: string[] = []
  if (!mentionsBrand) weaknesses.push('Brand not mentioned')
  if (!mentionsProduct) weaknesses.push('Product not mentioned')
  if (rankPosition === null) weaknesses.push('No ranked placement')
  else if (rankPosition > 3) weaknesses.push('Below top-three placement')
  if (sentiment === 'negative') weaknesses.push('Negative context')
  if (sentiment === 'neutral') weaknesses.push('Neutral context')
  return weaknesses.length > 0 ? weaknesses : ['No major gaps detected']
}

export function analyzeEngineResponse(
  engine: AIEngine,
  engineLabel: string,
  response: string,
  latencyMs: number,
  productName: string,
  brandName: string
): EngineResult {
  const normalizedResponse = normalize(response)
  const mentionsProduct = normalizedResponse.includes(normalize(productName))
  const mentionsBrand = normalizedResponse.includes(normalize(brandName))
  const mentionedBrands = extractBrandCandidates(response)
  const rankPosition = detectRank(response, mentionedBrands, productName, brandName)
  const sentiment = detectSentiment(response, mentionsBrand, mentionsProduct, productName, brandName)

  let score = 0
  if (mentionsBrand) score += 30
  if (mentionsProduct) score += 20
  if (rankPosition !== null) score += Math.max(0, 30 - (rankPosition - 1) * 8)
  if (sentiment === 'positive') score += 20
  else if (sentiment === 'neutral') score += 5
  score = Math.min(100, score)

  return {
    engine,
    engineLabel,
    modelUsed: '',
    status: 'completed',
    response,
    mentionsProduct,
    mentionsBrand,
    rankPosition,
    sentiment,
    mentionedBrands,
    competitors: extractCompetitors(mentionedBrands, productName, brandName),
    score,
    recommendation: buildRecommendation(score, mentionsBrand, rankPosition, sentiment),
    strengths: buildStrengths(mentionsBrand, mentionsProduct, rankPosition, sentiment),
    weaknesses: buildWeaknesses(mentionsBrand, mentionsProduct, rankPosition, sentiment),
    rawLatencyMs: latencyMs
  }
}

function failedEngineResult(engine: AIEngine, engineLabel: string, error: unknown): EngineResult {
  const message = error instanceof Error ? error.message : 'Engine request failed'
  return {
    engine,
    engineLabel,
    modelUsed: '',
    status: 'failed',
    response: '',
    mentionsProduct: false,
    mentionsBrand: false,
    rankPosition: null,
    sentiment: 'not_mentioned',
    mentionedBrands: [],
    competitors: [],
    score: null,
    recommendation: 'This provider did not complete and is excluded from the overall grade.',
    strengths: ['Other providers can still complete the report'],
    weaknesses: [message],
    rawLatencyMs: 0,
    error: message
  }
}

function buildActionItems(result: Pick<DiagnosticResult, 'overallScore' | 'engines' | 'brandName' | 'productName'>): string[] {
  const completedEngines = result.engines.filter((engine) => engine.status === 'completed')
  const failedEngines = result.engines.filter((engine) => engine.status === 'failed').map((engine) => engine.engineLabel)
  const absentEngines = completedEngines.filter((engine) => !engine.mentionsBrand).map((engine) => engine.engineLabel)
  const weakRankEngines = completedEngines.filter((engine) => engine.rankPosition === null || engine.rankPosition > 3).map((engine) => engine.engineLabel)
  const negativeEngines = completedEngines.filter((engine) => engine.sentiment === 'negative').map((engine) => engine.engineLabel)

  return [
    failedEngines.length > 0
      ? `Re-run after unavailable providers recover: ${failedEngines.join(', ')}. Failed providers are not counted as brand absence.`
      : `Use this as a clean baseline across ${completedEngines.length} completed free providers.`,
    absentEngines.length > 0
      ? `Publish comparison and category pages that explicitly connect ${result.brandName} to this shopper query for ${absentEngines.join(', ')}.`
      : `Defend current visibility by keeping ${result.brandName} named consistently across product, category, and review content.`,
    weakRankEngines.length > 0
      ? `Add evidence that helps models rank ${result.productName}: use cases, third-party reviews, specs, pricing, and differentiators.`
      : `Maintain top-rank signals with fresh reviews, structured product data, and clear expert citations.`,
    negativeEngines.length > 0
      ? `Address negative context in ${negativeEngines.join(', ')} with factual objection-handling content.`
      : 'Create objection-handling content before competitors define the weaknesses for you.',
    'Build one authoritative buyer guide that names competitors honestly and explains when your product is the right fit.'
  ].slice(0, 5)
}

function summarize(overallScore: number | null, brandName: string, completedEngines: number, failedEngines: number): string {
  if (overallScore === null) {
    return 'No providers completed this audit. Check provider keys, quotas, and model availability before interpreting visibility.'
  }

  const basis = failedEngines > 0
    ? ` Based on ${completedEngines} completed provider${completedEngines === 1 ? '' : 's'}; ${failedEngines} failed provider${failedEngines === 1 ? '' : 's'} excluded from scoring.`
    : ''

  if (overallScore >= 85) return `${brandName} has excellent AI visibility for this query. The next job is defending rank and sentiment.${basis}`
  if (overallScore >= 70) return `${brandName} is visible, but there is still room to improve rank consistency across providers.${basis}`
  if (overallScore >= 55) return `${brandName} has uneven visibility. Some providers recognize it, but the answer is not dependable yet.${basis}`
  if (overallScore >= 40) return `${brandName} is weakly visible. The brand needs stronger category-level evidence.${basis}`
  return `${brandName} is mostly absent from completed AI recommendations for this shopper query.${basis}`
}

export async function runDiagnostic(
  request: AnalyzeRequest,
  onProgress?: (completed: number, total: number, currentEngine: string) => void
): Promise<DiagnosticResult> {
  const { query, productName, brandName } = request
  const enginesToRun = configuredEngines()

  if (enginesToRun.length === 0) {
    throw new Error('Configure at least one free provider key in .env.local before running a diagnostic.')
  }

  // Use Promise.allSettled to run all engines in parallel
  // but we'll track completion as each one finishes
  const queryPromises = enginesToRun.map((config, index) => 
    config.query(query).then(
      (value) => {
        // On each completion, report progress
        onProgress?.(index + 1, enginesToRun.length, config.label)
        return { status: 'fulfilled' as const, value, index }
      },
      (reason) => {
        // On each failure, still report progress
        onProgress?.(index + 1, enginesToRun.length, config.label)
        return { status: 'rejected' as const, reason, index }
      }
    )
  )

  const results = await Promise.all(queryPromises)
  
  // Sort back to original order
  const settledResults = Array(results.length) as Array<PromiseSettledResult<RawEngineResponse>>
  for (const result of results) {
    if (result.status === 'fulfilled') {
      settledResults[result.index] = { status: 'fulfilled', value: result.value }
    } else {
      settledResults[result.index] = { status: 'rejected', reason: result.reason }
    }
  }

  const engines = settledResults.map((result, index) => {
    const config = enginesToRun[index]
    if (result.status === 'fulfilled') {
      const analyzed = analyzeEngineResponse(
        config.engine,
        config.label,
        result.value.response,
        result.value.latencyMs,
        productName,
        brandName
      )
      analyzed.modelUsed = result.value.modelUsed
      return analyzed
    }

    return failedEngineResult(config.engine, config.label, result.reason)
  })

  const completed = engines.filter((engine) => engine.status === 'completed' && engine.score !== null)
  const completedEngines = completed.length
  const failedEngines = engines.length - completedEngines
  const overallScore = completedEngines > 0
    ? Math.round(completed.reduce((sum, engine) => sum + (engine.score ?? 0), 0) / completedEngines)
    : null
  const competitorCounts = new Map<string, number>()
  completed.flatMap((engine) => engine.competitors).forEach((competitor) => {
    competitorCounts.set(competitor, (competitorCounts.get(competitor) ?? 0) + 1)
  })

  const topCompetitors = [...competitorCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([competitor]) => competitor)

  const partial: DiagnosticResult = {
    query,
    productName,
    brandName,
    timestamp: new Date().toISOString(),
    engines,
    overallScore,
    completedEngines,
    failedEngines,
    topCompetitors,
    actionItems: [],
    summary: summarize(overallScore, brandName, completedEngines, failedEngines)
  }

  return {
    ...partial,
    actionItems: buildActionItems(partial)
  }
}
