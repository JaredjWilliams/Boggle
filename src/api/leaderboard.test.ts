import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blankQuery, queryChain, shiftQueue, type QueryResult, type RecordedQuery } from '../test/queryChain'
import { loadLeaderboard } from './leaderboard'
import {
  buildLeaderboard,
  placeLabel,
  type LeaderboardResult,
} from '../domain/leaderboard'

const supabase = vi.hoisted(() => {
  const calls: RecordedQuery[] = []
  const queues = new Map<string, QueryResult[]>()

  function from(table: string) {
    const query = blankQuery(table)
    calls.push(query)
    return queryChain(query, () => shiftQueue(queues, table))
  }

  const rpcCalls: string[] = []
  const rpcQueue: QueryResult[] = []

  function rpc(fn: string) {
    rpcCalls.push(fn)
    const next = rpcQueue.shift()
    if (!next) throw new Error(`No response queued for ${fn}`)
    return Promise.resolve(next)
  }

  return { calls, queues, from, rpc, rpcCalls, rpcQueue }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from, rpc: supabase.rpc }),
}))

function result(row: Partial<LeaderboardResult> & Pick<LeaderboardResult, 'game_id' | 'player_id'>): LeaderboardResult {
  return {
    score: 0,
    words: [],
    profiles: { name: 'Ada Lovelace' },
    games: { daily_on: null, created_at: '2026-10-21T12:00:00.000Z' },
    ...row,
  }
}

function rows(
  id:
    | 'points'
    | 'bestScore'
    | 'words'
    | 'longest'
    | 'wins'
    | 'friends'
    | 'daily'
    | 'outgoing'
    | 'averageWords'
    | 'averagePoints',
) {
  const board = buildLeaderboard(
    [
      ...sampleResults(),
      ...fillers('ada', 'Ada Lovelace', 7),
      ...fillers('grace', 'Grace Hopper', 8),
      ...fillers('mina', 'Mina Chen', 10),
      ...fillers('jonah', 'Jonah Park', 10),
    ],
  ).find((item) => item.id === id)
  if (!board) throw new Error(`Missing ${id}`)
  return board.rows
}

function dailyPlay(
  playerId: string,
  name: string,
  dailyOn: string,
  createdAt: string,
  score: number,
): LeaderboardResult {
  return result({
    game_id: `${dailyOn}-${playerId}-${createdAt}`,
    player_id: playerId,
    score,
    profiles: { name },
    games: { daily_on: dailyOn, created_at: createdAt },
  })
}

function fillers(playerId: string, name: string, count: number): LeaderboardResult[] {
  return Array.from({ length: count }, (_, index) =>
    result({
      game_id: `pad-${playerId}-${index}`,
      player_id: playerId,
      score: 0,
      words: [],
      profiles: { name },
      games: { daily_on: null, created_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString() },
    }),
  )
}

