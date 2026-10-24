import { describe, expect, it } from 'vitest'
import { MISSED_SIXES, pickMissedWord, wordKindLabel } from './missedWords'

describe('missed six-letter words', () => {
  it('lists distinct six-letter words with a kind and a definition', () => {
    const words = MISSED_SIXES.map((item) => item.word)
    expect(new Set(words).size).toBe(words.length)
    for (const item of MISSED_SIXES) {
      expect(item.word).toMatch(/^[a-z]{6}$/)
      expect(wordKindLabel(item.kind)).toMatch(/Noun|Verb|Adjective|Adverb/)
      expect(item.definition.trim().length).toBeGreaterThan(0)
    }
  })

  it('picks a different word when one is already showing', () => {
    const first = pickMissedWord(MISSED_SIXES, undefined, () => 0)
    const second = pickMissedWord(MISSED_SIXES, first.word, () => 0)
    expect(first).toEqual(MISSED_SIXES[0])
    expect(second).toEqual(MISSED_SIXES[1])
  })

  it('keeps the only word when nothing else is available', () => {
    const only = [MISSED_SIXES[0]]
    expect(pickMissedWord(only, only[0].word, () => 0)).toEqual(only[0])
  })
})
