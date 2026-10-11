import type { PointerEvent } from 'react'
import type { Board as LetterBoard } from '../game/dice'
import type { Cell } from '../game/words'
import './Board.css'

type Props = {
  board: LetterBoard
  path: Cell[]
  locked: boolean
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: () => void
}

export function Board({
  board,
  path,
  locked,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  return (
    <div
      className={locked ? 'grid locked' : 'grid'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      {board.map((row, rowIndex) =>
        row.map((letter, colIndex) => {
          const step = path.findIndex(
            (cell) => cell.row === rowIndex && cell.col === colIndex,
          )
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={step >= 0 ? 'tile selected' : 'tile'}
              role="button"
              aria-label={letter}
              data-row={rowIndex}
              data-col={colIndex}
              data-letter={letter}
            >
              {step >= 0 && (
                <span className="step" aria-hidden="true">
                  {step + 1}
                </span>
              )}
              <span>{letter}</span>
            </div>
          )
        }),
      )}
    </div>
  )
}
