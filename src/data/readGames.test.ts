import { beforeEach, describe, expect, it } from 'vitest'
import { loadReadGames, saveReadGames } from './readGames'

beforeEach(() => {
  localStorage.clear()
})

describe('read games', () => {
  it('remembers which completed games a player has opened', () => {
    expect(loadReadGames('ada')).toEqual(new Set())

    saveReadGames('ada', new Set(['g1:grace']))
    saveReadGames('grace', new Set(['g2:ada']))

    expect(loadReadGames('ada')).toEqual(new Set(['g1:grace']))
    expect(loadReadGames('grace')).toEqual(new Set(['g2:ada']))
  })

  it('ignores a stored list that cannot be read', () => {
    localStorage.setItem('boggle.readGames', '{')
    expect(loadReadGames('ada')).toEqual(new Set())

    localStorage.setItem('boggle.readGames', JSON.stringify({ ada: [1, 'g1:grace', null] }))
    expect(loadReadGames('ada')).toEqual(new Set(['g1:grace']))
  })
})
