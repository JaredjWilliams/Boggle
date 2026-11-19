import type { ScoredWord } from './round'
import { compareWords } from './words'

export type RosterPlayer = {
  id: string
  name: string
  score: number | null
  words: ScoredWord[] | null
}

export type ResultPlayer = RosterPlayer & {
  you: boolean
}

export type Rival = {
  id: string
  name: string
}

export type ViewerResult = {
  id: string
  name: string
  score: number | null
  words: readonly ScoredWord[] | null
}

export type MatchOutcome =
  | { kind: 'waiting'; names: string[] }
  | { kind: 'win'; id: string; name: string; you: boolean }
  | { kind: 'tie' }
  | { kind: 'alone' }

export function rankedWords(words: readonly ScoredWord[]): ScoredWord[] {
  return [...words].sort((left, right) => compareWords(left.word, right.word))
}

export function longestWord(words: readonly ScoredWord[]): string {
  const named = words.filter((item) => item.word.trim())
  if (named.length === 0) return ''
  return rankedWords(named)[0].word
}

export function boardWords(
  found: readonly ScoredWord[],
  missed: readonly ScoredWord[],
): ScoredWord[] {
  const byWord = new Map<string, ScoredWord>()
  for (const word of [...found, ...missed]) {
    if (!byWord.has(word.word)) byWord.set(word.word, word)
  }
  return rankedWords([...byWord.values()])
}

export const OPPONENT_PALETTE = 4

export type WordTone =
  | { kind: 'you' }
  | { kind: 'opponent'; index: number }
  | { kind: 'shared'; stops: readonly WordToneStop[] }
  | { kind: 'missed' }

export type WordToneStop = 'you' | number

export function wordTone(word: string, players: readonly ResultPlayer[]): WordTone {
  const youFound = players.some(
    (player) => player.you && player.words?.some((item) => item.word === word),
  )
  const opponents = players.filter((player) => !player.you)
  const opponentStops: number[] = []
  for (let index = 0; index < opponents.length; index += 1) {
    const opponent = opponents[index]
    if (!opponent.words?.some((item) => item.word === word)) continue
    opponentStops.push(index % OPPONENT_PALETTE)
  }

  const finderCount = (youFound ? 1 : 0) + opponentStops.length
  if (finderCount === 0) return { kind: 'missed' }
  if (youFound && opponentStops.length === 0) return { kind: 'you' }
  if (!youFound && opponentStops.length === 1) {
    return { kind: 'opponent', index: opponentStops[0] }
  }

  const stops: WordToneStop[] = []
  if (youFound) stops.push('you')
  stops.push(...opponentStops)
  return { kind: 'shared', stops }
}

export function wordTones(
  words: readonly ScoredWord[],
  players: readonly ResultPlayer[],
): Map<string, WordTone> {
  const tones = new Map<string, WordTone>()
  for (const item of words) {
    tones.set(item.word, wordTone(item.word, players))
  }
  return tones
}


export function presentMatch(
  remote: readonly RosterPlayer[] | null,
  viewer: ViewerResult,
  rivals: readonly Rival[],
): ResultPlayer[] {
  const source =
    remote ??
    rivals.map((rival) => ({
      id: rival.id,
      name: rival.name,
      score: null,
      words: null,
    }))

  const others = source
    .filter((player) => player.id !== viewer.id)
    .map((player) => ({
      id: player.id,
      name: player.name.trim() || 'A player',
      you: false as const,
      score: player.score,
      words: player.words ? rankedWords(player.words) : null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))

  return [
    {
      id: viewer.id,
      name: viewer.name.trim() || 'You',
      you: true,
      score: viewer.score,
      words: viewer.words ? rankedWords(viewer.words) : null,
    },
    ...others,
  ]
}

export function matchOutcome(players: readonly ResultPlayer[]): MatchOutcome {
  if (players.length < 2) return { kind: 'alone' }
  const finished = players.filter((player) => player.score !== null)
  if (finished.length < 2) {
    const pending = players.filter((player) => player.score === null)
    const names = pending.filter((player) => !player.you).map((player) => player.name)
    return { kind: 'waiting', names: names.length > 0 ? names : pending.map((player) => player.name) }
  }
  const best = Math.max(...finished.map((player) => player.score ?? 0))
  const winners = finished.filter((player) => player.score === best)
  if (winners.length !== 1) return { kind: 'tie' }
  return { kind: 'win', id: winners[0].id, name: winners[0].name, you: winners[0].you }
}

export function outcomeLabel(outcome: MatchOutcome): string {
  if (outcome.kind === 'alone') return 'You finished'
  if (outcome.kind === 'waiting') {
    if (outcome.names.length === 1) return `Waiting for ${outcome.names[0]}`
    return 'Waiting for the other players'
  }
  if (outcome.kind === 'tie') return "It's a tie"
  return outcome.you ? 'You win' : `${outcome.name} wins`
}
