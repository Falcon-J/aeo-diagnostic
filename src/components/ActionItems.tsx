import type { DiagnosticResult } from '@/types'

export function ActionItems({ result }: { result: DiagnosticResult }) {
  return (
    <article className="action-panel">
      <div>
        <p className="eyebrow">Action plan</p>
        <h2>What to improve before the next diagnostic</h2>
      </div>

      <ol className="action-list">
        {result.actionItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </article>
  )
}
