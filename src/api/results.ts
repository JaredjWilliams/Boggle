import {
  assembleMatchPlayers,
  unplayedWords,
  type MatchPlayerRow,
  type SavedRound,
} from '../domain/results'
import { getSupabase } from '../lib/supabase'
import { scoredWords, unwrap } from './rows'

type SeatRow = {
  player_id: string
  status: string
}

type ResultRow = {
  player_id: string
  score: number
  words: unknown
}

type NameRow = {
  id: string
  name?: string
}

export async function loadMatchPlayers(gameId: string): Promise<MatchPlayerRow[]> {
  const supabase = getSupabase()
  const [seats, results] = await Promise.all([
    supabase.from('game_players').select('player_id, status').eq('game_id', gameId),
    supabase.from('results').select('player_id, score, words').eq('game_id', gameId),
  ])
  const seatRows = (unwrap(seats) ?? []) as SeatRow[]
  const resultRows = (unwrap(results) ?? []) as ResultRow[]
  const ids = [
    ...new Set([...seatRows.map((seat) => seat.player_id), ...resultRows.map((row) => row.player_id)]),
  ]
  const profiles = ids.length
    ? await supabase.from('profiles').select('id, name').in('id', ids)
    : { data: [], error: null }
  return assembleMatchPlayers(seatRows, resultRows, (unwrap(profiles) ?? []) as NameRow[])
}

export function watchMatchResults(gameId: string, onChange: () => void): () => void {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`results-${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'results', filter: `game_id=eq.${gameId}` },
      () => {
        onChange()
      },
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function loadSavedRound(gameId: string, playerId: string): Promise<SavedRound> {
  const supabase = getSupabase()
  const [game, result] = await Promise.all([
    supabase.from('games').select('possible_words').eq('id', gameId).maybeSingle(),
    supabase
      .from('results')
      .select('score, words')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .maybeSingle(),
  ])
  if (game.error) throw new Error(game.error.message)
  if (result.error) throw new Error(result.error.message)

  const found = result.data ? scoredWords(result.data.words) : null
  return {
    score: result.data ? (result.data.score as number) : null,
    words: found,
    missed: unplayedWords(scoredWords(game.data?.possible_words), found ?? []),
  }
}
