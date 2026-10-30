import { first, profileName, scoredWords } from '../api/rows'
import { longestWord } from '../game/match'
import { compareWords } from '../game/words'
import { formatCount } from '../stats/series'

export type BoardId =
  | 'daily'
  | 'points'
  | 'bestScore'
  | 'words'
  | 'longest'
  | 'wins'
  | 'friends'
  | 'outgoing'
  | 'days'
  | 'solo'
  | 'averageWords'
  | 'averagePoints'

export type PairScore = {
  playerId: string
  name: string
  wins: number
}

export type LeaderboardRow = {
  playerId: string
  name: string
  rank: number
  value: number
  figure: string
  caption: string
  scores?: readonly PairScore[]
}

export type LeaderboardBoard = {
  id: BoardId
  title: string
  note: string
  figureKind: 'count' | 'word'
  rows: LeaderboardRow[]
}

export type LeaderboardResult = {
  game_id: string
  player_id: string
  score: number
  words: unknown
  profiles: { name?: string } | { name?: string }[] | null
  games:
    | { daily_on?: string | null; created_at?: string | null; host_id?: string | null }
    | { daily_on?: string | null; created_at?: string | null; host_id?: string | null }[]
    | null
}

export type LeaderboardSeat = {
  game_id: string
  player_id: string
  status: string | null
}

/** Players with this many finished games or fewer stay off every board. */
const MINIMUM_FINISHED_GAMES = 10

const BOARDS: readonly {
  id: BoardId
  title: string
  note: string
  figureKind: 'count' | 'word'
}[] = [
  {
    id: 'daily',
    title: 'Daily boards won',
    note: 'Highest score at the end of that day. A tie is not a win.',
    figureKind: 'count',
  },
  {
    id: 'points',
    title: 'Points scored',
    note: 'Total points from every finished game.',
    figureKind: 'count',
  },
  {
    id: 'bestScore',
    title: 'Highest score',
    note: 'The highest score from a single game.',
    figureKind: 'count',
  },
  {
    id: 'words',
    title: 'Most words in a game',
    note: 'The highest word count from a single game.',
    figureKind: 'count',
  },
  {
    id: 'longest',
    title: 'Longest word',
    note: 'The longest word saved from a single game.',
    figureKind: 'word',
  },
  {
    id: 'wins',
    title: 'Wins',
    note: 'Each opponent you outscore on a shared board is a win.',
    figureKind: 'count',
  },
  {
    id: 'friends',
    title: 'Best friends',
    note: 'Games finished together. The number beside each name is wins against the other.',
    figureKind: 'count',
  },
  {
    id: 'outgoing',
    title: 'Most outgoing',
    note: 'Invitations that became a finished game.',
    figureKind: 'count',
  },
  {
    id: 'days',
    title: 'Days on the board',
    note: 'Distinct daily boards you have finished.',
    figureKind: 'count',
  },
  {
    id: 'solo',
    title: 'Solo plays',
    note: 'Finished games with nobody else in the match.',
    figureKind: 'count',
  },
  {
    id: 'averageWords',
    title: 'Average words',
    note: 'Words found per finished game.',
    figureKind: 'count',
  },
  {
    id: 'averagePoints',
    title: 'Average points',
    note: 'Points scored per finished game.',
    figureKind: 'count',
  },
]

type Play = {
  gameId: string
  playerId: string
  name: string
  score: number
  wordCount: number
  longest: string
  dailyOn: string | null
  createdAt: number
  hostId: string | null
}

type Totals = {
  playerId: string
  name: string
  points: number
  games: number
  words: number
  bestScore: number
  bestWords: number
  longest: string
  wins: number
  comparisons: number
  solo: number
  dailyStarts: number
  dailyWins: number
  outgoing: number
}

type PairTally = {
  aId: string
  bId: string
  games: number
  aWins: number
  bWins: number
  ties: number
}

type Draft = {
  playerId: string
  name: string
  value: number
  figure: string
  caption: string
  scores?: readonly PairScore[]
}

export function placeLabel(rank: number): string {
  const mod100 = rank % 100
  const mod10 = rank % 10
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'
  return `${rank}${suffix}`
}

export function buildLeaderboard(
  results: readonly LeaderboardResult[],
  seats: readonly LeaderboardSeat[],
  now = new Date(),
): LeaderboardBoard[] {
  const plays = results.flatMap(toPlay)
  const rivals = activeRivals(seats)
  const byGame = new Map<string, Play[]>()
  for (const play of plays) {
    const group = byGame.get(play.gameId) ?? []
    group.push(play)
    byGame.set(play.gameId, group)
  }

  const totals = new Map<string, Totals>()
  for (const play of plays) {
    const player = ensure(totals, play)
    player.points += play.score
    player.games += 1
    player.words += play.wordCount
    if (play.score > player.bestScore) player.bestScore = play.score
    if (play.wordCount > player.bestWords) player.bestWords = play.wordCount
    player.longest = betterWord(player.longest, play.longest)

    const others = (byGame.get(play.gameId) ?? []).filter((other) => other.playerId !== play.playerId)
    player.comparisons += others.length
    for (const other of others) {
      if (play.score > other.score) player.wins += 1
    }

    const seated = rivals.get(play.gameId)
    const waitingRival = seated ? [...seated].some((id) => id !== play.playerId) : false
    if (!waitingRival && others.length === 0) player.solo += 1
  }

  awardDaily(plays, totals, now)
  awardGathering(byGame, totals)
  const pairs = tallyPairs(byGame)
  return BOARDS.map((board) => ({
    ...board,
    rows: board.id === 'friends' ? friendRows(pairs, totals) : rowsFor(board.id, totals),
  }))
}

