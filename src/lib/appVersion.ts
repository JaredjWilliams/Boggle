export const APP_VERSION = __APP_VERSION__

export const VERSION_CHECK_MS = 60_000

type VersionPayload = {
  version?: unknown
}

export function versionNeedsReload(current: string, remote: VersionPayload | null): boolean {
  if (!remote || typeof remote.version !== 'string') return false
  return remote.version.length > 0 && remote.version !== current
}

export async function fetchRemoteVersion(
  load: typeof fetch = fetch,
): Promise<VersionPayload | null> {
  try {
    const response = await load(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as VersionPayload
  } catch {
    return null
  }
}

export function startVersionWatcher(options?: {
  current?: string
  intervalMs?: number
  load?: typeof fetch
  reload?: () => void
  hidden?: () => boolean
}): () => void {
  const current = options?.current ?? APP_VERSION
  const intervalMs = options?.intervalMs ?? VERSION_CHECK_MS
  const load = options?.load ?? fetch
  const reload = options?.reload ?? (() => window.location.reload())
  const hidden = options?.hidden ?? (() => document.hidden)
  let checking = false

  async function check() {
    if (hidden() || checking) return
    checking = true
    try {
      const remote = await fetchRemoteVersion(load)
      if (versionNeedsReload(current, remote)) reload()
    } finally {
      checking = false
    }
  }

  const timer = window.setInterval(() => {
    void check()
  }, intervalMs)

  const onVisible = () => {
    if (!hidden()) void check()
  }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
