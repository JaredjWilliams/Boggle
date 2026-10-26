import { useEffect, useRef, useState } from 'react'
import { endSession, readSession, restorePlayer, type Player } from './auth/profiles'
import { Board } from './components/Board'
import { BuiltWord } from './components/BuiltWord'
import { DailyBoardResults } from './components/DailyResults'
import { EndPanel } from './components/EndPanel'
import { FriendsScreen } from './components/FriendsScreen'
import { MatchReview, SavedMatch } from './components/MatchResults'
import { Header } from './components/Header'
import { LearnScreen } from './components/LearnScreen'
import { HomeDashboard } from './components/HomeDashboard'
import { PlayerStats } from './components/StatsScreen'
import { LoginPage } from './components/LoginPage'
import { SettingsScreen } from './components/SettingsScreen'
import { StatusBar } from './components/StatusBar'
import { WordForm } from './components/WordForm'
import { completedGameKey, playedBackNotices } from './data/activeGames'
import { hasPlayedDaily } from './data/daily'
import { answerInvite, createMatch, loadDailyBoard, saveResult } from './data/matches'
import { loadReadGames, saveReadGames } from './data/readGames'
import { playedOn } from './data/play'
import { shakeBoard } from './game/dice'
import { findAllWords, scoreWord } from './game/words'
import type { Rival } from './game/match'
import { useLobby, type ActiveGame, type Invite } from './hooks/useLobby'
import { useRound, type AttemptFeedback } from './hooks/useRound'
import { useTheme } from './theme/useTheme'
import type { Theme } from './theme/theme'
import './App.css'

const testing = import.meta.env.MODE === 'test'

function App() {
  const [player, setPlayer] = useState<Player | null>(() => (testing ? readSession() : null))
  const [authReady, setAuthReady] = useState(testing)
  const [guestView, setGuestView] = useState<'login' | 'settings'>('login')
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (testing) return
    let cancel = false
    void restorePlayer().then((next) => {
      if (cancel) return
      setPlayer(next)
      setAuthReady(true)
    })
    return () => {
      cancel = true
    }
  }, [])

  async function signOut() {
    await endSession()
    setPlayer(null)
  }

  if (!authReady) {
    return (
      <>
        <Header />
        <div className="screen">
          <p className="home-lede">Loading…</p>
        </div>
      </>
    )
  }

  if (!player) {
    return (
      <>
        <Header
          onHome={guestView === 'settings' ? () => setGuestView('login') : undefined}
          onSettings={() => setGuestView('settings')}
        />
        <div className="screen">
          {guestView === 'settings' ? (
            <SettingsScreen theme={theme} onThemeChange={setTheme} />
          ) : (
            <LoginPage onSignedIn={setPlayer} />
          )}
        </div>
      </>
    )
  }

  return (
    <PlayerGame
      player={player}
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={() => void signOut()}
    />
  )
}

