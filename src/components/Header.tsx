import { useEffect, useRef, useState } from 'react'
import { completedGameKey, type ActiveGame, type Invite } from '../domain/lobby'
import { InviteActions } from './InviteActions'
import { playerInitials } from './initials'
import './Header.css'

type Panel = 'notices' | 'menu'

type Props = {
  onHome?: () => void
  onLeaderboard?: () => void
  onLearn?: () => void
  onSettings?: () => void
  onAdmin?: () => void
  onSignOut?: () => void
  invites?: readonly Invite[]
  playedBack?: readonly ActiveGame[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
  onOpenPlayedBack?: (game: ActiveGame) => void
  onProfile?: () => void
  playerName?: string
}

export function Header({
  onHome,
  onLeaderboard,
  onLearn,
  onSettings,
  onAdmin,
  onSignOut,
  invites,
  playedBack,
  onAcceptInvite,
  onDeclineInvite,
  onOpenPlayedBack,
  onProfile,
  playerName,
}: Props) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const incoming = invites ?? []
  const finished = playedBack ?? []
  const showInvites = invites !== undefined && Boolean(onAcceptInvite) && Boolean(onDeclineInvite)
  const showPlayedBack = playedBack !== undefined && Boolean(onOpenPlayedBack)
  const showNotifications = showInvites || showPlayedBack
  const showMenu =
    Boolean(onLeaderboard) ||
    Boolean(onLearn) ||
    Boolean(onSettings) ||
    Boolean(onAdmin) ||
    Boolean(onSignOut)
  const noticeCount = (showInvites ? incoming.length : 0) + (showPlayedBack ? finished.length : 0)

  useEffect(() => {
    if (!panel) return
    panelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPanel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  function togglePanel(next: Panel) {
    setPanel((current) => (current === next ? null : next))
  }

  return (
    <div className="app-bar">
      <header className="app-header">
        <div className="brand">
          <img src="/assets/942c6.svg" alt="" width={36} height={36} />
          <span className="brand-name">Boggle</span>
        </div>
        {(showNotifications || onHome || showMenu) && (
          <div className="header-actions">
            {showNotifications && (
              <button
                type="button"
                className="header-bell"
                aria-expanded={panel === 'notices'}
                aria-haspopup="dialog"
                aria-label={notificationLabel(noticeCount)}
                onClick={() => togglePanel('notices')}
              >
                <img src="/assets/e1d89.svg" alt="" width={22} height={22} />
                {noticeCount > 0 && (
                  <span className="header-bell-count" aria-hidden="true">
                    {noticeCount > 9 ? '9+' : noticeCount}
                  </span>
                )}
              </button>
            )}
            {showMenu && (
              <button
                type="button"
                className={playerName ? 'header-menu header-avatar' : 'header-menu'}
                aria-expanded={panel === 'menu'}
                aria-haspopup="true"
                aria-label="Menu"
                onClick={() => togglePanel('menu')}
              >
                {playerName ? (
                  playerInitials(playerName)
                ) : (
                  <img src="/assets/062d9.svg" alt="" width={22} height={22} />
                )}
              </button>
            )}
            {onHome && (
              <button
                type="button"
                className="header-home"
                onClick={() => {
                  setPanel(null)
                  onHome()
                }}
              >
                Home
              </button>
            )}
          </div>
        )}
      </header>
      {panel === 'menu' && (
        <nav ref={panelRef} className="menu-pop" aria-label="Menu" tabIndex={-1}>
          {playerName && onProfile && (
            <button
              type="button"
              className="profile-summary"
              aria-label="View profile"
              onClick={() => {
                setPanel(null)
                onProfile()
              }}
            >
              <span aria-hidden="true">{playerInitials(playerName)}</span>
              <p>
                <strong>{playerName}</strong>
                <small>View profile</small>
              </p>
            </button>
          )}
          {onLeaderboard && (
            <button
              type="button"
              onClick={() => {
                setPanel(null)
                onLeaderboard()
              }}
            >
              Leaderboard
            </button>
          )}
          {onLearn && (
            <button
              type="button"
              onClick={() => {
                setPanel(null)
                onLearn()
              }}
            >
              Learn
            </button>
          )}
          {onSettings && (
            <button
              type="button"
              onClick={() => {
                setPanel(null)
                onSettings()
              }}
            >
              Settings
            </button>
          )}
          {onAdmin && (
            <button
              type="button"
              onClick={() => {
                setPanel(null)
                onAdmin()
              }}
            >
              Admin
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={() => {
                setPanel(null)
                onSignOut()
              }}
            >
              Sign out
            </button>
          )}
        </nav>
      )}
      {panel === 'notices' && showNotifications && (
        <section
          ref={panelRef}
          className="invite-pop"
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
        >
          {noticeCount === 0 ? (
            <p>No notifications right now.</p>
          ) : (
            <>
              {showInvites && incoming.length > 0 && onAcceptInvite && onDeclineInvite && (
                <>
                  <h2>Invitations</h2>
                  <ul>
                    {incoming.map((invite) => (
                      <li key={invite.gameId}>
                        <p>{invite.hostName} invited you.</p>
                        <InviteActions
                          invite={invite}
                          onAccept={onAcceptInvite}
                          onDecline={onDeclineInvite}
                          onDone={() => setPanel(null)}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {showPlayedBack && finished.length > 0 && onOpenPlayedBack && (
                <>
                  <h2>Played back</h2>
                  <ul>
                    {finished.map((game) => (
                      <li key={completedGameKey(game)}>
                        <p>{game.opponentName} played you back.</p>
                        <button
                          type="button"
                          aria-label={`View game with ${game.opponentName}`}
                          onClick={() => {
                            setPanel(null)
                            onOpenPlayedBack(game)
                          }}
                        >
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}
      {panel && (
        <button
          type="button"
          className="invite-backdrop"
          aria-label={panel === 'menu' ? 'Close menu' : 'Close notifications'}
          onClick={() => setPanel(null)}
        />
      )}
    </div>
  )
}

function notificationLabel(count: number): string {
  if (count === 0) return 'Notifications'
  return `Notifications, ${count} new`
}

