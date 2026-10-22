import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from './matches'

type Insert = { table: string; payload: unknown }

const supabase = vi.hoisted(() => {
  const inserts: Insert[] = []
  let gameError: { message: string } | null = null

  function from(table: string) {
    return {
      insert(payload: unknown) {
        inserts.push({ table, payload })
        const result = () => ({ data: { id: 'game-1' }, error: table === 'games' ? gameError : null })
        return {
          select() {
            return { single: () => Promise.resolve(result()) }
          },
          then(
            onFulfilled: (value: { data: unknown; error: { message: string } | null }) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return Promise.resolve(result()).then(onFulfilled, onRejected)
          },
        }
      },
    }
  }

  return {
    inserts,
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
  supabase.inserts.length = 0
  supabase.failGame(null)
})

describe('createMatch', () => {
  it('stores the day on a daily game and leaves it empty for a shaken board', async () => {
    await expect(createMatch({ ...input, dailyOn: '2026-10-21' })).resolves.toBe('game-1')

    expect(supabase.inserts[0]).toEqual({
      table: 'games',
      payload: {
        board,
        possible_words: input.possibleWords,
        host_id: 'ada',
        daily_on: '2026-10-21',
      },
    })
    expect(supabase.inserts[1]).toMatchObject({
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

    supabase.inserts.length = 0
    await createMatch(input)
    expect(supabase.inserts[0]).toMatchObject({
      payload: { daily_on: null },
    })
  })

  it('reports a game that could not be saved', async () => {
    supabase.failGame('insert failed')

    await expect(createMatch({ ...input, dailyOn: '2026-10-21' })).rejects.toThrow('insert failed')
    expect(supabase.inserts.map((insert) => insert.table)).toEqual(['games'])
  })
})
