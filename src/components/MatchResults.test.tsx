import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchResults, MatchReview, PotentialWords, SavedMatch } from './MatchResults'

const mocks = vi.hoisted(() => ({
  loadMatchPlayers: vi.fn(),
  loadPlayerWords: vi.fn(),
  loadSavedRound: vi.fn(),
  watchMatchResults: vi.fn<(gameId: string, onChange: () => void) => () => void>(() => () => {}),
  loadWordDefinition: vi.fn<(word: string, signal: AbortSignal) => Promise<string | null>>(),
}))

vi.mock('../api/results', () => ({
  loadMatchPlayers: mocks.loadMatchPlayers,
  loadPlayerWords: mocks.loadPlayerWords,
  loadSavedRound: mocks.loadSavedRound,
  watchMatchResults: mocks.watchMatchResults,
}))

vi.mock('../api/define', () => ({
  loadWordDefinition: mocks.loadWordDefinition,
}))

beforeEach(() => {
  mocks.loadWordDefinition.mockReset()
  mocks.loadWordDefinition.mockResolvedValue(null)
})

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
  it('shows both scores, length summaries, and the winner', () => {
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
    expect(wordsFound(yours)).toBe('2')
    expect(lengthsFound(yours)).toBe('3:2')
    expect(within(yours).queryByRole('list')).not.toBeInTheDocument()

    expect(theirs).toHaveTextContent('Winner')
    expect(theirs).toHaveClass('is-winner')
    expect(score(theirs)).toBe('500')
    expect(wordsFound(theirs)).toBe('1')
    expect(lengthsFound(theirs)).toBe('4:1')
    expect(within(theirs).queryByRole('list')).not.toBeInTheDocument()

    expect(styleOf('.match-columns').display).toBe('flex')
    expect(styleOf('.match-columns').flexDirection).toBe('column')
    expect(styleOf('.match-score-top').justifyContent).toBe('space-between')
    expect(styleOf('.match-figures').justifyContent).toBe('space-between')
    expect(styleOf('.match-points strong').fontSize).toBe('22px')
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
    expect(wordsFound(theirs)).toBeNull()
    expect(lengthsFound(theirs)).toBeNull()
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
    expect(wordsFound(column('Ada Lovelace'))).toBe('0')
    expect(lengthsFound(column('Ada Lovelace'))).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the results.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'See potential words' }))
    expect(onShowPotential).toHaveBeenCalledOnce()
    expect(styleOf('.see-words').minHeight).toBe('44px')
  })
})

const playedBoard = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Qu'],
]

