export type ArticleTable = {
  kind: 'table'
  caption: string
  columns: readonly string[]
  rows: readonly (readonly string[])[]
  emphasis: readonly number[]
}

export type ArticleBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | ArticleTable

export type Article = {
  id: string
  title: string
  summary: string
  minutes: number
  blocks: readonly ArticleBlock[]
}

export const ARTICLES: readonly Article[] = [
  {
    id: 'fives-and-sixes',
    title: 'Hunt fives and sixes',
    summary:
      'A six-letter word is the best score for the time it takes. Fives are the next best, and a board is full of them.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'A round lasts three minutes, and a board holds far more words than you can trace. The lengths you look for decide the score. Aim for five- and six-letter words. Six is the single best length.',
      },
      { kind: 'h', text: 'What a word is worth' },
      {
        kind: 'table',
        caption: 'Points by word length',
        columns: ['Letters', 'Points'],
        emphasis: [2, 3],
        rows: [
          ['3', '100'],
          ['4', '400'],
          ['5', '800'],
          ['6', '1,400'],
          ['7', '1,800'],
          ['8', '2,200'],
          ['9 or more', '2,600+'],
        ],
      },
      {
        kind: 'p',
        text: 'The sixth letter is the biggest step in the table. It adds 600 points. A seventh letter adds 400, the same as a new four-letter word. From eight letters on, each extra letter adds another 400.',
      },
      { kind: 'h', text: 'Where those points sit' },
      {
        kind: 'p',
        text: 'These counts come from 200 boards dealt with this game’s dice and dictionary. A typical board holds about 240 words.',
      },
      {
        kind: 'table',
        caption: 'Words and points on a typical board',
        columns: ['Letters', 'Words', 'Share'],
        emphasis: [2, 3],
        rows: [
          ['3', 'about 68', '5%'],
          ['4', 'about 82', '23%'],
          ['5', 'about 51', '29%'],
          ['6', 'about 26', '26%'],
          ['7', 'about 10', '13%'],
          ['8', 'about 3', '4%'],
          ['9 or more', 'rarely one', 'about 1%'],
        ],
      },
      {
        kind: 'p',
        text: 'Fives are the largest share of the points. Sixes are close behind, from about half as many words, so each one you find is worth more. Together they are about half of every point on the board. Fours, fives, and sixes are about three quarters.',
      },
      { kind: 'h', text: 'How to spend the round' },
      {
        kind: 'list',
        items: [
          'Grow a word you can already see until it reaches six letters. When you have a five, look one tile further. That letter is worth more than a whole four-letter word, and your finger is already on the path.',
          'Take a seven when the next letter is obvious: a plural, -ed, -er, or -ing. A seven adds 400 points. Another six is usually the better search. Almost every board has about ten sevens if the ending is sitting there.',
          'Pick up fours as you move. A board has about eighty of them. They are easy to see, and each one is 400 points. They fill the time when a longer path is not in front of you.',
          'Enter a three when your finger is already on it, or in the last few seconds. Threes are about a quarter of the words and about 5% of the points. One six is worth fourteen of them.',
          'Enter an eight or longer when you recognize the word. The score keeps climbing. An eight shows up only a few times, a nine on about one board in three, and a ten on about one board in twelve. Many of the longest legal words are ones you will not be sure of.',
        ],
      },
      { kind: 'h', text: 'Play the Qu tile early' },
      {
        kind: 'p',
        text: 'Qu is one tile and two letters, so a path through it jumps a scoring band in a single step. It shows up on about one board in six. When it is on the grid, start there.',
      },
    ],
  },
]
