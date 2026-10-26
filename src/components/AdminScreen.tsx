import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  deleteLabel,
  deletePlayedGame,
  formatPlayedOn,
  gameKey,
  loadProfileGames,
  loadProfiles,
  opponentLine,
  orderGames,
  scoreLine,
  type AdminGame,
  type AdminProfile,
  type GameOrder,
} from '../data/admin'
import './AdminScreen.css'

type Props = {
  profiles: readonly AdminProfile[]
  profilesLoading: boolean
  profileId: string
  onProfile: (profileId: string) => void
  gamesLoading: boolean
  profile: AdminProfile | null
  games: readonly AdminGame[]
  notice: string
  pendingKey: string | null
  deleting: boolean
  onAskDelete: (game: AdminGame) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export function AdminScreen({
  profiles,
  profilesLoading,
  profileId,
  onProfile,
  gamesLoading,
  profile,
  games,
  notice,
  pendingKey,
  deleting,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  const [order, setOrder] = useState<GameOrder>('newest')
  const visible = orderGames(games, order)
  const placeholder = profilesLoading
    ? 'Loading players…'
    : profiles.length === 0
      ? 'No players yet'
      : 'Choose a player'

  useEffect(() => {
    setOrder('newest')
  }, [profile?.id])

  return (
    <main className="admin">
      <h1>Admin</h1>
      <p className="admin-lede">Choose a player and remove a game for everyone.</p>

      <div className="admin-search">
        <label className="admin-label" id="admin-player-label" htmlFor="admin-player">
          Player
        </label>
        <PlayerMenu
          profiles={profiles}
          profileId={profileId}
          placeholder={placeholder}
          disabled={profilesLoading || profiles.length === 0}
          onProfile={onProfile}
        />
      </div>

      {notice && (
        <p className="admin-notice" role="alert">
          {notice}
        </p>
      )}

      {gamesLoading && <p className="admin-empty">Loading games…</p>}

      {profile && !gamesLoading && (
        <section className="admin-profile" aria-label={`${profile.name}, ${profile.username}`}>
          <h2>{profile.name}</h2>
          <p>{profile.username}</p>
          <p>
            {games.length === 1 ? '1 game' : `${games.length} games`}
          </p>
        </section>
      )}

      {profile && !gamesLoading && games.length === 0 && !notice && (
        <p className="admin-empty">No games saved for this player.</p>
      )}

      {games.length > 0 && (
        <div className="admin-sort" role="radiogroup" aria-label="Sort games">
          <button
            type="button"
            role="radio"
            aria-checked={order === 'newest'}
            className={order === 'newest' ? 'admin-sort-chip is-selected' : 'admin-sort-chip'}
            onClick={() => setOrder('newest')}
          >
            Newest
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={order === 'lowest'}
            className={order === 'lowest' ? 'admin-sort-chip is-selected' : 'admin-sort-chip'}
            onClick={() => setOrder('lowest')}
          >
            Lowest points
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="admin-games" aria-label="Games">
          {visible.map((game) => {
            const pending = pendingKey === gameKey(game)
            return (
              <li key={gameKey(game)} className="admin-game">
                <div className="admin-game-heading">
                  <span className={`admin-kind admin-kind-${game.kind.toLowerCase()}`}>{game.kind}</span>
                  <span className="admin-state">{game.state}</span>
                </div>
                <p className="admin-date">{formatPlayedOn(game.playedOn)}</p>
                <p className="admin-score">{scoreLine(game)}</p>
                {game.opponents.length > 0 && (
                  <ul className="admin-opponents">
                    {game.opponents.map((opponent) => (
                      <li key={`${opponent.name}-${opponent.status}`}>{opponentLine(opponent)}</li>
                    ))}
                  </ul>
                )}
                {pending ? (
                  <div className="admin-confirm">
                    <p>This removes the game for every player.</p>
                    <button
                      type="button"
                      className="admin-delete-confirm"
                      disabled={deleting}
                      onClick={onConfirmDelete}
                    >
                      {deleting ? 'Deleting…' : 'Delete for everyone'}
                    </button>
                    <button
                      type="button"
                      className="admin-keep"
                      disabled={deleting}
                      onClick={onCancelDelete}
                    >
                      Keep game
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin-delete"
                    aria-label={deleteLabel(game)}
                    onClick={() => onAskDelete(game)}
                  >
                    Delete
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function PlayerMenu({
  profiles,
  profileId,
  placeholder,
  disabled,
  onProfile,
}: {
  profiles: readonly AdminProfile[]
  profileId: string
  placeholder: string
  disabled: boolean
  onProfile: (profileId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = profiles.find((player) => player.id === profileId)

  useEffect(() => {
    if (!open) return
    const selectedOption = rootRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    const firstOption = rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]')
    ;(selectedOption ?? firstOption)?.focus()

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function moveOption(event: ReactKeyboardEvent, direction: 1 | -1) {
    const options = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const next = options[index + direction]
    if (!next) return
    event.preventDefault()
    next.focus()
  }

  return (
    <div className="admin-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        id="admin-player"
        type="button"
        className="admin-select"
        role="combobox"
        aria-labelledby="admin-player-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="admin-player-list"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {selected ? (
          <span className="admin-select-copy">
            <span>{selected.name}</span>
            <small>{selected.username}</small>
          </span>
        ) : (
          <span className="admin-select-placeholder">{placeholder}</span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          id="admin-player-list"
          className="admin-select-menu"
          role="listbox"
          aria-labelledby="admin-player-label"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') moveOption(event, 1)
            if (event.key === 'ArrowUp') moveOption(event, -1)
          }}
        >
          {profiles.map((player) => (
            <li key={player.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={player.id === profileId}
                onClick={() => {
                  onProfile(player.id)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
              >
                <span>{player.name}</span>
                <small>{player.username}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={open ? 'admin-chevron is-open' : 'admin-chevron'}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AdminPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profileId, setProfileId] = useState('')
  const [games, setGames] = useState<AdminGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const request = useRef(0)
  const profile = profiles.find((player) => player.id === profileId) ?? null

  useEffect(() => {
    let cancel = false
    void loadProfiles()
      .then((next) => {
        if (!cancel) setProfiles(next)
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setNotice(error instanceof Error ? error.message : 'Could not load players.')
        }
      })
      .finally(() => {
        if (!cancel) setProfilesLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  async function choose(id: string) {
    const ticket = request.current + 1
    request.current = ticket
    setProfileId(id)
    setPendingKey(null)
    setNotice('')
    const next = profiles.find((player) => player.id === id)
    if (!next) {
      setGames([])
      setGamesLoading(false)
      return
    }
    setGamesLoading(true)
    setGames([])
    try {
      const played = await loadProfileGames(next.id)
      if (request.current === ticket) setGames(played)
    } catch (error) {
      if (request.current === ticket) {
        setGames([])
        setNotice(error instanceof Error ? error.message : 'Could not load that profile.')
      }
    } finally {
      if (request.current === ticket) setGamesLoading(false)
    }
  }

  async function confirmDelete() {
    const game = games.find((item) => gameKey(item) === pendingKey)
    if (!game) return
    setDeleting(true)
    setNotice('')
    try {
      await deletePlayedGame(game)
      setGames((current) => current.filter((item) => gameKey(item) !== gameKey(game)))
      setPendingKey(null)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete that game.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminScreen
      profiles={profiles}
      profilesLoading={profilesLoading}
      profileId={profileId}
      onProfile={(id) => void choose(id)}
      gamesLoading={gamesLoading}
      profile={profile}
      games={games}
      notice={notice}
      pendingKey={pendingKey}
      deleting={deleting}
      onAskDelete={(game) => setPendingKey(gameKey(game))}
      onConfirmDelete={() => void confirmDelete()}
      onCancelDelete={() => setPendingKey(null)}
    />
  )
}
