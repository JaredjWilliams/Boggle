# Solo Boggle Frontend

A phone-only, solo Boggle game that runs entirely in the browser. The board, dictionary, timer, word checking, and scoring stay in the frontend. Backend, accounts, and multiplayer come later.

The Vite + React + TypeScript app is scaffolded. The starter page has a header with a grid icon and a Boggle wordmark. The word list, dice, timer, board, and scoring are still to build.

## Decisions

- One player. The computer checks words and can show the words that were missed.
- A word can be typed, or traced by tapping and dragging on the grid.
- Layout is a single portrait column, about 390–430px wide. There is no desktop layout.
- Classic 3-minute round and classic scoring.

## Rules

- 16 letter cubes are shuffled into a 4×4 grid. Each cube shows one random face.
- Use the common modern cube set below. One face is `Qu`. `Qu` is one cell and counts as two letters.
- A word must be at least 3 letters.
- Cells must touch horizontally, vertically, or diagonally, in order.
- A cell cannot be reused in the same word.
- The word must be in the bundled English word list. Plurals and other forms count when they are in the list.
- The same spelling scores once, even if it has two meanings or can be traced twice on the board.
- Proper nouns are out because they are not in the list.
- Both a singular and a plural score when the player submits both, for example `HAT` and `HATS`.
- Words inside other words count when each one is submitted, for example `PEAR`, `PEA`, and `EAR`.

### Scoring

| Letters | Points |
| --- | --- |
| 3–4 | 1 |
| 5 | 2 |
| 6 | 3 |
| 7 | 5 |
| 8 or more | 11 |

When the timer hits zero, input locks. The round shows the total, each found word with its points, and the valid words that were not found. Missed words are listed longest and highest-scoring first.

## Cubes

Each string is one cube. Shake by shuffling the 16 cubes, then picking one random face from each. Show `Q` as `Qu`.

```
AAEEGN
ABBJOO
ACHOPS
AFFKPS
AOOTTW
CIMOTU
DEILRX
DELRVY
DISTTY
EEGHNW
EEINSU
EHRTVW
EIOSST
ELRTTY
HIMNQU
HLNNRZ
```

## Stack

Vite, React, and TypeScript. One static word list in the repo, loaded in the browser into a set (for “is this a word?”) and a trie (so the end-of-round search can stop early). A 4×4 search is small enough to run on the page when the timer ends.

The dictionary file is a plain list of lowercase words, one per line, length 3 or more. Matching ignores case. A typed or traced `qu` lines up with the `Qu` cell.

## Round flow

1. Shake the board and start a 3:00 timer.
2. The player types a word, or taps and drags a path.
3. Check length, that the path exists on the board, and that the word is in the dictionary.
4. Add the points and show the word in the list.
5. At zero, lock input and show the score plus missed words.

## Phone layout

The page is one portrait column that fills the screen width, up to about 430px. The viewport meta tag is already in `index.html`. Body margin is zero. The page uses the full height so the grid can stay on screen while the word list scrolls.

From top to bottom, once the game is built:

- Header with the grid icon and the Boggle wordmark. This is already on the starter page.
- A 3:00 timer, the score, and a Shake button that starts a new round.
- A 4×4 grid. Tiles are square, share the screen width with a small gap, and are large enough to tap. `Qu` is labeled on its cube.
- The current path, shown as a string, plus a short message for too short, not on the board, not in the dictionary, or already found.
- A text field at least 16px so the phone keyboard does not zoom the page. The player types a word and submits it.
- A scrollable list of accepted words.

Tracing uses touch: tap adjacent unused tiles, or drag a finger across them. The path is highlighted. Lifting the finger, or submitting from the keyboard, checks the word. A tile that is not adjacent is ignored. Touch dragging does not scroll the page while a finger is on the grid.

The end panel replaces the input area with the score and missed words. That list scrolls inside the phone screen.

## Code layout

- `src/components/Header.tsx` — header, grid icon, and wordmark. Already in place.
- `src/game/dice.ts` — the 16 cubes and a shake that returns a 4×4 board of letter strings (`"Qu"` or a single letter).
- `src/game/dictionary.ts` — load `public/dictionary.txt` and build the set and trie.
- `src/game/words.ts` — path check for a typed word, path check for a traced selection, scoring, and the full-board search used at the end.
- `src/App.tsx` — timer, round state, grid, input, word list, and end summary.
- `src/App.css` — phone-only layout: full-width portrait column, tap-sized tiles, a fixed play area, and a scrollable word list. No desktop breakpoints.

## Still to build

- Add `public/dictionary.txt`.
- Implement the shake, path checking, scoring, and the end-of-round word search.
- Build the timer, grid, typed input, touch tracing, word list, and end summary under the header.
