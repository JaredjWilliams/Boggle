import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PointerEvent } from 'react'
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
    shakeBoard: () => firstBoard.map((row) => [...row]),
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

describe('useRound drag', () => {
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
})

async function startPlaying() {
  const round = renderHook(() => useRound())
  await waitFor(() => expect(round.result.current.phase).toBe('playing'))
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
