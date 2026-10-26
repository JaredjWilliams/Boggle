import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminGame } from './admin'
import {
  assembleAdminGames,
  deleteLabel,
  deletePlayedGame,
  orderGames,
  loadProfileGames,
  loadProfiles,
  profileChoices,
  opponentLine,
  scoreLine,
  type ArchivedGame,
  type PlayedGameInfo,
  type PlayedScore,
  type PlayedSeat,
} from './admin'

const games: PlayedGameInfo[] = [
  { gameId: 'daily', createdAt: '2026-10-22T12:00:00.000Z', dailyOn: '2026-10-22' },
  { gameId: 'friends', createdAt: '2026-10-21T12:00:00.000Z', dailyOn: null },
  { gameId: 'solo', createdAt: '2026-10-20T12:00:00.000Z', dailyOn: null },
  { gameId: 'invite', createdAt: '2026-10-19T12:00:00.000Z', dailyOn: null },
  { gameId: 'declined', createdAt: '2026-10-18T12:00:00.000Z', dailyOn: null },
]

const seats: PlayedSeat[] = [
  { gameId: 'daily', playerId: 'ada', status: 'accepted', name: 'Ada' },
  { gameId: 'friends', playerId: 'ada', status: 'accepted', name: 'Ada' },
  { gameId: 'friends', playerId: 'grace', status: 'accepted', name: 'Grace Hopper' },
  { gameId: 'solo', playerId: 'ada', status: 'accepted', name: 'Ada' },
  { gameId: 'invite', playerId: 'ada', status: 'accepted', name: 'Ada' },
  { gameId: 'invite', playerId: 'grace', status: 'invited', name: 'Grace Hopper' },
  { gameId: 'declined', playerId: 'ada', status: 'declined', name: 'Ada' },
  { gameId: 'declined', playerId: 'grace', status: 'accepted', name: 'Grace Hopper' },
]

const scores: PlayedScore[] = [
  { gameId: 'friends', playerId: 'ada', score: 42, words: 8 },
  { gameId: 'friends', playerId: 'grace', score: 30, words: 6 },
  { gameId: 'solo', playerId: 'ada', score: 11, words: 3 },
]

const archives: ArchivedGame[] = [
  {
    id: 'saved',
    playedOn: '2026-10-17',
    score: 9,
    words: 4,
    opponentName: null,
    opponentScore: null,
  },
  {
    id: 'saved-friend',
    playedOn: '2026-10-23',
    score: 15,
    words: 5,
    opponentName: 'Grace Hopper',
    opponentScore: 12,
  },
]

describe('assembleAdminGames', () => {
  const listed = assembleAdminGames('ada', games, seats, scores, archives)

  it('labels every game by kind and keeps unfinished ones', () => {
    expect(listed.map((game) => [game.id, game.kind, game.state])).toEqual([
      ['saved-friend', 'Friends', 'Archived'],
      ['daily', 'Daily', 'In progress'],
      ['friends', 'Friends', 'Finished'],
      ['solo', 'Solo', 'Finished'],
      ['invite', 'Friends', 'In progress'],
      ['declined', 'Friends', 'Declined'],
      ['saved', 'Solo', 'Archived'],
    ])
  })

  it('shows both scores for a finished friends game', () => {
    const friends = listed.find((game) => game.id === 'friends')
    expect(friends?.score).toBe(42)
    expect(friends?.words).toBe(8)
    expect(friends?.opponents).toEqual([
      { name: 'Grace Hopper', score: 30, status: 'finished' },
    ])
    expect(scoreLine(friends!)).toBe('Score 42 · 8 words')
    expect(opponentLine(friends!.opponents[0])).toBe('Grace Hopper scored 30')
  })

  it('describes an invitation and a decline', () => {
    const invite = listed.find((game) => game.id === 'invite')
    const declined = listed.find((game) => game.id === 'declined')
    expect(opponentLine(invite!.opponents[0])).toBe("Grace Hopper hasn't played")
    expect(scoreLine(invite!)).toBe('No score saved')
    expect(opponentLine(declined!.opponents[0])).toBe('Grace Hopper is still playing')
    expect(deleteLabel(invite!)).toContain('Delete Friends game, In progress')
  })
})

type Filter = { op: 'eq' | 'in'; column: string; value: unknown }

