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
    loadDictionary: () => Promise.resolve(actual.dictionaryFromText('cat\n')),
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

function pointer(x: number, y: number) {
  return {
    clientX: x,
    clientY: y,
    pointerId: 1,
    preventDefault() {},
    currentTarget: {
      setPointerCapture() {},
      hasPointerCapture() {
        return false
      },
      releasePointerCapture() {},
    },
  } as unknown as PointerEvent<HTMLDivElement>
}
