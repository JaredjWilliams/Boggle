import { first, profileName, scoredWords } from '../api/rows'
import { longestWord } from '../game/match'
import type { ScoredWord } from '../game/round'
import { countByLength, startCells, wordsLeftOn, type GameStat, type OpponentResult } from '../stats/series'
import { playedOn } from './dates'
import { unplayedWords } from './results'

export type HistoryRow = {
  id: string
  played_on: string
  words_found: number
  score: number
  opponent_name: string | null
  opponent_score: number | null
  archive_group?: string | null
}

type SavedGame = {
  created_at?: string
  possible_words?: unknown
}

export type MineRow = {
  game_id: string
  score: number
  words: unknown
  games: SavedGame | SavedGame[] | null
}

export type OtherRow = {
  game_id: string
  score: number
  profiles: { name?: string } | { name?: string }[] | null
}

export function historyGames(rows: readonly HistoryRow[]): GameStat[] {
  const groups = new Map<string, HistoryRow[]>()
  for (const row of rows) {
    const key = row.archive_group || row.id
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => {
    const firstRow = group[0]
    const opponents = group.flatMap((row) => {
      const name = row.opponent_name?.trim() ?? ''
      if (!name || row.opponent_score == null) return []
      return [{ name, score: row.opponent_score }]
    })
    return {
      id: firstRow.archive_group || firstRow.id,
      playedOn: firstRow.played_on,
      words: firstRow.words_found,
      score: firstRow.score,
      longest: '',
      byLength: {},
      opponents,
      leftOn: null,
      starts: null,
    }
  })
}

export function resultGames(mine: readonly MineRow[], others: readonly OtherRow[]): GameStat[] {
  const rivals = new Map<string, OpponentResult[]>()
  for (const other of others) {
    const name = profileName(other.profiles, '')
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
    const found = scoredWords(row.words, { start: true })
    const possible = possibleWords(row.games)
    return [
      {
        id: row.game_id,
        playedOn: playedOn(new Date(parsed)),
        words: Array.isArray(row.words) ? row.words.length : 0,
        score: row.score,
        longest: longestWord(found),
        byLength: countByLength(found.map((item) => item.word)),
        opponents: rivals.get(row.game_id) ?? [],
        starts: startCells(found),
        leftOn:
          possible === null
            ? null
            : wordsLeftOn(
                found.map((item) => item.word),
                unplayedWords(possible, found),
              ),
      },
    ]
  })
}

function gameCreated(games: MineRow['games']): string {
  return first(games)?.created_at ?? ''
}

function possibleWords(games: MineRow['games']): ScoredWord[] | null {
  const game = first(games)
  if (!game || !Array.isArray(game.possible_words)) return null
  return scoredWords(game.possible_words, { start: true })
}
