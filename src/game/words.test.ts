import { describe, expect, it } from 'vitest'
import { advanceScore, scoreStep, scoreWord } from './words'

describe('scoreWord', () => {
  it('gives no points for a word shorter than 3 letters', () => {
    expect(scoreWord('')).toBe(0)
    expect(scoreWord('a')).toBe(0)
    expect(scoreWord('at')).toBe(0)
  })

  it('uses the WordHunt points for each length', () => {
    expect(scoreWord('cat')).toBe(100)
    expect(scoreWord('cats')).toBe(400)
    expect(scoreWord('crate')).toBe(800)
    expect(scoreWord('crates')).toBe(1400)
    expect(scoreWord('crating')).toBe(1800)
    expect(scoreWord('creating')).toBe(2200)
  })

  it('adds 400 points for every letter after 8', () => {
    expect(scoreWord('a'.repeat(9))).toBe(2600)
    expect(scoreWord('a'.repeat(10))).toBe(3000)
    expect(scoreWord('a'.repeat(11))).toBe(3400)
    expect(scoreWord('a'.repeat(12))).toBe(3800)
  })
})

describe('scoreStep', () => {
  it('moves one point at a time near the end of a count', () => {
    expect(scoreStep(0)).toBe(0)
    expect(scoreStep(-4)).toBe(0)
    for (let remaining = 1; remaining <= 12; remaining += 1) {
      expect(scoreStep(remaining)).toBe(1)
    }
  })

  it('takes a larger step while a big award is still far from the total', () => {
    expect(scoreStep(13)).toBe(1)
    expect(scoreStep(100)).toBe(11)
    expect(scoreStep(400)).toBe(49)
    expect(scoreStep(2200)).toBeGreaterThan(1)
    expect(scoreStep(2200)).toBeLessThan(2200)
  })
})

describe('advanceScore', () => {
  it('snaps down when the target is not higher', () => {
    expect(advanceScore(100, 100, 16)).toBe(100)
    expect(advanceScore(400, 0, 16)).toBe(0)
  })

  it('counts a 100-point word up by ones and lands exactly on the target', () => {
    const steps = climb(0, 100)
    expect(steps.at(-1)).toBe(100)
    expect(steps.every((score, index) => index === 0 || score > steps[index - 1])).toBe(
      true,
    )
    expect(steps.slice(-12)).toEqual([89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100])
    expect(steps.length).toBeLessThan(100)
  })

  it('counts a long word to its exact total without passing it', () => {
    const steps = climb(500, 2700)
    expect(steps.at(-1)).toBe(2700)
    expect(Math.max(...steps)).toBe(2700)
    expect(steps.slice(-12)).toEqual([
      2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700,
    ])
  })

  it('catches up several steps when a frame is late, and no more than 40', () => {
    const oneFrame = advanceScore(0, 2200, 16)
    const lateFrame = advanceScore(0, 2200, 500)
    const stalled = advanceScore(0, 2200, 10_000)
    expect(lateFrame).toBeGreaterThan(oneFrame)
    expect(stalled).toBe(advanceScore(0, 2200, 40 * 16))
    expect(stalled).toBeLessThan(2200)
  })
})

function climb(from: number, target: number): number[] {
  const scores = [from]
  let shown = from
  let guard = 0
  while (shown < target && guard < 500) {
    shown = advanceScore(shown, target, 16)
    scores.push(shown)
    guard += 1
  }
  return scores
}
