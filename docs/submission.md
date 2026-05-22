# ReddWall Submission Pack

## Hackathon Status

ReddWall is aimed at the `Best New Mod Tool` category.

| Requirement | Status | Submission value |
| --- | --- | --- |
| Devvit app built for Reddit communities | Done | Uploaded ReddWall app |
| Text description of features and functionality | Drafted | Use the description below |
| Reddit usernames for all participants | Needed | Fill before submit |
| App listing link | Done | `https://developers.reddit.com/apps/the-reddwall` |
| Project Impact with 1-3 communities | Needed | Fill community names in the draft below |
| Working judging link | Needed | Public Reddit post running the app in a subreddit under 200 members |
| Live Reddit playtest after final upload | Needed | Confirm menu actions, settings, and history |
| Demo video | Optional | Keep judged footage under one minute |
| Public repository link | Optional | Add only if the repository is ready to share |

The submission deadline is `May 27, 2026 at 6:00 pm PDT`. Do not mark the
submission ready until every `Needed` row above has a real value.

## Entrant Confirmations

Confirm these before clicking submit:

- Every participant is eligible to enter and their Reddit username is included.
- ReddWall is original work for the `Best New Mod Tool` category and was created
  or significantly updated during the submission period.
- The code, assets, screenshots, and optional demo footage are materials the
  entrant has the right to submit.
- The judging link stays free and available through the judging period.

## Devpost Draft

### Project

ReddWall

### Tagline

Preview and contain risky Reddit threads before cleanup turns into a tab storm.

### Description

ReddWall is a moderator-first Devvit tool for quickly containing risky comment
activity from native Reddit menus. A moderator can wall off a selected comment
thread or raise ReddWall on an entire post, preview the affected comment count,
then lock comments, remove comments, or do both.

The tool is built for incidents where moderation speed matters but blind bulk
actions are risky. Preview mode is enabled by default. Distinguished mod and
admin comments are protected by default. Phrase targeting can narrow an action
to repeated spam or raid language. At the post level, moderators can also lock
the post and set strict crowd control from the same flow.

ReddWall records recent previews and moderation runs in subreddit activity
history so a moderation team can inspect what was targeted, what was skipped,
which options were used, and whether any comment or post-level action failed.

### Project Impact

Communities:

- `TODO: r/<community-one>`
- `TODO: r/<community-two>`
- `TODO: r/<community-three>` or remove this line

ReddWall shortens the path from spotting a thread that is spiraling to getting
it contained. It keeps the moderator inside Reddit, replaces repetitive
comment-by-comment cleanup with a guided action, and exposes the target count
before changes land. That combination helps moderators react faster while still
being deliberate about scope.

This is especially useful for communities that run fast-moving discussions,
high-visibility posts, event threads, or comment sections where repeated spam
and pile-ons can spread before a moderator can clean every branch by hand.

### Core Features

- Native moderator actions for a comment thread or whole post.
- Preview-first target summaries.
- Separate lock and remove controls.
- Optional phrase targeting.
- Distinguished-comment protection.
- Optional post lock and strict crowd control.
- Redis-backed recent activity history.
- Subreddit install settings for default phrases and safety toggles.
- Batched comment mutation with partial-failure reporting.

## Demo Script

This script is designed for a judged clip under one minute.

1. Open a seeded test post with a risky comment chain.
2. Open `Wall off thread` on one comment.
3. Show preview mode, phrase targeting, and the target count toast.
4. Reopen and run lock/remove on the selected thread.
5. Open `Raise ReddWall` on the post and show post lock plus strict crowd
   control options.
6. Open `Recent ReddWall Activity` and show the recorded preview/run history.
7. End on the message: "Contain first. Clean with context."

## Submission Checklist

- Select category: `Best New Mod Tool`
- Reddit usernames for every team member: `TODO`
- Text description: use the draft above
- Devvit app listing link: `https://developers.reddit.com/apps/the-reddwall`
- Project Impact: fill 1-3 community names and use the draft above
- Working judging link: `TODO` public Reddit post running ReddWall in a public
  subreddit under 200 members
- Final live playtest after the uploaded build: `TODO`
- Optional demo video link: `TODO`
- Optional public repository link: `TODO`
- Entrant confirmations above checked before submit
