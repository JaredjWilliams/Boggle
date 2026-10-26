import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildLeaderboard,
  loadLeaderboard,
  placeLabel,
  type LeaderboardResult,
  type LeaderboardSeat,
} from './leaderboard'

type QueryResult = { data: unknown; error: { message: string } | null }

type Query = {
  table: string
  select?: string
  range?: { from: number; to: number }
}

const supabase = vi.hoisted(() => {
  const calls: Query[] = []
  const queues = new Map<string, QueryResult[]>()

  function from(table: string) {
    const query: Query = { table }
    calls.push(query)
    const answer = () => {
      const next = queues.get(table)?.shift()
      if (!next) throw new Error(`No response queued for ${table}`)
      return next
    }
    const chain = {
      select(columns: string) {
        query.select = columns
        return chain
      },
      range(fromIndex: number, toIndex: number) {
        query.range = { from: fromIndex, to: toIndex }
        return chain
      },
      then(onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(answer()).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { calls, queues, from }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from }),
}))

function queue(table: string, result: QueryResult) {
  const list = supabase.queues.get(table) ?? []
  list.push(result)
  supabase.queues.set(table, list)
}

function result(row: Partial<LeaderboardResult> & Pick<LeaderboardResult, 'game_id' | 'player_id'>): LeaderboardResult {
  return {
    score: 0,
    words: [],
    profiles: { name: 'Ada Lovelace' },
    games: { daily_on: null, created_at: '2026-10-21T12:00:00.000Z' },
    ...row,
  }
}

function rows(id: 'daily' | 'points' | 'words' | 'longest' | 'wins' | 'friends' | 'solo' | 'averageWords' | 'averagePoints') {
  const board = buildLeaderboard(
    [
      ...sampleResults(),
      ...fillers('ada', 'Ada Lovelace', 7),
      ...fillers('grace', 'Grace Hopper', 8),
      ...fillers('mina', 'Mina Chen', 10),
      ...fillers('jonah', 'Jonah Park', 10),
    ],
    sampleSeats(),
  ).find((item) => item.id === id)
  if (!board) throw new Error(`Missing ${id}`)
  return board.rows
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

function sampleSeats(): LeaderboardSeat[] {
  return [
    { game_id: 'daily-ada-late', player_id: 'ada', status: 'accepted' },
    { game_id: 'daily-grace', player_id: 'grace', status: 'accepted' },
    { game_id: 'daily-mina', player_id: 'mina', status: 'accepted' },
    { game_id: 'match', player_id: 'ada', status: 'accepted' },
    { game_id: 'match', player_id: 'grace', status: 'accepted' },
    { game_id: 'match', player_id: 'jonah', status: 'accepted' },
    { game_id: 'waiting', player_id: 'grace', status: 'accepted' },
    { game_id: 'waiting', player_id: 'mina', status: 'invited' },
    { game_id: 'declined', player_id: 'ada', status: 'accepted' },
    { game_id: 'declined', player_id: 'jonah', status: 'declined' },
  ]
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.queues.clear()
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
  it('gives a daily board only to the unique high score, using the latest play that day', () => {
    expect(rows('daily')).toEqual([
      { playerId: 'mina', name: 'Mina Chen', rank: 1, value: 1, figure: '1', caption: '' },
      { playerId: 'ada', name: 'Ada Lovelace', rank: 2, value: 0, figure: '0', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 2, value: 0, figure: '0', caption: '' },
    ])
  })

  it('totals points from every finished game', () => {
    expect(rows('points')).toEqual([
      { playerId: 'ada', name: 'Ada Lovelace', rank: 1, value: 220, figure: '220', caption: '' },
      { playerId: 'grace', name: 'Grace Hopper', rank: 2, value: 145, figure: '145', caption: '' },
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

  it('counts a solo play when nobody else is still in the match', () => {
    expect(rows('solo').map((row) => [row.name, row.figure, row.rank])).toEqual([
      ['Mina Chen', '11', 1],
      ['Ada Lovelace', '10', 2],
      ['Jonah Park', '10', 2],
      ['Grace Hopper', '9', 4],
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
      [],
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
    const points = buildLeaderboard([...ten, ...eleven], []).find((board) => board.id === 'points')
    expect(points?.rows.map((row) => row.name)).toEqual(['Grace Hopper'])
  })

  it('uses a saved name when an earlier row had none', () => {
    const boards = buildLeaderboard(
      [
        result({ game_id: 'g1', player_id: 'ada', score: 1, profiles: { name: '   ' } }),
        result({ game_id: 'g2', player_id: 'ada', score: 2, profiles: { name: 'Ada Lovelace' } }),
        ...fillers('ada', 'Ada Lovelace', 9),
      ],
      [],
    )
    expect(boards.find((board) => board.id === 'points')?.rows[0].name).toBe('Ada Lovelace')
  })
})

describe('loadLeaderboard', () => {
  it('reads every page of results and seats', async () => {
    const page = Array.from({ length: 1000 }, (_, index) =>
      result({
        game_id: `g${index}`,
        player_id: 'ada',
        score: 1,
        words: [],
        profiles: { name: 'Ada Lovelace' },
      }),
    )
    queue('results', { data: page, error: null })
    queue('results', {
      data: [result({ game_id: 'last', player_id: 'ada', score: 1, words: [], profiles: { name: 'Ada Lovelace' } })],
      error: null,
    })
    queue('game_players', { data: [], error: null })

    const boards = await loadLeaderboard()

    expect(supabase.calls.map((call) => [call.table, call.range])).toEqual([
      ['results', { from: 0, to: 999 }],
      ['game_players', { from: 0, to: 999 }],
      ['results', { from: 1000, to: 1999 }],
    ])
    expect(supabase.calls[0].select).toBe(
      'game_id, player_id, score, words, profiles(name), games(daily_on, created_at)',
    )
    expect(boards.find((board) => board.id === 'points')?.rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      figure: '1,001',
    })
    expect(boards.find((board) => board.id === 'solo')?.rows[0].figure).toBe('1,001')
  })

  it('reports a failed read', async () => {
    queue('results', { data: null, error: { message: 'Results are unavailable.' } })
    queue('game_players', { data: [], error: null })

    await expect(loadLeaderboard()).rejects.toThrow('Results are unavailable.')
  })
})
