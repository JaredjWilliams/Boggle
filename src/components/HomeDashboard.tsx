import { activeGameLabel, formatRecord, type ActiveGame } from '../data/activeGames'
import './HomeDashboard.css'

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
  onOpenGame?: (game: ActiveGame) => void
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
  onOpenGame,
}: Props) {
  const unavailable = loading || loadError || starting
  return (
    <main className="home">
      <h1>Find every word.</h1>

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

      {games.length > 0 && (
        <>
          <h2 id="active-games-heading">Active games</h2>
          <ul className="active-games" aria-labelledby="active-games-heading">
            {games.map((game) => (
              <li key={`${game.gameId}:${game.opponentId}`}>
                <button
                  type="button"
                  className="active-game"
                  aria-label={activeGameLabel(game)}
                  onClick={() => onOpenGame?.(game)}
                >
                  <span className="active-game-top">
                    <span className="active-game-name">{game.opponentName}</span>
                    <span className={game.playedBack ? 'active-game-status is-back' : 'active-game-status'}>
                      {game.playedBack ? 'Played back' : 'Waiting'}
                    </span>
                  </span>
                  <span className="active-game-record">
                    <span>Wins–losses</span>
                    <strong>{formatRecord(game.wins, game.losses)}</strong>
                    <span className="active-game-open" aria-hidden="true">
                      →
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
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
