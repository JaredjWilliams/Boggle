import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { loadPlayerStats } from '../api/stats'
import { SIDE } from '../game/dice'
import { useLoaded } from '../hooks/useLoaded'
import {
  averages,
  formatAverage,
  formatCount,
  formatPercent,
  gamesAgainst,
  headToHead,
  leftOnNote,
  leftOnSummary,
  lengthNote,
  longestFound,
  longestFoundNote,
  opponentNames,
  playedCount,
  startHeat,
  startHeatNote,
  trendNote,
  winRate,
  wordsByLength,
  type GameStat,
} from '../stats/series'
import { PieChart, ScatterPlot } from './StatCharts'
import { StatusBlock } from './StatusBlock'
import './StatsScreen.css'

type Props = {
  playerName: string
  games: readonly GameStat[]
  loading: boolean
  notice: string
  onRetry?: () => void
}

export function PlayerStats({ playerId, playerName }: { playerId: string; playerName: string }) {
  const stats = useLoaded(() => loadPlayerStats(playerId), [] as GameStat[], 'Could not load your stats.', [
    playerId,
  ])

  return (
    <StatsScreen
      playerName={playerName}
      games={stats.data}
      loading={stats.loading}
      notice={stats.notice}
      onRetry={stats.reload}
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
  const lengths = wordsByLength(visible)
  const started = leftOnSummary(visible)
  const heat = startHeat(visible)
  const wordPoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.words }))
  const scorePoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.score }))

  return (
    <main className="page stats">
      <p className="stats-player">
        <span>Your stats</span>
        <strong>{playerName}</strong>
      </p>
      <h1>Every game, plotted.</h1>
      <p className="page-lede">
        Each dot is one game on the day you played it. Choose a player to see that same record
        head to head.
      </p>

      <StatusBlock
        loading={loading}
        loadingLabel="Loading your games…"
        notice={notice}
        onRetry={onRetry}
      />

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

          <section className="stat-card" aria-labelledby="lengths-heading">
            <h2 id="lengths-heading">Words by length</h2>
            <ul className="length-counts" aria-label="Words found at each length">
              {lengths.map((row) => (
                <li key={row.length} className={row.count === 0 ? 'is-empty' : undefined}>
                  <span>{row.length}+</span>
                  <strong>{formatCount(row.count)}</strong>
                </li>
              ))}
            </ul>
            <p className="stat-note">{lengthNote(visible)}</p>
          </section>

          <section className="stat-card" aria-labelledby="where-heading">
            <h2 id="where-heading">Where you start</h2>
            {heat.cells ? (
              <StartHeat cells={heat.cells} />
            ) : (
              <p className="stat-figure">—</p>
            )}
            <p className="stat-note">{startHeatNote(heat)}</p>
          </section>

          <section className="stat-card" aria-labelledby="started-heading">
            <h2 id="started-heading">Words you had started</h2>
            <p className="stat-figure">{started.count === null ? '—' : formatCount(started.count)}</p>
            <p className="stat-note">{leftOnNote(started)}</p>
            {started.examples.length > 0 && (
              <ul className="started-list" aria-label="Longer words left on a word you found">
                {started.examples.map((item) => (
                  <li key={item.longer}>
                    <span className="sr-only">
                      {item.found} extended to {item.longer}, {formatCount(item.points)} points
                    </span>
                    <span className="started-from" aria-hidden="true">
                      {item.found}
                    </span>
                    <span className="started-arrow" aria-hidden="true">
                      →
                    </span>
                    <strong aria-hidden="true">{item.longer}</strong>
                    <small aria-hidden="true">{formatCount(item.points)}</small>
                  </li>
                ))}
              </ul>
            )}
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
  return `${result} ${soloLabel} on the words, score, longest-word, length, where-you-start, and started-word cards.`
}

function StartHeat({ cells }: { cells: readonly number[] }) {
  const low = Math.min(...cells)
  const high = Math.max(...cells)
  const span = high - low || 1

  return (
    <figure className="start-heat" aria-label="Where traced words started">
      {cells.map((value, index) => {
        const row = Math.floor(index / SIDE) + 1
        const column = (index % SIDE) + 1
        const mix = Math.round(((value - low) / span) * 72 + 8)
        return (
          <div
            key={`${row}-${column}`}
            className="start-heat-cell"
            style={{ '--mix': `${mix}%` } as CSSProperties}
            aria-label={`Row ${row}, column ${column}, ${value.toFixed(1)} words`}
          >
            {value.toFixed(1)}
          </div>
        )
      })}
    </figure>
  )
}
