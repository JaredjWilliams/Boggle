import { useEffect, useMemo, useState } from 'react'
import { loadPlayerStats } from '../data/stats'
import {
  averages,
  formatAverage,
  formatPercent,
  gamesAgainst,
  headToHead,
  longestFound,
  longestFoundNote,
  opponentNames,
  playedCount,
  trendNote,
  winRate,
  type GameStat,
} from '../stats/series'
import { PieChart, ScatterPlot } from './StatCharts'
import './StatsScreen.css'

type Props = {
  playerName: string
  games: readonly GameStat[]
  loading: boolean
  notice: string
  onRetry?: () => void
}

export function PlayerStats({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [games, setGames] = useState<GameStat[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setNotice('')
    void loadPlayerStats(playerId)
      .then((next) => {
        if (!cancel) setGames(next)
      })
      .catch((error: unknown) => {
        if (!cancel) setNotice(error instanceof Error ? error.message : 'Could not load your stats.')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [attempt, playerId])

  return (
    <StatsScreen
      playerName={playerName}
      games={games}
      loading={loading}
      notice={notice}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  )
}

export function StatsScreen({ playerName, games, loading, notice, onRetry }: Props) {
  const names = useMemo(() => opponentNames(games), [games])
  const [opponent, setOpponent] = useState<string | null>(null)

  useEffect(() => {
    if (opponent && !names.includes(opponent)) setOpponent(null)
  }, [names, opponent])

  const visible = useMemo(() => gamesAgainst(games, opponent), [games, opponent])
  const record = headToHead(visible, opponent)
  const summary = averages(visible)
  const rate = winRate(record)
  const solos = opponent ? 0 : visible.filter((game) => game.opponents.length === 0).length
  const bestWord = longestFound(visible)
  const wordPoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.words }))
  const scorePoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.score }))

  return (
    <main className="stats">
      <p className="stats-player">
        <span>Your stats</span>
        <strong>{playerName}</strong>
      </p>
      <h1>Every game, plotted.</h1>
      <p className="stats-lede">
        Each dot is one game on the day you played it. Choose a player to see that same record
        head to head.
      </p>

      {loading && <p className="stats-status">Loading your games…</p>}

      {notice && (
        <div className="stats-alert" role="alert">
          <p>{notice}</p>
          {onRetry && (
            <button type="button" className="stats-retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      {!loading && !notice && (
        <>
          <h2 id="against-label">Against</h2>
          <div className="filter" role="radiogroup" aria-labelledby="against-label">
            <button
              type="button"
              role="radio"
              aria-checked={opponent === null}
              className={opponent === null ? 'filter-chip is-selected' : 'filter-chip'}
              onClick={() => setOpponent(null)}
            >
              Everyone
            </button>
            {names.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={opponent === name}
                className={opponent === name ? 'filter-chip is-selected' : 'filter-chip'}
                onClick={() => setOpponent(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <section className="stat-card" aria-labelledby="words-heading">
            <h2 id="words-heading">Words a game</h2>
            <p className="stat-figure">{summary.words === null ? '—' : formatAverage(summary.words)}</p>
            <p className="stat-note">{trendNote(wordPoints, 'word')}</p>
            <ScatterPlot label="Words found on each date" points={wordPoints} valueName="words" />
          </section>

          <section className="stat-card" aria-labelledby="longest-heading">
            <h2 id="longest-heading">Longest word</h2>
            <p className={bestWord ? 'stat-figure stat-word' : 'stat-figure'}>
              {bestWord ? bestWord.longest : '—'}
            </p>
            <p className="stat-note">{longestFoundNote(visible)}</p>
          </section>

          <section className="stat-card" aria-labelledby="score-heading">
            <h2 id="score-heading">Points a game</h2>
            <p className="stat-figure">{summary.score === null ? '—' : formatAverage(summary.score)}</p>
            <p className="stat-note">{trendNote(scorePoints, 'point')}</p>
            <ScatterPlot label="Score on each date" points={scorePoints} valueName="points" />
          </section>

          <section className="stat-card" aria-labelledby="win-heading">
            <h2 id="win-heading">Win rate</h2>
            <p className="stat-figure">{rate === null ? '—' : formatPercent(rate)}</p>
            <p className="stat-note">{recordNote(record, solos)}</p>
            <PieChart record={record} />
          </section>
        </>
      )}
    </main>
  )
}

function recordNote(
  record: { wins: number; losses: number; ties: number },
  solos: number,
): string {
  const played = playedCount(record)
  const result =
    played === 0 ? 'No head-to-head games yet.' : `${played} games with another player.`
  if (solos === 0) return result
  const soloLabel = solos === 1 ? '1 solo game stays' : `${solos} solo games stay`
  return `${result} ${soloLabel} on the words, score, and longest-word cards.`
}
