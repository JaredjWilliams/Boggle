export const ACCOUNT_DOMAIN = 'players.boggle'

export function accountEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${ACCOUNT_DOMAIN}`
}
