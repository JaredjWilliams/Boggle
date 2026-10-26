import { useEffect, useState } from 'react'
import {
  loadLeaderboard,
  placeLabel,
  type BoardId,
  type LeaderboardBoard,
} from '../data/leaderboard'
import { formatCount } from '../stats/series'
import './LeaderboardScreen.css'

type Props = {
  viewerId: string
  boards: readonly LeaderboardBoard[]
  loading: boolean
  notice: string
  onRetry?: () => void
}

export function PlayerLeaderboard({ viewerId }: { viewerId: string }) {
  const [boards, setBoards] = useState<LeaderboardBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setNotice('')
    void loadLeaderboard()
      .then((next) => {
        if (!cancel) setBoards(next)
      })
      .catch((error: unknown) => {
        if (cancel) return
        setBoards([])
        setNotice(error instanceof Error ? error.message : 'Could not load the leaderboard.')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [attempt])

  return (
    <LeaderboardScreen
      viewerId={viewerId}
      boards={boards}
      loading={loading}
      notice={notice}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  )
}

export function LeaderboardScreen({ viewerId, boards, loading, notice, onRetry }: Props) {
  const [selected, setSelected] = useState<BoardId>('daily')
  const board = boards.find((item) => item.id === selected) ?? boards[0]

  return (
    <main className="leaderboard">
      <h1>Leaderboard</h1>
      <p className="leaderboard-lede">Career records for players with more than 10 finished games.</p>

      {loading && <p className="leaderboard-status">Loading the leaderboard…</p>}

      {!loading && notice && (
        <div className="leaderboard-alert" role="alert">
          <p>{notice}</p>
          {onRetry && (
            <button type="button" className="leaderboard-retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      {!loading && !notice && board && (
        <>
          <div className="record-grid" role="radiogroup" aria-label="Records">
            {boards.map((item) => {
              const leader = item.rows[0]
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={item.id === board.id}
                  className={item.id === board.id ? 'record-card is-selected' : 'record-card'}
                  onClick={() => setSelected(item.id)}
                >
                  <span className="record-kicker">{item.title}</span>
                  <strong className="record-leader">{leader ? leader.name : 'No one yet'}</strong>
                  <span className={item.figureKind === 'word' ? 'record-figure is-word' : 'record-figure'}>
                    {leader ? leader.figure : '—'}
                  </span>
                </button>
              )
            })}
          </div>

          <section className="board" aria-labelledby="board-title">
            <h2 id="board-title">{board.title}</h2>
            <p className="board-note">{board.note}</p>
            {board.rows.length === 0 ? (
              <p className="leaderboard-status">No one has this record yet.</p>
            ) : (
              <>
                <p className="board-you">{standingLine(board, viewerId)}</p>
                <ol className="board-rows">
                  {board.rows.map((row) => {
                    const yours = isYourRow(row, viewerId)
                    return (
                      <li key={row.playerId} className={rowClass(row.rank, yours)}>
                        <span className="board-place">{row.rank}</span>
                        <div className="board-who">
                          {row.scores ? (
                            <div className="pair-scores">
                              {row.scores.map((score) => (
                                <p key={score.playerId} className="pair-line">
                                  <span className="board-name">{score.name}</span>
                                  {score.playerId === viewerId && <span className="board-you-tag">You</span>}
                                  <strong className="pair-wins">{score.wins}</strong>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <div className="board-id">
                              <span className="board-name">{row.name}</span>
                              {yours && <span className="board-you-tag">You</span>}
                            </div>
                          )}
                          {row.caption && <p className="board-caption">{row.caption}</p>}
                        </div>
                        <strong className={board.figureKind === 'word' ? 'board-figure is-word' : 'board-figure'}>
                          {row.figure}
                          {row.scores && (
                            <span className="board-figure-unit">{row.value === 1 ? 'game' : 'games'}</span>
                          )}
                        </strong>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function standingLine(board: LeaderboardBoard, viewerId: string): string {
  const mine = board.rows.find((row) => isYourRow(row, viewerId))
  if (!mine) return 'You are not ranked here yet.'
  return `You are ${placeLabel(mine.rank)} of ${formatCount(board.rows.length)}.`
}

function isYourRow(row: { playerId: string }, viewerId: string): boolean {
  return row.playerId.split('\0').includes(viewerId)
}

function rowClass(rank: number, yours: boolean): string {
  const classes = ['board-row']
  if (rank === 1) classes.push('is-first')
  if (yours) classes.push('is-you')
  return classes.join(' ')
}
