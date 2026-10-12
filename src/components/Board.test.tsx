import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Board } from './Board'

const board = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Q'],
]

const handlers = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
}

describe('Board drag connector', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reaches the adjacent tile the pointer is heading toward', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 145, y: 72, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '84', y2: '32' }])
  })

  it('follows a diagonal drag to the diagonal tile', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 140, y: 96, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '84', y2: '80' }])
  })

  it('joins the tiles once the pointer reaches the next one', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ]}
        drag={{ x: 164, y: 72, over: { row: 0, col: 1 } }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '84', y2: '32' }])
  })

  it('keeps earlier links and reaches ahead while the drag continues', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ]}
        drag={{ x: 200, y: 120, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([
      { x1: '36', y1: '32', x2: '84', y2: '32' },
      { x1: '84', y1: '32', x2: '132', y2: '80' },
    ])
  })

  it('draws nothing when the pointer is not dragging', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ]}
        drag={null}
        locked={false}
        {...handlers}
      />,
    )

    expect(document.querySelector('.connectors')).toBeNull()
  })

  it('draws nothing while the pointer is still on the current tile', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 116, y: 72, over: { row: 0, col: 0 } }}
        locked={false}
        {...handlers}
      />,
    )

    expect(document.querySelector('.connectors')).toBeNull()
  })

  it('draws nothing when the pointer leaves the board away from every neighbor', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 40, y: 72, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(document.querySelector('.connectors')).toBeNull()
  })

  it('draws nothing before a tile has been chosen', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[]}
        drag={{ x: 145, y: 72, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(document.querySelector('.connectors')).toBeNull()
  })

  it('reaches straight down when that is the direction of the drag', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 116, y: 96, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    const connector = document.querySelector('.connectors')
    expect(connector).toHaveAttribute('aria-hidden', 'true')
    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '36', y2: '80' }])
  })

  it('connects to the adjacent tile under the pointer', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 145, y: 72, over: { row: 1, col: 0 } }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '36', y2: '80' }])
  })

  it('does not jump to a tile the pointer cannot reach in one step', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 212, y: 72, over: { row: 0, col: 2 } }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '84', y2: '32' }])
  })

  it('points back along the word when the drag reverses', () => {
    mockTileGeometry()
    render(
      <Board
        board={board}
        path={[
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ]}
        drag={{ x: 140, y: 72, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([
      { x1: '36', y1: '32', x2: '84', y2: '32' },
      { x1: '84', y1: '32', x2: '36', y2: '32' },
    ])
  })

  it('moves the connector when the drag changes direction', () => {
    mockTileGeometry()
    const view = render(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 145, y: 72, over: null }}
        locked={false}
        {...handlers}
      />,
    )
    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '84', y2: '32' }])

    view.rerender(
      <Board
        board={board}
        path={[{ row: 0, col: 0 }]}
        drag={{ x: 116, y: 96, over: null }}
        locked={false}
        {...handlers}
      />,
    )

    expect(linePoints()).toEqual([{ x1: '36', y1: '32', x2: '36', y2: '80' }])
  })
})

function linePoints() {
  return [...document.querySelectorAll('.connectors line')].map((line) => ({
    x1: line.getAttribute('x1'),
    y1: line.getAttribute('y1'),
    x2: line.getAttribute('x2'),
    y2: line.getAttribute('y2'),
  }))
}

// Grid origin is (80, 40). Tiles are 40px with a 48px stride, matching the
// 16px horizontal and 12px vertical padding used to place the first tile.
function mockTileGeometry() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function rect() {
      const element = this as HTMLElement
      if (element.classList.contains('grid')) return box(80, 40, 280, 280)
      const row = Number(element.dataset.row)
      const col = Number(element.dataset.col)
      if (Number.isNaN(row) || Number.isNaN(col)) return box(0, 0, 0, 0)
      return box(96 + col * 48, 52 + row * 48, 40, 40)
    },
  )
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
