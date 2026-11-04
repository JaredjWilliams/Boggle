import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { loadPlayerStats } from '../api/stats'
import { SIDE } from '../game/dice'
import { useLoaded } from '../hooks/useLoaded'
import {
  averages,
  compactNumber,
  dateRange,
  dayIndex,
  formatAverage,
  formatCount,
  formatPercent,
  formatPlayedOn,
  gamesAgainst,
  headToHead,
  leftOnNote,
  leftOnSummary,
  lengthNote,
  linearTrend,
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

type Tab = 'overview' | 'words' | 'points'
type ChartMetric = 'words' | 'score'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'words', label: 'Word insights', icon: 'words' },
  { id: 'points', label: 'Point insights', icon: 'trend' },
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
  const pageRef = useRef<HTMLElement>(null)
  const names = useMemo(() => opponentNames(games), [games])
  const [opponent, setOpponent] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [metric, setMetric] = useState<ChartMetric>('words')

  const selectedOpponent = opponent && names.includes(opponent) ? opponent : null
  const visible = useMemo(() => gamesAgainst(games, selectedOpponent), [games, selectedOpponent])
  const record = headToHead(visible, selectedOpponent)
  const summary = averages(visible)
  const rate = winRate(record)
  const solos = selectedOpponent ? 0 : visible.filter((game) => game.opponents.length === 0).length
  const bestWord = longestFound(visible)
  const lengths = wordsByLength(visible)
  const started = leftOnSummary(visible)
  const heat = startHeat(visible)
  const wordPoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.words }))
  const scorePoints = visible.map((game) => ({ id: game.id, playedOn: game.playedOn, value: game.score }))
  const dates = playDates(visible)
  const week = weekOf(dates)
  const streak = consecutiveDays(dates)
  const wordDelta = halfDelta(visible, 'words')
  const weeklyPoints = weeklyRate(scorePoints)
  const bestScore = bestGame(visible)
  const bands = scoreBands(visible)
  const bandPeak = Math.max(1, ...bands.map((band) => band.count))
  const lengthPeak = Math.max(1, ...lengths.map((row) => row.count))
  const totalWords = visible.reduce((sum, game) => sum + game.words, 0)
  const totalScore = visible.reduce((sum, game) => sum + game.score, 0)
  const playedLabel = dates.length === 1 ? 'day of wordplay' : 'days of wordplay'
  const ready = !loading && !notice

  function selectTab(next: Tab) {
    setTab(next)
    const page = pageRef.current
    if (page && typeof page.scrollTo === 'function') page.scrollTo({ top: 0 })
  }

  return (
    <main className="page stats" ref={pageRef}>
      <p className="stats-player">
        <span className="eyebrow">Your stats</span>
        <strong>{playerName}</strong>
      </p>
      <h1>
        Every game, plotted<span className="title-mark">.</span>
      </h1>
      <p className="page-lede">A little wordplay. A lot of progress. Here’s your story so far.</p>

      <StatusBlock
        loading={loading}
        loadingLabel="Loading your games…"
        notice={notice}
        onRetry={onRetry}
      />

      {ready && (
        <>
          <div className="stats-tabs" role="tablist" aria-label="Statistics views">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${item.id}-tab`}
                aria-selected={tab === item.id}
                aria-controls={`${item.id}-panel`}
                className={tab === item.id ? 'stats-tab is-selected' : 'stats-tab'}
                onClick={() => selectTab(item.id)}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="filter-row">
            <span id="against-label" className="filter-label">
              Playing against
            </span>
            <div className="filter" role="radiogroup" aria-labelledby="against-label">
              <button
                type="button"
                role="radio"
                aria-checked={selectedOpponent === null}
                className={selectedOpponent === null ? 'filter-chip is-selected' : 'filter-chip'}
                onClick={() => setOpponent(null)}
              >
                <Icon name="grid" />
                Everyone
              </button>
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selectedOpponent === name}
                  className={selectedOpponent === name ? 'filter-chip is-selected' : 'filter-chip'}
                  onClick={() => setOpponent(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="filter-count">
              {visible.length} {visible.length === 1 ? 'game' : 'games'}
            </p>
          </div>

          {tab === 'overview' && (
            <div className="overview" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
              <article className="streak-card">
                <div className="streak-top">
                  <span className="eyebrow">Look at you go</span>
                  <Icon name="flame" />
                </div>
                <p className="streak-value">
                  {dates.length}
                  <span>{playedLabel}</span>
                </p>
                <p className="streak-note">{streakNote(dates.length, streak)}</p>
                <div className="streak-days" aria-label={weekLabel(week)}>
                  {week.map((day) => (
                    <span key={day.iso} className={day.played ? 'is-played' : undefined}>
                      <i>{day.played && <Icon name="check" />}</i>
                      {day.letter}
                    </span>
                  ))}
                </div>
                <span className="streak-watermark" aria-hidden="true">
                  W
                </span>
              </article>

              <section className="words-layout" aria-labelledby="words-heading">
                <div className="summary-card">
                  <div className="summary-top">
                    <span className="metric-icon">
                      <Icon name="words" />
                    </span>
                  </div>
                  <h2 id="words-heading">Words a game</h2>
                  <p className="stat-figure">{summary.words === null ? '—' : formatAverage(summary.words)}</p>
                  <div className="metric-bottom">
                    {wordDelta !== null && (
                      <span className={wordDelta >= 0 ? 'positive' : 'negative'}>
                        <Icon name="trend" />
                        {formatDelta(wordDelta)}
                      </span>
                    )}
                    <span>{wordDelta === null ? trendNote(wordPoints, 'word') : 'vs. previous half'}</span>
                  </div>
                  {wordDelta !== null && <p className="stat-note">{trendNote(wordPoints, 'word')}</p>}
                </div>
                <div className="panel performance-panel">
                  <div className="performance-heading">
                    <div>
                      <span className="eyebrow">The big picture</span>
                      <h3>Your game is growing.</h3>
                    </div>
                    <div className="performance-switch" role="group" aria-label="Chart metric">
                      <button
                        type="button"
                        aria-pressed={metric === 'words'}
                        className={metric === 'words' ? 'is-selected' : undefined}
                        onClick={() => setMetric('words')}
                      >
                        Words
                      </button>
                      <button
                        type="button"
                        aria-pressed={metric === 'score'}
                        className={metric === 'score' ? 'is-selected' : undefined}
                        onClick={() => setMetric('score')}
                      >
                        Points
                      </button>
                    </div>
                  </div>
                  <div className="chart-summary">
                    <strong>
                      {metric === 'words'
                        ? summary.words === null
                          ? '—'
                          : formatAverage(summary.words)
                        : summary.score === null
                          ? '—'
                          : formatAverage(summary.score)}
                    </strong>
                    <span>{metric === 'words' ? 'words per game' : 'points per game'}</span>
                  </div>
                  {metric === 'words' ? (
                    <ScatterPlot label="Words found on each date" points={wordPoints} valueName="words" />
                  ) : (
                    <ScatterPlot label="Score on each date" points={scorePoints} valueName="points" />
                  )}
                </div>
              </section>

              <section className="win-layout" aria-labelledby="win-heading">
                <div className="summary-card">
                  <div className="summary-top">
                    <span className="metric-icon metric-icon-good">
                      <Icon name="trophy" />
                    </span>
                  </div>
                  <h2 id="win-heading">Win rate</h2>
                  <p className="stat-figure">
                    {rate === null ? '—' : formatPercent(rate).replace('%', '')}
                    {rate !== null && <span className="value-percent">%</span>}
                  </p>
                  <div className="metric-bottom">
                    <span className="wins-pill">
                      {record.wins} {record.wins === 1 ? 'win' : 'wins'}
                    </span>
                    <span>
                      of {playedCount(record)} {playedCount(record) === 1 ? 'matchup' : 'matchups'}
                    </span>
                  </div>
                  <p className="stat-note">{recordNote(record, solos)}</p>
                </div>
                <div className="panel win-panel" id="winning-picture">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Head to head</span>
                      <h3>The winning picture.</h3>
                    </div>
                    <Icon name="trophy" />
                  </div>
                  <div className="donut-face">
                    <PieChart record={record} />
                    <p className="donut-rate">
                      {rate === null ? '—' : formatPercent(rate).replace('%', '')}
                      {rate !== null && <small>%</small>}
                      <span>Win rate</span>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {tab === 'words' && (
            <div className="insight-stack" id="words-panel" role="tabpanel" aria-labelledby="words-tab">
              <section className="panel word-panel" aria-labelledby="longest-heading">
                <div className="panel-heading">
                  <h2 id="longest-heading">Longest word</h2>
                </div>
                <div className="longest-word">
                  <span className="eyebrow">Your longest find</span>
                  <p className={bestWord ? 'stat-figure stat-word' : 'stat-figure'}>{bestWord ? bestWord.longest : '—'}</p>
                  <p className="stat-note">{longestFoundNote(visible)}</p>
                </div>
                <div className="distribution-title">
                  <h3 id="lengths-heading">Words by length</h3>
                  <span>{lengthNote(visible)}</span>
                </div>
                <ul className="length-bars" aria-labelledby="lengths-heading">
                  {lengths.map((row) => (
                    <li key={row.length} className={row.count === 0 ? 'is-empty' : undefined}>
                      <strong>{formatCount(row.count)}</strong>
                      <span className="bar-track">
                        <span style={{ height: `${Math.max(row.count === 0 ? 6 : 12, (row.count / lengthPeak) * 100)}%` }} />
                      </span>
                      <span>
                        {row.length}+
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel" aria-labelledby="where-heading">
                <div className="panel-heading">
                  <h2 id="where-heading">Where you start</h2>
                  <Icon name="grid" />
                </div>
                <p className="card-description">Every traced word starts on a square.</p>
                {heat.cells ? (
                  <StartHeat cells={heat.cells} />
                ) : (
                  <p className="stat-figure">—</p>
                )}
                <div className="heatmap-key" aria-hidden="true">
                  <span>Fewer</span>
                  <span className="heatmap-scale" />
                  <span>More</span>
                </div>
                <p className="stat-note">{startHeatNote(heat)}</p>
              </section>

              <section className="panel" aria-labelledby="started-heading">
                <div className="panel-heading">
                  <h2 id="started-heading">Words you had started</h2>
                  <Icon name="sparkle" />
                </div>
                <p className="card-description">You had the start. Here’s what was still on the board.</p>
                <p className="stat-figure">{started.count === null ? '—' : formatCount(started.count)}</p>
                <p className="stat-note">{leftOnNote(started)}</p>
                {started.examples.length > 0 && (
                  <ul className="started-list" aria-label="Longer words left on a word you found">
                    {started.examples.map((item) => (
                      <li key={item.longer}>
                        <span className="sr-only">
                          {item.found} extended to {item.longer}, {formatCount(item.points)} points
                        </span>
                        <span className="word-extension" aria-hidden="true">
                          <span className="started-from">{item.found}</span>
                          <span className="started-arrow">→</span>
                          <strong>
                            {item.found}
                            <em>{item.longer.slice(item.found.length)}</em>
                          </strong>
                        </span>
                        <small aria-hidden="true">+{formatCount(item.points)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'points' && (
            <div className="insight-stack" id="points-panel" role="tabpanel" aria-labelledby="points-tab">
              <div className="insight-banner insight-banner-points">
                <Icon name="chart" />
                <div>
                  <strong>Every word adds up.</strong>
                  <p>
                    {formatCount(totalScore)} points across {visible.length}{' '}
                    {visible.length === 1 ? 'game' : 'games'}.
                  </p>
                </div>
              </div>

              <div className="point-summary">
                <article className="point-card">
                  <span className="metric-icon metric-icon-gold">
                    <Icon name="chart" />
                  </span>
                  <span>Best game</span>
                  <strong>{bestScore ? formatCount(bestScore.score) : '—'}</strong>
                  <small>
                    {bestScore
                      ? `${formatPlayedOn(bestScore.playedOn)}${bestScore.opponents[0] ? ` · ${bestScore.opponents[0].name}` : ''}`
                      : 'No games yet'}
                  </small>
                </article>
                <article className="point-card">
                  <span className="metric-icon metric-icon-good">
                    <Icon name="trend" />
                  </span>
                  <span>Scoring trend</span>
                  <strong>{weeklyPoints === null ? '—' : formatSignedCount(weeklyPoints)}</strong>
                  <small>{weeklyPoints === null ? 'Play another game to see a trend.' : 'points a week'}</small>
                </article>
              </div>

              <section className="panel" aria-labelledby="score-heading">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">The scoreboard</span>
                    <h2 id="score-heading">Points a game</h2>
                  </div>
                </div>
                <p className="stat-figure">{summary.score === null ? '—' : formatAverage(summary.score)}</p>
                <p className="stat-note">{trendNote(scorePoints, 'point')}</p>
                <ScatterPlot label="Score on each date" points={scorePoints} valueName="points" />
              </section>

              <section className="panel" aria-labelledby="bands-heading">
                <div className="panel-heading">
                  <h2 id="bands-heading">Where your scores land</h2>
                  <Icon name="chart" />
                </div>
                <p className="card-description">Games in this view, grouped by final score.</p>
                <div className="score-bands">
                  {bands.map((band) => (
                    <div key={band.label}>
                      <span>
                        <strong>{band.label}</strong>
                        <small>
                          {band.count} {band.count === 1 ? 'game' : 'games'}
                        </small>
                      </span>
                      <i>
                        <b style={{ width: `${(band.count / bandPeak) * 100}%` }} />
                      </i>
                    </div>
                  ))}
                </div>
                <p className="stat-note">
                  {formatCount(totalWords)} words · {dateRange(dates) || 'No games in this view.'}
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function recordNote(record: { wins: number; losses: number; ties: number }, solos: number): string {
  const played = playedCount(record)
  const result = played === 0 ? 'No head-to-head games yet.' : `${played} games with another player.`
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

type IconName = 'chart' | 'words' | 'trend' | 'flame' | 'trophy' | 'grid' | 'sparkle' | 'check'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    chart: (
      <>
        <path d="M4 3v18h17" />
        <path d="M8 16v-4m5 4V8m5 8V4" />
      </>
    ),
    words: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
        <path d="M16 3h5v5M3 16v5h5" />
      </>
    ),
    trend: (
      <>
        <path d="m3 16 6-6 4 4 8-9" />
        <path d="M15 5h6v6" />
      </>
    ),
    flame: <path d="M12 3c1 5-5 5-4 10 1-1 2-2 3-2-1 3 1 4 2 5 3-2 4-5 3-8 7 8 3 14-4 14C4 22 1 14 7 7c0 3 1 3 1 3 0-4 4-4 4-7Z" />,
    trophy: (
      <>
        <path d="M8 3h8v7a4 4 0 0 1-8 0V3Z" />
        <path d="M12 14v5m-5 2h10M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    sparkle: <path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z" />,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return (
    <svg className="stats-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function playDates(games: readonly GameStat[]): string[] {
  return [...new Set(games.map((game) => game.playedOn.slice(0, 10)))].sort()
}

function isoFromDayIndex(index: number): string {
  const date = new Date(index * 86_400_000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekOf(dates: readonly string[]): { iso: string; letter: string; played: boolean }[] {
  const today = new Date().toISOString().slice(0, 10)
  const end = dates.length > 0 ? dayIndex(dates[dates.length - 1]) : dayIndex(today)
  const played = new Set(dates)
  return Array.from({ length: 7 }, (_, offset) => {
    const iso = isoFromDayIndex(end - 6 + offset)
    return { iso, letter: WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()], played: played.has(iso) }
  })
}

function consecutiveDays(dates: readonly string[]): number {
  if (dates.length === 0) return 0
  const played = new Set(dates)
  let cursor = dayIndex(dates[dates.length - 1])
  let count = 0
  while (played.has(isoFromDayIndex(cursor))) {
    count += 1
    cursor -= 1
  }
  return count
}

function streakNote(days: number, streak: number): string {
  if (days === 0) return 'Play a game and this starts counting.'
  if (streak > 1) return `${streak} days in a row.`
  return 'A little better, every time you play.'
}

function weekLabel(week: readonly { played: boolean }[]): string {
  const played = week.filter((day) => day.played).length
  if (played === week.length) return 'Played every day this week'
  return `Played ${played} of the last 7 days`
}

function halfDelta(games: readonly GameStat[], field: 'words' | 'score'): number | null {
  if (games.length < 2) return null
  const ordered = [...games].sort(
    (left, right) => left.playedOn.localeCompare(right.playedOn) || left.id.localeCompare(right.id),
  )
  const split = Math.floor(ordered.length / 2)
  const earlier = ordered.slice(0, split)
  const recent = ordered.slice(split)
  if (earlier.length === 0 || recent.length === 0) return null
  const average = (rows: readonly GameStat[]) => rows.reduce((sum, game) => sum + game[field], 0) / rows.length
  return average(recent) - average(earlier)
}

function weeklyRate(points: readonly { playedOn: string; value: number }[]): number | null {
  if (points.length < 2) return null
  const fit = linearTrend(
    points.map((point) => dayIndex(point.playedOn)),
    points.map((point) => point.value),
  )
  if (!fit) return null
  return fit.slope * 7
}

function formatSignedCount(value: number): string {
  const rounded = Math.round(value)
  const shown = Math.abs(rounded).toLocaleString('en-US')
  if (rounded > 0) return `+${shown}`
  if (rounded < 0) return `-${shown}`
  return '0'
}

function formatDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const shown = rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
  return rounded > 0 ? `+${shown}` : shown
}

function bestGame(games: readonly GameStat[]): GameStat | null {
  if (games.length === 0) return null
  return [...games].sort(
    (left, right) => right.score - left.score || right.playedOn.localeCompare(left.playedOn),
  )[0]
}

function scoreBands(games: readonly GameStat[]): { label: string; count: number }[] {
  const max = games.reduce((peak, game) => Math.max(peak, game.score), 0)
  const step = max >= 30_000 ? 10_000 : max >= 12_000 ? 5_000 : 1_000
  const edges = [step, step * 2, step * 3]
  const label = (value: number) => compactNumber(value)
  return [
    { label: `Under ${label(edges[0])}`, count: games.filter((game) => game.score < edges[0]).length },
    {
      label: `${label(edges[0])}–${label(edges[1])}`,
      count: games.filter((game) => game.score >= edges[0] && game.score < edges[1]).length,
    },
    {
      label: `${label(edges[1])}–${label(edges[2])}`,
      count: games.filter((game) => game.score >= edges[1] && game.score < edges[2]).length,
    },
    { label: `${label(edges[2])}+`, count: games.filter((game) => game.score >= edges[2]).length },
  ]
}
