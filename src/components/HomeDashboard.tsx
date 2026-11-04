import {
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
  type Friend,
  type Invite,
} from '../domain/lobby'
import { GameTabs } from './GameTabs'
import { playerInitials } from './initials'
import { WORD_ROTATE_MS, WordSpotlight } from './WordSpotlight'
import './HomeDashboard.css'

export { WORD_ROTATE_MS }

type Props = {
  loading: boolean
  loadError: boolean
  notice?: string
  starting?: boolean
  onStart: () => void
  onPlayWithFriends?: () => void
  onDaily?: () => void
  dailyPlayed?: boolean
  onDailyResults?: () => void
  onOpenStats?: () => void
  bestScore?: number | null
  games?: readonly ActiveGame[]
  readKeys?: ReadonlySet<string>
  onOpenGame?: (game: ActiveGame) => void
  invites?: readonly Invite[]
  friends?: readonly Friend[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
  openRound?: { secondsLeft: number; opponents: readonly string[]; score: number } | null
  onResume?: () => void
}

function previewNames(
  active: readonly ActiveGame[],
  friends: readonly Friend[],
  finished: readonly ActiveGame[],
): string[] {
  const names: string[] = []
  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || names.includes(trimmed) || names.length >= 2) return
    names.push(trimmed)
  }
  for (const game of active) add(game.opponentName)
  for (const friend of friends) add(friend.name)
  for (const game of finished) add(game.opponentName)
  return names
}

function formatScore(score: number | null): string {
  if (score === null) return '—'
  return score.toLocaleString('en-US')
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function HomeDashboard({
  loading,
  loadError,
  notice = '',
  starting = false,
  onStart,
  onPlayWithFriends,
  onDaily,
  dailyPlayed = false,
  onDailyResults,
  onOpenStats,
  bestScore = null,
  games = [],
  readKeys,
  onOpenGame,
  invites = [],
  friends = [],
  onAcceptInvite,
  onDeclineInvite,
  openRound = null,
  onResume,
}: Props) {
  const inProgress = selectActiveGames(games)
  const finished = selectCompletedGames(games)
  const showGames = inProgress.length > 0 || invites.length > 0 || finished.length > 0
  const unavailable = loading || loadError || starting
  const showToday = Boolean(onDaily || onOpenStats || (openRound && onResume))
  const resumeLabel = openRound
    ? `Continue ${openRound.opponents.join(', ') || 'Solo'}, ${openRound.score.toLocaleString('en-US')} points, ${formatTime(openRound.secondsLeft)} left`
    : ''
  const faces = previewNames(inProgress, friends, finished)

  return (
    <main className="home">
      <section className="welcome-row">
        <div>
          <p>Welcome back</p>
          <p className="welcome-title">Ready to play?</p>
        </div>
      </section>

      <WordSpotlight />

      <section className="play-section" aria-labelledby="play-title">
        <div className="section-heading">
          <div>
            <p>Pick a mode</p>
            <p className="section-title" id="play-title">
              Start playing
            </p>
          </div>
        </div>
        <div className="play-grid">
          <button
            type="button"
            className="solo-card"
            onClick={onStart}
            disabled={unavailable}
            aria-label={loading ? 'Loading words…' : 'Play solo'}
          >
            <span className="play-label">Solo game</span>
            <strong>{loading ? 'Loading words…' : 'Beat your best'}</strong>
            <span className="play-cta">
              Play now <b aria-hidden="true">→</b>
            </span>
            <span className="letter-orbit" aria-hidden="true">
              <span>B</span>
              <span>G</span>
              <span>L</span>
            </span>
          </button>
          {onPlayWithFriends && (
            <button
              type="button"
              className="friends-card"
              onClick={onPlayWithFriends}
              disabled={unavailable}
              aria-label="Play with friends"
            >
              <span className="friend-avatars" aria-hidden="true">
                <span>{faces[0] ? playerInitials(faces[0]) : ''}</span>
                <span>{faces[1] ? playerInitials(faces[1]) : ''}</span>
                <span>+</span>
              </span>
              <span className="friends-copy">
                <strong>Play together</strong>
                <small>Invite friends</small>
              </span>
              <b className="card-arrow" aria-hidden="true">
                →
              </b>
            </button>
          )}
        </div>
      </section>

      {showToday && (
        <section className="today-section" aria-labelledby="today-title">
          <div className="today-layout">
            <div className="today-heading">
              <div>
                <p className="section-kicker">Your progress</p>
                <p className="section-title" id="today-title">
                  Today
                </p>
              </div>
              {onDaily && dailyPlayed && onDailyResults && (
                <button
                  type="button"
                  className="today-results"
                  onClick={onDailyResults}
                  aria-label="Today's results"
                >
                  View results
                </button>
              )}
            </div>
            <div className="metric-row">
            {onDaily && (
              <button
                type="button"
                className={dailyPlayed ? 'metric daily-game is-played' : 'metric daily-game'}
                onClick={onDaily}
                disabled={unavailable || dailyPlayed}
                aria-label={dailyPlayed ? 'Played today' : "Today's board"}
              >
                <span className="metric-value">{dailyPlayed ? 'Done' : 'Play'}</span>
                <span className="metric-label">Daily game</span>
              </button>
            )}
            {onOpenStats && (
              <button
                type="button"
                className="metric stats-open"
                onClick={onOpenStats}
                aria-label={bestScore === null ? 'Your stats' : `Your stats, best score ${formatScore(bestScore)}`}
              >
                <span className="metric-value">{formatScore(bestScore)}</span>
                <span className="metric-label">Best score</span>
              </button>
            )}
            {openRound && onResume && (
              <button type="button" className="metric resume-round" onClick={onResume} aria-label={resumeLabel}>
                <span className="metric-value accent">{formatTime(openRound.secondsLeft)}</span>
                <span className="metric-label">Game left</span>
                <span className="resume-extra">{openRound.opponents.join(', ') || 'Solo'}</span>
                <span className="resume-extra">{openRound.score.toLocaleString('en-US')}</span>
              </button>
            )}
            </div>
          </div>
        </section>
      )}

      {showGames && (
        <section className="games-section" aria-labelledby="games-title">
          <div className="section-heading">
            <div>
              <p>Keep it going</p>
              <p className="section-title" id="games-title">
                Your games
              </p>
            </div>
          </div>
          <GameTabs
            games={games}
            readKeys={readKeys}
            invites={invites}
            onOpenGame={onOpenGame}
            onAcceptInvite={onAcceptInvite}
            onDeclineInvite={onDeclineInvite}
          />
        </section>
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
    </main>
  )
}
