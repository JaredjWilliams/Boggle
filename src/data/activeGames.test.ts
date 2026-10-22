import { describe, expect, it } from 'vitest'
import { activeGameLabel, assembleActiveGames, formatRecord, type ActiveSeat, type HeadScore } from './activeGames'

const names = [
  { id: 'grace', name: ' Grace Hopper ' },
  { id: 'mina', name: '   ' },
]

describe('assembleActiveGames', () => {
  it('lists an accepted game with the record against that person', () => {
    const seats: ActiveSeat[] = [
      seat('new', 'ada', 'accepted', '2026-10-22T18:00:00.000Z'),
      seat('new', 'grace', 'invited', '2026-10-22T18:00:00.000Z'),
      seat('old', 'ada', 'accepted', '2026-10-21T12:00:00.000Z'),
      seat('old', 'grace', 'accepted', '2026-10-21T12:00:00.000Z'),
      seat('solo', 'ada', 'accepted', '2026-10-22T19:00:00.000Z'),
      seat('nope', 'ada', 'invited', '2026-10-22T20:00:00.000Z'),
      seat('nope', 'grace', 'accepted', '2026-10-22T20:00:00.000Z'),
      seat('gone', 'ada', 'accepted', '2026-10-22T17:00:00.000Z'),
      seat('gone', 'grace', 'declined', '2026-10-22T17:00:00.000Z'),
    ]
    const scores: HeadScore[] = [
      { gameId: 'old', playerId: 'ada', score: 100 },
      { gameId: 'old', playerId: 'grace', score: 40 },
      { gameId: 'tie', playerId: 'ada', score: 10 },
      { gameId: 'tie', playerId: 'grace', score: 10 },
      { gameId: 'loss', playerId: 'ada', score: 0 },
      { gameId: 'loss', playerId: 'grace', score: 50 },
    ]

    expect(assembleActiveGames('ada', seats, scores, names)).toEqual([
      {
        gameId: 'new',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: false,
        wins: 1,
        losses: 1,
      },
      {
        gameId: 'old',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: true,
        wins: 1,
        losses: 1,
      },
    ])
  })

  it('marks a zero score as played back and keeps each opponent’s record', () => {
    const seats: ActiveSeat[] = [
      seat('g1', 'ada', 'accepted', '2026-10-22T18:00:00.000Z'),
      seat('g1', 'grace', 'accepted', '2026-10-22T18:00:00.000Z'),
      seat('g1', 'mina', 'invited', '2026-10-22T18:00:00.000Z'),
    ]
    const scores: HeadScore[] = [
      { gameId: 'g1', playerId: 'ada', score: 80 },
      { gameId: 'g1', playerId: 'grace', score: 0 },
      { gameId: 'earlier', playerId: 'ada', score: 10 },
      { gameId: 'earlier', playerId: 'mina', score: 30 },
    ]

    expect(assembleActiveGames('ada', seats, scores, names)).toEqual([
      {
        gameId: 'g1',
        opponentId: 'mina',
        opponentName: 'A player',
        playedBack: false,
        wins: 0,
        losses: 1,
      },
      {
        gameId: 'g1',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: true,
        wins: 1,
        losses: 0,
      },
    ])
  })

  it('describes the win-loss ratio and whether they have played back', () => {
    expect(formatRecord(2, 1)).toBe('2–1')
    expect(
      activeGameLabel({
        gameId: 'g1',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: true,
        wins: 1,
        losses: 0,
      }),
    ).toBe('Grace Hopper, 1 win, 0 losses, played back')
    expect(
      activeGameLabel({
        gameId: 'g1',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: false,
        wins: 0,
        losses: 1,
      }),
    ).toBe('Grace Hopper, 0 wins, 1 loss, waiting')
  })
})

function seat(gameId: string, playerId: string, status: string, createdAt: string): ActiveSeat {
  return { gameId, playerId, status, createdAt }
}
