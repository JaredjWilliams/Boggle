import { useState } from 'react'
import { applyTheme, readTheme, writeTheme, type Theme } from './theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readTheme()
    applyTheme(stored)
    return stored
  })

  function setTheme(next: Theme) {
    writeTheme(next)
    setThemeState(next)
  }

  return { theme, setTheme }
}
