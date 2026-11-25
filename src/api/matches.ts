import type { InviteBlock, InviteRejection } from '../domain/inviteBoard'
import type { Board } from '../game/dice'
import type { ScoredWord } from '../game/round'
import { getSupabase } from '../lib/supabase'
import { unwrap } from './rows'

export type InviteBoardResult = {
  invited: string[]
  rejected: InviteRejection[]
}

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
        pass_along: false,
      })
      .select('id')
      .single(),
  )

  if (!created) throw new Error('Could not start the game.')
  const gameId = created.id as string
  const inviteIds = input.inviteIds.filter((id) => id !== input.hostId)
  const sentAt = new Date().toISOString()
  const seats = [
    {
      game_id: gameId,
      player_id: input.hostId,
      status: 'accepted',
      started_at: sentAt,
      invited_at: sentAt,
      invited_by: input.hostId,
    },
    ...inviteIds.map((playerId) => ({
      game_id: gameId,
      player_id: playerId,
      status: 'invited',
      started_at: null,
      invited_at: sentAt,
      invited_by: input.hostId,
    })),
  ]
  unwrap(await supabase.from('game_players').insert(seats))
  return gameId
}

/** Admin pass-along: host_id is the admin, but only the friend gets an invited seat. */
export async function createSoloInvite(input: {
  board: Board
  possibleWords: ScoredWord[]
  friendId: string
}): Promise<string> {
  const gameId = unwrap(
    await getSupabase().rpc('create_solo_invite', {
      p_board: input.board,
      p_possible_words: input.possibleWords,
      p_friend_id: input.friendId,
    }),
  )
  if (typeof gameId !== 'string' || !gameId) {
    throw new Error('Could not send that board.')
  }
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

export async function inviteToBoard(
  gameId: string,
  playerIds: readonly string[],
): Promise<InviteBoardResult> {
  const payload = unwrap(
    await getSupabase().rpc('invite_to_board', {
      target_game: gameId,
      player_ids: [...playerIds],
    }),
  )
  return readInviteResult(payload)
}

function readInviteResult(payload: unknown): InviteBoardResult {
  const record = payload && typeof payload === 'object' ? (payload as { invited?: unknown; rejected?: unknown }) : {}
  return {
    invited: readIds(record.invited),
    rejected: readRejected(record.rejected),
  }
}

function readIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function readRejected(value: unknown): InviteRejection[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { id?: unknown; reason?: unknown }
    if (typeof record.id !== 'string' || !record.id) return []
    return [{ id: record.id, reason: readBlock(record.reason) }]
  })
}

function readBlock(value: unknown): InviteBlock {
  if (value === 'invited' || value === 'playing') return value
  return 'played'
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
