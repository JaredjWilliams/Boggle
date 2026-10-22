import { SIDE } from '../game/dice'
import { ROUND_SECONDS } from '../game/round'
import { scoreWord } from '../game/words'
import './HomeDashboard.css'

type Props = {
  playerName?: string
  loading: boolean
  loadError: boolean
  lastScore: number | null
  notice?: string
  starting?: boolean
  onStart: () => void
  onPlayWithFriends?: () => void
  onDaily?: () => void
  dailyPlayed?: boolean
  onDailyResults?: () => void
  onOpenStats?: () => void
}

const POINT_LENGTHS = [3, 4, 5, 6, 7, 8] as const

export function HomeDashboard({
  playerName,
  loading,
  loadError,
  lastScore,
  notice = '',
  starting = false,
  onStart,
  onPlayWithFriends,
  onDaily,
  dailyPlayed = false,
  onDailyResults,
  onOpenStats,
}: Props) {
  const unavailable = loading || loadError || starting
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

      <div className="play-choices">
        <button type="button" className="start-game" onClick={onStart} disabled={unavailable}>
          {loading ? 'Loading words…' : 'Play solo'}
        </button>
        {onPlayWithFriends && (
          <button
            type="button"
            className="friends-game"
            onClick={onPlayWithFriends}
            disabled={unavailable}
          >
            Play with friends
          </button>
        )}
      </div>

      {onDaily && (
        <button
          type="button"
          className="daily-game"
          onClick={onDaily}
          disabled={unavailable}
        >
          Today's board
        </button>
      )}

      {onDaily && dailyPlayed && onDailyResults && (
        <button type="button" className="daily-results-open" onClick={onDailyResults}>
          Today's results
          <span aria-hidden="true">→</span>
        </button>
      )}

      {onOpenStats && (
        <button type="button" className="stats-open" onClick={onOpenStats}>
          Your stats
          <span aria-hidden="true">→</span>
        </button>
      )}

      {notice && (
        <p className="home-error" role="alert">
          {notice}
        </p>
      )}

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
