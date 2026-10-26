export const ADMIN_USERNAME = 'jaredjwilliams'

export function isAdmin(player: { username: string }): boolean {
  return player.username.trim().toLowerCase() === ADMIN_USERNAME
}
