import { useEffect, useRef, useState } from 'react'
import { hasPlayedDaily, loadDailyBoard } from '../api/daily'
import { answerInvite, createMatch, saveResult } from '../api/matches'
import { playedOn } from '../domain/dates'
import type { Friend, Invite } from '../domain/lobby'
import type { Board } from '../game/dice'
import { shakeBoard } from '../game/dice'
import type { Trie } from '../game/dictionary'
import type { Rival } from '../game/match'
import type { Phase, ScoredWord } from '../game/round'
import { findAllWords, scoreWord } from '../game/words'
import { errorMessage } from '../lib/errorMessage'

type Input = {
  playerId: string | undefined
  phase: Phase
  score: number
  found: readonly ScoredWord[]
  trie: Trie | null
  startRound: (board?: Board) => void
  friends: readonly Friend[]
  refresh: () => Promise<void> | void
  setNotice: (notice: string) => void
  closeOpenGame: () => void
}

export function useMatch({
  playerId,
  phase,
  score,
  found,
  trie,
  startRound,
  friends,
  refresh,
  setNotice,
  closeOpenGame,
}: Input) {
  const [matchId, setMatchId] = useState<string | null>(null)
  const [rivals, setRivals] = useState<Rival[]>([])
  const [showPotential, setShowPotential] = useState(false)
  const [starting, setStarting] = useState(false)
  const [dailyPlayed, setDailyPlayed] = useState(false)
  const startingRef = useRef(false)
  const savedMatch = useRef<string | null>(null)
  const dailyRound = useRef(false)

  useEffect(() => {
    if (!playerId) return
    let cancel = false
    void hasPlayedDaily(playerId)
      .then((played) => {
        if (!cancel && played) setDailyPlayed(true)
      })
      .catch((error: unknown) => {
        if (!cancel) setNotice(errorMessage(error, "Could not check today's board."))
      })
    return () => {
      cancel = true
    }
  }, [playerId, setNotice])

  useEffect(() => {
    if (phase !== 'ended' || !matchId || !playerId) return
    if (savedMatch.current === matchId) return
    savedMatch.current = matchId
    if (dailyRound.current) setDailyPlayed(true)
    void saveResult({
      gameId: matchId,
      playerId,
      score,
      words: [...found],
    }).catch((error: unknown) => {
      setNotice(errorMessage(error, 'Could not save the score.'))
    })
  }, [found, matchId, phase, playerId, score, setNotice])

  function clearRound() {
    setRivals([])
    setShowPotential(false)
  }

  async function begin(source: 'shake' | 'daily', inviteIds: readonly string[] = []) {
    if (startingRef.current) return
    if (source === 'daily' && dailyPlayed) return
    closeOpenGame()
    if (!playerId || !trie) {
      if (source === 'daily') return
      setRivals([])
      setShowPotential(false)
      startRound()
      return
    }
    startingRef.current = true
    setStarting(true)
    try {
      if (source === 'daily' && (await hasPlayedDaily(playerId))) {
        setDailyPlayed(true)
        return
      }
      const invited = friends
        .filter((friend) => inviteIds.includes(friend.id))
        .map((friend) => ({ id: friend.id, name: friend.name }))
      const board = source === 'daily' ? await loadDailyBoard() : shakeBoard()
      const possibleWords = findAllWords(board, trie).map((word) => ({
        word,
        points: scoreWord(word),
      }))
      const gameId = await createMatch({
        hostId: playerId,
        board,
        possibleWords,
        inviteIds,
        dailyOn: source === 'daily' ? playedOn() : undefined,
      })
      setRivals(invited)
      setShowPotential(false)
      setMatchId(gameId)
      dailyRound.current = source === 'daily'
      void refresh()
      startRound(board)
    } catch (error) {
      setNotice(errorMessage(error, 'Could not start the game.'))
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  async function accept(invite: Invite) {
    if (!playerId) return
    try {
      await answerInvite(invite.gameId, playerId, 'accepted')
      void refresh()
      setRivals([{ id: invite.hostId, name: invite.hostName }])
      setShowPotential(false)
      setMatchId(invite.gameId)
      startRound(invite.board)
    } catch (error) {
      setNotice(errorMessage(error, 'Could not join the game.'))
    }
  }

  async function decline(invite: Invite) {
    if (!playerId) return
    try {
      await answerInvite(invite.gameId, playerId, 'declined')
      await refresh()
    } catch (error) {
      setNotice(errorMessage(error, 'Could not decline the invitation.'))
    }
  }

  return {
    matchId,
    rivals,
    showPotential,
    setShowPotential,
    starting,
    dailyPlayed,
    begin,
    accept,
    decline,
    clearRound,
  }
}
