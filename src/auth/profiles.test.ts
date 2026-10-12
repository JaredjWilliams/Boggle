import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  createProfile,
  matchProfile,
  readSession,
  writeSession,
} from './profiles'

describe('profiles', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves credentials in this browser and signs that profile in', () => {
    const created = createProfile({
      name: 'Ada Lovelace',
      username: 'Ada',
      password: 'analytical',
    })

    expect(created).toEqual({
      ok: true,
      player: { name: 'Ada Lovelace', username: 'Ada' },
    })
    expect(JSON.parse(localStorage.getItem('boggle.profiles') ?? '[]')).toEqual([
      { name: 'Ada Lovelace', username: 'Ada', password: 'analytical' },
    ])
    expect(matchProfile('ada', 'analytical')).toEqual({
      ok: true,
      player: { name: 'Ada Lovelace', username: 'Ada' },
    })
  })

  it('rejects a blank profile, a duplicate username, and a wrong password', () => {
    expect(createProfile({ name: ' ', username: 'ada', password: 'secret' })).toEqual({
      ok: false,
      error: 'Enter your name, username, and password.',
    })

    createProfile({ name: 'Ada', username: 'ada', password: 'secret' })

    expect(createProfile({ name: 'Augusta', username: 'ADA', password: 'other' })).toEqual({
      ok: false,
      error: 'That username is already saved in this browser.',
    })
    expect(matchProfile('ada', 'nope')).toEqual({
      ok: false,
      error: 'No saved profile matches those credentials.',
    })
    expect(matchProfile('', '')).toEqual({
      ok: false,
      error: 'Enter your username and password.',
    })
  })

  it('remembers who is signed in until they sign out', () => {
    expect(readSession()).toBeNull()

    writeSession({ name: 'Ada', username: 'ada' })
    expect(readSession()).toEqual({ name: 'Ada', username: 'ada' })

    clearSession()
    expect(readSession()).toBeNull()
    expect(localStorage.getItem('boggle.profiles')).toBeNull()
  })

  it('ignores a damaged cache', () => {
    localStorage.setItem('boggle.profiles', '{')
    localStorage.setItem('boggle.session', '{')

    expect(matchProfile('ada', 'secret')).toEqual({
      ok: false,
      error: 'No saved profile matches those credentials.',
    })
    expect(readSession()).toBeNull()
  })
})
