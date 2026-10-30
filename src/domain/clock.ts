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
