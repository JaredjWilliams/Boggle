import { playedOn } from '../domain/dates'
import {
  assembleActiveGames,
  bestScoreOnDay,
  daysLeftToPlay,
  gameIsExpired,
  type Friend,
  type HeadScore,
  type Invite,
  type KeptMatch,
  type Lobby,
} from '../domain/lobby'
import type { Board } from '../game/dice'
import { getSupabase } from '../lib/supabase'
import { first, unwrap } from './rows'

type GameCard = {
  board: Board
  host_id: string
  created_at?: string
}

type GameSeat = {
  game_id: string
  invited_at?: string | null
  invited_by?: string | null
  games: GameCard | GameCard[] | null
}

type KeptRow = {
  opponent_id: string | null
  score: number
  opponent_score: number | null
  played_on?: string | null
}

type ScoreListRow = {
  game_id?: string
  score: number
  games: { created_at?: string } | { created_at?: string }[] | null
}

type SeatEmbed = {
  player_id: string
  status: string | null
  invited_at?: string | null
  invited_by?: string | null
}

type ScoreEmbed = {
  player_id: string
  score: number
}

type AcceptedGameRow = {
  id: string
  created_at?: string
  host_id?: string
  game_players: SeatEmbed[] | SeatEmbed | null
  results: ScoreEmbed[] | ScoreEmbed | null
}

type PlayedGameRow = {
  id: string
  results: ScoreEmbed[] | ScoreEmbed | null
}

export async function loadLobby(playerId: string): Promise<Lobby> {
  const supabase = getSupabase()
  try {
    await supabase.rpc('expire_stale_games')
  } catch {
    // Opening the lobby still lists games. Ones past the deadline stay hidden.
  }
  const [profiles, seats, scores, accepted, played, history] = await Promise.all([
    supabase.from('profiles').select('id, name, username').neq('id', playerId),
    supabase
      .from('game_players')
      .select('game_id, invited_at, invited_by, games(board, host_id, created_at)')
      .eq('player_id', playerId)
      .eq('status', 'invited'),
    supabase.from('results').select('game_id, score, games(created_at)').eq('player_id', playerId),
    // The inner embed filters to this player's accepted games. The plain embeds
    // still return every seat and score. A game-id list in the URL is what filled the logs.
    supabase
      .from('games')
      .select(
        'id, created_at, host_id, game_players(player_id, status, invited_at, invited_by), results(player_id, score), mine:game_players!inner(player_id)',
      )
      .eq('mine.player_id', playerId)
      .eq('mine.status', 'accepted'),
    supabase
      .from('games')
      .select('id, results(player_id, score), played:results!inner(player_id)')
      .eq('played.player_id', playerId),
    supabase
      .from('match_history')
      .select('opponent_id, score, opponent_score, played_on')
      .eq('player_id', playerId),
  ])

  const friends = (unwrap(profiles) ?? []) as Friend[]
  const scoreRows = (unwrap(scores) ?? []) as ScoreListRow[]
  const historyRows = (unwrap(history) ?? []) as KeptRow[]
  const viewerScores = scoreRows.flatMap((row) =>
    row.game_id ? [{ gameId: row.game_id, playerId, score: row.score }] : [],
  )
  const seatRows = (unwrap(seats) ?? []) as GameSeat[]
  const hostIds = seatRows.flatMap((seat) => {
    const game = first(seat.games)
    const ids = game ? [game.host_id] : []
    return seat.invited_by ? [...ids, seat.invited_by] : ids
  })
  const hosts = hostIds.length
    ? await supabase.from('profiles').select('id, name').in('id', [...new Set(hostIds)])
    : { data: [], error: null }
  const acceptedRows = (unwrap(accepted) ?? []) as AcceptedGameRow[]
  const playedRows = (unwrap(played) ?? []) as PlayedGameRow[]
  const games = assembleActiveGames(
    playerId,
    seatsOf(acceptedRows),
    [...viewerScores, ...rivalScores(playerId, acceptedRows), ...rivalScores(playerId, playedRows)],
    friends,
    { kept: keptMatches(historyRows) },
  )
  const hostNames = new Map((unwrap(hosts) ?? []).map((host) => [host.id as string, host.name as string]))

  const invites: Invite[] = seatRows.flatMap((seat) => {
    const game = first(seat.games)
    const sentAt = seat.invited_at || game?.created_at
    if (!game || (sentAt && gameIsExpired(sentAt))) return []
    const daysLeft = sentAt ? daysLeftToPlay(sentAt) : null
    const senderId = seat.invited_by || game.host_id
    return [
      {
        gameId: seat.game_id,
        hostId: game.host_id,
        hostName: hostNames.get(game.host_id) ?? 'A player',
        senderId,
        senderName: hostNames.get(senderId) ?? 'A player',
        board: game.board,
        ...(daysLeft === null ? {} : { daysLeft }),
      },
    ]
  })

  const ranked = scoreRows
    .map((row) => {
      const created = first(row.games)?.created_at
      return { score: row.score, created: created ? Date.parse(created) : 0 }
    })
    .sort((left, right) => right.created - left.created)

  return {
    friends,
    invites,
    games,
    lastScore: ranked[0]?.score ?? null,
    bestScore: bestScoreOnDay(datedScores(scoreRows, historyRows), playedOn()),
  }
}

