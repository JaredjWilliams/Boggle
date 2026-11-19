import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SendBoard } from './SendBoard'

const loadBoardSeats = vi.hoisted(() => vi.fn())

vi.mock('../api/results', () => ({
  loadBoardSeats,
}))

const friends = [
  { id: 'grace', name: 'Grace Hopper', username: 'grace' },
  { id: 'mina', name: 'Mina Chen', username: 'mina' },
  { id: 'ned', name: 'Ned', username: 'ned' },
  { id: 'jonah', name: 'Jonah Park', username: 'jonah' },
  { id: 'kim', name: 'Kim', username: 'kim' },
]

beforeEach(() => {
  loadBoardSeats.mockReset()
  loadBoardSeats.mockResolvedValue([
    { playerId: 'grace', status: 'accepted', finished: true },
    { playerId: 'mina', status: 'invited', finished: false },
    { playerId: 'ned', status: 'accepted', finished: false },
    { playerId: 'jonah', status: 'declined', finished: false },
  ])
})

describe('SendBoard', () => {
  it('sends several friends and keeps played, invited, and in-progress players unavailable', async () => {
    const onSend = vi.fn().mockResolvedValue({ invited: ['jonah', 'kim'], rejected: [] })
    render(<SendBoard gameId="game-1" friends={friends} onSend={onSend} />)

    expect(screen.queryByRole('button', { name: 'Send this board' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send this board' }))
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

    const grace = screen.getByRole('checkbox', { name: /Grace Hopper/ })
    const mina = screen.getByRole('checkbox', { name: /Mina Chen/ })
    const ned = screen.getByRole('checkbox', { name: /Ned/ })
    const jonah = screen.getByRole('checkbox', { name: /Jonah Park/ })
    const kim = screen.getByRole('checkbox', { name: /Kim/ })
    expect(grace).toBeDisabled()
    expect(mina).toBeDisabled()
    expect(ned).toBeDisabled()
    expect(jonah).toBeEnabled()
    expect(kim).toBeEnabled()
    expect(screen.getByText('Already played')).toBeInTheDocument()
    expect(screen.getByText('Invited')).toBeInTheDocument()
    expect(screen.getByText('Still playing')).toBeInTheDocument()

    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()
    await userEvent.click(jonah)
    await userEvent.click(kim)
    expect(send).toBeEnabled()
    await userEvent.click(send)

    expect(onSend).toHaveBeenCalledWith(['jonah', 'kim'])
    expect(loadBoardSeats).toHaveBeenCalledWith('game-1')
  })

  it('closes the send sheet from the corner button', async () => {
    render(<SendBoard gameId="game-1" friends={friends} onSend={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Send this board' }))
    expect(screen.getByRole('dialog', { name: 'Send this board' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Send this board' })).not.toBeInTheDocument()
  })
})
