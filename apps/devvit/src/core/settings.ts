import { settings } from '@devvit/web/server';

export type ReddWallDefaults = {
  defaultLock: boolean;
  defaultLockPost: boolean;
  defaultPhrases: string;
  defaultPreviewOnly: boolean;
  defaultProtectDistinguished: boolean;
  defaultRemove: boolean;
  defaultStrictCrowdControl: boolean;
};

export const FALLBACK_REDDWALL_DEFAULTS: ReddWallDefaults = {
  defaultLock: true,
  defaultLockPost: false,
  defaultPhrases: 'spam\nbrigading\nbadsite',
  defaultPreviewOnly: true,
  defaultProtectDistinguished: true,
  defaultRemove: true,
  defaultStrictCrowdControl: false,
};

const getBooleanSetting = (
  value: unknown,
  fallbackValue: boolean
): boolean => (typeof value === 'boolean' ? value : fallbackValue);

const getStringSetting = (value: unknown, fallbackValue: string): string =>
  typeof value === 'string' ? value : fallbackValue;

export const normalizeReddWallDefaults = (
  values: Record<string, unknown>
): ReddWallDefaults => ({
  defaultLock: getBooleanSetting(
    values.defaultLock,
    FALLBACK_REDDWALL_DEFAULTS.defaultLock
  ),
  defaultLockPost: getBooleanSetting(
    values.defaultLockPost,
    FALLBACK_REDDWALL_DEFAULTS.defaultLockPost
  ),
  defaultPhrases: getStringSetting(
    values.defaultPhrases,
    FALLBACK_REDDWALL_DEFAULTS.defaultPhrases
  ),
  defaultPreviewOnly: getBooleanSetting(
    values.defaultPreviewOnly,
    FALLBACK_REDDWALL_DEFAULTS.defaultPreviewOnly
  ),
  defaultProtectDistinguished: getBooleanSetting(
    values.defaultProtectDistinguished,
    FALLBACK_REDDWALL_DEFAULTS.defaultProtectDistinguished
  ),
  defaultRemove: getBooleanSetting(
    values.defaultRemove,
    FALLBACK_REDDWALL_DEFAULTS.defaultRemove
  ),
  defaultStrictCrowdControl: getBooleanSetting(
    values.defaultStrictCrowdControl,
    FALLBACK_REDDWALL_DEFAULTS.defaultStrictCrowdControl
  ),
});

export const getReddWallDefaults = async (): Promise<ReddWallDefaults> => {
  const values = await settings.getAll<Record<string, unknown>>();

  return normalizeReddWallDefaults(values);
};
