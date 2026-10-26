import { describe, expect, it } from 'vitest'
import { dictionaryFromText } from './dictionary'
import {
  invalidWordMessage,
  judgeWord,
  startIndex,
  totalScore,
  unfoundWords,
} from './round'

const board = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Q'],
]

const dictionary = dictionaryFromText(
  ['cat', 'cats', 'car', 'rat', 'tar', 'eat', 'tea', 'ate', 'zzz'].join('\n'),
)

describe('judgeWord', () => {
  it('accepts a new word that is on the board', () => {
    expect(judgeWord('cat', board, dictionary.words, false)).toEqual({
      kind: 'new',
      message: null,
    })
    expect(invalidWordMessage('cat', board, dictionary.words, false)).toBeNull()
  })

  it('marks a word that was already guessed', () => {
    expect(judgeWord('cat', board, dictionary.words, true)).toEqual({
      kind: 'repeat',
      message: 'Already found',
    })
  })

  it('rejects a word that is too short before any other check', () => {
    expect(judgeWord('at', board, dictionary.words, true)).toEqual({
      kind: 'invalid',
      message: 'Too short',
    })
  })

  it('rejects a word that is not in the dictionary', () => {
    expect(judgeWord('xyz', board, dictionary.words, false)).toEqual({
      kind: 'invalid',
      message: 'Not in the dictionary',
    })
  })

  it('rejects a dictionary word that cannot be traced on the board', () => {
    expect(judgeWord('zzz', board, dictionary.words, false)).toEqual({
      kind: 'invalid',
      message: 'Not on the board',
    })
  })
})

describe('totalScore', () => {
  it('adds the WordHunt points of every found word', () => {
    expect(totalScore([])).toBe(0)
    expect(
      totalScore([
        { word: 'cat', points: 100 },
        { word: 'cats', points: 400 },
      ]),
    ).toBe(500)
  })
})

describe('startIndex', () => {
  it('numbers a traced cell from the top left', () => {
    expect(startIndex({ row: 0, col: 0 }, 5)).toBe(0)
    expect(startIndex({ row: 0, col: 4 }, 5)).toBe(4)
    expect(startIndex({ row: 2, col: 2 }, 5)).toBe(12)
    expect(startIndex({ row: 4, col: 4 }, 5)).toBe(24)
    expect(startIndex({ row: 5, col: 0 }, 5)).toBeUndefined()
    expect(startIndex(null, 5)).toBeUndefined()
  })
})

describe('unfoundWords', () => {
  it('lists the missed words with WordHunt points, longest first', () => {
    expect(unfoundWords(board, dictionary.trie, [{ word: 'cat', points: 100 }])).toEqual([
      { word: 'cats', points: 400 },
      { word: 'ate', points: 100 },
      { word: 'car', points: 100 },
      { word: 'eat', points: 100 },
      { word: 'rat', points: 100 },
      { word: 'tar', points: 100 },
      { word: 'tea', points: 100 },
    ])
  })
})
