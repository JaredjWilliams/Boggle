import { describe, expect, it } from 'vitest'
import { START_CELLS } from '../stats/series'
import { playedOn } from './dates'
import { historyGames, resultGames } from './stats'

function cells(marks: Record<number, number>): number[] {
  const grid = Array.from({ length: START_CELLS }, () => 0)
  for (const [index, count] of Object.entries(marks)) grid[Number(index)] = count
  return grid
}

describe('stats rows', () => {
  it('turns saved results into one game with every opponent', () => {
    const created = '2026-10-02T15:00:00.000Z'
    expect(
      resultGames(
        [
          {
            game_id: 'g1',
            score: 100,
            words: [
              { word: 'cat', start: 0 },
              { word: '  ', start: 3 },
              { word: 'quartz', points: 1400, start: 12 },
              { word: 'nope', points: 100, start: 1.5 },
            ],
            games: {
              created_at: created,
              possible_words: [
                { word: 'cat', points: 100 },
                { word: 'catch', points: 800 },
                { word: 'quartz', points: 1400 },
                { word: 'dog', points: 100 },
              ],
            },
          },
          { game_id: 'g2', score: 50, words: null, games: null },
        ],
        [
          { game_id: 'g1', score: 40, profiles: { name: ' Mina Chen ' } },
          { game_id: 'g1', score: 80, profiles: [{ name: 'Jonah Park' }] },
        ],
      ),
    ).toEqual([
      {
        id: 'g1',
        playedOn: playedOn(new Date(created)),
        words: 4,
        score: 100,
        longest: 'quartz',
        byLength: { 3: 1, 4: 1, 6: 1 },
        opponents: [
          { name: 'Mina Chen', score: 40 },
          { name: 'Jonah Park', score: 80 },
        ],
        starts: cells({ 0: 1, 12: 1 }),
        leftOn: [{ found: 'cat', longer: 'catch', points: 800 }],
      },
    ])
  })

  it('leaves the started-word stat empty when the board was not saved', () => {
    const created = '2026-10-03T15:00:00.000Z'
    expect(
      resultGames(
        [
          {
            game_id: 'g3',
            score: 10,
            words: [{ word: 'cat', points: 100 }],
            games: { created_at: created },
          },
        ],
        [],
      )[0],
    ).toMatchObject({ leftOn: null, starts: null })
  })

  it('keeps a history game when the opponent name is present', () => {
    expect(
      historyGames([
        {
          id: 'h1',
          played_on: '2026-10-04',
          words_found: 9,
          score: 1800,
          opponent_name: '  Riley Okonkwo  ',
          opponent_score: 900,
        },
      ]),
    ).toEqual([
      {
        id: 'h1',
        playedOn: '2026-10-04',
        words: 9,
        score: 1800,
        longest: '',
        byLength: {},
        opponents: [{ name: 'Riley Okonkwo', score: 900 }],
        starts: null,
        leftOn: null,
      },
    ])
  })

  it('keeps a score when the other player never played', () => {
    expect(
      historyGames([
        {
          id: 'h2',
          played_on: '2026-10-05',
          words_found: 4,
          score: 500,
          opponent_name: null,
          opponent_score: null,
          archive_group: 'solo',
        },
        {
          id: 'h3',
          played_on: '2026-10-06',
          words_found: 6,
          score: 800,
          opponent_name: 'Mina Chen',
          opponent_score: 200,
          archive_group: 'both',
        },
        {
          id: 'h4',
          played_on: '2026-10-06',
          words_found: 6,
          score: 800,
          opponent_name: 'Jonah Park',
          opponent_score: 900,
          archive_group: 'both',
        },
      ]),
    ).toEqual([
      {
        id: 'solo',
        playedOn: '2026-10-05',
        words: 4,
        score: 500,
        longest: '',
        byLength: {},
        opponents: [],
        starts: null,
        leftOn: null,
      },
      {
        id: 'both',
        playedOn: '2026-10-06',
        words: 6,
        score: 800,
        longest: '',
        byLength: {},
        opponents: [
          { name: 'Mina Chen', score: 200 },
          { name: 'Jonah Park', score: 900 },
        ],
        starts: null,
        leftOn: null,
      },
    ])
  })
})
