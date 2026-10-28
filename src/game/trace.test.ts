import { describe, expect, it } from 'vitest'
import { aimedNeighbor, type TileCenter } from './trace'

const STRIDE = 72

const origin = { row: 0, col: 0 }

function centers(): TileCenter[] {
  const tiles: TileCenter[] = []
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      tiles.push({ cell: { row, col }, x: col * STRIDE, y: row * STRIDE })
    }
  }
  return tiles
}

describe('aimedNeighbor', () => {
  const board = centers()

  it('follows a straight swipe onto the next tile', () => {
    expect(aimedNeighbor(origin, { x: 55, y: 0 }, board)).toEqual({ row: 0, col: 1 })
    expect(aimedNeighbor(origin, { x: 0, y: 55 }, board)).toEqual({ row: 1, col: 0 })
  })

  it('keeps a straight swipe that wobbles through the middle of the tile', () => {
    expect(aimedNeighbor(origin, { x: 55, y: 14 }, board)).toEqual({ row: 0, col: 1 })
  })

  it('does not take a tile while the pointer is still leaving the last one', () => {
    expect(aimedNeighbor(origin, { x: 20, y: 0 }, board)).toBeNull()
  })

  it('ignores the orthogonal tile whose corner a diagonal swipe crosses', () => {
    // (40, 32) is the inner corner of the tile to the right.
    expect(aimedNeighbor(origin, { x: 40, y: 32 }, board)).toBeNull()
    expect(aimedNeighbor(origin, { x: 49, y: 31 }, board)).toBeNull()
  })

  it('takes the diagonal tile once the swipe reaches it', () => {
    expect(aimedNeighbor(origin, { x: 60, y: 60 }, board)).toEqual({ row: 1, col: 1 })
  })

  it('still takes a tile when the sample lands past its center', () => {
    expect(aimedNeighbor(origin, { x: 150, y: 4 }, board)).toEqual({ row: 0, col: 1 })
  })

  it('aims from the latest tile, not the start of the word', () => {
    expect(aimedNeighbor({ row: 1, col: 1 }, { x: STRIDE + 60, y: STRIDE + 60 }, board)).toEqual({
      row: 2,
      col: 2,
    })
  })
})
