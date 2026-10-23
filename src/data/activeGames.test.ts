import { describe, expect, it } from 'vitest'
import {
  activeGameLabel,
  assembleActiveGames,
  completedGameKey,
  formatRecord,
  playedBackNotices,
  selectActiveGames,
  selectCompletedGames,
  type ActiveGame,
  type ActiveSeat,
  type HeadScore,
} from './activeGames'

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
        hosted: false,
        wins: 1,
        losses: 1,
      },
      {
        gameId: 'old',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: true,
        hosted: false,
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
        hosted: false,
        wins: 0,
        losses: 1,
      },
      {
        gameId: 'g1',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack: true,
        hosted: false,
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
        hosted: true,
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
        hosted: true,
        wins: 0,
        losses: 1,
      }),
    ).toBe('Grace Hopper, 0 wins, 1 loss, waiting')
  })
})

describe('selectActiveGames', () => {
  it('keeps games still waiting and the ten newest finished games', () => {
    const games: ActiveGame[] = [
      game('g0', 'Newest', true),
      game('g1', 'Waiting', false),
      ...Array.from({ length: 10 }, (_, index) => game(`g${index + 2}`, `Player ${index + 2}`, true)),
    ]

    expect(selectActiveGames(games).map((item) => item.gameId)).toEqual(['g1'])
    expect(selectCompletedGames(games).map((item) => item.gameId)).toEqual([
      'g0',
      'g2',
      'g3',
      'g4',
      'g5',
      'g6',
      'g7',
      'g8',
      'g9',
      'g10',
    ])
  })
})

describe('playedBackNotices', () => {
  it('notifies the inviter once for each unread game the other player finished', () => {
    const seats: ActiveSeat[] = [
      seat('g1', 'ada', 'accepted', '2026-10-22T18:00:00.000Z', 'ada'),
      seat('g1', 'grace', 'accepted', '2026-10-22T18:00:00.000Z', 'ada'),
      seat('g2', 'ada', 'accepted', '2026-10-21T18:00:00.000Z', 'grace'),
      seat('g2', 'grace', 'accepted', '2026-10-21T18:00:00.000Z', 'grace'),
      seat('g3', 'ada', 'accepted', '2026-10-20T18:00:00.000Z', 'ada'),
      seat('g3', 'mina', 'invited', '2026-10-20T18:00:00.000Z', 'ada'),
    ]
    const scores: HeadScore[] = [
      { gameId: 'g1', playerId: 'grace', score: 10 },
      { gameId: 'g2', playerId: 'ada', score: 4 },
      { gameId: 'g2', playerId: 'grace', score: 10 },
    ]

    const games = assembleActiveGames('ada', seats, scores, names)

    expect(games.map((game) => ({ gameId: game.gameId, playedBack: game.playedBack, hosted: game.hosted }))).toEqual([
      { gameId: 'g1', playedBack: true, hosted: true },
      { gameId: 'g2', playedBack: true, hosted: false },
      { gameId: 'g3', playedBack: false, hosted: true },
    ])
    expect(selectActiveGames(games).map((game) => game.gameId)).toEqual(['g3'])
    expect(playedBackNotices(games, new Set()).map((game) => game.gameId)).toEqual(['g1'])

    const read = new Set([completedGameKey(games[0])])
    expect(playedBackNotices(games, read)).toEqual([])
  })
})

function game(gameId: string, opponentName: string, playedBack: boolean, hosted = false): ActiveGame {
  return {
    gameId,
    opponentId: 'grace',
    opponentName,
    playedBack,
    hosted,
    wins: 1,
    losses: 0,
  }
}

function seat(
  gameId: string,
  playerId: string,
  status: string,
  createdAt: string,
  hostId = '',
): ActiveSeat {
  return { gameId, playerId, status, createdAt, hostId }
}
