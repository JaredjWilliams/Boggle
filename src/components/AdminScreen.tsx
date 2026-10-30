import { useEffect, useRef, useState } from 'react'
import { deletePlayedGame, loadProfileGames, loadProfiles } from '../api/admin'
import {
  deleteLabel,
  formatPlayedOn,
  gameKey,
  opponentLine,
  orderGames,
  scoreLine,
  type AdminGame,
  type AdminProfile,
  type GameOrder,
} from '../domain/admin'
import { useLoaded } from '../hooks/useLoaded'
import { errorMessage } from '../lib/errorMessage'
import { PlayerMenu } from './PlayerMenu'
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

export function AdminPage() {
  const players = useLoaded(() => loadProfiles(), [] as AdminProfile[], 'Could not load players.', [])
  const [profileId, setProfileId] = useState('')
  const [games, setGames] = useState<AdminGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const request = useRef(0)
  const profile = players.data.find((player) => player.id === profileId) ?? null

  async function choose(id: string) {
    const ticket = request.current + 1
    request.current = ticket
    setProfileId(id)
    setPendingKey(null)
    setActionNotice('')
    const next = players.data.find((player) => player.id === id)
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
        setActionNotice(errorMessage(error, 'Could not load that profile.'))
      }
    } finally {
      if (request.current === ticket) setGamesLoading(false)
    }
  }

  async function confirmDelete() {
    const game = games.find((item) => gameKey(item) === pendingKey)
    if (!game) return
    setDeleting(true)
    setActionNotice('')
    try {
      await deletePlayedGame(game)
      setGames((current) => current.filter((item) => gameKey(item) !== gameKey(game)))
      setPendingKey(null)
    } catch (error) {
      setActionNotice(errorMessage(error, 'Could not delete that game.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminScreen
      profiles={players.data}
      profilesLoading={players.loading}
      profileId={profileId}
      onProfile={(id) => void choose(id)}
      gamesLoading={gamesLoading}
      profile={profile}
      games={games}
      notice={actionNotice || players.notice}
      pendingKey={pendingKey}
      deleting={deleting}
      onAskDelete={(game) => setPendingKey(gameKey(game))}
      onConfirmDelete={() => void confirmDelete()}
      onCancelDelete={() => setPendingKey(null)}
    />
  )
}
