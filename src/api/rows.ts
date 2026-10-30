import type { ScoredWord } from '../game/round'

type QueryError = { message: string }

export function first<T>(value: T | readonly T[] | null | undefined): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  return value as T
}

export function unwrap<T>(result: { data: T; error: QueryError | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

/** A stored word list. `trim` keeps the trimmed spelling. `start` keeps a tile index. */
export function scoredWords(
  value: unknown,
  options?: { trim?: boolean; start?: boolean },
): ScoredWord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { word?: unknown; points?: unknown; start?: unknown }
    if (typeof record.word !== 'string' || !record.word.trim()) return []
    const points = typeof record.points === 'number' ? record.points : 0
    const word = options?.trim ? record.word.trim() : record.word
    if (!options?.start) return [{ word, points }]
    const start =
      typeof record.start === 'number' && Number.isInteger(record.start) ? record.start : undefined
    return [start == null ? { word, points } : { word, points, start }]
  })
}

export function profileName(value: unknown, fallback = 'A player'): string {
  const profile = first(value as { name?: string | null } | { name?: string | null }[] | null)
  const name = profile?.name?.trim()
  return name || fallback
}
