import { useState } from 'react'
import { loadBoardSeats } from '../api/results'
import type { InviteBoardResult } from '../api/matches'
import { blockLabel, inviteBlock, type BoardSeat } from '../domain/inviteBoard'
import { errorMessage } from '../lib/errorMessage'
import type { ListedPlayer } from './FriendsScreen'
import './SendBoard.css'

type Props = {
  gameId: string
  friends: readonly ListedPlayer[]
  onSend: (playerIds: readonly string[]) => Promise<InviteBoardResult>
  icon?: boolean
}

export function SendBoard({ gameId, friends, onSend, icon = false }: Props) {
  const [open, setOpen] = useState(false)
  const [seats, setSeats] = useState<BoardSeat[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)

  function openSheet() {
    setOpen(true)
    setNotice('')
    setSelected([])
    setSeats(null)
    void loadBoardSeats(gameId)
      .then(setSeats)
      .catch((error: unknown) => {
        setNotice(errorMessage(error, 'Could not load players.'))
      })
  }

  function toggle(playerId: string) {
    setSelected((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    )
  }

  async function submit() {
    if (selected.length === 0 || sending) return
    setSending(true)
    setNotice('')
    try {
      const outcome = await onSend(selected)
      const invited = new Set(outcome.invited)
      setSelected((current) => current.filter((id) => !invited.has(id)))
      if (outcome.rejected.length === 0) {
        setOpen(false)
        return
      }
      setNotice(rejectionCopy(outcome.rejected, friends))
      setSeats(await loadBoardSeats(gameId))
    } catch (error: unknown) {
      setNotice(errorMessage(error, 'Could not send this board.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={icon ? 'send-board send-board-icon' : 'send-board'}
        aria-label={icon ? 'Send this board' : undefined}
        onClick={openSheet}
      >
        {icon ? <SendIcon /> : 'Send this board'}
      </button>
      {open && (
        <div className="send-sheet">
          <button type="button" className="send-backdrop" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <section className="send-panel" role="dialog" aria-label="Send this board">
            <div className="send-heading">
              <h2>Send this board</h2>
              <button type="button" className="send-close" aria-label="Close" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <p className="send-lede">Choose friends who have not played it.</p>
            {notice && (
              <p className="send-notice" role="alert">
                {notice}
              </p>
            )}
            {seats === null && !notice && <p className="send-status">Loading players…</p>}
            {seats !== null && friends.length === 0 && (
              <p className="send-status">No other players yet.</p>
            )}
            {seats !== null && friends.length > 0 && (
              <ul className="send-list">
                {friends.map((friend) => {
                  const block = inviteBlock(seats.find((seat) => seat.playerId === friend.id))
                  const checked = selected.includes(friend.id)
                  return (
                    <li key={friend.id}>
                      <label className={block ? 'send-choice is-blocked' : 'send-choice'}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={block !== null || sending}
                          onChange={() => toggle(friend.id)}
                        />
                        <span className="send-person">
                          <span className="send-name">{friend.name}</span>
                          <small>{friend.username}</small>
                        </span>
                        {block && <span className="send-reason">{blockLabel(block)}</span>}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            <button type="button" className="send-confirm" disabled={selected.length === 0 || sending} onClick={() => void submit()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </section>
        </div>
      )}
    </>
  )
}

function CloseIcon() {
  return (
    <svg className="send-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7 17 17" />
      <path d="M17 7 7 17" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="send-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 11.4 20.2 4.2 13.4 20.2 10.8 13.6 3.8 11.4Z" />
      <path d="M10.8 13.6 20.2 4.2" />
    </svg>
  )
}

function rejectionCopy(
  rejected: InviteBoardResult['rejected'],
  friends: readonly ListedPlayer[],
): string {
  return rejected
    .map((item) => {
      const name = friends.find((friend) => friend.id === item.id)?.name ?? 'A player'
      if (item.reason === 'invited') return `${name} already has an invite.`
      if (item.reason === 'playing') return `${name} is still playing.`
      return `${name} has already played this board.`
    })
    .join(' ')
}
