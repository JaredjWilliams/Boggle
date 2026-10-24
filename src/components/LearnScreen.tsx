import { useState } from 'react'
import { ARTICLES, type Article, type ArticleBlock } from '../learn/articles'
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

function readTime(minutes: number): string {
  return `${minutes} min read`
}
