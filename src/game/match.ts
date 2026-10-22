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
  score: number
  words: readonly ScoredWord[]
}

export type MatchOutcome =
  | { kind: 'waiting'; names: string[] }
  | { kind: 'win'; id: string; name: string; you: boolean }
  | { kind: 'tie' }
  | { kind: 'alone' }

export function rankedWords(words: readonly ScoredWord[]): ScoredWord[] {
  return [...words].sort((left, right) => compareWords(left.word, right.word))
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
      words: rankedWords(viewer.words),
    },
    ...others,
  ]
}

export function matchOutcome(players: readonly ResultPlayer[]): MatchOutcome {
  if (players.length < 2) return { kind: 'alone' }
  const pending = players.filter((player) => player.score === null)
  if (pending.length > 0) {
    const names = pending.filter((player) => !player.you).map((player) => player.name)
    return { kind: 'waiting', names: names.length > 0 ? names : pending.map((player) => player.name) }
  }
  const best = Math.max(...players.map((player) => player.score ?? 0))
  const winners = players.filter((player) => player.score === best)
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
