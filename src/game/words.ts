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

  const letters = board[row][col].toLowerCase()
  if (target.slice(index, index + letters.length) !== letters) return false

  const nextIndex = index + letters.length
  if (nextIndex === target.length) return true
  if (nextIndex > target.length) return false

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
