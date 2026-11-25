import { describe, expect, it } from 'vitest'
import { dictionaryFromText } from './dictionary'
import { findDenseBoards, rankDenseBoards, scoreBoard, type DenseCandidate } from './denseBoards'
import type { Board } from './dice'

const { trie } = dictionaryFromText('cat\ncats\ncar\ncars\nrats\nrat\nart\narts\n')

function candidate(totalScore: number, wordCount: number, mark: string): DenseCandidate {
  return {
    board: [
      [mark, 'a', 'a', 'a', 'a'],
      ['a', 'a', 'a', 'a', 'a'],
      ['a', 'a', 'a', 'a', 'a'],
      ['a', 'a', 'a', 'a', 'a'],
      ['a', 'a', 'a', 'a', 'a'],
    ],
    totalScore,
    wordCount,
    possibleWords: Array.from({ length: wordCount }, (_, index) => ({
      word: `${mark}${index}`,
      points: 100,
    })),
  }
}

describe('scoreBoard', () => {
  it('keeps scored words and totals from the trie', () => {
    const board: Board = [
      ['c', 'a', 't', 's', 'x'],
      ['r', 'a', 't', 's', 'x'],
      ['x', 'x', 'x', 'x', 'x'],
      ['x', 'x', 'x', 'x', 'x'],
      ['x', 'x', 'x', 'x', 'x'],
    ]
    const scored = scoreBoard(board, trie)

    expect(scored.wordCount).toBeGreaterThan(0)
    expect(scored.possibleWords).toHaveLength(scored.wordCount)
    expect(scored.totalScore).toBe(
      scored.possibleWords.reduce((sum, word) => sum + word.points, 0),
    )
    expect(scored.possibleWords.every((word) => word.word.length >= 3 && word.points > 0)).toBe(
      true,
    )
  })
})

describe('rankDenseBoards', () => {
  it('orders by total score, then word count, and keeps the top candidates', () => {
    const ranked = rankDenseBoards(
      [
        candidate(100, 9, 'L'),
        candidate(500, 2, 'M'),
        candidate(500, 8, 'T'),
        candidate(900, 1, 'B'),
      ],
      3,
    )

    expect(ranked.map((item) => [item.totalScore, item.wordCount, item.board[0][0]])).toEqual([
      [900, 1, 'B'],
      [500, 8, 'T'],
      [500, 2, 'M'],
    ])
    expect(ranked[0]?.possibleWords).toEqual([{ word: 'B0', points: 100 }])
  })
})

describe('findDenseBoards', () => {
  it('scores shaken boards and returns top candidates with possibleWords', () => {
    const boards: Board[] = [
      [
        ['c', 'a', 't', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
      ],
      [
        ['c', 'a', 't', 's', 'x'],
        ['r', 'a', 't', 's', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
        ['x', 'x', 'x', 'x', 'x'],
      ],
      [
        ['z', 'z', 'z', 'z', 'z'],
        ['z', 'z', 'z', 'z', 'z'],
        ['z', 'z', 'z', 'z', 'z'],
        ['z', 'z', 'z', 'z', 'z'],
        ['z', 'z', 'z', 'z', 'z'],
      ],
    ]
    let index = 0
    const found = findDenseBoards(trie, {
      samples: boards.length,
      keep: 2,
      shake: () => boards[index++]!,
    })

    expect(found).toHaveLength(2)
    expect(found[0]!.totalScore).toBeGreaterThanOrEqual(found[1]!.totalScore)
    expect(found[0]!.possibleWords).toHaveLength(found[0]!.wordCount)
    expect(found[0]!.board).toEqual(boards[1])
  })
})
