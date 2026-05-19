import { describe, expect, it } from 'vitest';
import {
  describeWallAction,
  getCommentDecision,
  parseMatchTerms,
  type CommentScreen,
} from './reddwall-helpers';

const makeComment = (
  body: string,
  distinguished = false
): CommentScreen => ({
  body,
  isDistinguished: () => distinguished,
});

describe('parseMatchTerms', () => {
  it('normalizes comma and newline separated terms', () => {
    expect(parseMatchTerms('spam, Brigading\nSpam')).toEqual([
      'spam',
      'brigading',
    ]);
  });

  it('returns an empty list for blank input', () => {
    expect(parseMatchTerms('  \n  ')).toEqual([]);
  });
});

describe('describeWallAction', () => {
  it('describes combined actions', () => {
    expect(describeWallAction({ lock: true, remove: true })).toBe(
      'locked and removed'
    );
  });

  it('describes single actions', () => {
    expect(describeWallAction({ lock: true, remove: false })).toBe('locked');
    expect(describeWallAction({ lock: false, remove: true })).toBe('removed');
  });
});

describe('getCommentDecision', () => {
  it('targets comments when no filters apply', () => {
    expect(getCommentDecision(makeComment('hello'), false, [])).toBe('target');
  });

  it('skips distinguished comments when requested', () => {
    expect(getCommentDecision(makeComment('mod note', true), true, [])).toBe(
      'skip-distinguished'
    );
  });

  it('skips comments that do not match phrase filters', () => {
    expect(getCommentDecision(makeComment('normal reply'), false, ['spam'])).toBe(
      'skip-phrase-filter'
    );
  });
});
