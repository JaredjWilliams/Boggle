import { SIDE } from '../game/dice'
import { ROUND_SECONDS } from '../game/round'
import { scoreWord } from '../game/words'
import './HomeDashboard.css'

type Props = {
  playerName?: string
  loading: boolean
  loadError: boolean
  lastScore: number | null
  onStart: () => void
}

const POINT_LENGTHS = [3, 4, 5, 6, 7, 8] as const

export function HomeDashboard({
  playerName,
  loading,
  loadError,
  lastScore,
  onStart,
}: Props) {
  return (
    <main className="home">
      {playerName && (
        <p className="home-player">
          <span>Your dashboard</span>
          <strong>{playerName}</strong>
        </p>
      )}
      <h1>Find every word.</h1>
      <p className="home-lede">
        Trace touching tiles, including diagonally, or type. Use each tile once.
        Qu counts as two letters.
      </p>

      <button
        type="button"
        className="start-game"
        onClick={onStart}
        disabled={loading || loadError}
      >
        {loading ? 'Loading words…' : 'Start game'}
      </button>

      {loadError && (
        <p className="home-error" role="alert">
          Could not load the word list.
        </p>
      )}

      {lastScore !== null && (
        <p className="last-score">
          <span>Last score</span>
          <strong>{lastScore}</strong>
        </p>
      )}

      <dl className="home-stats">
        <div>
          <dt>Time</dt>
          <dd>{formatRound(ROUND_SECONDS)}</dd>
        </div>
        <div>
          <dt>Board</dt>
          <dd>
            {SIDE}×{SIDE}
          </dd>
        </div>
        <div>
          <dt>Words</dt>
          <dd>3+</dd>
        </div>
      </dl>

      <h2>Points</h2>
      <ul className="points">
        {POINT_LENGTHS.map((length) => (
          <li key={length} aria-label={pointName(length)}>
            <span className="length">{length === 8 ? '8+' : length}</span>
            <strong>{pointLabel(length)}</strong>
          </li>
        ))}
      </ul>
    </main>
  )
}

function formatRound(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function pointLabel(length: number): string {
  const points = scoreWord('a'.repeat(length))
  return length >= 8 ? `${points}+` : String(points)
}

function pointName(length: number): string {
  const letters = length >= 8 ? '8 or more' : String(length)
  return `${letters} letters, ${pointLabel(length)} points`
}
