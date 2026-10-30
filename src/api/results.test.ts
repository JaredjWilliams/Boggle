import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blankQuery, queryChain, shiftQueue, type QueryResult, type RecordedQuery } from '../test/queryChain'
import { loadMatchPlayers, watchMatchResults } from './results'
import { assembleMatchPlayers } from '../domain/results'

const supabase = vi.hoisted(() => {
  const calls: RecordedQuery[] = []
  const queues = new Map<string, QueryResult[]>()
  const api = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  api.on.mockReturnValue(api)
  api.subscribe.mockReturnValue(api)

  function from(table: string) {
    const query = blankQuery(table)
    calls.push(query)
    return queryChain(query, () => shiftQueue(queues, table))
  }

  return {
    calls,
    queues,
    from,
    channel: vi.fn(() => api),
    removeChannel: vi.fn(),
    channelApi: api,
  }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({
    from: supabase.from,
    channel: supabase.channel,
    removeChannel: supabase.removeChannel,
  }),
}))

function queue(table: string, result: QueryResult) {
  const list = supabase.queues.get(table) ?? []
  list.push(result)
  supabase.queues.set(table, list)
}

beforeEach(() => {
  supabase.calls.length = 0
  supabase.queues.clear()
  supabase.channel.mockClear()
  supabase.removeChannel.mockClear()
  supabase.channelApi.on.mockClear()
  supabase.channelApi.subscribe.mockClear()
})

describe('assembleMatchPlayers', () => {
  it('drops players who declined and keeps a score of zero', () => {
    expect(
      assembleMatchPlayers(
        [
          { player_id: 'ada', status: 'accepted' },
          { player_id: 'grace', status: 'invited' },
          { player_id: 'mina', status: 'declined' },
        ],
        [
          { player_id: 'ada', score: 0, words: [{ word: 'cat', points: 100 }, { word: ' ', points: 5 }] },
          { player_id: 'grace', score: 400, words: null },
        ],
        [
          { id: 'ada', name: ' Ada Lovelace ' },
          { id: 'grace', name: '   ' },
        ],
      ),
    ).toEqual([
      {
        playerId: 'ada',
        name: 'Ada Lovelace',
        score: 0,
        words: [{ word: 'cat', points: 100 }],
      },
      {
        playerId: 'grace',
        name: 'A player',
        score: 400,
        words: [],
      },
    ])
  })
})

describe('loadMatchPlayers', () => {
  it('loads seats, scores, and names for one game', async () => {
    queue('game_players', {
      data: [{ player_id: 'ada', status: 'accepted' }],
      error: null,
    })
    queue('results', {
      data: [{ player_id: 'ada', score: 100, words: [{ word: 'cat', points: 100 }] }],
      error: null,
    })
    queue('profiles', { data: [{ id: 'ada', name: 'Ada' }], error: null })

    await expect(loadMatchPlayers('game-1')).resolves.toEqual([
      {
        playerId: 'ada',
        name: 'Ada',
        score: 100,
        words: [{ word: 'cat', points: 100 }],
      },
    ])

    expect(supabase.calls.map((call) => call.table)).toEqual(['game_players', 'results', 'profiles'])
    expect(supabase.calls[0]).toMatchObject({
      select: 'player_id, status',
      filters: [{ op: 'eq', column: 'game_id', value: 'game-1' }],
    })
    expect(supabase.calls[1]).toMatchObject({
      select: 'player_id, score, words',
      filters: [{ op: 'eq', column: 'game_id', value: 'game-1' }],
    })
    expect(supabase.calls[2].filters).toEqual([{ op: 'in', column: 'id', value: ['ada'] }])
  })

  it('reports a roster that could not be loaded', async () => {
    queue('game_players', { data: null, error: { message: 'seats unavailable' } })
    queue('results', { data: [], error: null })

    await expect(loadMatchPlayers('game-1')).rejects.toThrow('seats unavailable')
  })
})

describe('watchMatchResults', () => {
  it('subscribes to results for the game and can stop', () => {
    const onChange = vi.fn()
    const stop = watchMatchResults('game-1', onChange)

    expect(supabase.channel).toHaveBeenCalledWith('results-game-1')
    expect(supabase.channelApi.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'results', filter: 'game_id=eq.game-1' },
      expect.any(Function),
    )
    const handler = supabase.channelApi.on.mock.calls[0][2] as () => void
    handler()
    expect(onChange).toHaveBeenCalledOnce()

    stop()
    expect(supabase.removeChannel).toHaveBeenCalledOnce()
  })
})
