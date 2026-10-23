const STORAGE_KEY = 'boggle.readGames'

type Store = Record<string, string[]>

export function loadReadGames(playerId: string): Set<string> {
  return new Set(readStore()[playerId] ?? [])
}

export function saveReadGames(playerId: string, keys: ReadonlySet<string>): void {
  try {
    const store = readStore()
    store[playerId] = [...keys]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // The in-memory set still marks the game read when storage is blocked.
  }
}

function readStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const store: Store = {}
    for (const [playerId, keys] of Object.entries(parsed)) {
      if (!Array.isArray(keys)) continue
      store[playerId] = keys.filter((key): key is string => typeof key === 'string')
    }
    return store
  } catch {
    return {}
  }
}
