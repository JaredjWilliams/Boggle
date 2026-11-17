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

const UPDATES = [
  {
    date: '2026-11-17',
    label: 'Nov 17',
    title: 'Words you had started is gone',
    body: 'That Stats card listed longer words still sitting on a word you found. Showing it meant downloading every possible word from every board, and that was too much to load. Your games are still saved.',
  },
]

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
      <section className="profile-updates" aria-labelledby="profile-updates-heading">
        <h2 id="profile-updates-heading">Updates</h2>
        <ol>
          {UPDATES.map((update) => (
            <li key={update.date}>
              <time dateTime={update.date}>{update.label}</time>
              <h3>{update.title}</h3>
              <p>{update.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
