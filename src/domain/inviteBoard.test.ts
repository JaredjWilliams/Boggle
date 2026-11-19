import { describe, expect, it } from 'vitest'
import {
  blockLabel,
  inviteBlock,
  playersNeedingWords,
  type BoardSeat,
} from './inviteBoard'

function seat(status: string, finished = false): BoardSeat {
  return { playerId: 'grace', status, finished }
}

describe('inviteBlock', () => {
  it('lets a new player and a player who declined be invited', () => {
    expect(inviteBlock(undefined)).toBeNull()
    expect(inviteBlock(seat('declined'))).toBeNull()
  })

  it('blocks anyone who finished, holds an invite, or is still playing', () => {
    expect(inviteBlock(seat('accepted', true))).toBe('played')
    expect(inviteBlock(seat('invited', true))).toBe('played')
    expect(inviteBlock(seat('invited'))).toBe('invited')
    expect(inviteBlock(seat('accepted'))).toBe('playing')
    expect(blockLabel('played')).toBe('Already played')
    expect(blockLabel('invited')).toBe('Invited')
    expect(blockLabel('playing')).toBe('Still playing')
  })
})

describe('playersNeedingWords', () => {
  it('asks for a finished word list once', () => {
    const players = [
      { playerId: 'ada', score: 80, words: null },
      { playerId: 'grace', score: null, words: null },
      { playerId: 'mina', score: 10, words: [{ word: 'cat' }] },
    ]
    expect(playersNeedingWords(players, new Set())).toEqual(['ada'])
    expect(playersNeedingWords(players, new Set(['ada']))).toEqual([])
  })
})
