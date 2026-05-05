interface ProgressBarProps {
  current: number
  total: number
  message: string
}

export function ProgressBar({ current, total, message }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100)
  const completedCount = Math.round(current)

  return (
    <div className="progress-container">
      <div className="progress-header">
        <p className="progress-message">{message}</p>
        <p className="progress-percentage">{percentage}%</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <p className="progress-meta">
        {completedCount} of {total} providers queried
      </p>
    </div>
  )
}
