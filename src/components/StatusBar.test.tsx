import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusBar } from './StatusBar'

const props = {
  secondsLeft: 90,
  onTurn: vi.fn(),
  turnDisabled: false,
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

describe('Turn', () => {
  it('asks to turn the board and reports the click', () => {
    const onTurn = vi.fn()
    render(<StatusBar {...props} score={40} onTurn={onTurn} />)

    fireEvent.click(screen.getByRole('button', { name: 'Turn' }))

    expect(onTurn).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Shake' })).not.toBeInTheDocument()
    expect(scoreText()).toBe('Score40')
  })

  it('ignores a click while turning is disabled', () => {
    const onTurn = vi.fn()
    render(<StatusBar {...props} score={40} onTurn={onTurn} turnDisabled />)

    const turn = screen.getByRole('button', { name: 'Turn' })
    expect(turn).toBeDisabled()
    fireEvent.click(turn)
    expect(onTurn).not.toHaveBeenCalled()
  })
})

function scoreText(): string {
  return screen.getByText('Score').closest('p')?.textContent ?? ''
}

function shownScore(): number {
  return Number(scoreText().replace('Score', ''))
}
