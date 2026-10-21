import { playedOn } from '../data/play'

export type SampleGame = {
  daysAgo: number
  opponent: string
  words: number
  score: number
  opponentScore: number
}

export const SAMPLE_GAMES: readonly SampleGame[] = [
  { daysAgo: 42, opponent: 'Mina Chen', words: 8, score: 2200, opponentScore: 4100 },
  { daysAgo: 39, opponent: 'Jonah Park', words: 11, score: 3400, opponentScore: 3400 },
  { daysAgo: 36, opponent: 'Riley Okonkwo', words: 12, score: 3900, opponentScore: 2600 },
  { daysAgo: 33, opponent: 'Mina Chen', words: 9, score: 2500, opponentScore: 4800 },
  { daysAgo: 30, opponent: 'Jonah Park', words: 14, score: 5200, opponentScore: 3100 },
  { daysAgo: 27, opponent: 'Riley Okonkwo', words: 15, score: 5600, opponentScore: 6400 },
  { daysAgo: 24, opponent: 'Mina Chen', words: 13, score: 4700, opponentScore: 3300 },
  { daysAgo: 21, opponent: 'Jonah Park', words: 16, score: 6100, opponentScore: 4900 },
  { daysAgo: 18, opponent: 'Riley Okonkwo', words: 14, score: 5000, opponentScore: 5000 },
  { daysAgo: 16, opponent: 'Mina Chen', words: 18, score: 7200, opponentScore: 4500 },
  { daysAgo: 14, opponent: 'Jonah Park', words: 15, score: 5400, opponentScore: 7800 },
  { daysAgo: 12, opponent: 'Riley Okonkwo', words: 19, score: 8100, opponentScore: 5200 },
  { daysAgo: 10, opponent: 'Mina Chen', words: 17, score: 6800, opponentScore: 5900 },
  { daysAgo: 8, opponent: 'Jonah Park', words: 21, score: 9400, opponentScore: 6300 },
  { daysAgo: 6, opponent: 'Riley Okonkwo', words: 18, score: 7000, opponentScore: 8600 },
  { daysAgo: 4, opponent: 'Mina Chen', words: 22, score: 9800, opponentScore: 6400 },
  { daysAgo: 2, opponent: 'Jonah Park', words: 20, score: 8600, opponentScore: 7900 },
  { daysAgo: 0, opponent: 'Riley Okonkwo', words: 24, score: 11200, opponentScore: 7100 },
]

export type HistoryInsert = {
  player_id: string
  played_on: string
  words_found: number
  score: number
  opponent_name: string
  opponent_score: number
  seeded: true
}

export function buildSampleHistory(playerId: string, today = new Date()): HistoryInsert[] {
  return SAMPLE_GAMES.map((game) => ({
    player_id: playerId,
    played_on: shiftDays(today, game.daysAgo),
    words_found: game.words,
    score: game.score,
    opponent_name: game.opponent,
    opponent_score: game.opponentScore,
    seeded: true,
  }))
}

function shiftDays(today: Date, daysAgo: number): string {
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo)
  return playedOn(next)
}
