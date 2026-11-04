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
            <span className={`nav-mark nav-mark-${item.id}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
