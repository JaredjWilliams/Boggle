import type { Board } from '../game/dice'
import { shakeBoard } from '../game/dice'
import type { ScoredWord } from '../game/round'
import { getSupabase } from '../lib/supabase'
import { playedOn } from './play'

export type Friend = {
  id: string
  name: string
  username: string
}

export type Invite = {
  gameId: string
  hostName: string
  board: Board
}

export type Lobby = {
  friends: Friend[]
  invites: Invite[]
  lastScore: number | null
}

type GameSeat = {
  game_id: string
  games: { board: Board; host_id: string } | { board: Board; host_id: string }[] | null
}

function oneGame(seat: GameSeat): { board: Board; host_id: string } | null {
  if (!seat.games) return null
  return Array.isArray(seat.games) ? (seat.games[0] ?? null) : seat.games
}

export async function loadLobby(playerId: string): Promise<Lobby> {
  const supabase = getSupabase()
  const [profiles, seats, scores] = await Promise.all([
    supabase.from('profiles').select('id, name, username').neq('id', playerId),
    supabase
      .from('game_players')
      .select('game_id, games(board, host_id)')
      .eq('player_id', playerId)
      .eq('status', 'invited'),
    supabase
      .from('results')
      .select('score, games(created_at)')
      .eq('player_id', playerId),
  ])

  if (profiles.error) throw new Error(profiles.error.message)
  if (seats.error) throw new Error(seats.error.message)
  if (scores.error) throw new Error(scores.error.message)

  const seatRows = (seats.data ?? []) as GameSeat[]
  const hostIds = seatRows.flatMap((seat) => {
    const game = oneGame(seat)
    return game ? [game.host_id] : []
  })
  const hosts = hostIds.length
    ? await supabase.from('profiles').select('id, name').in('id', hostIds)
    : { data: [], error: null }
  if (hosts.error) throw new Error(hosts.error.message)
  const hostNames = new Map((hosts.data ?? []).map((host) => [host.id, host.name]))

  const invites = seatRows.flatMap((seat) => {
    const game = oneGame(seat)
    if (!game) return []
    return [
      {
        gameId: seat.game_id,
        hostName: hostNames.get(game.host_id) ?? 'A player',
        board: game.board,
      },
    ]
  })

  const ranked = (scores.data ?? [])
    .map((row) => {
      const game = Array.isArray(row.games) ? row.games[0] : row.games
      const created = game && typeof game === 'object' ? game.created_at : null
      return { score: row.score as number, created: created ? Date.parse(created) : 0 }
    })
    .sort((left, right) => right.created - left.created)

  return {
    friends: (profiles.data ?? []) as Friend[],
    invites,
    lastScore: ranked[0]?.score ?? null,
  }
}

export async function loadDailyBoard(): Promise<Board> {
  const supabase = getSupabase()
  const day = playedOn()
  const existing = await supabase
    .from('daily_boards')
    .select('board')
    .eq('played_on', day)
    .maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data.board as Board

  const board = shakeBoard()
  const inserted = await supabase.from('daily_boards').insert({ played_on: day, board })
  if (!inserted.error) return board

  const retry = await supabase
    .from('daily_boards')
    .select('board')
    .eq('played_on', day)
    .single()
  if (retry.error) throw new Error(retry.error.message)
  return retry.data.board as Board
}

export async function createMatch(input: {
  hostId: string
  board: Board
  possibleWords: ScoredWord[]
  inviteIds: readonly string[]
}): Promise<string> {
  const supabase = getSupabase()
  const created = await supabase
    .from('games')
    .insert({
      board: input.board,
      possible_words: input.possibleWords,
      host_id: input.hostId,
    })
    .select('id')
    .single()
  if (created.error) throw new Error(created.error.message)

  const gameId = created.data.id as string
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
  const seated = await supabase.from('game_players').insert(seats)
  if (seated.error) throw new Error(seated.error.message)
  return gameId
}

export async function answerInvite(
  gameId: string,
  playerId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const supabase = getSupabase()
  const update =
    status === 'accepted'
      ? { status, started_at: new Date().toISOString() }
      : { status }
  const result = await supabase
    .from('game_players')
    .update(update)
    .eq('game_id', gameId)
    .eq('player_id', playerId)
  if (result.error) throw new Error(result.error.message)
}

export async function saveResult(input: {
  gameId: string
  playerId: string
  score: number
  words: ScoredWord[]
}): Promise<void> {
  const supabase = getSupabase()
  const result = await supabase.from('results').insert({
    game_id: input.gameId,
    player_id: input.playerId,
    score: input.score,
    words: input.words,
  })
  if (result.error) throw new Error(result.error.message)
}
