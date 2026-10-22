import { describe, expect, it } from 'vitest'
import { turnBoard } from './dice'

const board = [
  ['C', 'A', 'T', 'S', 'X'],
  ['R', 'E', 'N', 'O', 'P'],
  ['D', 'I', 'L', 'M', 'B'],
  ['F', 'G', 'H', 'J', 'K'],
  ['U', 'V', 'W', 'Y', 'Qu'],
]

describe('turnBoard', () => {
  it('rotates every letter 90 degrees clockwise', () => {
    expect(turnBoard(board)).toEqual([
      ['U', 'F', 'D', 'R', 'C'],
      ['V', 'G', 'I', 'E', 'A'],
      ['W', 'H', 'L', 'N', 'T'],
      ['Y', 'J', 'M', 'O', 'S'],
      ['Qu', 'K', 'B', 'P', 'X'],
    ])
  })

  it('turns another quarter from the new orientation', () => {
    expect(turnBoard(turnBoard(board))).toEqual([
      ['Qu', 'Y', 'W', 'V', 'U'],
      ['K', 'J', 'H', 'G', 'F'],
      ['B', 'M', 'L', 'I', 'D'],
      ['P', 'O', 'N', 'E', 'R'],
      ['X', 'S', 'T', 'A', 'C'],
    ])
  })

  it('returns to the original board after four turns', () => {
    const once = turnBoard(board)
    const twice = turnBoard(once)
    const thrice = turnBoard(twice)
    expect(turnBoard(thrice)).toEqual(board)
  })

  it('keeps the same letters and leaves the source board unchanged', () => {
    const source = board.map((row) => [...row])
    const turned = turnBoard(source)

    expect(source).toEqual(board)
    expect(turned).not.toBe(source)
    expect([...turned.flat()].sort()).toEqual([...source.flat()].sort())
  })
})
