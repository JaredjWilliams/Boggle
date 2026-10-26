import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { START_CELLS, type GameStat } from '../stats/series'
import { StatsScreen } from './StatsScreen'

const games: GameStat[] = [
  {
    id: 'a',
    playedOn: '2026-10-01',
    words: 4,
    score: 1000,
    longest: 'star',
    byLength: { 3: 2, 4: 2 },
    opponents: [{ name: 'Mina Chen', score: 400 }],
    leftOn: [{ found: 'cat', longer: 'catch', points: 800 }],
  },
  {
    id: 'b',
    playedOn: '2026-10-08',
    words: 8,
    score: 2000,
    longest: 'quartz',
    byLength: { 3: 1, 4: 2, 5: 3, 6: 2 },
    opponents: [{ name: 'Jonah Park', score: 2400 }],
    leftOn: [
      { found: 'late', longer: 'later', points: 800 },
      { found: 'star', longer: 'starch', points: 1400 },
    ],
  },
  {
    id: 'c',
    playedOn: '2026-10-15',
    words: 6,
    score: 1500,
    longest: 'cats',
    byLength: { 3: 3, 4: 2, 5: 1 },
    opponents: [{ name: 'Mina Chen', score: 1500 }],
    leftOn: [],
  },
]

const props = {
  playerName: 'Ada Lovelace',
  games,
  loading: false,
  notice: '',
}

