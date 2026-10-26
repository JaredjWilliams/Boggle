import { describe, expect, it } from 'vitest'
import { isAdmin } from './admin'

describe('isAdmin', () => {
  it('matches only the admin username', () => {
    expect(isAdmin({ username: 'jaredjwilliams' })).toBe(true)
    expect(isAdmin({ username: ' JaredJWilliams ' })).toBe(true)
    expect(isAdmin({ username: 'ada' })).toBe(false)
    expect(isAdmin({ username: 'jaredjwilliams2' })).toBe(false)
  })
})
