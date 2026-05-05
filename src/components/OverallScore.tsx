import { ScoreRing } from './ScoreRing'
import type { DiagnosticResult } from '@/types'

const GRADES = [
  { min: 85, grade: 'A', label: 'Excellent visibility' },
  { min: 70, grade: 'B', label: 'Good visibility' },
  { min: 55, grade: 'C', label: 'Moderate visibility' },
  { min: 40, grade: 'D', label: 'Poor visibility' },
  { min: 0, grade: 'F', label: 'Not visible' }
]

function scoreClass(score: number): string {
  if (score >= 70) return 'grade-good'
  if (score >= 40) return 'grade-warning'
  return 'grade-danger'
}

export function OverallScore({ result }: { result: DiagnosticResult }) {
  const grade = result.overallScore === null
    ? { grade: '-', label: 'Not scored' }
    : GRADES.find((candidate) => result.overallScore !== null && result.overallScore >= candidate.min) ?? GRADES[GRADES.length - 1]

  return (
    <article className="report-card">
      <div className="report-card-top">
        <span>AEO Report Card</span>
        <time dateTime={result.timestamp}>{new Date(result.timestamp).toLocaleString()}</time>
      </div>

      <div className="report-card-body">
        <div className={`letter-grade ${result.overallScore === null ? 'grade-muted' : scoreClass(result.overallScore)}`}>
          <span>{grade.grade}</span>
          <small>{grade.label}</small>
        </div>

        <div className="overall-copy">
          <p className="query-quote">"{result.query}"</p>
          <h2>{result.summary}</h2>
          <p>
            Target: <strong>{result.productName}</strong> by <strong>{result.brandName}</strong>
          </p>
          <p className="report-meta">
            Completed providers: <strong>{result.completedEngines}</strong> / {result.engines.length}
            {result.failedEngines > 0 && <> - Failed providers excluded from grade: <strong>{result.failedEngines}</strong></>}
          </p>

          {result.topCompetitors.length > 0 && (
            <div className="tag-row">
              {result.topCompetitors.map((competitor) => (
                <span className="tag tag-amber" key={competitor}>
                  {competitor}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mini-rings">
          {result.engines.map((engine) => (
            <div key={engine.engine} className="mini-ring">
              <ScoreRing score={engine.score} size={70} />
              <span>{engine.engine}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
