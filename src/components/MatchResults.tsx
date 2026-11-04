import { useEffect, useMemo, useRef, useState } from 'react'
import { loadMatchPlayers, loadSavedRound, watchMatchResults } from '../api/results'
import type { MatchPlayerRow, SavedRound } from '../domain/results'
import { useLoaded } from '../hooks/useLoaded'
import type { Board as LetterBoard } from '../game/dice'
import {
  boardWords,
  matchOutcome,
  outcomeLabel,
  presentMatch,
  type MatchOutcome,
  type ResultPlayer,
  type Rival,
} from '../game/match'
import type { ScoredWord } from '../game/round'
import { emptyHighlight, wordHighlight } from '../game/words'
import { Board } from './Board'
import { EndPanel } from './EndPanel'
import { StatusBlock } from './StatusBlock'
import { WordList } from './WordList'
import './MatchResults.css'

type ReviewProps = {
  gameId: string
  viewerId: string
  viewerName: string
  score: number | null
  words: readonly ScoredWord[] | null
  missed: ScoredWord[]
  board?: LetterBoard
  rivals: readonly Rival[]
  showingPotential: boolean
  onShowPotential: () => void
  onBack: () => void
  onPlayAgain: () => void
}

type SavedProps = {
  gameId: string
  viewerId: string
  viewerName: string
  rival: Rival
  onPlayAgain: () => void
}

export function SavedMatch({ gameId, viewerId, viewerName, rival, onPlayAgain }: SavedProps) {
  const [showingPotential, setShowingPotential] = useState(false)
  const saved = useLoaded(
    () => loadSavedRound(gameId, viewerId),
    null as SavedRound | null,
    'Could not load the results.',
    [gameId, viewerId],
  )
  const round = saved.data

  if (!round) {
    return (
      <section className="match match-loading">
        <StatusBlock
          loading={!saved.notice}
          loadingLabel="Loading results…"
          notice={saved.notice}
          onRetry={saved.reload}
          statusClassName="match-kicker"
        />
      </section>
    )
  }

  return (
    <MatchReview
      gameId={gameId}
      viewerId={viewerId}
      viewerName={viewerName}
      score={round.score}
      words={round.words}
      missed={round.missed}
      board={round.board}
      rivals={[rival]}
      showingPotential={showingPotential}
      onShowPotential={() => setShowingPotential(true)}
      onBack={() => setShowingPotential(false)}
      onPlayAgain={onPlayAgain}
    />
  )
}

