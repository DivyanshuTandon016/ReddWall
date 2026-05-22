import { reddit } from '@devvit/web/server';
import type { Comment, Post } from '@devvit/web/server';
import type { T1, T3, T5 } from '@devvit/shared-types/tid.js';
import {
  describeWallAction,
  getCommentDecision,
  parseMatchTerms,
} from './reddwall-helpers';
import { appendAuditRecord, type AuditAction } from './audit-log';

export type WallThreadProps = {
  remove: boolean;
  lock: boolean;
  skipDistinguished: boolean;
  previewOnly: boolean;
  matchTerms: string;
  commentId: T1;
  subredditId: T5;
};

export type WallPostProps = {
  remove: boolean;
  lock: boolean;
  skipDistinguished: boolean;
  previewOnly: boolean;
  matchTerms: string;
  lockPost: boolean;
  strictCrowdControl: boolean;
  postId: T3;
  subredditId: T5;
};

type WallSelection = {
  skippedDistinguished: number;
  skippedPhraseFilter: number;
  targets: Comment[];
};

type WallResult = {
  message: string;
  success: boolean;
};

type WallActionFailures = {
  failedLocks: number;
  failedPostActions: string[];
  failedRemovals: number;
};

type CommentMutationResult = {
  failed: number;
};

const COMMENT_MUTATION_BATCH_SIZE = 25;

const saveAuditRecord = async (input: {
  action: AuditAction;
  failures?: WallActionFailures;
  lock: boolean;
  lockPost?: boolean;
  matchTerms: string[];
  message: string;
  moderatorName: string;
  previewOnly: boolean;
  remove: boolean;
  selection: WallSelection;
  strictCrowdControl?: boolean;
  subredditId: T5;
  success: boolean;
  targetId: T1 | T3;
}) => {
  try {
    await appendAuditRecord({
      action: input.action,
      failedLocks: input.failures?.failedLocks ?? 0,
      failedPostActions: input.failures?.failedPostActions ?? [],
      failedRemovals: input.failures?.failedRemovals ?? 0,
      lock: input.lock,
      lockPost: Boolean(input.lockPost),
      matchTerms: input.matchTerms,
      message: input.message,
      moderatorName: input.moderatorName,
      previewOnly: input.previewOnly,
      remove: input.remove,
      skippedDistinguished: input.selection.skippedDistinguished,
      skippedPhraseFilter: input.selection.skippedPhraseFilter,
      strictCrowdControl: Boolean(input.strictCrowdControl),
      subredditId: input.subredditId,
      success: input.success,
      targetId: input.targetId,
      targetedCount: input.selection.targets.length,
    });
  } catch (err: unknown) {
    console.error('ReddWall audit log failed', err);
  }
};

async function* getAllCommentsInThread(
  comment: Comment
): AsyncGenerator<Comment> {
  yield comment;

  const replies = await comment.replies.all();
  for (const reply of replies) {
    yield* getAllCommentsInThread(reply);
  }
}

async function* getAllCommentsInPost(post: Post): AsyncGenerator<Comment> {
  const comments = await post.comments.all();

  for (const comment of comments) {
    yield* getAllCommentsInThread(comment);
  }
}

const selectWallTargets = (
  comments: readonly Comment[],
  skipDistinguished: boolean,
  matchTerms: readonly string[]
): WallSelection =>
  comments.reduce<WallSelection>(
    (selection, comment) => {
      const decision = getCommentDecision(
        comment,
        skipDistinguished,
        matchTerms
      );

      if (decision === 'target') {
        selection.targets.push(comment);
      } else if (decision === 'skip-distinguished') {
        selection.skippedDistinguished += 1;
      } else {
        selection.skippedPhraseFilter += 1;
      }

      return selection;
    },
    { skippedDistinguished: 0, skippedPhraseFilter: 0, targets: [] }
  );

const buildWallSummary = (
  targetCount: number,
  skippedDistinguished: number,
  skippedPhraseFilter: number
) => {
  const skippedParts: string[] = [];

  if (skippedDistinguished > 0) {
    skippedParts.push(`${skippedDistinguished} distinguished`);
  }

  if (skippedPhraseFilter > 0) {
    skippedParts.push(`${skippedPhraseFilter} phrase-filtered`);
  }

  return skippedParts.length > 0
    ? `${targetCount} target(s), skipped ${skippedParts.join(' and ')}.`
    : `${targetCount} target(s).`;
};

const canModeratePosts = (permissions: readonly string[]) =>
  permissions.includes('all') || permissions.includes('posts');

