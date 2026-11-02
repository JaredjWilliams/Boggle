import { ROUND_SECONDS } from '../game/round'

export function secondsRemaining(
  startedAt: string,
  now = Date.now(),
  roundSeconds = ROUND_SECONDS,
): number {
  const elapsed = Math.floor((now - Date.parse(startedAt)) / 1000)
  if (!Number.isFinite(elapsed)) return roundSeconds
  return Math.max(0, roundSeconds - elapsed)
}

/** Whole seconds until an absolute deadline. Never runs longer than one round. */
export function secondsUntil(endsAt: number, now = Date.now(), roundSeconds = ROUND_SECONDS): number {
  const remaining = Math.ceil((endsAt - now) / 1000)
  if (!Number.isFinite(remaining)) return 0
  return Math.min(roundSeconds, Math.max(0, remaining))
}
