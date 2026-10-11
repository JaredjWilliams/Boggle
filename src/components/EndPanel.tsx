import type { ScoredWord } from '../game/round'
import { WordList } from './WordList'
import './EndPanel.css'

type Props = {
  score: number
  found: ScoredWord[]
  missed: ScoredWord[]
}

export function EndPanel({ score, found, missed }: Props) {
  return (
    <section className="end-panel">
      <p className="end-score">
        Score <strong>{score}</strong>
      </p>
      <h2>Your words</h2>
      {found.length === 0 ? (
        <p className="empty">None</p>
      ) : (
        <WordList words={found} flat />
      )}
      <h2>Missed words</h2>
      {missed.length === 0 ? (
        <p className="empty">No missed words.</p>
      ) : (
        <WordList words={missed} flat />
      )}
    </section>
  )
}