function sampleResults(): LeaderboardResult[] {
  return [
    result({
      game_id: 'daily-ada-early',
      player_id: 'ada',
      score: 80,
      words: [{ word: 'cat', points: 1 }],
      profiles: { name: ' Ada Lovelace ' },
      games: { daily_on: '2026-10-21', created_at: '2026-10-21T08:00:00.000Z' },
    }),
    result({
      game_id: 'daily-ada-late',
      player_id: 'ada',
      score: 40,
      words: [
        { word: 'cat', points: 1 },
        { word: '  ' },
        { word: 'quartz', points: 11 },
      ],
      games: { daily_on: '2026-10-21', created_at: '2026-10-21T18:00:00.000Z' },
    }),
    result({
      game_id: 'daily-grace',
      player_id: 'grace',
      score: 40,
      words: [{ word: 'zebra', points: 1 }, { word: 'apple', points: 1 }],
      profiles: { name: 'Grace Hopper' },
      games: { daily_on: '2026-10-21', created_at: '2026-10-21T12:00:00.000Z' },
    }),
    result({
      game_id: 'daily-mina',
      player_id: 'mina',
      score: 10,
      words: [{ word: 'rat', points: 1 }],
      profiles: { name: 'Mina Chen' },
      games: { daily_on: '2026-10-22', created_at: '2026-10-22T12:00:00.000Z' },
    }),
    result({
      game_id: 'match',
      player_id: 'ada',
      score: 100,
      words: [{ word: 'cats', points: 1 }, { word: 'rat', points: 1 }, { word: 'tar', points: 1 }],
      games: { daily_on: null, created_at: '2026-10-23T12:00:00.000Z' },
    }),
    result({
      game_id: 'match',
      player_id: 'grace',
      score: 100,
      words: [{ word: 'zzzzzz', points: 3 }],
      profiles: { name: 'Grace Hopper' },
      games: { daily_on: null, created_at: '2026-10-23T12:00:00.000Z' },
    }),
    result({
      game_id: 'match',
      player_id: 'jonah',
      score: 20,
      words: [],
      profiles: [{ name: 'Jonah Park' }],
      games: [{ daily_on: null, created_at: '2026-10-23T12:00:00.000Z' }],
    }),
    result({
      game_id: 'waiting',
      player_id: 'grace',
      score: 5,
      words: [{ word: 'dog', points: 1 }],
      profiles: { name: 'Grace Hopper' },
      games: { daily_on: null, created_at: '2026-10-24T12:00:00.000Z' },
    }),
    result({
      game_id: 'declined',
      player_id: 'ada',
      score: 0,
      words: [],
      games: { daily_on: null, created_at: '2026-10-25T12:00:00.000Z' },
    }),
    result({
      game_id: 'blank',
      player_id: '',
      score: 999,
    }),
    result({
      game_id: 'nan',
      player_id: 'ada',
      score: Number.NaN,
    }),
  ]
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.queues.clear()
  supabase.rpcCalls.length = 0
  supabase.rpcQueue.length = 0
})

describe('place labels', () => {
  it('uses the usual English endings, including the teens', () => {
    expect(placeLabel(1)).toBe('1st')
    expect(placeLabel(2)).toBe('2nd')
    expect(placeLabel(3)).toBe('3rd')
    expect(placeLabel(4)).toBe('4th')
    expect(placeLabel(11)).toBe('11th')
    expect(placeLabel(12)).toBe('12th')
    expect(placeLabel(13)).toBe('13th')
    expect(placeLabel(21)).toBe('21st')
  })
})

