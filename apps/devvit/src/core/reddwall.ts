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

const saveAuditRecord = async (input: {
  action: AuditAction;
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

    if (shouldLock && selection.targets.length > 0) {
      await Promise.all(
        selection.targets.map((comment) => comment.locked || comment.lock())
      );
    }

    if (shouldRemove && selection.targets.length > 0) {
      await Promise.all(
        selection.targets.map((comment) => comment.removed || comment.remove())
      );
    }

    if (props.strictCrowdControl) {
      await post.updateCrowdControlLevel('STRICT');
    }

    if (props.lockPost && !post.locked) {
      await post.lock();
    }

    const actionDescription = describeWallAction({
      lock: shouldLock,
      remove: shouldRemove,
    });
    const timeElapsed = (Date.now() - startTime) / 1000;

    console.info(
      `ReddWall handled ${selection.targets.length} comment(s) in ${timeElapsed} seconds.`
    );

    const message = `ReddWall raised: ${actionDescription} ${wallSummary} Refresh the page to see the cleanup.`;
    await saveAuditRecord({
      action: 'raise-wall',
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
      success: true,
      targetId: props.postId,
    });

    return {
      message,
      success: true,
    };
  } catch (err: unknown) {
    console.error(err);
    return { success: false, message: 'ReddWall failed! Please try again later.' };
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

    if (shouldLock && selection.targets.length > 0) {
      await Promise.all(
        selection.targets.map((comment) => comment.locked || comment.lock())
      );
    }

    if (shouldRemove && selection.targets.length > 0) {
      await Promise.all(
        selection.targets.map((comment) => comment.removed || comment.remove())
      );
    }

    const actionDescription = describeWallAction({
      lock: shouldLock,
      remove: shouldRemove,
    });
    const timeElapsed = (Date.now() - startTime) / 1000;

    console.info(
      `ReddWall handled ${selection.targets.length} comment(s) in ${timeElapsed} seconds.`
    );

    const message = `Thread walled off: ${actionDescription} ${wallSummary} Refresh the page to see the cleanup.`;
    await saveAuditRecord({
      action: 'wall-thread',
      lock: shouldLock,
      matchTerms,
      message,
      moderatorName: user.username,
      previewOnly: false,
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
  } catch (err: unknown) {
    console.error(err);
    return { success: false, message: 'ReddWall failed! Please try again later.' };
  }
}
