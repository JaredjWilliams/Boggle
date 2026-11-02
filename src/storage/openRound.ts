import type { Board } from '../game/dice'
import type { Rival } from '../game/match'
import { ROUND_SECONDS, type ScoredWord } from '../game/round'

const STORAGE_KEY = 'boggle.openRound'

export type OpenRound = {
  board: Board
  found: ScoredWord[]
  /** Epoch milliseconds when the round ends. The clock keeps running from this. */
  endsAt: number
  phase: 'playing' | 'paused'
  matchId: string | null
  rivals: Rival[]
  daily: boolean
}

type Store = Record<string, OpenRound>

export function loadOpenRound(playerKey: string): OpenRound | null {
  const saved = readStore()[playerKey]
  return saved ?? null
}

export function saveOpenRound(playerKey: string, round: OpenRound): void {
  try {
    const store = readStore()
    store[playerKey] = round
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // The round still lives in memory when storage is blocked.
  }
}

export function clearOpenRound(playerKey: string): void {
  try {
    const store = readStore()
    if (!(playerKey in store)) return
    delete store[playerKey]
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Leaving a stale round is safer than throwing over a blocked store.
  }
}

function readStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const store: Store = {}
    for (const [playerKey, value] of Object.entries(parsed)) {
      const round = openRound(value)
      if (round) store[playerKey] = round
    }
    return store
  } catch {
    return {}
  }
}

function openRound(value: unknown): OpenRound | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const board = boardOf(record.board)
  const found = wordsOf(record.found)
  if (!board || !found) return null
  if (record.phase !== 'playing' && record.phase !== 'paused') return null
  const endsAt = endsAtOf(record)
  if (endsAt == null) return null
  if (record.matchId !== null && typeof record.matchId !== 'string') return null
  if (record.matchId === '') return null
  const rivals = rivalsOf(record.rivals)
  if (!rivals || typeof record.daily !== 'boolean') return null
  return {
    board,
    found,
    endsAt,
    phase: record.phase,
    matchId: record.matchId,
    rivals,
    daily: record.daily,
  }
}

function endsAtOf(record: Record<string, unknown>): number | null {
  const latest = Date.now() + ROUND_SECONDS * 1000
  if (typeof record.endsAt === 'number' && Number.isFinite(record.endsAt)) {
    return Math.min(record.endsAt, latest)
  }
  if (!Number.isInteger(record.secondsLeft)) return null
  const secondsLeft = record.secondsLeft as number
  if (secondsLeft < 0 || secondsLeft > ROUND_SECONDS) return null
  return Date.now() + secondsLeft * 1000
}

function boardOf(value: unknown): Board | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const width = value.length
  const board: Board = []
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== width) return null
    if (!row.every((cell) => typeof cell === 'string' && cell.length > 0)) return null
    board.push([...row])
  }
  return board
}

function wordsOf(value: unknown): ScoredWord[] | null {
  if (!Array.isArray(value)) return null
  const words: ScoredWord[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const word = item as Record<string, unknown>
    if (typeof word.word !== 'string' || !Number.isFinite(word.points)) return null
    if (word.start !== undefined && !Number.isInteger(word.start)) return null
    words.push(
      word.start === undefined
        ? { word: word.word, points: word.points as number }
        : { word: word.word, points: word.points as number, start: word.start as number },
    )
  }
  return words
}

function rivalsOf(value: unknown): Rival[] | null {
  if (!Array.isArray(value)) return null
  const rivals: Rival[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const rival = item as Record<string, unknown>
    if (typeof rival.id !== 'string' || typeof rival.name !== 'string') return null
    if (!rival.id || !rival.name) return null
    rivals.push({ id: rival.id, name: rival.name })
  }
  return rivals
}
