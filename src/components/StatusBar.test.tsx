import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusBar } from './StatusBar'

const props = {
  secondsLeft: 90,
  onShake: vi.fn(),
  shakeDisabled: false,
}

describe('StatusBar score', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('counts a higher score up to the new total', () => {
    vi.useFakeTimers()
    const view = render(<StatusBar {...props} score={0} />)
    expect(scoreText()).toBe('Score0')

    view.rerender(<StatusBar {...props} score={100} />)
    act(() => {
      vi.advanceTimersByTime(16)
    })
    const climbed = shownScore()
    expect(climbed).toBeGreaterThan(0)
    expect(climbed).toBeLessThan(100)

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(scoreText()).toBe('Score100')
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('keeps counting when another word scores before the first count finishes', () => {
    vi.useFakeTimers()
    const view = render(<StatusBar {...props} score={0} />)
    view.rerender(<StatusBar {...props} score={100} />)
    act(() => {
      vi.advanceTimersByTime(32)
    })
    const midway = shownScore()
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(100)

    view.rerender(<StatusBar {...props} score={500} />)
    act(() => {
      vi.advanceTimersByTime(16)
    })
    const continued = shownScore()
    expect(continued).toBeGreaterThan(midway)
    expect(continued).toBeLessThan(500)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(scoreText()).toBe('Score500')
  })

  it('snaps to zero when a new round starts', () => {
    vi.useFakeTimers()
    const view = render(<StatusBar {...props} score={100} />)
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(scoreText()).toBe('Score100')

    view.rerender(<StatusBar {...props} secondsLeft={180} score={0} />)
    expect(scoreText()).toBe('Score0')
  })

  it('jumps straight to the score when motion is reduced', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.useFakeTimers()
    const view = render(<StatusBar {...props} score={0} />)
    view.rerender(<StatusBar {...props} score={400} />)

    expect(scoreText()).toBe('Score400')
  })
})

function scoreText(): string {
  return screen.getByText('Score').closest('p')?.textContent ?? ''
}

function shownScore(): number {
  return Number(scoreText().replace('Score', ''))
}
