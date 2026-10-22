import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Invite } from '../data/matches'
import { Header } from './Header'

const invite: Invite = {
  gameId: 'game-1',
  hostId: 'grace',
  hostName: 'Grace Hopper',
  board: [
    ['C', 'A'],
    ['T', 'S'],
  ],
}

describe('Header invitations', () => {
  it('hides the notification icon until invitations are available', () => {
    render(<Header onSignOut={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Invitations' })).not.toBeInTheDocument()
  })

  it('shows an empty invitation list from the bell', async () => {
    const user = userEvent.setup()
    render(<Header invites={[]} onAcceptInvite={vi.fn()} onDeclineInvite={vi.fn()} />)

    expect(screen.queryByRole('dialog', { name: 'Invitations' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Invitations' }))

    expect(screen.getByRole('dialog', { name: 'Invitations' })).toHaveTextContent(
      'No invitations right now.',
    )
  })

  it('plays or declines an invitation from the bell', async () => {
    const user = userEvent.setup()
    const onAcceptInvite = vi.fn()
    const onDeclineInvite = vi.fn()
    const { rerender } = render(
      <Header
        invites={[invite]}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />,
    )

    const bell = screen.getByRole('button', { name: 'Invitations, 1 waiting' })
    expect(bell).toHaveTextContent('1')

    await user.click(bell)
    expect(screen.getByRole('dialog', { name: 'Invitations' })).toHaveTextContent(
      'Grace Hopper invited you.',
    )

    await user.click(screen.getByRole('button', { name: 'Play with Grace Hopper' }))
    expect(onAcceptInvite).toHaveBeenCalledExactlyOnceWith(invite)
    expect(screen.queryByRole('dialog', { name: 'Invitations' })).not.toBeInTheDocument()

    rerender(
      <Header
        invites={[invite]}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Invitations, 1 waiting' }))
    await user.click(screen.getByRole('button', { name: 'Decline invitation from Grace Hopper' }))

    expect(onDeclineInvite).toHaveBeenCalledExactlyOnceWith(invite)
  })
})
