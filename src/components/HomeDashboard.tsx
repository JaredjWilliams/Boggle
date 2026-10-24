import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent, type KeyboardEvent } from 'react'
import {
  activeGameLabel,
  COMPLETED_GAME_LIMIT,
  completedGameKey,
  formatRecord,
  playedBackNotices,
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
} from '../data/activeGames'
import type { Invite } from '../data/matches'
import { pickMissedWord, wordKindLabel, type MissedWord } from '../learn/missedWords'
import './HomeDashboard.css'

export const WORD_ROTATE_MS = 7000

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
  const finishedCount = games.filter((game) => game.playedBack).length
  const unread = readKeys ? playedBackNotices(games, readKeys) : []
  const unreadKeys = new Set(unread.map(completedGameKey))
  const showGames = inProgress.length > 0 || invites.length > 0 || finished.length > 0
  const [picked, setPicked] = useState<GameTab | null>(null)
  const [spotlight, setSpotlight] = useState<MissedWord>(() => pickMissedWord())
  const [leaving, setLeaving] = useState<LeavingWord | null>(null)
  const [panelHeight, setPanelHeight] = useState<number | null>(null)
  const leaveId = useRef(0)
  const panelRefs = useRef<Partial<Record<GameTab, HTMLDivElement | null>>>({})
  const tab = picked ?? defaultGameTab(inProgress, invites)
  const tabIndex = TABS.findIndex((item) => item.id === tab)
  const unavailable = loading || loadError || starting

  useLayoutEffect(() => {
    const node = panelRefs.current[tab]
    if (!node) return
    const next = node.offsetHeight
    setPanelHeight((current) => (current === next ? current : next))
  })

  function showAnotherWord() {
    const next = pickMissedWord(undefined, spotlight.word)
    if (canAnimate()) {
      const id = leaveId.current + 1
      leaveId.current = id
      setLeaving({ id, word: spotlight })
    }
    setSpotlight(next)
  }

  useEffect(() => {
    const timer = window.setInterval(showAnotherWord, WORD_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [spotlight])

  function selectTab(next: GameTab) {
    if (next !== tab) setPicked(next)
  }

  function onWordLeave(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const id = Number(event.currentTarget.dataset.leaveId)
    setLeaving((current) => (current?.id === id ? null : current))
  }

  return (
    <main className="home">
      <section className="missed-word" aria-label="Often missed">
        <div className="missed-word-bar">
          <p className="missed-word-kicker">Often missed</p>
          <button type="button" className="missed-word-next" onClick={showAnotherWord}>
            New word
          </button>
        </div>
        <div className="missed-word-stage">
          {leaving && (
            <div
              className="missed-word-card is-leaving"
              aria-hidden="true"
              data-leave-id={leaving.id}
              onAnimationEnd={onWordLeave}
            >
              <MissedWordBody word={leaving.word} />
            </div>
          )}
          <div className={leaving ? 'missed-word-card is-entering' : 'missed-word-card'} aria-live="polite">
            <MissedWordBody word={spotlight} heading />
          </div>
        </div>
      </section>

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

          <div
            className="game-viewport"
            style={panelHeight === null ? undefined : { height: panelHeight }}
          >
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
                      showStatus
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
                        showStatus={false}
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

type LeavingWord = {
  id: number
  word: MissedWord
}

function MissedWordBody({ word, heading = false }: { word: MissedWord; heading?: boolean }) {
  const Title = heading ? 'h1' : 'p'
  return (
    <>
      <Title className="missed-word-title">{word.word}</Title>
      <p className="missed-word-kind">{wordKindLabel(word.kind)}</p>
      <p className="missed-word-def">{word.definition}</p>
    </>
  )
}

function canAnimate(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false
  return typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.animate === 'function'
}

function GameList({
  label,
  games,
  empty,
  showStatus,
  unreadKeys,
  onOpenGame,
}: {
  label: string
  games: readonly ActiveGame[]
  empty: string
  showStatus: boolean
  unreadKeys?: ReadonlySet<string>
  onOpenGame?: (game: ActiveGame) => void
}) {
  if (games.length === 0) return <p className="game-empty">{empty}</p>

  return (
    <ul className="active-games" aria-label={label}>
      {games.map((game) => {
        const unread = unreadKeys?.has(completedGameKey(game)) ?? false
        return (
          <li key={`${game.gameId}:${game.opponentId}`}>
            <button
              type="button"
              className="active-game"
              aria-label={unread ? `${activeGameLabel(game)}, new` : activeGameLabel(game)}
              onClick={() => onOpenGame?.(game)}
            >
              <span className="active-game-top">
                <span className="active-game-name">{game.opponentName}</span>
                {unread && <span className="active-game-status is-new">New</span>}
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
        )
      })}
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
