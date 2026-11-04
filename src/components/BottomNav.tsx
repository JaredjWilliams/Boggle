import './BottomNav.css'

export type AppNav = 'home' | 'games' | 'stats' | 'profile'

const ITEMS: { id: AppNav; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Games' },
  { id: 'stats', label: 'Stats' },
  { id: 'profile', label: 'Profile' },
]

export function BottomNav({ active, onChange }: { active: AppNav; onChange: (item: AppNav) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map((item) => {
        const current = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={current ? 'nav-item nav-item-active' : 'nav-item'}
            aria-current={current ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <NavMark id={item.id} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function NavMark({ id }: { id: AppNav }) {
  return (
    <svg className="nav-icon" viewBox="0 0 18 18" aria-hidden="true">
      {id === 'home' && (
        <>
          <path d="M3 8.3 9 3.1l6 5.2" />
          <path d="M4.8 7.6v7.2h8.4V7.6" />
        </>
      )}
      {id === 'games' && (
        <>
          <rect x="1.4" y="4.6" width="15.2" height="8.8" rx="4" />
          <path d="M6 6.8v4.2M3.9 8.9h4.2" />
          <circle className="nav-icon-dot" cx="11.5" cy="7.15" r="1" />
          <circle className="nav-icon-dot" cx="14" cy="10.25" r="1" />
        </>
      )}
      {id === 'stats' && (
        <>
          <path d="M3.4 3.2v11.3h11.3" />
          <path d="M6.2 11.4 8.8 8.2l2.2 1.8 3.5-4.5" />
        </>
      )}
      {id === 'profile' && (
        <>
          <circle cx="9" cy="5.6" r="2.2" />
          <path d="M4.2 15.2c.45-2.55 2.2-3.85 4.8-3.85s4.35 1.3 4.8 3.85" />
        </>
      )}
    </svg>
  )
}
