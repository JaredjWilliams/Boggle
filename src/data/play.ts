import { ROUND_SECONDS } from '../game/round'

export const ACCOUNT_DOMAIN = 'players.boggle'

export function accountEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${ACCOUNT_DOMAIN}`
}

export function playedOn(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function secondsRemaining(
  startedAt: string,
  now = Date.now(),
  roundSeconds = ROUND_SECONDS,
): number {
  const elapsed = Math.floor((now - Date.parse(startedAt)) / 1000)
  if (!Number.isFinite(elapsed)) return roundSeconds
  return Math.max(0, roundSeconds - elapsed)
}
