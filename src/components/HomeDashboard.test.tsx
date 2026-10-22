import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveGame } from '../data/activeGames'
import type { Invite } from '../data/matches'
import { HomeDashboard } from './HomeDashboard'

const props = {
  loading: false,
  loadError: false,
  onStart: vi.fn(),
}

describe('HomeDashboard', () => {
  it('opens on the ways to play', () => {
    render(<HomeDashboard {...props} />)

    expect(screen.getByRole('heading', { name: 'Find every word.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play solo' })).toBeEnabled()
    expect(screen.queryByText('Your dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
    expect(screen.queryByText(/Trace touching tiles/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Points' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Games' })).not.toBeInTheDocument()
  })

  it('starts a game from the dashboard', async () => {
    const onStart = vi.fn()
    render(<HomeDashboard {...props} onStart={onStart} />)

    await userEvent.click(screen.getByRole('button', { name: 'Play solo' }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  it('opens friends without listing players on the dashboard', async () => {
    const onStart = vi.fn()
    const onPlayWithFriends = vi.fn()
    render(<HomeDashboard {...props} onStart={onStart} onPlayWithFriends={onPlayWithFriends} />)

    expect(screen.queryByRole('heading', { name: 'Play with' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Play with friends' }))

    expect(onPlayWithFriends).toHaveBeenCalledOnce()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('waits while the word list loads', () => {
    render(<HomeDashboard {...props} loading onPlayWithFriends={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Loading words…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play with friends' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Play solo' })).not.toBeInTheDocument()
  })

  it('explains when the word list cannot load', async () => {
    const onStart = vi.fn()
    render(<HomeDashboard {...props} loadError onStart={onStart} onPlayWithFriends={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the word list.')
    expect(screen.getByRole('button', { name: 'Play solo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play with friends' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Play solo' }))
    expect(onStart).not.toHaveBeenCalled()
  })

  it('opens stats from the dashboard', async () => {
    const onOpenStats = vi.fn()
    render(<HomeDashboard {...props} onOpenStats={onOpenStats} />)

    await userEvent.click(screen.getByRole('button', { name: 'Your stats' }))

    expect(onOpenStats).toHaveBeenCalledOnce()
    expect(screen.queryByRole('switch', { name: 'Sample games' })).not.toBeInTheDocument()
  })

  it('shows today\'s results under the daily board and above active games after it has been played', async () => {
    const onDailyResults = vi.fn()
    const game = {
      gameId: 'g-new',
      opponentId: 'grace',
      opponentName: 'Grace Hopper',
      playedBack: false,
      wins: 1,
      losses: 0,
    }
    const { rerender } = render(
      <HomeDashboard
        {...props}
        onDaily={vi.fn()}
        onDailyResults={onDailyResults}
        onOpenStats={vi.fn()}
        games={[game]}
      />,
    )

    expect(screen.queryByRole('button', { name: "Today's results" })).not.toBeInTheDocument()

    rerender(
      <HomeDashboard
        {...props}
        onDaily={vi.fn()}
        onDailyResults={onDailyResults}
        onOpenStats={vi.fn()}
        games={[game]}
        dailyPlayed
      />,
    )

    const board = screen.getByRole('button', { name: "Today's board" })
    const results = screen.getByRole('button', { name: "Today's results" })
    const stats = screen.getByRole('button', { name: 'Your stats' })
    const games = screen.getByRole('list', { name: 'Active games' })
    expect(board.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(results.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(stats.compareDocumentPosition(games) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await userEvent.click(results)
    expect(onDailyResults).toHaveBeenCalledOnce()
  })

  it('lists active games with the record and opens the one you choose', async () => {
    const waiting: ActiveGame = {
      gameId: 'g-new',
      opponentId: 'grace',
      opponentName: 'Grace Hopper',
      playedBack: false,
      wins: 2,
      losses: 1,
    }
    const played: ActiveGame = {
      gameId: 'g-old',
      opponentId: 'mina',
      opponentName: 'Mina Chen',
      playedBack: true,
      wins: 0,
      losses: 3,
    }
    const onOpenGame = vi.fn()
    render(
      <HomeDashboard
        {...props}
        games={[waiting, played]}
        onOpenGame={onOpenGame}
        onDaily={vi.fn()}
        onDailyResults={vi.fn()}
        onOpenStats={vi.fn()}
        dailyPlayed
      />,
    )

    const board = screen.getByRole('button', { name: "Today's board" })
    const results = screen.getByRole('button', { name: "Today's results" })
    const stats = screen.getByRole('button', { name: 'Your stats' })
    const games = screen.getByRole('list', { name: 'Active games' })
    expect(board.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(results.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(stats.compareDocumentPosition(games) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const buttons = within(games).getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Grace Hopper, 2 wins, 1 loss, waiting',
    ])
    expect(buttons[0]).toHaveTextContent('Waiting')
    expect(buttons[0]).toHaveTextContent('2–1')
    expect(within(games).queryByText('Mina Chen')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Completed games' }))

    const finished = screen.getByRole('list', { name: 'Completed games' })
    const finishedButtons = within(finished).getAllByRole('button')
    expect(finishedButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Mina Chen, 0 wins, 3 losses, played back',
    ])
    expect(finishedButtons[0]).toHaveTextContent('0–3')
    expect(finishedButtons[0]).not.toHaveTextContent('Played back')

    await userEvent.click(finishedButtons[0])
    expect(onOpenGame).toHaveBeenCalledExactlyOnceWith(played)
  })

  it('lists invitations and plays or declines the one you choose', async () => {
    const invite: Invite = {
      gameId: 'game-1',
      hostId: 'grace',
      hostName: 'Grace Hopper',
      board: [
        ['C', 'A'],
        ['T', 'S'],
      ],
    }
    const onAcceptInvite = vi.fn()
    const onDeclineInvite = vi.fn()
    render(
      <HomeDashboard
        {...props}
        invites={[invite]}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Invited games', selected: true })).toBeInTheDocument()
    const invited = screen.getByRole('list', { name: 'Invited games' })
    expect(within(invited).getByText('Grace Hopper invited you.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Play with Grace Hopper' }))
    expect(onAcceptInvite).toHaveBeenCalledExactlyOnceWith(invite)

    await userEvent.click(screen.getByRole('button', { name: 'Decline invitation from Grace Hopper' }))
    expect(onDeclineInvite).toHaveBeenCalledExactlyOnceWith(invite)
  })

  it('shows only the ten most recent completed games', async () => {
    const games = Array.from({ length: 11 }, (_, index) => ({
      gameId: `done-${index}`,
      opponentId: `player-${index}`,
      opponentName: index === 0 ? 'Newest Player' : index === 10 ? 'Oldest Player' : `Player ${index}`,
      playedBack: true,
      wins: 1,
      losses: 0,
    }))
    const onOpenGame = vi.fn()
    render(<HomeDashboard {...props} games={games} onOpenGame={onOpenGame} />)

    expect(screen.getByRole('tab', { name: 'Completed games', selected: true })).toBeInTheDocument()
    expect(screen.getByText('Last 10 games.')).toBeInTheDocument()

    const finished = screen.getByRole('list', { name: 'Completed games' })
    const buttons = within(finished).getAllByRole('button')
    expect(buttons).toHaveLength(10)
    expect(buttons[0]).toHaveTextContent('Newest Player')
    expect(screen.queryByText('Oldest Player')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Active games' }))
    expect(screen.getByText('No games in progress.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Invited games' }))
    expect(screen.getByText('No invitations right now.')).toBeInTheDocument()
  })
})
