export type ActiveGame = {
  gameId: string
  opponentId: string
  opponentName: string
  playedBack: boolean
  /** The viewer invited this opponent. */
  hosted: boolean
  wins: number
  losses: number
  /** This game's points. Null when that player has not finished. */
  yourScore: number | null
  opponentScore: number | null
  /** Whole days left before this game is deleted. */
  daysLeft?: number
}

export type ActiveSeat = {
  gameId: string
  playerId: string
  status: string
  createdAt: string
  hostId?: string
}

export type HeadScore = {
  gameId: string
  playerId: string
  score: number
}

/** A finished match kept after its game row was deleted. */
export type KeptMatch = {
  opponentId: string
  score: number
  opponentScore: number
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

/** An unfinished game is deleted once it is older than five days. A game both people have played stays. */
export const GAME_LIFETIME_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000
export const GAME_LIFETIME_MS = GAME_LIFETIME_DAYS * DAY_MS

export function gameIsExpired(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt)
  if (!Number.isFinite(created)) return false
  return now - created > GAME_LIFETIME_MS
}

/** Days remaining, or null once the game is past the deadline or the date is missing. */
export function daysLeftToPlay(createdAt: string, now = Date.now()): number | null {
  const created = Date.parse(createdAt)
  if (!Number.isFinite(created)) return null
  const remaining = GAME_LIFETIME_MS - (now - created)
  if (remaining < 0) return null
  if (remaining === 0) return 0
  return Math.ceil(remaining / DAY_MS)
}

export function daysLeftLabel(days: number): string {
  if (days <= 0) return 'Last day'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export function formatPoints(score: number | null): string {
  if (score === null) return '???'
  return score.toLocaleString('en-US')
}

export function formatMatchScore(yourScore: number | null, opponentScore: number | null): string {
  return `${formatPoints(yourScore)} \u2013 ${formatPoints(opponentScore)}`
}

export function activeGameLabel(game: ActiveGame): string {
  const place = typeof game.daysLeft === 'number' ? daysLeftLabel(game.daysLeft) : game.playedBack ? 'played back' : 'waiting'
  return `${game.opponentName}, ${formatMatchScore(game.yourScore, game.opponentScore)}, ${recordPhrase(game.wins, game.losses)}, ${place}`
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

export function completedGameKey(game: Pick<ActiveGame, 'gameId' | 'opponentId'>): string {
  return `${game.gameId}:${game.opponentId}`
}

/** Completed games the viewer invited and has not opened yet. */
export function playedBackNotices(
  games: readonly ActiveGame[],
  readKeys: ReadonlySet<string>,
): ActiveGame[] {
  return selectCompletedGames(games).filter(
    (game) => game.hosted && !readKeys.has(completedGameKey(game)),
  )
}

export function assembleActiveGames(
  viewerId: string,
  seats: readonly ActiveSeat[],
  scores: readonly HeadScore[],
  names: readonly NamedPlayer[],
  options?: { now?: number; kept?: readonly KeptMatch[] },
): ActiveGame[] {
  const now = options?.now ?? Date.now()
  const nameOf = new Map(names.map((player) => [player.id, player.name?.trim() || 'A player']))
  const byGame = new Map<string, ActiveSeat[]>()
  for (const seat of seats) {
    const group = byGame.get(seat.gameId) ?? []
    group.push(seat)
    byGame.set(seat.gameId, group)
  }

  const records = recordsByOpponent(viewerId, scores, options?.kept ?? [])
  const games: Array<ActiveGame & { createdAt: string }> = []

  for (const [gameId, group] of byGame) {
    const viewer = group.find((seat) => seat.playerId === viewerId && seat.status === 'accepted')
    if (!viewer) continue
    const finished = gameIsFinished(gameId, scores)
    if (!finished && gameIsExpired(viewer.createdAt, now)) continue
    const daysLeft = finished ? null : daysLeftToPlay(viewer.createdAt, now)
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
        hosted: viewer.hostId === viewerId,
        wins: record.wins,
        losses: record.losses,
        yourScore: scoreOf(scores, gameId, viewerId),
        opponentScore: scoreOf(scores, gameId, opponent.playerId),
        ...(daysLeft === null ? {} : { daysLeft }),
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

function scoreOf(scores: readonly HeadScore[], gameId: string, playerId: string): number | null {
  const found = scores.find((score) => score.gameId === gameId && score.playerId === playerId)
  return found ? found.score : null
}

function gameIsFinished(gameId: string, scores: readonly HeadScore[]): boolean {
  const players = new Set<string>()
  for (const score of scores) {
    if (score.gameId === gameId) players.add(score.playerId)
  }
  return players.size >= 2
}

function recordsByOpponent(
  viewerId: string,
  scores: readonly HeadScore[],
  kept: readonly KeptMatch[],
): Map<string, RecordCount> {
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

  for (const match of kept) {
    const record = records.get(match.opponentId) ?? { wins: 0, losses: 0 }
    if (match.score > match.opponentScore) record.wins += 1
    else if (match.score < match.opponentScore) record.losses += 1
    records.set(match.opponentId, record)
  }
  return records
}
