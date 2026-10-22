import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dailyStandings, hasPlayedDaily, loadDailyStandings, longestWord } from './daily'

type QueryResult = { data: unknown; error: { message: string } | null }

type Query = {
  table: string
  select?: string
  filters: Array<{ column: string; value: unknown }>
  limited: boolean
}

const supabase = vi.hoisted(() => {
  const calls: Query[] = []
  const queues = new Map<string, QueryResult[]>()

  function from(table: string) {
    const query: Query = { table, filters: [], limited: false }
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
      eq(column: string, value: unknown) {
        query.filters.push({ column, value })
        return chain
      },
      limit() {
        query.limited = true
        return chain
      },
      maybeSingle() {
        return Promise.resolve(answer())
      },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
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

function queryFor(table: string): Query {
  const query = supabase.calls.find((call) => call.table === table)
  if (!query) throw new Error(`No query for ${table}`)
  return query
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.queues.clear()
})

describe('daily standings', () => {
  it('keeps each player’s latest score, words, and longest word', () => {
    expect(
      dailyStandings([
        {
          player_id: 'ada',
          score: 100,
          words: [
            { word: 'cat', points: 100 },
            { word: 'quartz', points: 1400 },
          ],
          games: { created_at: '2026-10-21T12:00:00.000Z' },
          profiles: { name: ' Ada Lovelace ' },
        },
        {
          player_id: 'ada',
          score: 50,
          words: [
            { word: 'rat', points: 100 },
            { word: 'quartz', points: 1400 },
          ],
          games: { created_at: '2026-10-21T18:00:00.000Z' },
          profiles: { name: 'Ada Lovelace' },
        },
        {
          player_id: 'grace',
          score: 400,
          words: [{ word: 'cats', points: 400 }],
          games: [{ created_at: '2026-10-21T13:00:00.000Z' }],
          profiles: [{ name: 'Grace Hopper' }],
        },
        {
          player_id: 'anon',
          score: 0,
          words: null,
          games: { created_at: 'not-a-date' },
          profiles: { name: '   ' },
        },
      ]),
    ).toEqual([
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 400,
        wordCount: 1,
        longest: 'cats',
      },
      {
        playerId: 'ada',
        name: 'Ada Lovelace',
        score: 50,
        wordCount: 2,
        longest: 'quartz',
      },
      {
        playerId: 'anon',
        name: 'A player',
        score: 0,
        wordCount: 0,
        longest: '',
      },
    ])
  })

  it('picks the longest word, then the first in alphabetical order', () => {
    expect(
      longestWord([
        { word: 'star', points: 100 },
        { word: 'cats', points: 100 },
        { word: '  ', points: 0 },
        { word: 'quartz', points: 1400 },
      ]),
    ).toBe('quartz')
    expect(
      longestWord([
        { word: 'star', points: 100 },
        { word: 'cats', points: 100 },
      ]),
    ).toBe('cats')
    expect(longestWord([])).toBe('')
  })

  it('counts named words and orders equal scores by name', () => {
    expect(
      dailyStandings([
        {
          player_id: 'mina',
          score: 10,
          words: ['cat', { word: ' ', points: 1 }, { points: 5 }, { word: 'rat', points: 100 }],
          games: { created_at: '2026-10-21T12:00:00.000Z' },
          profiles: { name: 'Mina' },
        },
        {
          player_id: 'jonah',
          score: 10,
          words: [],
          games: { created_at: '2026-10-21T12:00:00.000Z' },
          profiles: { name: 'Jonah' },
        },
      ]),
    ).toEqual([
      {
        playerId: 'jonah',
        name: 'Jonah',
        score: 10,
        wordCount: 0,
        longest: '',
      },
      {
        playerId: 'mina',
        name: 'Mina',
        score: 10,
        wordCount: 1,
        longest: 'rat',
      },
    ])
  })
})

describe('daily board lookup', () => {
  it('reports a finished play when the result is stamped with that day', async () => {
    queue('results', { data: [{ player_id: 'ada' }], error: null })

    await expect(hasPlayedDaily('ada', '2026-10-21')).resolves.toBe(true)

    expect(queryFor('results')).toMatchObject({
      select: 'player_id, games!inner(daily_on)',
      filters: [
        { column: 'player_id', value: 'ada' },
        { column: 'games.daily_on', value: '2026-10-21' },
      ],
      limited: true,
    })
  })

  it('is false when the player has no result for that day', async () => {
    queue('results', { data: [], error: null })
    await expect(hasPlayedDaily('ada', '2026-10-21')).resolves.toBe(false)
    expect(supabase.calls.map((call) => call.table)).toEqual(['results'])
  })

  it('loads every finished score for that day', async () => {
    queue('results', {
      data: [
        {
          player_id: 'ada',
          score: 50,
          words: [
            { word: 'rat', points: 100 },
            { word: 'quartz', points: 1400 },
          ],
          profiles: { name: 'Ada Lovelace' },
          games: { created_at: '2026-10-21T18:00:00.000Z' },
        },
        {
          player_id: 'grace',
          score: 400,
          words: [{ word: 'cats', points: 400 }],
          profiles: { name: 'Grace Hopper' },
          games: { created_at: '2026-10-21T12:00:00.000Z' },
        },
      ],
      error: null,
    })

    await expect(loadDailyStandings('2026-10-21')).resolves.toEqual([
      {
        playerId: 'grace',
        name: 'Grace Hopper',
        score: 400,
        wordCount: 1,
        longest: 'cats',
      },
      {
        playerId: 'ada',
        name: 'Ada Lovelace',
        score: 50,
        wordCount: 2,
        longest: 'quartz',
      },
    ])
    expect(queryFor('results')).toMatchObject({
      select: 'player_id, score, words, profiles(name), games!inner(created_at, daily_on)',
      filters: [{ column: 'games.daily_on', value: '2026-10-21' }],
    })
  })

  it('returns no standings when nobody has finished that day', async () => {
    queue('results', { data: [], error: null })

    await expect(loadDailyStandings('2026-10-21')).resolves.toEqual([])
    expect(supabase.calls.map((call) => call.table)).toEqual(['results'])
  })

  it('reports the database error', async () => {
    queue('results', { data: null, error: { message: 'results unavailable' } })
    await expect(hasPlayedDaily('ada', '2026-10-21')).rejects.toThrow('results unavailable')

    queue('results', { data: null, error: { message: 'results unavailable' } })
    await expect(loadDailyStandings('2026-10-21')).rejects.toThrow('results unavailable')
  })
})
