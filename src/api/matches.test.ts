import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blankQuery, queryChain, type QueryResult, type RecordedQuery } from '../test/queryChain'
import { createMatch } from './matches'

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

  return {
    calls,
    from,
    failGame(message: string | null) {
      gameError = message ? { message } : null
    },
  }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from }),
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
