import { beforeEach, describe, expect, it, vi } from 'vitest'
import { playedOn } from '../domain/dates'
import { blankQuery, queryChain, type RecordedQuery } from '../test/queryChain'
import { loadFriends, loadLobby, opponentHasScored, resetExpireStaleForTests } from './lobby'

type Filter = { op: 'eq' | 'neq' | 'in'; column: string; value: unknown }

const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
const expired = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

function localNoon(dayOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}

const supabase = vi.hoisted(() => {
  const calls: RecordedQuery[] = []
  const rpc = vi.fn(async () => ({ data: null, error: null }))

  function from(table: string) {
    const query = blankQuery(table)
    calls.push(query)
    return queryChain(query, () => answer(query))
  }

  return { calls, from, rpc }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from, rpc: supabase.rpc }),
}))

function answer(query: RecordedQuery): { data: unknown; error: { message: string } | null } {
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
          games: { board: [['A']], host_id: 'grace', created_at: recent, pass_along: false },
        },
        {
          game_id: 'old-invite',
          games: { board: [['B']], host_id: 'grace', created_at: expired },
        },
        {
          game_id: 'resent',
          invited_at: recent,
          invited_by: 'mina',
          games: { board: [['C']], host_id: 'grace', created_at: expired },
        },
        {
          game_id: 'solo-pass',
          invited_at: recent,
          invited_by: 'admin',
          games: {
            board: [['D']],
            host_id: 'admin',
            created_at: recent,
            pass_along: true,
            results: [],
          },
        },
        {
          game_id: 'solo-forward',
          invited_at: recent,
          invited_by: 'grace',
          games: {
            board: [['E']],
            host_id: 'admin',
            created_at: recent,
            pass_along: true,
            results: [{ player_id: 'grace' }],
          },
        },
      ],
      error: null,
    }
  }
  if (query.table === 'games' && query.select?.includes('game_players')) {
    return {
      data: [
        {
          id: 'g1',
          created_at: recent,
          host_id: 'ada',
          game_players: [
            { player_id: 'ada', status: 'accepted' },
            { player_id: 'grace', status: 'accepted' },
          ],
          results: [
            { player_id: 'ada', score: 80 },
            { player_id: 'grace', score: 50 },
          ],
        },
      ],
      error: null,
    }
  }
  if (query.table === 'games') {
    return {
      data: [
        {
          id: 'g1',
          results: [
            { player_id: 'ada', score: 80 },
            { player_id: 'grace', score: 50 },
          ],
        },
        {
          id: 'old',
          results: [
            { player_id: 'ada', score: 20 },
            { player_id: 'grace', score: 10 },
          ],
        },
      ],
      error: null,
    }
  }
  if (query.table === 'match_history') {
    return {
      data: [
        { opponent_id: 'grace', score: 120, opponent_score: 10, played_on: playedOn() },
        { opponent_id: null, score: 15, opponent_score: null, played_on: '2020-01-01' },
        { opponent_id: 'mina', score: 400, opponent_score: 10 },
      ],
      error: null,
    }
  }
  if (query.table === 'results' && query.limited) {
    return { data: [{ game_id: 'g1' }], error: null }
  }
  if (query.table === 'results') {
    return {
      data: [
        { game_id: 'g1', score: 80, games: { created_at: recent } },
        { game_id: 'old', score: 20, games: { created_at: older } },
        { game_id: 'today', score: 45, games: { created_at: localNoon(0) } },
        { game_id: 'yesterday', score: 900, games: { created_at: localNoon(-1) } },
        { game_id: 'blank', score: 70, games: { created_at: 'not-a-date' } },
        { game_id: 'missing', score: 60, games: null },
      ],
      error: null,
    }
  }
  return { data: null, error: { message: `unexpected ${query.table}` } }
}

function has(query: RecordedQuery, op: Filter['op'], column: string, value?: unknown): boolean {
  return query.filters.some(
    (filter) => filter.op === op && filter.column === column && (value === undefined || filter.value === value),
  )
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.rpc.mockClear()
  resetExpireStaleForTests()
})

describe('loadLobby active games', () => {
  it('loads who you are playing and the record from saved and kept results', async () => {
    await expect(loadLobby('ada')).resolves.toMatchObject({
      friends: [],
      lastScore: 45,
      bestScore: 120,
      invites: [
        { gameId: 'fresh-invite', daysLeft: 3, senderName: 'Grace Hopper' },
        { gameId: 'resent', daysLeft: 3, senderId: 'mina', senderName: 'A player' },
        {
          gameId: 'solo-pass',
          daysLeft: 3,
          senderId: 'admin',
          senderName: 'A player',
          passAlongSolo: true,
        },
        {
          gameId: 'solo-forward',
          daysLeft: 3,
          senderId: 'grace',
          senderName: 'Grace Hopper',
        },
      ],
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
    expect(supabase.calls.find((call) => call.table === 'match_history')?.select).toBe(
      'opponent_id, score, opponent_score, played_on',
    )

    const accepted = supabase.calls.find((call) => call.table === 'games' && call.select?.includes('game_players'))
    expect(accepted?.filters).toEqual([
      { op: 'eq', column: 'mine.player_id', value: 'ada' },
      { op: 'eq', column: 'mine.status', value: 'accepted' },
    ])
    const played = supabase.calls.find((call) => call.table === 'games' && call.select?.includes('played:'))
    expect(played?.filters).toEqual([{ op: 'eq', column: 'played.player_id', value: 'ada' }])
    expect(supabase.calls.some((call) => call.filters.some((filter) => filter.op === 'in' && filter.column === 'game_id'))).toBe(
      false,
    )
    const profiles = supabase.calls.find((call) => call.table === 'profiles')
    expect(profiles?.filters.some((filter) => filter.op === 'in' && filter.column === 'id')).toBe(true)
    expect(profiles?.filters.some((filter) => filter.op === 'neq' && filter.column === 'id')).toBe(false)
  })

  it('expires stale games only once per session', async () => {
    await loadLobby('ada')
    supabase.rpc.mockClear()
    await loadLobby('ada')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

describe('loadFriends', () => {
  it('loads the full directory except the viewer', async () => {
    await expect(loadFriends('ada')).resolves.toEqual([
      { id: 'grace', name: 'Grace Hopper', username: 'grace' },
    ])
    const profiles = supabase.calls.find((call) => call.table === 'profiles')
    expect(profiles?.select).toBe('id, name, username')
    expect(profiles?.filters).toEqual([{ op: 'neq', column: 'id', value: 'ada' }])
  })
})

describe('opponentHasScored', () => {
  it('asks only about the games still waiting', async () => {
    await expect(opponentHasScored('ada', ['g1', 'g1'])).resolves.toBe(true)
    const query = supabase.calls.find((call) => call.table === 'results' && call.limited)
    expect(query?.select).toBe('game_id')
    expect(query?.filters).toEqual([
      { op: 'in', column: 'game_id', value: ['g1'] },
      { op: 'neq', column: 'player_id', value: 'ada' },
    ])
  })

  it('skips the request when nothing is waiting', async () => {
    await expect(opponentHasScored('ada', [])).resolves.toBe(false)
    expect(supabase.calls).toHaveLength(0)
  })
})
