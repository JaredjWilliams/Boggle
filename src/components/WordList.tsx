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
          <span>{item.word}</span>
          <span className="points">{item.points}</span>
        </li>
      ))}
    </ul>
  )
}
