import { playedOn } from './play'
import { getSupabase } from '../lib/supabase'
import { buildSampleHistory } from '../stats/sample'
import type { GameStat, OpponentResult } from '../stats/series'

type HistoryRow = {
  id: string
  played_on: string
  words_found: number
  score: number
  opponent_name: string
  opponent_score: number
}

type MineRow = {
  game_id: string
  score: number
  words: unknown
  games: { created_at?: string } | { created_at?: string }[] | null
}

type OtherRow = {
  game_id: string
  score: number
  profiles: { name?: string } | { name?: string }[] | null
}

export async function loadPlayerStats(playerId: string): Promise<GameStat[]> {
  const supabase = getSupabase()
  const [history, mine] = await Promise.all([
    supabase
      .from('match_history')
      .select('id, played_on, words_found, score, opponent_name, opponent_score')
      .eq('player_id', playerId),
    supabase.from('results').select('game_id, score, words, games(created_at)').eq('player_id', playerId),
  ])
  if (history.error) throw new Error(history.error.message)
  if (mine.error) throw new Error(mine.error.message)

  const mineRows = (mine.data ?? []) as MineRow[]
  const gameIds = mineRows.map((row) => row.game_id)
  const rivals = gameIds.length
    ? await supabase
        .from('results')
        .select('game_id, score, profiles(name)')
        .in('game_id', gameIds)
        .neq('player_id', playerId)
    : { data: [], error: null }
  if (rivals.error) throw new Error(rivals.error.message)

  return [
    ...historyGames((history.data ?? []) as HistoryRow[]),
    ...resultGames(mineRows, (rivals.data ?? []) as OtherRow[]),
  ].sort((left, right) => left.playedOn.localeCompare(right.playedOn) || left.id.localeCompare(right.id))
}

export async function hasSampleHistory(playerId: string): Promise<boolean> {
  const supabase = getSupabase()
  const found = await supabase
    .from('match_history')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('seeded', true)
  if (found.error) throw new Error(found.error.message)
  return (found.count ?? 0) > 0
}

export async function seedSampleHistory(playerId: string, today = new Date()): Promise<number> {
  await clearSampleHistory(playerId)
  const rows = buildSampleHistory(playerId, today)
  const inserted = await getSupabase().from('match_history').insert(rows)
  if (inserted.error) throw new Error(inserted.error.message)
  return rows.length
}

export async function clearSampleHistory(playerId: string): Promise<void> {
  const removed = await getSupabase()
    .from('match_history')
    .delete()
    .eq('player_id', playerId)
    .eq('seeded', true)
  if (removed.error) throw new Error(removed.error.message)
}

export function historyGames(rows: readonly HistoryRow[]): GameStat[] {
  return rows.flatMap((row) => {
    const name = row.opponent_name.trim()
    const opponents: OpponentResult[] = name ? [{ name, score: row.opponent_score }] : []
    return [
      {
        id: row.id,
        playedOn: row.played_on,
        words: row.words_found,
        score: row.score,
        opponents,
      },
    ]
  })
}

export function resultGames(mine: readonly MineRow[], others: readonly OtherRow[]): GameStat[] {
  const rivals = new Map<string, OpponentResult[]>()
  for (const other of others) {
    const name = profileName(other.profiles)
    if (!name) continue
    const list = rivals.get(other.game_id) ?? []
    list.push({ name, score: other.score })
    rivals.set(other.game_id, list)
  }

  return mine.flatMap((row) => {
    const created = gameCreated(row.games)
    if (!created) return []
    const parsed = Date.parse(created)
    if (Number.isNaN(parsed)) return []
    return [
      {
        id: row.game_id,
        playedOn: playedOn(new Date(parsed)),
        words: Array.isArray(row.words) ? row.words.length : 0,
        score: row.score,
        opponents: rivals.get(row.game_id) ?? [],
      },
    ]
  })
}

function profileName(profiles: OtherRow['profiles']): string {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles
  const name = profile?.name?.trim()
  return name || ''
}

function gameCreated(games: MineRow['games']): string {
  const game = Array.isArray(games) ? games[0] : games
  return game?.created_at ?? ''
}
