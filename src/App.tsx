import { useEffect, useState, type ReactNode } from 'react'
import { isAdmin } from './auth/admin'
import { endSession, readSession, restorePlayer, type Player } from './auth/profiles'
import { AdminPage } from './components/AdminScreen'
import { Board } from './components/Board'
import { BuiltWord } from './components/BuiltWord'
import { DailyBoardResults } from './components/DailyResults'
import { EndPanel } from './components/EndPanel'
import { FriendsScreen } from './components/FriendsScreen'
import { MatchReview, SavedMatch } from './components/MatchResults'
import { Header } from './components/Header'
import { PlayerLeaderboard } from './components/LeaderboardScreen'
import { LearnScreen } from './components/LearnScreen'
import { HomeDashboard } from './components/HomeDashboard'
import { PlayerStats } from './components/StatsScreen'
import { LoginPage } from './components/LoginPage'
import { ScreenFrame } from './components/ScreenFrame'
import { SettingsScreen } from './components/SettingsScreen'
import { StatusBar } from './components/StatusBar'
import { WordForm } from './components/WordForm'
import { completedGameKey, playedBackNotices, type ActiveGame } from './domain/lobby'
import { loadReadGames, saveReadGames } from './storage/readGames'
import { useLobby } from './hooks/useLobby'
import { useMatch } from './hooks/useMatch'
import { useRound, type AttemptFeedback } from './hooks/useRound'
import { useTheme } from './theme/useTheme'
import type { Theme } from './theme/theme'
import './App.css'

const testing = import.meta.env.MODE === 'test'

type View = 'home' | 'stats' | 'daily' | 'friends' | 'learn' | 'leaderboard' | 'settings' | 'admin'

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
      <ScreenFrame header={<Header />}>
        <p className="home-lede">Loading…</p>
      </ScreenFrame>
    )
  }

  if (!player) {
    return (
      <ScreenFrame
        header={
          <Header
            onHome={guestView === 'settings' ? () => setGuestView('login') : undefined}
            onSettings={() => setGuestView('settings')}
          />
        }
      >
        {guestView === 'settings' ? (
          <SettingsScreen theme={theme} onThemeChange={setTheme} />
        ) : (
          <LoginPage onSignedIn={setPlayer} />
        )}
      </ScreenFrame>
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
  const [view, setView] = useState<View>('home')
  const [openGame, setOpenGame] = useState<ActiveGame | null>(null)
  const [readKeys, setReadKeys] = useState<ReadonlySet<string>>(() =>
    player.id ? loadReadGames(player.id) : new Set(),
  )
  const match = useMatch({
    playerId: player.id,
    phase: round.phase,
    score: round.score,
    found: round.found,
    trie: round.trie,
    startRound: round.startRound,
    friends: lobby.friends,
    refresh,
    setNotice,
    closeOpenGame: () => setOpenGame(null),
  })
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

  function leaveRound() {
    setOpenGame(null)
    match.clearRound()
    setView('home')
    round.goHome()
    void refresh()
  }

  function signedInHeader(onHome?: () => void, includeSignOut = true) {
    return (
      <Header
        onHome={onHome}
        onLeaderboard={includeSignOut ? () => setView('leaderboard') : undefined}
        onLearn={includeSignOut ? () => setView('learn') : undefined}
        onSettings={includeSignOut ? () => setView('settings') : undefined}
        onAdmin={includeSignOut && isAdmin(player) ? () => setView('admin') : undefined}
        onSignOut={includeSignOut ? onSignOut : undefined}
        invites={lobby.invites}
        playedBack={notices}
        onAcceptInvite={(invite) => void match.accept(invite)}
        onDeclineInvite={(invite) => void match.decline(invite)}
        onOpenPlayedBack={openSavedGame}
      />
    )
  }

  const wordsUnavailable = round.phase === 'loading' || round.loadError
  const home = () => setView('home')

  if (round.phase === 'ended' && match.rivals.length > 0 && match.matchId && player.id) {
    return (
      <ScreenFrame header={signedInHeader(leaveRound, false)}>
        <MatchReview
          gameId={match.matchId}
          viewerId={player.id}
          viewerName={player.name}
          score={round.score}
          words={round.found}
          missed={round.missed}
          rivals={match.rivals}
          showingPotential={match.showPotential}
          onShowPotential={() => match.setShowPotential(true)}
          onBack={() => match.setShowPotential(false)}
          onPlayAgain={() => void match.begin('shake')}
        />
      </ScreenFrame>
    )
  }

  if (round.phase === 'ended') {
    return (
      <ScreenFrame header={signedInHeader(leaveRound, false)}>
        <EndPanel
          score={round.score}
          found={round.found}
          missed={round.missed}
          onPlayAgain={() => void match.begin('shake')}
        />
      </ScreenFrame>
    )
  }

  if (round.phase !== 'playing' && openGame && player.id) {
    return (
      <ScreenFrame header={signedInHeader(() => setOpenGame(null), false)}>
        <SavedMatch
          gameId={openGame.gameId}
          viewerId={player.id}
          viewerName={player.name}
          rival={{ id: openGame.opponentId, name: openGame.opponentName }}
          onPlayAgain={() => {
            setOpenGame(null)
            void match.begin('shake')
          }}
        />
      </ScreenFrame>
    )
  }

  if (round.phase === 'playing') {
    return (
      <ScreenFrame header={signedInHeader(leaveRound, false)}>
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
        <WordForm draft={round.draft} onDraftChange={round.onDraftChange} onSubmit={round.onSubmit} />
      </ScreenFrame>
    )
  }

  const pages: Record<View, ReactNode> = {
    home: (
      <HomeDashboard
        loading={round.phase === 'loading' && !round.loadError}
        loadError={round.loadError}
        notice={lobby.notice}
        starting={match.starting}
        onStart={() => void match.begin('shake')}
        onPlayWithFriends={() => setView('friends')}
        onDaily={player.id ? () => void match.begin('daily') : undefined}
        dailyPlayed={match.dailyPlayed}
        onDailyResults={player.id ? () => setView('daily') : undefined}
        onOpenStats={player.id ? () => setView('stats') : undefined}
        games={lobby.games}
        readKeys={readKeys}
        invites={lobby.invites}
        onOpenGame={openSavedGame}
        onAcceptInvite={(invite) => void match.accept(invite)}
        onDeclineInvite={(invite) => void match.decline(invite)}
      />
    ),
    daily: player.id ? <DailyBoardResults playerId={player.id} /> : null,
    leaderboard: <PlayerLeaderboard viewerId={player.id ?? ''} />,
    stats: player.id ? <PlayerStats playerId={player.id} playerName={player.name} /> : null,
    learn: <LearnScreen />,
    admin: isAdmin(player) ? <AdminPage /> : null,
    settings: <SettingsScreen theme={theme} onThemeChange={onThemeChange} />,
    friends: (
      <FriendsScreen
        friends={player.id ? lobby.friends : []}
        loading={Boolean(player.id) && lobby.loading}
        disabled={wordsUnavailable || match.starting}
        notice={lobby.notice || (round.loadError ? 'Could not load the word list.' : '')}
        onStartWith={(friend) => void match.begin('shake', [friend.id])}
      />
    ),
  }

  const shown = pages[view] ? view : 'home'

  return (
    <ScreenFrame header={signedInHeader(shown === 'home' ? undefined : home)}>
      {pages[shown]}
    </ScreenFrame>
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