function datedScores(
  scoreRows: readonly ScoreListRow[],
  historyRows: readonly KeptRow[],
): { score: number; playedOn: string }[] {
  const fromResults = scoreRows.flatMap((row) => {
    const created = first(row.games)?.created_at
    if (!created) return []
    const parsed = Date.parse(created)
    if (Number.isNaN(parsed)) return []
    return [{ score: row.score, playedOn: playedOn(new Date(parsed)) }]
  })
  const fromHistory = historyRows.flatMap((row) => {
    const day = row.played_on?.trim()
    if (!day) return []
    return [{ score: row.score, playedOn: day }]
  })
  return [...fromResults, ...fromHistory]
}

export function watchLobby(playerId: string, onChange: () => void): () => void {
  const supabase = getSupabase()
  const channel = supabase
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
        onChange()
      },
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

function keptMatches(rows: readonly KeptRow[]): KeptMatch[] {
  return rows.flatMap((row) =>
    row.opponent_id && row.opponent_score !== null
      ? [{ opponentId: row.opponent_id, score: row.score, opponentScore: row.opponent_score }]
      : [],
  )
}

/** True when one of these still-open games has an opponent score. The id list stays small. */
export async function opponentHasScored(playerId: string, gameIds: readonly string[]): Promise<boolean> {
  const ids = [...new Set(gameIds)]
  if (ids.length === 0) return false
  const { data, error } = await getSupabase()
    .from('results')
    .select('game_id')
    .in('game_id', ids)
    .neq('player_id', playerId)
    .limit(1)
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

function seatsOf(games: readonly AcceptedGameRow[]) {
  return games.flatMap((game) =>
    listOf(game.game_players).map((seat) => ({
      gameId: game.id,
      playerId: seat.player_id,
      status: seat.status ?? '',
      createdAt: seat.invited_at || game.created_at || '',
      hostId: game.host_id ?? '',
      ...(seat.invited_by ? { invitedBy: seat.invited_by } : {}),
    })),
  )
}

function rivalScores(
  playerId: string,
  games: readonly { id: string; results: ScoreEmbed[] | ScoreEmbed | null }[],
): HeadScore[] {
  return games.flatMap((game) =>
    listOf(game.results)
      .filter((score) => score.player_id !== playerId)
      .map((score) => ({ gameId: game.id, playerId: score.player_id, score: score.score })),
  )
}

function listOf<T>(value: T[] | T | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}
