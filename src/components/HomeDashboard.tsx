import { SIDE } from '../game/dice'
import { ROUND_SECONDS } from '../game/round'
import { scoreWord } from '../game/words'
import './HomeDashboard.css'

export type DashFriend = {
  id: string
  name: string
  username: string
}

export type DashInvite = {
  gameId: string
  hostId: string
  hostName: string
  board: string[][]
}

type Props = {
  playerName?: string
  loading: boolean
  loadError: boolean
  lastScore: number | null
  notice?: string
  friends?: readonly DashFriend[]
  invites?: readonly DashInvite[]
  selectedIds?: readonly string[]
  onStart: () => void
  onDaily?: () => void
  dailyPlayed?: boolean
  onDailyResults?: () => void
  onOpenStats?: () => void
  onToggleSeed?: () => void
  seeded?: boolean
  seedReady?: boolean
  seeding?: boolean
  seedNotice?: string
  seedFailed?: boolean
  onToggleFriend?: (id: string) => void
  onAccept?: (invite: DashInvite) => void
  onDecline?: (invite: DashInvite) => void
}

const POINT_LENGTHS = [3, 4, 5, 6, 7, 8] as const

export function HomeDashboard({
  playerName,
  loading,
  loadError,
  lastScore,
  notice = '',
  friends = [],
  invites = [],
  selectedIds = [],
  onStart,
  onDaily,
  dailyPlayed = false,
  onDailyResults,
  onOpenStats,
  onToggleSeed,
  seeded = false,
  seedReady = true,
  seeding = false,
  seedNotice = '',
  seedFailed = false,
  onToggleFriend,
  onAccept,
  onDecline,
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

      {onDaily && (
        <button
          type="button"
          className="daily-game"
          onClick={onDaily}
          disabled={loading || loadError}
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

      {onToggleSeed && seedReady && (
        <div className="seed-row">
          <div className="seed-copy">
            <strong id="sample-games-label">Sample games</strong>
            <small id="sample-games-note">Practice matches on your stats.</small>
          </div>
          <button
            type="button"
            role="switch"
            className={seeded ? 'seed-switch is-on' : 'seed-switch'}
            aria-checked={seeded}
            aria-labelledby="sample-games-label"
            aria-describedby="sample-games-note"
            onClick={onToggleSeed}
            disabled={seeding}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      )}

      {seedNotice && (
        <p className={seedFailed ? 'seed-note seed-note-error' : 'seed-note'} role="status">
          {seedNotice}
        </p>
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

      {friends.length > 0 && onToggleFriend && (
        <>
          <h2>Play with</h2>
          <ul className="friends">
            {friends.map((friend) => (
              <li key={friend.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(friend.id)}
                    onChange={() => onToggleFriend(friend.id)}
                  />
                  <span>{friend.name}</span>
                  <small>{friend.username}</small>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {invites.length > 0 && onAccept && onDecline && (
        <section aria-live="polite">
          <h2>Invitations</h2>
          <ul className="invites">
            {invites.map((invite) => (
              <li key={invite.gameId}>
                <p>{invite.hostName} invited you.</p>
                <button type="button" onClick={() => onAccept(invite)}>
                  Play
                </button>
                <button type="button" onClick={() => onDecline(invite)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
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
