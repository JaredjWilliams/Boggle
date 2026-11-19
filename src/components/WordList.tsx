import { type WordTone, type WordToneStop } from '../game/match'
import type { ScoredWord } from '../game/round'
import './WordList.css'

type Props = {
  words: ScoredWord[]
  flat?: boolean
  scores?: boolean
  selected?: string | null
  onSelect?: (word: string) => void
  tones?: ReadonlyMap<string, WordTone>
}

export function WordList({
  words,
  flat = false,
  scores = true,
  selected = null,
  onSelect,
  tones,
}: Props) {
  return (
    <ul className={flat ? 'word-list flat' : 'word-list'}>
      {words.map((item) => {
        const dots = toneDots(tones?.get(item.word))
        const label = (
          <>
            <span className="word">{item.word}</span>
            {dots.length > 0 && (
              <span className="word-finders" aria-hidden="true">
                {dots.map((stop, index) => (
                  <span key={`${stop}-${index}`} className={dotClass(stop)} />
                ))}
              </span>
            )}
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

function toneDots(tone: WordTone | undefined): WordToneStop[] {
  if (!tone || tone.kind === 'missed') return []
  if (tone.kind === 'you') return ['you']
  if (tone.kind === 'opponent') return [tone.index]
  return [...tone.stops]
}

function dotClass(stop: WordToneStop): string {
  if (stop === 'you') return 'word-dot is-you'
  return `word-dot is-opp-${stop}`
}
