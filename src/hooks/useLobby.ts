import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadLobby,
  opponentHasScored,
  watchLobby,
  watchOpponentResults,
} from '../api/lobby'
import type { ActiveGame, Friend, Invite, Lobby } from '../domain/lobby'
import { errorMessage } from '../lib/errorMessage'

const EMPTY: Lobby = { friends: [], invites: [], games: [], lastScore: null, bestScore: null }

export const LOBBY_SAFETY_MS = 60_000

export function useLobby(playerId: string | undefined) {
  const [lobby, setLobby] = useState<Lobby>(EMPTY)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const playerRef = useRef(playerId)
  playerRef.current = playerId

  const refresh = useCallback(async () => {
    const id = playerRef.current
    if (!id) return
    const ticket = ++request.current
    try {
      const next = await loadLobby(id)
      if (request.current !== ticket || playerRef.current !== id) return
      setLobby(next)
    } catch (error: unknown) {
      if (request.current !== ticket || playerRef.current !== id) return
      setNotice(errorMessage(error, 'Could not load games.'))
    }
  }, [])

  useEffect(() => {
    if (!playerId) return
    let cancel = false
    setLoading(true)
    void refresh().finally(() => {
      if (!cancel) setLoading(false)
    })

    const stop = watchLobby(playerId, () => {
      void refresh()
    })

    return () => {
      cancel = true
      request.current += 1
      stop()
    }
  }, [playerId, refresh])

  const waitingIds = [
    ...new Set(lobby.games.filter((game) => !game.playedBack).map((game) => game.gameId)),
  ]
  const waitingKey = waitingIds.join(',')

  useEffect(() => {
    if (!playerId || !waitingKey) return
    let cancel = false
    const ids = waitingKey.split(',')
    const stopResults = watchOpponentResults(ids, () => {
      void refresh()
    })
    const timer = window.setInterval(() => {
      if (document.hidden) return
      void opponentHasScored(playerId, ids)
        .then((scored) => {
          if (!cancel && scored) void refresh()
        })
        .catch(() => {
          // The next tick asks again.
        })
    }, LOBBY_SAFETY_MS)
    return () => {
      cancel = true
      stopResults()
      window.clearInterval(timer)
    }
  }, [playerId, waitingKey, refresh])

  return {
    friends: lobby.friends,
    invites: lobby.invites,
    games: lobby.games,
    savedScore: lobby.lastScore,
    bestScore: lobby.bestScore,
    notice,
    setNotice,
    refresh,
    loading,
  }
}

export type { ActiveGame, Friend, Invite }
