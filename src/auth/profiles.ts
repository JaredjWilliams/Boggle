import {
  createRemoteProfile,
  endRemoteSession,
  matchRemoteProfile,
  restorePlayer,
} from './remote'

const PROFILES_KEY = 'boggle.profiles'
const SESSION_KEY = 'boggle.session'
const localOnly = import.meta.env.MODE === 'test'

export type Credentials = {
  name: string
  username: string
  password: string
}

export type Player = {
  id?: string
  name: string
  username: string
}

export type AuthResult =
  | { ok: true; player: Player }
  | { ok: false; error: string }

export function createProfile(input: Credentials): AuthResult | Promise<AuthResult> {
  if (!localOnly) return createRemoteProfile(input)
  return createLocalProfile(input)
}

function createLocalProfile(input: Credentials): AuthResult {
  const name = input.name.trim()
  const username = input.username.trim()
  const password = input.password.trim()
  if (!name || !username || !password) {
    return { ok: false, error: 'Enter your name, username, and password.' }
  }
  if (usernameTaken(username)) {
    return { ok: false, error: 'That username is already saved in this browser.' }
  }

  const profiles = readProfiles()
  profiles.push({ name, username, password })
  writeProfiles(profiles)
  return { ok: true, player: { name, username } }
}

export function matchProfile(
  username: string,
  password: string,
): AuthResult | Promise<AuthResult> {
  if (!localOnly) return matchRemoteProfile(username, password)
  return matchLocalProfile(username, password)
}

function matchLocalProfile(username: string, password: string): AuthResult {
  const normalized = username.trim()
  const secret = password.trim()
  if (!normalized || !secret) {
    return { ok: false, error: 'Enter your username and password.' }
  }

  const profile = readProfiles().find(
    (saved) => saved.username.toLowerCase() === normalized.toLowerCase(),
  )
  if (!profile || profile.password !== secret) {
    return { ok: false, error: 'No saved profile matches those credentials.' }
  }
  return { ok: true, player: { name: profile.name, username: profile.username } }
}

export function readSession(): Player | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Player>
    if (!parsed.name || !parsed.username) return null
    return { name: parsed.name, username: parsed.username }
  } catch {
    return null
  }
}

export function writeSession(player: Player): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(player))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function endSession(): Promise<void> {
  if (localOnly) {
    clearSession()
    return
  }
  await endRemoteSession()
}

export { restorePlayer }

function usernameTaken(username: string): boolean {
  const normalized = username.toLowerCase()
  return readProfiles().some((profile) => profile.username.toLowerCase() === normalized)
}

function readProfiles(): Credentials[] {
  const raw = localStorage.getItem(PROFILES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCredentials)
  } catch {
    return []
  }
}

function writeProfiles(profiles: Credentials[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

function isCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<Credentials>
  return (
    typeof profile.name === 'string' &&
    typeof profile.username === 'string' &&
    typeof profile.password === 'string'
  )
}
