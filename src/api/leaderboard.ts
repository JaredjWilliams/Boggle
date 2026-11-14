import { getSupabase } from '../lib/supabase'
import { unwrap } from './rows'
import { buildLeaderboard, type LeaderboardBoard, type LeaderboardResult } from '../domain/leaderboard'

const PAGE = 1000

export async function loadLeaderboard(): Promise<LeaderboardBoard[]> {
  const supabase = getSupabase()
  const results = await readPages((from, to) =>
    supabase
      .from('results')
      .select('game_id, player_id, score, words, profiles(name), games(host_id)')
      .range(from, to),
  )
  return buildLeaderboard(results as LeaderboardResult[])
}

async function readPages(
  query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const batch = unwrap(await query(from, from + PAGE - 1)) ?? []
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}
