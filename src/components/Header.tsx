import { useEffect, useRef, useState } from 'react'
import { completedGameKey, type ActiveGame } from '../data/activeGames'
import type { Invite } from '../data/matches'
import './Header.css'

type Props = {
  onHome?: () => void
  onSignOut?: () => void
  invites?: readonly Invite[]
  playedBack?: readonly ActiveGame[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
  onOpenPlayedBack?: (game: ActiveGame) => void
}

export function Header({
  onHome,
  onSignOut,
  invites,
  playedBack,
  onAcceptInvite,
  onDeclineInvite,
  onOpenPlayedBack,
}: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const incoming = invites ?? []
  const finished = playedBack ?? []
  const showInvites = invites !== undefined && Boolean(onAcceptInvite) && Boolean(onDeclineInvite)
  const showPlayedBack = playedBack !== undefined && Boolean(onOpenPlayedBack)
  const showNotifications = showInvites || showPlayedBack
  const noticeCount = (showInvites ? incoming.length : 0) + (showPlayedBack ? finished.length : 0)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="app-bar">
      <header className="app-header">
        <GridIcon />
        <Wordmark />
        {(showNotifications || onHome || onSignOut) && (
          <div className="header-actions">
            {showNotifications && (
              <button
                type="button"
                className="header-bell"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={notificationLabel(noticeCount)}
                onClick={() => setOpen((current) => !current)}
              >
                <BellIcon />
                {noticeCount > 0 && (
                  <span className="header-bell-count" aria-hidden="true">
                    {noticeCount > 9 ? '9+' : noticeCount}
                  </span>
                )}
              </button>
            )}
            {onSignOut && (
              <button type="button" className="header-home" onClick={onSignOut}>
                Sign out
              </button>
            )}
            {onHome && (
              <button type="button" className="header-home" onClick={onHome}>
                Home
              </button>
            )}
          </div>
        )}
      </header>
      {open && showNotifications && (
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
                            setOpen(false)
                            onAcceptInvite(invite)
                          }}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          aria-label={`Decline invitation from ${invite.hostName}`}
                          onClick={() => {
                            setOpen(false)
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
                            setOpen(false)
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
      {open && showNotifications && (
        <button
          type="button"
          className="invite-backdrop"
          aria-label="Close notifications"
          onClick={() => setOpen(false)}
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
