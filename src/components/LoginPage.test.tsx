import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProfile } from '../auth/profiles'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves a new profile and opens that player session', async () => {
    const user = userEvent.setup()
    const onSignedIn = vi.fn()
    render(<LoginPage onSignedIn={onSignedIn} />)

    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada Lovelace')
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ada')
    await user.type(screen.getByLabelText('Password'), 'analytical')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(onSignedIn).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      username: 'ada',
    })
    expect(JSON.parse(localStorage.getItem('boggle.profiles') ?? '[]')).toEqual([
      { name: 'Ada Lovelace', username: 'ada', password: 'analytical' },
    ])
  })

  it('signs in with credentials already saved in this browser', async () => {
    createProfile({ name: 'Ada Lovelace', username: 'ada', password: 'analytical' })
    const user = userEvent.setup()
    const onSignedIn = vi.fn()
    render(<LoginPage onSignedIn={onSignedIn} />)

    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ada')
    await user.type(screen.getByLabelText('Password'), 'analytical')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(onSignedIn).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      username: 'ada',
    })
  })

  it('stays on the page when the credentials do not match', async () => {
    createProfile({ name: 'Ada', username: 'ada', password: 'analytical' })
    const user = userEvent.setup()
    const onSignedIn = vi.fn()
    render(<LoginPage onSignedIn={onSignedIn} />)

    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ada')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No saved profile matches those credentials.',
    )
    expect(onSignedIn).not.toHaveBeenCalled()
  })
})
