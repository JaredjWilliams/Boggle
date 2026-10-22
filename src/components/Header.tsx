import { useEffect, useRef, useState } from 'react'
import type { Invite } from '../data/matches'
import './Header.css'

type Props = {
  onHome?: () => void
  onSignOut?: () => void
  invites?: readonly Invite[]
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
}

export function Header({
  onHome,
  onSignOut,
  invites,
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const showInvites = invites !== undefined && onAcceptInvite && onDeclineInvite

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
        {(showInvites || onHome || onSignOut) && (
          <div className="header-actions">
            {showInvites && (
              <button
                type="button"
                className="header-bell"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={inviteLabel(invites.length)}
                onClick={() => setOpen((current) => !current)}
              >
                <BellIcon />
                {invites.length > 0 && (
                  <span className="header-bell-count" aria-hidden="true">
                    {invites.length > 9 ? '9+' : invites.length}
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
      {open && showInvites && (
        <section
          ref={panelRef}
          className="invite-pop"
          role="dialog"
          aria-label="Invitations"
          tabIndex={-1}
        >
          <h2>Invitations</h2>
          {invites.length === 0 ? (
            <p>No invitations right now.</p>
          ) : (
            <ul>
              {invites.map((invite) => (
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
          )}
        </section>
      )}
      {open && showInvites && (
        <button
          type="button"
          className="invite-backdrop"
          aria-label="Close invitations"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function inviteLabel(count: number): string {
  if (count === 0) return 'Invitations'
  return `Invitations, ${count} waiting`
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
