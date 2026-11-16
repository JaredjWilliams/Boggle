import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOBBY_REFRESH_MS, useLobby } from './useLobby'

const mocks = vi.hoisted(() => ({
  loadLobby: vi.fn(),
  opponentHasScored: vi.fn(async () => false),
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
  opponentHasScored: mocks.opponentHasScored,
  watchLobby: (playerId: string, onChange: () => void) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_players', filter: `player_id=eq.${playerId}` },
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
    bestScore: null,
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
  mocks.opponentHasScored.mockReset()
  mocks.opponentHasScored.mockResolvedValue(false)
  channel.on.mockClear()
  channel.subscribe.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLobby', () => {
  it('reloads a waiting game when an opponent score appears', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.opponentHasScored.mockResolvedValue(true)
    mocks.loadLobby.mockResolvedValueOnce(lobby(false)).mockResolvedValueOnce(lobby(true))
    const { result } = renderHook(() => useLobby('ada'))
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(false)
    expect(channel.on.mock.calls.map((call) => (call[1] as { table?: string }).table)).toEqual([
      'game_players',
    ])

    await act(async () => {
      vi.advanceTimersByTime(LOBBY_REFRESH_MS)
    })
    await flush()

    expect(mocks.opponentHasScored).toHaveBeenCalledWith('ada', ['g1'])
    expect(result.current.games[0]?.playedBack).toBe(true)
  })

  it('does not reload the lobby while the opponent is still playing', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mocks.loadLobby.mockResolvedValue(lobby(false))
    const { result } = renderHook(() => useLobby('ada'))
    await flush()
    const calls = mocks.loadLobby.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(LOBBY_REFRESH_MS * 2)
    })
    await flush()

    expect(result.current.games[0]?.playedBack).toBe(false)
    expect(mocks.loadLobby).toHaveBeenCalledTimes(calls)
    expect(mocks.opponentHasScored).toHaveBeenCalledWith('ada', ['g1'])
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
    expect(mocks.opponentHasScored).not.toHaveBeenCalled()
  })
})

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}