describe('leaderboard records', () => {
  it('totals points from every finished game', () => {
    expect(rows('points')).toEqual([
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 220, figure: '220', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 2, value: 145, figure: '145', caption: '' },
      { playerId: 'jonah', name: 'Jonah Park', rank: 3, value: 20, figure: '20', caption: '' },
      { playerId: 'mina', name: 'Mina Chen', rank: 4, value: 10, figure: '10', caption: '' },
    ])
  })

  it('ranks the highest score from a single game', () => {
    expect(rows('bestScore')).toEqual([
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 100, figure: '100', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 1, value: 100, figure: '100', caption: '' },
      { playerId: 'jonah', name: 'Jonah Park', rank: 3, value: 20, figure: '20', caption: '' },
      { playerId: 'mina', name: 'Mina Chen', rank: 4, value: 10, figure: '10', caption: '' },
    ])
  })

  it('ranks the most words found in one game', () => {
    expect(rows('words').map((row) => [row.name, row.figure, row.rank])).toEqual([
      ['Ada Lovelace', '3', 1],
      ['Grace Hopper', '2', 2],
      ['Mina Chen', '1', 3],
      ['Jonah Park', '0', 4],
    ])
  })

  it('counts a kept history game toward the most words found', () => {
    const boards = buildLeaderboard(
      [
        result({
          game_id: 'live',
          player_id: 'ada',
          score: 10,
          words: [{ word: 'cat' }, { word: 'dog' }],
          profiles: { name: 'Ada Lovelace' },
        }),
        ...fillers('ada', 'Ada Lovelace', 10),
        ...fillers('grace', 'Grace Hopper', 11),
      ],
      [
        { player_id: 'ada', words_found: 104 },
        { player_id: 'grace', words_found: 3 },
        { player_id: 'ada', words_found: Number.NaN },
        { player_id: '', words_found: 500 },
        { player_id: 'stranger', words_found: 999 },
      ],
    )

    expect(boards.find((board) => board.id === 'words')?.rows.map((row) => [row.name, row.figure])).toEqual([
      ['Ada Lovelace', '104'],
      ['Grace Hopper', '3'],
    ])
    expect(boards.find((board) => board.id === 'points')?.rows.find((row) => row.playerId === 'ada')).toMatchObject({
      value: 10,
    })
    expect(boards.find((board) => board.id === 'bestScore')?.rows.find((row) => row.playerId === 'ada')).toMatchObject({
      value: 10,
    })
  })

  it('counts a kept history game toward the highest score', () => {
    const boards = buildLeaderboard(
      [
        result({
          game_id: 'live',
          player_id: 'ada',
          score: 10,
          words: [{ word: 'cat' }],
          profiles: { name: 'Ada Lovelace' },
        }),
        ...fillers('ada', 'Ada Lovelace', 10),
      ],
      [
        { player_id: 'ada', words_found: 2, score: 80 },
        { player_id: 'ada', words_found: Number.NaN, score: 90 },
        { player_id: 'ada', words_found: 1, score: 4 },
        { player_id: 'ada', words_found: 1, score: Number.NaN },
        { player_id: '', words_found: 1, score: 500 },
        { player_id: 'stranger', words_found: 1, score: 999 },
      ],
    )

    const best = boards.find((board) => board.id === 'bestScore')
    expect(best?.note).toBe('The highest score from a single game, including games kept in history.')
    expect(best?.rows.find((row) => row.playerId === 'ada')).toMatchObject({ value: 90 })
    expect(boards.find((board) => board.id === 'points')?.rows.find((row) => row.playerId === 'ada')).toMatchObject({
      value: 10,
    })
  })

  it('ranks the longest saved word and shares a rank when the lengths match', () => {
    expect(rows('longest')).toEqual([
      {
        playerId: 'ada',
        name: 'Ada Lovelace',
        rank: 1,
        value: 6,
        figure: 'QUARTZ',
        caption: '6 letters',
      },
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        rank: 1,
        value: 6,
        figure: 'ZZZZZZ',
        caption: '6 letters',
      },
      {
        playerId: 'mina',
        name: 'Mina Chen',
        rank: 3,
        value: 3,
        figure: 'RAT',
        caption: '3 letters',
      },
    ])
  })

  it('counts a win for each opponent outscored, and ignores ties and unfinished invites', () => {
    expect(rows('wins')).toEqual([
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 1, figure: '1', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 1, value: 1, figure: '1', caption: '' },
      { playerId: 'jonah', name: 'Jonah Park', rank: 3, value: 0, figure: '0', caption: '' },
    ])
  })

  it('ranks the pairs who have finished the most games together', () => {
    expect(rows('friends')).toEqual([
      {
        playerId: 'ada\0grace',
        name: 'Ada Lovelace & Grace Hopper',
        rank: 1,
        value: 1,
        figure: '1',
        caption: '1 tie',
        scores: [
          { playerId: 'ada', name: 'Ada Lovelace', wins: 0 },
          { playerId: 'grace', name: 'Grace Hopper', wins: 0 },
        ],
      },
      {
        playerId: 'ada\0jonah',
        name: 'Ada Lovelace & Jonah Park',
        rank: 1,
        value: 1,
        figure: '1',
        caption: '',
        scores: [
          { playerId: 'ada', name: 'Ada Lovelace', wins: 1 },
          { playerId: 'jonah', name: 'Jonah Park', wins: 0 },
        ],
      },
      {
        playerId: 'grace\0jonah',
        name: 'Grace Hopper & Jonah Park',
        rank: 1,
        value: 1,
        figure: '1',
        caption: '',
        scores: [
          { playerId: 'grace', name: 'Grace Hopper', wins: 1 },
          { playerId: 'jonah', name: 'Jonah Park', wins: 0 },
        ],
      },
    ])
  })

  it('averages words and points across every finished game', () => {
    expect(rows('averageWords').find((row) => row.playerId === 'ada')).toMatchObject({
      value: 0.5,
      figure: '0.5',
      caption: '11 games',
    })
    expect(rows('averagePoints').find((row) => row.playerId === 'grace')).toMatchObject({
      value: 13.2,
      figure: '13.2',
      caption: '11 games',
    })
    expect(rows('averagePoints').find((row) => row.playerId === 'jonah')).toMatchObject({
      value: 1.8,
      figure: '1.8',
      caption: '11 games',
    })
  })

  it('leaves a short career out of best friends and ranks busier pairs first', () => {
    const veteran = (id: string, name: string, count: number) =>
      Array.from({ length: count }, (_, index) =>
        result({
          game_id: `solo-${id}-${index}`,
          player_id: id,
          score: 0,
          words: [],
          profiles: { name },
        }),
      )
    const together = (
      gameId: string,
      left: string,
      leftName: string,
      leftScore: number,
      right: string,
      rightName: string,
      rightScore: number,
    ) => [
      result({ game_id: gameId, player_id: left, score: leftScore, words: [], profiles: { name: leftName } }),
      result({ game_id: gameId, player_id: right, score: rightScore, words: [], profiles: { name: rightName } }),
    ]
    const friends = buildLeaderboard(
      [
        ...veteran('ada', 'Ada Lovelace', 9),
        ...veteran('grace', 'Grace Hopper', 8),
        ...veteran('mina', 'Mina Chen', 11),
        ...veteran('jonah', 'Jonah Park', 9),
        ...together('m1', 'ada', 'Ada Lovelace', 5, 'grace', 'Grace Hopper', 1),
        ...together('m2', 'ada', 'Ada Lovelace', 1, 'grace', 'Grace Hopper', 4),
        ...together('m3', 'ada', 'Ada Lovelace', 2, 'grace', 'Grace Hopper', 2),
        ...together('m4', 'ada', 'Ada Lovelace', 3, 'mina', 'Mina Chen', 9),
        ...together('m5', 'ada', 'Ada Lovelace', 8, 'jonah', 'Jonah Park', 1),
      ],
    ).find((board) => board.id === 'friends')

    expect(friends?.rows).toEqual([
      {
        playerId: 'ada\0grace',
        name: 'Ada Lovelace & Grace Hopper',
        rank: 1,
        value: 3,
        figure: '3',
        caption: '1 tie',
        scores: [
          { playerId: 'ada', name: 'Ada Lovelace', wins: 1 },
          { playerId: 'grace', name: 'Grace Hopper', wins: 1 },
        ],
      },
      {
        playerId: 'ada\0mina',
        name: 'Ada Lovelace & Mina Chen',
        rank: 2,
        value: 1,
        figure: '1',
        caption: '',
        scores: [
          { playerId: 'ada', name: 'Ada Lovelace', wins: 0 },
          { playerId: 'mina', name: 'Mina Chen', wins: 1 },
        ],
      },
    ])
  })

  it('credits invitations that finish', () => {
    const career = (id: string, name: string, count: number) =>
      Array.from({ length: count }, (_, index) =>
        result({
          game_id: `career-${id}-${index}`,
          player_id: id,
          score: 1,
          words: [],
          profiles: { name },
          games: {
            daily_on: null,
            created_at: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(),
            host_id: id,
          },
        }),
      )
    const played = (
      gameId: string,
      playerId: string,
      name: string,
      hostId: string,
      words: readonly string[] = [],
    ) =>
      result({
        game_id: gameId,
        player_id: playerId,
        score: 1,
        words: words.map((word) => ({ word, points: 1 })),
        profiles: { name },
        games: { daily_on: null, created_at: '2026-10-21T12:00:00.000Z', host_id: hostId },
      })

    const boards = buildLeaderboard(
      [
        ...career('ada', 'Ada Lovelace', 11),
        ...career('grace', 'Grace Hopper', 11),
        ...career('mina', 'Mina Chen', 11),
        ...career('jonah', 'Jonah Park', 11),
        ...career('ned', 'Ned', 9),
        played('party', 'ada', 'Ada Lovelace', 'ada', ['cat', 'dog', 'elk', 'quartz']),
        played('party', 'grace', 'Grace Hopper', 'ada', ['cat']),
        played('party', 'jonah', 'Jonah Park', 'ada', ['dog']),
        played('guest', 'grace', 'Grace Hopper', 'ada', ['elk']),
        played('welcome', 'ada', 'Ada Lovelace', 'ada', ['cat']),
        played('welcome', 'ned', 'Ned', 'ada', ['cat', 'dog', 'elk', 'apple']),
        played('sat-down', 'grace', 'Grace Hopper', 'grace'),
        played('waiting', 'mina', 'Mina Chen', 'mina'),
        played('declined', 'jonah', 'Jonah Park', 'jonah'),
        played('solo', 'ada', 'Ada Lovelace', 'ada'),
        played('apple-grace', 'grace', 'Grace Hopper', 'grace', ['Apple']),
        played('apple-jonah', 'jonah', 'Jonah Park', 'jonah', ['apple']),
        played('mina-quartz', 'mina', 'Mina Chen', 'mina', ['Quartz']),
      ],
    )

    expect(boards.find((board) => board.id === 'outgoing')?.rows).toEqual([
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 4, figure: '4', caption: '' },
    ])
  })

  it('leaves out a player with 10 finished games', () => {
    const ten = Array.from({ length: 10 }, (_, index) =>
      result({
        game_id: `ten-${index}`,
        player_id: 'ada',
        score: 100,
        words: [{ word: 'quartz', points: 11 }],
        profiles: { name: 'Ada Lovelace' },
      }),
    )
    const eleven = Array.from({ length: 11 }, (_, index) =>
      result({
        game_id: `eleven-${index}`,
        player_id: 'grace',
        score: 1,
        words: [{ word: 'cat', points: 1 }],
        profiles: { name: 'Grace Hopper' },
      }),
    )
    const points = buildLeaderboard([...ten, ...eleven]).find((board) => board.id === 'points')
    expect(points?.rows.map((row) => row.name)).toEqual(['Grace Hopper'])
  })

  it('gives each closed daily to the unique leader, and lists a player who did not win', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 80),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-21T12:00:00.000Z', 40),
        dailyPlay('ada', 'Ada Lovelace', '2026-10-22', '2026-10-22T08:00:00.000Z', 30),
        dailyPlay('grace', 'Grace Hopper', '2026-10-22', '2026-10-22T12:00:00.000Z', 20),
        ...fillers('ada', 'Ada Lovelace', 9),
        ...fillers('grace', 'Grace Hopper', 9),
      ],
      [],
      new Date('2026-10-23T12:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => [row.name, row.figure, row.rank])).toEqual([
      ['Ada Lovelace', '2', 1],
      ['Grace Hopper', '0', 2],
    ])
  })

  it('gives a tied daily to nobody', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 40),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-21T12:00:00.000Z', 40),
        ...fillers('ada', 'Ada Lovelace', 10),
        ...fillers('grace', 'Grace Hopper', 10),
      ],
      [],
      new Date('2026-10-23T12:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => [row.name, row.figure])).toEqual([
      ['Ada Lovelace', '0'],
      ['Grace Hopper', '0'],
    ])
  })

  it('waits to award a daily until the day has closed', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 80),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-21T12:00:00.000Z', 40),
        ...fillers('ada', 'Ada Lovelace', 10),
        ...fillers('grace', 'Grace Hopper', 10),
      ],
      [],
      new Date('2026-10-21T20:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => [row.name, row.figure])).toEqual([
      ['Ada Lovelace', '0'],
      ['Grace Hopper', '0'],
    ])
  })

  it('uses the later score when a player finishes the daily again before the close', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 10),
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T18:00:00.000Z', 80),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-21T12:00:00.000Z', 50),
        ...fillers('ada', 'Ada Lovelace', 9),
        ...fillers('grace', 'Grace Hopper', 10),
      ],
      [],
      new Date('2026-10-23T12:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => [row.name, row.figure])).toEqual([
      ['Ada Lovelace', '1'],
      ['Grace Hopper', '0'],
    ])
  })

  it('leaves the earlier winner in place when a later score arrives after the close', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 80),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-22T13:00:00.000Z', 100),
        ...fillers('ada', 'Ada Lovelace', 10),
        ...fillers('grace', 'Grace Hopper', 10),
      ],
      [],
      new Date('2026-10-23T12:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => [row.name, row.figure])).toEqual([
      ['Ada Lovelace', '1'],
      ['Grace Hopper', '0'],
    ])
  })

  it('keeps a player with 10 or fewer finished games off the daily board', () => {
    const daily = buildLeaderboard(
      [
        dailyPlay('ada', 'Ada Lovelace', '2026-10-21', '2026-10-21T08:00:00.000Z', 80),
        dailyPlay('grace', 'Grace Hopper', '2026-10-21', '2026-10-21T12:00:00.000Z', 40),
        ...fillers('ada', 'Ada Lovelace', 9),
        ...fillers('grace', 'Grace Hopper', 10),
      ],
      [],
      new Date('2026-10-23T12:00:00.000Z'),
    ).find((board) => board.id === 'daily')

    expect(daily?.rows.map((row) => row.name)).toEqual(['Grace Hopper'])
  })

  it('uses a saved name when an earlier row had none', () => {
    const boards = buildLeaderboard(
      [
        result({ game_id: 'g1', player_id: 'ada', score: 1, profiles: { name: '   ' } }),
        result({ game_id: 'g2', player_id: 'ada', score: 2, profiles: { name: 'Ada Lovelace' } }),
        ...fillers('ada', 'Ada Lovelace', 9),
      ],
    )
    expect(boards.find((board) => board.id === 'points')?.rows[0].name).toBe('Ada Lovelace')
  })
})

