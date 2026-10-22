import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FriendsScreen, type ListedPlayer } from './FriendsScreen'

const grace: ListedPlayer = { id: 'grace', name: 'Grace Hopper', username: 'grace' }
const ada: ListedPlayer = { id: 'ada', name: 'Ada Lovelace', username: 'ada' }

describe('FriendsScreen', () => {
  it('starts a game with the player you choose', async () => {
    const onStartWith = vi.fn()
    render(<FriendsScreen friends={[grace, ada]} loading={false} onStartWith={onStartWith} />)

    expect(screen.getByRole('heading', { name: 'Play with a friend.' })).toBeInTheDocument()
    expect(screen.queryByText('No other players yet.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Play with Grace Hopper, grace' }))

    expect(onStartWith).toHaveBeenCalledExactlyOnceWith(grace)
  })

  it('shows an empty list before anyone else has joined', () => {
    render(<FriendsScreen friends={[]} loading={false} onStartWith={vi.fn()} />)

    expect(screen.getByText('No other players yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('waits while players load', () => {
    render(<FriendsScreen friends={[]} loading onStartWith={vi.fn()} />)

    expect(screen.getByText('Loading players…')).toBeInTheDocument()
    expect(screen.queryByText('No other players yet.')).not.toBeInTheDocument()
  })

  it('keeps play closed until a game can start', async () => {
    const onStartWith = vi.fn()
    render(
      <FriendsScreen
        friends={[grace]}
        loading={false}
        disabled
        notice="Could not load the word list."
        onStartWith={onStartWith}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the word list.')
    expect(screen.getByRole('button', { name: 'Play with Grace Hopper, grace' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Play with Grace Hopper, grace' }))
    expect(onStartWith).not.toHaveBeenCalled()
  })
})
