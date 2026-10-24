import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeSession } from './auth/profiles'
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

beforeEach(() => {
  writeSession({ name: 'Ada Lovelace', username: 'ada' })
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
    await leaveHome()

    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Type a word' }), 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByTestId('attempt')).toHaveTextContent(/cat/i)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

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
    expect(screen.queryByRole('button', { name: 'Turn' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'C' })).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)

    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score100$/)
    expect(items(column('Your words'))).toEqual([{ word: 'cat', points: '100' }])
    expect(items(column('Possible words'))).toEqual([
      { word: 'cats', points: '400' },
      { word: 'ate', points: '100' },
      { word: 'car', points: '100' },
      { word: 'eat', points: '100' },
      { word: 'rat', points: '100' },
      { word: 'tar', points: '100' },
      { word: 'tea', points: '100' },
    ])

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByText("Time's up")).toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)
  })

  it('starts a new game when Play again is pressed', async () => {
    render(<App />)
    await leaveHome()
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

describe('word result', () => {
  beforeEach(() => {
    boards.queue = [firstBoard, nextBoard]
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a new word and its score in green above the board', async () => {
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })
    await user.type(input, 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const attempt = screen.getByTestId('attempt')
    const board = document.querySelector('.grid')
    expect(board).not.toBeNull()
    expect(
      attempt.compareDocumentPosition(board as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(attempt).toHaveClass('built-new')
    expect(attempt).toHaveTextContent(/cat/i)
    expect(attempt).toHaveTextContent('+100')
    expect(screen.queryByTestId('score-gain')).not.toBeInTheDocument()
    expect(screen.getByText('Score').closest('p')).not.toHaveTextContent('+')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows an already guessed word in orange', async () => {
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })
    await user.type(input, 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(input, 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-repeat')
    expect(attempt).toHaveTextContent(/cat/i)
    expect(attempt).toHaveTextContent('100')
    expect(attempt).not.toHaveTextContent('+')
    expect(screen.getByText('Already found')).toHaveClass('message-repeat')
  })

  it('shows a word that is not legal in red', async () => {
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })
    await user.type(input, 'xyz')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-invalid')
    expect(attempt).toHaveTextContent(/xyz/i)
    expect(attempt.querySelector('.built-points')).toBeNull()
    expect(screen.getByText('Not in the dictionary')).toHaveClass('message-invalid')
    expect(screen.queryByTestId('score-gain')).not.toBeInTheDocument()
  })

  it('shows the same result when a dragged word is released', async () => {
    render(<App />)
    await leaveHome()
    const tileC = await screen.findByRole('button', { name: 'C' })
    const cells: Record<string, HTMLElement> = {
      '10,10': tileC,
      '20,10': screen.getByRole('button', { name: 'A' }),
      '30,10': screen.getByRole('button', { name: 'T' }),
    }
    const original = document.elementFromPoint
    document.elementFromPoint = (x: number, y: number) => cells[`${x},${y}`] ?? null
    const rects = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function tileRect(this: HTMLElement) {
        const element = this as HTMLElement
        if (element.classList.contains('grid')) return box(0, 0, 250, 250)
        const row = Number(element.dataset.row)
        const col = Number(element.dataset.col)
        if (Number.isNaN(row) || Number.isNaN(col)) return box(0, 0, 0, 0)
        return box(col * 40, row * 40, 40, 40)
      })
    const grid = tileC.parentElement
    if (!grid) throw new Error('Missing board')

    try {
      fireEvent.pointerDown(grid, { clientX: 10, clientY: 10, pointerId: 1 })
      expect(document.querySelector('.connectors')).toBeNull()

      fireEvent.pointerMove(grid, { clientX: 45, clientY: 20, pointerId: 1 })
      expect(document.querySelector('.built-slot')).toHaveTextContent(/^c$/i)
      expect(connectorPoints()).toEqual([
        { x1: '20', y1: '20', x2: '60', y2: '20' },
      ])

      fireEvent.pointerMove(grid, { clientX: 20, clientY: 10, pointerId: 1 })
      expect(document.querySelector('.built-slot')).toHaveTextContent(/ca/i)
      expect(connectorPoints()).toEqual([
        { x1: '20', y1: '20', x2: '60', y2: '20' },
      ])
      expect(screen.queryByTestId('attempt')).not.toBeInTheDocument()

      fireEvent.pointerMove(grid, { clientX: 30, clientY: 10, pointerId: 1 })
      fireEvent.pointerUp(grid, { clientX: 30, clientY: 10, pointerId: 1 })
    } finally {
      document.elementFromPoint = original
      rects.mockRestore()
    }

    expect(document.querySelector('.connectors')).toBeNull()
    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-new')
    expect(attempt).toHaveTextContent(/cat/i)
    expect(attempt).toHaveTextContent('+100')
    expect(
      attempt.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('highlights board tiles as a word is typed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })

    await user.type(input, 'c')
    expect(screen.getByRole('button', { name: 'C' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass('selected')

    await user.type(input, 'a')
    expect(screen.getByRole('button', { name: 'C' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'A' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'T' })).not.toHaveClass('selected')
    expect(stepNumber('C')).toBe('1')
    expect(stepNumber('A')).toBe('2')

    await user.type(input, 't')
    expect(screen.getByRole('button', { name: 'T' })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'S' })).not.toHaveClass('selected')
    expect(stepNumber('T')).toBe('3')

    await user.clear(input)
    expect(screen.getByRole('button', { name: 'C' })).not.toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'T' })).not.toHaveClass('selected')
  })
})

