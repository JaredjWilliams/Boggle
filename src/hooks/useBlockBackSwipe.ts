import { useEffect } from 'react'

const GUARD = 'boggleRound'
// The browser back gesture starts in a strip along the left edge.
const EDGE_PX = 32

let holders = 0
let releaseId = 0

function isRoundGuard(state: unknown): boolean {
  if (typeof state !== 'object' || state === null || !(GUARD in state)) return false
  return (state as Record<string, unknown>)[GUARD] === true
}

// Drop the guard entry after the round ends. Deferred so a strict-mode
// remount, which cleans up and runs again in the same turn, can cancel it.
function releaseRoundGuard() {
  const ticket = ++releaseId
  window.setTimeout(() => {
    if (ticket !== releaseId || holders > 0) return
    if (!isRoundGuard(history.state)) return
    history.back()
  }, 0)
}

function edgeTouch(event: TouchEvent): Touch | null {
  const touch = event.changedTouches[0]
  if (!touch || touch.clientX > EDGE_PX) return null
  return touch
}

// A tap on a control still needs the browser's default. Tiles are not controls.
function isControl(target: EventTarget | null): boolean {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  if (!element) return false
  return element.closest('input, textarea, select, button, a') != null
}

// Phone browsers treat a left-to-right swipe as Back. During a round that
// gesture is how a word is traced, so keep it from leaving the page.
export function useBlockBackSwipe(active: boolean) {
  useEffect(() => {
    if (!active) return

    holders += 1
    releaseId += 1
    document.documentElement.classList.add('in-round')
    if (!isRoundGuard(history.state)) {
      history.pushState({ [GUARD]: true }, '')
    }

    let start: { x: number; y: number; id: number } | null = null

    function onTouchStart(event: TouchEvent) {
      const touch = edgeTouch(event)
      if (!touch) {
        start = null
        return
      }
      start = { x: touch.clientX, y: touch.clientY, id: touch.identifier }
      if (!isControl(event.target)) event.preventDefault()
    }

    function onTouchMove(event: TouchEvent) {
      if (!start) return
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start?.id)
      if (!touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (dx > 0 && Math.abs(dx) > Math.abs(dy)) event.preventDefault()
    }

    function onPopState() {
      history.pushState({ [GUARD]: true }, '')
    }

    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: false })
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    window.addEventListener('popstate', onPopState)

    return () => {
      holders -= 1
      document.documentElement.classList.remove('in-round')
      document.removeEventListener('touchstart', onTouchStart, true)
      document.removeEventListener('touchmove', onTouchMove, true)
      window.removeEventListener('popstate', onPopState)
      releaseRoundGuard()
    }
  }, [active])
}
