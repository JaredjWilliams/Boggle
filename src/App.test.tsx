import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { shakeBoard } from './game/dice'
import { ROUND_SECONDS } from './game/round'

const firstBoard = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Q'],
]

const nextBoard = [
  ['Z', 'Z', 'Z', 'Z', 'Z'],
  ['Z', 'Z', 'Z', 'Z', 'Z'],
  ['Z', 'Z', 'Z', 'Z', 'Z'],
  ['Z', 'Z', 'Z', 'Z', 'Z'],
  ['Z', 'Z', 'Z', 'Z', 'Z'],
]

const boards = vi.hoisted(() => ({
  queue: [] as string[][][],
}))

vi.mock('./game/dice', async () => {
  const actual = await vi.importActual<typeof import('./game/dice')>('./game/dice')
  return {
    ...actual,
    shakeBoard: vi.fn(() => {
      const next = boards.queue.shift()
      if (!next) throw new Error('shakeBoard was called unexpectedly')
      return next.map((row) => [...row])
    }),
  }
})

vi.mock('./game/dictionary', async () => {
  const actual = await vi.importActual<typeof import('./game/dictionary')>(
    './game/dictionary',
  )
  return {
    ...actual,
    loadDictionary: () =>
      Promise.resolve(
        actual.dictionaryFromText(
          ['cat', 'cats', 'car', 'rat', 'tar', 'eat', 'tea', 'ate', 'zzz'].join(
            '\n',
          ),
        ),
      ),
  }
})

describe('end of round', () => {
  beforeEach(() => {
    boards.queue = [firstBoard, nextBoard]
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows the summary when time runs out and does not start a new game', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Type a word' }), 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('cat')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.queryByText("Time's up")).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(ROUND_SECONDS * 1000)
    })

    expect(screen.getByText("Time's up")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shake' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'C' })).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)

    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score1$/)
    expect(items(column('Your words'))).toEqual([{ word: 'cat', points: '1' }])
    expect(items(column('Possible words'))).toEqual([
      { word: 'cats', points: '1' },
      { word: 'ate', points: '1' },
      { word: 'car', points: '1' },
      { word: 'eat', points: '1' },
      { word: 'rat', points: '1' },
      { word: 'tar', points: '1' },
      { word: 'tea', points: '1' },
    ])

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByText("Time's up")).toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)
  })

  it('starts a new game when Play again is pressed', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(ROUND_SECONDS * 1000)
    })
    expect(screen.getByText("Time's up")).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))

    expect(screen.queryByText("Time's up")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Z' })).toHaveLength(25)
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(2)
  })
})

function column(title: string) {
  const heading = screen.getByRole('heading', { name: title })
  const section = heading.closest('.summary-column')
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing column for ${title}`)
  }
  return section
}

function items(section: HTMLElement) {
  return within(section)
    .getAllByRole('listitem')
    .map((item) => {
      const [word, points] = [...item.querySelectorAll('span')].map(
        (span) => span.textContent,
      )
      return { word, points }
    })
}
