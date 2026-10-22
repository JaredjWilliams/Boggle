import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SIDE } from '../game/dice'
import { ROUND_SECONDS } from '../game/round'
import { scoreWord } from '../game/words'
import { HomeDashboard } from './HomeDashboard'

const props = {
  loading: false,
  loadError: false,
  lastScore: null,
  onStart: vi.fn(),
}

describe('HomeDashboard', () => {
  it('shows the round and the points for each word length', () => {
    render(<HomeDashboard {...props} />)

    expect(screen.getByRole('heading', { name: 'Find every word.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play solo' })).toBeEnabled()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Time').closest('div')).toHaveTextContent(formatRound(ROUND_SECONDS))
    expect(screen.getByText('Board').closest('div')).toHaveTextContent(`${SIDE}×${SIDE}`)
    expect(screen.getByText('Words').closest('div')).toHaveTextContent('3+')

    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual(
      [3, 4, 5, 6, 7, 8].map(pointsName),
    )
    expect(screen.queryByText('Last score')).not.toBeInTheDocument()
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

  it('shows today\'s results under the daily board after it has been played', async () => {
    const onDaily = vi.fn()
    const onDailyResults = vi.fn()
    const { rerender } = render(
      <HomeDashboard {...props} onDaily={onDaily} onDailyResults={onDailyResults} />,
    )

    expect(screen.queryByRole('button', { name: "Today's results" })).not.toBeInTheDocument()

    rerender(
      <HomeDashboard {...props} onDaily={onDaily} onDailyResults={onDailyResults} dailyPlayed />,
    )

    const board = screen.getByRole('button', { name: "Today's board" })
    const results = screen.getByRole('button', { name: "Today's results" })
    expect(board.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await userEvent.click(results)
    expect(onDailyResults).toHaveBeenCalledOnce()
  })

  it('shows a finished score, including zero', () => {
    const { rerender } = render(<HomeDashboard {...props} lastScore={0} />)
    expect(screen.getByText('Last score').closest('p')).toHaveTextContent(/^Last score0$/)

    rerender(<HomeDashboard {...props} lastScore={1400} />)
    expect(screen.getByText('Last score').closest('p')).toHaveTextContent(/^Last score1400$/)
  })
})

function formatRound(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function pointsName(length: number): string {
  const letters = length >= 8 ? '8 or more' : String(length)
  const points = scoreWord('a'.repeat(length))
  const shown = length >= 8 ? `${points}+` : String(points)
  return `${letters} letters, ${shown} points`
}
