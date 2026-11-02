import { beforeEach, describe, expect, it } from 'vitest'
import { clearOpenRound, loadOpenRound, saveOpenRound, type OpenRound } from './openRound'

const round: OpenRound = {
  board: [
    ['C', 'A'],
    ['T', 'S'],
  ],
  found: [{ word: 'cat', points: 100, start: 0 }],
  endsAt: Date.now() + 95_000,
  phase: 'paused',
  matchId: 'game-1',
  rivals: [{ id: 'grace', name: 'Grace Hopper' }],
  daily: false,
}

beforeEach(() => {
  localStorage.clear()
})

describe('open round', () => {
  it('keeps one player’s paused round', () => {
    saveOpenRound('ada', round)
    saveOpenRound('grace', { ...round, matchId: 'game-2', phase: 'playing' })

    expect(loadOpenRound('ada')).toEqual(round)
    expect(loadOpenRound('grace')?.matchId).toBe('game-2')
    expect(loadOpenRound('mina')).toBeNull()
  })

  it('drops a round once it is finished', () => {
    saveOpenRound('ada', round)
    clearOpenRound('ada')

    expect(loadOpenRound('ada')).toBeNull()
    expect(localStorage.getItem('boggle.openRound')).toBeNull()
  })

  it('ignores a stored round that cannot be read', () => {
    localStorage.setItem('boggle.openRound', '{')
    expect(loadOpenRound('ada')).toBeNull()

    localStorage.setItem(
      'boggle.openRound',
      JSON.stringify({ ada: { ...round, endsAt: 'later', secondsLeft: 999 }, grace: round }),
    )
    expect(loadOpenRound('ada')).toBeNull()
    expect(loadOpenRound('grace')).toEqual(round)
  })

  it('keeps a saved round that only stored the seconds left', () => {
    const { endsAt: _endsAt, ...legacy } = round
    localStorage.setItem(
      'boggle.openRound',
      JSON.stringify({ ada: { ...legacy, secondsLeft: 95 } }),
    )

    const loaded = loadOpenRound('ada')
    expect(loaded?.endsAt).toBeGreaterThan(Date.now() + 94_000)
    expect(loaded?.endsAt).toBeLessThanOrEqual(Date.now() + 95_000)
  })

  it('will not restore a deadline past the length of a round', () => {
    saveOpenRound('ada', { ...round, endsAt: Date.now() + 1_000_000 })

    const loaded = loadOpenRound('ada')
    expect(loaded?.endsAt).toBeLessThanOrEqual(Date.now() + 180_000)
  })
})