export function MatchReview({
  gameId,
  viewerId,
  viewerName,
  score,
  words,
  missed,
  board = [],
  rivals,
  showingPotential,
  onShowPotential,
  onBack,
  onPlayAgain,
}: ReviewProps) {
  const { data: remote, notice, reload } = useLoaded(
    () => loadMatchPlayers(gameId),
    null as MatchPlayerRow[] | null,
    'Could not load the results.',
    [gameId],
  )

  useEffect(() => {
    let stop = () => {}
    try {
      stop = watchMatchResults(gameId, () => {
        reload()
      })
    } catch {
      // Polling still asks for the other player's result.
    }
    return () => {
      stop()
    }
  }, [gameId, reload])

  const roster =
    remote && remote.length > 0
      ? remote.map((player) => ({
          id: player.playerId,
          name: player.name,
          score: player.score,
          words: player.words,
        }))
      : null
  const players = presentMatch(roster, { id: viewerId, name: viewerName, score, words }, rivals)
  const waiting = players.some((player) => !player.you && player.score === null)

  useEffect(() => {
    if (remote === null || !waiting) return
    const timer = window.setInterval(() => {
      reload()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [remote, waiting, reload])

  const opponents = players.filter((player) => !player.you)
  if (remote && remote.length > 0 && opponents.length === 0) {
    return (
      <EndPanel
        score={score ?? 0}
        found={words ? [...words] : []}
        missed={missed}
        onPlayAgain={onPlayAgain}
      />
    )
  }

  if (showingPotential) {
    return (
      <PotentialWords words={boardWords(words ?? [], missed)} board={board} onBack={onBack} />
    )
  }

  return (
    <MatchResults
      players={players}
      notice={notice}
      onRetry={reload}
      onShowPotential={onShowPotential}
    />
  )
}

type ResultsProps = {
  players: readonly ResultPlayer[]
  notice?: string
  onRetry?: () => void
  onShowPotential: () => void
}

export function MatchResults({ players, notice = '', onRetry, onShowPotential }: ResultsProps) {
  const outcome = matchOutcome(players)
  const tied = outcome.kind === 'tie'

  return (
    <section className="match">
      <div className="match-top">
        <div className="match-heading">
          <h1 className={outcomeClass(outcome)} aria-live="polite">
            {outcomeLabel(outcome)}
          </h1>
          <button type="button" className="see-words" onClick={onShowPotential}>
            See potential words
          </button>
        </div>
        <StatusBlock notice={notice} onRetry={onRetry} />
      </div>

      <div className={players.length > 2 ? 'match-columns many' : 'match-columns'}>
        {players.map((player, index) => (
          <PlayerColumn
            key={player.id || player.name}
            player={player}
            headingId={`match-player-${index}`}
            winner={outcome.kind === 'win' && player.id === outcome.id}
            tied={tied && player.score !== null}
          />
        ))}
      </div>
    </section>
  )
}

function PlayerColumn({
  player,
  headingId,
  winner,
  tied,
}: {
  player: ResultPlayer
  headingId: string
  winner: boolean
  tied: boolean
}) {
  const className = [
    'match-player',
    player.you ? 'is-you' : '',
    winner ? 'is-winner' : '',
    tied ? 'is-tie' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="match-score">
        <div className="match-name">
          <h2 id={headingId}>{player.name}</h2>
          {player.you && <span className="match-you">You</span>}
          {winner && <span className="match-winner">Winner</span>}
          {tied && <span className="match-tie">Tie</span>}
        </div>
        <p className="match-points">
          <span className="label">Score</span>
          {player.score === null ? (
            <strong className="is-pending">Still playing</strong>
          ) : (
            <strong>{player.score}</strong>
          )}
        </p>
      </div>
      {player.words !== null && <h3>Words</h3>}
      <div className="match-scroll">
        {player.words === null ? (
          <p className="match-empty">Waiting for their words.</p>
        ) : player.words.length === 0 ? (
          <p className="match-empty">None this round.</p>
        ) : (
          <WordList words={player.words} flat />
        )}
      </div>
    </section>
  )
}

function outcomeClass(outcome: MatchOutcome): string {
  if (outcome.kind === 'win' && outcome.you) return 'match-outcome is-you-win'
  if (outcome.kind === 'win') return 'match-outcome is-their-win'
  if (outcome.kind === 'tie') return 'match-outcome is-tie'
  return 'match-outcome is-waiting'
}

const idlePointer = () => {}

export function PotentialWords({
  words,
  board,
  onBack,
}: {
  words: readonly ScoredWord[]
  board: LetterBoard
  onBack: () => void
}) {
  const backRef = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const highlight = useMemo(
    () => (selected ? wordHighlight(board, selected) : emptyHighlight),
    [board, selected],
  )
  const selectedPoints = words.find((item) => item.word === selected)?.points

  useEffect(() => {
    backRef.current?.focus()
  }, [])

  return (
    <section className="potential">
      <div className="potential-top">
        <button type="button" className="potential-back" onClick={onBack} ref={backRef}>
          Back
        </button>
        <div className="potential-heading">
          <h1>Potential words</h1>
          <p className="potential-lede">Tap a word to see how it was formed.</p>
        </div>
      </div>
      <div className="potential-stage">
        <div className="potential-scroll">
          {words.length === 0 ? (
            <p className="match-empty">No words on this board.</p>
          ) : (
            <WordList
              words={[...words]}
              flat
              scores={false}
              selected={selected}
              onSelect={(word) => setSelected((current) => (current === word ? null : word))}
            />
          )}
        </div>
        <div className="potential-board">
          <p className={selected ? 'potential-trace is-word' : 'potential-trace'} aria-live="polite">
            {selected ? (
              <>
                <span className="potential-trace-word">{selected}</span>
                <span className="potential-trace-points">{selectedPoints}</span>
              </>
            ) : (
              'The board from this game'
            )}
          </p>
          {board.length > 0 ? (
            <Board
              board={board}
              path={[]}
              highlight={highlight}
              drag={null}
              locked
              review
              onPointerDown={idlePointer}
              onPointerMove={idlePointer}
              onPointerUp={idlePointer}
              onPointerCancel={idlePointer}
            />
          ) : (
            <p className="match-empty">This board was not saved.</p>
          )}
        </div>
      </div>
    </section>
  )
}