const mutateCommentsInBatches = async (
  comments: readonly Comment[],
  shouldSkip: (comment: Comment) => boolean,
  mutate: (comment: Comment) => Promise<unknown>
): Promise<CommentMutationResult> => {
  let failed = 0;

  for (
    let start = 0;
    start < comments.length;
    start += COMMENT_MUTATION_BATCH_SIZE
  ) {
    const batch = comments
      .slice(start, start + COMMENT_MUTATION_BATCH_SIZE)
      .filter((comment) => !shouldSkip(comment));
    const results = await Promise.allSettled(batch.map(mutate));

    failed += results.filter((result) => result.status === 'rejected').length;
  }

  return { failed };
};

const applyCommentActions = async (
  comments: readonly Comment[],
  shouldLock: boolean,
  shouldRemove: boolean
): Promise<WallActionFailures> => {
  const failures: WallActionFailures = {
    failedLocks: 0,
    failedPostActions: [],
    failedRemovals: 0,
  };

  if (shouldLock && comments.length > 0) {
    const result = await mutateCommentsInBatches(
      comments,
      (comment) => comment.locked,
      (comment) => comment.lock()
    );

    failures.failedLocks = result.failed;
  }

  if (shouldRemove && comments.length > 0) {
    const result = await mutateCommentsInBatches(
      comments,
      (comment) => comment.removed,
      (comment) => comment.remove()
    );

    failures.failedRemovals = result.failed;
  }

  return failures;
};

const addPostActionFailure = (
  failures: WallActionFailures,
  action: string,
  err: unknown
) => {
  failures.failedPostActions.push(action);
  console.error(`ReddWall ${action} failed`, err);
};

const hasActionFailures = (failures: WallActionFailures) =>
  failures.failedLocks > 0 ||
  failures.failedRemovals > 0 ||
  failures.failedPostActions.length > 0;

const describeActionFailures = (failures: WallActionFailures) => {
  const parts = [
    failures.failedLocks > 0
      ? `${failures.failedLocks} comment lock(s)`
      : undefined,
    failures.failedRemovals > 0
      ? `${failures.failedRemovals} comment removal(s)`
      : undefined,
    ...failures.failedPostActions,
  ].filter(Boolean);

  return parts.length > 0 ? ` Some actions failed: ${parts.join(', ')}.` : '';
};

export async function handleReddWallPost(
  props: WallPostProps
): Promise<WallResult> {
  const startTime = Date.now();
  const shouldLock = props.lock;
  const shouldRemove = props.remove;
  const matchTerms = parseMatchTerms(props.matchTerms);

  try {
    const [user, post] = await Promise.all([
      reddit.getCurrentUser(),
      reddit.getPostById(props.postId),
    ]);

    if (!user) {
      return { success: false, message: "Can't get user" };
    }

    const modPermissions = await user.getModPermissionsForSubreddit(
      post.subredditName
    );
    const allowed = canModeratePosts(modPermissions);

    console.log(
      `ReddWall mod check: r/${post.subredditName} u/${
        user.username
      } permissions:${modPermissions}: ${allowed ? 'allowed' : 'blocked'}`
    );

    if (!allowed) {
      console.info(
        'A user without the correct mod permissions tried to raise ReddWall on a post.'
      );
      return {
        message: 'You do not have the correct mod permissions to do this.',
        success: false,
      };
    }

    const comments: Comment[] = [];
    for await (const eachComment of getAllCommentsInPost(post)) {
      comments.push(eachComment);
    }

    const selection = selectWallTargets(
      comments,
      props.skipDistinguished,
      matchTerms
    );
    const wallSummary = buildWallSummary(
      selection.targets.length,
      selection.skippedDistinguished,
      selection.skippedPhraseFilter
    );

    if (props.previewOnly) {
      const message = `Preview: ReddWall would target ${wallSummary}`;
      await saveAuditRecord({
        action: 'raise-wall',
        lock: shouldLock,
        lockPost: props.lockPost,
        matchTerms,
        message,
        moderatorName: user.username,
        previewOnly: true,
        remove: shouldRemove,
        selection,
        strictCrowdControl: props.strictCrowdControl,
        subredditId: props.subredditId,
        success: true,
        targetId: props.postId,
      });

      return {
        message,
        success: true,
      };
    }

    const failures = await applyCommentActions(
      selection.targets,
      shouldLock,
      shouldRemove
    );

    if (props.strictCrowdControl) {
      try {
        await post.updateCrowdControlLevel('STRICT');
      } catch (err: unknown) {
        addPostActionFailure(failures, 'strict crowd control', err);
      }
    }

    if (props.lockPost && !post.locked) {
      try {
        await post.lock();
      } catch (err: unknown) {
        addPostActionFailure(failures, 'post lock', err);
      }
    }

    const actionDescription = describeWallAction({
      lock: shouldLock,
      remove: shouldRemove,
    });
    const timeElapsed = (Date.now() - startTime) / 1000;

    console.info(
      `ReddWall handled ${selection.targets.length} comment(s) in ${timeElapsed} seconds.`
    );

    const success = !hasActionFailures(failures);
    const message = `${
      success ? 'ReddWall raised' : 'ReddWall partly raised'
    }: ${actionDescription} ${wallSummary}${describeActionFailures(
      failures
    )} Refresh the page to see the cleanup.`;
    await saveAuditRecord({
      action: 'raise-wall',
      failures,
      lock: shouldLock,
      lockPost: props.lockPost,
      matchTerms,
      message,
      moderatorName: user.username,
      previewOnly: false,
      remove: shouldRemove,
      selection,
      strictCrowdControl: props.strictCrowdControl,
      subredditId: props.subredditId,
      success,
      targetId: props.postId,
    });

    return {
      message,
      success,
    };
  } catch (err: unknown) {
    console.error(err);
    return {
      success: false,
      message: 'ReddWall failed! Please try again later.',
    };
  }
}

