import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GameStat } from '../stats/series'
import { StatsScreen } from './StatsScreen'

const games: GameStat[] = [
  {
    id: 'a',
    playedOn: '2026-10-01',
    words: 4,
    score: 1000,
    longest: 'star',
    opponents: [{ name: 'Mina Chen', score: 400 }],
  },
  {
    id: 'b',
    playedOn: '2026-10-08',
    words: 8,
    score: 2000,
    longest: 'quartz',
    opponents: [{ name: 'Jonah Park', score: 2400 }],
  },
  {
    id: 'c',
    playedOn: '2026-10-15',
    words: 6,
    score: 1500,
    longest: 'cats',
    opponents: [{ name: 'Mina Chen', score: 1500 }],
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
    expect(figure('Points a game')).toHaveTextContent('1,250')
    expect(section('Win rate')).toHaveTextContent('50%')
    expect(section('Win rate')).toHaveTextContent('Wins')
    expect(screen.getByRole('img', { name: 'Win rate. 1 wins, 0 losses, 1 ties.' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Jonah Park' }))

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
    expect(section('Win rate')).toHaveTextContent('—')
    expect(section('Win rate')).toHaveTextContent('No head-to-head games yet.')

    rerender(<StatsScreen {...props} notice="Could not load your stats." onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your stats.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('keeps solo games on the date charts only', () => {
    render(
      <StatsScreen
        {...props}
        games={[
          ...games,
          { id: 'solo', playedOn: '2026-10-16', words: 3, score: 300, longest: 'zen', opponents: [] },
        ]}
      />,
    )

    expect(figure('Words a game')).toHaveTextContent('5.3')
    expect(section('Win rate')).toHaveTextContent(
      '1 solo game stays on the words, score, and longest-word cards.',
    )
  })
})

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
