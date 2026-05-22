import { describe, expect, it } from 'vitest';
import {
  buildAuditRecord,
  formatAuditHistory,
  formatAuditRecord,
  getAuditRecordDetails,
  getAuditRecordHeading,
  getAuditRecordStats,
  type AuditRecordInput,
} from './audit-log';

const makeInput = (
  overrides: Partial<AuditRecordInput> = {}
): AuditRecordInput => ({
  action: 'raise-wall',
  lock: true,
  lockPost: false,
  matchTerms: ['spam', 'brigading'],
  message: 'ReddWall raised.',
  moderatorName: 'mod_user',
  previewOnly: false,
  remove: true,
  skippedDistinguished: 1,
  skippedPhraseFilter: 2,
  strictCrowdControl: false,
  subredditId: 't5_test',
  success: true,
  targetId: 't3_post',
  targetedCount: 3,
  ...overrides,
});

describe('buildAuditRecord', () => {
  it('adds stable timestamp fields to an audit input', () => {
    const createdAt = new Date('2026-05-19T00:00:00.000Z');

    expect(buildAuditRecord(makeInput(), createdAt)).toMatchObject({
      action: 'raise-wall',
      createdAt: '2026-05-19T00:00:00.000Z',
      id: '1779148800000-raise-wall-t3_post',
      targetedCount: 3,
    });
  });
});

describe('formatAuditRecord', () => {
  it('formats a readable moderation history entry', () => {
    const record = buildAuditRecord(
      makeInput(),
      new Date('2026-05-19T00:00:00.000Z')
    );

    expect(formatAuditRecord(record)).toContain(
      'Run Raise ReddWall by u/mod_user'
    );
    expect(formatAuditRecord(record)).toContain('Phrases: spam, brigading');
    expect(formatAuditRecord(record)).toContain('Options: remove, lock');
  });

  it('shows preview mode and empty phrases clearly', () => {
    const record = buildAuditRecord(
      makeInput({ matchTerms: [], previewOnly: true }),
      new Date('2026-05-19T00:00:00.000Z')
    );

    expect(formatAuditRecord(record)).toContain(
      'Preview Raise ReddWall by u/mod_user'
    );
    expect(formatAuditRecord(record)).toContain('Phrases: none');
  });
});

describe('audit record form summaries', () => {
  it('splits a record into compact fields for native forms', () => {
    const record = buildAuditRecord(
      makeInput(),
      new Date('2026-05-19T00:00:00.000Z')
    );

    expect(getAuditRecordHeading(record)).toContain(
      'Run Raise ReddWall by u/mod_user'
    );
    expect(getAuditRecordStats(record)).toBe('3 targeted, 3 skipped | ok');
    expect(getAuditRecordDetails(record)).toBe(
      'Phrases: spam, brigading. Options: remove, lock. Skipped: 1 distinguished, 2 phrase-filtered. Failures: none.'
    );
  });

  it('surfaces partial action failures', () => {
    const record = buildAuditRecord(
      makeInput({
        failedLocks: 2,
        failedPostActions: ['post lock'],
        failedRemovals: 1,
        success: false,
      }),
      new Date('2026-05-19T00:00:00.000Z')
    );

    expect(getAuditRecordStats(record)).toBe(
      '3 targeted, 3 skipped | failed | 4 action failure(s)'
    );
    expect(getAuditRecordDetails(record)).toContain(
      'Failures: 2 comment lock, 1 comment removal, post lock.'
    );
  });
});

describe('formatAuditHistory', () => {
  it('handles empty history', () => {
    expect(formatAuditHistory([])).toBe(
      'No ReddWall activity has been recorded yet.'
    );
  });

  it('separates multiple entries', () => {
    const first = buildAuditRecord(
      makeInput({ targetId: 't3_first' }),
      new Date('2026-05-19T00:00:00.000Z')
    );
    const second = buildAuditRecord(
      makeInput({ targetId: 't3_second' }),
      new Date('2026-05-19T00:01:00.000Z')
    );

    expect(formatAuditHistory([second, first])).toContain('1. ');
    expect(formatAuditHistory([second, first])).toContain('2. ');
  });
});
