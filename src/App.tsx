import { Board } from './components/Board'
import { EndPanel } from './components/EndPanel'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { WordForm } from './components/WordForm'
import { WordList } from './components/WordList'
import { useRound } from './hooks/useRound'
import './App.css'

function App() {
  const round = useRound()
  const notice = round.loadError
    ? 'Could not load the word list.'
    : round.message

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

        {round.board.length > 0 && (
          <Board
            board={round.board}
            path={round.path}
            locked={round.phase !== 'playing'}
            onPointerDown={round.onPointerDown}
            onPointerMove={round.onPointerMove}
            onPointerUp={round.onPointerUp}
            onPointerCancel={round.onPointerCancel}
          />
        )}

        <p className="path">{round.traced || '\u00a0'}</p>
        <p className="message" role="status">
          {notice || '\u00a0'}
        </p>

        {round.phase === 'loading' && !round.loadError && (
          <p className="loading">Loading words…</p>
        )}

        {round.phase === 'playing' && (
          <>
            <WordForm
              draft={round.draft}
              onDraftChange={round.onDraftChange}
              onSubmit={round.onSubmit}
            />
            <WordList words={round.found} />
          </>
        )}

        {round.phase === 'ended' && (
          <EndPanel
            score={round.score}
            found={round.found}
            missed={round.missed}
          />
        )}
      </div>
    </>
  )
}

export default App
