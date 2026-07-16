export const FEEDBACK_CATEGORIES = ['bug', 'idea', 'balance', 'other'] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_MESSAGE_MINIMUM_CHARACTERS = 3;
export const FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS = 500;
export const FEEDBACK_SOURCE_SCENE_MAXIMUM_CHARACTERS = 40;
export const FEEDBACK_APP_VERSION_MAXIMUM_CHARACTERS = 32;
export const FEEDBACK_FIRST_REWARD_INK = 5;

export type SubmitFeedbackRequest = Readonly<{
  category: FeedbackCategory;
  message: string;
  sourceScene?: string;
  appVersion?: string;
}>;

export type SubmitFeedbackResponse = Readonly<{
  id: string;
  createdAtMs: number;
  inkAwarded: number;
  ink: number;
}>;

export type PlayerFeedback = Readonly<{
  version: 1;
  id: string;
  userId: string;
  username: string;
  category: FeedbackCategory;
  message: string;
  sourceScene: string | null;
  appVersion: string | null;
  createdAtMs: number;
}>;

export type FeedbackPage = Readonly<{
  entries: readonly PlayerFeedback[];
  nextCursor: string | null;
}>;

export const isFeedbackCategory = (
  value: unknown
): value is FeedbackCategory => {
  return FEEDBACK_CATEGORIES.some((category) => category === value);
};

const cleanOptionalFeedbackText = (
  value: unknown,
  maximumCharacters: number
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= maximumCharacters
    ? cleaned
    : undefined;
};

export const parseSubmitFeedbackRequest = (
  value: unknown
): SubmitFeedbackRequest | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const allowedFields = new Set([
    'category',
    'message',
    'sourceScene',
    'appVersion',
  ]);
  if (Object.keys(record).some((field) => !allowedFields.has(field))) {
    return undefined;
  }
  if (!isFeedbackCategory(record.category)) return undefined;
  if (typeof record.message !== 'string') return undefined;
  const message = record.message.trim();
  if (
    message.length < FEEDBACK_MESSAGE_MINIMUM_CHARACTERS ||
    message.length > FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS
  ) {
    return undefined;
  }
  const sourceScene = cleanOptionalFeedbackText(
    record.sourceScene,
    FEEDBACK_SOURCE_SCENE_MAXIMUM_CHARACTERS
  );
  const appVersion = cleanOptionalFeedbackText(
    record.appVersion,
    FEEDBACK_APP_VERSION_MAXIMUM_CHARACTERS
  );
  if (record.sourceScene !== undefined && !sourceScene) return undefined;
  if (record.appVersion !== undefined && !appVersion) return undefined;
  return {
    category: record.category,
    message,
    ...(sourceScene ? { sourceScene } : {}),
    ...(appVersion ? { appVersion } : {}),
  };
};
