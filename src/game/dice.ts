const CUBES = [
  'AAEEGN',
  'ABBJOO',
  'ACHOPS',
  'AFFKPS',
  'AOOTTW',
  'CIMOTU',
  'DEILRX',
  'DELRVY',
  'DISTTY',
  'EEGHNW',
  'EEINSU',
  'EHRTVW',
  'EIOSST',
  'ELRTTY',
  'HIMNQU',
  'HLNNRZ',
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
  return [
    faces.slice(0, 4),
    faces.slice(4, 8),
    faces.slice(8, 12),
    faces.slice(12, 16),
  ]
}