describe('PotentialWords', () => {
  it('lists every word and returns to the results', async () => {
    const onBack = vi.fn()
    render(
      <PotentialWords
        words={[
          { word: 'cats', points: 400 },
          { word: 'cat', points: 100 },
        ]}
        board={playedBoard}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Potential words' })).toBeInTheDocument()
    expect(screen.getByText('Tap a word to see how it was formed.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['cats', 'cat'])
    expect(screen.queryByText('400')).not.toBeInTheDocument()
    expect(styleOf('.potential-stage').flexDirection).toBe('row')
    expect(styleOf('.potential-board').justifyContent).toBe('flex-start')
    expect(styleOf('.potential-board').flexGrow).toBe('2')
    expect(styleOf('.potential-scroll').flexGrow).toBe('1')
    expect(styleOf('.word-pick').minHeight).toBe('44px')
    expect(styleOf('.potential-scroll .word-list .word').fontSize).toBe('9px')
    expect(document.querySelector('.grid')).toHaveClass('review')
    expect(tile(0, 3)).toHaveAttribute('data-letter', 'S')
    expect(tile(0, 0)).not.toHaveClass('selected')

    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toHaveFocus()
    expect(styleOf('.potential-back').minHeight).toBe('44px')

    await userEvent.click(back)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('traces the chosen word on the board and clears it on a second tap', async () => {
    render(
      <PotentialWords
        words={[
          { word: 'cats', points: 400 },
          { word: 'cat', points: 100 },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'cats' }))
    expect(screen.getByRole('button', { name: 'cats' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.potential-trace')).toHaveTextContent('cats400')
    expect(document.querySelector('.potential-trace-points')).toHaveTextContent('400')
    expect(document.querySelector('.potential-trace')).toHaveClass('is-word')
    expect(stepAt(0, 0)).toBe('1')
    expect(stepAt(0, 1)).toBe('2')
    expect(stepAt(0, 2)).toBe('3')
    expect(stepAt(0, 3)).toBe('4')
    expect(tile(0, 4)).not.toHaveClass('selected')

    await userEvent.click(screen.getByRole('button', { name: 'cat' }))
    expect(document.querySelector('.potential-trace-points')).toHaveTextContent('100')
    expect(screen.getByRole('button', { name: 'cats' })).toHaveAttribute('aria-pressed', 'false')
    expect(stepAt(0, 0)).toBe('1')
    expect(stepAt(0, 2)).toBe('3')
    expect(tile(0, 3)).not.toHaveClass('selected')

    await userEvent.click(screen.getByRole('button', { name: 'cat' }))
    expect(screen.getByRole('button', { name: 'cat' })).toHaveAttribute('aria-pressed', 'false')
    expect(tile(0, 0)).not.toHaveClass('selected')
    expect(screen.getByText('The board from this game')).toBeInTheDocument()
    expect(screen.queryByText('No definition for this word.')).not.toBeInTheDocument()
  })

  it('shows the definition under the board and clears it on a second tap', async () => {
    const pending = deferred<string | null>()
    mocks.loadWordDefinition.mockReturnValue(pending.promise)
    render(
      <PotentialWords
        words={[
          { word: 'cats', points: 400 },
          { word: 'cat', points: 100 },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'cats' }))
    expect(screen.getByText('Looking up…')).toBeInTheDocument()
    expect(mocks.loadWordDefinition).toHaveBeenCalledWith('cats', expect.any(AbortSignal))

    pending.resolve('A small domesticated carnivore.')
    expect(await screen.findByText('A small domesticated carnivore.')).toBeInTheDocument()
    expect(document.querySelector('.potential-definition')).not.toHaveClass('is-pending')
    expect(screen.queryByText('Looking up…')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'cats' }))
    expect(screen.queryByText('A small domesticated carnivore.')).not.toBeInTheDocument()
    expect(mocks.loadWordDefinition).toHaveBeenCalledTimes(1)
  })

  it('keeps the player color key above the board while a definition is open', async () => {
    mocks.loadWordDefinition.mockResolvedValue('A feline.')
    render(
      <PotentialWords
        words={[{ word: 'cat', points: 100 }]}
        players={[
          {
            id: 'ada',
            name: 'Ada Lovelace',
            you: true,
            score: 100,
            words: [{ word: 'cat', points: 100 }],
          },
          {
            id: 'grace',
            name: 'Grace Hopper',
            you: false,
            score: 100,
            words: [],
          },
          {
            id: 'mina',
            name: 'Mina Chen',
            you: false,
            score: 50,
            words: [],
          },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    const board = document.querySelector('.potential-board')
    const key = screen.getByRole('list', { name: 'Player colors' })
    const trace = document.querySelector('.potential-trace')
    expect(board?.firstElementChild).toBe(key)
    expect(key.compareDocumentPosition(trace!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    await userEvent.click(screen.getByRole('button', { name: 'cat' }))
    expect(await screen.findByText('A feline.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Player colors' })).toBeInTheDocument()
    expect(document.querySelector('.potential-board')?.firstElementChild).toBe(
      screen.getByRole('list', { name: 'Player colors' }),
    )
  })

  it('keeps a slow definition from replacing the word now selected', async () => {
    const first = deferred<string | null>()
    const second = deferred<string | null>()
    mocks.loadWordDefinition.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    render(
      <PotentialWords
        words={[
          { word: 'cats', points: 400 },
          { word: 'cat', points: 100 },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'cats' }))
    await userEvent.click(screen.getByRole('button', { name: 'cat' }))
    await act(async () => {
      second.resolve('A feline.')
      first.resolve('More than one cat.')
    })
    expect(screen.getByText('A feline.')).toBeInTheDocument()
    expect(screen.queryByText('More than one cat.')).not.toBeInTheDocument()
  })

  it('explains a word with no definition', async () => {
    mocks.loadWordDefinition.mockRejectedValue(new Error('offline'))
    render(
      <PotentialWords words={[{ word: 'cat', points: 100 }]} board={playedBoard} onBack={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'cat' }))
    expect(await screen.findByText('No definition for this word.')).toBeInTheDocument()
    expect(document.querySelector('.potential-definition')).toHaveClass('is-pending')
  })

  it('explains a board with no words', () => {
    render(<PotentialWords words={[]} board={playedBoard} onBack={vi.fn()} />)
    expect(screen.getByText('No words on this board.')).toBeInTheDocument()
    expect(tile(0, 0)).toHaveAttribute('data-letter', 'C')
  })

  it('explains a game whose board was not saved', () => {
    render(
      <PotentialWords words={[{ word: 'cat', points: 100 }]} board={[]} onBack={vi.fn()} />,
    )
    expect(screen.getByText('This board was not saved.')).toBeInTheDocument()
    expect(document.querySelector('.grid')).not.toBeInTheDocument()
  })

  it('marks words with finder dots and shows a key for multiple opponents', () => {
    render(
      <PotentialWords
        words={[
          { word: 'yours', points: 100 },
          { word: 'theirs', points: 100 },
          { word: 'both', points: 100 },
          { word: 'rivals', points: 100 },
          { word: 'missed', points: 100 },
        ]}
        players={[
          {
            id: 'ada',
            name: 'Ada Lovelace',
            you: true,
            score: 200,
            words: [
              { word: 'yours', points: 100 },
              { word: 'both', points: 100 },
            ],
          },
          {
            id: 'grace',
            name: 'Grace Hopper',
            you: false,
            score: 100,
            words: [
              { word: 'theirs', points: 100 },
              { word: 'both', points: 100 },
              { word: 'rivals', points: 100 },
            ],
          },
          {
            id: 'mina',
            name: 'Mina Chen',
            you: false,
            score: 100,
            words: [{ word: 'rivals', points: 100 }],
          },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    expect(finderDots('yours')).toEqual(['is-you'])
    expect(finderDots('theirs')).toEqual(['is-opp-0'])
    expect(finderDots('both')).toEqual(['is-you', 'is-opp-0'])
    expect(finderDots('rivals')).toEqual(['is-opp-0', 'is-opp-1'])
    expect(finderDots('missed')).toEqual([])
    expect(wordLabel('yours')).not.toHaveClass('is-you')

    const key = screen.getByRole('list', { name: 'Player colors' })
    expect(within(key).getByText('You')).toBeInTheDocument()
    expect(within(key).getByText('Grace Hopper')).toBeInTheDocument()
    expect(within(key).getByText('Mina Chen')).toBeInTheDocument()
    const swatches = [...key.querySelectorAll('.potential-swatch')].map((swatch) =>
      [...swatch.classList].filter((name) => name.startsWith('is-')).join(' '),
    )
    expect(swatches).toEqual(['is-you', 'is-opp-0', 'is-opp-1'])
  })

  it('assigns a unique palette slot to each opponent in the key', () => {
    const opponents = Array.from({ length: 9 }, (_, index) => ({
      id: `opp-${index}`,
      name: `Opponent ${index}`,
      you: false,
      score: 100,
      words: [] as { word: string; points: number }[],
    }))
    render(
      <PotentialWords
        words={[{ word: 'cat', points: 100 }]}
        players={[
          {
            id: 'ada',
            name: 'Ada Lovelace',
            you: true,
            score: 100,
            words: [{ word: 'cat', points: 100 }],
          },
          ...opponents,
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    const key = screen.getByRole('list', { name: 'Player colors' })
    const opponentSwatches = [...key.querySelectorAll('.potential-swatch')]
      .slice(1)
      .map((swatch) => [...swatch.classList].find((name) => name.startsWith('is-opp-')))
    expect(opponentSwatches).toEqual([
      'is-opp-0',
      'is-opp-1',
      'is-opp-2',
      'is-opp-3',
      'is-opp-4',
      'is-opp-5',
      'is-opp-6',
      'is-opp-7',
      'is-opp-8',
    ])
  })

  it('hides the color key when there is only one opponent', () => {
    render(
      <PotentialWords
        words={[{ word: 'cat', points: 100 }]}
        players={[
          {
            id: 'ada',
            name: 'Ada Lovelace',
            you: true,
            score: 100,
            words: [{ word: 'cat', points: 100 }],
          },
          {
            id: 'grace',
            name: 'Grace Hopper',
            you: false,
            score: 100,
            words: [],
          },
        ]}
        board={playedBoard}
        onBack={vi.fn()}
      />,
    )

    expect(screen.queryByRole('list', { name: 'Player colors' })).not.toBeInTheDocument()
    expect(finderDots('cat')).toEqual(['is-you'])
  })
})

describe('MatchReview', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    mocks.loadMatchPlayers.mockReset()
    mocks.loadPlayerWords.mockReset()
    mocks.loadSavedRound.mockReset()
    mocks.watchMatchResults.mockReset()
    mocks.watchMatchResults.mockReturnValue(() => {})
  })

  it('opens a saved game on the results screen', async () => {
    mocks.loadSavedRound.mockResolvedValue({
      score: 200,
      words: [{ word: 'cat', points: 100 }],
      missed: [{ word: 'eat', points: 100 }],
    })
    mocks.loadMatchPlayers.mockResolvedValue([
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 500,
        words: [{ word: 'cats', points: 400 }],
      },
    ])

    render(
      <SavedMatch
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        rival={{ id: 'grace', name: 'Grace Hopper' }}
        onPlayAgain={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Grace Hopper wins' })).toBeInTheDocument()
    expect(score(column('Ada Lovelace'))).toBe('200')
    expect(lengthsFound(column('Ada Lovelace'))).toBe('3:1')
    expect(lengthsFound(column('Grace Hopper'))).toBe('4:1')
  })

  it('traces a potential word on the board from that game', async () => {
    mocks.loadSavedRound.mockResolvedValue({
      score: 100,
      words: [{ word: 'cat', points: 100 }],
      missed: [{ word: 'eat', points: 100 }],
      board: [
        ['C', 'A', 'T', 'X', 'Y'],
        ['E', 'B', 'D', 'F', 'G'],
        ['H', 'I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P', 'Q'],
        ['R', 'S', 'U', 'V', 'W'],
      ],
    })
    mocks.loadMatchPlayers.mockResolvedValue([
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 0,
        words: [],
      },
    ])

    render(
      <SavedMatch
        gameId="game-1"
        viewerId="ada"
        viewerName="Ada Lovelace"
        rival={{ id: 'grace', name: 'Grace Hopper' }}
        onPlayAgain={vi.fn()}
      />,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'See potential words' }))
    expect(tile(0, 0)).not.toHaveClass('selected')
    await userEvent.click(screen.getByRole('button', { name: 'eat' }))
    expect(stepAt(1, 0)).toBe('1')
    expect(stepAt(0, 1)).toBe('2')
    expect(stepAt(0, 2)).toBe('3')
    expect(tile(0, 0)).not.toHaveClass('selected')
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
    expect(lengthsFound(column('Ada Lovelace'))).toBe('3:1')
    expect(lengthsFound(column('Grace Hopper'))).toBe('4:1')
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
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['cat', 'eat'])
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
      vi.advanceTimersByTime(60_000)
    })
    expect(mocks.loadMatchPlayers).toHaveBeenCalledTimes(2)
    expect(mocks.loadPlayerWords).not.toHaveBeenCalled()
  })

  it('loads a finished word list once while the score poll keeps running', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.loadPlayerWords.mockResolvedValue([{ word: 'eat', points: 100 }])
    mocks.loadMatchPlayers.mockResolvedValue([
      { playerId: 'grace', name: 'Grace Hopper', score: 100, words: null },
      { playerId: 'mina', name: 'Mina Chen', score: null, words: null },
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

    expect(await screen.findByRole('heading', { level: 1, name: 'You win' })).toBeInTheDocument()
    expect(mocks.loadPlayerWords).toHaveBeenCalledTimes(1)
    expect(mocks.loadPlayerWords).toHaveBeenCalledWith('game-1', 'grace')
    expect(
      await within(column('Grace Hopper')).findByText('3:1'),
    ).toBeInTheDocument()
    expect(lengthsFound(column('Grace Hopper'))).toBe('3:1')

    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(mocks.loadMatchPlayers).toHaveBeenCalledTimes(2)
    expect(mocks.loadPlayerWords).toHaveBeenCalledTimes(1)
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
    expect(lengthsFound(column('Grace Hopper'))).toBe('3:1')
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

function wordsFound(section: HTMLElement) {
  const label = within(section).queryByText('Words')
  return label?.closest('p')?.querySelector('strong')?.textContent ?? null
}

function lengthsFound(section: HTMLElement) {
  const label = within(section).queryByText('Lengths')
  return label?.closest('p')?.querySelector('.match-length-list')?.textContent ?? null
}

function wordLabel(word: string) {
  const button = screen.getByRole('button', { name: word })
  const label = button.querySelector('.word')
  if (!(label instanceof HTMLElement)) throw new Error(`Missing word label for ${word}`)
  return label
}

function finderDots(word: string) {
  const button = screen.getByRole('button', { name: word })
  return [...button.querySelectorAll('.word-dot')].map((dot) =>
    [...dot.classList].filter((name) => name.startsWith('is-')).join(' '),
  )
}

function tile(row: number, col: number) {
  const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tile ${row},${col}`)
  return element
}

function stepAt(row: number, col: number) {
  return tile(row, col).querySelector('.step')?.textContent
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
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
