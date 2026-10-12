import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import type { Board as LetterBoard } from '../game/dice'
import type { DragAim } from '../hooks/useRound'
import {
  emptyHighlight,
  isAdjacent,
  type Cell,
  type LetterHighlight,
} from '../game/words'
import './Board.css'

type Props = {
  board: LetterBoard
  path: Cell[]
  highlight?: LetterHighlight
  drag: DragAim | null
  locked: boolean
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: () => void
}

type Point = {
  x: number
  y: number
}

type Segment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function Board({
  board,
  path,
  highlight = emptyHighlight,
  drag,
  locked,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const lit = new Set(highlight.cells.map((cell) => `${cell.row},${cell.col}`))

  useLayoutEffect(() => {
    const grid = gridRef.current
    const next = grid
      ? [...measureConnectors(grid, path, drag), ...measureLinks(grid, highlight.links)]
      : []
    setSegments((current) => (sameSegments(current, next) ? current : next))
  }, [path, drag, highlight])

  return (
    <div
      ref={gridRef}
      className={locked ? 'grid locked' : 'grid'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      {segments.length > 0 && (
        <svg className="connectors" aria-hidden="true" data-testid="drag-connector">
          {segments.map((segment, index) => (
            <line
              key={index}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
            />
          ))}
        </svg>
      )}
      {board.map((row, rowIndex) =>
        row.map((letter, colIndex) => {
          const dragStep = path.findIndex(
            (cell) => cell.row === rowIndex && cell.col === colIndex,
          )
          const typedStep = highlight.steps[`${rowIndex},${colIndex}`]
          const step = dragStep >= 0 ? dragStep : (typedStep ?? -1)
          const selected = dragStep >= 0 || lit.has(`${rowIndex},${colIndex}`)
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={selected ? 'tile selected' : 'tile'}
              role="button"
              aria-label={letter}
              data-row={rowIndex}
              data-col={colIndex}
              data-letter={letter}
            >
              {step >= 0 && (
                <span className="step" aria-hidden="true">
                  {step + 1}
                </span>
              )}
              <span>{letter}</span>
            </div>
          )
        }),
      )}
    </div>
  )
}

// Joins tiles already in the word. The last segment reaches the adjacent
// tile the pointer is heading toward, so the link spans that gap.
function measureConnectors(
  grid: HTMLElement,
  path: readonly Cell[],
  drag: DragAim | null,
): Segment[] {
  if (!drag || path.length === 0) return []

  const gridBox = grid.getBoundingClientRect()
  const points: Point[] = []
  for (const cell of path) {
    const center = tileCenter(grid, gridBox, cell)
    if (!center) return []
    points.push(center)
  }

  const aim = tileAhead(grid, gridBox, path[path.length - 1], points[points.length - 1], drag)
  if (aim) points.push(aim)

  const segments: Segment[] = []
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    const segment = {
      x1: Math.round(from.x),
      y1: Math.round(from.y),
      x2: Math.round(to.x),
      y2: Math.round(to.y),
    }
    if (segment.x1 === segment.x2 && segment.y1 === segment.y2) continue
    segments.push(segment)
  }
  return segments
}

function measureLinks(
  grid: HTMLElement,
  links: LetterHighlight['links'],
): Segment[] {
  if (links.length === 0) return []

  const gridBox = grid.getBoundingClientRect()
  const segments: Segment[] = []
  for (const link of links) {
    const from = tileCenter(grid, gridBox, link.from)
    const to = tileCenter(grid, gridBox, link.to)
    if (!from || !to) continue
    const segment = {
      x1: Math.round(from.x),
      y1: Math.round(from.y),
      x2: Math.round(to.x),
      y2: Math.round(to.y),
    }
    if (segment.x1 === segment.x2 && segment.y1 === segment.y2) continue
    segments.push(segment)
  }
  return segments
}

function tileAhead(
  grid: HTMLElement,
  gridBox: DOMRect,
  last: Cell,
  lastCenter: Point,
  drag: DragAim,
): Point | null {
  if (drag.over?.row === last.row && drag.over?.col === last.col) return null

  if (drag.over && isAdjacent(last, drag.over)) {
    return tileCenter(grid, gridBox, drag.over)
  }

  const pointer = {
    x: drag.x - gridBox.left,
    y: drag.y - gridBox.top,
  }
  const dx = pointer.x - lastCenter.x
  const dy = pointer.y - lastCenter.y
  let best: Point | null = null
  let bestAlign = 0
  for (const tile of grid.querySelectorAll<HTMLElement>('[data-row][data-col]')) {
    const cell = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) }
    if (!isAdjacent(last, cell)) continue
    const center = centerOf(tile, gridBox)
    const vx = center.x - lastCenter.x
    const vy = center.y - lastCenter.y
    const span = Math.hypot(vx, vy)
    if (span === 0) continue
    const align = (dx * vx + dy * vy) / span
    if (align > bestAlign) {
      bestAlign = align
      best = center
    }
  }
  return best
}

function tileCenter(grid: HTMLElement, gridBox: DOMRect, cell: Cell): Point | null {
  const tile = grid.querySelector<HTMLElement>(
    `[data-row="${cell.row}"][data-col="${cell.col}"]`,
  )
  if (!tile) return null
  return centerOf(tile, gridBox)
}

function centerOf(tile: HTMLElement, gridBox: DOMRect): Point {
  const box = tile.getBoundingClientRect()
  return {
    x: box.left + box.width / 2 - gridBox.left,
    y: box.top + box.height / 2 - gridBox.top,
  }
}

function sameSegments(current: readonly Segment[], next: readonly Segment[]) {
  if (current.length !== next.length) return false
  return current.every(
    (segment, index) =>
      segment.x1 === next[index].x1 &&
      segment.y1 === next[index].y1 &&
      segment.x2 === next[index].x2 &&
      segment.y2 === next[index].y2,
  )
}
