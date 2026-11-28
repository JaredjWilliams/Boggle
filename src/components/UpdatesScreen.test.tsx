import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UpdatesScreen } from './UpdatesScreen'

describe('UpdatesScreen', () => {
  it('lists updates newest first', () => {
    render(
      <UpdatesScreen
        updates={[
          {
            date: '2026-11-27',
            label: 'Nov 27',
            title: 'Solo games in Completed',
            body: 'Finished solo boards show up under Completed games.',
          },
          {
            date: '2026-11-17',
            label: 'Nov 17',
            title: 'Words you had started is gone',
            body: 'That Stats card is gone.',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Updates' })).toBeInTheDocument()
    const items = screen.getByRole('list', { name: 'Updates' }).querySelectorAll('li')
    expect(items[0]).toHaveTextContent('Solo games in Completed')
    expect(items[1]).toHaveTextContent('Words you had started is gone')
  })

  it('shows an empty state when nothing is published', () => {
    render(<UpdatesScreen updates={[]} />)
    expect(screen.getByText('No updates yet.')).toBeInTheDocument()
  })
})
