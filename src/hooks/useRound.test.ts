import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PointerEvent } from 'react'
import { shakeBoard } from '../game/dice'
import { ROUND_SECONDS } from '../game/round'
import { useRound } from './useRound'

const firstBoard = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Q'],
]

vi.mock('../game/dice', async () => {
  const actual = await vi.importActual<typeof import('../game/dice')>('../game/dice')
  return {
    ...actual,
    shakeBoard: vi.fn(() => firstBoard.map((row) => [...row])),
  }
})

vi.mock('../game/dictionary', async () => {
  const actual = await vi.importActual<typeof import('../game/dictionary')>(
    '../game/dictionary',
  )
  return {
    ...actual,
    loadDictionary: () => Promise.resolve(actual.dictionaryFromText('cat\ncar\n')),
  }
})

const elementFromPoint = document.elementFromPoint

describe('home', () => {
  beforeEach(() => {
    vi.mocked(shakeBoard).mockReset()
    vi.mocked(shakeBoard).mockImplementation(() => firstBoard.map((row) => [...row]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits until a round is started', async () => {
    const round = renderHook(() => useRound())

    await waitFor(() => expect(round.result.current.phase).toBe('ready'))
    expect(shakeBoard).not.toHaveBeenCalled()
    expect(round.result.current.lastScore).toBeNull()

    act(() => {
      round.result.current.turnBoard()
    })
    expect(round.result.current.phase).toBe('ready')
    expect(round.result.current.board).toEqual([])
    expect(round.result.current.score).toBe(0)
    expect(shakeBoard).not.toHaveBeenCalled()

    act(() => {
      round.result.current.startRound()
    })
    expect(round.result.current.phase).toBe('playing')
    expect(shakeBoard).toHaveBeenCalledTimes(1)

    act(() => {
      round.result.current.goHome()
    })
    expect(round.result.current.phase).toBe('ready')
    expect(round.result.current.lastScore).toBeNull()
  })

  it('keeps a finished score after returning home', async () => {
    const round = renderHook(() => useRound())
    await waitFor(() => expect(round.result.current.phase).toBe('ready'))

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    act(() => {
      round.result.current.startRound()
    })
    act(() => {
      round.result.current.onDraftChange('cat')
    })
    act(() => {
      round.result.current.onSubmit()
    })

    await act(async () => {
      vi.advanceTimersByTime(ROUND_SECONDS * 1000)
    })

    expect(round.result.current.phase).toBe('ended')
    expect(round.result.current.lastScore).toBe(100)

    act(() => {
      round.result.current.goHome()
    })
    expect(round.result.current.phase).toBe('ready')
    expect(round.result.current.lastScore).toBe(100)
  })

  it('turns the board without resetting the score or the clock', async () => {
    const round = renderHook(() => useRound())
    await waitFor(() => expect(round.result.current.phase).toBe('ready'))

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    act(() => {
      round.result.current.startRound()
    })
    act(() => {
      round.result.current.onDraftChange('cat')
    })
    act(() => {
      round.result.current.onSubmit()
    })
    expect(round.result.current.score).toBe(100)

    act(() => {
      round.result.current.onDraftChange('ca')
    })
    expect(cellKeys(round.result.current.highlight)).toEqual(['0,0', '0,1'])

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    act(() => {
      round.result.current.turnBoard()
    })

    expect(round.result.current.board).toEqual([
      ['U', 'F', 'D', 'R', 'C'],
      ['V', 'G', 'I', 'E', 'A'],
      ['W', 'H', 'L', 'N', 'T'],
      ['Y', 'J', 'M', 'O', 'S'],
      ['Q', 'K', 'B', 'P', 'X'],
    ])
    expect(round.result.current.score).toBe(100)
    expect(round.result.current.found).toEqual([{ word: 'cat', points: 100 }])
    expect(round.result.current.secondsLeft).toBe(ROUND_SECONDS - 5)
    expect(round.result.current.phase).toBe('playing')
    expect(cellKeys(round.result.current.highlight)).toEqual(['0,4', '1,4'])
    expect(shakeBoard).toHaveBeenCalledTimes(1)

    act(() => {
      round.result.current.onDraftChange('car')
    })
    act(() => {
      round.result.current.onSubmit()
    })
    expect(round.result.current.score).toBe(200)
  })
})

describe('useRound drag', () => {
  beforeEach(() => {
    vi.mocked(shakeBoard).mockReset()
    vi.mocked(shakeBoard).mockImplementation(() => firstBoard.map((row) => [...row]))
  })

  afterEach(() => {
    document.elementFromPoint = elementFromPoint
    vi.restoreAllMocks()
  })

  it('keeps the connector off until the pointer actually moves', async () => {
    const round = await startPlaying()
    hitAt(0, 0)

    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })

    expect(round.result.current.drag).toBeNull()
    expect(round.result.current.path).toEqual([{ row: 0, col: 0 }])
  })

  it('records where the pointer is, including the gap between tiles', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })

    hitNothing()
    act(() => {
      round.result.current.onPointerMove(pointer(45, 20))
    })

    expect(round.result.current.drag).toEqual({ x: 45, y: 20, over: null })
    expect(round.result.current.path).toEqual([{ row: 0, col: 0 }])
    expect(round.result.current.feedback).toBeNull()
  })

  it('drops the connector on release when the word did not grow', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })
    hitNothing()
    act(() => {
      round.result.current.onPointerMove(pointer(45, 20))
    })

    act(() => {
      round.result.current.onPointerUp(pointer(45, 20))
    })

    expect(round.result.current.drag).toBeNull()
    expect(round.result.current.path).toEqual([{ row: 0, col: 0 }])
    expect(round.result.current.feedback).toBeNull()
  })

  it('drops the connector when the drag is cancelled and leaves the word in place', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })
    hitNothing()
    act(() => {
      round.result.current.onPointerMove(pointer(45, 20))
    })

    act(() => {
      round.result.current.onPointerCancel()
    })

    expect(round.result.current.drag).toBeNull()
    expect(round.result.current.path).toEqual([{ row: 0, col: 0 }])
    expect(round.result.current.feedback).toBeNull()
  })

  it('drops the connector when a letter is typed', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })
    hitNothing()
    act(() => {
      round.result.current.onPointerMove(pointer(45, 20))
    })

    act(() => {
      round.result.current.onDraftChange('c')
    })

    expect(round.result.current.drag).toBeNull()
    expect(round.result.current.path).toEqual([])
    expect(round.result.current.draft).toBe('c')
  })

  it('carries a traced word around with the letters', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })
    hitAt(0, 1)
    act(() => {
      round.result.current.onPointerMove(pointer(20, 10))
    })
    expect(round.result.current.traced).toBe('ca')

    act(() => {
      round.result.current.turnBoard()
    })

    expect(round.result.current.path).toEqual([
      { row: 0, col: 4 },
      { row: 1, col: 4 },
    ])
    expect(round.result.current.traced).toBe('ca')
    expect(round.result.current.drag).toBeNull()
    expect(round.result.current.score).toBe(0)
    expect(shakeBoard).toHaveBeenCalledTimes(1)
  })

  it('scores a word traced before the board turns', async () => {
    const round = await startPlaying()
    hitAt(0, 0)
    act(() => {
      round.result.current.onPointerDown(pointer(10, 10))
    })
    hitAt(0, 1)
    act(() => {
      round.result.current.onPointerMove(pointer(20, 10))
    })
    hitAt(0, 2)
    act(() => {
      round.result.current.onPointerMove(pointer(30, 10))
    })
    expect(round.result.current.traced).toBe('cat')

    act(() => {
      round.result.current.turnBoard()
    })
    act(() => {
      round.result.current.onPointerUp(pointer(30, 10))
    })

    expect(round.result.current.score).toBe(100)
    expect(round.result.current.found).toEqual([{ word: 'cat', points: 100, start: 4 }])
    expect(round.result.current.board[0]).toEqual(['U', 'F', 'D', 'R', 'C'])
    expect(round.result.current.phase).toBe('playing')
    expect(shakeBoard).toHaveBeenCalledTimes(1)
  })

  it('does not take the orthogonal tile a diagonal swipe only clips', async () => {
    const round = await startPlaying()
    const grid = boardGrid()
    const rects = mockTileRects()

    try {
      hitAt(0, 0)
      act(() => {
        round.result.current.onPointerDown(pointer(32, 32, grid))
      })

      hitAt(0, 1)
      act(() => {
        round.result.current.onPointerMove(pointer(72, 64, grid))
      })

      expect(round.result.current.path).toEqual([{ row: 0, col: 0 }])
      expect(round.result.current.drag?.over).toBeNull()

      hitAt(0, 1)
      act(() => {
        round.result.current.onPointerMove(pointer(90, 90, grid))
      })

      expect(round.result.current.path).toEqual([
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ])
      expect(round.result.current.traced).toBe('ce')
    } finally {
      rects.mockRestore()
      grid.remove()
    }
  })

  it('lights every typed route until the word is in the dictionary', async () => {
    vi.mocked(shakeBoard).mockReturnValueOnce([
      ['C', 'A', 'T', 'X', 'X'],
      ['Z', 'Z', 'Z', 'Z', 'Z'],
      ['C', 'A', 'T', 'X', 'X'],
      ['Z', 'Z', 'Z', 'Z', 'Z'],
      ['C', 'A', 'T', 'X', 'X'],
    ])
    const round = await startPlaying()

    act(() => {
      round.result.current.onDraftChange('ca')
    })
    expect(round.result.current.path).toEqual([])
    expect(cellKeys(round.result.current.highlight)).toEqual([
      '0,0',
      '0,1',
      '2,0',
      '2,1',
      '4,0',
      '4,1',
    ])

    act(() => {
      round.result.current.onDraftChange('cat')
    })
    expect(cellKeys(round.result.current.highlight)).toEqual(['0,0', '0,1', '0,2'])
    expect(round.result.current.highlight.steps).toEqual({
      '0,0': 0,
      '0,1': 1,
      '0,2': 2,
    })
  })
})

