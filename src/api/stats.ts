import { historyGames, resultGames, type HistoryRow, type MineRow, type OtherRow } from '../domain/stats'
import type { GameStat } from '../stats/series'
import { getSupabase } from '../lib/supabase'
import { unwrap } from './rows'

export async function loadPlayerStats(playerId: string): Promise<GameStat[]> {
  const supabase = getSupabase()
  const [history, mine] = await Promise.all([
    supabase
      .from('match_history')
      .select('id, played_on, words_found, score, opponent_name, opponent_score, archive_group')
      .eq('player_id', playerId),
    supabase
      .from('results')
      .select('game_id, score, words, games(created_at, possible_words)')
      .eq('player_id', playerId),
  ])
  const mineRows = (unwrap(mine) ?? []) as MineRow[]
  const gameIds = mineRows.map((row) => row.game_id)
  const rivals = gameIds.length
    ? await supabase
        .from('results')
        .select('game_id, score, profiles(name)')
        .in('game_id', gameIds)
        .neq('player_id', playerId)
    : { data: [], error: null }

  return [
    ...historyGames((unwrap(history) ?? []) as HistoryRow[]),
    ...resultGames(mineRows, (unwrap(rivals) ?? []) as OtherRow[]),
  ].sort((left, right) => left.playedOn.localeCompare(right.playedOn) || left.id.localeCompare(right.id))
}
