import { useState } from 'react'
import {
  clearSession,
  readSession,
  writeSession,
  type Player,
} from './auth/profiles'
import { Board } from './components/Board'
import { BuiltWord } from './components/BuiltWord'
import { EndPanel } from './components/EndPanel'
import { Header } from './components/Header'
import { HomeDashboard } from './components/HomeDashboard'
import { LoginPage } from './components/LoginPage'
import { StatusBar } from './components/StatusBar'
import { WordForm } from './components/WordForm'
import { useRound, type AttemptFeedback } from './hooks/useRound'
import './App.css'

function App() {
  const [player, setPlayer] = useState<Player | null>(() => readSession())

  function signIn(next: Player) {
    writeSession(next)
    setPlayer(next)
  }

  function signOut() {
    clearSession()
    setPlayer(null)
  }

  if (!player) {
    return (
      <>
        <Header />
        <div className="screen">
          <LoginPage onSignedIn={signIn} />
        </div>
      </>
    )
  }

  return <PlayerGame player={player} onSignOut={signOut} />
}

function PlayerGame({
  player,
  onSignOut,
}: {
  player: Player
  onSignOut: () => void
}) {
  const round = useRound()

  if (round.phase === 'ended') {
    return (
      <>
        <Header onHome={round.goHome} />
        <div className="screen">
          <EndPanel
            score={round.score}
            found={round.found}
            missed={round.missed}
            onPlayAgain={round.startRound}
          />
        </div>
      </>
    )
  }

  if (round.phase !== 'playing') {
    return (
      <>
        <Header onSignOut={onSignOut} />
        <div className="screen">
          <HomeDashboard
            playerName={player.name}
            loading={round.phase === 'loading' && !round.loadError}
            loadError={round.loadError}
            lastScore={round.lastScore}
            onStart={round.startRound}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Header onHome={round.goHome} />
      <div className="screen">
        <StatusBar
          secondsLeft={round.secondsLeft}
          score={round.score}
          onShake={round.startRound}
          shakeDisabled={false}
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

        <p
          className={messageClass(round.feedback, round.message)}
          role="status"
        >
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
