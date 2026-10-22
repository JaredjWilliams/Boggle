import { useState, type KeyboardEvent } from 'react'
import {
  activeGameLabel,
  COMPLETED_GAME_LIMIT,
  formatRecord,
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
} from '../data/activeGames'
import type { Invite } from '../data/matches'
import './HomeDashboard.css'

type GameTab = 'active' | 'invited' | 'completed'

const TABS: { id: GameTab; label: string }[] = [
  { id: 'active', label: 'Active games' },
  { id: 'invited', label: 'Invited games' },
  { id: 'completed', label: 'Completed games' },
]

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
  onOpenGame,
  invites = [],
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  const inProgress = selectActiveGames(games)
  const finished = selectCompletedGames(games)
  const finishedCount = games.filter((game) => game.playedBack).length
  const showGames = inProgress.length > 0 || invites.length > 0 || finished.length > 0
  const [picked, setPicked] = useState<GameTab | null>(null)
  const tab = picked ?? defaultGameTab(inProgress, invites, finished)
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

      {showGames && (
        <div className="game-shelf">
          <div
            className="game-tabs"
            role="tablist"
            aria-label="Games"
            onKeyDown={(event) => onTabKey(event, tab, setPicked)}
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                id={tabButtonId(item.id)}
                className="game-tab"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={tabPanelId(item.id)}
                aria-label={item.label}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setPicked(item.id)}
              >
                <TabName label={item.label} />
              </button>
            ))}
          </div>

          <div
            className="game-panel"
            role="tabpanel"
            id={tabPanelId('active')}
            aria-labelledby={tabButtonId('active')}
            hidden={tab !== 'active'}
          >
            <GameList
              label="Active games"
              games={inProgress}
              empty="No games in progress."
              showStatus
              onOpenGame={onOpenGame}
            />
          </div>

          <div
            className="game-panel"
            role="tabpanel"
            id={tabPanelId('invited')}
            aria-labelledby={tabButtonId('invited')}
            hidden={tab !== 'invited'}
          >
            <InvitedList
              invites={invites}
              onAcceptInvite={onAcceptInvite}
              onDeclineInvite={onDeclineInvite}
            />
          </div>

          <div
            className="game-panel"
            role="tabpanel"
            id={tabPanelId('completed')}
            aria-labelledby={tabButtonId('completed')}
            hidden={tab !== 'completed'}
          >
            {finishedCount > COMPLETED_GAME_LIMIT && (
              <p className="game-note">Last {COMPLETED_GAME_LIMIT} games.</p>
            )}
            <GameList
              label="Completed games"
              games={finished}
              empty="No finished games yet."
              showStatus={false}
              onOpenGame={onOpenGame}
            />
          </div>
        </div>
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

function GameList({
  label,
  games,
  empty,
  showStatus,
  onOpenGame,
}: {
  label: string
  games: readonly ActiveGame[]
  empty: string
  showStatus: boolean
  onOpenGame?: (game: ActiveGame) => void
}) {
  if (games.length === 0) return <p className="game-empty">{empty}</p>

  return (
    <ul className="active-games" aria-label={label}>
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
              {showStatus && (
                <span className={game.playedBack ? 'active-game-status is-back' : 'active-game-status'}>
                  {game.playedBack ? 'Played back' : 'Waiting'}
                </span>
              )}
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
  )
}

function InvitedList({
  invites,
  onAcceptInvite,
  onDeclineInvite,
}: {
  invites: readonly Invite[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
}) {
  if (invites.length === 0) return <p className="game-empty">No invitations right now.</p>

  return (
    <ul className="active-games" aria-label="Invited games">
      {invites.map((invite) => (
        <li key={invite.gameId}>
          <div className="invited-game">
            <p>{invite.hostName} invited you.</p>
            <div className="invited-actions">
              <button
                type="button"
                aria-label={`Play with ${invite.hostName}`}
                onClick={() => onAcceptInvite?.(invite)}
              >
                Play
              </button>
              <button
                type="button"
                aria-label={`Decline invitation from ${invite.hostName}`}
                onClick={() => onDeclineInvite?.(invite)}
              >
                Decline
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TabName({ label }: { label: string }) {
  const space = label.indexOf(' ')
  const title = space === -1 ? label : label.slice(0, space)
  const detail = space === -1 ? '' : label.slice(space + 1)
  return (
    <span className="game-tab-label">
      <span className="game-tab-title">{title}</span>
      {detail ? <span className="game-tab-detail">{detail}</span> : null}
    </span>
  )
}

function defaultGameTab(
  active: readonly ActiveGame[],
  invites: readonly Invite[],
  completed: readonly ActiveGame[],
): GameTab {
  if (active.length > 0) return 'active'
  if (invites.length > 0) return 'invited'
  return 'completed'
}

function onTabKey(
  event: KeyboardEvent<HTMLDivElement>,
  tab: GameTab,
  pick: (tab: GameTab) => void,
) {
  const index = TABS.findIndex((item) => item.id === tab)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = TABS.length - 1
  else return
  event.preventDefault()
  const id = TABS[next].id
  pick(id)
  document.getElementById(tabButtonId(id))?.focus()
}

function tabButtonId(tab: GameTab): string {
  return `${tab}-games-tab`
}

function tabPanelId(tab: GameTab): string {
  return `${tab}-games-panel`
}
