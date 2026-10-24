export type ArticleTable = {
  kind: 'table'
  caption: string
  columns: readonly string[]
  rows: readonly (readonly string[])[]
  emphasis: readonly number[]
}

export type ArticleBars = {
  kind: 'bars'
  caption: string
  summary: string
  direction: 'up' | 'across'
  mark?: { value: number; label: string }
  bars: readonly { label: string; value: number; emphasis?: boolean }[]
}

export type ArticleHeat = {
  kind: 'heat'
  caption: string
  summary: string
  cells: readonly number[]
}

export type ArticleBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | ArticleTable
  | ArticleBars
  | ArticleHeat

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
      { kind: 'h', text: 'Use Qu when you reach it' },
      {
        kind: 'p',
        text: 'Qu is one tile and two letters, so a path through it jumps a scoring band in a single step. It shows up on about one board in six. Use it when a word you are already tracing runs into it.',
      },
    ],
  },
  {
    id: 'add-an-s',
    title: 'Add an S',
    summary: 'After you enter a word, try it again with an S. Then try ER, then ED.',
    minutes: 2,
    blocks: [
      {
        kind: 'p',
        text: 'Enter the word you see. Then try the same word with an S on the end. If that is not on the board, try ER, then ED. Then leave that word and find another. Adding ING almost never works.',
      },
      { kind: 'h', text: 'More S tiles, higher score' },
      {
        kind: 'p',
        text: 'These scores come from the same 200 boards. A board with no S averages about 101,000 points. That is about one board in five. A board with three S tiles averages about 184,000. That is about one board in six. On a typical board, about a quarter of the points are a shorter word plus S.',
      },
      {
        kind: 'bars',
        caption: 'Average score by how many S tiles you can see',
        summary:
          'Up the side: average score, in thousands of points. Along the bottom: how many S tiles are on the board. The line is the average of all 200 boards, 144,000 points.',
        direction: 'up',
        mark: { value: 144400, label: '144k' },
        bars: [
          { label: 'No S', value: 101000 },
          { label: '1 S', value: 138700 },
          { label: '2 S', value: 161800 },
          { label: '3 S', value: 183500, emphasis: true },
        ],
      },
      {
        kind: 'p',
        text: 'The extra points are those S words. From no S to three S tiles, the average rises by about 83,000 points. On the three-S boards, words made by adding S are worth about 71,000 of that. The other letters are not suddenly worth more.',
      },
      { kind: 'h', text: 'What to add' },
      {
        kind: 'p',
        text: 'About 1 in 5 five-letter words can grow by one letter. About 4 in 10 six-letter words are a five you already had, plus one letter. Look once, then move on.',
      },
      {
        kind: 'table',
        caption: 'Endings already on the board',
        columns: ['Add', 'Times per board'],
        emphasis: [0],
        rows: [
          ['S', '24'],
          ['ER', '5'],
          ['ED', '4'],
          ['ES', '1'],
          ['ING', 'Less than 1'],
        ],
      },
      {
        kind: 'p',
        text: 'You do not need a list of long words. Half the points on a typical board sit in about 50 words, and the best 10 are about 14% of the score. The six-letter word that showed up most often, tenser, was on 10 of the 200 boards. The same long word will not be there next game. Adding S will be.',
      },
      {
        kind: 'list',
        items: [
          'Enter the word in front of you.',
          'Try the same word with an S on the end.',
          'If that fails, try ER, then ED.',
          'Stop. ING is almost never there.',
          'Go find the next word.',
        ],
      },
    ],
  },
  {
    id: 'where-to-start',
    title: 'Start on S, P, C, or T',
    summary: 'Put your finger on one of those letters before you hunt. The middle helps when one of them is sitting there.',
    minutes: 2,
    blocks: [
      {
        kind: 'p',
        text: 'Before the clock runs, find an S, P, C, or T and start there. Words that begin on those letters hold the points. E is the letter you see most, and few words begin on it.',
      },
      { kind: 'h', text: 'The letter beats the square' },
      {
        kind: 'p',
        text: 'The center square starts about 18 words. A corner starts about 6. Use the middle when S, P, C, or T is sitting on it. On most boards the best first square is one of those letters, wherever it landed.',
      },
      {
        kind: 'heat',
        caption: 'How many words start on each square',
        summary:
          'Each box is one square on the board. The number is the average count of words that can begin there. Darker means more words.',
        cells: [
          7.1, 10.2, 11.8, 10.1, 6.1, 9.8, 14.9, 16.0, 14.0, 10.7, 10.1, 15.7, 17.6, 15.8, 10.7, 9.6, 14.0, 15.7,
          14.6, 9.3, 5.3, 9.1, 10.6, 8.1, 6.1,
        ],
      },
      {
        kind: 'bars',
        caption: 'Points you can reach by starting on each letter',
        summary:
          'Each bar is the average points in words that begin on that letter. S, P, C, and T are the ones to look for first.',
        direction: 'across',
        bars: [
          { label: 'S', value: 15030, emphasis: true },
          { label: 'P', value: 13060, emphasis: true },
          { label: 'C', value: 12317, emphasis: true },
          { label: 'T', value: 11283, emphasis: true },
          { label: 'R', value: 9725 },
          { label: 'B', value: 9703 },
          { label: 'D', value: 8507 },
          { label: 'M', value: 8357 },
          { label: 'F', value: 7737 },
          { label: 'L', value: 7504 },
          { label: 'G', value: 7352 },
          { label: 'H', value: 6389 },
          { label: 'A', value: 6299 },
          { label: 'W', value: 6004 },
          { label: 'V', value: 5158 },
          { label: 'Qu', value: 4506 },
          { label: 'K', value: 4427 },
          { label: 'N', value: 3664 },
          { label: 'E', value: 3495 },
          { label: 'O', value: 2962 },
          { label: 'U', value: 2390 },
          { label: 'I', value: 2132 },
          { label: 'J', value: 2082 },
          { label: 'Z', value: 1821 },
          { label: 'Y', value: 1409 },
          { label: 'X', value: 442 },
        ],
      },
      {
        kind: 'p',
        text: 'In the 200 boards, E showed up on 628 squares and S on 288. Starting on E is still worth about 3,500 points, against about 15,000 for S.',
      },
      { kind: 'h', text: 'Use Qu when you reach it' },
      {
        kind: 'p',
        text: 'Every board has one of B, J, K, Qu, X, or Z. None of them is a good place to start. Qu is one tile and two letters, so a path through it jumps a scoring band. Words that use it are about 8,600 points, a small part of that board. Use Qu when a word you are already tracing runs into it. J helps the least: words that use it are about 2,700 points.',
      },
      {
        kind: 'list',
        items: [
          'Scan for S, P, C, or T before you look at the middle.',
          'Start on the one you find.',
          'If the middle has one of those letters, start on that square.',
          'When your path runs into Qu, use it.',
          'Leave J, X, and Z until a word you already know needs them.',
        ],
      },
    ],
  },
]
