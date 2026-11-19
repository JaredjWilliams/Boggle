import type { ReactNode } from 'react'
import type { ScoredWord } from '../game/round'
import { WordList } from './WordList'
import './EndPanel.css'

type Props = {
  score: number
  found: ScoredWord[]
  missed: ScoredWord[]
  onPlayAgain: () => void
  send?: ReactNode
}

export function EndPanel({ score, found, missed, onPlayAgain, send }: Props) {
  return (
    <section className="summary">
      <div className="summary-top">
        <div>
          <p className="summary-kicker">Time's up</p>
          <div className="summary-figures">
            <p className="summary-score">
              <span className="label">Score</span>
              <strong>{score}</strong>
            </p>
            <p className="summary-score">
              <span className="label">Words</span>
              <strong>{found.length}</strong>
            </p>
          </div>
        </div>
        <div className="summary-actions">
          {send}
          <button type="button" className="play-again" onClick={onPlayAgain}>
            Play again
          </button>
        </div>
      </div>

      <div className="summary-columns">
        <WordColumn title="Your words" words={found} empty="None this round." />
        <WordColumn
          title="Possible words"
          words={missed}
          empty="You found every word."
        />
      </div>
    </section>
  )
}

function WordColumn({
  title,
  words,
  empty,
}: {
  title: string
  words: ScoredWord[]
  empty: string
}) {
  return (
    <section className="summary-column">
      <h2>{title}</h2>
      <div className="summary-scroll">
        {words.length === 0 ? (
          <p className="empty">{empty}</p>
        ) : (
          <WordList words={words} flat />
        )}
      </div>
    </section>
  )
}
