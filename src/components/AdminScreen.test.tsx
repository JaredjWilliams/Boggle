import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminGame } from '../domain/admin'
import { AdminScreen } from './AdminScreen'

const daily: AdminGame = {
  id: 'daily',
  source: 'game',
  playedOn: '2026-10-22',
  kind: 'Daily',
  state: 'Finished',
  score: 18,
  words: 6,
  opponents: [],
}

const friends: AdminGame = {
  id: 'friends',
  source: 'game',
  playedOn: '2026-10-21',
  kind: 'Friends',
  state: 'In progress',
  score: 10,
  words: 4,
  opponents: [{ name: 'Grace Hopper', score: null, status: 'playing' }],
}

const players = [
  { id: 'ada', name: 'Ada Lovelace', username: 'ada' },
  { id: 'grace', name: 'Grace Hopper', username: 'grace' },
]

function renderAdmin(games: AdminGame[] = [daily, friends]) {
  const onProfile = vi.fn()
  const onAskDelete = vi.fn()
  const onConfirmDelete = vi.fn()
  const onCancelDelete = vi.fn()
  const view = render(
    <AdminScreen
      profiles={players}
      profilesLoading={false}
      profileId="ada"
      onProfile={onProfile}
      gamesLoading={false}
      profile={players[0]}
      games={games}
      notice=""
      pendingKey={null}
      deleting={false}
      onAskDelete={onAskDelete}
      onConfirmDelete={onConfirmDelete}
      onCancelDelete={onCancelDelete}
    />,
  )
  return { ...view, onProfile, onAskDelete, onConfirmDelete, onCancelDelete }
}

describe('AdminScreen', () => {
  it('shows the profile and a label for each kind of game', () => {
    renderAdmin()

    expect(screen.getByRole('combobox', { name: 'Player' })).toHaveTextContent('Ada Lovelace')
    expect(screen.getByRole('combobox', { name: 'Player' })).toHaveTextContent('ada')
    expect(screen.queryByRole('option', { name: /Grace Hopper/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Ada Lovelace, ada' })).toBeInTheDocument()
    expect(screen.getByText('2 games')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Finished')).toBeInTheDocument()
    expect(screen.getByText('Score 18 · 6 words')).toBeInTheDocument()
    expect(screen.getByText('Friends')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper is still playing')).toBeInTheDocument()
  })

  it('chooses a player from the dropdown', async () => {
    const user = userEvent.setup()
    const { onProfile } = renderAdmin()

    await user.click(screen.getByRole('combobox', { name: 'Player' }))
    await user.click(screen.getByRole('option', { name: /Grace Hopper/ }))

    expect(onProfile).toHaveBeenCalledWith('grace')
    expect(screen.queryByRole('listbox', { name: 'Player' })).not.toBeInTheDocument()
  })

  it('sorts the list from the lowest score', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const list = () => [...screen.getByRole('list', { name: 'Games' }).children]

    expect(screen.getByRole('radio', { name: 'Newest' })).toHaveAttribute('aria-checked', 'true')
    expect(list()[0]).toHaveTextContent('Daily')
    expect(list()[1]).toHaveTextContent('Friends')

    await user.click(screen.getByRole('radio', { name: 'Lowest points' }))

    expect(screen.getByRole('radio', { name: 'Lowest points' })).toHaveAttribute('aria-checked', 'true')
    expect(list()[0]).toHaveTextContent('Friends')
    expect(list()[0]).toHaveTextContent('Score 10')
    expect(list()[1]).toHaveTextContent('Daily')
  })

  it('asks before deleting a game', async () => {
    const user = userEvent.setup()
    const { rerender, onAskDelete, onConfirmDelete, onCancelDelete } = renderAdmin([daily])

    await user.click(screen.getByRole('button', { name: /Delete Daily game/ }))
    expect(onAskDelete).toHaveBeenCalledWith(daily)
    expect(onConfirmDelete).not.toHaveBeenCalled()

    rerender(
      <AdminScreen
        profiles={players}
        profilesLoading={false}
        profileId="ada"
        onProfile={vi.fn()}
        gamesLoading={false}
        profile={players[0]}
        games={[daily]}
        notice=""
        pendingKey="game:daily"
        deleting={false}
        onAskDelete={onAskDelete}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
      />,
    )

    expect(screen.getByText('This removes the game for every player.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep game' }))
    expect(onCancelDelete).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Delete for everyone' }))
    expect(onConfirmDelete).toHaveBeenCalledOnce()
  })

  it('says when a player has no games', () => {
    renderAdmin([])
    expect(screen.getByText('No games saved for this player.')).toBeInTheDocument()
    expect(screen.getByText('0 games')).toBeInTheDocument()
  })
})