function tallyPairs(byGame: ReadonlyMap<string, readonly Play[]>): PairTally[] {
  const pairs = new Map<string, PairTally>()
  for (const group of byGame.values()) {
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        const first = group[left]
        const second = group[right]
        if (first.playerId === second.playerId) continue
        const [a, b] = first.playerId < second.playerId ? [first, second] : [second, first]
        const key = `${a.playerId}\0${b.playerId}`
        const pair = pairs.get(key) ?? {
          aId: a.playerId,
          bId: b.playerId,
          games: 0,
          aWins: 0,
          bWins: 0,
          ties: 0,
        }
        pair.games += 1
        if (a.score > b.score) pair.aWins += 1
        else if (b.score > a.score) pair.bWins += 1
        else pair.ties += 1
        pairs.set(key, pair)
      }
    }
  }
  return [...pairs.values()]
}

function friendRows(pairs: readonly PairTally[], totals: ReadonlyMap<string, Totals>): LeaderboardRow[] {
  const drafts: Draft[] = []
  for (const pair of pairs) {
    const a = totals.get(pair.aId)
    const b = totals.get(pair.bId)
    if (!a || !b) continue
    if (a.games <= MINIMUM_FINISHED_GAMES || b.games <= MINIMUM_FINISHED_GAMES) continue
    const flip = a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId)
    const first = flip <= 0 ? a : b
    const second = flip <= 0 ? b : a
    const firstWins = first.playerId === pair.aId ? pair.aWins : pair.bWins
    const secondWins = second.playerId === pair.aId ? pair.aWins : pair.bWins
    drafts.push({
      playerId: `${first.playerId}\0${second.playerId}`,
      name: `${first.name} & ${second.name}`,
      value: pair.games,
      figure: formatCount(pair.games),
      caption: pair.ties === 0 ? '' : pair.ties === 1 ? '1 tie' : `${formatCount(pair.ties)} ties`,
      scores: [
        { playerId: first.playerId, name: first.name, wins: firstWins },
        { playerId: second.playerId, name: second.name, wins: secondWins },
      ],
    })
  }
  return rankRows(drafts)
}

function awardGathering(byGame: ReadonlyMap<string, readonly Play[]>, totals: Map<string, Totals>) {
  for (const group of byGame.values()) {
    const hostId = group.find((play) => play.hostId)?.hostId
    if (!hostId) continue
    const host = totals.get(hostId)
    if (!host) continue

    const finishedOthers = new Set(
      group.filter((play) => play.playerId !== hostId).map((play) => play.playerId),
    )
    host.outgoing += finishedOthers.size
  }
}

function rowsFor(id: BoardId, totals: Map<string, Totals>): LeaderboardRow[] {
  const drafts: Draft[] = []
  for (const player of totals.values()) {
    const draft = draftFor(id, player)
    if (draft) drafts.push(draft)
  }
  return rankRows(drafts)
}

function draftFor(id: BoardId, player: Totals): Draft | null {
  if (player.games <= MINIMUM_FINISHED_GAMES) return null
  if (id === 'daily' && player.dailyStarts > 0) return counted(player, player.dailyWins)
  if (id === 'points' && player.games > 0) return counted(player, player.points)
  if (id === 'bestScore' && player.games > 0) return counted(player, player.bestScore)
  if (id === 'words' && player.games > 0) return counted(player, player.bestWords)
  if (id === 'longest' && player.longest.trim()) {
    const letters = player.longest.trim().length
    return {
      playerId: player.playerId,
      name: player.name,
      value: letters,
      figure: player.longest.trim().toUpperCase(),
      caption: letters === 1 ? '1 letter' : `${formatCount(letters)} letters`,
    }
  }
  if (id === 'wins' && player.comparisons > 0) return counted(player, player.wins)
  if (id === 'outgoing' && player.outgoing > 0) return counted(player, player.outgoing)
  if (id === 'days' && player.dailyStarts > 0) return counted(player, player.dailyStarts)
  if (id === 'solo' && player.solo > 0) return counted(player, player.solo)
  if (id === 'averageWords' && player.games > 0) return averaged(player, player.words / player.games)
  if (id === 'averagePoints' && player.games > 0) return averaged(player, player.points / player.games)
  return null
}

function counted(player: Totals, value: number): Draft {
  return {
    playerId: player.playerId,
    name: player.name,
    value,
    figure: formatCount(value),
    caption: '',
  }
}

