import type { ActiveGame, Invite } from '../domain/lobby'
import { GameTabs } from './GameTabs'
import './GamesScreen.css'

type Props = {
  games: readonly ActiveGame[]
  readKeys?: ReadonlySet<string>
  invites: readonly Invite[]
  onOpenGame?: (game: ActiveGame) => void
  onAcceptInvite?: (invite: Invite) => void
  onDeclineInvite?: (invite: Invite) => void
}

export function GamesScreen({
  games,
  readKeys,
  invites,
  onOpenGame,
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  return (
    <main className="games-screen">
      <p className="section-kicker">Keep it going</p>
      <h1>Your games</h1>
      <GameTabs
        games={games}
        readKeys={readKeys}
        invites={invites}
        onOpenGame={onOpenGame}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />
    </main>
  )
}
