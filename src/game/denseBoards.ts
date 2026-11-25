import { shakeBoard, type Board } from './dice'
import type { Trie } from './dictionary'
import type { ScoredWord } from './round'
import { findAllWords, scoreWord } from './words'

export type DenseCandidate = {
  board: Board
  totalScore: number
  wordCount: number
  possibleWords: ScoredWord[]
}

export type DenseSearchOptions = {
  samples: number
  keep: number
  shake?: () => Board
}

export function scoreBoard(board: Board, trie: Trie): DenseCandidate {
  const possibleWords = findAllWords(board, trie).map((word) => ({
    word,
    points: scoreWord(word),
  }))
  return {
    board,
    totalScore: possibleWords.reduce((sum, word) => sum + word.points, 0),
    wordCount: possibleWords.length,
    possibleWords,
  }
}

export function rankDenseBoards(candidates: readonly DenseCandidate[], keep: number): DenseCandidate[] {
  const limit = Math.max(0, keep)
  return candidates
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore || b.wordCount - a.wordCount)
    .slice(0, limit)
}

export function findDenseBoards(trie: Trie, options: DenseSearchOptions): DenseCandidate[] {
  const shake = options.shake ?? shakeBoard
  const samples = Math.max(0, options.samples)
  const scored: DenseCandidate[] = []
  for (let index = 0; index < samples; index += 1) {
    scored.push(scoreBoard(shake(), trie))
  }
  return rankDenseBoards(scored, options.keep)
}
