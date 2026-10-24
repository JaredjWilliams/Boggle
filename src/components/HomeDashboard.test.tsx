import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { completedGameKey, type ActiveGame } from '../data/activeGames'
import type { Invite } from '../data/matches'
import { MISSED_SIXES, wordKindLabel } from '../learn/missedWords'
import { HomeDashboard, WORD_ROTATE_MS } from './HomeDashboard'

const props = {
  loading: false,
  loadError: false,
  onStart: vi.fn(),
}

describe('HomeDashboard', () => {
  it('opens on the ways to play', () => {
    render(<HomeDashboard {...props} />)

    const entry = missedWordOnScreen()
    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.getByText(wordKindLabel(entry.kind))).toBeInTheDocument()
    expect(screen.getByText(entry.definition)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play solo' })).toBeEnabled()
    expect(screen.queryByText('Your dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
    expect(screen.queryByText(/Trace touching tiles/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Points' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Games' })).not.toBeInTheDocument()
  })

  it('shows another missed word without repeating the one on screen', async () => {
    render(<HomeDashboard {...props} />)
    const first = missedWordOnScreen()

    await userEvent.click(screen.getByRole('button', { name: 'New word' }))

    const second = missedWordOnScreen()
    expect(second.word).not.toBe(first.word)
    expect(screen.queryByText(first.definition)).not.toBeInTheDocument()
    expect(screen.getByText(wordKindLabel(second.kind))).toBeInTheDocument()
  })

  it('slides the current word out to the left and the next word in from the right', async () => {
    const original = HTMLElement.prototype.animate
    HTMLElement.prototype.animate = (() => ({ cancel() {} })) as unknown as typeof HTMLElement.prototype.animate
    try {
      render(<HomeDashboard {...props} />)
      const first = missedWordOnScreen()

      await userEvent.click(screen.getByRole('button', { name: 'New word' }))

      const stage = screen.getByRole('region', { name: 'Often missed' })
      const leaving = stage.querySelector('.is-leaving')
      const entering = stage.querySelector('.is-entering')
      expect(leaving).toHaveTextContent(first.word)
      expect(entering).toHaveTextContent(screen.getByRole('heading').textContent ?? '')
      expect(screen.getByRole('heading').textContent).not.toBe(first.word)
    } finally {
      HTMLElement.prototype.animate = original
    }
  })

  it('slides in another word every 7 seconds, and waits again after New word', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      render(<HomeDashboard {...props} />)
      const first = missedWordOnScreen()

      await act(async () => {
        vi.advanceTimersByTime(WORD_ROTATE_MS - 1)
      })
      expect(screen.getByRole('heading', { name: first.word })).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      const second = missedWordOnScreen()
      expect(second.word).not.toBe(first.word)

      await act(async () => {
        vi.advanceTimersByTime(WORD_ROTATE_MS - 1)
      })
      await userEvent.click(screen.getByRole('button', { name: 'New word' }))
      const chosen = missedWordOnScreen()

      await act(async () => {
        vi.advanceTimersByTime(WORD_ROTATE_MS - 1)
      })
      expect(screen.getByRole('heading', { name: chosen.word })).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(missedWordOnScreen().word).not.toBe(chosen.word)
    } finally {
      vi.useRealTimers()
    }
  })

  it('slides the game list in the direction of the selected tab', async () => {
    const waiting: ActiveGame = {
      gameId: 'g-new',
      opponentId: 'grace',
      opponentName: 'Grace Hopper',
      playedBack: false,
      hosted: false,
      wins: 2,
      losses: 1,
    }
    const invite: Invite = {
      gameId: 'game-1',
      hostId: 'mina',
      hostName: 'Mina Chen',
      board: [
        ['C', 'A'],
        ['T', 'S'],
      ],
    }
    render(<HomeDashboard {...props} games={[waiting]} invites={[invite]} />)

    const track = document.querySelector('.game-track')
    if (!(track instanceof HTMLElement)) throw new Error('missing game track')
    expect(track.style.transform).toBe('translateX(0%)')

    await userEvent.click(screen.getByRole('tab', { name: 'Invited games' }))
    expect(track.style.transform).toBe('translateX(-100%)')
    expect(screen.getByRole('list', { name: 'Invited games' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Completed games' }))
    expect(track.style.transform).toBe('translateX(-200%)')

    await userEvent.click(screen.getByRole('tab', { name: 'Active games' }))
    expect(track.style.transform).toBe('translateX(0%)')
    expect(screen.getByRole('list', { name: 'Active games' })).toBeInTheDocument()
  })

  it('picks a new word each time the home screen is opened', () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0)
    const { unmount } = render(<HomeDashboard {...props} />)
    expect(screen.getByRole('heading', { name: MISSED_SIXES[0].word })).toBeInTheDocument()
    unmount()

    random.mockReturnValueOnce(0.99)
    render(<HomeDashboard {...props} />)
    const last = MISSED_SIXES[MISSED_SIXES.length - 1]
    expect(screen.getByRole('heading', { name: last.word })).toBeInTheDocument()
    expect(screen.getByText(last.definition)).toBeInTheDocument()
    random.mockRestore()
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
      hosted: false,
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

    const board = screen.getByRole('button', { name: 'Played today' })
    const results = screen.getByRole('button', { name: "Today's results" })
    const stats = screen.getByRole('button', { name: 'Your stats' })
    const games = screen.getByRole('list', { name: 'Active games' })
    expect(board).toBeDisabled()
    expect(board.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(results.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(stats.compareDocumentPosition(games) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await userEvent.click(results)
    expect(onDailyResults).toHaveBeenCalledOnce()
  })

  it('starts today\'s board only before it has been played', async () => {
    const onDaily = vi.fn()
    const { rerender } = render(
      <HomeDashboard {...props} onDaily={onDaily} onDailyResults={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: "Today's board" }))
    expect(onDaily).toHaveBeenCalledOnce()

    rerender(<HomeDashboard {...props} onDaily={onDaily} onDailyResults={vi.fn()} dailyPlayed />)

    const played = screen.getByRole('button', { name: 'Played today' })
    expect(played).toBeDisabled()
    await userEvent.click(played)
    expect(onDaily).toHaveBeenCalledOnce()
  })

  it('lists active games with the record and opens the one you choose', async () => {
    const waiting: ActiveGame = {
      gameId: 'g-new',
      opponentId: 'grace',
      opponentName: 'Grace Hopper',
      playedBack: false,
      hosted: false,
      wins: 2,
      losses: 1,
    }
    const played: ActiveGame = {
      gameId: 'g-old',
      opponentId: 'mina',
      opponentName: 'Mina Chen',
      playedBack: true,
      hosted: false,
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

    const board = screen.getByRole('button', { name: 'Played today' })
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
      hosted: false,
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

  it('badges each unread game you invited and clears one after it is opened', async () => {
    const first: ActiveGame = {
      gameId: 'g1',
      opponentId: 'grace',
      opponentName: 'Grace Hopper',
      playedBack: true,
      hosted: true,
      wins: 1,
      losses: 0,
    }
    const second: ActiveGame = {
      gameId: 'g2',
      opponentId: 'mina',
      opponentName: 'Mina Chen',
      playedBack: true,
      hosted: true,
      wins: 0,
      losses: 1,
    }
    const joined: ActiveGame = {
      gameId: 'g3',
      opponentId: 'ada',
      opponentName: 'Ada Lovelace',
      playedBack: true,
      hosted: false,
      wins: 2,
      losses: 0,
    }
    const onOpenGame = vi.fn()
    const { rerender } = render(
      <HomeDashboard
        {...props}
        games={[first, second, joined]}
        readKeys={new Set()}
        onOpenGame={onOpenGame}
      />,
    )

    const tab = screen.getByRole('tab', { name: 'Completed games, 2 new' })
    expect(tab).toHaveTextContent('2')

    await userEvent.click(tab)
    const finished = screen.getByRole('list', { name: 'Completed games' })
    expect(within(finished).getByRole('button', { name: /Grace Hopper/ })).toHaveTextContent('New')
    expect(within(finished).getByRole('button', { name: /Ada Lovelace/ })).not.toHaveTextContent('New')

    await userEvent.click(within(finished).getByRole('button', { name: /Grace Hopper/ }))
    expect(onOpenGame).toHaveBeenCalledExactlyOnceWith(first)

    rerender(
      <HomeDashboard
        {...props}
        games={[first, second, joined]}
        readKeys={new Set([completedGameKey(first)])}
        onOpenGame={onOpenGame}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Completed games, 1 new' })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /Grace Hopper/ })).not.toHaveTextContent('New')
    expect(screen.getByRole('button', { name: /Mina Chen/ })).toHaveTextContent('New')
  })
})

function missedWordOnScreen() {
  const word = screen.getByRole('heading').textContent
  const entry = MISSED_SIXES.find((item) => item.word === word)
  if (!entry) throw new Error(`heading ${word} is not a missed six-letter word`)
  return entry
}