function cellKeys(highlight: { cells: readonly { row: number; col: number }[] }) {
  return highlight.cells.map((cell) => `${cell.row},${cell.col}`)
}

async function startPlaying() {
  const round = renderHook(() => useRound())
  await waitFor(() => expect(round.result.current.phase).toBe('ready'))
  act(() => {
    round.result.current.startRound()
  })
  return round
}

let underPointer: HTMLElement | null = null

function hitAt(row: number, col: number) {
  const tile = document.createElement('div')
  tile.dataset.row = String(row)
  tile.dataset.col = String(col)
  underPointer = tile
  document.elementFromPoint = () => underPointer
}

function hitNothing() {
  underPointer = null
  document.elementFromPoint = () => null
}

function boardGrid() {
  const grid = document.createElement('div')
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const tile = document.createElement('div')
      tile.dataset.row = String(row)
      tile.dataset.col = String(col)
      grid.append(tile)
    }
  }
  document.body.append(grid)
  return grid
}

function mockTileRects() {
  const stride = 72
  const size = 64
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(
    this: HTMLElement,
  ) {
    const row = Number(this.dataset.row)
    const col = Number(this.dataset.col)
    if (!Number.isInteger(row) || !Number.isInteger(col)) return new DOMRect(0, 0, 0, 0)
    return new DOMRect(col * stride, row * stride, size, size)
  })
}

function pointer(x: number, y: number, target?: EventTarget) {
  return {
    clientX: x,
    clientY: y,
    pointerId: 1,
    preventDefault() {},
    currentTarget: target ?? {
      setPointerCapture() {},
      hasPointerCapture() {
        return false
      },
      releasePointerCapture() {},
    },
  } as unknown as PointerEvent<HTMLDivElement>
}
