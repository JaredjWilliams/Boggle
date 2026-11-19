export type InviteBlock = 'played' | 'invited' | 'playing'

export type BoardSeat = {
  playerId: string
  status: string
  finished: boolean
}

export type InviteRejection = {
  id: string
  reason: InviteBlock
}

/** Someone who finished, still holds an invite, or is in the round cannot be sent this board. A decline can. */
export function inviteBlock(seat: BoardSeat | undefined): InviteBlock | null {
  if (!seat) return null
  if (seat.finished) return 'played'
  if (seat.status === 'declined') return null
  if (seat.status === 'invited') return 'invited'
  if (seat.status === 'accepted') return 'playing'
  return 'playing'
}

export function blockLabel(block: InviteBlock): string {
  if (block === 'played') return 'Already played'
  if (block === 'invited') return 'Invited'
  return 'Still playing'
}

export function playersNeedingWords(
  players: readonly { playerId: string; score: number | null; words: unknown[] | null }[],
  loaded: ReadonlySet<string>,
): string[] {
  return players
    .filter((player) => player.score !== null && player.words === null && !loaded.has(player.playerId))
    .map((player) => player.playerId)
}
