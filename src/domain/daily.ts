import { first, profileName, scoredWords } from '../api/rows'
import { longestWord } from '../game/match'

export type DailyStanding = {
  playerId: string
  name: string
  score: number
  wordCount: number
  longest: string
}

export type DailyRow = {
  player_id: string
  score: number
  words: unknown
  profiles: { name?: string } | { name?: string }[] | null
  games: { created_at?: string } | { created_at?: string }[] | null
}

export function dailyStandings(rows: readonly DailyRow[]): DailyStanding[] {
  const latest = new Map<string, { row: DailyRow; at: number }>()
  for (const row of rows) {
    const at = Date.parse(first(row.games)?.created_at ?? '')
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
