import type { ScoredWord } from '../game/round'
import './WordList.css'

type Props = {
  words: ScoredWord[]
  flat?: boolean
}

export function WordList({ words, flat = false }: Props) {
  return (
    <ul className={flat ? 'word-list flat' : 'word-list'}>
      {words.map((item) => (
        <li key={item.word}>
          <span className="word">{item.word}</span>
          <span className="word-points">{item.points}</span>
        </li>
      ))}
    </ul>
  )
}
