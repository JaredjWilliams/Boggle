import {
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
  type Invite,
} from '../domain/lobby'
import { GameTabs } from './GameTabs'
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
  games?: readonly ActiveGame[]
  readKeys?: ReadonlySet<string>
  onOpenGame?: (game: ActiveGame) => void
  invites?: readonly Invite[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
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
  games = [],
  readKeys,
  onOpenGame,
  invites = [],
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  const inProgress = selectActiveGames(games)
  const finished = selectCompletedGames(games)
  const showGames = inProgress.length > 0 || invites.length > 0 || finished.length > 0
  const unavailable = loading || loadError || starting

  return (
    <main className="home">
      <WordSpotlight />

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
          className={dailyPlayed ? 'daily-game is-played' : 'daily-game'}
          onClick={onDaily}
          disabled={unavailable || dailyPlayed}
        >
          {dailyPlayed ? 'Played today' : "Today's board"}
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

      {showGames && (
        <GameTabs
          games={games}
          readKeys={readKeys}
          invites={invites}
          onOpenGame={onOpenGame}
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
        />
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
