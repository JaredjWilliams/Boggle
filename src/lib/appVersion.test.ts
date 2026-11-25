import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRemoteVersion,
  startVersionWatcher,
  versionNeedsReload,
  VERSION_CHECK_MS,
} from './appVersion'

describe('versionNeedsReload', () => {
  it('reloads when the remote version differs', () => {
    expect(versionNeedsReload('abc', { version: 'def' })).toBe(true)
  })

  it('stays put when versions match', () => {
    expect(versionNeedsReload('abc', { version: 'abc' })).toBe(false)
  })

  it('ignores missing or empty remote versions', () => {
    expect(versionNeedsReload('abc', null)).toBe(false)
    expect(versionNeedsReload('abc', {})).toBe(false)
    expect(versionNeedsReload('abc', { version: '' })).toBe(false)
    expect(versionNeedsReload('abc', { version: 12 })).toBe(false)
  })
})

describe('fetchRemoteVersion', () => {
  it('reads version.json without caching', async () => {
    const load = vi.fn(async () =>
      Response.json({ version: 'build-1' }),
    )
    await expect(fetchRemoteVersion(load)).resolves.toEqual({ version: 'build-1' })
    expect(load).toHaveBeenCalledWith(
      expect.stringMatching(/^\/version\.json\?t=\d+$/),
      { cache: 'no-store' },
    )
  })

  it('returns null when the request fails', async () => {
    const load = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(fetchRemoteVersion(load)).resolves.toBeNull()
  })
})

describe('startVersionWatcher', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reloads after a newer version appears', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const reload = vi.fn()
    const load = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ version: 'old' }))
      .mockResolvedValueOnce(Response.json({ version: 'new' }))

    const stop = startVersionWatcher({
      current: 'old',
      load,
      reload,
      hidden: () => false,
    })

    await vi.advanceTimersByTimeAsync(VERSION_CHECK_MS)
    expect(reload).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(VERSION_CHECK_MS)
    expect(reload).toHaveBeenCalledOnce()
    stop()
  })

  it('skips checks while the tab is hidden', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const reload = vi.fn()
    const load = vi.fn(async () => Response.json({ version: 'new' }))

    const stop = startVersionWatcher({
      current: 'old',
      load,
      reload,
      hidden: () => true,
    })

    await vi.advanceTimersByTimeAsync(VERSION_CHECK_MS * 2)
    expect(load).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    stop()
  })
})