function stepNumber(letter: string) {
  return screen.getByRole('button', { name: letter }).querySelector('.step')?.textContent
}

function connectorPoints() {
  return [...document.querySelectorAll('.connectors line')].map((line) => ({
    x1: line.getAttribute('x1'),
    y1: line.getAttribute('y1'),
    x2: line.getAttribute('x2'),
    y2: line.getAttribute('y2'),
  }))
}

function box(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return {}
    },
  }
}

async function leaveHome() {
  const start = await screen.findByRole('button', { name: 'Play solo' })
  await waitFor(() => expect(start).toBeEnabled())
  await userEvent.click(start)
}

function column(title: string) {
  const heading = screen.getByRole('heading', { name: title })
  const section = heading.closest('.summary-column')
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing column for ${title}`)
  }
  return section
}

describe('sign in', () => {
  beforeEach(() => {
    boards.queue = [firstBoard]
    localStorage.clear()
  })

  it('saves a profile and opens that player dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Often missed' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace Hopper')
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'grace')
    await user.type(screen.getByLabelText('Password'), 'cobol')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.queryByText('Your dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('boggle.profiles') ?? '[]')).toEqual([
      { name: 'Grace Hopper', username: 'grace', password: 'cobol' },
    ])
  })

  it('returns to the login page and keeps the saved profile', async () => {
    writeSession({ name: 'Ada Lovelace', username: 'ada' })
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play solo' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('boggle.session') ?? 'null')).toBeNull()
  })
})

describe('home dashboard', () => {
  beforeEach(() => {
    boards.queue = [firstBoard, nextBoard]
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens friends from home and keeps the player list off the dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('heading', { name: 'Play with a friend.' })).not.toBeInTheDocument()
    const friends = await screen.findByRole('button', { name: 'Play with friends' })
    await waitFor(() => expect(friends).toBeEnabled())
    await user.click(friends)

    expect(screen.getByRole('heading', { name: 'Play with a friend.' })).toBeInTheDocument()
    expect(screen.getByText('No other players yet.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Often missed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
  })

  it('opens the scoring article from the menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Learn' }))

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Hunt fives and sixes/ }))
    expect(screen.getByRole('heading', { name: 'Hunt fives and sixes' })).toBeInTheDocument()
    expect(screen.getByText(/The sixth letter is the biggest step/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
  })

  it('opens invitations from the header', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Notifications' }))

    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveTextContent(
      'No notifications right now.',
    )

    await user.click(screen.getByRole('button', { name: 'Close notifications' }))
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('deals a board only after Play solo', async () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).not.toHaveBeenCalled()

    await leaveHome()

    expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)
  })

  it('does not run the clock on the dashboard', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Play solo' })).toBeEnabled()

    await act(async () => {
      vi.advanceTimersByTime(ROUND_SECONDS * 1000)
    })

    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.queryByText("Time's up")).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).not.toHaveBeenCalled()
  })

  it('returns home from a round without saving an unfinished score', async () => {
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    await screen.findByRole('button', { name: 'Add' })

    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn' })).not.toBeInTheDocument()
  })

  it('returns home after a finished round', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })
    await user.type(input, 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await act(async () => {
      vi.advanceTimersByTime(ROUND_SECONDS * 1000)
    })

    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(screen.getByRole('region', { name: 'Often missed' })).toBeInTheDocument()
    expect(screen.queryByText('Last score')).not.toBeInTheDocument()
    expect(screen.queryByText("Time's up")).not.toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)
  })

  it('turns the board without reshuffling or resetting the score', async () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    const user = userEvent.setup()
    render(<App />)
    await leaveHome()
    const input = await screen.findByRole('textbox', { name: 'Type a word' })
    await user.type(input, 'cat')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score100$/)
    expect(letters()).toEqual([
      'C', 'A', 'T', 'S', 'X',
      'R', 'E', 'N', 'O', 'P',
      'D', 'I', 'L', 'M', 'B',
      'F', 'G', 'H', 'J', 'K',
      'U', 'V', 'W', 'Y', 'Q',
    ])
    const time = screen.getByText('Time').closest('p')?.textContent

    await user.click(screen.getByRole('button', { name: 'Turn' }))

    expect(letters()).toEqual([
      'U', 'F', 'D', 'R', 'C',
      'V', 'G', 'I', 'E', 'A',
      'W', 'H', 'L', 'N', 'T',
      'Y', 'J', 'M', 'O', 'S',
      'Q', 'K', 'B', 'P', 'X',
    ])
    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score100$/)
    expect(screen.getByText('Time').closest('p')).toHaveTextContent(time ?? '')
    expect(screen.getByText('3:00')).toBeInTheDocument()
    expect(vi.mocked(shakeBoard)).toHaveBeenCalledTimes(1)

    await user.type(screen.getByRole('textbox', { name: 'Type a word' }), 'car')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score200$/)
  })
})

function letters(): string[] {
  return [...document.querySelectorAll('.tile')].map(
    (tile) => tile.getAttribute('data-letter') ?? '',
  )
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
