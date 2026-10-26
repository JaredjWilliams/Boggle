import { afterEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, applyTheme, readTheme, writeTheme } from './theme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('theme', () => {
  it('defaults to dark', () => {
    expect(readTheme()).toBe('dark')
  })

  it('persists a dark choice and applies it', () => {
    writeTheme('dark')

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores an unknown stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue')

    expect(readTheme()).toBe('dark')
  })

  it('keeps a saved light choice', () => {
    writeTheme('light')

    expect(readTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('applies light without keeping a bad value', () => {
    applyTheme('light')

    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
