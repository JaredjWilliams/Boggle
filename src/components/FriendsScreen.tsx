import './FriendsScreen.css'

export type ListedPlayer = {
  id: string
  name: string
  username: string
}

type Props = {
  friends: readonly ListedPlayer[]
  loading: boolean
  disabled?: boolean
  notice?: string
  onStartWith: (friend: ListedPlayer) => void
}

export function FriendsScreen({
  friends,
  loading,
  disabled = false,
  notice = '',
  onStartWith,
}: Props) {
  return (
    <main className="friends-screen">
      <h1>Play with a friend.</h1>
      <p className="friends-lede">
        Choose someone to invite. You both play the same board.
      </p>

      {notice && (
        <p className="friends-error" role="alert">
          {notice}
        </p>
      )}

      {loading && <p className="friends-status">Loading players…</p>}

      {!loading && friends.length === 0 && (
        <p className="friends-status">No other players yet.</p>
      )}

      {!loading && friends.length > 0 && (
        <ul className="friend-list">
          {friends.map((friend) => (
            <li key={friend.id}>
              <button
                type="button"
                aria-label={`Play with ${friend.name}, ${friend.username}`}
                onClick={() => onStartWith(friend)}
                disabled={disabled || loading}
              >
                <span className="friend-id">
                  <span className="friend-name">{friend.name}</span>
                  <small>{friend.username}</small>
                </span>
                <strong>Play</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
