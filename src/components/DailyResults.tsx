import { loadDailyStandings } from '../api/daily'
import type { DailyStanding } from '../domain/daily'
import { useLoaded } from '../hooks/useLoaded'
import { StatusBlock } from './StatusBlock'
import './DailyResults.css'

type Props = {
  viewerId: string
  standings: readonly DailyStanding[]
  loading: boolean
  notice: string
  onRetry?: () => void
}

export function DailyBoardResults({ playerId }: { playerId: string }) {
  const today = useLoaded(
    () => loadDailyStandings(),
    [] as DailyStanding[],
    "Could not load today's results.",
    [playerId],
    { clearOnError: true },
  )

  return (
    <DailyResults
      viewerId={playerId}
      standings={today.data}
      loading={today.loading}
      notice={today.notice}
      onRetry={today.reload}
    />
  )
}

export function DailyResults({ viewerId, standings, loading, notice, onRetry }: Props) {
  return (
    <main className="page daily-results">
      <h1>Today's results</h1>
      <p className="page-lede">Everyone who finished today's board.</p>

      <StatusBlock
        loading={loading}
        loadingLabel="Loading today's results…"
        notice={loading ? '' : notice}
        onRetry={onRetry}
      />

      {!loading && !notice && standings.length === 0 && (
        <p className="page-status">No one has finished today's board.</p>
      )}

      {!loading && !notice && standings.length > 0 && (
        <ul className="daily-standings">
          {standings.map((standing) => (
            <li key={standing.playerId}>
              <article>
                <div className="daily-name">
                  <h2>{standing.name}</h2>
                  {standing.playerId === viewerId && <span className="daily-you">You</span>}
                </div>
                <dl className="daily-facts">
                  <div>
                    <dt>Score</dt>
                    <dd>{standing.score}</dd>
                  </div>
                  <div>
                    <dt>Words</dt>
                    <dd>{standing.wordCount}</dd>
                  </div>
                  <div>
                    <dt>Longest word</dt>
                    <dd className="daily-word">{standing.longest || 'None'}</dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
