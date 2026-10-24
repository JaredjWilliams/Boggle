import { useState, type CSSProperties } from 'react'
import { ARTICLES, type Article, type ArticleBars, type ArticleBlock, type ArticleHeat } from '../learn/articles'
import './LearnScreen.css'

type Props = {
  articles?: readonly Article[]
}

export function LearnScreen({ articles = ARTICLES }: Props) {
  const [articleId, setArticleId] = useState<string | null>(null)
  const article = articles.find((item) => item.id === articleId) ?? null

  if (article) {
    return <ArticleView article={article} onBack={() => setArticleId(null)} />
  }

  return (
    <main className="learn">
      <h1>Learn</h1>
      <p className="learn-lede">Short reads on what the data is saying.</p>
      {articles.length === 0 ? (
        <p className="learn-empty">No articles yet.</p>
      ) : (
        <ul className="article-list">
          {articles.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setArticleId(item.id)}>
                <span className="article-card-title">{item.title}</span>
                <span className="article-card-summary">{item.summary}</span>
                <span className="article-card-time">{readTime(item.minutes)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  return (
    <main className="learn">
      <button type="button" className="article-back" onClick={onBack}>
        All articles
      </button>
      <article className="article">
        <p className="article-kicker">{readTime(article.minutes)}</p>
        <h1>{article.title}</h1>
        <p className="learn-lede">{article.summary}</p>
        {article.blocks.map((block, index) => (
          <ArticleBlockView key={index} block={block} />
        ))}
      </article>
    </main>
  )
}

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  if (block.kind === 'h') return <h2>{block.text}</h2>
  if (block.kind === 'p') return <p>{block.text}</p>
  if (block.kind === 'list') {
    return (
      <ul className="article-points">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  if (block.kind === 'bars') return <BarChart block={block} />
  if (block.kind === 'heat') return <HeatMap block={block} />

  return (
    <table className="article-table">
      <caption>{block.caption}</caption>
      <thead>
        <tr>
          {block.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, index) => (
          <tr key={row.join('|')} className={block.emphasis.includes(index) ? 'is-emphasis' : undefined}>
            {row.map((cell, cellIndex) => (
              <td key={`${cellIndex}-${cell}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BarChart({ block }: { block: ArticleBars }) {
  const max = Math.max(...block.bars.map((bar) => bar.value), block.mark?.value ?? 0, 1)
  const compact = block.direction === 'up'

  if (block.direction === 'across') {
    return (
      <figure className="article-chart" aria-label={block.caption}>
        <figcaption>{block.caption}</figcaption>
        <div className="article-hbars">
          {block.bars.map((bar) => (
            <div key={bar.label} className={bar.emphasis ? 'article-hbar is-emphasis' : 'article-hbar'}>
              <span className="article-hbar-label">{bar.label}</span>
              <span className="article-hbar-track">
                <span
                  className="article-hbar-fill"
                  style={{ '--share': bar.value / max } as CSSProperties}
                />
              </span>
              <span className="article-hbar-value">{formatChartValue(bar.value, compact)}</span>
            </div>
          ))}
        </div>
        <p className="article-chart-note">{block.summary}</p>
      </figure>
    )
  }

  return (
    <figure className="article-chart" aria-label={block.caption}>
      <figcaption>{block.caption}</figcaption>
      <div className="article-plot" style={{ '--count': block.bars.length } as CSSProperties}>
        {block.mark && (
          <div className="article-mark" style={{ '--share': block.mark.value / max } as CSSProperties}>
            <span>{block.mark.label}</span>
          </div>
        )}
        {block.bars.map((bar) => (
          <div key={bar.label} className={bar.emphasis ? 'article-column is-emphasis' : 'article-column'}>
            <span className="article-column-value">{formatChartValue(bar.value, compact)}</span>
            <span className="article-column-bar" style={{ '--share': bar.value / max } as CSSProperties} />
            <span className="article-column-name">{bar.label}</span>
          </div>
        ))}
      </div>
      <p className="article-chart-note">{block.summary}</p>
    </figure>
  )
}

function HeatMap({ block }: { block: ArticleHeat }) {
  const low = Math.min(...block.cells)
  const high = Math.max(...block.cells)
  const span = high - low || 1

  return (
    <figure className="article-chart" aria-label={block.caption}>
      <figcaption>{block.caption}</figcaption>
      <div className="article-heat">
        {block.cells.map((value, index) => {
          const row = Math.floor(index / 5) + 1
          const column = (index % 5) + 1
          const mix = Math.round(((value - low) / span) * 72 + 8)
          return (
            <div
              key={`${row}-${column}`}
              className="article-heat-cell"
              style={{ '--mix': `${mix}%` } as CSSProperties}
              aria-label={`Row ${row}, column ${column}, ${value.toFixed(1)} words`}
            >
              {value.toFixed(1)}
            </div>
          )
        })}
      </div>
      <p className="article-chart-note">{block.summary}</p>
    </figure>
  )
}

function formatChartValue(value: number, compact: boolean): string {
  if (compact && value >= 1000) return `${Math.round(value / 1000)}k`
  return Math.round(value).toLocaleString('en-US')
}

function readTime(minutes: number): string {
  return `${minutes} min read`
}
