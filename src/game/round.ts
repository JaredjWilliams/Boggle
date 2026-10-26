import type { Board } from './dice'
import type { Trie } from './dictionary'
import { canFormWord, compareWords, findAllWords, scoreWord, type Cell } from './words'

export const ROUND_SECONDS = 180

export type Phase = 'loading' | 'ready' | 'playing' | 'ended'

export type ScoredWord = {
  word: string
  points: number
  start?: number
}

export function startIndex(cell: Cell | null | undefined, width: number): number | undefined {
  if (!cell || width < 1) return undefined
  const { row, col } = cell
  if (!Number.isInteger(row) || !Number.isInteger(col)) return undefined
  if (row < 0 || col < 0 || row >= width || col >= width) return undefined
  return row * width + col
}

export function totalScore(words: readonly ScoredWord[]): number {
  return words.reduce((sum, word) => sum + word.points, 0)
}

export type AttemptKind = 'new' | 'repeat' | 'invalid'

export type WordVerdict =
  | { kind: 'new'; message: null }
  | { kind: 'repeat'; message: string }
  | { kind: 'invalid'; message: string }

export function judgeWord(
  word: string,
  board: Board,
  dictionary: ReadonlySet<string>,
  alreadyFound: boolean,
): WordVerdict {
  if (word.length < 3) return { kind: 'invalid', message: 'Too short' }
  if (alreadyFound) return { kind: 'repeat', message: 'Already found' }
  if (!dictionary.has(word)) {
    return { kind: 'invalid', message: 'Not in the dictionary' }
  }
  if (!canFormWord(board, word)) {
    return { kind: 'invalid', message: 'Not on the board' }
  }
  return { kind: 'new', message: null }
}

export function invalidWordMessage(
  word: string,
  board: Board,
  dictionary: ReadonlySet<string>,
  alreadyFound: boolean,
): string | null {
  return judgeWord(word, board, dictionary, alreadyFound).message
}

export function unfoundWords(
  board: Board,
  trie: Trie,
  found: readonly ScoredWord[],
): ScoredWord[] {
  const already = new Set(found.map((item) => item.word))
  return findAllWords(board, trie)
    .filter((word) => !already.has(word))
    .sort(compareWords)
    .map((word) => ({ word, points: scoreWord(word) }))
}
