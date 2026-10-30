import type { Invite } from '../domain/lobby'

type Props = {
  invite: Invite
  onAccept: (invite: Invite) => void
  onDecline: (invite: Invite) => void
  onDone?: () => void
}

export function InviteActions({ invite, onAccept, onDecline, onDone }: Props) {
  return (
    <>
      <button
        type="button"
        aria-label={`Play with ${invite.hostName}`}
        onClick={() => {
          onDone?.()
          onAccept(invite)
        }}
      >
        Play
      </button>
      <button
        type="button"
        aria-label={`Decline invitation from ${invite.hostName}`}
        onClick={() => {
          onDone?.()
          onDecline(invite)
        }}
      >
        Decline
      </button>
    </>
  )
}
