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
    expect(screen.getByRole('button', { name: /Add an S/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start on S, P, C, or T/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Hunt fives and sixes/ }))

    const article = screen.getByRole('article')
    expect(within(article).getByRole('heading', { name: 'Hunt fives and sixes' })).toBeInTheDocument()
    expect(article).toHaveTextContent('Six is the single best length.')
    expect(article).toHaveTextContent('The sixth letter is the biggest step')
    expect(article).toHaveTextContent('1,400')
    expect(article).toHaveTextContent('Qu is one tile and two letters')
    expect(article).toHaveTextContent('Use it when a word you are already tracing runs into it.')

    const scores = within(article).getByRole('table', { name: 'Points by word length' })
    expect(scores).toHaveTextContent('6')
    expect(scores).toHaveTextContent('1,400')

    await user.click(screen.getByRole('button', { name: 'All articles' }))
    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Add an S/ }))
    const endings = screen.getByRole('article')
    expect(within(endings).getByRole('heading', { name: 'Add an S' })).toBeInTheDocument()
    expect(endings).toHaveTextContent('try the same word with an S on the end')
    const sTiles = within(endings).getByRole('figure', { name: 'Average score by how many S tiles you can see' })
    expect(sTiles).toHaveTextContent('184k')
    expect(sTiles).toHaveTextContent('144k')
    expect(within(endings).getByRole('table', { name: 'Endings already on the board' })).toHaveTextContent('ING')

    await user.click(screen.getByRole('button', { name: 'All articles' }))
    await user.click(screen.getByRole('button', { name: /Start on S, P, C, or T/ }))
    const starts = screen.getByRole('article')
    expect(within(starts).getByRole('heading', { name: 'Start on S, P, C, or T' })).toBeInTheDocument()
    expect(starts).toHaveTextContent('find an S, P, C, or T and start there')
    const squares = within(starts).getByRole('figure', { name: 'How many words start on each square' })
    expect(squares).toHaveTextContent('17.6')
    expect(within(squares).getByLabelText('Row 3, column 3, 17.6 words')).toBeInTheDocument()
    const letters = within(starts).getByRole('figure', { name: 'Points you can reach by starting on each letter' })
    expect(letters).toHaveTextContent('15,030')
    expect(letters).toHaveTextContent('3,495')
    expect(starts).toHaveTextContent('Use Qu when a word you are already tracing runs into it.')
  })

  it('shows an empty library when no articles are published', () => {
    render(<LearnScreen articles={[]} />)

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument()
    expect(screen.getByText('No articles yet.')).toBeInTheDocument()
  })
})
