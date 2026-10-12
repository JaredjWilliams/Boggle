import { describe, expect, it } from 'vitest'
import {
  advanceScore,
  emptyHighlight,
  scoreStep,
  scoreWord,
  typedHighlight,
  type LetterHighlight,
} from './words'

describe('scoreWord', () => {
  it('gives no points for a word shorter than 3 letters', () => {
    expect(scoreWord('')).toBe(0)
    expect(scoreWord('a')).toBe(0)
    expect(scoreWord('at')).toBe(0)
  })

  it('uses the WordHunt points for each length', () => {
    expect(scoreWord('cat')).toBe(100)
    expect(scoreWord('cats')).toBe(400)
    expect(scoreWord('crate')).toBe(800)
    expect(scoreWord('crates')).toBe(1400)
    expect(scoreWord('crating')).toBe(1800)
    expect(scoreWord('creating')).toBe(2200)
  })

  it('adds 400 points for every letter after 8', () => {
    expect(scoreWord('a'.repeat(9))).toBe(2600)
    expect(scoreWord('a'.repeat(10))).toBe(3000)
    expect(scoreWord('a'.repeat(11))).toBe(3400)
    expect(scoreWord('a'.repeat(12))).toBe(3800)
  })
})

describe('scoreStep', () => {
  it('moves one point at a time near the end of a count', () => {
    expect(scoreStep(0)).toBe(0)
    expect(scoreStep(-4)).toBe(0)
    for (let remaining = 1; remaining <= 12; remaining += 1) {
      expect(scoreStep(remaining)).toBe(1)
    }
  })

  it('takes a larger step while a big award is still far from the total', () => {
    expect(scoreStep(13)).toBe(1)
    expect(scoreStep(100)).toBe(11)
    expect(scoreStep(400)).toBe(49)
    expect(scoreStep(2200)).toBeGreaterThan(1)
    expect(scoreStep(2200)).toBeLessThan(2200)
  })
})

describe('advanceScore', () => {
  it('snaps down when the target is not higher', () => {
    expect(advanceScore(100, 100, 16)).toBe(100)
    expect(advanceScore(400, 0, 16)).toBe(0)
  })

  it('counts a 100-point word up by ones and lands exactly on the target', () => {
    const steps = climb(0, 100)
    expect(steps.at(-1)).toBe(100)
    expect(steps.every((score, index) => index === 0 || score > steps[index - 1])).toBe(
      true,
    )
    expect(steps.slice(-12)).toEqual([89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100])
    expect(steps.length).toBeLessThan(100)
  })

  it('counts a long word to its exact total without passing it', () => {
    const steps = climb(500, 2700)
    expect(steps.at(-1)).toBe(2700)
    expect(Math.max(...steps)).toBe(2700)
    expect(steps.slice(-12)).toEqual([
      2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700,
    ])
  })

  it('catches up several steps when a frame is late, and no more than 40', () => {
    const oneFrame = advanceScore(0, 2200, 16)
    const lateFrame = advanceScore(0, 2200, 500)
    const stalled = advanceScore(0, 2200, 10_000)
    expect(lateFrame).toBeGreaterThan(oneFrame)
    expect(stalled).toBe(advanceScore(0, 2200, 40 * 16))
    expect(stalled).toBeLessThan(2200)
  })
})

const threeThe = [
  ['T', 'H', 'E', 'A', 'B'],
  ['C', 'D', 'F', 'G', 'I'],
  ['T', 'H', 'E', 'J', 'K'],
  ['L', 'M', 'N', 'O', 'P'],
  ['T', 'H', 'E', 'Q', 'R'],
]

