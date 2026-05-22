# ReddWall Architecture

## Runtime

ReddWall is a Devvit Web server app. `devvit.json` declares moderator menu
items, form submission endpoints, the app install trigger, subreddit install
settings, Reddit access, Redis access, and the marketing icon.

`src/index.ts` mounts three internal Hono route groups:

- `menu`: opens moderator forms and recent activity.
- `form`: validates form submissions and runs ReddWall actions.
- `triggers`: handles app installation events.

## Moderation Flow

1. A moderator opens `Wall off thread` on a comment or `Raise ReddWall` on a
   post.
2. The menu route loads subreddit defaults from Devvit settings and opens a
   native form.
3. The form route validates target IDs and action choices.
4. `core/reddwall.ts` verifies the current user's post moderation permission.
5. The target comment tree is collected, then safety filters select comments.
6. Preview mode returns a target summary without changing Reddit content.
7. Live runs apply comment locks and removals in bounded batches, then apply
   optional post lock and strict crowd control actions.
8. A Redis-backed audit record is written for previews and live runs.

## Failure Handling

Comment mutations are processed in batches so one failed lock or removal does
not abort every remaining comment action. A partial run reports failed comment
actions and failed post-level actions in the toast and audit history.

## Storage

ReddWall stores only recent moderation activity in Devvit Redis. Subreddit
defaults live in Devvit install settings defined in `devvit.json`.
