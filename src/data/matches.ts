import type { Board } from '../game/dice'
import { shakeBoard } from '../game/dice'
import type { ScoredWord } from '../game/round'
import { compareWords } from '../game/words'
import { getSupabase } from '../lib/supabase'
import {
  assembleActiveGames,
  daysLeftToPlay,
  gameIsExpired,
  type ActiveGame,
  type HeadScore,
  type KeptMatch,
} from './activeGames'
import { playedOn } from './play'

export type Friend = {
  id: string
  name: string
  username: string
}

export type Invite = {
  gameId: string
  hostId: string
  hostName: string
  board: Board
  /** Whole days left before this invitation is deleted. */
  daysLeft?: number
}

export type Lobby = {
  friends: Friend[]
  invites: Invite[]
  games: ActiveGame[]
  lastScore: number | null
}

export type SavedRound = {
  score: number | null
  words: ScoredWord[] | null
  missed: ScoredWord[]
}

type GameSeat = {
  game_id: string
  games: GameCard | GameCard[] | null
}

type GameCard = {
  board: Board
  host_id: string
  created_at?: string
}

function oneGame(seat: GameSeat): GameCard | null {
  if (!seat.games) return null
  return Array.isArray(seat.games) ? (seat.games[0] ?? null) : seat.games
}

type KeptRow = {
  opponent_id: string | null
  score: number
  opponent_score: number | null
}

type ScoreListRow = {
  game_id?: string
  score: number
  games: { created_at?: string } | { created_at?: string }[] | null
}

type AcceptedRow = {
  game_id: string
  games: { created_at?: string; host_id?: string } | { created_at?: string; host_id?: string }[] | null
}

type RivalScoreRow = {
  game_id: string
  player_id: string
  score: number
}

type OpponentSeatRow = {
  game_id: string
  player_id: string
  status: string | null
}

export async function loadLobby(playerId: string): Promise<Lobby> {
  const supabase = getSupabase()
  try {
    await supabase.rpc('expire_stale_games')
  } catch {
    // Opening the lobby still lists games. Ones past the deadline stay hidden.
  }
  const [profiles, seats, scores, accepted, history] = await Promise.all([
    supabase.from('profiles').select('id, name, username').neq('id', playerId),
    supabase
      .from('game_players')
      .select('game_id, games(board, host_id, created_at)')
      .eq('player_id', playerId)
      .eq('status', 'invited'),
    supabase
      .from('results')
      .select('game_id, score, games(created_at)')
      .eq('player_id', playerId),
    supabase
      .from('game_players')
      .select('game_id, games(created_at, host_id)')
      .eq('player_id', playerId)
      .eq('status', 'accepted'),
    supabase
      .from('match_history')
      .select('opponent_id, score, opponent_score')
      .eq('player_id', playerId),
  ])

  if (profiles.error) throw new Error(profiles.error.message)
  if (seats.error) throw new Error(seats.error.message)
  if (scores.error) throw new Error(scores.error.message)
  if (accepted.error) throw new Error(accepted.error.message)
  if (history.error) throw new Error(history.error.message)

  const friends = (profiles.data ?? []) as Friend[]
  const scoreRows = (scores.data ?? []) as ScoreListRow[]
  const viewerScores = scoreRows.flatMap((row) =>
    row.game_id ? [{ gameId: row.game_id, playerId, score: row.score }] : [],
  )

  const seatRows = (seats.data ?? []) as GameSeat[]
  const hostIds = seatRows.flatMap((seat) => {
    const game = oneGame(seat)
    return game ? [game.host_id] : []
  })
  const [hosts, games] = await Promise.all([
    hostIds.length
      ? supabase.from('profiles').select('id, name').in('id', hostIds)
      : Promise.resolve({ data: [], error: null }),
    loadActiveGames(
      playerId,
      (accepted.data ?? []) as AcceptedRow[],
      viewerScores,
      friends,
      keptMatches((history.data ?? []) as KeptRow[]),
    ),
  ])
  if (hosts.error) throw new Error(hosts.error.message)
  const hostNames = new Map((hosts.data ?? []).map((host) => [host.id, host.name]))

  const invites = seatRows.flatMap((seat) => {
    const game = oneGame(seat)
    if (!game || (game.created_at && gameIsExpired(game.created_at))) return []
    const daysLeft = game.created_at ? daysLeftToPlay(game.created_at) : null
    return [
      {
        gameId: seat.game_id,
        hostId: game.host_id,
        hostName: hostNames.get(game.host_id) ?? 'A player',
        board: game.board,
        ...(daysLeft === null ? {} : { daysLeft }),
      },
    ]
  })

  const ranked = scoreRows
    .map((row) => {
      const game = Array.isArray(row.games) ? row.games[0] : row.games
      const created = game && typeof game === 'object' ? game.created_at : null
      return { score: row.score, created: created ? Date.parse(created) : 0 }
    })
    .sort((left, right) => right.created - left.created)

  return {
    friends,
    invites,
    games,
    lastScore: ranked[0]?.score ?? null,
  }
}