describe('typedHighlight', () => {
  const dictionary = new Set(['the'])

  it('lights every copy of a typed letter', () => {
    const highlight = typedHighlight(threeThe, 't', dictionary)
    expect(cellKeys(highlight)).toEqual(['0,0', '2,0', '4,0'])
    expect(highlight.links).toEqual([])
    expect(highlight.steps).toEqual({ '0,0': 0, '2,0': 0, '4,0': 0 })
  })

  it('lights every route of a prefix, then one route when the word is legal', () => {
    expect(cellKeys(typedHighlight(threeThe, 'th', dictionary))).toEqual([
      '0,0',
      '0,1',
      '2,0',
      '2,1',
      '4,0',
      '4,1',
    ])
    expect(typedHighlight(threeThe, 'th', dictionary).links).toEqual([
      { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
      { from: { row: 2, col: 0 }, to: { row: 2, col: 1 } },
      { from: { row: 4, col: 0 }, to: { row: 4, col: 1 } },
    ])

    const word = typedHighlight(threeThe, 'the', dictionary)
    expect(cellKeys(word)).toEqual(['0,0', '0,1', '0,2'])
    expect(word.steps).toEqual({ '0,0': 0, '0,1': 1, '0,2': 2 })
  })

  it('keeps every route when the same letters are not a dictionary word', () => {
    expect(cellKeys(typedHighlight(threeThe, 'the', new Set()))).toEqual([
      '0,0',
      '0,1',
      '0,2',
      '2,0',
      '2,1',
      '2,2',
      '4,0',
      '4,1',
      '4,2',
    ])
  })

  it('does not treat a two-letter sequence as a finished word', () => {
    expect(cellKeys(typedHighlight(threeThe, 'th', new Set(['th', 'the'])))).toEqual([
      '0,0',
      '0,1',
      '2,0',
      '2,1',
      '4,0',
      '4,1',
    ])
  })

  it('stops at the dictionary word even when the route can continue', () => {
    const board = [
      ['T', 'H', 'E', 'M', 'A'],
      ['B', 'C', 'D', 'F', 'G'],
      ['T', 'H', 'E', 'M', 'I'],
      ['J', 'K', 'L', 'N', 'O'],
      ['P', 'Q', 'R', 'S', 'U'],
    ]
    const words = new Set(['the', 'them'])
    expect(cellKeys(typedHighlight(board, 'the', words))).toEqual(['0,0', '0,1', '0,2'])
    expect(cellKeys(typedHighlight(board, 'them', words))).toEqual([
      '0,0',
      '0,1',
      '0,2',
      '0,3',
    ])
  })

  it('drops a letter that cannot connect to the letters already typed', () => {
    const board = [
      ['T', 'H', 'E', 'A', 'B'],
      ['C', 'D', 'F', 'G', 'I'],
      ['T', 'X', 'X', 'J', 'K'],
      ['L', 'M', 'N', 'O', 'P'],
      ['Q', 'R', 'S', 'U', 'V'],
    ]
    expect(cellKeys(typedHighlight(board, 't', dictionary))).toEqual(['0,0', '2,0'])
    expect(cellKeys(typedHighlight(board, 'th', dictionary))).toEqual(['0,0', '0,1'])
  })

  it('follows a diagonal route and will not reuse a tile', () => {
    const diagonal = [
      ['T', 'A', 'X', 'X', 'X'],
      ['B', 'H', 'X', 'X', 'X'],
      ['C', 'D', 'E', 'X', 'X'],
      ['F', 'G', 'I', 'J', 'K'],
      ['L', 'M', 'N', 'O', 'P'],
    ]
    expect(cellKeys(typedHighlight(diagonal, 'the', new Set()))).toEqual([
      '0,0',
      '1,1',
      '2,2',
    ])

    const reuse = [
      ['A', 'B', 'A', 'X', 'X'],
      ['Y', 'Y', 'Y', 'Y', 'Y'],
      ['Y', 'Y', 'Y', 'Y', 'Y'],
      ['Y', 'Y', 'Y', 'Y', 'Y'],
      ['Y', 'Y', 'Y', 'Y', 'Y'],
    ]
    const bothWays = typedHighlight(reuse, 'aba', new Set())
    expect(cellKeys(bothWays)).toEqual(['0,0', '0,1', '0,2'])
    expect(bothWays.steps).toEqual({ '0,1': 1 })
    expect(bothWays.links).toEqual([
      { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
      { from: { row: 0, col: 1 }, to: { row: 0, col: 2 } },
      { from: { row: 0, col: 2 }, to: { row: 0, col: 1 } },
      { from: { row: 0, col: 1 }, to: { row: 0, col: 0 } },
    ])
  })

  it('treats Qu as one tile and ignores letters that are not on the board', () => {
    const board = [
      ['Qu', 'E', 'N', 'A', 'B'],
      ['C', 'D', 'F', 'G', 'H'],
      ['I', 'J', 'K', 'L', 'M'],
      ['O', 'P', 'R', 'S', 'T'],
      ['U', 'V', 'W', 'X', 'Y'],
    ]
    expect(typedHighlight(board, 'q', new Set())).toBe(emptyHighlight)
    expect(cellKeys(typedHighlight(board, 'qu', new Set()))).toEqual(['0,0'])
    expect(cellKeys(typedHighlight(board, 'que', new Set(['que'])))).toEqual([
      '0,0',
      '0,1',
    ])
    expect(typedHighlight(threeThe, 'cat', dictionary)).toBe(emptyHighlight)
  })

  it('matches the typed word without case or surrounding spaces', () => {
    expect(cellKeys(typedHighlight(threeThe, ' The ', dictionary))).toEqual([
      '0,0',
      '0,1',
      '0,2',
    ])
    expect(typedHighlight(threeThe, 'th!', dictionary)).toBe(emptyHighlight)
    expect(typedHighlight(threeThe, '   ', dictionary)).toBe(emptyHighlight)
  })
})

function cellKeys(highlight: LetterHighlight): string[] {
  return highlight.cells.map((cell) => `${cell.row},${cell.col}`)
}

function climb(from: number, target: number): number[] {
  const scores = [from]
  let shown = from
  let guard = 0
  while (shown < target && guard < 500) {
    shown = advanceScore(shown, target, 16)
    scores.push(shown)
    guard += 1
  }
  return scores
}
