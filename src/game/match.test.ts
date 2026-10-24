import { describe, expect, it } from 'vitest'
import {
  boardWords,
  longestWord,
  matchOutcome,
  outcomeLabel,
  presentMatch,
  type ResultPlayer,
} from './match'

const ada: ResultPlayer = {
  id: 'ada',
  name: 'Ada Lovelace',
  you: true,
  score: 200,
  words: [{ word: 'cat', points: 100 }],
}

const grace: ResultPlayer = {
  id: 'grace',
  name: 'Grace Hopper',
  you: false,
  score: 500,
  words: [{ word: 'cats', points: 400 }],
}

describe('boardWords', () => {
  it('lists every word on the board, longest first', () => {
    expect(
      boardWords(
        [
          { word: 'cat', points: 100 },
          { word: 'cats', points: 400 },
        ],
        [
          { word: 'eat', points: 100 },
          { word: 'cat', points: 100 },
        ],
      ),
    ).toEqual([
      { word: 'cats', points: 400 },
      { word: 'cat', points: 100 },
      { word: 'eat', points: 100 },
    ])
  })
})

describe('longestWord', () => {
  it('picks the longest found word, then the first in alphabetical order', () => {
    expect(
      longestWord([
        { word: 'star', points: 100 },
        { word: 'cats', points: 100 },
        { word: '  ', points: 0 },
        { word: 'quartz', points: 1400 },
      ]),
    ).toBe('quartz')
    expect(
      longestWord([
        { word: 'star', points: 100 },
        { word: 'cats', points: 100 },
      ]),
    ).toBe('cats')
    expect(longestWord([])).toBe('')
  })
})

describe('presentMatch', () => {
  it('keeps the local score and shows invited players as still playing', () => {
    expect(
      presentMatch(
        null,
        {
          id: 'ada',
          name: 'Ada Lovelace',
          score: 200,
          words: [
            { word: 'eat', points: 100 },
            { word: 'cats', points: 400 },
          ],
        },
        [{ id: 'grace', name: 'Grace Hopper' }],
      ),
    ).toEqual([
      {
        id: 'ada',
        name: 'Ada Lovelace',
        you: true,
        score: 200,
        words: [
          { word: 'cats', points: 400 },
          { word: 'eat', points: 100 },
        ],
      },
      {
        id: 'grace',
        name: 'Grace Hopper',
        you: false,
        score: null,
        words: null,
      },
    ])
  })

  it('uses saved opponents and ignores a stale local score', () => {
    expect(
      presentMatch(
        [
          {
            id: 'ada',
            name: 'Ada Lovelace',
            score: 1,
            words: [],
          },
          {
            id: 'grace',
            name: ' Grace Hopper ',
            score: 500,
            words: [
              { word: 'eat', points: 100 },
              { word: 'cats', points: 400 },
            ],
          },
        ],
        {
          id: 'ada',
          name: 'Ada Lovelace',
          score: 200,
          words: [{ word: 'cat', points: 100 }],
        },
        [{ id: 'mina', name: 'Mina Chen' }],
      ),
    ).toEqual([
      {
        id: 'ada',
        name: 'Ada Lovelace',
        you: true,
        score: 200,
        words: [{ word: 'cat', points: 100 }],
      },
      {
        id: 'grace',
        name: 'Grace Hopper',
        you: false,
        score: 500,
        words: [
          { word: 'cats', points: 400 },
          { word: 'eat', points: 100 },
        ],
      },
    ])
  })
})

describe('match outcome', () => {
  it('names the higher score, a tie, or the player still in the round', () => {
    expect(outcomeLabel(matchOutcome([ada, { ...grace, score: 100 }]))).toBe('You win')
    expect(outcomeLabel(matchOutcome([ada, grace]))).toBe('Grace Hopper wins')
    expect(outcomeLabel(matchOutcome([ada, { ...grace, score: 200 }]))).toBe("It's a tie")
    expect(outcomeLabel(matchOutcome([ada, { ...grace, score: null, words: null }]))).toBe(
      'Waiting for Grace Hopper',
    )
    expect(
      outcomeLabel(
        matchOutcome([
          ada,
          { ...grace, score: null, words: null },
          { id: 'mina', name: 'Mina Chen', you: false, score: null, words: null },
        ]),
      ),
    ).toBe('Waiting for the other players')
    expect(outcomeLabel(matchOutcome([ada]))).toBe('You finished')
  })
})
