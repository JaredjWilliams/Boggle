import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchResults, MatchReview, PotentialWords } from './MatchResults'

const mocks = vi.hoisted(() => ({
  loadMatchPlayers: vi.fn(),
  watchMatchResults: vi.fn<(gameId: string, onChange: () => void) => () => void>(() => () => {}),
}))

vi.mock('../data/matches', () => ({
  loadMatchPlayers: mocks.loadMatchPlayers,
  watchMatchResults: mocks.watchMatchResults,
}))

const ada = {
  id: 'ada',
  name: 'Ada Lovelace',
  you: true,
  score: 200,
  words: [
    { word: 'eat', points: 100 },
    { word: 'cat', points: 100 },
  ],
}

const grace = {
  id: 'grace',
  name: 'Grace Hopper',
  you: false,
  score: 500,
  words: [{ word: 'cats', points: 400 }],
}

describe('MatchResults', () => {
  it('shows both scores, both word lists, and the winner', () => {
    render(<MatchResults players={[ada, grace]} onShowPotential={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Grace Hopper wins' })).toHaveClass(
      'is-their-win',
    )
    expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument()

    const yours = column('Ada Lovelace')
    const theirs = column('Grace Hopper')
    expect(yours).toHaveTextContent('You')
    expect(yours).not.toHaveTextContent('Winner')
    expect(score(yours)).toBe('200')
    expect(items(yours)).toEqual([
      { word: 'eat', points: '100' },
      { word: 'cat', points: '100' },
    ])

    expect(theirs).toHaveTextContent('Winner')
    expect(theirs).toHaveClass('is-winner')
    expect(score(theirs)).toBe('500')
    expect(items(theirs)).toEqual([{ word: 'cats', points: '400' }])

    expect(styleOf('.match-columns').display).toBe('grid')
    expect(styleOf('.match-columns').gridTemplateColumns).toBe('1fr 1fr')
  })

  it('says when you win or the scores are level', () => {
    const { rerender } = render(
      <MatchResults players={[ada, { ...grace, score: 100 }]} onShowPotential={vi.fn()} />,
    )

    const outcome = screen.getByRole('heading', { level: 1 })
    expect(outcome).toHaveTextContent('You win')
    expect(outcome).toHaveClass('is-you-win')
    expect(column('Ada Lovelace')).toHaveTextContent('Winner')
    expect(column('Grace Hopper')).not.toHaveTextContent('Winner')

    rerender(
      <MatchResults players={[ada, { ...grace, score: 200 }]} onShowPotential={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: "It's a tie" })).toBeInTheDocument()
    expect(column('Ada Lovelace')).toHaveTextContent('Tie')
    expect(column('Grace Hopper')).toHaveTextContent('Tie')
    expect(screen.queryByText('Winner')).not.toBeInTheDocument()
  })

  it('waits for an opponent who has not finished', () => {
    render(
      <MatchResults
        players={[ada, { ...grace, score: null, words: null }]}
        onShowPotential={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Waiting for Grace Hopper' })).toHaveClass(
      'is-waiting',
    )
    const theirs = column('Grace Hopper')
    expect(score(theirs)).toBe('Still playing')
    expect(theirs).toHaveTextContent('Waiting for their words.')
    expect(within(theirs).queryByRole('list')).not.toBeInTheDocument()
  })

  it('explains an empty list and opens the potential words', async () => {
    const onShowPotential = vi.fn()
    const onRetry = vi.fn()
    render(
      <MatchResults
        players={[
          { ...ada, score: 0, words: [] },
          { ...grace, score: 0, words: [] },
        ]}
        notice="Could not load the results."
        onRetry={onRetry}
        onShowPotential={onShowPotential}
      />,
    )

    expect(column('Ada Lovelace')).toHaveTextContent('None this round.')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the results.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'See potential words' }))
    expect(onShowPotential).toHaveBeenCalledOnce()
    expect(styleOf('.see-words').minHeight).toBe('44px')
  })
})

