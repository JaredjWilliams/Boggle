import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  activeGameLabel,
  COMPLETED_GAME_LIMIT,
  completedGameKey,
  daysLeftLabel,
  formatMatchScore,
  formatRecord,
  matchResult,
  matchResultLabel,
  playedBackNotices,
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
  type Invite,
} from '../domain/lobby'
import { InviteActions } from './InviteActions'
import './GameTabs.css'

type GameTab = 'active' | 'invited' | 'completed'

const TABS: { id: GameTab; label: string }[] = [
  { id: 'active', label: 'Active games' },
  { id: 'invited', label: 'Invited games' },
  { id: 'completed', label: 'Completed games' },
]

type Props = {
  games: readonly ActiveGame[]
  readKeys?: ReadonlySet<string>
  invites: readonly Invite[]
  onOpenGame?: (game: ActiveGame) => void
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
}

export function GameTabs({
  games,
  readKeys,
  invites,
  onOpenGame,
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  const inProgress = selectActiveGames(games)
  const finished = selectCompletedGames(games)
  const finishedCount = games.filter((game) => game.playedBack).length
  const unread = readKeys ? playedBackNotices(games, readKeys) : []
  const unreadKeys = new Set(unread.map(completedGameKey))
  const [picked, setPicked] = useState<GameTab | null>(null)
  const [panelHeight, setPanelHeight] = useState<number | null>(null)
  const panelRefs = useRef<Partial<Record<GameTab, HTMLDivElement | null>>>({})
  const tab = picked ?? defaultGameTab(inProgress, invites)
  const tabIndex = TABS.findIndex((item) => item.id === tab)

  useLayoutEffect(() => {
    const node = panelRefs.current[tab]
    if (!node) return
    const next = node.offsetHeight
    setPanelHeight((current) => (current === next ? current : next))
  }, [tab, games, invites, readKeys])

  function selectTab(next: GameTab) {
    if (next !== tab) setPicked(next)
  }

  return (
    <div className="game-shelf">
      <div
        className="game-tabs"
        role="tablist"
        aria-label="Games"
        onKeyDown={(event) => onTabKey(event, tab, selectTab)}
      >
        <span
          className="game-tab-indicator"
          style={{ ['--tab-index' as string]: tabIndex }}
          aria-hidden="true"
        />
        {TABS.map((item) => {
          const badge = item.id === 'completed' ? unread.length : 0
          return (
            <button
              key={item.id}
              type="button"
              id={tabButtonId(item.id)}
              className="game-tab"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={tabPanelId(item.id)}
              aria-label={badge > 0 ? `${item.label}, ${badge} new` : item.label}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => selectTab(item.id)}
            >
              <TabName label={item.label} badge={badge} />
            </button>
          )
        })}
      </div>

      <div className="game-viewport" style={panelHeight === null ? undefined : { height: panelHeight }}>
        <div className="game-track" style={{ transform: `translateX(${-tabIndex * 100}%)` }}>
          {TABS.map((item) => (
            <div
              key={item.id}
              className="game-panel"
              role="tabpanel"
              id={tabPanelId(item.id)}
              aria-labelledby={tabButtonId(item.id)}
              aria-hidden={tab !== item.id}
              inert={tab !== item.id ? true : undefined}
              ref={(node) => {
                panelRefs.current[item.id] = node
              }}
            >
              {item.id === 'active' && (
                <GameList
                  label="Active games"
                  games={inProgress}
                  empty="No games in progress."
                  onOpenGame={onOpenGame}
                />
              )}
              {item.id === 'invited' && (
                <InvitedList
                  invites={invites}
                  onAcceptInvite={onAcceptInvite}
                  onDeclineInvite={onDeclineInvite}
                />
              )}
              {item.id === 'completed' && (
                <>
                  {finishedCount > COMPLETED_GAME_LIMIT && (
                    <p className="game-note">Last {COMPLETED_GAME_LIMIT} games.</p>
                  )}
                  <GameList
                    label="Completed games"
                    games={finished}
                    empty="No finished games yet."
                    unreadKeys={unreadKeys}
                    onOpenGame={onOpenGame}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameList({
  label,
  games,
  empty,
  unreadKeys,
  onOpenGame,
}: {
  label: string
  games: readonly ActiveGame[]
  empty: string
  unreadKeys?: ReadonlySet<string>
  onOpenGame?: (game: ActiveGame) => void
}) {
  if (games.length === 0) return <p className="game-empty">{empty}</p>

  return (
    <ul className="active-games" aria-label={label}>
      {games.map((game) => {
        const unread = unreadKeys?.has(completedGameKey(game)) ?? false
        const result = game.playedBack ? matchResult(game.yourScore, game.opponentScore) : null
        return (
          <li key={`${game.gameId}:${game.opponentId}`}>
            <button
              type="button"
              className={unread ? 'active-game is-unread' : 'active-game'}
              aria-label={gameButtonLabel(game, unread, result)}
              onClick={() => onOpenGame?.(game)}
            >
              <span className="active-game-top">
                <span className="active-game-name">{game.opponentName}</span>
                {result && (
                  <span className={`active-game-result is-${result}`}>{matchResultLabel(result)}</span>
                )}
                {typeof game.daysLeft === 'number' && (
                  <span className={game.daysLeft <= 1 ? 'active-game-deadline is-soon' : 'active-game-deadline'}>
                    {daysLeftLabel(game.daysLeft)}
                  </span>
                )}
              </span>
              <span className="active-game-record">
                <strong>{formatMatchScore(game.yourScore, game.opponentScore)}</strong>
                <span className="active-game-tally">{formatRecord(game.wins, game.losses)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function gameButtonLabel(
  game: ActiveGame,
  unread: boolean,
  result: ReturnType<typeof matchResult>,
): string {
  const outcome = result ? `, ${matchResultLabel(result).toLowerCase()}` : ''
  const fresh = unread ? ', new' : ''
  return `${activeGameLabel(game)}${outcome}${fresh}`
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
            {typeof invite.daysLeft === 'number' && (
              <p className={invite.daysLeft <= 1 ? 'invited-deadline is-soon' : 'invited-deadline'}>
                {daysLeftLabel(invite.daysLeft)}
              </p>
            )}
            <div className="invited-actions">
              <InviteActions
                invite={invite}
                onAccept={(item) => onAcceptInvite?.(item)}
                onDecline={(item) => onDeclineInvite?.(item)}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TabName({ label, badge = 0 }: { label: string; badge?: number }) {
  const space = label.indexOf(' ')
  const title = space === -1 ? label : label.slice(0, space)
  const detail = space === -1 ? '' : label.slice(space + 1)
  return (
    <span className="game-tab-label">
      <span className="game-tab-title">{title}</span>
      {detail ? (
        <span className="game-tab-detail">
          {detail}
          {badge > 0 && (
            <span className="game-tab-badge" aria-hidden="true">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
      ) : null}
    </span>
  )
}

function defaultGameTab(active: readonly ActiveGame[], invites: readonly Invite[]): GameTab {
  if (active.length > 0) return 'active'
  if (invites.length > 0) return 'invited'
  return 'completed'
}

function onTabKey(event: KeyboardEvent<HTMLDivElement>, tab: GameTab, pick: (tab: GameTab) => void) {
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
