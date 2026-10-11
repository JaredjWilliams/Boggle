import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BuiltWord } from './BuiltWord'

describe('BuiltWord', () => {
  it('shows the letters being traced, without a score', () => {
    render(<BuiltWord traced="ca" feedback={null} />)

    expect(screen.getByText('ca')).toBeInTheDocument()
    expect(screen.queryByTestId('attempt')).not.toBeInTheDocument()
    expect(document.querySelector('.built-points')).toBeNull()
  })

  it('shows a new word in green with the points added', () => {
    render(
      <BuiltWord
        traced=""
        feedback={{ id: 1, word: 'cats', kind: 'new', points: 400 }}
      />,
    )

    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-new')
    expect(attempt).toHaveTextContent('cats')
    expect(attempt).toHaveTextContent('+400')
  })

  it('shows an already guessed word in orange with its score', () => {
    render(
      <BuiltWord
        traced=""
        feedback={{ id: 2, word: 'cat', kind: 'repeat', points: 100 }}
      />,
    )

    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-repeat')
    expect(attempt).toHaveTextContent('cat')
    expect(attempt).toHaveTextContent('100')
    expect(attempt).not.toHaveTextContent('+')
  })

  it('shows a word that is not legal in red, with no score', () => {
    render(
      <BuiltWord
        traced=""
        feedback={{ id: 3, word: 'xyz', kind: 'invalid', points: 0 }}
      />,
    )

    const attempt = screen.getByTestId('attempt')
    expect(attempt).toHaveClass('built-invalid')
    expect(attempt).toHaveTextContent('xyz')
    expect(attempt.querySelector('.built-points')).toBeNull()
  })

  it('lets a new trace replace the previous result', () => {
    const { rerender } = render(
      <BuiltWord
        traced=""
        feedback={{ id: 1, word: 'cat', kind: 'new', points: 100 }}
      />,
    )
    rerender(
      <BuiltWord
        traced="te"
        feedback={{ id: 1, word: 'cat', kind: 'new', points: 100 }}
      />,
    )

    expect(screen.queryByTestId('attempt')).not.toBeInTheDocument()
    expect(screen.getByText('te')).toBeInTheDocument()
    expect(document.querySelector('.built-points')).toBeNull()
  })
})
