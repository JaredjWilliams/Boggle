import { describe, expect, it } from 'vitest'
import { playedOn } from './play'
import { historyGames, resultGames } from './stats'

describe('stats rows', () => {
  it('turns saved results into one game with every opponent', () => {
    const created = '2026-10-02T15:00:00.000Z'
    expect(
      resultGames(
        [
          {
            game_id: 'g1',
            score: 100,
            words: [{ word: 'cat' }, { word: '  ' }, { word: 'quartz', points: 1400 }],
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
        words: 3,
        score: 100,
        longest: 'quartz',
        byLength: { 3: 1, 6: 1 },
        opponents: [
          { name: 'Mina Chen', score: 40 },
          { name: 'Jonah Park', score: 80 },
        ],
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
      )[0].leftOn,
    ).toBeNull()
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
        leftOn: null,
      },
    ])
  })
})
