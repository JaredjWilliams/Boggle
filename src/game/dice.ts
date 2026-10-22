export const SIDE = 5

const CUBES = [
  'AAAFRS',
  'AAEEEE',
  'AAFIRS',
  'ADENNN',
  'AEEEEM',
  'AEEGMU',
  'AEGMNN',
  'AFIRSY',
  'BJKQXZ',
  'CCNSTW',
  'CEIILT',
  'CEILPT',
  'CEIPST',
  'DDLNOR',
  'DHHLOR',
  'DHHNOT',
  'DHLNOR',
  'EIIITT',
  'EMOTTT',
  'ENSSSU',
  'FIPRSY',
  'GORRVW',
  'HIPRRY',
  'NOOTUW',
  'OOOTTU',
]

export type Board = string[][]

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

function faceOf(cube: string): string {
  const face = cube[Math.floor(Math.random() * cube.length)]
  return face === 'Q' ? 'Qu' : face
}

export function shakeBoard(): Board {
  const faces = shuffle(CUBES).map(faceOf)
  return Array.from({ length: SIDE }, (_, row) =>
    faces.slice(row * SIDE, (row + 1) * SIDE),
  )
}

// Each letter moves one quarter-turn clockwise and stays upright.
export function turnBoard(board: Board): Board {
  const size = board.length
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => board[size - 1 - col][row]),
  )
}