type Query = {
  table: string
  select?: string
  filters: Filter[]
  maybe?: boolean
}

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
      in(column: string, value: unknown) {
        query.filters.push({ op: 'in', column, value })
        return chain
      },
      maybeSingle() {
        query.maybe = true
        return Promise.resolve(answer(query))
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
      data: [
        { id: 'grace', name: 'Grace Hopper', username: 'grace' },
        { id: 'ada', name: 'Ada Lovelace', username: 'ada' },
      ],
      error: null,
    }
  }
  if (query.table === 'game_players' && query.filters.some((filter) => filter.op === 'eq')) {
    return {
      data: [
        {
          game_id: 'daily',
          status: 'accepted',
          games: { created_at: '2026-10-22T12:00:00.000Z', daily_on: '2026-10-22' },
        },
      ],
      error: null,
    }
  }
  if (query.table === 'game_players') {
    return {
      data: [{ game_id: 'daily', player_id: 'ada', status: 'accepted', profiles: { name: 'Ada' } }],
      error: null,
    }
  }
  if (query.table === 'results' && query.filters.some((filter) => filter.op === 'eq')) {
    return { data: [], error: null }
  }
  if (query.table === 'results') {
    return { data: [], error: null }
  }
  if (query.table === 'match_history') {
    return {
      data: [
        {
          id: 'saved',
          played_on: '2026-10-17',
          words_found: 4,
          score: 9,
          opponent_name: null,
          opponent_score: null,
        },
      ],
      error: null,
    }
  }
  return { data: null, error: { message: `unexpected ${query.table}` } }
}

describe('orderGames', () => {
  const games: AdminGame[] = [
    {
      id: 'high',
      source: 'game',
      playedOn: '2026-10-22',
      kind: 'Solo',
      state: 'Finished',
      score: 40,
      words: 8,
      opponents: [],
    },
    {
      id: 'none',
      source: 'game',
      playedOn: '2026-10-23',
      kind: 'Daily',
      state: 'In progress',
      score: null,
      words: null,
      opponents: [],
    },
    {
      id: 'low',
      source: 'game',
      playedOn: '2026-10-20',
      kind: 'Friends',
      state: 'Finished',
      score: 3,
      words: 2,
      opponents: [],
    },
    {
      id: 'tie-new',
      source: 'archive',
      playedOn: '2026-10-21',
      kind: 'Solo',
      state: 'Archived',
      score: 3,
      words: 2,
      opponents: [],
    },
  ]

  it('keeps the current order until lowest points is selected', () => {
    expect(orderGames(games, 'newest').map((game) => game.id)).toEqual([
      'high',
      'none',
      'low',
      'tie-new',
    ])
  })

  it('lists the lowest scores first and leaves games with no score last', () => {
    expect(orderGames(games, 'lowest').map((game) => game.id)).toEqual([
      'tie-new',
      'low',
      'high',
      'none',
    ])
  })
})

describe('profile games', () => {
  beforeEach(() => {
    supabase.calls.length = 0
    supabase.rpc.mockClear()
    supabase.rpc.mockResolvedValue({ data: null, error: null })
  })

  it('lists profiles by name for the dropdown', async () => {
    expect(
      profileChoices([
        { id: 'grace', name: ' Grace Hopper ', username: 'grace' },
        { id: '', name: 'Missing', username: 'missing' },
        { id: 'ada', name: 'Ada Lovelace', username: 'ada' },
      ]),
    ).toEqual([
      { id: 'ada', name: 'Ada Lovelace', username: 'ada' },
      { id: 'grace', name: 'Grace Hopper', username: 'grace' },
    ])

    await expect(loadProfiles()).resolves.toEqual([
      { id: 'ada', name: 'Ada Lovelace', username: 'ada' },
      { id: 'grace', name: 'Grace Hopper', username: 'grace' },
    ])
    expect(supabase.calls[0]).toMatchObject({ table: 'profiles' })
  })

  it('loads live games and archived games', async () => {
    await expect(loadProfileGames('ada')).resolves.toEqual([
      expect.objectContaining({ id: 'daily', kind: 'Daily', state: 'In progress', source: 'game' }),
      expect.objectContaining({ id: 'saved', kind: 'Solo', state: 'Archived', source: 'archive' }),
    ])
  })

  it('deletes a live game and an archived game through the admin functions', async () => {
    await deletePlayedGame({ source: 'game', id: 'daily' })
    await deletePlayedGame({ source: 'archive', id: 'saved' })
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'delete_game', { target: 'daily' })
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'delete_archive', { target: 'saved' })

    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Not allowed' } })
    await expect(deletePlayedGame({ source: 'game', id: 'daily' })).rejects.toThrow('Not allowed')
  })
})
