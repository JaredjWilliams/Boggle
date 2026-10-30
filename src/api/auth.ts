import { accountEmail } from '../auth/account'
import { getSupabase } from '../lib/supabase'

type Credentials = {
  name: string
  username: string
  password: string
}

export type RemotePlayer = {
  id: string
  name: string
  username: string
}

export type RemoteResult =
  | { ok: true; player: RemotePlayer }
  | { ok: false; error: string }

function profileFromRow(row: { id: string; name: string; username: string }): RemotePlayer {
  return { id: row.id, name: row.name, username: row.username }
}

async function readProfile(id: string): Promise<RemotePlayer | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, name, username')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? profileFromRow(data) : null
}

export async function createRemoteProfile(input: Credentials): Promise<RemoteResult> {
  const name = input.name.trim()
  const username = input.username.trim()
  const password = input.password.trim()
  if (!name || !username || !password) {
    return { ok: false, error: 'Enter your name, username, and password.' }
  }

  const { data, error } = await getSupabase().auth.signUp({
    email: accountEmail(username),
    password,
    options: { data: { name, username: username.toLowerCase() } },
  })
  if (error) {
    const taken = /already registered|duplicate key|username/i.test(error.message)
    return {
      ok: false,
      error: taken ? 'That username is already taken.' : error.message,
    }
  }
  if (!data.user || !data.session) {
    return { ok: false, error: 'Check your email to confirm the account, then sign in.' }
  }

  const { error: saved } = await getSupabase().from('profiles').upsert({
    id: data.user.id,
    username: username.toLowerCase(),
    name,
  })
  if (saved) return { ok: false, error: saved.message }

  return { ok: true, player: { id: data.user.id, name, username: username.toLowerCase() } }
}

export async function matchRemoteProfile(
  username: string,
  password: string,
): Promise<RemoteResult> {
  const normalized = username.trim()
  const secret = password.trim()
  if (!normalized || !secret) {
    return { ok: false, error: 'Enter your username and password.' }
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: accountEmail(normalized),
    password: secret,
  })
  if (error || !data.user) {
    return { ok: false, error: 'No saved profile matches those credentials.' }
  }

  const player = await readProfile(data.user.id)
  if (!player) return { ok: false, error: 'No saved profile matches those credentials.' }
  return { ok: true, player }
}

export async function restorePlayer(): Promise<RemotePlayer | null> {
  const { data } = await getSupabase().auth.getSession()
  if (!data.session) return null
  return readProfile(data.session.user.id)
}

export async function endRemoteSession(): Promise<void> {
  await getSupabase().auth.signOut()
}
