import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveGame, Invite } from '../domain/lobby'
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

describe('Header menu', () => {
  it('opens learn and sign out from the menu', async () => {
    const user = userEvent.setup()
    const onLearn = vi.fn()
    const onSignOut = vi.fn()
    render(<Header onLearn={onLearn} onSignOut={onSignOut} />)

    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    expect(menu).toHaveTextContent('Learn')
    expect(menu).toHaveTextContent('Sign out')
    expect(menu).not.toHaveTextContent('Admin')

    await user.click(screen.getByRole('button', { name: 'Learn' }))
    expect(onLearn).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('opens the leaderboard from the menu', async () => {
    const user = userEvent.setup()
    const onLeaderboard = vi.fn()
    render(<Header onLeaderboard={onLeaderboard} onLearn={vi.fn()} onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    expect(menu).toHaveTextContent('Leaderboard')

    await user.click(screen.getByRole('button', { name: 'Leaderboard' }))
    expect(onLeaderboard).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('opens admin from the menu', async () => {
    const user = userEvent.setup()
    const onAdmin = vi.fn()
    render(<Header onLearn={vi.fn()} onAdmin={onAdmin} onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('navigation', { name: 'Menu' })).toHaveTextContent('Admin')

    await user.click(screen.getByRole('button', { name: 'Admin' }))
    expect(onAdmin).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('opens settings from the menu', async () => {
    const user = userEvent.setup()
    const onSettings = vi.fn()
    render(<Header onLearn={vi.fn()} onSettings={onSettings} onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('navigation', { name: 'Menu' })).toHaveTextContent('Settings')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('closes the menu when going home', async () => {
    const user = userEvent.setup()
    const onHome = vi.fn()
    render(<Header onHome={onHome} onLearn={vi.fn()} onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(onHome).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('hides the menu until learn or sign out is available', () => {
    render(<Header onHome={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })
})

describe('Header invitations', () => {
  it('hides the notification icon until invitations are available', () => {
    render(<Header onSignOut={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('shows an empty invitation list from the bell', async () => {
    const user = userEvent.setup()
    render(<Header invites={[]} onAcceptInvite={vi.fn()} onDeclineInvite={vi.fn()} />)

    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveTextContent(
      'No notifications right now.',
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

    const bell = screen.getByRole('button', { name: 'Notifications, 1 new' })
    expect(bell).toHaveTextContent('1')

    await user.click(bell)
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveTextContent(
      'Grace Hopper invited you.',
    )

    await user.click(screen.getByRole('button', { name: 'Play with Grace Hopper' }))
    expect(onAcceptInvite).toHaveBeenCalledExactlyOnceWith(invite)
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()

    rerender(
      <Header
        invites={[invite]}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 new' }))
    await user.click(screen.getByRole('button', { name: 'Decline invitation from Grace Hopper' }))

    expect(onDeclineInvite).toHaveBeenCalledExactlyOnceWith(invite)
  })

  it('counts a played-back game and opens it from the bell', async () => {
    const user = userEvent.setup()
    const onOpenPlayedBack = vi.fn()
    const played: ActiveGame = {
      gameId: 'g-old',
      opponentId: 'mina',
      opponentName: 'Mina Chen',
      playedBack: true,
      hosted: true,
      wins: 1,
      losses: 0,
      yourScore: 100,
      opponentScore: 40,
    }
    render(
      <Header
        invites={[invite]}
        onAcceptInvite={vi.fn()}
        onDeclineInvite={vi.fn()}
        playedBack={[played]}
        onOpenPlayedBack={onOpenPlayedBack}
      />,
    )

    const bell = screen.getByRole('button', { name: 'Notifications, 2 new' })
    expect(bell).toHaveTextContent('2')

    await user.click(bell)
    const dialog = screen.getByRole('dialog', { name: 'Notifications' })
    expect(dialog).toHaveTextContent('Grace Hopper invited you.')
    expect(dialog).toHaveTextContent('Mina Chen played you back.')

    await user.click(screen.getByRole('button', { name: 'View game with Mina Chen' }))
    expect(onOpenPlayedBack).toHaveBeenCalledExactlyOnceWith(played)
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
  })
})
