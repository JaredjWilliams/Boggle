import { useCallback, useEffect, useState } from 'react'
import { loadLobby, type Friend, type Invite, type Lobby } from '../data/matches'
import { getSupabase } from '../lib/supabase'

const EMPTY: Lobby = { friends: [], invites: [], lastScore: null }

export function useLobby(playerId: string | undefined) {
  const [lobby, setLobby] = useState<Lobby>(EMPTY)
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    if (!playerId) return
    setLobby(await loadLobby(playerId))
  }, [playerId])

  useEffect(() => {
    if (!playerId) return
    let cancel = false

    void loadLobby(playerId)
      .then((next) => {
        if (!cancel) setLobby(next)
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setNotice(error instanceof Error ? error.message : 'Could not load games.')
        }
      })

    const channel = getSupabase()
      .channel(`invites-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          void loadLobby(playerId).then((next) => {
            if (!cancel) setLobby(next)
          })
        },
      )
      .subscribe()

    return () => {
      cancel = true
      void getSupabase().removeChannel(channel)
    }
  }, [playerId])

  return {
    friends: lobby.friends,
    invites: lobby.invites,
    savedScore: lobby.lastScore,
    notice,
    setNotice,
    refresh,
  }
}

export type { Friend, Invite }
