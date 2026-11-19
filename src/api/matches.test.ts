import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blankQuery, queryChain, type QueryResult, type RecordedQuery } from '../test/queryChain'
import { createMatch, inviteToBoard } from './matches'

const supabase = vi.hoisted(() => {
  const calls: RecordedQuery[] = []
  let gameError: { message: string } | null = null

  function from(table: string) {
    const query = blankQuery(table)
    calls.push(query)
    return queryChain(query, (): QueryResult => {
      if (table === 'games') return { data: { id: 'game-1' }, error: gameError }
      return { data: null, error: null }
    })
  }

  const rpc = vi.fn(async (): Promise<{ data: unknown; error: { message: string } | null }> => ({
    data: null,
    error: null,
  }))

  return {
    calls,
    from,
    rpc,
    failGame(message: string | null) {
      gameError = message ? { message } : null
    },
  }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from, rpc: supabase.rpc }),
}))

const board = [
  ['A', 'M'],
  ['E', 'A'],
]

const input = {
  hostId: 'ada',
  board,
  possibleWords: [{ word: 'cat', points: 100 }],
  inviteIds: ['ada', 'grace'],
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.failGame(null)
  supabase.rpc.mockReset()
})

function inserts() {
  return supabase.calls
    .filter((call) => call.method === 'insert')
    .map((call) => ({ table: call.table, payload: call.payload }))
}

describe('createMatch', () => {
  it('stores the day on a daily game and leaves it empty for a shaken board', async () => {
    await expect(createMatch({ ...input, dailyOn: '2026-10-21' })).resolves.toBe('game-1')

    expect(inserts()[0]).toEqual({
      table: 'games',
      payload: {
        board,
        possible_words: input.possibleWords,
        host_id: 'ada',
        daily_on: '2026-10-21',
      },
    })
    expect(inserts()[1]).toMatchObject({
      table: 'game_players',
      payload: [
        expect.objectContaining({ game_id: 'game-1', player_id: 'ada', status: 'accepted' }),
        expect.objectContaining({
          game_id: 'game-1',
          player_id: 'grace',
          status: 'invited',
          started_at: null,
          invited_by: 'ada',
        }),
      ],
    })

    supabase.calls.length = 0
    await createMatch(input)
    expect(inserts()[0]).toMatchObject({
      payload: { daily_on: null },
    })
  })

  it('reports a game that could not be saved', async () => {
    supabase.failGame('insert failed')

    await expect(createMatch({ ...input, dailyOn: '2026-10-21' })).rejects.toThrow('insert failed')
    expect(inserts().map((insert) => insert.table)).toEqual(['games'])
  })
})

describe('inviteToBoard', () => {
  it('sends ids only and reports who could not be invited', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: {
        invited: ['mina'],
        rejected: [{ id: 'grace', reason: 'played' }],
      },
      error: null,
    })

    await expect(inviteToBoard('game-1', ['mina', 'grace'])).resolves.toEqual({
      invited: ['mina'],
      rejected: [{ id: 'grace', reason: 'played' }],
    })
    expect(supabase.rpc).toHaveBeenCalledWith('invite_to_board', {
      target_game: 'game-1',
      player_ids: ['mina', 'grace'],
    })
  })
})
