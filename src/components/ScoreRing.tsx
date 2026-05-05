'use client'

import { useEffect, useState } from 'react'

type ScoreRingProps = {
  score: number | null
  size?: number
  strokeWidth?: number
}

export function ScoreRing({ score, size = 86, strokeWidth = 7 }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const displayScore = score ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference
  const color = score === null ? 'var(--muted)' : score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedScore(displayScore), 120)
    return () => window.clearTimeout(timer)
  }, [displayScore])

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score === null ? 'Not scored' : `Score ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-fill"
        />
      </svg>
      <span style={{ color }}>{score === null ? '-' : score}</span>
    </div>
  )
}
