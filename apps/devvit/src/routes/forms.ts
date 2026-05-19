import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';
import { handleReddWallPost, handleReddWallThread } from '../core/reddwall';

type WallFormValues = {
  lock?: boolean;
  lockPost?: boolean;
  matchTerms?: string;
  previewOnly?: boolean;
  remove?: boolean;
  skipDistinguished?: boolean;
  strictCrowdControl?: boolean;
  targetId?: string;
};

export const forms = new Hono();

const normalizeValues = (values: WallFormValues) => ({
  lock: Boolean(values.lock),
  lockPost: Boolean(values.lockPost),
  matchTerms: typeof values.matchTerms === 'string' ? values.matchTerms : '',
  previewOnly: Boolean(values.previewOnly),
  remove: Boolean(values.remove),
  skipDistinguished: Boolean(values.skipDistinguished),
  strictCrowdControl: Boolean(values.strictCrowdControl),
});

const getTargetId = (values: WallFormValues) => {
  if (typeof values.targetId === 'string' && values.targetId.trim()) {
    return values.targetId.trim();
  }

  return context.postId;
};

const requireModerationAction = (values: ReturnType<typeof normalizeValues>) =>
  values.previewOnly || values.lock || values.remove;

const toToast = (result: { message: string; success: boolean }): UiResponse => ({
  showToast: `${result.success ? 'Success' : 'Failed'}: ${result.message}`,
});

forms.post('/wall-thread-submit', async (c) => {
  const values = await c.req.json<WallFormValues>();
  const normalized = normalizeValues(values);

  if (!requireModerationAction(normalized)) {
    return c.json<UiResponse>(
      {
        showToast: 'Select preview, lock, or remove before running ReddWall.',
      },
      200
    );
  }

  const targetId = getTargetId(values);
  if (!isT1(targetId)) {
    console.error('ReddWall thread target is not a T1', targetId);
    return c.json<UiResponse>(
      {
        showToast: 'ReddWall failed! Please try again later.',
      },
      200
    );
  }

  const result = await handleReddWallThread({
    commentId: targetId,
    lock: normalized.lock,
    matchTerms: normalized.matchTerms,
    previewOnly: normalized.previewOnly,
    remove: normalized.remove,
    skipDistinguished: normalized.skipDistinguished,
    subredditId: context.subredditId,
  });

  console.log(
    `ReddWall thread result - ${
      result.success ? 'success' : 'fail'
    } - ${result.message}`
  );

  return c.json<UiResponse>(toToast(result), 200);
});

forms.post('/raise-wall-submit', async (c) => {
  const values = await c.req.json<WallFormValues>();
  const normalized = normalizeValues(values);

  if (!requireModerationAction(normalized)) {
    return c.json<UiResponse>(
      {
        showToast: 'Select preview, lock, or remove before running ReddWall.',
      },
      200
    );
  }

  const targetId = getTargetId(values);
  if (!isT3(targetId)) {
    console.error('ReddWall post target is not a T3', targetId);
    return c.json<UiResponse>(
      {
        showToast: 'ReddWall failed! Please try again later.',
      },
      200
    );
  }

  const result = await handleReddWallPost({
    lock: normalized.lock,
    lockPost: normalized.lockPost,
    matchTerms: normalized.matchTerms,
    postId: targetId,
    previewOnly: normalized.previewOnly,
    remove: normalized.remove,
    skipDistinguished: normalized.skipDistinguished,
    strictCrowdControl: normalized.strictCrowdControl,
    subredditId: context.subredditId,
  });

  console.log(
    `ReddWall post result - ${
      result.success ? 'success' : 'fail'
    } - ${result.message}`
  );

  return c.json<UiResponse>(toToast(result), 200);
});

forms.post('/audit-history-close', (c) =>
  c.json<UiResponse>(
    {
      showToast: 'ReddWall history closed.',
    },
    200
  )
);
