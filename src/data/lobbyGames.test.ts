import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLobby } from './matches'

type Filter = { op: 'eq' | 'neq' | 'in'; column: string; value: unknown }

type Query = {
  table: string
  select?: string
  filters: Filter[]
}

const supabase = vi.hoisted(() => {
  const calls: Query[] = []

  function from(table: string) {
    const query: Query = { table, filters: [] }
    calls.push(query)
    const chain = {
      select(columns: string) {
        query.select = columns
        return chain
      },
      eq(column: string, value: unknown) {
        query.filters.push({ op: 'eq', column, value })
        return chain
      },
      neq(column: string, value: unknown) {
        query.filters.push({ op: 'neq', column, value })
        return chain
      },
      in(column: string, value: unknown) {
        query.filters.push({ op: 'in', column, value })
        return chain
      },
      then(
        onFulfilled: (value: { data: unknown; error: { message: string } | null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(answer(query)).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { calls, from }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from }),
}))

function answer(query: Query): { data: unknown; error: { message: string } | null } {
  if (query.table === 'profiles') {
    return {
      data: [{ id: 'grace', name: 'Grace Hopper', username: 'grace' }],
      error: null,
    }
  }
  if (query.table === 'game_players' && has(query, 'eq', 'status', 'invited')) {
    return { data: [], error: null }
  }
  if (query.table === 'game_players' && has(query, 'eq', 'status', 'accepted')) {
    return {
      data: [{ game_id: 'g1', games: { created_at: '2026-10-22T18:00:00.000Z' } }],
      error: null,
    }
  }
  if (query.table === 'game_players') {
    return {
      data: [
        { game_id: 'g1', player_id: 'ada', status: 'accepted' },
        { game_id: 'g1', player_id: 'grace', status: 'accepted' },
      ],
      error: null,
    }
  }
  if (query.table === 'results' && has(query, 'neq', 'player_id')) {
    return {
      data: [
        { game_id: 'g1', player_id: 'grace', score: 50 },
        { game_id: 'old', player_id: 'grace', score: 10 },
      ],
      error: null,
    }
  }
  if (query.table === 'results') {
    return {
      data: [
        { game_id: 'g1', score: 80, games: { created_at: '2026-10-22T18:00:00.000Z' } },
        { game_id: 'old', score: 20, games: { created_at: '2026-10-21T12:00:00.000Z' } },
      ],
      error: null,
    }
  }
  return { data: null, error: { message: `unexpected ${query.table}` } }
}

function has(query: Query, op: Filter['op'], column: string, value?: unknown): boolean {
  return query.filters.some(
    (filter) => filter.op === op && filter.column === column && (value === undefined || filter.value === value),
  )
}

beforeEach(() => {
  supabase.calls.length = 0
})

describe('loadLobby active games', () => {
  it('loads who you are playing and the win-loss ratio from saved results', async () => {
    await expect(loadLobby('ada')).resolves.toMatchObject({
      lastScore: 80,
      games: [
        {
          gameId: 'g1',
          opponentId: 'grace',
          opponentName: 'Grace Hopper',
          playedBack: true,
          wins: 2,
          losses: 0,
        },
      ],
    })

    const rivalScores = supabase.calls.find(
      (call) => call.table === 'results' && has(call, 'neq', 'player_id', 'ada'),
    )
    expect(rivalScores?.filters).toEqual(
      expect.arrayContaining([
        { op: 'in', column: 'game_id', value: expect.arrayContaining(['g1', 'old']) },
        { op: 'neq', column: 'player_id', value: 'ada' },
      ]),
    )
  })
})
