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
    expect(screen.getByRole('button', { name: 'Start game' })).toBeEnabled()
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

    await userEvent.click(screen.getByRole('button', { name: 'Start game' }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  it('waits while the word list loads', () => {
    render(<HomeDashboard {...props} loading />)

    expect(screen.getByRole('button', { name: 'Loading words…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument()
  })

  it('explains when the word list cannot load', async () => {
    const onStart = vi.fn()
    render(<HomeDashboard {...props} loadError onStart={onStart} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the word list.')
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Start game' }))
    expect(onStart).not.toHaveBeenCalled()
  })

  it('opens stats and toggles sample games from the dashboard', async () => {
    const onOpenStats = vi.fn()
    const onToggleSeed = vi.fn()
    const { rerender } = render(
      <HomeDashboard {...props} onOpenStats={onOpenStats} onToggleSeed={onToggleSeed} seedReady={false} />,
    )

    expect(screen.queryByRole('switch', { name: 'Sample games' })).not.toBeInTheDocument()

    rerender(
      <HomeDashboard {...props} onOpenStats={onOpenStats} onToggleSeed={onToggleSeed} seedReady />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Your stats' }))
    const sample = screen.getByRole('switch', { name: 'Sample games' })
    expect(sample).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sample)

    expect(onOpenStats).toHaveBeenCalledOnce()
    expect(onToggleSeed).toHaveBeenCalledOnce()

    rerender(
      <HomeDashboard
        {...props}
        onToggleSeed={onToggleSeed}
        seedReady
        seeded
        seeding
        seedNotice="Added 18 sample games."
      />,
    )
    const updating = screen.getByRole('switch', { name: 'Sample games' })
    expect(updating).toBeDisabled()
    expect(updating).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Added 18 sample games.')

    rerender(
      <HomeDashboard
        {...props}
        onToggleSeed={onToggleSeed}
        seedReady
        seedFailed
        seedNotice="Could not update sample games."
      />,
    )
    expect(screen.getByRole('status')).toHaveClass('seed-note-error')
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
