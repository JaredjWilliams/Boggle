import { useEffect, useRef, useState } from 'react'
import { advanceScore } from '../game/words'
import './StatusBar.css'

type Props = {
  secondsLeft: number
  score: number
  onShake: () => void
  shakeDisabled: boolean
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

function useCountingScore(target: number): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (target === shownRef.current) return
    if (target < shownRef.current || prefersReducedMotion()) {
      shownRef.current = target
      setShown(target)
      return
    }

    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = advanceScore(shownRef.current, target, now - last)
      last = now
      shownRef.current = next
      setShown(next)
      if (next < target) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return shown
}

export function StatusBar({
  secondsLeft,
  score,
  onShake,
  shakeDisabled,
}: Props) {
  const shownScore = useCountingScore(score)

  return (
    <div className="status">
      <p className="timer">
        <span className="label">Time</span>
        <strong>{formatTime(secondsLeft)}</strong>
      </p>
      <p className="score">
        <span className="label">Score</span>
        <strong>{shownScore}</strong>
      </p>
      <button
        type="button"
        className="shake"
        onClick={onShake}
        disabled={shakeDisabled}
      >
        Shake
      </button>
    </div>
  )
}
