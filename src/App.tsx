import { Board } from './components/Board'
import { BuiltWord } from './components/BuiltWord'
import { EndPanel } from './components/EndPanel'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { WordForm } from './components/WordForm'
import { useRound, type AttemptFeedback } from './hooks/useRound'
import './App.css'

function App() {
  const round = useRound()
  const notice = round.loadError
    ? 'Could not load the word list.'
    : round.message

  if (round.phase === 'ended') {
    return (
      <>
        <Header />
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

  return (
    <>
      <Header />
      <div className="screen">
        <StatusBar
          secondsLeft={round.secondsLeft}
          score={round.score}
          onShake={round.startRound}
          shakeDisabled={round.phase === 'loading' || round.loadError}
        />

        <BuiltWord traced={round.traced} feedback={round.feedback} />

        {round.board.length > 0 && (
          <Board
            board={round.board}
            path={round.path}
            drag={round.drag}
            locked={round.phase !== 'playing'}
            onPointerDown={round.onPointerDown}
            onPointerMove={round.onPointerMove}
            onPointerUp={round.onPointerUp}
            onPointerCancel={round.onPointerCancel}
          />
        )}

        <p
          className={messageClass(round.feedback, round.message, round.loadError)}
          role="status"
        >
          {round.feedback?.kind === 'new' ? (
            <span className="sr-only">{pointsStatus(round.feedback)}</span>
          ) : (
            notice || '\u00a0'
          )}
        </p>

        {round.phase === 'loading' && !round.loadError && (
          <p className="loading">Loading words…</p>
        )}

        {round.phase === 'playing' && (
          <WordForm
            draft={round.draft}
            onDraftChange={round.onDraftChange}
            onSubmit={round.onSubmit}
          />
        )}
      </div>
    </>
  )
}

function messageClass(
  feedback: AttemptFeedback | null,
  message: string,
  loadError: boolean,
): string {
  if (loadError || !message) return 'message'
  if (feedback?.kind === 'repeat') return 'message message-repeat'
  if (feedback?.kind === 'invalid') return 'message message-invalid'
  return 'message'
}

function pointsStatus(feedback: AttemptFeedback): string {
  const label = feedback.points === 1 ? 'point' : 'points'
  return `${feedback.word}, ${feedback.points} ${label}`
}

export default App
