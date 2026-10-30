import { useCallback, useEffect, useRef, useState } from 'react'
import { loadLobby, watchLobby } from '../api/lobby'
import type { ActiveGame, Friend, Invite, Lobby } from '../domain/lobby'
import { errorMessage } from '../lib/errorMessage'

const EMPTY: Lobby = { friends: [], invites: [], games: [], lastScore: null }

export const LOBBY_REFRESH_MS = 3000

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

  const waiting = lobby.games.some((game) => !game.playedBack)

  useEffect(() => {
    if (!playerId || !waiting) return
    // A missed results event still needs to flip the card to "played back".
    const timer = window.setInterval(() => {
      void refresh()
    }, LOBBY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [playerId, waiting, refresh])

  return {
    friends: lobby.friends,
    invites: lobby.invites,
    games: lobby.games,
    savedScore: lobby.lastScore,
    notice,
    setNotice,
    refresh,
    loading,
  }
}

export type { ActiveGame, Friend, Invite }
