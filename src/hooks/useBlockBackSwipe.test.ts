import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBlockBackSwipe } from './useBlockBackSwipe'

// jsdom traverses history across two timers, then the round guard answers on popstate.
async function flushHistory() {
  await act(async () => {
    for (let step = 0; step < 3; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

function touch(name: string, x: number, y = 40) {
  const event = new Event(name, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'changedTouches', {
    value: [{ clientX: x, clientY: y, identifier: 1 }],
  })
  return event
}

describe('useBlockBackSwipe', () => {
  it('does nothing until a round is playing', () => {
    renderHook(() => useBlockBackSwipe(false))

    expect(document.documentElement).not.toHaveClass('in-round')
    expect(history.state).not.toMatchObject({ boggleRound: true })
  })

  it('keeps a back gesture on the same page during a round', async () => {
    const push = vi.spyOn(history, 'pushState')
    renderHook(() => useBlockBackSwipe(true))

    expect(document.documentElement).toHaveClass('in-round')
    expect(history.state).toMatchObject({ boggleRound: true })

    push.mockClear()
    history.back()
    await flushHistory()

    expect(push).toHaveBeenCalledWith({ boggleRound: true }, '')
    expect(history.state).toMatchObject({ boggleRound: true })
    push.mockRestore()
  })

  it('blocks a left-edge swipe and still allows taps on controls', () => {
    renderHook(() => useBlockBackSwipe(true))
    const tile = document.createElement('div')
    const home = document.createElement('button')
    document.body.append(tile, home)

    const onTile = touch('touchstart', 8)
    tile.dispatchEvent(onTile)
    expect(onTile.defaultPrevented).toBe(true)

    const swipe = touch('touchmove', 40, 42)
    tile.dispatchEvent(swipe)
    expect(swipe.defaultPrevented).toBe(true)

    const onHome = touch('touchstart', 8)
    home.dispatchEvent(onHome)
    expect(onHome.defaultPrevented).toBe(false)

    const away = touch('touchstart', 80)
    tile.dispatchEvent(away)
    expect(away.defaultPrevented).toBe(false)

    tile.remove()
    home.remove()
  })

  it('releases the guard when the round ends', async () => {
    const hook = renderHook(({ active }) => useBlockBackSwipe(active), {
      initialProps: { active: true },
    })

    expect(history.state).toMatchObject({ boggleRound: true })

    hook.rerender({ active: false })
    expect(document.documentElement).not.toHaveClass('in-round')
    await flushHistory()

    expect(history.state).toEqual(null)
  })
})
