import type { Board } from './dice'
import type { Trie } from './dictionary'

export type Cell = {
  row: number
  col: number
}

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

const SCORE_BY_LENGTH = [0, 0, 0, 100, 400, 800, 1400, 1800, 2200]

export function scoreWord(word: string): number {
  const length = word.length
  if (length < 3) return 0
  if (length <= 8) return SCORE_BY_LENGTH[length]
  return 2200 + 400 * (length - 8)
}

// Large awards race up, then finish one point at a time.
export function scoreStep(remaining: number): number {
  if (remaining <= 0) return 0
  if (remaining <= 12) return 1
  return Math.ceil((remaining - 12) / 8)
}

export function advanceScore(shown: number, target: number, elapsedMs: number): number {
  if (target <= shown) return target
  const frames = Math.max(1, Math.min(40, Math.round(elapsedMs / 16)))
  let next = shown
  for (let i = 0; i < frames && next < target; i += 1) {
    next += scoreStep(target - next)
  }
  return Math.min(target, next)
}

export function compareWords(a: string, b: string): number {
  return b.length - a.length || a.localeCompare(b)
}

export function isAdjacent(from: Cell, to: Cell): boolean {
  const rowGap = Math.abs(from.row - to.row)
  const colGap = Math.abs(from.col - to.col)
  return rowGap <= 1 && colGap <= 1 && (rowGap !== 0 || colGap !== 0)
}

export function pathWord(board: Board, path: readonly Cell[]): string {
  let word = ''
  for (const cell of path) word += board[cell.row][cell.col].toLowerCase()
  return word
}

function onBoard(board: Board, row: number, col: number): boolean {
  const rowCells = board[row]
  return rowCells != null && col >= 0 && col < rowCells.length
}

function cellBit(row: number, col: number, width: number): number {
  return 1 << (row * width + col)
}

function advance(
  board: Board,
  target: string,
  row: number,
  col: number,
  index: number,
): number | null {
  const letters = board[row][col].toLowerCase()
  if (letters.length === 0 || !target.startsWith(letters, index)) return null
  const nextIndex = index + letters.length
  return nextIndex <= target.length ? nextIndex : null
}

function walk(
  board: Board,
  target: string,
  row: number,
  col: number,
  index: number,
  seen: number,
): boolean {
  const bit = cellBit(row, col, board[row].length)
  if (seen & bit) return false

  const nextIndex = advance(board, target, row, col, index)
  if (nextIndex == null) return false
  if (nextIndex === target.length) return true

  const nextSeen = seen | bit
  for (const [dRow, dCol] of NEIGHBORS) {
    const nextRow = row + dRow
    const nextCol = col + dCol
    if (!onBoard(board, nextRow, nextCol)) continue
    if (walk(board, target, nextRow, nextCol, nextIndex, nextSeen)) return true
  }
  return false
}

export function canFormWord(board: Board, word: string): boolean {
  const target = word.toLowerCase()
  if (!/^[a-z]{3,}$/.test(target)) return false

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (walk(board, target, row, col, 0, 0)) return true
    }
  }
  return false
}

export type HighlightLink = {
  from: Cell
  to: Cell
}

// `steps` is the tile's index in the typed word, keyed by `${row},${col}`.
// A tile that sits at two different indexes has no number.
export type LetterHighlight = {
  cells: readonly Cell[]
  links: readonly HighlightLink[]
  steps: Readonly<Record<string, number>>
}

export const emptyHighlight: LetterHighlight = {
  cells: [],
  links: [],
  steps: {},
}

// A dictionary word lights one route. A prefix lights every route on the board.
export function typedHighlight(
  board: Board,
  draft: string,
  dictionary: ReadonlySet<string>,
): LetterHighlight {
  const word = draft.trim().toLowerCase()
  if (!/^[a-z]+$/.test(word)) return emptyHighlight

  const legal = word.length >= 3 && dictionary.has(word)
  const paths = collectPaths(board, word, legal ? 1 : Number.POSITIVE_INFINITY)
  return highlightFromPaths(paths)
}

function collectPaths(board: Board, target: string, stopAt: number): Cell[][] {
  const found: Cell[][] = []
  const path: Cell[] = []

  const visit = (row: number, col: number, index: number, seen: number) => {
    if (found.length >= stopAt) return
    const bit = cellBit(row, col, board[row].length)
    if (seen & bit) return

    const nextIndex = advance(board, target, row, col, index)
    if (nextIndex == null) return

    path.push({ row, col })
    if (nextIndex === target.length) {
      found.push([...path])
    } else {
      const nextSeen = seen | bit
      for (const [dRow, dCol] of NEIGHBORS) {
        if (found.length >= stopAt) break
        const nextRow = row + dRow
        const nextCol = col + dCol
        if (!onBoard(board, nextRow, nextCol)) continue
        visit(nextRow, nextCol, nextIndex, nextSeen)
      }
    }
    path.pop()
  }

  for (let row = 0; row < board.length; row += 1) {
    if (found.length >= stopAt) break
    for (let col = 0; col < board[row].length; col += 1) {
      if (found.length >= stopAt) break
      visit(row, col, 0, 0)
    }
  }
  return found
}

function highlightFromPaths(paths: readonly Cell[][]): LetterHighlight {
  if (paths.length === 0) return emptyHighlight

  const cells: Cell[] = []
  const seenCells = new Set<string>()
  const links: HighlightLink[] = []
  const seenLinks = new Set<string>()
  const stepAt = new Map<string, number | undefined>()

  for (const path of paths) {
    for (let index = 0; index < path.length; index += 1) {
      const cell = path[index]
      const key = cellKey(cell.row, cell.col)
      if (!seenCells.has(key)) {
        seenCells.add(key)
        cells.push(cell)
        stepAt.set(key, index)
      } else if (stepAt.get(key) !== index) {
        stepAt.set(key, undefined)
      }

      if (index === 0) continue
      const from = path[index - 1]
      const linkKey = `${cellKey(from.row, from.col)}>${key}`
      if (seenLinks.has(linkKey)) continue
      seenLinks.add(linkKey)
      links.push({ from, to: cell })
    }
  }

  const steps: Record<string, number> = {}
  for (const [key, step] of stepAt) {
    if (step !== undefined) steps[key] = step
  }
  return { cells, links, steps }
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

function search(
  board: Board,
  node: Trie,
  row: number,
  col: number,
  seen: number,
  prefix: string,
  found: Set<string>,
): void {
  const bit = cellBit(row, col, board[row].length)
  if (seen & bit) return

  let current = node
  const letters = board[row][col].toLowerCase()
  for (const letter of letters) {
    const child = current.children[letter]
    if (!child) return
    current = child
  }

  const word = prefix + letters
  if (current.end && word.length >= 3) found.add(word)
  if (!hasChild(current)) return

  const nextSeen = seen | bit
  for (const [dRow, dCol] of NEIGHBORS) {
    const nextRow = row + dRow
    const nextCol = col + dCol
    if (!onBoard(board, nextRow, nextCol)) continue
    search(board, current, nextRow, nextCol, nextSeen, word, found)
  }
}

function hasChild(node: Trie): boolean {
  for (const letter in node.children) {
    if (node.children[letter]) return true
  }
  return false
}

export function findAllWords(board: Board, trie: Trie): string[] {
  const found = new Set<string>()
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      search(board, trie, row, col, 0, '', found)
    }
  }
  return [...found]
}
