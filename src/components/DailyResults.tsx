import { useEffect, useState } from 'react'
import { loadDailyStandings, type DailyStanding } from '../data/daily'
import './DailyResults.css'

type Props = {
  viewerId: string
  standings: readonly DailyStanding[]
  loading: boolean
  notice: string
  onRetry?: () => void
}

export function DailyBoardResults({ playerId }: { playerId: string }) {
  const [standings, setStandings] = useState<DailyStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancel = false
    void loadDailyStandings()
      .then((next) => {
        if (!cancel) setStandings(next)
      })
      .catch((error: unknown) => {
        if (cancel) return
        setStandings([])
        setNotice(error instanceof Error ? error.message : "Could not load today's results.")
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [attempt])

  function retry() {
    setLoading(true)
    setNotice('')
    setAttempt((current) => current + 1)
  }

  return (
    <DailyResults
      viewerId={playerId}
      standings={standings}
      loading={loading}
      notice={notice}
      onRetry={retry}
    />
  )
}

export function DailyResults({ viewerId, standings, loading, notice, onRetry }: Props) {
  return (
    <main className="daily-results">
      <h1>Today's results</h1>
      <p className="daily-lede">Everyone who finished today's board.</p>

      {loading && <p className="daily-status">Loading today's results…</p>}

      {!loading && notice && (
        <div className="daily-alert" role="alert">
          <p>{notice}</p>
          {onRetry && (
            <button type="button" className="daily-retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      {!loading && !notice && standings.length === 0 && (
        <p className="daily-status">No one has finished today's board.</p>
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