describe('StatsScreen', () => {
  it('plots words and score by date and shows the win rate', () => {
    render(<StatsScreen {...props} />)

    expect(screen.getByRole('heading', { name: 'Every game, plotted.' })).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()

    const words = section('Words a game')
    expect(figure('Words a game')).toHaveTextContent('6')
    expect(words).toHaveTextContent('Up about 1 word a week.')
    expect(within(words).getByRole('img', { name: 'Words found on each date' })).toBeInTheDocument()
    expect(within(words).getAllByTestId('trend-line')).toHaveLength(1)

    expect(figure('Longest word')).toHaveTextContent('quartz')
    expect(section('Longest word')).toHaveTextContent('6 letters, found Oct 8 against Jonah Park.')

    const lengths = section('Words by length')
    expect(lengths).toHaveTextContent('18 words across these games.')
    expect(figure('Where you start')).toHaveTextContent('—')
    expect(section('Where you start')).toHaveTextContent('No traced starts saved in this view.')
    expect(lengthCount('3+')).toHaveTextContent('6')
    expect(lengthCount('4+')).toHaveTextContent('6')
    expect(lengthCount('5+')).toHaveTextContent('4')
    expect(lengthCount('6+')).toHaveTextContent('2')
    expect(lengthCount('8+')).toHaveTextContent('0')

    const started = section('Words you had started')
    expect(figure('Words you had started')).toHaveTextContent('3')
    expect(started).toHaveTextContent('Worth 3,000 points still on the board.')
    expect(within(started).getByText(/cat extended to catch, 800 points/)).toBeInTheDocument()
    expect(within(started).getByText(/star extended to starch, 1,400 points/)).toBeInTheDocument()
    expect(within(started).getByText(/late extended to later, 800 points/)).toBeInTheDocument()

    const score = section('Points a game')
    expect(figure('Points a game')).toHaveTextContent('1,500')
    expect(score).toHaveTextContent('Up about 250 points a week.')
    expect(within(score).getAllByTestId('trend-line')).toHaveLength(1)

    const wins = section('Win rate')
    expect(wins).toHaveTextContent('33%')
    expect(wins).toHaveTextContent('3 games with another player.')
    expect(within(wins).getByRole('img', { name: 'Win rate. 1 wins, 1 losses, 1 ties.' })).toBeInTheDocument()
    expect(within(wins).getByText('Wins').closest('li')).toHaveTextContent('1 · 33%')
  })

  it('filters every chart to one player', async () => {
    render(<StatsScreen {...props} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Mina Chen' }))

    expect(figure('Words a game')).toHaveTextContent('5')
    expect(figure('Longest word')).toHaveTextContent('cats')
    expect(section('Longest word')).toHaveTextContent('4 letters, found Oct 15 against Mina Chen.')
    expect(section('Words by length')).toHaveTextContent('10 words across these games.')
    expect(lengthCount('3+')).toHaveTextContent('5')
    expect(lengthCount('6+')).toHaveTextContent('0')
    expect(figure('Words you had started')).toHaveTextContent('1')
    expect(section('Words you had started')).toHaveTextContent('Worth 800 points still on the board.')
    expect(section('Words you had started')).toHaveTextContent('cat extended to catch, 800 points')
    expect(section('Words you had started')).not.toHaveTextContent('starch')
    expect(figure('Points a game')).toHaveTextContent('1,250')
    expect(section('Win rate')).toHaveTextContent('50%')
    expect(section('Win rate')).toHaveTextContent('Wins')
    expect(screen.getByRole('img', { name: 'Win rate. 1 wins, 0 losses, 1 ties.' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Jonah Park' }))

    expect(figure('Words you had started')).toHaveTextContent('2')
    expect(section('Words you had started')).toHaveTextContent('Worth 2,200 points still on the board.')
    expect(section('Words a game')).toHaveTextContent('Play another game to see a trend.')
    expect(screen.queryAllByTestId('trend-line')).toHaveLength(0)
    expect(section('Win rate')).toHaveTextContent('0%')
  })

  it('explains an empty record and a failed load', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<StatsScreen {...props} games={[]} />)

    expect(screen.getAllByText('No games yet')).toHaveLength(2)
    expect(figure('Longest word')).toHaveTextContent('—')
    expect(section('Longest word')).toHaveTextContent('No games in this view.')
    expect(section('Words by length')).toHaveTextContent('No games in this view.')
    expect(figure('Where you start')).toHaveTextContent('—')
    expect(section('Where you start')).toHaveTextContent('No games in this view.')
    expect(figure('Words you had started')).toHaveTextContent('—')
    expect(section('Words you had started')).toHaveTextContent('No games in this view.')
    expect(lengthCount('3+')).toHaveTextContent('0')
    expect(section('Win rate')).toHaveTextContent('—')
    expect(section('Win rate')).toHaveTextContent('No head-to-head games yet.')

    rerender(<StatsScreen {...props} notice="Could not load your stats." onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your stats.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows the average traced start on each square', async () => {
    render(
      <StatsScreen
        {...props}
        games={[
          { ...games[0], starts: cells({ 0: 2, 6: 1 }) },
          { ...games[1], starts: cells({ 0: 4 }) },
          games[2],
        ]}
      />,
    )

    const where = section('Where you start')
    const heat = within(where).getByRole('figure', { name: 'Where traced words started' })
    expect(heat).toHaveTextContent('3.0')
    expect(within(heat).getByLabelText('Row 1, column 1, 3.0 words')).toHaveTextContent('3.0')
    expect(within(heat).getByLabelText('Row 2, column 2, 0.5 words')).toHaveTextContent('0.5')
    expect(within(heat).getByLabelText('Row 5, column 5, 0.0 words')).toHaveTextContent('0.0')
    expect(where).toHaveTextContent('1 game has no traced starts.')
    expect(heat.querySelectorAll('.start-heat-cell')).toHaveLength(25)

    await userEvent.click(screen.getByRole('radio', { name: 'Jonah Park' }))
    expect(within(section('Where you start')).getByLabelText('Row 1, column 1, 4.0 words')).toHaveTextContent('4.0')
    expect(section('Where you start')).not.toHaveTextContent('no traced starts')
  })

  it('keeps solo games on the date charts only', () => {
    render(
      <StatsScreen
        {...props}
        games={[
          ...games,
          {
            id: 'solo',
            playedOn: '2026-10-16',
            words: 3,
            score: 300,
            longest: 'zen',
            byLength: { 3: 3 },
            opponents: [],
            leftOn: [],
          },
        ]}
      />,
    )

    expect(figure('Words a game')).toHaveTextContent('5.3')
    expect(section('Win rate')).toHaveTextContent(
      '1 solo game stays on the words, score, longest-word, length, where-you-start, and started-word cards.',
    )
  })
})

function cells(marks: Record<number, number>): number[] {
  const grid = Array.from({ length: START_CELLS }, () => 0)
  for (const [index, count] of Object.entries(marks)) grid[Number(index)] = count
  return grid
}

function section(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const card = heading.closest('section')
  if (!(card instanceof HTMLElement)) throw new Error(`Missing section for ${name}`)
  return card
}

function figure(name: string): HTMLElement {
  const value = section(name).querySelector('.stat-figure')
  if (!(value instanceof HTMLElement)) throw new Error(`Missing figure for ${name}`)
  return value
}

function lengthCount(label: string): HTMLElement {
  const item = within(section('Words by length')).getByText(label).closest('li')
  if (!(item instanceof HTMLElement)) throw new Error(`Missing length ${label}`)
  const value = item.querySelector('strong')
  if (!(value instanceof HTMLElement)) throw new Error(`Missing count for ${label}`)
  return value
}
