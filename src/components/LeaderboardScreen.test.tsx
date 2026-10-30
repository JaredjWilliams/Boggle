import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLeaderboard } from '../api/leaderboard'
import type { LeaderboardBoard } from '../domain/leaderboard'
import { LeaderboardScreen, PlayerLeaderboard } from './LeaderboardScreen'

vi.mock('../api/leaderboard', () => ({
  loadLeaderboard: vi.fn(),
}))

const boards: LeaderboardBoard[] = [
  {
    id: 'daily',
    title: 'Daily boards won',
    note: 'Highest score at the end of that day. A tie is not a win.',
    figureKind: 'count',
    rows: [
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 4, figure: '4', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 2, value: 1, figure: '1', caption: '' },
    ],
  },
  {
    id: 'points',
    title: 'Points scored',
    note: 'Total points from every finished game.',
    figureKind: 'count',
    rows: [{ playerId: 'grace', name: 'Grace Hopper', rank: 1, value: 1200, figure: '1,200', caption: '' }],
  },
  {
    id: 'bestScore',
    title: 'Highest score',
    note: 'The highest score from a single game.',
    figureKind: 'count',
    rows: [{ playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 180, figure: '180', caption: '' }],
  },
  {
    id: 'words',
    title: 'Most words in a game',
    note: 'The highest word count from a single game.',
    figureKind: 'count',
    rows: [],
  },
  {
    id: 'longest',
    title: 'Longest word',
    note: 'The longest word saved from a single game.',
    figureKind: 'word',
    rows: [
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        rank: 1,
        value: 6,
        figure: 'QUARTZ',
        caption: '6 letters',
      },
    ],
  },
  {
    id: 'wins',
    title: 'Wins',
    note: 'Each opponent you outscore on a shared board is a win.',
    figureKind: 'count',
    rows: [],
  },
  {
    id: 'solo',
    title: 'Solo plays',
    note: 'Finished games with nobody else in the match.',
    figureKind: 'count',
    rows: [],
  },
  {
    id: 'averageWords',
    title: 'Average words',
    note: 'Words found per finished game.',
    figureKind: 'count',
    rows: [],
  },
  {
    id: 'averagePoints',
    title: 'Average points',
    note: 'Points scored per finished game.',
    figureKind: 'count',
    rows: [],
  },
]

describe('LeaderboardScreen', () => {
  it('shows every record’s leader and the selected ranking', async () => {
    const user = userEvent.setup()
    render(<LeaderboardScreen viewerId="ada" boards={boards} loading={false} notice="" />)

    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument()
    const daily = screen.getByRole('radio', { name: /Daily boards won/ })
    expect(daily).toHaveAttribute('aria-checked', 'true')
    expect(daily).toHaveTextContent('Ada Lovelace')
    expect(daily).toHaveTextContent('4')
    expect(screen.getByRole('radio', { name: /Points scored/ })).toHaveTextContent('1,200')
    expect(screen.getByRole('radio', { name: /Highest score/ })).toHaveTextContent('180')
    expect(screen.getByRole('radio', { name: /Longest word/ })).toHaveTextContent('QUARTZ')

    expect(screen.getByRole('heading', { name: 'Daily boards won' })).toBeInTheDocument()
    expect(screen.getByText('You are 1st of 2.')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Highest score/ }))

    expect(screen.getByRole('heading', { name: 'Highest score' })).toBeInTheDocument()
    expect(screen.getByText('The highest score from a single game.')).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('180')
    expect(screen.getByText('You are 1st of 1.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Longest word/ }))

    expect(screen.getByRole('heading', { name: 'Longest word' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('QUARTZ')
    expect(screen.getByRole('list')).toHaveTextContent('6 letters')
    expect(screen.getByText('You are not ranked here yet.')).toBeInTheDocument()
    expect(screen.queryByText('You')).not.toBeInTheDocument()
  })

  it('ranks best friends and shows each player’s wins', async () => {
    const user = userEvent.setup()
    const friends: LeaderboardBoard = {
      id: 'friends',
      title: 'Best friends',
      note: 'Games finished together. The number beside each name is wins against the other.',
      figureKind: 'count',
      rows: [
        {
          playerId: 'ada\0grace',
          name: 'Ada Lovelace & Grace Hopper',
          rank: 1,
          value: 3,
          figure: '3',
          caption: '1 tie',
          scores: [
            { playerId: 'ada', name: 'Ada Lovelace', wins: 2 },
            { playerId: 'grace', name: 'Grace Hopper', wins: 0 },
          ],
        },
        {
          playerId: 'grace\0mina',
          name: 'Grace Hopper & Mina Chen',
          rank: 2,
          value: 1,
          figure: '1',
          caption: '',
          scores: [
            { playerId: 'grace', name: 'Grace Hopper', wins: 1 },
            { playerId: 'mina', name: 'Mina Chen', wins: 0 },
          ],
        },
      ],
    }
    render(<LeaderboardScreen viewerId="ada" boards={[friends]} loading={false} notice="" />)

    expect(screen.getByRole('radio', { name: /Best friends/ })).toHaveTextContent('Ada Lovelace & Grace Hopper')
    expect(screen.getByText('You are 1st of 2.')).toBeInTheDocument()
    const list = screen.getByRole('list')
    expect(list).toHaveTextContent('Ada Lovelace')
    expect(list).toHaveTextContent('You')
    expect(list).toHaveTextContent('Grace Hopper')
    expect(list).toHaveTextContent('1 tie')
    expect(list).toHaveTextContent('games')

    await user.click(screen.getByRole('radio', { name: /Best friends/ }))
    expect(screen.getByRole('heading', { name: 'Best friends' })).toBeInTheDocument()
  })

  it('explains an empty record', async () => {
    const user = userEvent.setup()
    render(<LeaderboardScreen viewerId="ada" boards={boards} loading={false} notice="" />)

    await user.click(screen.getByRole('radio', { name: /Most words in a game/ }))

    expect(screen.getByRole('radio', { name: /Most words in a game/ })).toHaveTextContent('No one yet')
    expect(screen.getByText('No one has this record yet.')).toBeInTheDocument()
  })

  it('shows a loading state, then an error that can be retried', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <LeaderboardScreen viewerId="ada" boards={[]} loading notice="" />,
    )

    expect(screen.getByText('Loading the leaderboard…')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()

    rerender(
      <LeaderboardScreen
        viewerId="ada"
        boards={[]}
        loading={false}
        notice="Could not load the leaderboard."
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the leaderboard.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('PlayerLeaderboard', () => {
  beforeEach(() => {
    vi.mocked(loadLeaderboard).mockReset()
  })

  it('shows the loaded records', async () => {
    vi.mocked(loadLeaderboard).mockResolvedValue(boards)

    render(<PlayerLeaderboard viewerId="ada" />)

    expect(await screen.findByRole('heading', { name: 'Daily boards won' })).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(loadLeaderboard).toHaveBeenCalledOnce()
  })

  it('shows a load error and retries', async () => {
    vi.mocked(loadLeaderboard)
      .mockRejectedValueOnce(new Error('Could not load the leaderboard.'))
      .mockResolvedValueOnce(boards)

    render(<PlayerLeaderboard viewerId="ada" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the leaderboard.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Daily boards won' })).toBeInTheDocument()
    expect(loadLeaderboard).toHaveBeenCalledTimes(2)
  })

  it('explains an unknown load failure', async () => {
    vi.mocked(loadLeaderboard).mockRejectedValueOnce('offline')

    render(<PlayerLeaderboard viewerId="ada" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the leaderboard.')
  })
})