describe('loadLeaderboard', () => {
  it('ranks the totals Postgres already added up', async () => {
    supabase.rpcQueue.push({
      data: {
        players: [
          {
            playerId: 'ada',
            name: 'Ada Lovelace',
            points: 1001,
            games: 11,
            words: 4,
            bestScore: 80,
            bestWords: 104,
            longest: 'quartz',
            wins: 1,
            comparisons: 2,
            outgoing: 0,
            dailyWins: 4,
            dailyStarts: 6,
          },
        ],
        pairs: [],
      },
      error: null,
    })

    const boards = await loadLeaderboard()

    expect(supabase.rpcCalls).toEqual(['leaderboard'])
    expect(boards.find((board) => board.id === 'words')?.rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      figure: '104',
    })
    expect(boards.find((board) => board.id === 'points')?.rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      figure: '1,001',
    })
    expect(boards.find((board) => board.id === 'longest')?.rows[0]).toMatchObject({
      figure: 'QUARTZ',
    })
    expect(boards.find((board) => board.id === 'daily')?.rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      figure: '4',
      rank: 1,
    })
  })

  it('reports a failed read', async () => {
    supabase.rpcQueue.push({ data: null, error: { message: 'Results are unavailable.' } })

    await expect(loadLeaderboard()).rejects.toThrow('Results are unavailable.')
  })
})
