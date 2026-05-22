# ReddWall Endpoint Notes

ReddWall uses internal Devvit endpoints. They are not public HTTP APIs.

## Menu Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /internal/menu/wall-thread` | Open the comment-thread form. |
| `POST /internal/menu/raise-wall` | Open the post-level form. |
| `POST /internal/menu/history` | Open recent subreddit activity. |

## Form Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /internal/form/wall-thread-submit` | Preview or run a thread wall. |
| `POST /internal/form/raise-wall-submit` | Preview or run post containment. |
| `POST /internal/form/audit-history-close` | Close the history form. |

The live forms accept Devvit form values for target ID, preview mode, lock,
remove, distinguished-comment protection, phrase filters, and post-only
containment options.

## Trigger Endpoint

| Endpoint | Purpose |
| --- | --- |
| `POST /internal/triggers/on-app-install` | Confirm install trigger handling. |

Install defaults are defined as subreddit settings in `devvit.json`, including
preview-first behavior, comment lock/remove defaults, phrase defaults, post lock
defaults, and strict crowd control defaults.

## Safety Rules

- Thread actions require a comment target ID.
- Post actions require a post target ID.
- Thread actions require preview, lock, or remove.
- Post actions allow preview, comment actions, post lock, or strict crowd
  control.
- Live actions require Reddit post moderation permission.
