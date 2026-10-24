import { longestWord } from '../game/match'
import type { ScoredWord } from '../game/round'
import { getSupabase } from '../lib/supabase'
import { playedOn } from './play'

export { longestWord }

export type DailyStanding = {
  playerId: string
  name: string
  score: number
  wordCount: number
  longest: string
}

type DailyRow = {
  player_id: string
  score: number
  words: unknown
  profiles: { name?: string } | { name?: string }[] | null
  games: { created_at?: string } | { created_at?: string }[] | null
}

const STANDING_COLUMNS =
  'player_id, score, words, profiles(name), games!inner(created_at, daily_on)'

export async function hasPlayedDaily(playerId: string, day = playedOn()): Promise<boolean> {
  const found = await getSupabase()
    .from('results')
    .select('player_id, games!inner(daily_on)')
    .eq('player_id', playerId)
    .eq('games.daily_on', day)
    .limit(1)
  if (found.error) throw new Error(found.error.message)
  return (found.data ?? []).length > 0
}

export async function loadDailyStandings(day = playedOn()): Promise<DailyStanding[]> {
  const found = await getSupabase()
    .from('results')
    .select(STANDING_COLUMNS)
    .eq('games.daily_on', day)
  if (found.error) throw new Error(found.error.message)
  return dailyStandings((found.data ?? []) as unknown as DailyRow[])
}

export function dailyStandings(rows: readonly DailyRow[]): DailyStanding[] {
  const latest = new Map<string, { row: DailyRow; at: number }>()
  for (const row of rows) {
    const at = Date.parse(createdAt(row.games))
    const playedAt = Number.isNaN(at) ? 0 : at
    const current = latest.get(row.player_id)
    if (!current || playedAt >= current.at) latest.set(row.player_id, { row, at: playedAt })
  }

  return [...latest.values()]
    .map(({ row }) => {
      const words = scoredWords(row.words)
      return {
        playerId: row.player_id,
        name: profileName(row.profiles),
        score: row.score,
        wordCount: words.length,
        longest: longestWord(words),
      }
    })
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
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

function profileName(profiles: DailyRow['profiles']): string {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles
  const name = profile?.name?.trim()
  return name || 'A player'
}

function createdAt(games: DailyRow['games']): string {
  const game = Array.isArray(games) ? games[0] : games
  return game?.created_at ?? ''
}
