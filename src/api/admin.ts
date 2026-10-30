import {
  assembleAdminGames,
  profileChoices,
  type AdminGame,
  type AdminProfile,
  type PlayedGameInfo,
} from '../domain/admin'
import { getSupabase } from '../lib/supabase'
import { first, profileName, unwrap } from './rows'

type GameCard = {
  created_at?: string | null
  daily_on?: string | null
}

type MineSeatRow = {
  game_id: string
  status: string | null
  games: GameCard | GameCard[] | null
}

type MineScoreRow = {
  game_id: string
  score: number
  words: unknown
  games: GameCard | GameCard[] | null
}

type SeatRow = {
  game_id: string
  player_id: string
  status: string | null
  profiles: { name?: string | null } | { name?: string | null }[] | null
}

type ScoreRow = {
  game_id: string
  player_id: string
  score: number
  words: unknown
}

type HistoryRow = {
  id: string
  played_on: string
  words_found: number
  score: number
  opponent_name: string | null
  opponent_score: number | null
}

export async function loadProfiles(): Promise<AdminProfile[]> {
  return profileChoices(
    unwrap(await getSupabase().from('profiles').select('id, name, username')) ?? [],
  )
}

export async function loadProfileGames(playerId: string): Promise<AdminGame[]> {
  const supabase = getSupabase()
  const [seatResult, scoreResult, historyResult] = await Promise.all([
    supabase
      .from('game_players')
      .select('game_id, status, games(created_at, daily_on)')
      .eq('player_id', playerId),
    supabase
      .from('results')
      .select('game_id, score, words, games(created_at, daily_on)')
      .eq('player_id', playerId),
    supabase
      .from('match_history')
      .select('id, played_on, words_found, score, opponent_name, opponent_score')
      .eq('player_id', playerId),
  ])
  const mineSeats = (unwrap(seatResult) ?? []) as MineSeatRow[]
  const mineScores = (unwrap(scoreResult) ?? []) as MineScoreRow[]
  const history = (unwrap(historyResult) ?? []) as HistoryRow[]
  const gameIds = [
    ...new Set([...mineSeats.map((row) => row.game_id), ...mineScores.map((row) => row.game_id)]),
  ]

  const [allSeats, allScores] = gameIds.length
    ? await Promise.all([
        supabase
          .from('game_players')
          .select('game_id, player_id, status, profiles(name)')
          .in('game_id', gameIds),
        supabase.from('results').select('game_id, player_id, score, words').in('game_id', gameIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }]

  const info = new Map<string, PlayedGameInfo>()
  for (const row of [...mineSeats, ...mineScores]) {
    const card = first(row.games)
    const current = info.get(row.game_id)
    info.set(row.game_id, {
      gameId: row.game_id,
      createdAt: card?.created_at || current?.createdAt || '',
      dailyOn: card?.daily_on ?? current?.dailyOn ?? null,
    })
  }

  return assembleAdminGames(
    playerId,
    [...info.values()],
    ((unwrap(allSeats) ?? []) as SeatRow[]).map((row) => ({
      gameId: row.game_id,
      playerId: row.player_id,
      status: row.status ?? '',
      name: profileName(row.profiles),
    })),
    ((unwrap(allScores) ?? []) as ScoreRow[]).map((row) => ({
      gameId: row.game_id,
      playerId: row.player_id,
      score: row.score,
      words: Array.isArray(row.words) ? row.words.length : 0,
    })),
    history.map((row) => ({
      id: row.id,
      playedOn: row.played_on,
      score: row.score,
      words: row.words_found,
      opponentName: row.opponent_name,
      opponentScore: row.opponent_score,
    })),
  )
}

export async function deletePlayedGame(game: Pick<AdminGame, 'source' | 'id'>): Promise<void> {
  const name = game.source === 'archive' ? 'delete_archive' : 'delete_game'
  unwrap(await getSupabase().rpc(name, { target: game.id }))
}
