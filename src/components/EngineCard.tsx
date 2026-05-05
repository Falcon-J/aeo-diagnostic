'use client'

import { useState } from 'react'
import { ScoreRing } from './ScoreRing'
import type { EngineResult } from '@/types'

const ENGINE_COLORS: Record<EngineResult['engine'], string> = {
  gemini: '#2563eb',
  groq: '#ea580c',
  openrouter: '#059669'
}

export function EngineCard({ engine }: { engine: EngineResult }) {
  const [expanded, setExpanded] = useState(false)
  const latency = engine.rawLatencyMs > 0 ? `${(engine.rawLatencyMs / 1000).toFixed(1)}s` : 'failed'
  const isFailed = engine.status === 'failed'

  return (
    <article className={`engine-card ${isFailed ? 'engine-card-error' : ''}`}>
      <div className="engine-card-header">
        <div className="engine-title">
          <span className="engine-dot" style={{ background: ENGINE_COLORS[engine.engine] }}>
            {engine.engine[0].toUpperCase()}
          </span>
          <div>
            <h3>{engine.engineLabel}</h3>
            <p>{engine.modelUsed ? `${engine.modelUsed} · ${latency}` : latency}</p>
          </div>
        </div>
        <ScoreRing score={engine.score} size={58} strokeWidth={6} />
      </div>

      <div className="engine-card-body">
        <p className="recommendation">{engine.recommendation}</p>

        <div className="status-row">
          {isFailed ? (
            <span className="tag tag-red">not scored</span>
          ) : (
            <>
              <span className={`tag ${engine.mentionsBrand ? 'tag-green' : 'tag-red'}`}>
                {engine.mentionsBrand ? 'brand mentioned' : 'brand absent'}
              </span>
              <span className={`tag ${engine.mentionsProduct ? 'tag-green' : 'tag-red'}`}>
                {engine.mentionsProduct ? 'product mentioned' : 'product absent'}
              </span>
              <span className="tag tag-neutral">
                {engine.rankPosition ? `rank #${engine.rankPosition}` : 'not ranked'}
              </span>
              <span className="tag tag-neutral">{engine.sentiment.replace('_', ' ')}</span>
            </>
          )}
        </div>

        <div className="signal-grid">
          <div>
            <h4>Strengths</h4>
            {engine.strengths.map((strength) => (
              <p className="signal-good" key={strength}>
                + {strength}
              </p>
            ))}
          </div>
          <div>
            <h4>Gaps</h4>
            {engine.weaknesses.map((weakness) => (
              <p className="signal-bad" key={weakness}>
                - {weakness}
              </p>
            ))}
          </div>
        </div>

        {engine.competitors.length > 0 && (
          <div className="competitor-block">
            <h4>Competitors surfaced</h4>
            <div className="tag-row">
              {engine.competitors.map((competitor) => (
                <span className="tag tag-amber" key={competitor}>
                  {competitor}
                </span>
              ))}
            </div>
          </div>
        )}

        {engine.mentionedBrands.length > 0 && (
          <div className="competitor-block">
            <h4>Extracted brands</h4>
            <div className="tag-row">
              {engine.mentionedBrands.slice(0, 8).map((brand) => (
                <span className="tag tag-neutral" key={brand}>
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {engine.response && (
          <>
            <button className="text-button" type="button" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Hide raw response' : 'View raw response'}
            </button>
            {expanded && <pre className="raw-response">{engine.response}</pre>}
          </>
        )}
      </div>
    </article>
  )
}
