export type AIEngine = 'gemini' | 'groq' | 'openrouter'

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'not_mentioned'

export interface AnalyzeRequest {
  query: string
  productName: string
  brandName: string
}

export interface EngineResult {
  engine: AIEngine
  engineLabel: string
  modelUsed: string
  status: 'completed' | 'failed'
  response: string
  mentionsProduct: boolean
  mentionsBrand: boolean
  rankPosition: number | null
  sentiment: Sentiment
  mentionedBrands: string[]
  competitors: string[]
  score: number | null
  recommendation: string
  strengths: string[]
  weaknesses: string[]
  rawLatencyMs: number
  error?: string
}

export interface DiagnosticResult {
  query: string
  productName: string
  brandName: string
  timestamp: string
  engines: EngineResult[]
  overallScore: number | null
  completedEngines: number
  failedEngines: number
  topCompetitors: string[]
  actionItems: string[]
  summary: string
}
