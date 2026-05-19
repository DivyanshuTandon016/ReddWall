import { describe, expect, it } from 'vitest';
import {
  FALLBACK_REDDWALL_DEFAULTS,
  normalizeReddWallDefaults,
} from './settings';

describe('normalizeReddWallDefaults', () => {
  it('uses fallback defaults when settings are missing', () => {
    expect(normalizeReddWallDefaults({})).toEqual(FALLBACK_REDDWALL_DEFAULTS);
  });

  it('accepts valid configured settings', () => {
    expect(
      normalizeReddWallDefaults({
        defaultLock: false,
        defaultLockPost: true,
        defaultPhrases: 'scam\nraid',
        defaultPreviewOnly: false,
        defaultProtectDistinguished: false,
        defaultRemove: false,
        defaultStrictCrowdControl: true,
      })
    ).toEqual({
      defaultLock: false,
      defaultLockPost: true,
      defaultPhrases: 'scam\nraid',
      defaultPreviewOnly: false,
      defaultProtectDistinguished: false,
      defaultRemove: false,
      defaultStrictCrowdControl: true,
    });
  });

  it('ignores invalid setting types', () => {
    expect(
      normalizeReddWallDefaults({
        defaultLock: 'yes',
        defaultPhrases: ['spam'],
      })
    ).toMatchObject({
      defaultLock: FALLBACK_REDDWALL_DEFAULTS.defaultLock,
      defaultPhrases: FALLBACK_REDDWALL_DEFAULTS.defaultPhrases,
    });
  });
});
