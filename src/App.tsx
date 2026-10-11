import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from 'react'
import { Header } from './components/Header'
import { shakeBoard, type Board } from './game/dice'
import { loadDictionary, type Dictionary } from './game/dictionary'
import {
  canFormWord,
  compareWords,
  findAllWords,
  isAdjacent,
  pathWord,
  scoreWord,
  type Cell,
} from './game/words'
import './App.css'

const ROUND_SECONDS = 180

type FoundWord = {
  word: string
  points: number
}

type Gesture = {
  path: Cell[]
  moved: boolean
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

function tileAt(x: number, y: number): Cell | null {
  const element = document.elementFromPoint(x, y)
  const tile = element?.closest<HTMLElement>('[data-row]')
  if (!tile?.dataset.row || tile.dataset.col == null) return null
  return {
    row: Number(tile.dataset.row),
    col: Number(tile.dataset.col),
  }
}

function App() {
  const [board, setBoard] = useState<Board>([])
  const [found, setFound] = useState<FoundWord[]>([])
  const [missed, setMissed] = useState<FoundWord[]>([])
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const [phase, setPhase] = useState<'loading' | 'playing' | 'ended'>('loading')
  const [round, setRound] = useState(0)
  const [path, setPath] = useState<Cell[]>([])
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState(false)

  const dictRef = useRef<Dictionary | null>(null)
  const boardRef = useRef(board)
  const foundRef = useRef(found)
  const phaseRef = useRef(phase)
  const pathRef = useRef(path)
  const secondsRef = useRef(secondsLeft)
  const gestureRef = useRef<Gesture | null>(null)

  boardRef.current = board
  foundRef.current = found
  phaseRef.current = phase
  pathRef.current = path
  secondsRef.current = secondsLeft

  const startRound = useCallback(() => {
    if (!dictRef.current) return
    gestureRef.current = null
    pathRef.current = []
    setBoard(shakeBoard())
    setFound([])
    setMissed([])
    setPath([])
    setDraft('')
    setMessage('')
    setSecondsLeft(ROUND_SECONDS)
    setRound((current) => current + 1)
    setPhase('playing')
  }, [])

  useEffect(() => {
    let cancel = false
    loadDictionary()
      .then((dictionary) => {
        if (cancel) return
        dictRef.current = dictionary
        startRound()
      })
      .catch(() => {
        if (!cancel) setLoadError(true)
      })
    return () => {
      cancel = true
    }
  }, [startRound])

  useEffect(() => {
    if (phase !== 'playing') return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase, round])

  useEffect(() => {
    if (phase === 'playing' && secondsLeft === 0) setPhase('ended')
  }, [phase, secondsLeft])

  useEffect(() => {
    if (phase !== 'ended') return
    gestureRef.current = null
    pathRef.current = []
    setPath([])
    setDraft('')
    setMessage('')

    const dictionary = dictRef.current
    if (!dictionary) return
    const already = new Set(foundRef.current.map((item) => item.word))
    const missedWords = findAllWords(boardRef.current, dictionary.trie)
      .filter((word) => !already.has(word))
      .sort(compareWords)
    setMissed(missedWords.map((word) => ({ word, points: scoreWord(word) })))
  }, [phase])

  function submitWord(raw: string) {
    if (phaseRef.current !== 'playing' || secondsRef.current <= 0) return
    const dictionary = dictRef.current
    if (!dictionary) return

    const word = raw.trim().toLowerCase()
    gestureRef.current = null
    pathRef.current = []
    setPath([])
    setDraft('')
    if (!word) return

    if (word.length < 3) {
      setMessage('Too short')
      return
    }
    if (foundRef.current.some((item) => item.word === word)) {
      setMessage('Already found')
      return
    }
    if (!dictionary.words.has(word)) {
      setMessage('Not in the dictionary')
      return
    }
    if (!canFormWord(boardRef.current, word)) {
      setMessage('Not on the board')
      return
    }

    const next = [{ word, points: scoreWord(word) }, ...foundRef.current]
    foundRef.current = next
    setFound(next)
    setMessage('')
  }

  function extendPath(cell: Cell | null, fromMove: boolean) {
    if (!cell || phaseRef.current !== 'playing') return
    const gesture = gestureRef.current
    if (!gesture) return

    const last = gesture.path[gesture.path.length - 1]
    if (!last) {
      gesture.path = [cell]
    } else if (sameCell(last, cell)) {
      return
    } else if (
      gesture.path.some((item) => sameCell(item, cell)) ||
      !isAdjacent(last, cell)
    ) {
      return
    } else {
      gesture.path = [...gesture.path, cell]
      if (fromMove) gesture.moved = true
    }

    pathRef.current = gesture.path
    setPath(gesture.path)
    setDraft('')
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'playing' || secondsRef.current <= 0) return
    event.preventDefault()
    const cell = tileAt(event.clientX, event.clientY)
    if (!cell) return

    const current = pathRef.current
    const last = current[current.length - 1]
    let nextPath: Cell[] | null = null

    if (!last) {
      nextPath = [cell]
    } else if (sameCell(last, cell)) {
      nextPath = current
    } else if (
      !current.some((item) => sameCell(item, cell)) &&
      isAdjacent(last, cell)
    ) {
      nextPath = [...current, cell]
    }

    if (!nextPath) return
    gestureRef.current = { path: nextPath, moved: false }
    pathRef.current = nextPath
    setPath(nextPath)
    setDraft('')
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture is only available for a real active pointer.
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!gestureRef.current) return
    extendPath(tileAt(event.clientX, event.clientY), true)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture?.moved) submitWord(pathWord(boardRef.current, gesture.path))
  }

  function onPointerCancel() {
    gestureRef.current = null
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const typed = draft.trim()
    if (typed) submitWord(typed)
    else submitWord(pathWord(boardRef.current, pathRef.current))
  }

  const total = found.reduce((sum, item) => sum + item.points, 0)
  const traced = pathWord(board, path)

  return (
    <>
      <Header />
      <div className="screen">
        <div className="status">
          <p className="timer">
            <span className="label">Time</span>
            <strong>{formatTime(secondsLeft)}</strong>
          </p>
          <p className="score">
            <span className="label">Score</span>
            <strong>{total}</strong>
          </p>
          <button
            type="button"
            className="shake"
            onClick={startRound}
            disabled={phase === 'loading' || loadError}
          >
            Shake
          </button>
        </div>

        {board.length > 0 && (
          <div
            className={phase === 'playing' ? 'grid' : 'grid locked'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(event) => event.preventDefault()}
          >
            {board.map((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const step = path.findIndex(
                  (cell) => cell.row === rowIndex && cell.col === colIndex,
                )
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={step >= 0 ? 'tile selected' : 'tile'}
                    role="button"
                    aria-label={letter}
                    data-row={rowIndex}
                    data-col={colIndex}
                    data-letter={letter}
                  >
                    {step >= 0 && (
                      <span className="step" aria-hidden="true">
                        {step + 1}
                      </span>
                    )}
                    <span>{letter}</span>
                  </div>
                )
              }),
            )}
          </div>
        )}

        <p className="path">{traced || '\u00a0'}</p>
        <p className="message" role="status">
          {loadError ? 'Could not load the word list.' : message || '\u00a0'}
        </p>

        {phase === 'loading' && !loadError && (
          <p className="loading">Loading words…</p>
        )}

        {phase === 'playing' && (
          <>
            <form className="word-form" onSubmit={onSubmit}>
              <input
                className="word-input"
                type="text"
                value={draft}
                placeholder="Type a word"
                aria-label="Type a word"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                onChange={(event) => {
                  const value = event.target.value
                  setDraft(value)
                  if (value) {
                    gestureRef.current = null
                    pathRef.current = []
                    setPath([])
                  }
                }}
              />
              <button type="submit" className="add-word">
                Add
              </button>
            </form>
            <ul className="word-list">
              {found.map((item) => (
                <li key={item.word}>
                  <span>{item.word}</span>
                  <span className="points">{item.points}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {phase === 'ended' && (
          <section className="end-panel">
            <p className="end-score">
              Score <strong>{total}</strong>
            </p>
            <h2>Your words</h2>
            {found.length === 0 ? (
              <p className="empty">None</p>
            ) : (
              <ul className="word-list flat">
                {found.map((item) => (
                  <li key={item.word}>
                    <span>{item.word}</span>
                    <span className="points">{item.points}</span>
                  </li>
                ))}
              </ul>
            )}
            <h2>Missed words</h2>
            {missed.length === 0 ? (
              <p className="empty">No missed words.</p>
            ) : (
              <ul className="word-list flat">
                {missed.map((item) => (
                  <li key={item.word}>
                    <span>{item.word}</span>
                    <span className="points">{item.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  )
}

export default App