function PlayerGame({
  player,
  theme,
  onThemeChange,
  onSignOut,
}: {
  player: Player
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSignOut: () => void
}) {
  const round = useRound()
  const lobby = useLobby(player.id)
  const { setNotice, refresh } = lobby
  const [matchId, setMatchId] = useState<string | null>(null)
  const [rivals, setRivals] = useState<Rival[]>([])
  const [showPotential, setShowPotential] = useState(false)
  const [view, setView] = useState<'home' | 'stats' | 'daily' | 'friends' | 'learn' | 'settings'>(
    'home',
  )
  const [openGame, setOpenGame] = useState<ActiveGame | null>(null)
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)
  const [dailyPlayed, setDailyPlayed] = useState(false)
  const [readKeys, setReadKeys] = useState<ReadonlySet<string>>(() =>
    player.id ? loadReadGames(player.id) : new Set(),
  )
  const savedMatch = useRef<string | null>(null)
  const dailyRound = useRef(false)
  const notices = playedBackNotices(lobby.games, readKeys)

  function markCompletedRead(game: ActiveGame) {
    if (!game.playedBack || !game.hosted) return
    const key = completedGameKey(game)
    setReadKeys((current) => {
      if (current.has(key)) return current
      const next = new Set(current)
      next.add(key)
      if (player.id) saveReadGames(player.id, next)
      return next
    })
  }

  function openSavedGame(game: ActiveGame) {
    markCompletedRead(game)
    setOpenGame(game)
  }

  useEffect(() => {
    if (!player.id) return
    let cancel = false
    void hasPlayedDaily(player.id)
      .then((played) => {
        if (!cancel && played) setDailyPlayed(true)
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setNotice(error instanceof Error ? error.message : "Could not check today's board.")
        }
      })
    return () => {
      cancel = true
    }
  }, [player.id, setNotice])

  useEffect(() => {
    if (round.phase !== 'ended' || !matchId || !player.id) return
    if (savedMatch.current === matchId) return
    savedMatch.current = matchId
    const playerId = player.id
    const wasDaily = dailyRound.current
    if (wasDaily) setDailyPlayed(true)
    void saveResult({
      gameId: matchId,
      playerId,
      score: round.score,
      words: round.found,
    })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : 'Could not save the score.')
      })
  }, [matchId, player.id, round.found, round.phase, round.score, setNotice])

  function leaveRound() {
    setOpenGame(null)
    setRivals([])
    setShowPotential(false)
    setView('home')
    round.goHome()
    void refresh()
  }

  async function begin(source: 'shake' | 'daily', inviteIds: readonly string[] = []) {
    if (startingRef.current) return
    if (source === 'daily' && dailyPlayed) return
    setOpenGame(null)
    if (!player.id || !round.trie) {
      if (source === 'daily') return
      setRivals([])
      setShowPotential(false)
      round.startRound()
      return
    }
    startingRef.current = true
    setStarting(true)
    try {
      if (source === 'daily' && (await hasPlayedDaily(player.id))) {
        setDailyPlayed(true)
        return
      }
      const invited = lobby.friends
        .filter((friend) => inviteIds.includes(friend.id))
        .map((friend) => ({ id: friend.id, name: friend.name }))
      const board = source === 'daily' ? await loadDailyBoard() : shakeBoard()
      const possibleWords = findAllWords(board, round.trie).map((word) => ({
        word,
        points: scoreWord(word),
      }))
      const gameId = await createMatch({
        hostId: player.id,
        board,
        possibleWords,
        inviteIds,
        dailyOn: source === 'daily' ? playedOn() : undefined,
      })
      setRivals(invited)
      setShowPotential(false)
      setMatchId(gameId)
      dailyRound.current = source === 'daily'
      void refresh()
      round.startRound(board)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start the game.')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  async function accept(invite: Invite) {
    if (!player.id) return
    try {
      await answerInvite(invite.gameId, player.id, 'accepted')
      void refresh()
      setRivals([{ id: invite.hostId, name: invite.hostName }])
      setShowPotential(false)
      setMatchId(invite.gameId)
      round.startRound(invite.board)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not join the game.')
    }
  }

  async function decline(invite: Invite) {
    if (!player.id) return
    try {
      await answerInvite(invite.gameId, player.id, 'declined')
      await refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not decline the invitation.')
    }
  }

  function signedInHeader(onHome?: () => void, includeSignOut = true) {
    return (
      <Header
        onHome={onHome}
        onLearn={includeSignOut ? () => setView('learn') : undefined}
        onSettings={includeSignOut ? () => setView('settings') : undefined}
        onSignOut={includeSignOut ? onSignOut : undefined}
        invites={lobby.invites}
        playedBack={notices}
        onAcceptInvite={(invite) => void accept(invite)}
        onDeclineInvite={(invite) => void decline(invite)}
        onOpenPlayedBack={openSavedGame}
      />
    )
  }

  const wordsUnavailable = round.phase === 'loading' || round.loadError

  if (round.phase === 'ended' && rivals.length > 0 && matchId && player.id) {
    return (
      <>
        {signedInHeader(leaveRound, false)}
        <div className="screen">
          <MatchReview
            gameId={matchId}
            viewerId={player.id}
            viewerName={player.name}
            score={round.score}
            words={round.found}
            missed={round.missed}
            rivals={rivals}
            showingPotential={showPotential}
            onShowPotential={() => setShowPotential(true)}
            onBack={() => setShowPotential(false)}
            onPlayAgain={() => void begin('shake')}
          />
        </div>
      </>
    )
  }

  if (round.phase === 'ended') {
    return (
      <>
        {signedInHeader(leaveRound, false)}
        <div className="screen">
          <EndPanel
            score={round.score}
            found={round.found}
            missed={round.missed}
            onPlayAgain={() => void begin('shake')}
          />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && openGame && player.id) {
    return (
      <>
        {signedInHeader(() => setOpenGame(null), false)}
        <div className="screen">
          <SavedMatch
            gameId={openGame.gameId}
            viewerId={player.id}
            viewerName={player.name}
            rival={{ id: openGame.opponentId, name: openGame.opponentName }}
            onPlayAgain={() => {
              setOpenGame(null)
              void begin('shake')
            }}
          />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && view === 'daily' && player.id) {
    return (
      <>
        {signedInHeader(() => setView('home'))}
        <div className="screen">
          <DailyBoardResults playerId={player.id} />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && view === 'stats' && player.id) {
    return (
      <>
        {signedInHeader(() => setView('home'))}
        <div className="screen">
          <PlayerStats playerId={player.id} playerName={player.name} />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && view === 'learn') {
    return (
      <>
        {signedInHeader(() => setView('home'))}
        <div className="screen">
          <LearnScreen />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && view === 'settings') {
    return (
      <>
        {signedInHeader(() => setView('home'))}
        <div className="screen">
          <SettingsScreen theme={theme} onThemeChange={onThemeChange} />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing' && view === 'friends') {
    return (
      <>
        {signedInHeader(() => setView('home'))}
        <div className="screen">
          <FriendsScreen
            friends={player.id ? lobby.friends : []}
            loading={Boolean(player.id) && lobby.loading}
            disabled={wordsUnavailable || starting}
            notice={lobby.notice || (round.loadError ? 'Could not load the word list.' : '')}
            onStartWith={(friend) => void begin('shake', [friend.id])}
          />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing') {
    return (
      <>
        {signedInHeader()}
        <div className="screen">
          <HomeDashboard
            loading={round.phase === 'loading' && !round.loadError}
            loadError={round.loadError}
            notice={lobby.notice}
            starting={starting}
            onStart={() => void begin('shake')}
            onPlayWithFriends={() => setView('friends')}
            onDaily={player.id ? () => void begin('daily') : undefined}
            dailyPlayed={dailyPlayed}
            onDailyResults={player.id ? () => setView('daily') : undefined}
            onOpenStats={player.id ? () => setView('stats') : undefined}
            games={lobby.games}
            readKeys={readKeys}
            invites={lobby.invites}
            onOpenGame={openSavedGame}
            onAcceptInvite={(invite) => void accept(invite)}
            onDeclineInvite={(invite) => void decline(invite)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {signedInHeader(leaveRound, false)}
      <div className="screen">
        <StatusBar
          secondsLeft={round.secondsLeft}
          score={round.score}
          onTurn={round.turnBoard}
          turnDisabled={false}
        />

        <BuiltWord traced={round.traced} feedback={round.feedback} />

        {round.board.length > 0 && (
          <Board
            board={round.board}
            path={round.path}
            highlight={round.highlight}
            drag={round.drag}
            locked={false}
            onPointerDown={round.onPointerDown}
            onPointerMove={round.onPointerMove}
            onPointerUp={round.onPointerUp}
            onPointerCancel={round.onPointerCancel}
          />
        )}

        <p className={messageClass(round.feedback, round.message)} role="status">
          {round.feedback?.kind === 'new' ? (
            <span className="sr-only">{pointsStatus(round.feedback)}</span>
          ) : (
            round.message || '\u00a0'
          )}
        </p>

        <WordForm
          draft={round.draft}
          onDraftChange={round.onDraftChange}
          onSubmit={round.onSubmit}
        />
      </div>
    </>
  )
}

function messageClass(feedback: AttemptFeedback | null, message: string): string {
  if (!message) return 'message'
  if (feedback?.kind === 'repeat') return 'message message-repeat'
  if (feedback?.kind === 'invalid') return 'message message-invalid'
  return 'message'
}

function pointsStatus(feedback: AttemptFeedback): string {
  const label = feedback.points === 1 ? 'point' : 'points'
  return `${feedback.word}, ${feedback.points} ${label}`
}

export default App
