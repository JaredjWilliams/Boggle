const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

type DictionaryEntry = {
  meanings?: {
    definitions?: { definition?: unknown }[]
  }[]
}

export function firstDefinition(payload: unknown): string | null {
  if (!Array.isArray(payload)) return null
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue
    const meanings = (entry as DictionaryEntry).meanings
    if (!Array.isArray(meanings)) continue
    for (const meaning of meanings) {
      const definitions = meaning?.definitions
      if (!Array.isArray(definitions)) continue
      for (const item of definitions) {
        const text = item?.definition
        if (typeof text === 'string' && text.trim()) return text.trim()
      }
    }
  }
  return null
}

export async function loadWordDefinition(word: string, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(`${DICTIONARY_URL}${encodeURIComponent(word)}`, { signal })
  if (!response.ok) return null
  return firstDefinition(await response.json())
}
