import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDailyStandings } from '../data/daily'
import { DailyBoardResults, DailyResults } from './DailyResults'

vi.mock('../data/daily', () => ({
  loadDailyStandings: vi.fn(),
}))

const standings = [
  {
    playerId: 'ada',
    name: 'Ada Lovelace',
    score: 500,
    wordCount: 2,
    longest: 'quartz',
  },
  {
    playerId: 'grace',
    name: 'Grace Hopper',
    score: 0,
    wordCount: 0,
    longest: '',
  },
]

describe('DailyResults', () => {
  it('lists each player’s score, word count, and longest word', () => {
    render(<DailyResults viewerId="ada" standings={standings} loading={false} notice="" />)

    expect(screen.getByRole('heading', { name: "Today's results" })).toBeInTheDocument()
    const ada = card('Ada Lovelace')
    expect(ada).toHaveTextContent('You')
    expect(ada).toHaveTextContent(/Score\s*500/)
    expect(ada).toHaveTextContent(/Words\s*2/)
    expect(ada).toHaveTextContent(/Longest word\s*quartz/i)
    expect(screen.queryByText('cat')).not.toBeInTheDocument()

    const grace = card('Grace Hopper')
    expect(grace).toHaveTextContent(/Score\s*0/)
    expect(grace).toHaveTextContent(/Words\s*0/)
    expect(grace).toHaveTextContent(/Longest word\s*None/i)
  })

  it('shows a loading state, then an error that can be retried', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <DailyResults viewerId="ada" standings={[]} loading notice="" />,
    )

    expect(screen.getByText("Loading today's results…")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ada Lovelace' })).not.toBeInTheDocument()

    rerender(
      <DailyResults
        viewerId="ada"
        standings={[]}
        loading={false}
        notice="Could not load today's results."
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent("Could not load today's results.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('explains when nobody has finished', () => {
    render(<DailyResults viewerId="ada" standings={[]} loading={false} notice="" />)
    expect(screen.getByText("No one has finished today's board.")).toBeInTheDocument()
  })
})

describe('DailyBoardResults', () => {
  beforeEach(() => {
    vi.mocked(loadDailyStandings).mockReset()
  })

  it('shows the standings loaded for today', async () => {
    vi.mocked(loadDailyStandings).mockResolvedValue(standings)

    render(<DailyBoardResults playerId="ada" />)

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(card('Ada Lovelace')).toHaveTextContent(/Words\s*2/)
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(loadDailyStandings).toHaveBeenCalledOnce()
  })

  it('shows a load error and retries', async () => {
    vi.mocked(loadDailyStandings)
      .mockRejectedValueOnce(new Error("Could not load today's results."))
      .mockResolvedValueOnce(standings)

    render(<DailyBoardResults playerId="ada" />)

    expect(await screen.findByRole('alert')).toHaveTextContent("Could not load today's results.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(loadDailyStandings).toHaveBeenCalledTimes(2)
  })

  it('explains an unknown load failure', async () => {
    vi.mocked(loadDailyStandings).mockRejectedValueOnce('offline')

    render(<DailyBoardResults playerId="ada" />)

    expect(await screen.findByRole('alert')).toHaveTextContent("Could not load today's results.")
  })
})

function card(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const article = heading.closest('article')
  if (!(article instanceof HTMLElement)) throw new Error(`Missing card for ${name}`)
  return article
}
