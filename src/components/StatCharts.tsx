import { useId } from 'react'
import {
  compactNumber,
  dateRange,
  dayIndex,
  formatCount,
  formatPlayedOn,
  axisMax,
  linearTrend,
  type HeadToHead,
} from '../stats/series'

export type PlotPoint = {
  id: string
  playedOn: string
  value: number
}

const WIDTH = 320
const HEIGHT = 200
const PAD = { top: 16, right: 12, bottom: 32, left: 42 }

const PIE = 120
const PIE_RADIUS = 52

export function ScatterPlot({
  label,
  points,
  valueName,
}: {
  label: string
  points: readonly PlotPoint[]
  valueName: string
}) {
  const gradientId = `trend-${useId().replace(/:/g, '')}`
  const ordered = [...points].sort(
    (left, right) => dayIndex(left.playedOn) - dayIndex(right.playedOn) || left.id.localeCompare(right.id),
  )
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const range = dateRange(ordered.map((point) => point.playedOn))

  if (ordered.length === 0) {
    return (
      <figure className="chart-block">
        <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label}. No games.`}>
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="chart-empty">
            No games yet
          </text>
        </svg>
      </figure>
    )
  }

  const indexes = ordered.map((point) => dayIndex(point.playedOn))
  const minIndex = indexes[0]
  const maxIndex = indexes[indexes.length - 1]
  const fit = linearTrend(indexes, ordered.map((point) => point.value))
  const trendStart = fit ? fit.intercept + fit.slope * minIndex : 0
  const trendEnd = fit ? fit.intercept + fit.slope * maxIndex : 0
  const max = axisMax(Math.max(0, ...ordered.map((point) => point.value), trendStart, trendEnd))

  function xFor(iso: string): number {
    const inner = plotWidth - 16
    if (maxIndex === minIndex) return PAD.left + plotWidth / 2
    const t = (dayIndex(iso) - minIndex) / (maxIndex - minIndex)
    return PAD.left + 8 + t * inner
  }

  function yFor(value: number): number {
    const clamped = Math.min(max, Math.max(0, value))
    return PAD.top + plotHeight - (clamped / max) * plotHeight
  }

  const seen = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const point of ordered) counts.set(point.playedOn, (counts.get(point.playedOn) ?? 0) + 1)

  const sameDay = maxIndex === minIndex
  const trendX1 = sameDay ? PAD.left + 8 : xFor(ordered[0].playedOn)
  const trendX2 = sameDay ? WIDTH - PAD.right - 8 : xFor(ordered[ordered.length - 1].playedOn)
  const trendY1 = yFor(trendStart)
  const trendY2 = yFor(trendEnd)
  const base = yFor(0)
  const ticks = [0, max / 2, max]
  const span = maxIndex - minIndex
  const middle = ordered[Math.floor(ordered.length / 2)]
  const labels = span >= 10 ? [ordered[0], middle, ordered[ordered.length - 1]] : [ordered[0], ordered[ordered.length - 1]]
  const uniqueLabels = labels.filter(
    (point, index, list) => list.findIndex((item) => item.playedOn === point.playedOn) === index,
  )

  return (
    <figure className="chart-block">
      <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e15a2d" stopOpacity="0.18" />
            <stop offset="1" stopColor="#e15a2d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className={tick === 0 ? 'chart-axis' : 'chart-grid'}
            />
            <text x={PAD.left - 8} y={yFor(tick)} textAnchor="end" dominantBaseline="middle" className="chart-label">
              {compactNumber(tick)}
            </text>
          </g>
        ))}
        {fit && ordered.length > 1 && (
          <>
            <polygon
              points={`${trendX1},${base} ${trendX1},${trendY1} ${trendX2},${trendY2} ${trendX2},${base}`}
              fill={`url(#${gradientId})`}
            />
            <line
              data-testid="trend-line"
              x1={trendX1}
              y1={trendY1}
              x2={trendX2}
              y2={trendY2}
              className="trend-line"
            />
          </>
        )}
        {ordered.map((point) => {
          const slot = seen.get(point.playedOn) ?? 0
          seen.set(point.playedOn, slot + 1)
          const count = counts.get(point.playedOn) ?? 1
          const offset = (slot - (count - 1) / 2) * 8
          const cx = xFor(point.playedOn) + offset
          const cy = yFor(point.value)
          return (
            <g key={point.id}>
              <title>{`${formatPlayedOn(point.playedOn)}: ${formatCount(point.value)} ${valueName}`}</title>
              <circle cx={cx} cy={cy} r="7" className="plot-halo" />
              <circle cx={cx} cy={cy} r="3.6" className="plot-dot" />
            </g>
          )
        })}
        {uniqueLabels.map((point, index) => {
          const anchor =
            uniqueLabels.length === 1
              ? 'middle'
              : index === 0
                ? 'start'
                : index === uniqueLabels.length - 1
                  ? 'end'
                  : 'middle'
          return (
            <text
              key={point.playedOn}
              x={xFor(point.playedOn)}
              y={HEIGHT - 8}
              textAnchor={anchor}
              className="chart-label"
            >
              {formatPlayedOn(point.playedOn)}
            </text>
          )
        })}
      </svg>
      {range && <figcaption className="chart-range">{range}</figcaption>}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{valueName}</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((point) => (
            <tr key={point.id}>
              <td>{formatPlayedOn(point.playedOn)}</td>
              <td>{formatCount(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

const SLICE_COLORS = {
  wins: '#e15a2d',
  losses: '#1b2838',
  ties: '#c6a15a',
} as const

export function PieChart({ record }: { record: HeadToHead }) {
  const slices = [
    { key: 'wins' as const, label: 'Wins', count: record.wins },
    { key: 'losses' as const, label: 'Losses', count: record.losses },
    { key: 'ties' as const, label: 'Ties', count: record.ties },
  ]
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  const drawn = slices.filter((slice) => slice.count > 0)
  const summary =
    total === 0
      ? 'Win rate. No games against another player.'
      : `Win rate. ${record.wins} wins, ${record.losses} losses, ${record.ties} ties.`

  let angle = -Math.PI / 2
  const paths = drawn.map((slice) => {
    const sweep = (slice.count / total) * Math.PI * 2
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...slice, start, end }
  })

  return (
    <div className="pie-layout">
      <svg className="pie" viewBox={`0 0 ${PIE} ${PIE}`} role="img" aria-label={summary}>
        {total === 0 && (
          <circle cx={PIE / 2} cy={PIE / 2} r={PIE_RADIUS} className="pie-empty" />
        )}
        {drawn.length === 1 && (
          <circle cx={PIE / 2} cy={PIE / 2} r={PIE_RADIUS} fill={SLICE_COLORS[drawn[0].key]} />
        )}
        {drawn.length > 1 &&
          paths.map((slice) => (
            <path
              key={slice.key}
              data-testid={`slice-${slice.key}`}
              d={slicePath(PIE / 2, PIE / 2, PIE_RADIUS, slice.start, slice.end)}
              fill={SLICE_COLORS[slice.key]}
            />
          ))}
      </svg>
      <ul className="legend">
        {slices.map((slice) => {
          const share = total === 0 ? 0 : Math.round((slice.count / total) * 100)
          return (
            <li key={slice.key}>
              <span className="swatch" style={{ background: SLICE_COLORS[slice.key] }} />
              <span>{slice.label}</span>
              <small>
                {slice.count} · {share}%
              </small>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function slicePath(cx: number, cy: number, radius: number, start: number, end: number): string {
  const x1 = cx + radius * Math.cos(start)
  const y1 = cy + radius * Math.sin(start)
  const x2 = cx + radius * Math.cos(end)
  const y2 = cy + radius * Math.sin(end)
  const large = end - start > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
}
