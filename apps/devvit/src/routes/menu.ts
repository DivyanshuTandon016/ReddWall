import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import type { FormField } from '@devvit/shared-types/shared/form.js';
import {
  getAuditRecordDetails,
  getAuditRecordHeading,
  getAuditRecordStats,
  getRecentAuditRecords,
  type AuditRecord,
} from '../core/audit-log';
import { getReddWallDefaults, type ReddWallDefaults } from '../core/settings';

export const menu = new Hono();

const buildBaseWallFields = (
  targetId: string,
  defaults: ReddWallDefaults
): FormField[] => [
  {
    name: 'targetId',
    label: 'Target ID',
    type: 'string',
    helpText: 'Auto-filled from the selected Reddit item.',
    required: true,
    defaultValue: targetId,
  },
  {
    name: 'previewOnly',
    label: 'Preview only',
    type: 'boolean',
    helpText: 'Count targets without changing anything.',
    defaultValue: defaults.defaultPreviewOnly,
  },
  {
    name: 'remove',
    label: 'Remove targeted comments',
    type: 'boolean',
    defaultValue: defaults.defaultRemove,
  },
  {
    name: 'lock',
    label: 'Lock targeted comments',
    type: 'boolean',
    defaultValue: defaults.defaultLock,
  },
  {
    name: 'skipDistinguished',
    label: 'Protect distinguished comments',
    type: 'boolean',
    helpText: 'Leave mod/admin distinguished comments untouched.',
    defaultValue: defaults.defaultProtectDistinguished,
  },
  {
    name: 'matchTerms',
    label: 'Only target phrases',
    type: 'paragraph',
    helpText: 'Optional. Separate phrases with commas or new lines.',
    lineHeight: 5,
    defaultValue: defaults.defaultPhrases,
  },
];

const buildThreadWallForm = (
  targetId: string,
  defaults: ReddWallDefaults
) => ({
  acceptLabel: 'Run ReddWall',
  cancelLabel: 'Cancel',
  description:
    'Wall off this comment and its replies. Start with preview mode to see the target count.',
  fields: buildBaseWallFields(targetId, defaults),
  title: 'Wall Off Thread',
});

const buildPostWallForm = (targetId: string, defaults: ReddWallDefaults) => ({
  acceptLabel: 'Raise ReddWall',
  cancelLabel: 'Cancel',
  description:
    'Contain a risky post by targeting its comments and optionally locking the post.',
  fields: [
    ...buildBaseWallFields(targetId, defaults),
    {
      name: 'lockPost',
      label: 'Lock the post',
      type: 'boolean',
      helpText: 'Prevents new comments after the wall is raised.',
      defaultValue: defaults.defaultLockPost,
    },
    {
      name: 'strictCrowdControl',
      label: 'Set crowd control to strict',
      type: 'boolean',
      helpText: 'Adds Reddit crowd control as an extra containment layer.',
      defaultValue: defaults.defaultStrictCrowdControl,
    },
  ] satisfies FormField[],
  title: 'Raise ReddWall',
});

const buildHistoryFields = (records: readonly AuditRecord[]): FormField[] => {
  if (records.length === 0) {
    return [
      {
        name: 'historyEmpty',
        label: 'Activity',
        type: 'string',
        disabled: true,
        defaultValue: 'No ReddWall activity has been recorded yet.',
      },
    ];
  }

  return records.map((record, index) => ({
    name: `history${index}`,
    label: `${index + 1}. ${getAuditRecordHeading(record)}`,
    type: 'string',
    disabled: true,
    defaultValue: getAuditRecordStats(record),
    helpText: getAuditRecordDetails(record),
  }));
};

const buildHistoryForm = (records: readonly AuditRecord[]) => ({
  acceptLabel: 'Close',
  cancelLabel: 'Cancel',
  description: 'Recent ReddWall previews and moderation runs for this subreddit.',
  fields: buildHistoryFields(records),
  title: 'Recent ReddWall Activity',
});

menu.post('/wall-thread', async (c) => {
  const [request, defaults] = await Promise.all([
    c.req.json<MenuItemRequest>(),
    getReddWallDefaults(),
  ]);

  return c.json<UiResponse>(
    {
      showForm: {
        name: 'wallThread',
        form: buildThreadWallForm(request.targetId, defaults),
      },
    },
    200
  );
});

menu.post('/raise-wall', async (c) => {
  const [request, defaults] = await Promise.all([
    c.req.json<MenuItemRequest>(),
    getReddWallDefaults(),
  ]);

  return c.json<UiResponse>(
    {
      showForm: {
        name: 'raiseWall',
        form: buildPostWallForm(request.targetId, defaults),
      },
    },
    200
  );
});

menu.post('/history', async (c) => {
  await c.req.json<MenuItemRequest>();
  const records = await getRecentAuditRecords(context.subredditId, 5);

  return c.json<UiResponse>(
    {
      showForm: {
        name: 'auditHistory',
        form: buildHistoryForm(records),
      },
    },
    200
  );
});
