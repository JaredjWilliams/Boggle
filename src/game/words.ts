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

export function scoreWord(word: string): number {
  const length = word.length
  if (length <= 4) return length >= 3 ? 1 : 0
  if (length === 5) return 2
  if (length === 6) return 3
  if (length === 7) return 5
  return 11
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

function onBoard(row: number, col: number): boolean {
  return row >= 0 && row < 4 && col >= 0 && col < 4
}

function walk(
  board: Board,
  target: string,
  row: number,
  col: number,
  index: number,
  seen: number,
): boolean {
  const bit = 1 << (row * 4 + col)
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
    if (!onBoard(nextRow, nextCol)) continue
    if (walk(board, target, nextRow, nextCol, nextIndex, nextSeen)) return true
  }
  return false
}

export function canFormWord(board: Board, word: string): boolean {
  const target = word.toLowerCase()
  if (!/^[a-z]{3,}$/.test(target)) return false

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
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
  const bit = 1 << (row * 4 + col)
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
    if (!onBoard(nextRow, nextCol)) continue
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
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      search(board, trie, row, col, 0, '', found)
    }
  }
  return [...found]
}
