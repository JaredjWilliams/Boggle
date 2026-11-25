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
  pass_along?: boolean | null
  results?: { player_id: string }[] | { player_id: string } | null
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

type NamedRow = {
  id: string
  name?: string
  username?: string
}

let expiredThisSession = false

/** Test-only: allow expire_stale_games to run again in the next loadLobby. */
export function resetExpireStaleForTests() {
  expiredThisSession = false
}

export async function loadFriends(playerId: string): Promise<Friend[]> {
  const rows = unwrap(
    await getSupabase().from('profiles').select('id, name, username').neq('id', playerId),
  )
  return (rows ?? []) as Friend[]
}

export async function loadLobby(playerId: string): Promise<Lobby> {
  const supabase = getSupabase()
  if (!expiredThisSession) {
    expiredThisSession = true
    try {
      await supabase.rpc('expire_stale_games')
    } catch {
      // Opening the lobby still lists games. Ones past the deadline stay hidden.
    }
  }
  const [seats, scores, accepted, played, history] = await Promise.all([
    supabase
      .from('game_players')
      .select('game_id, invited_at, invited_by, games(board, host_id, created_at, pass_along, results(player_id))')
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

  const scoreRows = (unwrap(scores) ?? []) as ScoreListRow[]
  const historyRows = (unwrap(history) ?? []) as KeptRow[]
  const viewerScores = scoreRows.flatMap((row) =>
    row.game_id ? [{ gameId: row.game_id, playerId, score: row.score }] : [],
  )
  const seatRows = (unwrap(seats) ?? []) as GameSeat[]
  const acceptedRows = (unwrap(accepted) ?? []) as AcceptedGameRow[]
  const playedRows = (unwrap(played) ?? []) as PlayedGameRow[]
  const activeSeats = seatsOf(acceptedRows)
  const neededIds = new Set<string>()
  for (const seat of seatRows) {
    const game = first(seat.games)
    if (game?.host_id) neededIds.add(game.host_id)
    if (seat.invited_by) neededIds.add(seat.invited_by)
  }
  for (const seat of activeSeats) {
    neededIds.add(seat.playerId)
    if (seat.hostId) neededIds.add(seat.hostId)
    if (seat.invitedBy) neededIds.add(seat.invitedBy)
  }
  for (const row of historyRows) {
    if (row.opponent_id) neededIds.add(row.opponent_id)
  }
  neededIds.delete(playerId)
  const names = neededIds.size
    ? ((unwrap(await supabase.from('profiles').select('id, name, username').in('id', [...neededIds])) ??
        []) as NamedRow[])
    : []
  const games = assembleActiveGames(
    playerId,
    activeSeats,
    [...viewerScores, ...rivalScores(playerId, acceptedRows), ...rivalScores(playerId, playedRows)],
    names,
    { kept: keptMatches(historyRows) },
  )
  const nameOf = new Map(names.map((row) => [row.id, row.name?.trim() || 'A player']))

  const invites: Invite[] = seatRows.flatMap((seat) => {
    const game = first(seat.games)
    const sentAt = seat.invited_at || game?.created_at
    if (!game || (sentAt && gameIsExpired(sentAt))) return []
    const daysLeft = sentAt ? daysLeftToPlay(sentAt) : null
    const senderId = seat.invited_by || game.host_id
    const results = listOf(game.results)
    const passAlongSolo = Boolean(game.pass_along) && results.length === 0
    return [
      {
        gameId: seat.game_id,
        hostId: game.host_id,
        hostName: nameOf.get(game.host_id) ?? 'A player',
        senderId,
        senderName: nameOf.get(senderId) ?? 'A player',
        board: game.board,
        ...(daysLeft === null ? {} : { daysLeft }),
        ...(passAlongSolo ? { passAlongSolo: true } : {}),
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
    friends: [],
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

export function watchOpponentResults(gameIds: readonly string[], onChange: () => void): () => void {
  const ids = [...new Set(gameIds)].filter(Boolean)
  if (ids.length === 0) return () => {}
  const supabase = getSupabase()
  let channel = supabase.channel(`waiting-results-${ids.slice().sort().join(',')}`)
  for (const gameId of ids) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'results',
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        onChange()
      },
    )
  }
  channel.subscribe()
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
