export type WallAction = {
  lock: boolean;
  remove: boolean;
};

export type CommentScreen = {
  body: string;
  isDistinguished(): boolean;
};

export type CommentDecision =
  | 'target'
  | 'skip-distinguished'
  | 'skip-phrase-filter';

export const parseMatchTerms = (rawTerms?: string): string[] => {
  if (!rawTerms) {
    return [];
  }

  const terms = rawTerms
    .split(/[\n,]/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(terms)].slice(0, 20);
};

export const describeWallAction = ({ lock, remove }: WallAction): string => {
  if (lock && remove) {
    return 'locked and removed';
  }

  if (lock) {
    return 'locked';
  }

  return 'removed';
};

export const getCommentDecision = (
  comment: CommentScreen,
  skipDistinguished: boolean,
  matchTerms: readonly string[]
): CommentDecision => {
  if (skipDistinguished && comment.isDistinguished()) {
    return 'skip-distinguished';
  }

  if (
    matchTerms.length > 0 &&
    !matchTerms.some((term) => comment.body.toLowerCase().includes(term))
  ) {
    return 'skip-phrase-filter';
  }

  return 'target';
};
