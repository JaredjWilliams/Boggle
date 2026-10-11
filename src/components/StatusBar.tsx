import './StatusBar.css'

type Props = {
  secondsLeft: number
  score: number
  onShake: () => void
  shakeDisabled: boolean
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function StatusBar({
  secondsLeft,
  score,
  onShake,
  shakeDisabled,
}: Props) {
  return (
    <div className="status">
      <p className="timer">
        <span className="label">Time</span>
        <strong>{formatTime(secondsLeft)}</strong>
      </p>
      <p className="score">
        <span className="label">Score</span>
        <strong>{score}</strong>
      </p>
      <button
        type="button"
        className="shake"
        onClick={onShake}
        disabled={shakeDisabled}
      >
        Shake
      </button>
    </div>
  )
}
