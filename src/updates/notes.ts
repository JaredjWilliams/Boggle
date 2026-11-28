export type UpdateNote = {
  date: string
  label: string
  title: string
  body: string
}

/** Newest first. Shown on the Updates screen from Profile. */
export const UPDATES: readonly UpdateNote[] = [
  {
    date: '2026-11-27',
    label: 'Nov 27',
    title: 'Browse anyone’s stats',
    body: 'On Stats, tap the name under Your stats to open a player picker. It starts on you, and you can switch to anyone else to see their charts and records.',
  },
  {
    date: '2026-11-27',
    label: 'Nov 27',
    title: 'Solo games in Completed',
    body: 'Finished Play Solo boards, and pass-along boards you finished alone, show up under Completed games while the board still exists. Open one to see your summary. The daily board stays on its own results screen.',
  },
  {
    date: '2026-11-27',
    label: 'Nov 27',
    title: 'Stats charts show your day',
    body: 'Words and points by date are line charts: each day’s high and low, plus a trend line across your games.',
  },
  {
    date: '2026-11-24',
    label: 'Nov 24',
    title: 'Daily results word breakdown',
    body: 'On today’s board results you can open a player’s words the same way you do after a match.',
  },
  {
    date: '2026-11-24',
    label: 'Nov 24',
    title: 'Boards you can pass along',
    body: 'Some boards arrive as a solo invite first. After you finish, you can send them on so someone else can play the same board.',
  },
  {
    date: '2026-11-21',
    label: 'Nov 21',
    title: 'App reloads itself after a deploy',
    body: 'When a new build is live, the open app picks up the new version and reloads so you’re not stuck on an old copy.',
  },
  {
    date: '2026-11-19',
    label: 'Nov 19',
    title: 'Clearer match results',
    body: 'The group results screen was rebuilt. Each player’s word count sits with their score so you can see how the round broke down at a glance.',
  },
  {
    date: '2026-11-18',
    label: 'Nov 18',
    title: 'Send a board to several friends',
    body: 'From results, you can invite more than one person to the same board in one send.',
  },
  {
    date: '2026-11-18',
    label: 'Nov 18',
    title: 'Daily high score stays honest',
    body: 'Today’s best score counts live games and archived ones, so an old solo top score still counts toward your day.',
  },
  {
    date: '2026-11-17',
    label: 'Nov 17',
    title: 'Words you had started is gone',
    body: 'That Stats card listed longer words still sitting on a word you found. Showing it meant downloading every possible word from every board, and that was too much to load. Your games are still saved.',
  },
  {
    date: '2026-11-16',
    label: 'Nov 16',
    title: 'Lobby waits without constant refresh',
    body: 'Waiting for someone to finish no longer hammers the server every few seconds. The list updates when they actually play.',
  },
  {
    date: '2026-11-14',
    label: 'Nov 14',
    title: 'Leaderboard trimmed',
    body: 'The Solo plays record came off the leaderboard. Other boards keep the same idea of ranking finished play.',
  },
  {
    date: '2026-11-13',
    label: 'Nov 13',
    title: 'Definitions on potential words',
    body: 'Tap a word after a round and you get a short definition with the path on the board.',
  },
  {
    date: '2026-11-13',
    label: 'Nov 13',
    title: 'Word count on the end screen',
    body: 'Solo and match summaries show how many words you found next to the score.',
  },
  {
    date: '2026-11-05',
    label: 'Nov 5',
    title: 'Home layout cleanup',
    body: 'Shorter bottom nav and a tighter home: solo, friends, today, and your games in one place.',
  },
  {
    date: '2026-11-04',
    label: 'Nov 4',
    title: 'Best score on Today',
    body: 'Home shows your best score for the current day.',
  },
  {
    date: '2026-11-04',
    label: 'Nov 4',
    title: 'Stats and nav icons',
    body: 'The stats screen was reworked, and the bottom nav icons match the rest of the app.',
  },
  {
    date: '2026-11-03',
    label: 'Nov 3',
    title: 'See potential words',
    body: 'After a round you can open every word on that board and tap one to trace it.',
  },
  {
    date: '2026-11-02',
    label: 'Nov 2',
    title: 'Continue a game you left',
    body: 'If you leave mid-round, Home offers Continue with the time and score still on the clock.',
  },
  {
    date: '2026-10-30',
    label: 'Oct 30',
    title: 'Daily wins over time',
    body: 'Daily tracking keeps who won each day’s board across days, not only today’s standings.',
  },
  {
    date: '2026-10-28',
    label: 'Oct 28',
    title: 'Swipe-back stays out of a round',
    body: 'Swipe-back during a round was stopped so you don’t leave the game by accident.',
  },
  {
    date: '2026-10-27',
    label: 'Oct 27',
    title: 'Highest score on the leaderboard',
    body: 'The leaderboard gained boards for highest score and related community records.',
  },
  {
    date: '2026-10-26',
    label: 'Oct 26',
    title: 'Dark mode',
    body: 'Settings can switch light and dark.',
  },
  {
    date: '2026-10-26',
    label: 'Oct 26',
    title: 'Win and loss on completed games',
    body: 'Completed games show Win, Lose, or Tie on the row.',
  },
  {
    date: '2026-10-26',
    label: 'Oct 26',
    title: 'Where you start heat map',
    body: 'Stats include a board heat map of where your words begin.',
  },
  {
    date: '2026-10-24',
    label: 'Oct 24',
    title: 'Learn and Commonly missed',
    body: 'Help opens short articles from the data. Home rotates commonly missed six-letter words with a definition.',
  },
  {
    date: '2026-10-23',
    label: 'Oct 23',
    title: 'Played-back notices',
    body: 'When someone finishes a board you sent, you get a badge and can open that result.',
  },
  {
    date: '2026-10-22',
    label: 'Oct 22',
    title: 'Active, Invited, and Completed tabs',
    body: 'Your games split into those three tabs. Daily locks after you play once, with View results afterward.',
  },
  {
    date: '2026-10-22',
    label: 'Oct 22',
    title: 'Turn the board',
    body: 'Shake became Turn, so you can rotate the board mid-round.',
  },
]
