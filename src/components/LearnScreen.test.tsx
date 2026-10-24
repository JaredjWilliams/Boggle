import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LearnScreen } from './LearnScreen'

describe('LearnScreen', () => {
  it('lists articles and opens one to read', async () => {
    const user = userEvent.setup()
    render(<LearnScreen />)

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hunt fives and sixes/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Hunt fives and sixes/ }))

    const article = screen.getByRole('article')
    expect(within(article).getByRole('heading', { name: 'Hunt fives and sixes' })).toBeInTheDocument()
    expect(article).toHaveTextContent('Six is the single best length.')
    expect(article).toHaveTextContent('The sixth letter is the biggest step')
    expect(article).toHaveTextContent('1,400')
    expect(article).toHaveTextContent('Qu is one tile and two letters')

    const scores = within(article).getByRole('table', { name: 'Points by word length' })
    expect(scores).toHaveTextContent('6')
    expect(scores).toHaveTextContent('1,400')

    await user.click(screen.getByRole('button', { name: 'All articles' }))
    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows an empty library when no articles are published', () => {
    render(<LearnScreen articles={[]} />)

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    expect(screen.getByText('No articles yet.')).toBeInTheDocument()
  })
})
