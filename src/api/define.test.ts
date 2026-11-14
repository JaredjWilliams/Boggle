import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstDefinition, loadWordDefinition } from './define'

const payload = [
  {
    word: 'cat',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          { definition: '  A small carnivorous mammal.  ' },
          { definition: 'A spiteful woman.' },
        ],
      },
    ],
  },
]

describe('firstDefinition', () => {
  it('returns the first definition in a dictionary payload', () => {
    expect(firstDefinition(payload)).toBe('A small carnivorous mammal.')
  })

  it('returns null when the payload has no usable definition', () => {
    expect(firstDefinition(null)).toBeNull()
    expect(firstDefinition({})).toBeNull()
    expect(firstDefinition([{ meanings: [{ definitions: [{ definition: '   ' }] }] }])).toBeNull()
  })
})

describe('loadWordDefinition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when the dictionary responds with 404', async () => {
    const json = vi.fn()
    const signal = new AbortController().signal
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json }))

    await expect(loadWordDefinition('xyz', signal)).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/xyz', { signal })
    expect(json).not.toHaveBeenCalled()
  })

  it('returns the first definition from a successful payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      }),
    )

    await expect(loadWordDefinition('cat', new AbortController().signal)).resolves.toBe(
      'A small carnivorous mammal.',
    )
  })
})
