export type ActiveGame = {
  gameId: string
  opponentId: string
  opponentName: string
  playedBack: boolean
  wins: number
  losses: number
}

export type ActiveSeat = {
  gameId: string
  playerId: string
  status: string
  createdAt: string
}

export type HeadScore = {
  gameId: string
  playerId: string
  score: number
}

type NamedPlayer = {
  id: string
  name?: string | null
}

type RecordCount = {
  wins: number
  losses: number
}

export function formatRecord(wins: number, losses: number): string {
  return `${wins}\u2013${losses}`
}

export function recordPhrase(wins: number, losses: number): string {
  const winLabel = wins === 1 ? '1 win' : `${wins} wins`
  const lossLabel = losses === 1 ? '1 loss' : `${losses} losses`
  return `${winLabel}, ${lossLabel}`
}

export function activeGameLabel(game: ActiveGame): string {
  const status = game.playedBack ? 'played back' : 'waiting'
  return `${game.opponentName}, ${recordPhrase(game.wins, game.losses)}, ${status}`
}

export const COMPLETED_GAME_LIMIT = 10

export function selectActiveGames(games: readonly ActiveGame[]): ActiveGame[] {
  return games.filter((game) => !game.playedBack)
}

/** Keeps incoming order and returns at most `limit` finished games. */
export function selectCompletedGames(
  games: readonly ActiveGame[],
  limit = COMPLETED_GAME_LIMIT,
): ActiveGame[] {
  return games.filter((game) => game.playedBack).slice(0, limit)
}

export function assembleActiveGames(
  viewerId: string,
  seats: readonly ActiveSeat[],
  scores: readonly HeadScore[],
  names: readonly NamedPlayer[],
): ActiveGame[] {
  const nameOf = new Map(names.map((player) => [player.id, player.name?.trim() || 'A player']))
  const byGame = new Map<string, ActiveSeat[]>()
  for (const seat of seats) {
    const group = byGame.get(seat.gameId) ?? []
    group.push(seat)
    byGame.set(seat.gameId, group)
  }

  const records = recordsByOpponent(viewerId, scores)
  const games: Array<ActiveGame & { createdAt: string }> = []

  for (const [gameId, group] of byGame) {
    const viewer = group.find((seat) => seat.playerId === viewerId && seat.status === 'accepted')
    if (!viewer) continue
    const opponents = group.filter((seat) => seat.playerId !== viewerId && seat.status !== 'declined')
    for (const opponent of opponents) {
      const record = records.get(opponent.playerId) ?? { wins: 0, losses: 0 }
      games.push({
        gameId,
        opponentId: opponent.playerId,
        opponentName: nameOf.get(opponent.playerId) || 'A player',
        playedBack: scores.some(
          (score) => score.gameId === gameId && score.playerId === opponent.playerId,
        ),
        wins: record.wins,
        losses: record.losses,
        createdAt: viewer.createdAt,
      })
    }
  }

  games.sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      left.opponentName.localeCompare(right.opponentName) ||
      left.gameId.localeCompare(right.gameId),
  )

  return games.map(({ createdAt: _createdAt, ...game }) => game)
}

function recordsByOpponent(viewerId: string, scores: readonly HeadScore[]): Map<string, RecordCount> {
  const byGame = new Map<string, HeadScore[]>()
  for (const score of scores) {
    const group = byGame.get(score.gameId) ?? []
    group.push(score)
    byGame.set(score.gameId, group)
  }

  const records = new Map<string, RecordCount>()
  for (const group of byGame.values()) {
    const mine = group.find((score) => score.playerId === viewerId)
    if (!mine) continue
    const seen = new Set<string>()
    for (const other of group) {
      if (other.playerId === viewerId || seen.has(other.playerId)) continue
      seen.add(other.playerId)
      const record = records.get(other.playerId) ?? { wins: 0, losses: 0 }
      if (mine.score > other.score) record.wins += 1
      else if (mine.score < other.score) record.losses += 1
      records.set(other.playerId, record)
    }
  }
  return records
}
