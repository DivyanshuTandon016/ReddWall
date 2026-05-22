# ReddWall Data Model

ReddWall currently stores recent audit history in Devvit Redis.

## Audit Sorted Set

Key:

```txt
reddwall:audit:{subredditId}
```

Each sorted-set member is a JSON `AuditRecord`. The score is the action timestamp
in milliseconds, which allows the app to read the newest records first.

Fields:

```ts
{
  id: string;
  action: 'raise-wall' | 'wall-thread';
  targetId: string;
  subredditId: string;
  moderatorName: string;
  failedLocks?: number;
  failedRemovals?: number;
  failedPostActions?: string[];
  previewOnly: boolean;
  lock: boolean;
  remove: boolean;
  lockPost: boolean;
  strictCrowdControl: boolean;
  matchTerms: string[];
  targetedCount: number;
  skippedDistinguished: number;
  skippedPhraseFilter: number;
  success: boolean;
  message: string;
  createdAt: string;
}
```

Retention:

```txt
50 most recent records per subreddit
```

## Subreddit Settings

ReddWall also declares Devvit subreddit settings in `devvit.json`.

Settings:

```txt
defaultPhrases
defaultPreviewOnly
defaultRemove
defaultLock
defaultProtectDistinguished
defaultLockPost
defaultStrictCrowdControl
```

These settings pre-fill the moderator action forms when a moderator opens
`Raise ReddWall` or `Wall off thread`.
