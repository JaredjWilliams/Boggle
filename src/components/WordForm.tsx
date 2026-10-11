import type { FormEvent } from 'react'
import './WordForm.css'

type Props = {
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
}

export function WordForm({ draft, onDraftChange, onSubmit }: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <input
        className="word-input"
        type="text"
        value={draft}
        placeholder="Type a word"
        aria-label="Type a word"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(event) => onDraftChange(event.target.value)}
      />
      <button type="submit" className="add-word">
        Add
      </button>
    </form>
  )
}
