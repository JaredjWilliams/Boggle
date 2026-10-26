import { longestWord } from '../game/match'
import type { ScoredWord } from '../game/round'
import { getSupabase } from '../lib/supabase'
import { countByLength, wordsLeftOn, type GameStat, type OpponentResult } from '../stats/series'
import { unplayedWords } from './matches'
import { playedOn } from './play'

type HistoryRow = {
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

type MineRow = {
  game_id: string
  score: number
  words: unknown
  games: SavedGame | SavedGame[] | null
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
      .select('id, played_on, words_found, score, opponent_name, opponent_score, archive_group')
      .eq('player_id', playerId),
    supabase
      .from('results')
      .select('game_id, score, words, games(created_at, possible_words)')
      .eq('player_id', playerId),
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

export function historyGames(rows: readonly HistoryRow[]): GameStat[] {
  const groups = new Map<string, HistoryRow[]>()
  for (const row of rows) {
    const key = row.archive_group || row.id
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => {
    const first = group[0]
    const opponents = group.flatMap((row) => {
      const name = row.opponent_name?.trim() ?? ''
      if (!name || row.opponent_score == null) return []
      return [{ name, score: row.opponent_score }]
    })
    return {
      id: first.archive_group || first.id,
      playedOn: first.played_on,
      words: first.words_found,
      score: first.score,
      longest: '',
      byLength: {},
      opponents,
      leftOn: null,
    }
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
    const found = namedWords(row.words)
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

function namedWords(value: unknown): ScoredWord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { word?: unknown; points?: unknown }
    if (typeof record.word !== 'string' || !record.word.trim()) return []
    const points = typeof record.points === 'number' ? record.points : 0
    return [{ word: record.word, points }]
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

function possibleWords(games: MineRow['games']): ScoredWord[] | null {
  const game = Array.isArray(games) ? games[0] : games
  if (!game || !Array.isArray(game.possible_words)) return null
  return namedWords(game.possible_words)
}