function keptMatches(rows: readonly KeptRow[]): KeptMatch[] {
  return rows.flatMap((row) =>
    row.opponent_id && row.opponent_score !== null
      ? [{ opponentId: row.opponent_id, score: row.score, opponentScore: row.opponent_score }]
      : [],
  )
}

async function loadActiveGames(
  playerId: string,
  accepted: readonly AcceptedRow[],
  viewerScores: readonly HeadScore[],
  names: readonly { id: string; name?: string | null }[],
  kept: readonly KeptMatch[],
): Promise<ActiveGame[]> {
  if (accepted.length === 0) return []
  const supabase = getSupabase()
  const activeIds = accepted.map((row) => row.game_id)
  const scoreIds = [...new Set([...activeIds, ...viewerScores.map((row) => row.gameId)])]
  const [seats, rivals] = await Promise.all([
    supabase.from('game_players').select('game_id, player_id, status').in('game_id', activeIds),
    supabase
      .from('results')
      .select('game_id, player_id, score')
      .in('game_id', scoreIds)
      .neq('player_id', playerId),
  ])
  if (seats.error) throw new Error(seats.error.message)
  if (rivals.error) throw new Error(rivals.error.message)

  const gamesById = new Map(accepted.map((row) => [row.game_id, joinedGame(row.games)]))
  const seatRows = ((seats.data ?? []) as OpponentSeatRow[]).map((seat) => ({
    gameId: seat.game_id,
    playerId: seat.player_id,
    status: seat.status ?? '',
    createdAt: gamesById.get(seat.game_id)?.createdAt ?? '',
    hostId: gamesById.get(seat.game_id)?.hostId ?? '',
  }))
  const scores = [
    ...viewerScores,
    ...((rivals.data ?? []) as RivalScoreRow[]).map((row) => ({
      gameId: row.game_id,
      playerId: row.player_id,
      score: row.score,
    })),
  ]
  return assembleActiveGames(playerId, seatRows, scores, names, { kept })
}

function joinedGame(
  games: { created_at?: string; host_id?: string } | { created_at?: string; host_id?: string }[] | null,
): { createdAt: string; hostId: string } {
  const game = Array.isArray(games) ? games[0] : games
  return { createdAt: game?.created_at ?? '', hostId: game?.host_id ?? '' }
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
  dailyOn?: string
}): Promise<string> {
  const supabase = getSupabase()
  const created = await supabase
    .from('games')
    .insert({
      board: input.board,
      possible_words: input.possibleWords,
      host_id: input.hostId,
      daily_on: input.dailyOn ?? null,
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

export type MatchPlayerRow = {
  playerId: string
  name: string
  score: number | null
  words: ScoredWord[] | null
}

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

export function assembleMatchPlayers(
  seats: readonly SeatRow[],
  results: readonly ResultRow[],
  profiles: readonly NameRow[],
): MatchPlayerRow[] {
  const names = new Map(profiles.map((profile) => [profile.id, profile.name?.trim() || 'A player']))
  const rows = new Map<string, MatchPlayerRow>()

  for (const seat of seats) {
    if (seat.status === 'declined') continue
    rows.set(seat.player_id, {
      playerId: seat.player_id,
      name: names.get(seat.player_id) || 'A player',
      score: null,
      words: null,
    })
  }

  for (const result of results) {
    rows.set(result.player_id, {
      playerId: result.player_id,
      name: names.get(result.player_id) || rows.get(result.player_id)?.name || 'A player',
      score: result.score,
      words: scoredWords(result.words),
    })
  }

  return [...rows.values()]
}

export async function loadMatchPlayers(gameId: string): Promise<MatchPlayerRow[]> {
  const supabase = getSupabase()
  const [seats, results] = await Promise.all([
    supabase.from('game_players').select('player_id, status').eq('game_id', gameId),
    supabase.from('results').select('player_id, score, words').eq('game_id', gameId),
  ])
  if (seats.error) throw new Error(seats.error.message)
  if (results.error) throw new Error(results.error.message)

  const seatRows = (seats.data ?? []) as SeatRow[]
  const resultRows = (results.data ?? []) as ResultRow[]
  const ids = [...new Set([...seatRows.map((seat) => seat.player_id), ...resultRows.map((row) => row.player_id)])]
  const profiles = ids.length
    ? await supabase.from('profiles').select('id, name').in('id', ids)
    : { data: [], error: null }
  if (profiles.error) throw new Error(profiles.error.message)
  return assembleMatchPlayers(seatRows, resultRows, (profiles.data ?? []) as NameRow[])
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

export function unplayedWords(
  possible: readonly ScoredWord[],
  found: readonly ScoredWord[],
): ScoredWord[] {
  const have = new Set(found.map((item) => item.word))
  return possible
    .filter((item) => item.word.trim() && !have.has(item.word))
    .sort((left, right) => compareWords(left.word, right.word))
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

function scoredWords(value: unknown): ScoredWord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { word?: unknown; points?: unknown }
    if (typeof record.word !== 'string' || !record.word.trim()) return []
    const points = typeof record.points === 'number' ? record.points : 0
    return [{ word: record.word, points }]
  })
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
