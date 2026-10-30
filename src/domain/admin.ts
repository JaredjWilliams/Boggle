import { playedOn } from './dates'

export type GameKind = 'Daily' | 'Friends' | 'Solo'
export type GameState = 'Finished' | 'In progress' | 'Invited' | 'Declined' | 'Archived'
export type OpponentStatus = 'finished' | 'playing' | 'invited' | 'declined'

export type AdminProfile = {
  id: string
  name: string
  username: string
}

export type AdminOpponent = {
  name: string
  score: number | null
  status: OpponentStatus
}

export type AdminGame = {
  id: string
  source: 'game' | 'archive'
  playedOn: string
  kind: GameKind
  state: GameState
  score: number | null
  words: number | null
  opponents: AdminOpponent[]
}

export type PlayedSeat = {
  gameId: string
  playerId: string
  status: string
  name: string
}

export type PlayedGameInfo = {
  gameId: string
  createdAt: string
  dailyOn: string | null
}

export type PlayedScore = {
  gameId: string
  playerId: string
  score: number
  words: number
}

export type GameOrder = 'newest' | 'lowest'

export type ArchivedGame = {
  id: string
  playedOn: string
  score: number
  words: number
  opponentName: string | null
  opponentScore: number | null
}

export function assembleAdminGames(
  playerId: string,
  games: readonly PlayedGameInfo[],
  seats: readonly PlayedSeat[],
  scores: readonly PlayedScore[],
  archives: readonly ArchivedGame[],
): AdminGame[] {
  const live = games.flatMap((info) => {
    const gameSeats = seats.filter((seat) => seat.gameId === info.gameId)
    const gameScores = scores.filter((score) => score.gameId === info.gameId)
    const mineSeat = gameSeats.find((seat) => seat.playerId === playerId)
    const mineScore = gameScores.find((score) => score.playerId === playerId)
    if (!mineSeat && !mineScore) return []

    const opponents = new Map<string, AdminOpponent>()
    for (const seat of gameSeats) {
      if (seat.playerId === playerId) continue
      opponents.set(seat.playerId, {
        name: displayName(seat.name),
        score: null,
        status: opponentStatus(seat.status, false),
      })
    }
    for (const score of gameScores) {
      if (score.playerId === playerId) continue
      const current = opponents.get(score.playerId)
      opponents.set(score.playerId, {
        name: current?.name ?? 'A player',
        score: score.score,
        status: 'finished',
      })
    }

    const others = [...opponents.values()].sort((left, right) => left.name.localeCompare(right.name))
    return [
      {
        id: info.gameId,
        source: 'game' as const,
        playedOn: dayFromTimestamp(info.createdAt) ?? '',
        kind: gameKind(info.dailyOn, others.length),
        state: gameState(mineSeat?.status ?? null, Boolean(mineScore)),
        score: mineScore ? mineScore.score : null,
        words: mineScore ? mineScore.words : null,
        opponents: others,
      },
    ]
  })

  const saved = archives.map((archive) => archivedGame(archive))
  return [...live, ...saved].sort(newestFirst)
}

export function orderGames(games: readonly AdminGame[], order: GameOrder): AdminGame[] {
  const listed = [...games]
  if (order === 'lowest') listed.sort(lowestPointsFirst)
  return listed
}

export function formatPlayedOn(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, date))
}

export function scoreLine(game: AdminGame): string {
  if (game.score == null) return 'No score saved'
  const words = game.words ?? 0
  const label = words === 1 ? 'word' : 'words'
  return `Score ${game.score} · ${words} ${label}`
}

export function opponentLine(opponent: AdminOpponent): string {
  if (opponent.status === 'declined') return `${opponent.name} declined`
  if (opponent.status === 'invited') return `${opponent.name} hasn't played`
  if (opponent.score == null) return `${opponent.name} is still playing`
  return `${opponent.name} scored ${opponent.score}`
}

export function deleteLabel(game: AdminGame): string {
  const people = game.opponents.map((opponent) => opponent.name).join(', ')
  const withPeople = people ? `, with ${people}` : ''
  return `Delete ${game.kind} game, ${game.state}, ${formatPlayedOn(game.playedOn)}${withPeople}`
}

export function gameKey(game: Pick<AdminGame, 'source' | 'id'>): string {
  return `${game.source}:${game.id}`
}

export function profileLabel(profile: AdminProfile): string {
  return `${profile.name} (${profile.username})`
}

export function profileChoices(
  rows: readonly { id?: string; name?: string | null; username?: string | null }[],
): AdminProfile[] {
  return rows
    .flatMap((row) => {
      const name = row.name?.trim() ?? ''
      const username = row.username?.trim() ?? ''
      if (!row.id || !name || !username) return []
      return [{ id: row.id, name, username }]
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.username.localeCompare(right.username),
    )
}

function archivedGame(archive: ArchivedGame): AdminGame {
  const name = archive.opponentName?.trim() ?? ''
  const opponents: AdminOpponent[] = name
    ? [
        {
          name,
          score: archive.opponentScore,
          status: archive.opponentScore == null ? 'playing' : 'finished',
        },
      ]
    : []
  return {
    id: archive.id,
    source: 'archive',
    playedOn: archive.playedOn,
    kind: opponents.length > 0 ? 'Friends' : 'Solo',
    state: 'Archived',
    score: archive.score,
    words: archive.words,
    opponents,
  }
}

function gameKind(dailyOn: string | null, opponents: number): GameKind {
  if (dailyOn?.trim()) return 'Daily'
  return opponents > 0 ? 'Friends' : 'Solo'
}

function gameState(status: string | null, hasScore: boolean): GameState {
  if (hasScore) return 'Finished'
  if (status === 'invited') return 'Invited'
  if (status === 'declined') return 'Declined'
  return 'In progress'
}

function opponentStatus(status: string, hasScore: boolean): OpponentStatus {
  if (hasScore) return 'finished'
  if (status === 'invited') return 'invited'
  if (status === 'declined') return 'declined'
  return 'playing'
}

function lowestPointsFirst(left: AdminGame, right: AdminGame): number {
  const scored = scoreRank(left) - scoreRank(right)
  if (scored !== 0) return scored
  return newestFirst(left, right)
}

function scoreRank(game: AdminGame): number {
  return game.score ?? Number.POSITIVE_INFINITY
}

function newestFirst(left: AdminGame, right: AdminGame): number {
  const day = right.playedOn.localeCompare(left.playedOn)
  if (day !== 0) return day
  return right.id.localeCompare(left.id)
}

function dayFromTimestamp(value: string): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return playedOn(new Date(parsed))
}

function displayName(name: string): string {
  return name.trim() || 'A player'
}
