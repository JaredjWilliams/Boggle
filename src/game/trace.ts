import { isAdjacent, type Cell } from './words'

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

export type TileCenter = {
  cell: Cell
  x: number
  y: number
}

// Half-width of a swipe, as a fraction of the distance to the nearest tile.
// A swipe through the middle of a tile stays inside the band. The corner of
// the tile beside a diagonal swipe sits outside it.
const CORRIDOR = 0.34

export function tileAt(x: number, y: number): Cell | null {
  const element = document.elementFromPoint(x, y)
  const tile = element?.closest<HTMLElement>('[data-row]')
  if (!tile?.dataset.row || tile.dataset.col == null) return null
  return {
    row: Number(tile.dataset.row),
    col: Number(tile.dataset.col),
  }
}

export function tileCenters(target: EventTarget | null): TileCenter[] {
  if (!(target instanceof Element)) return []
  const centers: TileCenter[] = []
  for (const tile of target.querySelectorAll<HTMLElement>('[data-row][data-col]')) {
    const row = Number(tile.dataset.row)
    const col = Number(tile.dataset.col)
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue
    const box = tile.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) continue
    centers.push({
      cell: { row, col },
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    })
  }
  return centers
}

// The next tile is the neighbor the pointer has actually reached, judged from
// the last tile's center. Touching a corner of the rectangle is not enough:
// that corner sits on the way to the diagonal neighbor.
export function aimedNeighbor(
  last: Cell,
  pointer: { x: number; y: number },
  centers: readonly TileCenter[],
): Cell | null {
  const origin = centers.find((tile) => sameCell(tile.cell, last))
  if (!origin) return null

  const dx = pointer.x - origin.x
  const dy = pointer.y - origin.y
  let pitch = Infinity
  const neighbors: {
    cell: Cell
    span: number
    vx: number
    vy: number
  }[] = []

  for (const tile of centers) {
    if (!isAdjacent(last, tile.cell)) continue
    const vx = tile.x - origin.x
    const vy = tile.y - origin.y
    const span = Math.hypot(vx, vy)
    if (span === 0) continue
    pitch = Math.min(pitch, span)
    neighbors.push({ cell: tile.cell, span, vx, vy })
  }
  if (!Number.isFinite(pitch)) return null

  const radius = pitch * CORRIDOR
  let best: Cell | null = null
  let bestCross = Infinity
  for (const neighbor of neighbors) {
    const along = (dx * neighbor.vx + dy * neighbor.vy) / neighbor.span
    const cross = Math.abs(dx * neighbor.vy - dy * neighbor.vx) / neighbor.span
    if (cross > radius || along < neighbor.span - radius) continue
    if (cross < bestCross) {
      bestCross = cross
      best = neighbor.cell
    }
  }
  return best
}

// A press continues a free adjacent tile. Pressing the last tile again keeps
// the path so a later drag can extend it. Null means the press is ignored.
export function pathOnPress(path: readonly Cell[], cell: Cell): Cell[] | null {
  const last = path[path.length - 1]
  if (!last) return [cell]
  if (sameCell(last, cell)) return path as Cell[]
  if (!path.some((item) => sameCell(item, cell)) && isAdjacent(last, cell)) {
    return [...path, cell]
  }
  return null
}

// A drag grows the path only onto a free adjacent tile.
export function pathOnDrag(path: readonly Cell[], cell: Cell): Cell[] | null {
  const last = path[path.length - 1]
  if (!last) return [cell]
  if (sameCell(last, cell)) return null
  if (path.some((item) => sameCell(item, cell)) || !isAdjacent(last, cell)) {
    return null
  }
  return [...path, cell]
}
