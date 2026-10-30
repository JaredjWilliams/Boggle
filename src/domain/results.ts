import { scoredWords } from '../api/rows'
import type { ScoredWord } from '../game/round'
import { compareWords } from '../game/words'

export type SavedRound = {
  score: number | null
  words: ScoredWord[] | null
  missed: ScoredWord[]
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

export function unplayedWords(
  possible: readonly ScoredWord[],
  found: readonly ScoredWord[],
): ScoredWord[] {
  const have = new Set(found.map((item) => item.word))
  return possible
    .filter((item) => item.word.trim() && !have.has(item.word))
    .sort((left, right) => compareWords(left.word, right.word))
}
