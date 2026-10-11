import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EndPanel } from './EndPanel'

const found = [
  { word: 'toe', points: 1 },
  { word: 'cry', points: 1 },
]
const missed = [
  { word: 'recreation', points: 11 },
  { word: 'creation', points: 11 },
  { word: 'carotin', points: 5 },
]

function renderSummary() {
  const onPlayAgain = vi.fn()
  render(
    <EndPanel
      score={2}
      found={found}
      missed={missed}
      onPlayAgain={onPlayAgain}
    />,
  )
  return { onPlayAgain }
}

describe('EndPanel', () => {
  it('shows the score, found words, and possible words', () => {
    renderSummary()

    expect(screen.getByText("Time's up")).toBeInTheDocument()
    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score2$/)

    const yourWords = column('Your words')
    const possible = column('Possible words')

    expect(items(yourWords)).toEqual([
      { word: 'toe', points: '1' },
      { word: 'cry', points: '1' },
    ])
    expect(items(possible)).toEqual([
      { word: 'recreation', points: '11' },
      { word: 'creation', points: '11' },
      { word: 'carotin', points: '5' },
    ])
  })

  it('shows empty states when nothing was found and nothing was missed', () => {
    render(
      <EndPanel score={0} found={[]} missed={[]} onPlayAgain={vi.fn()} />,
    )

    expect(screen.getByText('Score').closest('p')).toHaveTextContent(/^Score0$/)
    expect(within(column('Your words')).getByText('None this round.')).toBeInTheDocument()
    expect(
      within(column('Possible words')).getByText('You found every word.'),
    ).toBeInTheDocument()
  })

  it('starts another round only when Play again is chosen', async () => {
    const { onPlayAgain } = renderSummary()

    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))

    expect(onPlayAgain).toHaveBeenCalledOnce()
  })

  it('places the two lists side by side, each in its own vertical scroller', () => {
    renderSummary()

    const columns = document.querySelector('.summary-columns')
    expect(columns).not.toBeNull()
    expect(columns?.children).toHaveLength(2)
    expect(styleOf('.summary-columns').display).toBe('grid')
    expect(styleOf('.summary-columns').gridTemplateColumns).toBe('1fr 1fr')

    const scrolls = columns?.querySelectorAll(':scope > .summary-column > .summary-scroll')
    expect(scrolls).toHaveLength(2)
    expect(styleOf('.summary-scroll').overflow).toBe('auto')
  })
})

function styleOf(selector: string) {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
        return rule.style
      }
    }
  }
  throw new Error(`Missing style rule ${selector}`)
}

function column(title: string) {
  const heading = screen.getByRole('heading', { name: title })
  const section = heading.closest('.summary-column')
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing column for ${title}`)
  }
  return section
}

function items(section: HTMLElement) {
  return within(section)
    .getAllByRole('listitem')
    .map((item) => {
      const [word, points] = [...item.querySelectorAll('span')].map(
        (span) => span.textContent,
      )
      return { word, points }
    })
}
