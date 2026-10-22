import { useCallback, useEffect, useRef, useState } from 'react'
import { loadMatchPlayers, watchMatchResults, type MatchPlayerRow } from '../data/matches'
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
import { EndPanel } from './EndPanel'
import { WordList } from './WordList'
import './MatchResults.css'

type ReviewProps = {
  gameId: string
  viewerId: string
  viewerName: string
  score: number
  words: ScoredWord[]
  missed: ScoredWord[]
  rivals: readonly Rival[]
  showingPotential: boolean
  onShowPotential: () => void
  onBack: () => void
  onPlayAgain: () => void
}

export function MatchReview({
  gameId,
  viewerId,
  viewerName,
  score,
  words,
  missed,
  rivals,
  showingPotential,
  onShowPotential,
  onBack,
  onPlayAgain,
}: ReviewProps) {
  const [remote, setRemote] = useState<MatchPlayerRow[] | null>(null)
  const [notice, setNotice] = useState('')
  const request = useRef(0)

  const reload = useCallback(async () => {
    const id = ++request.current
    try {
      const next = await loadMatchPlayers(gameId)
      if (request.current !== id) return
      setRemote(next)
      setNotice('')
    } catch (error: unknown) {
      if (request.current !== id) return
      setNotice(error instanceof Error ? error.message : 'Could not load the results.')
    }
  }, [gameId])

  useEffect(() => {
    return () => {
      request.current += 1
    }
  }, [])

  useEffect(() => {
    void reload()
    let stop = () => {}
    try {
      stop = watchMatchResults(gameId, () => {
        void reload()
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
      void reload()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [remote, waiting, reload])

  const opponents = players.filter((player) => !player.you)
  if (remote && remote.length > 0 && opponents.length === 0) {
    return <EndPanel score={score} found={words} missed={missed} onPlayAgain={onPlayAgain} />
  }

  if (showingPotential) {
    return <PotentialWords words={boardWords(words, missed)} onBack={onBack} />
  }

  return (
    <MatchResults
      players={players}
      notice={notice}
      onRetry={() => void reload()}
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
        <p className="match-kicker">Time's up</p>
        <div className="match-heading">
          <h1 className={outcomeClass(outcome)} aria-live="polite">
            {outcomeLabel(outcome)}
          </h1>
          <button type="button" className="see-words" onClick={onShowPotential}>
            See potential words
          </button>
        </div>
        {notice && (
          <div className="match-alert" role="alert">
            <p>{notice}</p>
            {onRetry && (
              <button type="button" className="match-retry" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        )}
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

export function PotentialWords({
  words,
  onBack,
}: {
  words: readonly ScoredWord[]
  onBack: () => void
}) {
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backRef.current?.focus()
  }, [])

  return (
    <section className="potential">
      <div className="potential-top">
        <button type="button" className="potential-back" onClick={onBack} ref={backRef}>
          Back
        </button>
        <div>
          <h1>Potential words</h1>
          <p className="potential-lede">Every word that could be found on this board.</p>
        </div>
      </div>
      <div className="potential-scroll">
        {words.length === 0 ? (
          <p className="match-empty">No words on this board.</p>
        ) : (
          <WordList words={[...words]} flat />
        )}
      </div>
    </section>
  )
}
