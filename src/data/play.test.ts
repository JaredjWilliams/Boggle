import { describe, expect, it } from 'vitest'
import { ROUND_SECONDS } from '../game/round'
import { accountEmail, playedOn, secondsRemaining } from './play'

describe('accountEmail', () => {
  it('builds a stable sign-in address from the username', () => {
    expect(accountEmail(' Ada ')).toBe('ada@players.boggle')
  })
})

describe('playedOn', () => {
  it('uses the local calendar day', () => {
    expect(playedOn(new Date(2026, 9, 19, 23, 30))).toBe('2026-10-19')
  })
})

describe('secondsRemaining', () => {
  it('counts down from the shared start and stops at zero', () => {
    const started = '2026-10-19T20:00:00.000Z'
    const later = Date.parse(started) + 30_000
    expect(secondsRemaining(started, later)).toBe(ROUND_SECONDS - 30)
    expect(secondsRemaining(started, Date.parse(started) + ROUND_SECONDS * 1000 + 5000)).toBe(0)
  })
})