describe('PotentialWords', () => {
  it('lists every word and returns to the results', async () => {
    const onBack = vi.fn()
    render(
      <PotentialWords
        words={[
          { word: 'cats', points: 400 },
          { word: 'cat', points: 100 },
        ]}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Potential words' })).toBeInTheDocument()
    expect(screen.getByText('Every word that could be found on this board.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'cats400',
      'cat100',
    ])
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toHaveFocus()
    expect(styleOf('.potential-back').minHeight).toBe('44px')

    await userEvent.click(back)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('explains a board with no words', () => {
    render(<PotentialWords words={[]} onBack={vi.fn()} />)
    expect(screen.getByText('No words on this board.')).toBeInTheDocument()
  })
})

describe('MatchReview', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    mocks.loadMatchPlayers.mockReset()
    mocks.watchMatchResults.mockReset()
    mocks.watchMatchResults.mockReturnValue(() => {})
  })

  it('keeps your words and fills in the opponent when their result arrives', async () => {
    mocks.loadMatchPlayers.mockResolvedValue([
      {
        playerId: 'ada',
        name: 'Ada Lovelace',
        score: 1,
        words: [],
      },
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 500,
        words: [{ word: 'cats', points: 400 }],
      },
    ])
    const onShowPotential = vi.fn()
    const onBack = vi.fn()
    const { rerender } = render(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[{ word: 'cat', points: 100 }]}
        missed={[{ word: 'eat', points: 100 }]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential={false}
        onShowPotential={onShowPotential}
        onBack={onBack}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Grace Hopper wins' })).toBeInTheDocument()
    expect(score(column('Ada Lovelace'))).toBe('200')
    expect(items(column('Ada Lovelace'))).toEqual([{ word: 'cat', points: '100' }])
    expect(items(column('Grace Hopper'))).toEqual([{ word: 'cats', points: '400' }])
    expect(mocks.watchMatchResults).toHaveBeenCalledWith('game-1', expect.any(Function))

    await userEvent.click(screen.getByRole('button', { name: 'See potential words' }))
    expect(onShowPotential).toHaveBeenCalledOnce()

    rerender(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[{ word: 'cat', points: 100 }]}
        missed={[{ word: 'eat', points: 100 }]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential
        onShowPotential={onShowPotential}
        onBack={onBack}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Potential words' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'cat100',
      'eat100',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('asks again while the other player is still going', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.loadMatchPlayers.mockResolvedValue([
      { playerId: 'grace', name: 'Grace Hopper', score: null, words: null },
    ])
    render(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[{ word: 'cat', points: 100 }]}
        missed={[]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential={false}
        onShowPotential={vi.fn()}
        onBack={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Waiting for Grace Hopper' })).toBeInTheDocument()
    expect(mocks.loadMatchPlayers).toHaveBeenCalledTimes(1)
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(mocks.loadMatchPlayers).toHaveBeenCalledTimes(2)
  })

  it('reloads when the other result is saved', async () => {
    mocks.loadMatchPlayers
      .mockResolvedValueOnce([{ playerId: 'grace', name: 'Grace Hopper', score: null, words: null }])
      .mockResolvedValueOnce([
        {
          playerId: 'grace',
          name: 'Grace Hopper',
          score: 100,
          words: [{ word: 'eat', points: 100 }],
        },
      ])
    render(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[{ word: 'cat', points: 100 }]}
        missed={[]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential={false}
        onShowPotential={vi.fn()}
        onBack={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(await screen.findByText('Still playing')).toBeInTheDocument()
    const onChange = mocks.watchMatchResults.mock.calls[0][1]
    onChange()
    expect(await screen.findByRole('heading', { level: 1, name: 'You win' })).toBeInTheDocument()
    expect(items(column('Grace Hopper'))).toEqual([{ word: 'eat', points: '100' }])
  })

  it('returns to a solo summary when nobody else stayed in the game', async () => {
    mocks.loadMatchPlayers.mockResolvedValue([
      { playerId: 'ada', name: 'Ada Lovelace', score: 200, words: [{ word: 'cat', points: 100 }] },
    ])
    const onPlayAgain = vi.fn()
    render(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[{ word: 'cat', points: 100 }]}
        missed={[{ word: 'eat', points: 100 }]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential={false}
        onShowPotential={vi.fn()}
        onBack={vi.fn()}
        onPlayAgain={onPlayAgain}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Play again' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See potential words' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Possible words' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onPlayAgain).toHaveBeenCalledOnce()
  })

  it('shows a load error without hiding the players you invited', async () => {
    mocks.loadMatchPlayers.mockRejectedValue(new Error('offline'))
    render(
      <MatchReview
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        score={200}
        words={[]}
        missed={[]}
        rivals={[{ id: 'grace', name: 'Grace Hopper' }]}
        showingPotential={false}
        onShowPotential={vi.fn()}
        onBack={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    expect(screen.getByRole('heading', { level: 1, name: 'Waiting for Grace Hopper' })).toBeInTheDocument()
    mocks.loadMatchPlayers.mockResolvedValueOnce([
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 0,
        words: [],
      },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'You win' })).toBeInTheDocument()
  })
})

function column(name: string) {
  const heading = screen.getByRole('heading', { name })
  const section = heading.closest('.match-player')
  if (!(section instanceof HTMLElement)) throw new Error(`Missing column for ${name}`)
  return section
}

function score(section: HTMLElement) {
  return within(section).getByText('Score').closest('p')?.querySelector('strong')?.textContent
}

function items(section: HTMLElement) {
  return within(section)
    .getAllByRole('listitem')
    .map((item) => {
      const [word, points] = [...item.querySelectorAll('span')].map((span) => span.textContent)
      return { word, points }
    })
}

function styleOf(selector: string) {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue
      const selectors = rule.selectorText.split(',').map((item) => item.trim())
      if (selectors.includes(selector)) return rule.style
    }
  }
  throw new Error(`Missing style rule ${selector}`)
}
