import { describe, expect, it } from 'vitest'
import {
  averages,
  axisMax,
  compactNumber,
  countByLength,
  formatAverage,
  gamesAgainst,
  headToHead,
  leftOnNote,
  leftOnSummary,
  lengthNote,
  linearTrend,
  longestFound,
  longestFoundNote,
  niceMax,
  opponentNames,
  trendNote,
  winRate,
  wordsByLength,
  wordsLeftOn,
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
    leftOn: null,
  },
  {
    id: 'b',
    playedOn: '2026-10-08',
    words: 8,
    score: 2000,
    longest: 'quartz',
    byLength: { 3: 1, 4: 2, 5: 3, 6: 2 },
    opponents: [{ name: 'Jonah Park', score: 2400 }],
    leftOn: null,
  },
  {
    id: 'c',
    playedOn: '2026-10-15',
    words: 6,
    score: 1500,
    longest: 'cats',
    byLength: { 3: 3, 4: 2, 5: 1 },
    opponents: [{ name: 'Mina Chen', score: 1500 }],
    leftOn: null,
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
        { id: 'old', playedOn: '2026-10-01', words: 1, score: 1, longest: '  ', byLength: {}, opponents: [], leftOn: null },
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
          leftOn: null,
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
          leftOn: null,
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
          leftOn: null,
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
        { id: 'old', playedOn: '2026-10-01', words: 9, score: 1, longest: '', byLength: {}, opponents: [], leftOn: null },
      ]),
    ).toBe('No words saved in this view.')
    expect(
      lengthNote([
        { id: 'one', playedOn: '2026-10-01', words: 1, score: 1, longest: 'cat', byLength: { 3: 1 }, opponents: [], leftOn: null },
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

  it('finds a longer word left on one you already found', () => {
    expect(
      wordsLeftOn(
        [' cat ', 'CATS', 'late', 'star', 'start', 'ear', 'a', 'quartz'],
        [
          { word: 'catch', points: 800 },
          { word: 'CATCH', points: 400 },
          { word: 'later', points: 800 },
          { word: 'starting', points: 1800 },
          { word: 'pear', points: 400 },
          { word: 'scat', points: 400 },
          { word: 'cat', points: 100 },
          { word: '  ', points: 100 },
          { word: 'quartzite', points: Number.NaN },
        ],
      ),
    ).toEqual([
      { found: 'start', longer: 'starting', points: 1800 },
      { found: 'cat', longer: 'catch', points: 800 },
      { found: 'late', longer: 'later', points: 800 },
      { found: 'quartz', longer: 'quartzite', points: 0 },
    ])
    expect(wordsLeftOn(['cat'], [])).toEqual([])

    const started: GameStat[] = [
      {
        id: 'a',
        playedOn: '2026-10-01',
        words: 1,
        score: 100,
        longest: 'cat',
        byLength: { 3: 1 },
        opponents: [],
        leftOn: [
          { found: 'cat', longer: 'catch', points: 800 },
          { found: 'late', longer: 'later', points: 800 },
        ],
      },
      {
        id: 'b',
        playedOn: '2026-10-08',
        words: 1,
        score: 100,
        longest: 'star',
        byLength: { 4: 1 },
        opponents: [],
        leftOn: [
          { found: 'star', longer: 'starch', points: 1400 },
          { found: 'cat', longer: 'catch', points: 800 },
          { found: 'tap', longer: 'tape', points: 400 },
          { found: 'pin', longer: 'pine', points: 400 },
        ],
      },
      {
        id: 'old',
        playedOn: '2026-10-09',
        words: 4,
        score: 400,
        longest: '',
        byLength: {},
        opponents: [],
        leftOn: null,
      },
    ]
    const summary = leftOnSummary(started)
    expect(summary.count).toBe(6)
    expect(summary.points).toBe(4600)
    expect(summary.more).toBe(true)
    expect(summary.examples.map((item) => item.longer)).toEqual(['starch', 'catch', 'later'])
    expect(leftOnNote(summary)).toBe(
      'Worth 4,600 points still on the board. The three below are the biggest. 1 game has no saved board.',
    )
    expect(leftOnNote(leftOnSummary([]))).toBe('No games in this view.')
    expect(leftOnNote(leftOnSummary([started[2]]))).toBe('No missed words saved in this view.')
    expect(
      leftOnNote(
        leftOnSummary([
          {
            id: 'clear',
            playedOn: '2026-10-01',
            words: 1,
            score: 1,
            longest: 'cat',
            byLength: { 3: 1 },
            opponents: [],
            leftOn: [],
          },
        ]),
      ),
    ).toBe('You followed every word you started.')
    expect(
      leftOnNote(
        leftOnSummary([
          {
            id: 'one',
            playedOn: '2026-10-01',
            words: 1,
            score: 1,
            longest: 'late',
            byLength: { 4: 1 },
            opponents: [],
            leftOn: [{ found: 'late', longer: 'later', points: 1 }],
          },
          started[2],
          { ...started[2], id: 'older' },
        ]),
      ),
    ).toBe('Worth 1 point still on the board. 2 games have no saved board.')
  })
})
