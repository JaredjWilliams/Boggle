import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migration = readFileSync(
  resolve(__dirname, '../../supabase/migrations/20261125030000_admin_set_daily_board.sql'),
  'utf8',
)

describe('set_daily_board migration', () => {
  it('shares a per-day lock between publish and daily result inserts', () => {
    expect(migration).toContain('private.lock_daily_day')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('872014')
    expect(migration).toContain('before insert on public.results')
    expect(migration).toContain('perform private.lock_daily_day(day_on)')
    expect(migration).toContain('perform private.lock_daily_day(p_played_on)')
  })

  it('rejects stale daily results after the lock when the board was replaced', () => {
    expect(migration).toContain('daily_board is distinct from game_board')
    expect(migration).toContain('this daily board was replaced before you finished')
  })

  it('authorizes publish with is_admin and upserts on played_on', () => {
    expect(migration).toContain('private.is_admin()')
    expect(migration).toContain('Only the admin can set the daily board.')
    expect(migration).toContain('That day already has daily results.')
    expect(migration).toContain('on conflict (played_on) do update')
    expect(migration).toContain('daily_boards_pkey is on played_on')
  })
})
