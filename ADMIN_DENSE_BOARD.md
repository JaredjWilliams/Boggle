# Admin dense board → set daily or send to friend

## Goal

As admin, generate a **dense** 5×5 board (high total possible score), pick one, then choose **one** of:

1. **Set as daily** for a chosen date (default today), or
2. **Send to a friend** as a shared match invite

Two explicit options after the pick—not a combined publish.

## Density helper

Add a pure helper (e.g. `findDenseBoards` in `src/game/`) that:

- Calls `shakeBoard()` for the requested sample count
- Scores each board with `findAllWords(board, trie)` and `scoreWord(word)`
- Returns the top candidates by **total score**, with **word count** as secondary information
- **Keeps scored words on each candidate** — return `possibleWords: ScoredWord[]` alongside total score and word count so **Send to friend** can pass them straight into `createMatch` without rescoring the selected board

Candidate shape (conceptually): `{ board, totalScore, wordCount, possibleWords }`.

Reuse the dictionary trie already loaded by `useRound`. Handle loading, errors, and generation state in the admin UI. Keep the selected candidate stable while the admin chooses an action.

## UI

Extend `AdminScreen` (`src/components/AdminScreen.tsx`) with a **Publish board** section:

- Candidate previews (board + total score + word count)
- Date input defaulting to `playedOn()` — keep selected date as a **YYYY-MM-DD** string
- Separate actions: **Set as daily** and **Send to friend**
- Loading / error / generation state; existing error and notice patterns
- Client `isAdmin` gate remains for showing the UI

## Send to friend

Use:

```ts
createMatch({
  hostId,
  board: candidate.board,
  possibleWords: candidate.possibleWords,
  inviteIds: [friendId],
})
```

with **no** `dailyOn`. Pass the candidate’s precomputed `possibleWords` — do not rescore.

Do **not** use `inviteToBoard` / `SendBoard` — that API is for inviting people to an existing finished board.

## Set as daily

Add `setDailyBoard(day, board)` in `src/api/daily.ts` calling a new `set_daily_board` RPC.

The database function must:

- Authorize the authenticated caller against the admin profile (`jaredjwilliams` / same as `src/auth/admin.ts`)
- Upsert `daily_boards` (check the existing table’s **unique constraint** before choosing the conflict target)
- Reject a date with existing daily results

### Shared per-day lock (required)

A lock **inside `set_daily_board` alone is not enough** — a concurrent `results` insert (today via `saveResult` in `src/api/matches.ts` → direct `results` insert) can slip through between the check and the upsert.

**Daily publish and result-writing paths must use the same per-day transaction lock**, acquired **before** the result is inserted or before results are checked for publish:

1. Shared private helper, e.g. `private.lock_daily_day(played_on date)`, using `pg_advisory_xact_lock` keyed by that day (stable key space; do not collide with existing advisory locks such as `814275` in send-board cleanup).
2. **`set_daily_board`**: acquire lock → check for any `results` on games with `daily_on = day` → reject or upsert.
3. **Result-writing path**: acquire the **same** lock before inserting a result for a daily game. Prefer a `BEFORE INSERT` trigger on `results` that resolves `games.daily_on` and locks when non-null (coordinates with today’s client `saveResult` insert without requiring a new client RPC). Non-daily games skip the lock.
4. **After the lock**, the result trigger must verify `games.board` still matches `daily_boards.board` for that day. Reject a stale result if an admin published a replacement after that game was created. Then: if a result wins the lock first, publishing sees it and rejects; if publishing wins first, a result for the old board is rejected.

That serializes publish vs first daily result so the guard cannot race.

Rely on the RPC for write authorization (client gate is UX only).

## Code map

| Area | Change |
| --- | --- |
| `src/game/` | Pure `findDenseBoards` → candidates with `possibleWords` |
| `src/api/daily.ts` | `setDailyBoard(day, board)` → RPC |
| Matches API | Send via `createMatch` + `candidate.possibleWords` only |
| `AdminScreen` + CSS + container | Publish section, actions, notices |
| `supabase/migrations/` | `lock_daily_day`, result BEFORE INSERT lock, `set_daily_board` + grants |
| Tests | Ranking + `possibleWords`; lock/guard behavior where feasible; UI action states |

## Implementation todos

1. Add `findDenseBoards` returning top K with `board`, `totalScore`, `wordCount`, and `possibleWords: ScoredWord[]`
2. Shared per-day lock for `set_daily_board` and daily result insert; admin RPC upsert with result guard
3. Add `setDailyBoard(day, board)`; send via `createMatch` using `candidate.possibleWords`, no `dailyOn`
4. Extend `AdminScreen`: Publish board section, candidate previews, date input, Set as daily OR Send to friend; stable selection; loading/errors/generation
5. Focused tests for ranking, lock/guard behavior where feasible, UI action states; run `npm test` and verification below

## Out of scope

- Public share links / codes
- Manual letter editing
- Replacing a daily after people have already submitted results
- Web worker for search
- `inviteToBoard` / `SendBoard` for this flow

## Verification

- Unit tests for score-based candidate ranking (including retained `possibleWords`)
- RPC authorization/guard and shared-lock behavior where feasible
- UI action states
- `npm test`
- Manual: generate → set tomorrow’s daily → confirm `loadDailyBoard` path; generate → invite a friend → lobby invite appears
