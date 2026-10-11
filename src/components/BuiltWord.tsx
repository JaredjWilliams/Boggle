import type { AttemptFeedback } from '../hooks/useRound'
import './BuiltWord.css'

type Props = {
  traced: string
  feedback: AttemptFeedback | null
}

export function BuiltWord({ traced, feedback }: Props) {
  const showingResult = traced.length === 0 && feedback != null
  const word = showingResult ? feedback.word : traced
  const kind = showingResult ? feedback.kind : null
  const points =
    showingResult && feedback.points > 0 ? feedback.points : null

  return (
    <div className="built-slot">
      <p
        key={showingResult ? feedback.id : 'trace'}
        className={kind ? `built built-${kind}` : 'built'}
        data-testid={showingResult ? 'attempt' : undefined}
        aria-hidden={showingResult ? true : undefined}
      >
        <span className="built-word">{word || '\u00a0'}</span>
        {points != null && (
          <span className="built-points">
            {kind === 'new' ? `+${points}` : points}
          </span>
        )}
      </p>
    </div>
  )
}
