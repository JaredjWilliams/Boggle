import { isAdjacent, type Cell } from './words'

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

export function tileAt(x: number, y: number): Cell | null {
  const element = document.elementFromPoint(x, y)
  const tile = element?.closest<HTMLElement>('[data-row]')
  if (!tile?.dataset.row || tile.dataset.col == null) return null
  return {
    row: Number(tile.dataset.row),
    col: Number(tile.dataset.col),
  }
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
