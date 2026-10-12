import './Header.css'

type Props = {
  onHome?: () => void
  onSignOut?: () => void
}

export function Header({ onHome, onSignOut }: Props) {
  return (
    <header className="app-header">
      <GridIcon />
      <Wordmark />
      {(onHome || onSignOut) && (
        <div className="header-actions">
          {onSignOut && (
            <button type="button" className="header-home" onClick={onSignOut}>
              Sign out
            </button>
          )}
          {onHome && (
            <button type="button" className="header-home" onClick={onHome}>
              Home
            </button>
          )}
        </div>
      )}
    </header>
  )
}

function GridIcon() {
  return (
    <svg
      className="brand-icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="18" y="1" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="1" y="18" width="13" height="13" rx="3" fill="#fffaf3" />
      <rect x="18" y="18" width="13" height="13" rx="3" fill="#e15a2d" />
    </svg>
  )
}

function Wordmark() {
  return (
    <svg
      className="brand-logo"
      viewBox="0 0 148 40"
      role="img"
      aria-label="Boggle"
    >
      <text
        x="0"
        y="31"
        fill="currentColor"
        fontFamily="Georgia, 'Palatino Linotype', serif"
        fontSize="34"
        fontWeight="700"
      >
        Boggle
      </text>
    </svg>
  )
}
