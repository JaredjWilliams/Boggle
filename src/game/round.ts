import type { Board } from './dice'
import type { Trie } from './dictionary'
import { canFormWord, compareWords, findAllWords, scoreWord } from './words'

export const ROUND_SECONDS = 180

export type Phase = 'loading' | 'playing' | 'ended'

export type ScoredWord = {
  word: string
  points: number
}

export function totalScore(words: readonly ScoredWord[]): number {
  return words.reduce((sum, word) => sum + word.points, 0)
}

export function invalidWordMessage(
  word: string,
  board: Board,
  dictionary: ReadonlySet<string>,
  alreadyFound: boolean,
): string | null {
  if (word.length < 3) return 'Too short'
  if (alreadyFound) return 'Already found'
  if (!dictionary.has(word)) return 'Not in the dictionary'
  if (!canFormWord(board, word)) return 'Not on the board'
  return null
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
