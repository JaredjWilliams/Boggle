import type { Theme } from '../theme/theme'
import './SettingsScreen.css'

type Props = {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

export function SettingsScreen({ theme, onThemeChange }: Props) {
  const dark = theme === 'dark'

  return (
    <main className="settings">
      <h1>Settings</h1>
      <p className="settings-lede">Make the board easier on your eyes.</p>
      <ul className="settings-list">
        <li>
          <button
            type="button"
            role="switch"
            className="theme-switch"
            aria-checked={dark}
            aria-labelledby="settings-dark-mode-label"
            aria-describedby="settings-dark-mode-detail"
            onClick={() => onThemeChange(dark ? 'light' : 'dark')}
          >
            <span className="theme-switch-copy">
              <span className="theme-switch-title" id="settings-dark-mode-label">
                Dark mode
              </span>
              <span className="theme-switch-detail" id="settings-dark-mode-detail">
                Dim the paper, tiles, and menus.
              </span>
            </span>
            <span className="theme-switch-track" aria-hidden="true">
              <span className="theme-switch-thumb" />
            </span>
          </button>
        </li>
      </ul>
    </main>
  )
}
