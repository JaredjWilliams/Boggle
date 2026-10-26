import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'

describe('SettingsScreen', () => {
  it('turns dark mode on and off', async () => {
    const user = userEvent.setup()
    const onThemeChange = vi.fn()
    const { rerender } = render(<SettingsScreen theme="light" onThemeChange={onThemeChange} />)

    const toggle = screen.getByRole('switch', { name: 'Dark mode' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    await user.click(toggle)
    expect(onThemeChange).toHaveBeenCalledExactlyOnceWith('dark')

    rerender(<SettingsScreen theme="dark" onThemeChange={onThemeChange} />)
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('switch', { name: 'Dark mode' }))
    expect(onThemeChange).toHaveBeenLastCalledWith('light')
  })
})
