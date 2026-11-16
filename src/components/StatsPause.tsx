import { useEffect, useRef } from 'react'
import './StatsPause.css'

export function StatsPause({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="stats-pause">
      <button type="button" className="stats-pause-scrim" aria-label="Close" onClick={onClose} />
      <section className="stats-pause-card" role="dialog" aria-modal="true" aria-labelledby="stats-pause-title">
        <h2 id="stats-pause-title">Stats are taking a break</h2>
        <p>
          Your charts need every word from every game. That pile gets bigger each time you play, and it was
          getting too heavy to open. Your games are still saved. Stats will be back once we can show them
          without carrying all of that.
        </p>
        <button ref={closeRef} type="button" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  )
}
