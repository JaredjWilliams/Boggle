import {
  assembleActiveGames,
  daysLeftToPlay,
  gameIsExpired,
  type ActiveGame,
  type Friend,
  type HeadScore,
  type Invite,
  type KeptMatch,
  type Lobby,
} from '../domain/lobby'
import type { Board } from '../game/dice'
import { getSupabase } from '../lib/supabase'
import { first, unwrap } from './rows'

type GameCard = {
  board: Board
  host_id: string
  created_at?: string
}

type GameSeat = {
  game_id: string
  games: GameCard | GameCard[] | null
}

type KeptRow = {
  opponent_id: string | null
  score: number
  opponent_score: number | null
}

type ScoreListRow = {
  game_id?: string
  score: number
  games: { created_at?: string } | { created_at?: string }[] | null
}

type AcceptedRow = {
  game_id: string
  games: { created_at?: string; host_id?: string } | { created_at?: string; host_id?: string }[] | null
}

type RivalScoreRow = {
  game_id: string
  player_id: string
  score: number
}

type OpponentSeatRow = {
  game_id: string
  player_id: string
  status: string | null
}

export async function loadLobby(playerId: string): Promise<Lobby> {
  const supabase = getSupabase()
  try {
    await supabase.rpc('expire_stale_games')
  } catch {
    // Opening the lobby still lists games. Ones past the deadline stay hidden.
  }
  const [profiles, seats, scores, accepted, history] = await Promise.all([
    supabase.from('profiles').select('id, name, username').neq('id', playerId),
    supabase
      .from('game_players')
      .select('game_id, games(board, host_id, created_at)')
      .eq('player_id', playerId)
      .eq('status', 'invited'),
    supabase.from('results').select('game_id, score, games(created_at)').eq('player_id', playerId),
    supabase
      .from('game_players')
      .select('game_id, games(created_at, host_id)')
      .eq('player_id', playerId)
      .eq('status', 'accepted'),
    supabase
      .from('match_history')
      .select('opponent_id, score, opponent_score')
      .eq('player_id', playerId),
  ])

  const friends = (unwrap(profiles) ?? []) as Friend[]
  const scoreRows = (unwrap(scores) ?? []) as ScoreListRow[]
  const viewerScores = scoreRows.flatMap((row) =>
    row.game_id ? [{ gameId: row.game_id, playerId, score: row.score }] : [],
  )
  const seatRows = (unwrap(seats) ?? []) as GameSeat[]
  const hostIds = seatRows.flatMap((seat) => {
    const game = first(seat.games)
    return game ? [game.host_id] : []
  })
  const [hosts, games] = await Promise.all([
    hostIds.length
      ? supabase.from('profiles').select('id, name').in('id', hostIds)
      : Promise.resolve({ data: [], error: null }),
    loadActiveGames(
      playerId,
      (unwrap(accepted) ?? []) as AcceptedRow[],
      viewerScores,
      friends,
      keptMatches((unwrap(history) ?? []) as KeptRow[]),
    ),
  ])
  const hostNames = new Map((unwrap(hosts) ?? []).map((host) => [host.id as string, host.name as string]))

  const invites: Invite[] = seatRows.flatMap((seat) => {
    const game = first(seat.games)
    if (!game || (game.created_at && gameIsExpired(game.created_at))) return []
    const daysLeft = game.created_at ? daysLeftToPlay(game.created_at) : null
    return [
      {
        gameId: seat.game_id,
        hostId: game.host_id,
        hostName: hostNames.get(game.host_id) ?? 'A player',
        board: game.board,
        ...(daysLeft === null ? {} : { daysLeft }),
      },
    ]
  })

  const ranked = scoreRows
    .map((row) => {
      const created = first(row.games)?.created_at
      return { score: row.score, created: created ? Date.parse(created) : 0 }
    })
    .sort((left, right) => right.created - left.created)

  return {
    friends,
    invites,
    games,
    lastScore: ranked[0]?.score ?? null,
  }
}

export function watchLobby(playerId: string, onChange: () => void): () => void {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`invites-${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `player_id=eq.${playerId}`,
      },
      () => {
        onChange()
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'results' },
      () => {
        onChange()
      },
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

function keptMatches(rows: readonly KeptRow[]): KeptMatch[] {
  return rows.flatMap((row) =>
    row.opponent_id && row.opponent_score !== null
      ? [{ opponentId: row.opponent_id, score: row.score, opponentScore: row.opponent_score }]
      : [],
  )
}

async function loadActiveGames(
  playerId: string,
  accepted: readonly AcceptedRow[],
  viewerScores: readonly HeadScore[],
  names: readonly { id: string; name?: string | null }[],
  kept: readonly KeptMatch[],
): Promise<ActiveGame[]> {
  if (accepted.length === 0) return []
  const supabase = getSupabase()
  const activeIds = accepted.map((row) => row.game_id)
  const scoreIds = [...new Set([...activeIds, ...viewerScores.map((row) => row.gameId)])]
  const [seats, rivals] = await Promise.all([
    supabase.from('game_players').select('game_id, player_id, status').in('game_id', activeIds),
    supabase
      .from('results')
      .select('game_id, player_id, score')
      .in('game_id', scoreIds)
      .neq('player_id', playerId),
  ])
  const gamesById = new Map(accepted.map((row) => [row.game_id, joinedGame(row.games)]))
  const seatRows = ((unwrap(seats) ?? []) as OpponentSeatRow[]).map((seat) => ({
    gameId: seat.game_id,
    playerId: seat.player_id,
    status: seat.status ?? '',
    createdAt: gamesById.get(seat.game_id)?.createdAt ?? '',
    hostId: gamesById.get(seat.game_id)?.hostId ?? '',
  }))
  const scores = [
    ...viewerScores,
    ...((unwrap(rivals) ?? []) as RivalScoreRow[]).map((row) => ({
      gameId: row.game_id,
      playerId: row.player_id,
      score: row.score,
    })),
  ]
  return assembleActiveGames(playerId, seatRows, scores, names, { kept })
}

function joinedGame(
  games: { created_at?: string; host_id?: string } | { created_at?: string; host_id?: string }[] | null,
): { createdAt: string; hostId: string } {
  const game = first(games)
  return { createdAt: game?.created_at ?? '', hostId: game?.host_id ?? '' }
}
