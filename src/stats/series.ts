import { compareWords } from '../game/words'

export type OpponentResult = {
  name: string
  score: number
}

export type GameStat = {
  id: string
  playedOn: string
  words: number
  score: number
  longest: string
  byLength: Readonly<Record<number, number>>
  opponents: OpponentResult[]
}

export type LengthTotal = {
  length: number
  count: number
}

export type HeadToHead = {
  wins: number
  losses: number
  ties: number
}

export type Trend = {
  slope: number
  intercept: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function dayIndex(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return 0
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000)
}

export function formatPlayedOn(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return `${MONTHS[month - 1]} ${day}`
}

export function dateRange(dates: readonly string[]): string {
  if (dates.length === 0) return ''
  const ordered = [...dates].sort()
  const first = formatPlayedOn(ordered[0])
  const last = formatPlayedOn(ordered[ordered.length - 1])
  return first === last ? first : `${first} – ${last}`
}

export function opponentNames(games: readonly GameStat[]): string[] {
  const names = new Set<string>()
  for (const game of games) {
    for (const opponent of game.opponents) names.add(opponent.name)
  }
  return [...names].sort((left, right) => left.localeCompare(right))
}

export function gamesAgainst(games: readonly GameStat[], opponent: string | null): GameStat[] {
  if (!opponent) return [...games]
  return games.filter((game) => game.opponents.some((item) => item.name === opponent))
}

export function longestFound(games: readonly GameStat[]): GameStat | null {
  const found = games.filter((game) => game.longest.trim())
  if (found.length === 0) return null
  return [...found].sort(
    (left, right) =>
      compareWords(left.longest, right.longest) ||
      left.playedOn.localeCompare(right.playedOn) ||
      left.id.localeCompare(right.id),
  )[0]
}

export function longestFoundNote(games: readonly GameStat[]): string {
  if (games.length === 0) return 'No games in this view.'
  const best = longestFound(games)
  if (!best) return 'No word saved in this view.'
  const letters = best.longest.length === 1 ? '1 letter' : `${best.longest.length} letters`
  const when = formatPlayedOn(best.playedOn)
  const names = best.opponents.map((opponent) => opponent.name).filter(Boolean)
  if (names.length === 0) return `${letters}, found ${when}.`
  if (names.length === 1) return `${letters}, found ${when} against ${names[0]}.`
  const leading = names.slice(0, -1).join(', ')
  return `${letters}, found ${when} against ${leading} and ${names[names.length - 1]}.`
}

export function countByLength(words: readonly string[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const word of words) {
    const length = word.trim().length
    if (length < 3) continue
    counts[length] = (counts[length] ?? 0) + 1
  }
  return counts
}

export function wordsByLength(games: readonly GameStat[]): LengthTotal[] {
  const totals = new Map<number, number>()
  for (const game of games) {
    for (const [key, count] of Object.entries(game.byLength)) {
      const length = Number(key)
      if (!Number.isInteger(length) || length < 3 || count <= 0) continue
      totals.set(length, (totals.get(length) ?? 0) + count)
    }
  }
  const highest = totals.size === 0 ? 8 : Math.max(8, ...totals.keys())
  return Array.from({ length: highest - 2 }, (_, index) => {
    const length = index + 3
    return { length, count: totals.get(length) ?? 0 }
  })
}

export function lengthNote(games: readonly GameStat[]): string {
  if (games.length === 0) return 'No games in this view.'
  const total = wordsByLength(games).reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return 'No words saved in this view.'
  const label = total === 1 ? '1 word' : `${formatCount(total)} words`
  return `${label} across these games.`
}

export function averages(games: readonly GameStat[]): { words: number | null; score: number | null } {
  if (games.length === 0) return { words: null, score: null }
  let words = 0
  let score = 0
  for (const game of games) {
    words += game.words
    score += game.score
  }
  return { words: words / games.length, score: score / games.length }
}

export function headToHead(games: readonly GameStat[], opponent: string | null): HeadToHead {
  const record: HeadToHead = { wins: 0, losses: 0, ties: 0 }
  for (const game of games) {
    const rivals = opponent
      ? game.opponents.filter((item) => item.name === opponent)
      : game.opponents
    for (const rival of rivals) {
      if (game.score > rival.score) record.wins += 1
      else if (game.score < rival.score) record.losses += 1
      else record.ties += 1
    }
  }
  return record
}

export function playedCount(record: HeadToHead): number {
  return record.wins + record.losses + record.ties
}

export function winRate(record: HeadToHead): number | null {
  const played = playedCount(record)
  if (played === 0) return null
  return record.wins / played
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

export function formatAverage(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function linearTrend(xs: readonly number[], ys: readonly number[]): Trend | null {
  const count = Math.min(xs.length, ys.length)
  if (count < 2) return null
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let index = 0; index < count; index += 1) {
    sumX += xs[index]
    sumY += ys[index]
    sumXY += xs[index] * ys[index]
    sumXX += xs[index] * xs[index]
  }
  const denominator = count * sumXX - sumX * sumX
  if (denominator === 0) return { slope: 0, intercept: sumY / count }
  const slope = (count * sumXY - sumX * sumY) / denominator
  return { slope, intercept: (sumY - slope * sumX) / count }
}

export function trendNote(
  points: readonly { playedOn: string; value: number }[],
  noun: 'word' | 'point',
): string {
  if (points.length === 0) return 'No games in this view.'
  if (points.length < 2) return 'Play another game to see a trend.'
  const fit = linearTrend(
    points.map((point) => dayIndex(point.playedOn)),
    points.map((point) => point.value),
  )
  if (!fit) return 'Play another game to see a trend.'
  const weekly = fit.slope * 7
  const quiet = noun === 'word' ? 0.2 : 20
  if (Math.abs(weekly) < quiet) return 'Holding steady across these dates.'
  const direction = weekly > 0 ? 'Up' : 'Down'
  return `${direction} about ${quantity(Math.abs(weekly), noun)} a week.`
}

export function niceMax(value: number): number {
  if (value <= 0) return 4
  const padded = value * 1.1
  const power = 10 ** Math.floor(Math.log10(padded))
  const fraction = padded / power
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const nice = steps.find((step) => fraction <= step) ?? 10
  return nice * power
}

export function axisMax(value: number): number {
  if (value <= 0) return 4
  const half = Math.max(value * 1.08, value + 1) / 2
  const power = 10 ** Math.floor(Math.log10(half))
  const fraction = half / power
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const nice = steps.find((step) => fraction <= step) ?? 10
  return nice * power * 2
}

export function compactNumber(value: number): string {
  if (value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute < 1000) return String(Math.round(value))
  const scaled = value / 1000
  const digits = Math.abs(scaled) >= 10 ? 0 : 1
  const rounded = Number(scaled.toFixed(digits))
  return `${rounded}k`
}

function quantity(amount: number, noun: 'word' | 'point'): string {
  const rounded = noun === 'point' ? Math.round(amount) : Math.round(amount * 10) / 10
  const shown = noun === 'point' ? rounded.toLocaleString('en-US') : String(rounded)
  const unit = shown === '1' ? noun : `${noun}s`
  return `${shown} ${unit}`
}
