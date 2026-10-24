import { describe, expect, it } from 'vitest'
import {
  averages,
  axisMax,
  compactNumber,
  countByLength,
  formatAverage,
  gamesAgainst,
  headToHead,
  lengthNote,
  linearTrend,
  longestFound,
  longestFoundNote,
  niceMax,
  opponentNames,
  trendNote,
  winRate,
  wordsByLength,
  type GameStat,
} from './series'

const games: GameStat[] = [
  {
    id: 'a',
    playedOn: '2026-10-01',
    words: 4,
    score: 1000,
    longest: 'star',
    byLength: { 3: 2, 4: 2 },
    opponents: [{ name: 'Mina Chen', score: 400 }],
  },
  {
    id: 'b',
    playedOn: '2026-10-08',
    words: 8,
    score: 2000,
    longest: 'quartz',
    byLength: { 3: 1, 4: 2, 5: 3, 6: 2 },
    opponents: [{ name: 'Jonah Park', score: 2400 }],
  },
  {
    id: 'c',
    playedOn: '2026-10-15',
    words: 6,
    score: 1500,
    longest: 'cats',
    byLength: { 3: 3, 4: 2, 5: 1 },
    opponents: [{ name: 'Mina Chen', score: 1500 }],
  },
]

describe('stats series', () => {
  it('filters games to one player and lists opponents', () => {
    expect(opponentNames(games)).toEqual(['Jonah Park', 'Mina Chen'])
    expect(gamesAgainst(games, 'Mina Chen').map((game) => game.id)).toEqual(['a', 'c'])
    expect(gamesAgainst(games, null)).toHaveLength(3)
  })

  it('keeps the longest saved word, then the earlier game', () => {
    expect(longestFound(games)?.longest).toBe('quartz')
    expect(longestFoundNote(games)).toBe('6 letters, found Oct 8 against Jonah Park.')
    expect(longestFoundNote(gamesAgainst(games, 'Mina Chen'))).toBe(
      '4 letters, found Oct 15 against Mina Chen.',
    )
    expect(longestFound([])).toBeNull()
    expect(longestFoundNote([])).toBe('No games in this view.')
    expect(
      longestFoundNote([
        { id: 'old', playedOn: '2026-10-01', words: 1, score: 1, longest: '  ', byLength: {}, opponents: [] },
      ]),
    ).toBe('No word saved in this view.')
    expect(
      longestFoundNote([
        {
          id: 'solo',
          playedOn: '2026-10-02',
          words: 2,
          score: 2,
          longest: 'lint',
          byLength: { 4: 2 },
          opponents: [],
        },
        {
          id: 'pair',
          playedOn: '2026-10-03',
          words: 2,
          score: 2,
          longest: 'lint',
          byLength: { 4: 2 },
          opponents: [
            { name: 'Mina Chen', score: 1 },
            { name: 'Jonah Park', score: 1 },
          ],
        },
      ]),
    ).toBe('4 letters, found Oct 2.')
  })

  it('totals saved words at each length', () => {
    expect(countByLength(['cat', '  ', 'a', 'quartz', 'lettered'])).toEqual({ 3: 1, 6: 1, 8: 1 })
    expect(wordsByLength(games)).toEqual([
      { length: 3, count: 6 },
      { length: 4, count: 6 },
      { length: 5, count: 4 },
      { length: 6, count: 2 },
      { length: 7, count: 0 },
      { length: 8, count: 0 },
    ])
    expect(
      wordsByLength([
        {
          id: 'long',
          playedOn: '2026-10-01',
          words: 2,
          score: 1,
          longest: 'letterings',
          byLength: { 3: 1, 10: 2, 2: 4 },
          opponents: [],
        },
      ]),
    ).toEqual([
      { length: 3, count: 1 },
      { length: 4, count: 0 },
      { length: 5, count: 0 },
      { length: 6, count: 0 },
      { length: 7, count: 0 },
      { length: 8, count: 0 },
      { length: 9, count: 0 },
      { length: 10, count: 2 },
    ])
    expect(lengthNote(games)).toBe('18 words across these games.')
    expect(lengthNote(gamesAgainst(games, 'Mina Chen'))).toBe('10 words across these games.')
    expect(lengthNote([])).toBe('No games in this view.')
    expect(
      lengthNote([
        { id: 'old', playedOn: '2026-10-01', words: 9, score: 1, longest: '', byLength: {}, opponents: [] },
      ]),
    ).toBe('No words saved in this view.')
    expect(
      lengthNote([
        { id: 'one', playedOn: '2026-10-01', words: 1, score: 1, longest: 'cat', byLength: { 3: 1 }, opponents: [] },
      ]),
    ).toBe('1 word across these games.')
  })

  it('averages words and points across the games in view', () => {
    expect(averages(games)).toEqual({ words: 6, score: 1500 })
    expect(averages([])).toEqual({ words: null, score: null })
    expect(formatAverage(5.25)).toBe('5.3')
    expect(formatAverage(1500)).toBe('1,500')
  })

  it('counts wins, losses, and ties against everyone or one player', () => {
    expect(headToHead(games, null)).toEqual({ wins: 1, losses: 1, ties: 1 })
    expect(headToHead(games, 'Mina Chen')).toEqual({ wins: 1, losses: 0, ties: 1 })
    expect(winRate(headToHead(games, 'Jonah Park'))).toBe(0)
    expect(winRate({ wins: 0, losses: 0, ties: 0 })).toBeNull()
  })

  it('fits a line through dated scores', () => {
    expect(linearTrend([0, 1, 2], [0, 2, 4])).toEqual({ slope: 2, intercept: 0 })
    expect(linearTrend([3, 3], [4, 10])).toEqual({ slope: 0, intercept: 7 })
    expect(linearTrend([1], [2])).toBeNull()
    expect(niceMax(11200)).toBe(15000)
    expect(axisMax(22)).toBe(30)
    expect(axisMax(24)).toBe(30)
    expect(compactNumber(15000)).toBe('15k')
    expect(compactNumber(1500)).toBe('1.5k')
  })

  it('describes the weekly change', () => {
    expect(
      trendNote(
        games.map((game) => ({ playedOn: game.playedOn, value: game.words })),
        'word',
      ),
    ).toBe('Up about 1 word a week.')
    expect(trendNote([{ playedOn: '2026-10-01', value: 4 }], 'word')).toBe(
      'Play another game to see a trend.',
    )
    expect(trendNote([], 'point')).toBe('No games in this view.')
  })
})
