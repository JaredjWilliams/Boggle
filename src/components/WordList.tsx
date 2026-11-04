import type { ScoredWord } from '../game/round'
import './WordList.css'

type Props = {
  words: ScoredWord[]
  flat?: boolean
  scores?: boolean
  selected?: string | null
  onSelect?: (word: string) => void
}

export function WordList({ words, flat = false, scores = true, selected = null, onSelect }: Props) {
  return (
    <ul className={flat ? 'word-list flat' : 'word-list'}>
      {words.map((item) => {
        const label = (
          <>
            <span className="word">{item.word}</span>
            {scores && <span className="word-points">{item.points}</span>}
          </>
        )
        return (
          <li key={item.word}>
            {onSelect ? (
              <button
                type="button"
                className="word-pick"
                aria-pressed={selected === item.word}
                onClick={() => onSelect(item.word)}
              >
                {label}
              </button>
            ) : (
              label
            )}
          </li>
        )
      })}
    </ul>
  )
}
