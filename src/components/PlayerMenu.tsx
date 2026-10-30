import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { AdminProfile } from '../domain/admin'

type Props = {
  profiles: readonly AdminProfile[]
  profileId: string
  placeholder: string
  disabled: boolean
  onProfile: (profileId: string) => void
}

export function PlayerMenu({ profiles, profileId, placeholder, disabled, onProfile }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = profiles.find((player) => player.id === profileId)

  useEffect(() => {
    if (!open) return
    const selectedOption = rootRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    const firstOption = rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]')
    ;(selectedOption ?? firstOption)?.focus()

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function moveOption(event: ReactKeyboardEvent, direction: 1 | -1) {
    const options = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const next = options[index + direction]
    if (!next) return
    event.preventDefault()
    next.focus()
  }

  return (
    <div className="admin-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        id="admin-player"
        type="button"
        className="admin-select"
        role="combobox"
        aria-labelledby="admin-player-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="admin-player-list"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {selected ? (
          <span className="admin-select-copy">
            <span>{selected.name}</span>
            <small>{selected.username}</small>
          </span>
        ) : (
          <span className="admin-select-placeholder">{placeholder}</span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          id="admin-player-list"
          className="admin-select-menu"
          role="listbox"
          aria-labelledby="admin-player-label"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') moveOption(event, 1)
            if (event.key === 'ArrowUp') moveOption(event, -1)
          }}
        >
          {profiles.map((player) => (
            <li key={player.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={player.id === profileId}
                onClick={() => {
                  onProfile(player.id)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
              >
                <span>{player.name}</span>
                <small>{player.username}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={open ? 'admin-chevron is-open' : 'admin-chevron'}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
