import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminGame } from '../domain/admin'
import type { DenseCandidate } from '../game/denseBoards'
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

const candidate: DenseCandidate = {
  board: [
    ['c', 'a', 't', 's', 'x'],
    ['r', 'a', 't', 's', 'x'],
    ['x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x'],
  ],
  totalScore: 2400,
  wordCount: 6,
  possibleWords: [
    { word: 'cat', points: 100 },
    { word: 'cats', points: 400 },
  ],
}

function renderAdmin(
  games: AdminGame[] = [daily, friends],
  overrides: Partial<Parameters<typeof AdminScreen>[0]> = {},
) {
  const onProfile = vi.fn()
  const onAskDelete = vi.fn()
  const onConfirmDelete = vi.fn()
  const onCancelDelete = vi.fn()
  const onGenerate = vi.fn()
  const onSelectCandidate = vi.fn()
  const onDailyOn = vi.fn()
  const onFriend = vi.fn()
  const onSetDaily = vi.fn()
  const onSendFriend = vi.fn()
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
      status=""
      pendingKey={null}
      deleting={false}
      onAskDelete={onAskDelete}
      onConfirmDelete={onConfirmDelete}
      onCancelDelete={onCancelDelete}
      trieReady
      generating={false}
      settingDaily={false}
      sending={false}
      candidates={[]}
      selectedIndex={0}
      dailyOn="2026-11-25"
      friendProfiles={players}
      friendId=""
      onGenerate={onGenerate}
      onSelectCandidate={onSelectCandidate}
      onDailyOn={onDailyOn}
      onFriend={onFriend}
      onSetDaily={onSetDaily}
      onSendFriend={onSendFriend}
      {...overrides}
    />,
  )
  return {
    ...view,
    onProfile,
    onAskDelete,
    onConfirmDelete,
    onCancelDelete,
    onGenerate,
    onSelectCandidate,
    onDailyOn,
    onFriend,
    onSetDaily,
    onSendFriend,
  }
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
        status=""
        pendingKey="game:daily"
        deleting={false}
        onAskDelete={onAskDelete}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
        trieReady
        generating={false}
        settingDaily={false}
        sending={false}
        candidates={[]}
        selectedIndex={0}
        dailyOn="2026-11-25"
        friendProfiles={players}
        friendId=""
        onGenerate={vi.fn()}
        onSelectCandidate={vi.fn()}
        onDailyOn={vi.fn()}
        onFriend={vi.fn()}
        onSetDaily={vi.fn()}
        onSendFriend={vi.fn()}
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

  it('shows publish actions for a selected dense candidate', async () => {
    const user = userEvent.setup()
    const { onGenerate, onSetDaily, onSendFriend, onSelectCandidate } = renderAdmin([], {
      candidates: [candidate, { ...candidate, totalScore: 100, wordCount: 1 }],
      selectedIndex: 0,
      friendId: 'grace',
    })

    expect(screen.getByRole('region', { name: 'Publish board' })).toBeInTheDocument()
    expect(screen.getByText('2,400 pts · 6 words')).toBeInTheDocument()
    expect(screen.getByLabelText('Daily date')).toHaveValue('2026-11-25')

    await user.click(screen.getByRole('button', { name: 'Generate dense boards' }))
    expect(onGenerate).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /100 pts · 1 words/ }))
    expect(onSelectCandidate).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Set as daily' }))
    expect(onSetDaily).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Send to friend' }))
    expect(onSendFriend).toHaveBeenCalledOnce()
  })

  it('disables publish actions while generating or saving', () => {
    renderAdmin([], {
      candidates: [candidate],
      selectedIndex: 0,
      friendId: 'grace',
      generating: true,
    })

    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Set as daily' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send to friend' })).toBeDisabled()
  })

  it('keeps the selected date as a YYYY-MM-DD string', () => {
    const { onDailyOn } = renderAdmin([], {
      candidates: [candidate],
      selectedIndex: 0,
    })

    fireEvent.change(screen.getByLabelText('Daily date'), {
      target: { value: '2026-12-01' },
    })
    expect(onDailyOn).toHaveBeenCalledWith('2026-12-01')
  })
})
