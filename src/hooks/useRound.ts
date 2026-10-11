import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { shakeBoard, type Board } from '../game/dice'
import { loadDictionary, type Dictionary } from '../game/dictionary'
import {
  judgeWord,
  ROUND_SECONDS,
  totalScore,
  unfoundWords,
  type AttemptKind,
  type Phase,
  type ScoredWord,
} from '../game/round'
import { pathOnDrag, pathOnPress, tileAt } from '../game/trace'
import { pathWord, scoreWord, type Cell } from '../game/words'

type Gesture = {
  path: Cell[]
  moved: boolean
}

export type AttemptFeedback = {
  id: number
  word: string
  kind: AttemptKind
  points: number
}

export function useRound() {
  const [board, setBoard] = useState<Board>([])
  const [found, setFound] = useState<ScoredWord[]>([])
  const [missed, setMissed] = useState<ScoredWord[]>([])
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const [phase, setPhase] = useState<Phase>('loading')
  const [round, setRound] = useState(0)
  const [path, setPath] = useState<Cell[]>([])
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null)
  const [loadError, setLoadError] = useState(false)

  const dictRef = useRef<Dictionary | null>(null)
  const boardRef = useRef(board)
  const foundRef = useRef(found)
  const phaseRef = useRef(phase)
  const pathRef = useRef(path)
  const secondsRef = useRef(secondsLeft)
  const gestureRef = useRef<Gesture | null>(null)
  const attemptSeq = useRef(0)

  boardRef.current = board
  foundRef.current = found
  phaseRef.current = phase
  pathRef.current = path
  secondsRef.current = secondsLeft

  const clearPath = useCallback(() => {
    gestureRef.current = null
    pathRef.current = []
    setPath([])
    setDraft('')
  }, [])

  const startRound = useCallback(() => {
    if (!dictRef.current) return
    clearPath()
    setBoard(shakeBoard())
    setFound([])
    setMissed([])
    setMessage('')
    setFeedback(null)
    setSecondsLeft(ROUND_SECONDS)
    setRound((current) => current + 1)
    setPhase('playing')
  }, [clearPath])

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
    setMissed(unfoundWords(boardRef.current, dictionary.trie, foundRef.current))
  }, [phase])

  const submitWord = useCallback(
    (raw: string) => {
      if (phaseRef.current !== 'playing' || secondsRef.current <= 0) return
      const dictionary = dictRef.current
      if (!dictionary) return

      const word = raw.trim().toLowerCase()
      clearPath()
      if (!word) return

      const verdict = judgeWord(
        word,
        boardRef.current,
        dictionary.words,
        foundRef.current.some((item) => item.word === word),
      )
      const points = scoreWord(word)
      attemptSeq.current += 1
      const id = attemptSeq.current

      if (verdict.kind !== 'new') {
        setMessage(verdict.message)
        setFeedback({
          id,
          word,
          kind: verdict.kind,
          points: verdict.kind === 'repeat' ? points : 0,
        })
        return
      }

      const next = [{ word, points }, ...foundRef.current]
      foundRef.current = next
      setFound(next)
      setMessage('')
      setFeedback({ id, word, kind: 'new', points })
    },
    [clearPath],
  )

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'playing' || secondsRef.current <= 0) return
    event.preventDefault()
    const cell = tileAt(event.clientX, event.clientY)
    if (!cell) return

    const nextPath = pathOnPress(pathRef.current, cell)
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
    const gesture = gestureRef.current
    if (!gesture || phaseRef.current !== 'playing') return
    const cell = tileAt(event.clientX, event.clientY)
    if (!cell) return

    const nextPath = pathOnDrag(gesture.path, cell)
    if (!nextPath) return

    if (gesture.path.length > 0) gesture.moved = true
    gesture.path = nextPath
    pathRef.current = nextPath
    setPath(nextPath)
    setDraft('')
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const target = event.currentTarget
    if (
      typeof target.hasPointerCapture === 'function' &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId)
    }
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture?.moved) submitWord(pathWord(boardRef.current, gesture.path))
  }

  function onPointerCancel() {
    gestureRef.current = null
  }

  function onDraftChange(value: string) {
    setDraft(value)
    if (value) {
      gestureRef.current = null
      pathRef.current = []
      setPath([])
    }
  }

  function onSubmit() {
    const typed = draft.trim()
    if (typed) submitWord(typed)
    else submitWord(pathWord(boardRef.current, pathRef.current))
  }

  return {
    board,
    found,
    missed,
    secondsLeft,
    phase,
    path,
    draft,
    message,
    feedback,
    loadError,
    score: totalScore(found),
    traced: pathWord(board, path),
    startRound,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onDraftChange,
    onSubmit,
  }
}