export async function handleReddWallThread(
  props: WallThreadProps
): Promise<WallResult> {
  const startTime = Date.now();
  const shouldLock = props.lock;
  const shouldRemove = props.remove;
  const matchTerms = parseMatchTerms(props.matchTerms);

  try {
    const comment = await reddit.getCommentById(props.commentId);
    const user = await reddit.getCurrentUser();

    if (!user) {
      return { success: false, message: "Can't get user" };
    }

    const modPermissions = await user.getModPermissionsForSubreddit(
      comment.subredditName
    );
    const allowed = canModeratePosts(modPermissions);

    console.log(
      `ReddWall mod check: r/${comment.subredditName} u/${
        user.username
      } permissions:${modPermissions}: ${allowed ? 'allowed' : 'blocked'}`
    );

    if (!allowed) {
      console.info(
        'A user without the correct mod permissions tried to wall off a comment thread.'
      );
      return {
        message: 'You do not have the correct mod permissions to do this.',
        success: false,
      };
    }

    const comments: Comment[] = [];
    for await (const eachComment of getAllCommentsInThread(comment)) {
      comments.push(eachComment);
    }

    const selection = selectWallTargets(
      comments,
      props.skipDistinguished,
      matchTerms
    );
    const wallSummary = buildWallSummary(
      selection.targets.length,
      selection.skippedDistinguished,
      selection.skippedPhraseFilter
    );

    if (props.previewOnly) {
      const message = `Preview: ReddWall would target ${wallSummary}`;
      await saveAuditRecord({
        action: 'wall-thread',
        lock: shouldLock,
        matchTerms,
        message,
        moderatorName: user.username,
        previewOnly: true,
        remove: shouldRemove,
        selection,
        subredditId: props.subredditId,
        success: true,
        targetId: props.commentId,
      });

      return {
        message,
        success: true,
      };
    }

    const failures = await applyCommentActions(
      selection.targets,
      shouldLock,
      shouldRemove
    );

    const actionDescription = describeWallAction({
      lock: shouldLock,
      remove: shouldRemove,
    });
    const timeElapsed = (Date.now() - startTime) / 1000;

    console.info(
      `ReddWall handled ${selection.targets.length} comment(s) in ${timeElapsed} seconds.`
    );

    const success = !hasActionFailures(failures);
    const message = `${
      success ? 'Thread walled off' : 'Thread partly walled off'
    }: ${actionDescription} ${wallSummary}${describeActionFailures(
      failures
    )} Refresh the page to see the cleanup.`;
    await saveAuditRecord({
      action: 'wall-thread',
      failures,
      lock: shouldLock,
      matchTerms,
      message,
      moderatorName: user.username,
      previewOnly: false,
      remove: shouldRemove,
      selection,
      subredditId: props.subredditId,
      success,
      targetId: props.commentId,
    });

    return {
      message,
      success,
    };
  } catch (err: unknown) {
    console.error(err);
    return {
      success: false,
      message: 'ReddWall failed! Please try again later.',
    };
  }
}
