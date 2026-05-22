# ReddWall

ReddWall is a Devvit moderation tool for quickly containing risky Reddit
threads. It gives moderators a fast way to preview, lock, remove, and protect
comment chains during raids, heated arguments, brigading, or spam bursts.

## Current MVP

- Wall off a selected comment thread.
- Raise ReddWall on an entire post.
- Preview how many comments would be targeted before changing anything.
- Lock targeted comments, remove targeted comments, or both.
- Protect distinguished mod/admin comments by default.
- Optionally target only comments containing specific phrases.
- Optionally lock the post and set strict crowd control when raising ReddWall.
- Record recent previews and moderation runs in a subreddit audit history.
- Configure subreddit defaults for phrases and safety toggles.

## Development

```bash
cd apps/devvit
npm install
npm run lint
npm run type-check
npm run test
npm run build
```

Run the app in the configured development subreddit:

```bash
npm run dev
```

The current development subreddit is `r/the_reddwall_dev`.

Submission materials and the required field checklist are drafted in
[`docs/submission.md`](docs/submission.md).
