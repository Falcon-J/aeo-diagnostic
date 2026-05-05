'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ActionItems } from '@/components/ActionItems'
import { EngineCard } from '@/components/EngineCard'
import { OverallScore } from '@/components/OverallScore'
import type { DiagnosticResult } from '@/types'

const EXAMPLES = [
  {
    query: 'best magnesium supplement for seniors',
    productName: 'Calm Magnesium',
    brandName: 'Natural Vitality'
  },
  {
    query: 'best standing desk for home office',
    productName: 'SmartDesk Pro',
    brandName: 'Autonomous'
  },
  {
    query: 'best protein powder for women weight loss',
    productName: 'Tone It Up Protein',
    brandName: 'Tone It Up'
  }
]

type ProviderStatus = {
  engine: string
  label: string
  configured: boolean | null
}

const DEFAULT_PROVIDERS: ProviderStatus[] = [
  { engine: 'gemini', label: 'Gemini', configured: null },
  { engine: 'groq', label: 'Groq', configured: null },
  { engine: 'openrouter', label: 'OpenRouter', configured: null }
]

export default function Home() {
  const [query, setQuery] = useState('')
  const [productName, setProductName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderStatus[]>(DEFAULT_PROVIDERS)

  useEffect(() => {
    fetch('/api/providers')
      .then((response) => response.json())
      .then((data: { providers?: ProviderStatus[] }) => setProviders(data.providers ?? []))
      .catch(() => setProviders([]))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, productName, brandName })
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Request failed')
      }

      setResult(data as DiagnosticResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function loadExample(example: (typeof EXAMPLES)[number]) {
    setQuery(example.query)
    setProductName(example.productName)
    setBrandName(example.brandName)
    setError(null)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">AEO</span>
          <span>Diagnostic Report Card</span>
        </div>
        <span className="topbar-note">Gemini + Groq + OpenRouter</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI Engine Optimization</p>
          <h1>See how AI ranks your product.</h1>
          <p className="lede">
            Run one shopper query across the free AI providers using the same prompt and response
            budget, then compare visibility, rank, sentiment, and competitors.
          </p>
        </div>

        <form className="diagnostic-form" onSubmit={handleSubmit}>
          <label>
            Shopper query
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="best magnesium supplement for seniors"
              maxLength={240}
              required
            />
          </label>

          <div className="field-grid">
            <label>
              Product
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Calm Magnesium"
                maxLength={120}
                required
              />
            </label>
            <label>
              Brand
              <input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Natural Vitality"
                maxLength={120}
                required
              />
            </label>
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Querying engines...' : 'Run diagnostic'}
          </button>

          {providers.length > 0 && (
            <div className="provider-status" aria-label="Configured provider status">
              {providers.map((provider) => (
                <span className={`tag ${provider.configured ? 'tag-green' : 'tag-neutral'}`} key={provider.engine}>
                  {provider.label}: {provider.configured === null ? 'checking' : provider.configured ? 'ready' : 'missing key'}
                </span>
              ))}
            </div>
          )}

          <p className="form-note">
            Fair-run settings: same prompt, 700 output-token limit, low temperature, and 45s timeout
            per configured free provider.
          </p>

          <div className="example-row" aria-label="Example diagnostics">
            {EXAMPLES.map((example) => (
              <button key={example.query} type="button" onClick={() => loadExample(example)}>
                {example.query}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="results-section" aria-live="polite">
        {error && <div className="alert">{error}</div>}

        {loading && (
          <div className="loading-grid">
            <div className="skeleton skeleton-large" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}

        {result && (
          <div className="results-stack">
            <OverallScore result={result} />
            <div className="engine-grid">
              {result.engines.map((engine) => (
                <EngineCard key={engine.engine} engine={engine} />
              ))}
            </div>
            <ActionItems result={result} />
          </div>
        )}
      </section>
    </main>
  )
}
