# Admin dense board → set daily or send to friend

## Goal

As admin, generate a **dense** 5×5 board (high total possible score), pick one, then choose **one** of:

1. **Set as daily** for a chosen date (default today), or
2. **Send to a friend** as a **pass-along solo invitation**

Two explicit options after the pick—not a combined publish.

## Density helper

Add a pure helper (e.g. `findDenseBoards` in `src/game/`) that:

- Calls `shakeBoard()` for the requested sample count
- Scores each board with `findAllWords(board, trie)` and `scoreWord(word)`
- Returns the top candidates by **total score**, with **word count** as secondary information
- **Keeps scored words on each candidate** — return `possibleWords: ScoredWord[]` alongside total score and word count so **Send to friend** can pass them without rescoring

Candidate shape (conceptually): `{ board, totalScore, wordCount, possibleWords }`.

Reuse the dictionary trie already loaded by `useRound`. Handle loading, errors, and generation state in the admin UI. Keep the selected candidate stable while the admin chooses an action.

## UI

Extend `AdminScreen` (`src/components/AdminScreen.tsx`) with a **Publish board** section:

- Candidate previews (board + total score + word count)
- Date input defaulting to `playedOn()` — keep selected date as a **YYYY-MM-DD** string
- Separate actions: **Set as daily** and **Send to friend**
- Loading / error / generation state; existing error and notice patterns
- Client `isAdmin` gate remains for showing the UI

## Send to friend (pass-along solo)

Do **not** use `createMatch` unchanged — it seats the host as `accepted`.

Use the admin-gated RPC path:

```ts
createSoloInvite({
  board: candidate.board,
  possibleWords: candidate.possibleWords,
  friendId,
})
```

Server (`create_solo_invite`):

- Authorize with `private.is_admin()`
- Insert `games` with `host_id = admin`, `pass_along = true`, `daily_on = null`
- Insert **only** an `invited` seat for the friend with `invited_by = admin`
- Do **not** add an accepted seat or start a round for the admin

### Accept and forward

- Lobby marks `passAlongSolo` when `pass_along` is true and the game has **no results yet**
- On accept, if `inviteStartsSolo(invite)`, set rivals to `[]` and start a solo round (no waiting opponent)
- After the round, use existing **Send this board** / `invite_to_board` to invite the original admin or others (`invited_by` = the forwarder)
- Forwarded invites on a board that already has a result are **not** solo: accept sets the immediate sender as rival (H2H / comparison)
- Because the admin never had an accepted seat, `invite_to_board` can invite them back
- Ordinary `createMatch` head-to-head behavior is unchanged (`pass_along = false`, host accepted seat)

## Set as daily

Add `setDailyBoard(day, board)` in `src/api/daily.ts` calling `set_daily_board`.

- Authorize with `private.is_admin()`
- Upsert `daily_boards` on primary key `played_on`
- Reject a date with existing daily results
- Shared `private.lock_daily_day` for publish and daily result inserts
- After locking, reject a result whose `games.board` no longer matches that day’s `daily_boards.board`

Keep daily publishing separate from friend invitations.

## Verification

- Unit tests for score-based candidate ranking (including retained `possibleWords`)
- Solo invite creation (RPC, no host seat from client)
- Accept: solo for first pass-along; forwarder as rival after Send this board; H2H unchanged
- Daily RPC guards where feasible
- UI action states
- `npm test` / `tsc -b`

## Migration / policy assumptions

- `games.pass_along boolean not null default false` (applied remotely)
- `create_solo_invite` and `set_daily_board` are `security definer`, executable by `authenticated`, gated by `private.is_admin()` (username `jaredjwilliams`)
- `invite_to_board` unchanged: still requires caller result; rejects accepted seats as `playing`
- Existing H2H RLS / insert paths for `createMatch` unchanged
