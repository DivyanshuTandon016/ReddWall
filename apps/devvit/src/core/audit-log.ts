import { redis } from '@devvit/web/server';
import type { T1, T3, T5 } from '@devvit/shared-types/tid.js';

export type AuditAction = 'raise-wall' | 'wall-thread';

export type AuditTargetId = T1 | T3;

export type AuditRecord = {
  action: AuditAction;
  createdAt: string;
  id: string;
  lock: boolean;
  lockPost: boolean;
  matchTerms: string[];
  message: string;
  moderatorName: string;
  previewOnly: boolean;
  remove: boolean;
  skippedDistinguished: number;
  skippedPhraseFilter: number;
  strictCrowdControl: boolean;
  subredditId: T5;
  success: boolean;
  targetId: AuditTargetId;
  targetedCount: number;
};

export type AuditRecordInput = Omit<AuditRecord, 'createdAt' | 'id'>;

const MAX_AUDIT_RECORDS = 50;

const getAuditKey = (subredditId: T5) => `reddwall:audit:${subredditId}`;

export const buildAuditRecord = (
  input: AuditRecordInput,
  createdAt = new Date()
): AuditRecord => ({
  ...input,
  createdAt: createdAt.toISOString(),
  id: `${createdAt.getTime()}-${input.action}-${input.targetId}`,
});

const getAuditMode = (record: AuditRecord) =>
  record.previewOnly ? 'Preview' : 'Run';

const getAuditActionLabel = (record: AuditRecord) =>
  record.action === 'raise-wall' ? 'Raise ReddWall' : 'Wall off thread';

const getAuditCreatedAt = (record: AuditRecord) =>
  new Date(record.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const getAuditOptions = (record: AuditRecord) => {
  const flags = [
    record.remove ? 'remove' : undefined,
    record.lock ? 'lock' : undefined,
    record.lockPost ? 'lock post' : undefined,
    record.strictCrowdControl ? 'strict crowd control' : undefined,
  ].filter(Boolean);

  return flags.length > 0 ? flags.join(', ') : 'none';
};

const getAuditPhrases = (record: AuditRecord) =>
  record.matchTerms.length > 0 ? record.matchTerms.join(', ') : 'none';

export const getAuditRecordHeading = (record: AuditRecord): string =>
  `${getAuditCreatedAt(record)} - ${getAuditMode(record)} ${getAuditActionLabel(
    record
  )} by u/${record.moderatorName}`;

export const getAuditRecordStats = (record: AuditRecord): string => {
  const skipped = record.skippedDistinguished + record.skippedPhraseFilter;
  const status = record.success ? 'ok' : 'failed';

  return `${record.targetedCount} targeted, ${skipped} skipped | ${status}`;
};

export const getAuditRecordDetails = (record: AuditRecord): string =>
  `Phrases: ${getAuditPhrases(record)}. Options: ${getAuditOptions(
    record
  )}. Skipped: ${record.skippedDistinguished} distinguished, ${
    record.skippedPhraseFilter
  } phrase-filtered.`;

export const formatAuditRecord = (record: AuditRecord): string =>
  [
    getAuditRecordHeading(record),
    getAuditRecordStats(record),
    getAuditRecordDetails(record),
  ].join('\n');

export const formatAuditHistory = (records: readonly AuditRecord[]): string => {
  if (records.length === 0) {
    return 'No ReddWall activity has been recorded yet.';
  }

  return records
    .map((record, index) => `${index + 1}. ${formatAuditRecord(record)}`)
    .join('\n\n');
};

const parseAuditRecord = (rawRecord: string): AuditRecord | undefined => {
  try {
    return JSON.parse(rawRecord) as AuditRecord;
  } catch {
    return undefined;
  }
};

export const appendAuditRecord = async (
  input: AuditRecordInput
): Promise<AuditRecord> => {
  const record = buildAuditRecord(input);
  const key = getAuditKey(record.subredditId);

  await redis.zAdd(key, {
    member: JSON.stringify(record),
    score: Date.parse(record.createdAt),
  });

  const recordCount = await redis.zCard(key);
  if (recordCount > MAX_AUDIT_RECORDS) {
    await redis.zRemRangeByRank(key, 0, recordCount - MAX_AUDIT_RECORDS - 1);
  }

  return record;
};

export const getRecentAuditRecords = async (
  subredditId: T5,
  limit = 5
): Promise<AuditRecord[]> => {
  const records = await redis.zRange(getAuditKey(subredditId), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  return records
    .map((record) => parseAuditRecord(record.member))
    .filter((record): record is AuditRecord => Boolean(record));
};
