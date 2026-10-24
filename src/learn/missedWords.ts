export type WordKind = 'noun' | 'verb' | 'adjective' | 'adverb'

export type MissedWord = {
  word: string
  kind: WordKind
  definition: string
}

// Six-letter words left unplayed most often. Each saved result where the word
// was on the board and the player did not enter it counts as one miss.
export const MISSED_SIXES: readonly MissedWord[] = [
  { word: 'donate', kind: 'verb', definition: 'To give money, food, or time, especially to a cause.' },
  { word: 'ratine', kind: 'noun', definition: 'A coarse wool cloth with a nubby surface.' },
  { word: 'artier', kind: 'adjective', definition: 'More artistic, often in a showy way.' },
  { word: 'errata', kind: 'noun', definition: 'A page that lists mistakes found after a book was printed.' },
  { word: 'taenia', kind: 'noun', definition: 'A ribbon worn in the hair, or a narrow band of tissue.' },
  { word: 'tartan', kind: 'noun', definition: 'Cloth woven in a Scottish plaid of colored bands.' },
  { word: 'terrae', kind: 'noun', definition: 'Lands. The plural of terra.' },
  { word: 'anears', kind: 'verb', definition: 'Comes near.' },
  { word: 'nodose', kind: 'adjective', definition: 'Full of knots or swollen nodes.' },
  { word: 'sonata', kind: 'noun', definition: 'A piece of classical music in several movements.' },
  { word: 'stereo', kind: 'noun', definition: 'Sound from two speakers, or a system that plays it.' },
  { word: 'dhooti', kind: 'noun', definition: 'A cloth wrapped around the waist and legs, worn in South Asia.' },
  { word: 'matzas', kind: 'noun', definition: 'Flat pieces of unleavened bread eaten at Passover.' },
  { word: 'mitier', kind: 'adjective', definition: 'More overrun with mites.' },
  { word: 'nitros', kind: 'noun', definition: 'Chemical groups made of one nitrogen and two oxygens.' },
  { word: 'noodge', kind: 'verb', definition: 'To keep pestering someone until they act.' },
  { word: 'ootids', kind: 'noun', definition: 'Cells that are about to become egg cells.' },
  { word: 'rester', kind: 'noun', definition: 'A person who rests.' },
  { word: 'retear', kind: 'verb', definition: 'To tear again.' },
  { word: 'serine', kind: 'noun', definition: 'An amino acid that proteins are built from.' },
  { word: 'sortie', kind: 'noun', definition: 'A sudden raid, or a single flight by one aircraft.' },
  { word: 'todies', kind: 'noun', definition: 'Small bright-green birds of the Caribbean.' },
  { word: 'tondos', kind: 'noun', definition: 'Round paintings or round relief sculptures.' },
  { word: 'denote', kind: 'verb', definition: 'To mean something, or to stand as a sign of it.' },
  { word: 'hereon', kind: 'adverb', definition: 'On this.' },
  { word: 'midair', kind: 'noun', definition: 'The open air above the ground.' },
  { word: 'minors', kind: 'noun', definition: 'People younger than the legal age of adulthood.' },
  { word: 'neoned', kind: 'adjective', definition: 'Lit or outlined with neon.' },
  { word: 'nerols', kind: 'noun', definition: 'Sweet-smelling alcohols found in flower oils.' },
  { word: 'nester', kind: 'noun', definition: 'Someone who settles down and builds a home.' },
  { word: 'nitrid', kind: 'noun', definition: 'A compound of nitrogen with another element.' },
  { word: 'nitril', kind: 'noun', definition: 'A chemical that contains a carbon–nitrogen triple bond.' },
  { word: 'ornate', kind: 'adjective', definition: 'Covered in elaborate decoration.' },
  { word: 'quinoa', kind: 'noun', definition: 'A South American seed that is cooked like a grain.' },
  { word: 'quinol', kind: 'noun', definition: 'A chemical used in developing photographs.' },
  { word: 'radian', kind: 'noun', definition: 'A unit of angle equal to about 57 degrees.' },
  { word: 'reeded', kind: 'adjective', definition: 'Decorated with a row of thin parallel ridges.' },
  { word: 'retire', kind: 'verb', definition: 'To leave a job, or to withdraw from a place.' },
  { word: 'retore', kind: 'verb', definition: 'Tore again.' },
  { word: 'ritard', kind: 'noun', definition: 'A gradual slowing of the tempo.' },
  { word: 'sained', kind: 'verb', definition: 'Blessed by making the sign of the cross.' },
  { word: 'seared', kind: 'verb', definition: 'Burned quickly on the surface.' },
  { word: 'seeder', kind: 'noun', definition: 'A person or machine that sows seed.' },
  { word: 'seiser', kind: 'noun', definition: 'An old spelling of seizer, a person who seizes.' },
  { word: 'signer', kind: 'noun', definition: 'A person who signs their name.' },
  { word: 'sterna', kind: 'noun', definition: 'Breastbones. The plural of sternum.' },
  { word: 'tatars', kind: 'noun', definition: 'Members of a Turkic people of eastern Europe and Asia.' },
  { word: 'titian', kind: 'noun', definition: 'A golden auburn color, especially of hair.' },
  { word: 'triton', kind: 'noun', definition: 'A sea snail with a large spiral shell.' },
  { word: 'twirls', kind: 'verb', definition: 'Spins around.' },
]

export function wordKindLabel(kind: WordKind): string {
  if (kind === 'noun') return 'Noun'
  if (kind === 'verb') return 'Verb'
  if (kind === 'adjective') return 'Adjective'
  return 'Adverb'
}

export function pickMissedWord(
  words: readonly MissedWord[] = MISSED_SIXES,
  avoid?: string,
  random: () => number = Math.random,
): MissedWord {
  if (words.length === 0) throw new Error('missed word list is empty')
  const pool = words.filter((item) => item.word !== avoid)
  const choices = pool.length > 0 ? pool : words
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length))
  return choices[index]
}
