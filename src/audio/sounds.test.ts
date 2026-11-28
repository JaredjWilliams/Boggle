import { afterEach, describe, expect, it } from 'vitest'
import {
  attemptSoundUrl,
  connectTickHz,
  resetAudioForTests,
} from './sounds'

describe('sounds', () => {
  afterEach(() => {
    resetAudioForTests()
  })

  it('raises connect tick pitch by semitone steps from 220 Hz', () => {
    expect(connectTickHz(0)).toBe(220)
    expect(connectTickHz(12)).toBeCloseTo(440, 5)
    expect(connectTickHz(1)).toBeGreaterThan(connectTickHz(0))
    expect(connectTickHz(2)).toBeGreaterThan(connectTickHz(1))
    expect(connectTickHz(-3)).toBe(220)
  })

  it('maps attempt kinds to soft-UI sample URLs', () => {
    expect(attemptSoundUrl('new')).toBe('/sounds/success.wav')
    expect(attemptSoundUrl('invalid')).toBe('/sounds/error.wav')
    expect(attemptSoundUrl('repeat')).toBe('/sounds/dud.wav')
  })
})
