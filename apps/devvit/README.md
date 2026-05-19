# ReddWall Devvit App

ReddWall is a moderator-first Devvit app for containing risky comment activity
without forcing moderators to clean a thread one click at a time.

## Moderator Actions

- `Wall off thread`: available from a comment. Targets the selected comment and
  its replies.
- `Raise ReddWall`: available from a post. Targets all comments on the post and
  can optionally lock the post or set strict crowd control.
- `Recent ReddWall Activity`: available from the subreddit mod menu. Shows the
  latest ReddWall previews and moderation runs.

## Safety Controls

- Preview mode is enabled by default.
- Distinguished comments are protected by default.
- Moderators can target only comments containing specific phrases.
- Lock and remove are separate toggles.
- Audit history records target counts, skipped counts, phrases, options, and the
  moderator who ran the action.
- Subreddit settings can pre-fill default phrases and moderation toggles.

## Scripts

```bash
npm run dev
npm run lint
npm run type-check
npm run test
npm run build
```

`npm run deploy` runs the verification commands and uploads the app with
`devvit upload`.
