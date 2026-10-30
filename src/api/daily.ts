import type { Board } from '../game/dice'
import { shakeBoard } from '../game/dice'
import { dailyStandings, type DailyRow, type DailyStanding } from '../domain/daily'
import { playedOn } from '../domain/dates'
import { getSupabase } from '../lib/supabase'
import { unwrap } from './rows'

const STANDING_COLUMNS =
  'player_id, score, words, profiles(name), games!inner(created_at, daily_on)'

export async function hasPlayedDaily(playerId: string, day = playedOn()): Promise<boolean> {
  const found = unwrap(
    await getSupabase()
      .from('results')
      .select('player_id, games!inner(daily_on)')
      .eq('player_id', playerId)
      .eq('games.daily_on', day)
      .limit(1),
  )
  return (found ?? []).length > 0
}

export async function loadDailyStandings(day = playedOn()): Promise<DailyStanding[]> {
  const found = unwrap(
    await getSupabase().from('results').select(STANDING_COLUMNS).eq('games.daily_on', day),
  )
  return dailyStandings((found ?? []) as unknown as DailyRow[])
}

export async function loadDailyBoard(): Promise<Board> {
  const supabase = getSupabase()
  const day = playedOn()
  const existing = await supabase.from('daily_boards').select('board').eq('played_on', day).maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data.board as Board

  const board = shakeBoard()
  const inserted = await supabase.from('daily_boards').insert({ played_on: day, board })
  if (!inserted.error) return board

  const retry = await supabase.from('daily_boards').select('board').eq('played_on', day).single()
  if (retry.error) throw new Error(retry.error.message)
  return retry.data.board as Board
}
