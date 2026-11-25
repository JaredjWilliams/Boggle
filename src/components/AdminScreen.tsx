import { useEffect, useRef, useState } from 'react'
import { deletePlayedGame, loadProfileGames, loadProfiles } from '../api/admin'
import { setDailyBoard } from '../api/daily'
import { createMatch } from '../api/matches'
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
import { playedOn } from '../domain/dates'
import { findDenseBoards, type DenseCandidate } from '../game/denseBoards'
import type { Trie } from '../game/dictionary'
import { useLoaded } from '../hooks/useLoaded'
import { errorMessage } from '../lib/errorMessage'
import { PlayerMenu } from './PlayerMenu'
import './AdminScreen.css'

const SAMPLE_COUNT = 300
const KEEP_COUNT = 5

type Props = {
  profiles: readonly AdminProfile[]
  profilesLoading: boolean
  profileId: string
  onProfile: (profileId: string) => void
  gamesLoading: boolean
  profile: AdminProfile | null
  games: readonly AdminGame[]
  notice: string
  status: string
  pendingKey: string | null
  deleting: boolean
  onAskDelete: (game: AdminGame) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  trieReady: boolean
  generating: boolean
  settingDaily: boolean
  sending: boolean
  candidates: readonly DenseCandidate[]
  selectedIndex: number
  dailyOn: string
  friendProfiles: readonly AdminProfile[]
  friendId: string
  onGenerate: () => void
  onSelectCandidate: (index: number) => void
  onDailyOn: (day: string) => void
  onFriend: (friendId: string) => void
  onSetDaily: () => void
  onSendFriend: () => void
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
  status,
  pendingKey,
  deleting,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  trieReady,
  generating,
  settingDaily,
  sending,
  candidates,
  selectedIndex,
  dailyOn,
  friendProfiles,
  friendId,
  onGenerate,
  onSelectCandidate,
  onDailyOn,
  onFriend,
  onSetDaily,
  onSendFriend,
}: Props) {
  const [order, setOrder] = useState<GameOrder>('newest')
  const visible = orderGames(games, order)
  const placeholder = profilesLoading
    ? 'Loading players…'
    : profiles.length === 0
      ? 'No players yet'
      : 'Choose a player'
  const friendPlaceholder = profilesLoading
    ? 'Loading players…'
    : friendProfiles.length === 0
      ? 'No players yet'
      : 'Choose a friend'
  const selected = candidates[selectedIndex] ?? null
  const busy = generating || settingDaily || sending

  useEffect(() => {
    setOrder('newest')
  }, [profile?.id])

  return (
    <main className="admin">
      <h1>Admin</h1>

      <section className="admin-publish" aria-label="Publish board">
        <h2>Publish board</h2>
        <p className="admin-lede">
          Generate dense boards, then set one as the daily or send it to a friend.
        </p>

        <button
          type="button"
          className="admin-action"
          disabled={!trieReady || busy}
          onClick={onGenerate}
        >
          {generating ? 'Generating…' : trieReady ? 'Generate dense boards' : 'Loading dictionary…'}
        </button>

        {candidates.length > 0 && (
          <ul className="admin-candidates" aria-label="Dense board candidates">
            {candidates.map((candidate, index) => {
              const selectedCandidate = index === selectedIndex
              return (
                <li key={`candidate-${index}`}>
                  <button
                    type="button"
                    className={
                      selectedCandidate ? 'admin-candidate is-selected' : 'admin-candidate'
                    }
                    aria-pressed={selectedCandidate}
                    disabled={busy}
                    onClick={() => onSelectCandidate(index)}
                  >
                    <CandidatePreview board={candidate.board} />
                    <span className="admin-candidate-stats">
                      {candidate.totalScore.toLocaleString()} pts · {candidate.wordCount} words
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {selected && (
          <div className="admin-publish-actions">
            <div className="admin-search">
              <label className="admin-label" htmlFor="admin-daily-on">
                Daily date
              </label>
              <input
                id="admin-daily-on"
                className="admin-date-input"
                type="date"
                value={dailyOn}
                disabled={busy}
                onChange={(event) => onDailyOn(event.target.value)}
              />
              <button
                type="button"
                className="admin-action"
                disabled={busy || !dailyOn}
                onClick={onSetDaily}
              >
                {settingDaily ? 'Setting daily…' : 'Set as daily'}
              </button>
            </div>

            <div className="admin-search">
              <label className="admin-label" id="admin-friend-label" htmlFor="admin-friend">
                Friend
              </label>
              <PlayerMenu
                profiles={friendProfiles}
                profileId={friendId}
                placeholder={friendPlaceholder}
                disabled={profilesLoading || friendProfiles.length === 0 || busy}
                onProfile={onFriend}
              />
              <button
                type="button"
                className="admin-action"
                disabled={busy || !friendId}
                onClick={onSendFriend}
              >
                {sending ? 'Sending…' : 'Send to friend'}
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="admin-lede admin-delete-lede">Choose a player and remove a game for everyone.</p>

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
      {status && !notice && (
        <p className="admin-status" role="status">
          {status}
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

function CandidatePreview({ board }: { board: DenseCandidate['board'] }) {
  return (
    <div className="admin-mini-board" aria-hidden="true">
      {board.flatMap((row, rowIndex) =>
        row.map((letter, colIndex) => (
          <span key={`${rowIndex}-${colIndex}`}>{letter}</span>
        )),
      )}
    </div>
  )
}

export function AdminPage({
  hostId,
  trie,
}: {
  hostId: string
  trie: Trie | null
}) {
  const players = useLoaded(() => loadProfiles(), [] as AdminProfile[], 'Could not load players.', [])
  const [profileId, setProfileId] = useState('')
  const [games, setGames] = useState<AdminGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState('')
  const [status, setStatus] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [settingDaily, setSettingDaily] = useState(false)
  const [sending, setSending] = useState(false)
  const [candidates, setCandidates] = useState<DenseCandidate[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dailyOn, setDailyOn] = useState(playedOn())
  const [friendId, setFriendId] = useState('')
  const request = useRef(0)
  const profile = players.data.find((player) => player.id === profileId) ?? null
  const friendProfiles = players.data.filter((player) => player.id !== hostId)

  async function choose(id: string) {
    const ticket = request.current + 1
    request.current = ticket
    setProfileId(id)
    setPendingKey(null)
    setActionNotice('')
    setStatus('')
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
    setStatus('')
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

  function generate() {
    if (!trie || generating) return
    setGenerating(true)
    setActionNotice('')
    setStatus('')
    window.setTimeout(() => {
      try {
        const found = findDenseBoards(trie, { samples: SAMPLE_COUNT, keep: KEEP_COUNT })
        setCandidates(found)
        setSelectedIndex(0)
        if (found.length === 0) setActionNotice('No boards were generated.')
      } catch (error) {
        setCandidates([])
        setSelectedIndex(0)
        setActionNotice(errorMessage(error, 'Could not generate boards.'))
      } finally {
        setGenerating(false)
      }
    }, 0)
  }

  async function publishDaily() {
    const candidate = candidates[selectedIndex]
    if (!candidate || settingDaily) return
    setSettingDaily(true)
    setActionNotice('')
    setStatus('')
    try {
      await setDailyBoard(dailyOn, candidate.board)
      setStatus(`Daily board set for ${dailyOn}.`)
    } catch (error) {
      setActionNotice(errorMessage(error, 'Could not set the daily board.'))
    } finally {
      setSettingDaily(false)
    }
  }

  async function sendFriend() {
    const candidate = candidates[selectedIndex]
    if (!candidate || !friendId || !hostId || sending) return
    setSending(true)
    setActionNotice('')
    setStatus('')
    try {
      await createMatch({
        hostId,
        board: candidate.board,
        possibleWords: candidate.possibleWords,
        inviteIds: [friendId],
      })
      const friend = friendProfiles.find((player) => player.id === friendId)
      setStatus(friend ? `Sent to ${friend.name}.` : 'Sent to friend.')
    } catch (error) {
      setActionNotice(errorMessage(error, 'Could not send that board.'))
    } finally {
      setSending(false)
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
      status={status}
      pendingKey={pendingKey}
      deleting={deleting}
      onAskDelete={(game) => setPendingKey(gameKey(game))}
      onConfirmDelete={() => void confirmDelete()}
      onCancelDelete={() => setPendingKey(null)}
      trieReady={Boolean(trie)}
      generating={generating}
      settingDaily={settingDaily}
      sending={sending}
      candidates={candidates}
      selectedIndex={selectedIndex}
      dailyOn={dailyOn}
      friendProfiles={friendProfiles}
      friendId={friendId}
      onGenerate={generate}
      onSelectCandidate={setSelectedIndex}
      onDailyOn={setDailyOn}
      onFriend={setFriendId}
      onSetDaily={() => void publishDaily()}
      onSendFriend={() => void sendFriend()}
    />
  )
}
