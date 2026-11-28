import type { AttemptKind } from '../game/round'

const BASE_HZ = 220
const TICK_MS = 50
const TICK_GAIN = 0.12

const ATTEMPT_URLS: Record<AttemptKind, string> = {
  new: '/sounds/success.wav',
  invalid: '/sounds/error.wav',
  repeat: '/sounds/dud.wav',
}

let context: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer | null>>()

/** Semitone steps from A3: index 0 → 220 Hz, index 1 → ~233 Hz, … */
export function connectTickHz(index: number): number {
  const step = Math.max(0, Math.floor(index))
  return BASE_HZ * 2 ** (step / 12)
}

export function attemptSoundUrl(kind: AttemptKind): string {
  return ATTEMPT_URLS[kind]
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!context) context = new AudioCtx()
  return context
}

export async function unlockAudio(): Promise<void> {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // Autoplay policy or missing gesture — gameplay must not depend on audio.
    }
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(url)
  if (cached) return cached

  const inFlight = loading.get(url)
  if (inFlight) return inFlight

  const task = (async () => {
    const ctx = getContext()
    if (!ctx) return null
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const data = await response.arrayBuffer()
      const buffer = await ctx.decodeAudioData(data.slice(0))
      buffers.set(url, buffer)
      return buffer
    } catch {
      return null
    } finally {
      loading.delete(url)
    }
  })()

  loading.set(url, task)
  return task
}

export function playConnectTick(index: number): void {
  const ctx = getContext()
  if (!ctx || ctx.state !== 'running') return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(connectTickHz(index), now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(TICK_GAIN, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TICK_MS / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + TICK_MS / 1000 + 0.02)
  } catch {
    // Ignore synthesis failures.
  }
}

export function playAttempt(kind: AttemptKind): void {
  const url = attemptSoundUrl(kind)
  void (async () => {
    await unlockAudio()
    const ctx = getContext()
    if (!ctx) return
    const buffer = await loadBuffer(url)
    if (!buffer || ctx.state !== 'running') return
    try {
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      gain.gain.setValueAtTime(0.55, ctx.currentTime)
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
    } catch {
      // Ignore playback failures.
    }
  })()
}

/** Test helper — clears cached context and buffers. */
export function resetAudioForTests(): void {
  context = null
  buffers.clear()
  loading.clear()
}
