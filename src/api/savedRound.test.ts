import { describe, expect, it, vi } from 'vitest'
import { blankQuery, queryChain, type QueryResult, type RecordedQuery } from '../test/queryChain'
import { loadSavedRound } from './results'
import { unplayedWords } from '../domain/results'

const supabase = vi.hoisted(() => {
  const calls: RecordedQuery[] = []
  let result: QueryResult = { data: null, error: null }
  let game: QueryResult = { data: null, error: null }

  function from(table: string) {
    const query = blankQuery(table)
    calls.push(query)
    return queryChain(query, () => (table === 'games' ? game : result))
  }

  return {
    calls,
    from,
    setGame(next: { data: unknown; error: { message: string } | null }) {
      game = next
    },
    setResult(next: { data: unknown; error: { message: string } | null }) {
      result = next
    },
  }
})

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from }),
}))

describe('unplayedWords', () => {
  it('drops words already found and lists the rest longest first', () => {
    expect(
      unplayedWords(
        [
          { word: 'cat', points: 100 },
          { word: 'cats', points: 400 },
          { word: ' ', points: 1 },
          { word: 'eat', points: 100 },
        ],
        [{ word: 'cat', points: 100 }],
      ),
    ).toEqual([
      { word: 'cats', points: 400 },
      { word: 'eat', points: 100 },
    ])
  })
})

describe('loadSavedRound', () => {
  it('returns the saved score and the words still on the board', async () => {
    supabase.setGame({
      data: {
        possible_words: [
          { word: 'cat', points: 100 },
          { word: 'eat', points: 100 },
        ],
      },
      error: null,
    })
    supabase.setResult({
      data: { score: 0, words: [{ word: 'cat', points: 100 }] },
      error: null,
    })

    await expect(loadSavedRound('game-1', 'ada')).resolves.toEqual({
      score: 0,
      words: [{ word: 'cat', points: 100 }],
      missed: [{ word: 'eat', points: 100 }],
      board: [],
    })
    expect(supabase.calls.map((call) => call.table)).toEqual(['games', 'results'])
    expect(supabase.calls.find((call) => call.table === 'games')?.select).toBe(
      'board, possible_words',
    )
  })

  it('keeps the board the game was played on', async () => {
    const board = [
      ['C', 'A', 'T', 'S', 'X'],
      ['R', 'E', 'N', 'O', 'P'],
      ['D', 'I', 'L', 'M', 'B'],
      ['F', 'G', 'H', 'J', 'K'],
      ['U', 'V', 'W', 'Y', 'Qu'],
    ]
    supabase.setGame({
      data: { possible_words: [{ word: 'cat', points: 100 }], board },
      error: null,
    })
    supabase.setResult({ data: { score: 100, words: [] }, error: null })

    await expect(loadSavedRound('game-1', 'ada')).resolves.toMatchObject({ board })
  })

  it('drops a board that is not a square of letters', async () => {
    supabase.setGame({
      data: { possible_words: [], board: [['C'], ['A', 'T']] },
      error: null,
    })
    supabase.setResult({ data: null, error: null })

    await expect(loadSavedRound('game-1', 'ada')).resolves.toMatchObject({ board: [] })
  })

  it('keeps an unfinished round empty', async () => {
    supabase.setGame({ data: { possible_words: [{ word: 'cat', points: 100 }] }, error: null })
    supabase.setResult({ data: null, error: null })

    await expect(loadSavedRound('game-1', 'ada')).resolves.toEqual({
      score: null,
      words: null,
      missed: [{ word: 'cat', points: 100 }],
      board: [],
    })
  })

  it('reports a round that could not be loaded', async () => {
    supabase.setGame({ data: null, error: { message: 'missing game' } })
    supabase.setResult({ data: null, error: null })

    await expect(loadSavedRound('game-1', 'ada')).rejects.toThrow('missing game')
  })
})