function averaged(player: Totals, value: number): Draft {
  const shown = Math.round(value * 10) / 10
  const games = player.games === 1 ? '1 game' : `${formatCount(player.games)} games`
  return {
    playerId: player.playerId,
    name: player.name,
    value: shown,
    figure: shown.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    caption: games,
  }
}

function rankRows(drafts: readonly Draft[]): LeaderboardRow[] {
  const ordered = [...drafts].sort(
    (left, right) =>
      right.value - left.value || left.name.localeCompare(right.name) || left.playerId.localeCompare(right.playerId),
  )
  let previous = Number.NaN
  let rank = 0
  return ordered.map((draft, index) => {
    if (draft.value !== previous) rank = index + 1
    previous = draft.value
    return { ...draft, rank }
  })
}

/** The last offset still on a calendar date. Noon UTC the next day is midnight in UTC−12. */
const DAILY_CLOSE_UTC_HOUR = 12

function awardDaily(plays: readonly Play[], totals: Map<string, Totals>, now: Date) {
  const latest = new Map<string, Play>()
  const contenders = new Map<string, Play>()
  for (const play of plays) {
    if (!play.dailyOn) continue
    const key = `${play.dailyOn}\0${play.playerId}`
    const current = latest.get(key)
    if (!current || play.createdAt >= current.createdAt) latest.set(key, play)

    const closesAt = dayClosesAt(play.dailyOn)
    if (closesAt == null || play.createdAt >= closesAt) continue
    const counted = contenders.get(key)
    if (!counted || play.createdAt >= counted.createdAt) contenders.set(key, play)
  }

  const byDay = groupByDay(latest.values())
  const finalByDay = groupByDay(contenders.values())

  for (const [day, group] of byDay) {
    for (const play of group) ensure(totals, play).dailyStarts += 1
    const closesAt = dayClosesAt(day)
    if (closesAt == null || now.getTime() < closesAt) continue
    const leaders = uniqueLeaders(finalByDay.get(day) ?? [])
    if (leaders.length !== 1) continue
    ensure(totals, leaders[0]).dailyWins += 1
  }
}

function groupByDay(plays: Iterable<Play>): Map<string, Play[]> {
  const byDay = new Map<string, Play[]>()
  for (const play of plays) {
    const group = byDay.get(play.dailyOn ?? '') ?? []
    group.push(play)
    byDay.set(play.dailyOn ?? '', group)
  }
  return byDay
}

function uniqueLeaders(group: readonly Play[]): Play[] {
  let best = Number.NEGATIVE_INFINITY
  for (const play of group) {
    if (play.score > best) best = play.score
  }
  return group.filter((play) => play.score === best)
}

function dayClosesAt(dailyOn: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dailyOn)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const start = new Date(Date.UTC(year, month - 1, day))
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) {
    return null
  }
  return Date.UTC(year, month - 1, day + 1, DAILY_CLOSE_UTC_HOUR)
}

function ensure(totals: Map<string, Totals>, play: Play): Totals {
  const existing = totals.get(play.playerId)
  if (existing) {
    if (existing.name === 'A player' && play.name !== 'A player') existing.name = play.name
    return existing
  }
  const created: Totals = {
    playerId: play.playerId,
    name: play.name,
    points: 0,
    games: 0,
    words: 0,
    bestScore: 0,
    bestWords: 0,
    longest: '',
    wins: 0,
    comparisons: 0,
    solo: 0,
    dailyStarts: 0,
    dailyWins: 0,
    outgoing: 0,
  }
  totals.set(play.playerId, created)
  return created
}

function betterWord(current: string, next: string): string {
  if (!next.trim()) return current
  if (!current.trim()) return next
  return compareWords(next, current) < 0 ? next : current
}

function toPlay(row: LeaderboardResult): Play[] {
  if (!row.game_id || !row.player_id) return []
  if (typeof row.score !== 'number' || !Number.isFinite(row.score)) return []
  const words = scoredWords(row.words, { trim: true })
  const game = first(row.games)
  const daily = game?.daily_on?.trim() || null
  const created = Date.parse(game?.created_at ?? '')
  return [
    {
      gameId: row.game_id,
      playerId: row.player_id,
      name: profileName(row.profiles, 'A player'),
      score: row.score,
      wordCount: words.length,
      longest: longestWord(words),
      dailyOn: daily,
      createdAt: Number.isNaN(created) ? 0 : created,
      hostId: game?.host_id?.trim() || null,
    },
  ]
}

function activeRivals(seats: readonly LeaderboardSeat[]): Map<string, Set<string>> {
  const rivals = new Map<string, Set<string>>()
  for (const seat of seats) {
    if (!seat.game_id || !seat.player_id) continue
    if (seat.status !== 'accepted' && seat.status !== 'invited') continue
    const group = rivals.get(seat.game_id) ?? new Set<string>()
    group.add(seat.player_id)
    rivals.set(seat.game_id, group)
  }
  return rivals
}
