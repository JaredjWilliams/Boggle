import { useState, type FormEvent } from 'react'
import { createProfile, matchProfile, type Player } from '../auth/profiles'
import './LoginPage.css'

type Mode = 'sign-in' | 'create'

type Props = {
  onSignedIn: (player: Player) => void
}

export function LoginPage({ onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result =
      mode === 'create'
        ? createProfile({ name, username, password })
        : matchProfile(username, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    onSignedIn(result.player)
  }

  function switchMode() {
    setMode((current) => (current === 'sign-in' ? 'create' : 'sign-in'))
    setError('')
  }

  const creating = mode === 'create'

  return (
    <main className="login">
      <h1>{creating ? 'Create account' : 'Sign in'}</h1>
      <p className="login-lede">
        {creating
          ? 'Save a profile in this browser, then open your dashboard.'
          : 'Use the profile saved in this browser to open your dashboard.'}
      </p>

      <form className="login-form" onSubmit={onSubmit}>
        {creating && (
          <label className="login-label">
            Name
            <input
              className="login-field"
              type="text"
              name="name"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}

        <label className="login-label">
          Username
          <input
            className="login-field"
            type="text"
            name="username"
            value={username}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="login-label">
          Password
          <input
            className="login-field"
            type="password"
            name="password"
            value={password}
            autoComplete={creating ? 'new-password' : 'current-password'}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-submit">
          {creating ? 'Save profile' : 'Sign in'}
        </button>
      </form>

      <button type="button" className="login-switch" onClick={switchMode}>
        {creating ? 'Have a profile? Sign in' : 'New here? Create an account'}
      </button>
    </main>
  )
}
