import type { Board } from '../game/dice'
import type { ScoredWord } from '../game/round'
import { getSupabase } from '../lib/supabase'
import { unwrap } from './rows'

export async function createMatch(input: {
  hostId: string
  board: Board
  possibleWords: ScoredWord[]
  inviteIds: readonly string[]
  dailyOn?: string
}): Promise<string> {
  const supabase = getSupabase()
  const created = unwrap(
    await supabase
      .from('games')
      .insert({
        board: input.board,
        possible_words: input.possibleWords,
        host_id: input.hostId,
        daily_on: input.dailyOn ?? null,
      })
      .select('id')
      .single(),
  )

  if (!created) throw new Error('Could not start the game.')
  const gameId = created.id as string
  const inviteIds = input.inviteIds.filter((id) => id !== input.hostId)
  const seats = [
    {
      game_id: gameId,
      player_id: input.hostId,
      status: 'accepted',
      started_at: new Date().toISOString(),
    },
    ...inviteIds.map((playerId) => ({
      game_id: gameId,
      player_id: playerId,
      status: 'invited',
      started_at: null,
    })),
  ]
  unwrap(await supabase.from('game_players').insert(seats))
  return gameId
}

export async function answerInvite(
  gameId: string,
  playerId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const update =
    status === 'accepted' ? { status, started_at: new Date().toISOString() } : { status }
  unwrap(
    await getSupabase()
      .from('game_players')
      .update(update)
      .eq('game_id', gameId)
      .eq('player_id', playerId),
  )
}

export async function saveResult(input: {
  gameId: string
  playerId: string
  score: number
  words: ScoredWord[]
}): Promise<void> {
  unwrap(
    await getSupabase().from('results').insert({
      game_id: input.gameId,
      player_id: input.playerId,
      score: input.score,
      words: input.words,
    }),
  )
}
