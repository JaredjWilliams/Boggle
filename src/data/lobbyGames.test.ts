import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLobby } from './matches'

type Filter = { op: 'eq' | 'neq' | 'in'; column: string; value: unknown }

type Query = {
  table: string
  select?: string
  filters: Filter[]
}

const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
const expired = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

const supabase = vi.hoisted(() => {
  const calls: Query[] = []
  const rpc = vi.fn(async () => ({ data: null, error: null }))

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

  return { calls, from, rpc }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from, rpc: supabase.rpc }),
}))

function answer(query: Query): { data: unknown; error: { message: string } | null } {
  if (query.table === 'profiles') {
    return {
      data: [{ id: 'grace', name: 'Grace Hopper', username: 'grace' }],
      error: null,
    }
  }
  if (query.table === 'game_players' && has(query, 'eq', 'status', 'invited')) {
    return {
      data: [
        {
          game_id: 'fresh-invite',
          games: { board: [['A']], host_id: 'grace', created_at: recent },
        },
        {
          game_id: 'old-invite',
          games: { board: [['B']], host_id: 'grace', created_at: expired },
        },
      ],
      error: null,
    }
  }
  if (query.table === 'game_players' && has(query, 'eq', 'status', 'accepted')) {
    return {
      data: [{ game_id: 'g1', games: { created_at: recent, host_id: 'ada' } }],
      error: null,
    }
  }
  if (query.table === 'match_history') {
    return {
      data: [
        { opponent_id: 'grace', score: 30, opponent_score: 10 },
        { opponent_id: null, score: 15, opponent_score: null },
      ],
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
        { game_id: 'g1', score: 80, games: { created_at: recent } },
        { game_id: 'old', score: 20, games: { created_at: older } },
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
  supabase.rpc.mockClear()
})

describe('loadLobby active games', () => {
  it('loads who you are playing and the record from saved and kept results', async () => {
    await expect(loadLobby('ada')).resolves.toMatchObject({
      lastScore: 80,
      invites: [{ gameId: 'fresh-invite', daysLeft: 3 }],
      games: [
        {
          gameId: 'g1',
          opponentId: 'grace',
          opponentName: 'Grace Hopper',
          playedBack: true,
          hosted: true,
          wins: 3,
          losses: 0,
          yourScore: 80,
          opponentScore: 50,
        },
      ],
    })
    expect(supabase.rpc).toHaveBeenCalledWith('expire_stale_games')

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
