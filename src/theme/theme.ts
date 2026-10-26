/** Keep this key in sync with the blocking script in index.html. */
export const THEME_STORAGE_KEY = 'boggle-theme'

export type Theme = 'light' | 'dark'

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // Storage can throw in private mode; fall back to the dark board.
  }
  return 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The choice still applies for this visit when storage is blocked.
  }
  applyTheme(theme)
}

export function applyStoredTheme() {
  applyTheme(readTheme())
}
