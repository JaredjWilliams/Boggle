import { useEffect, useRef, useState } from 'react'
import { completedGameKey, type ActiveGame } from '../data/activeGames'
import type { Invite } from '../data/matches'
import './Header.css'

type Panel = 'notices' | 'menu'

type Props = {
  onHome?: () => void
  onLearn?: () => void
  onSettings?: () => void
  onSignOut?: () => void
  invites?: readonly Invite[]
  playedBack?: readonly ActiveGame[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
  onOpenPlayedBack?: (game: ActiveGame) => void
}

export function Header({
  onHome,
  onLearn,
  onSettings,
  onSignOut,
  invites,
  playedBack,
  onAcceptInvite,
  onDeclineInvite,
  onOpenPlayedBack,
}: Props) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const incoming = invites ?? []
  const finished = playedBack ?? []
  const showInvites = invites !== undefined && Boolean(onAcceptInvite) && Boolean(onDeclineInvite)
  const showPlayedBack = playedBack !== undefined && Boolean(onOpenPlayedBack)
  const showNotifications = showInvites || showPlayedBack
  const showMenu = Boolean(onLearn) || Boolean(onSettings) || Boolean(onSignOut)
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
        <GridIcon />
        <Wordmark />
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
                <BellIcon />
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
                className="header-menu"
                aria-expanded={panel === 'menu'}
                aria-haspopup="true"
                aria-label="Menu"
                onClick={() => togglePanel('menu')}
              >
                <MenuIcon />
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
                        <button
                          type="button"
                          aria-label={`Play with ${invite.hostName}`}
                          onClick={() => {
                            setPanel(null)
                            onAcceptInvite(invite)
                          }}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          aria-label={`Decline invitation from ${invite.hostName}`}
                          onClick={() => {
                            setPanel(null)
                            onDeclineInvite(invite)
                          }}
                        >
                          Decline
                        </button>
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

function GridIcon() {
  return (
    <svg className="brand-icon" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="18" y="1" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="1" y="18" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="18" y="18" width="13" height="13" rx="3" fill="#e15a2d" />
    </svg>
  )
}

function Wordmark() {
  return (
    <svg className="brand-logo" viewBox="0 0 148 40" role="img" aria-label="Boggle">
      <text
        x="0"
        y="31"
        fill="currentColor"
        fontFamily="Georgia, 'Palatino Linotype', Palatino, serif"
        fontSize="34"
        fontWeight="700"
      >
        Boggle
      </text>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5a5 5 0 0 0-5 5v2.1c0 .7-.2 1.3-.6 1.9L4.7 15a1 1 0 0 0 .8 1.6h13a1 1 0 0 0 .8-1.6l-1.7-2.5a3 3 0 0 1-.6-1.9V8.5a5 5 0 0 0-5-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.5 16.6a2.5 2.5 0 0 0 5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
