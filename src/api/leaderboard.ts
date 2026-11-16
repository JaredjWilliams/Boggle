import { getSupabase } from '../lib/supabase'
import {
  rankLeaderboard,
  type LeaderboardBoard,
  type LeaderboardPair,
  type LeaderboardPlayer,
} from '../domain/leaderboard'
import { unwrap } from './rows'

type LeaderboardPayload = {
  players?: LeaderboardPlayer[]
  pairs?: LeaderboardPair[]
}

export async function loadLeaderboard(): Promise<LeaderboardBoard[]> {
  const payload = unwrap(await getSupabase().rpc('leaderboard')) as LeaderboardPayload | null
  return rankLeaderboard(payload?.players ?? [], payload?.pairs ?? [])
}
