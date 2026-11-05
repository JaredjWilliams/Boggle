import { useCallback, useEffect, useRef, useState, type AnimationEvent } from 'react'
import { pickMissedWord, wordKindLabel, type MissedWord } from '../learn/missedWords'
import './WordSpotlight.css'

export const WORD_ROTATE_MS = 7000

type LeavingWord = {
  id: number
  word: MissedWord
}

export function WordSpotlight() {
  const [spotlight, setSpotlight] = useState<MissedWord>(() => pickMissedWord())
  const [leaving, setLeaving] = useState<LeavingWord | null>(null)
  const leaveId = useRef(0)

  const showAnotherWord = useCallback(() => {
    const next = pickMissedWord(undefined, spotlight.word)
    if (canAnimate()) {
      const id = leaveId.current + 1
      leaveId.current = id
      setLeaving({ id, word: spotlight })
    }
    setSpotlight(next)
  }, [spotlight])

  useEffect(() => {
    const timer = window.setInterval(showAnotherWord, WORD_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [showAnotherWord])

  function onWordLeave(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const id = Number(event.currentTarget.dataset.leaveId)
    setLeaving((current) => (current?.id === id ? null : current))
  }

  return (
    <section className="missed-word" aria-label="Often missed">
      <div className="missed-word-bar">
        <p className="missed-word-kicker">Commonly missed</p>
        <button type="button" className="missed-word-next" onClick={showAnotherWord}>
          New word
        </button>
      </div>
      <div className="missed-word-stage">
        {leaving && (
          <div
            className="missed-word-card is-leaving"
            aria-hidden="true"
            data-leave-id={leaving.id}
            onAnimationEnd={onWordLeave}
          >
            <MissedWordBody word={leaving.word} />
          </div>
        )}
        <div className={leaving ? 'missed-word-card is-entering' : 'missed-word-card'} aria-live="polite">
          <MissedWordBody word={spotlight} heading />
        </div>
      </div>
    </section>
  )
}

function MissedWordBody({ word, heading = false }: { word: MissedWord; heading?: boolean }) {
  const Title = heading ? 'h1' : 'p'

  return (
    <div className="missed-word-body">
      <Title className="missed-word-title">{word.word}</Title>
      <p className="missed-word-kind">{wordKindLabel(word.kind)}</p>
      <p className="missed-word-def">{word.definition}</p>
    </div>
  )
}

function canAnimate(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false
  return typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.animate === 'function'
}
