import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOBBY_REFRESH_MS, useLobby } from './useLobby'

const mocks = vi.hoisted(() => ({
  loadLobby: vi.fn(),
}))

const channel = vi.hoisted(() => {
  const api = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  api.on.mockImplementation(() => api)
  api.subscribe.mockImplementation(() => api)
  return api
})

vi.mock('../api/lobby', () => ({
  loadLobby: mocks.loadLobby,
  watchLobby: (playerId: string, onChange: () => void) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_players', filter: `player_id=eq.${playerId}` },
      onChange,
    )
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'results' },
      onChange,
    )
    channel.subscribe()
    return () => {}
  },
}))

function lobby(playedBack: boolean) {
  return {
    friends: [],
    invites: [],
    lastScore: null,
    games: [
      {
        gameId: 'g1',
        opponentId: 'grace',
        opponentName: 'Grace Hopper',
        playedBack,
        wins: 2,
        losses: 1,
      },
    ],
  }
}

beforeEach(() => {
  mocks.loadLobby.mockReset()
  channel.on.mockClear()
  channel.subscribe.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLobby', () => {
  it('updates a waiting game when the other player has played back', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.loadLobby.mockResolvedValue(lobby(false))
    const { result } = renderHook(() => useLobby('ada'))
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(false)
    mocks.loadLobby.mockResolvedValue(lobby(true))

    await act(async () => {
      vi.advanceTimersByTime(LOBBY_REFRESH_MS)
    })
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(true)
  })

  it('reloads when a result is saved', async () => {
    mocks.loadLobby.mockResolvedValueOnce(lobby(false)).mockResolvedValueOnce(lobby(true))
    const { result } = renderHook(() => useLobby('ada'))
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(false)
    const results = channel.on.mock.calls.find((call) => {
      const filter = call[1] as { table?: string }
      return filter.table === 'results'
    })
    const onInsert = results?.[2] as () => void
    onInsert()
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(true)
  })

  it('does not poll once every opponent has played back', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.loadLobby.mockResolvedValue(lobby(true))
    const { result } = renderHook(() => useLobby('ada'))
    await flush()

    expect(result.current.games).toHaveLength(1)
    const calls = mocks.loadLobby.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(LOBBY_REFRESH_MS * 2)
    })

    expect(mocks.loadLobby).toHaveBeenCalledTimes(calls)
  })
})

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}
