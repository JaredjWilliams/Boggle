import { UPDATES, type UpdateNote } from '../updates/notes'
import './UpdatesScreen.css'

type Props = {
  updates?: readonly UpdateNote[]
}

export function UpdatesScreen({ updates = UPDATES }: Props) {
  return (
    <main className="updates-screen">
      <p className="section-kicker">What’s new</p>
      <h1>Updates</h1>
      <p className="updates-lede">Changes shipped to the game, newest first.</p>
      {updates.length === 0 ? (
        <p className="updates-empty">No updates yet.</p>
      ) : (
        <ol className="updates-list" aria-label="Updates">
          {updates.map((update) => (
            <li key={`${update.date}:${update.title}`}>
              <time dateTime={update.date}>{update.label}</time>
              <h2>{update.title}</h2>
              <p>{update.body}</p>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
