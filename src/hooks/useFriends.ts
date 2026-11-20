import { useCallback, useEffect, useRef, useState } from 'react'
import { loadFriends } from '../api/lobby'
import type { Friend } from '../domain/lobby'
import { errorMessage } from '../lib/errorMessage'

export function useFriends(playerId: string | undefined, enabled: boolean) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const loadedFor = useRef<string | null>(null)
  const request = useRef(0)

  const refresh = useCallback(async () => {
    if (!playerId) return
    const ticket = ++request.current
    setLoading(true)
    try {
      const next = await loadFriends(playerId)
      if (request.current !== ticket) return
      loadedFor.current = playerId
      setFriends(next)
      setNotice('')
    } catch (error: unknown) {
      if (request.current !== ticket) return
      setNotice(errorMessage(error, 'Could not load friends.'))
    } finally {
      if (request.current === ticket) setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    if (!playerId || !enabled) return
    if (loadedFor.current === playerId) return
    void refresh()
  }, [playerId, enabled, refresh])

  useEffect(() => {
    if (playerId) return
    loadedFor.current = null
    setFriends([])
    setNotice('')
  }, [playerId])

  return { friends, loading, notice, refresh }
}
