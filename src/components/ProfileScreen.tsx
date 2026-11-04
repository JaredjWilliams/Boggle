import { playerInitials } from './initials'
import './ProfileScreen.css'

type Props = {
  name: string
  onSettings: () => void
  onHelp: () => void
  onLeaderboard?: () => void
  onAdmin?: () => void
  onSignOut: () => void
}

export function ProfileScreen({ name, onSettings, onHelp, onLeaderboard, onAdmin, onSignOut }: Props) {
  return (
    <main className="profile-screen">
      <div className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">
          {playerInitials(name)}
        </span>
        <div>
          <p className="section-kicker">Account</p>
          <h1>Profile</h1>
          <p className="profile-name">{name}</p>
        </div>
      </div>
      <div className="profile-actions">
        <button type="button" onClick={onSettings}>
          Settings
        </button>
        <button type="button" onClick={onHelp}>
          Help & support
        </button>
        {onLeaderboard && (
          <button type="button" onClick={onLeaderboard}>
            Leaderboard
          </button>
        )}
        {onAdmin && (
          <button type="button" onClick={onAdmin}>
            Admin
          </button>
        )}
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </main>
  )
}
