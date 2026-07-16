import type {
  FeedbackPage,
  PlayerFeedback,
  SubmitFeedbackRequest,
} from '../../shared/feedback';
import {
  FEEDBACK_FIRST_REWARD_INK,
  FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS,
  FEEDBACK_MESSAGE_MINIMUM_CHARACTERS,
  isFeedbackCategory,
} from '../../shared/feedback';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import { formatUtcDateKey } from './day';
import { getInkBalance, getInkKey } from './inkStore';

const feedbackRecordsKey = 'feedback:v1:records';
const feedbackIndexKey = 'feedback:v1:index';
const feedbackDailyLimit = 5;
const feedbackDailyLimitTtlSeconds = 2 * 24 * 60 * 60;
const feedbackPageMaximum = 100;

export const getFeedbackRecordsKey = (): string => feedbackRecordsKey;
export const getFeedbackIndexKey = (): string => feedbackIndexKey;
export const getFeedbackRewardKey = (userId: string): string =>
  `feedback:v1:first-reward:${userId}`;
export const getUserFeedbackIndexKey = (userId: string): string =>
  `feedback:v1:user:${userId}`;
export const getFeedbackDailyLimitKey = (
  userId: string,
  createdAt: Date
): string => `feedback:v1:daily:${formatUtcDateKey(createdAt)}:${userId}`;

export class FeedbackRateLimitError extends Error {}

export type SavePlayerFeedbackResult = Readonly<{
  feedback: PlayerFeedback;
  inkAwarded: number;
  ink: number;
}>;

type SavePlayerFeedbackInput = SubmitFeedbackRequest &
  Readonly<{
    id: string;
    userId: string;
    username: string;
    createdAtMs: number;
  }>;

const parseStoredFeedback = (
  value: string | undefined
): PlayerFeedback | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const version = Reflect.get(parsed, 'version');
    const id = Reflect.get(parsed, 'id');
    const userId = Reflect.get(parsed, 'userId');
    const username = Reflect.get(parsed, 'username');
    const category = Reflect.get(parsed, 'category');
    const message = Reflect.get(parsed, 'message');
    const sourceScene = Reflect.get(parsed, 'sourceScene');
    const appVersion = Reflect.get(parsed, 'appVersion');
    const createdAtMs = Reflect.get(parsed, 'createdAtMs');
    if (
      version !== 1 ||
      typeof id !== 'string' ||
      typeof userId !== 'string' ||
      typeof username !== 'string' ||
      !isFeedbackCategory(category) ||
      typeof message !== 'string' ||
      (sourceScene !== null && typeof sourceScene !== 'string') ||
      (appVersion !== null && typeof appVersion !== 'string') ||
      typeof createdAtMs !== 'number' ||
      !Number.isSafeInteger(createdAtMs) ||
      createdAtMs < 0
    ) {
      return null;
    }
    return {
      version,
      id,
      userId,
      username,
      category,
      message,
      sourceScene,
      appVersion,
      createdAtMs,
    };
  } catch {
    return null;
  }
};

export const savePlayerFeedback = async (
  storage: ArenaStorage,
  input: SavePlayerFeedbackInput
): Promise<SavePlayerFeedbackResult> => {
  const createdAt = new Date(input.createdAtMs);
  if (
    !Number.isSafeInteger(input.createdAtMs) ||
    Number.isNaN(createdAt.getTime())
  ) {
    throw new Error('Feedback timestamp is invalid.');
  }
  const dailyLimitKey = getFeedbackDailyLimitKey(input.userId, createdAt);
  const message = input.message.trim();
  if (
    message.length < FEEDBACK_MESSAGE_MINIMUM_CHARACTERS ||
    message.length > FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS
  ) {
    throw new Error('Feedback message is invalid.');
  }
  const feedback: PlayerFeedback = {
    version: 1,
    id: input.id,
    userId: input.userId,
    username: input.username,
    category: input.category,
    message,
    sourceScene: input.sourceScene?.trim() || null,
    appVersion: input.appVersion?.trim() || null,
    createdAtMs: input.createdAtMs,
  };
  if (!storage.watch) {
    throw new Error('Feedback rewards require transaction support.');
  }
  const storedFeedback = JSON.stringify(feedback);
  const userFeedbackIndexKey = getUserFeedbackIndexKey(feedback.userId);
  const rewardKey = getFeedbackRewardKey(feedback.userId);
  const inkKey = getInkKey(feedback.userId);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(dailyLimitKey, rewardKey, inkKey);
      const existingFeedback = parseStoredFeedback(
        await storage.hGet(feedbackRecordsKey, feedback.id)
      );
      if (existingFeedback) {
        await transaction.unwatch();
        const rewardedByFeedbackId = await storage.get(rewardKey);
        return {
          feedback: existingFeedback,
          inkAwarded:
            rewardedByFeedbackId === feedback.id
              ? FEEDBACK_FIRST_REWARD_INK
              : 0,
          ink: await getInkBalance(storage, feedback.userId),
        };
      }

      const storedDailyCount = await storage.get(dailyLimitKey);
      const dailySubmissionCount = Number(storedDailyCount ?? '0');
      if (
        !Number.isSafeInteger(dailySubmissionCount) ||
        dailySubmissionCount < 0
      ) {
        await transaction.unwatch();
        transaction = undefined;
        throw new Error('Stored feedback daily limit is invalid.');
      }
      if (dailySubmissionCount >= feedbackDailyLimit) {
        await transaction.unwatch();
        transaction = undefined;
        throw new FeedbackRateLimitError(
          'You have sent enough notes for today. Try again tomorrow.'
        );
      }

      const alreadyRewarded = (await storage.get(rewardKey)) !== undefined;
      const inkBefore = await getInkBalance(storage, feedback.userId);
      const inkAwarded = alreadyRewarded ? 0 : FEEDBACK_FIRST_REWARD_INK;

      await transaction.multi();
      await transaction.hSet(feedbackRecordsKey, {
        [feedback.id]: storedFeedback,
      });
      await transaction.zAdd(feedbackIndexKey, {
        member: feedback.id,
        score: feedback.createdAtMs,
      });
      await transaction.zAdd(userFeedbackIndexKey, {
        member: feedback.id,
        score: feedback.createdAtMs,
      });
      await transaction.incrBy(dailyLimitKey, 1);
      await transaction.expire(dailyLimitKey, feedbackDailyLimitTtlSeconds);
      if (inkAwarded > 0) {
        await transaction.set(rewardKey, feedback.id);
        await transaction.incrBy(inkKey, inkAwarded);
      }
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return {
          feedback,
          inkAwarded,
          ink: inkBefore + inkAwarded,
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player feedback');
      const committedFeedback = parseStoredFeedback(
        await storage.hGet(feedbackRecordsKey, feedback.id)
      );
      if (committedFeedback) {
        const rewardedByFeedbackId = await storage.get(rewardKey);
        return {
          feedback: committedFeedback,
          inkAwarded:
            rewardedByFeedbackId === feedback.id
              ? FEEDBACK_FIRST_REWARD_INK
              : 0,
          ink: await getInkBalance(storage, feedback.userId),
        };
      }
      throw error;
    }
  }
  throw new Error('Feedback submission changed too often to save safely.');
};

const parseFeedbackCursor = (cursor: string | undefined): number => {
  if (!cursor || !/^\d+$/.test(cursor)) return 0;
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
};

export const loadFeedbackPage = async (
  storage: ArenaStorage,
  options: Readonly<{ cursor?: string; limit?: number }> = {}
): Promise<FeedbackPage> => {
  const offset = parseFeedbackCursor(options.cursor);
  const limit = Math.min(
    feedbackPageMaximum,
    Math.max(1, Math.floor(options.limit ?? 50))
  );
  const indexedEntries = await storage.zRange(
    feedbackIndexKey,
    offset,
    offset + limit,
    { by: 'rank', reverse: true }
  );
  const visibleEntries = indexedEntries.slice(0, limit);
  const storedEntries = await Promise.all(
    visibleEntries.map(({ member }) => storage.hGet(feedbackRecordsKey, member))
  );
  return {
    entries: storedEntries
      .map(parseStoredFeedback)
      .filter((entry): entry is PlayerFeedback => entry !== null),
    nextCursor: indexedEntries.length > limit ? String(offset + limit) : null,
  };
};

export const deleteFeedbackForUser = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  const userIndexKey = getUserFeedbackIndexKey(userId);
  const indexedEntries = await storage.zRange(userIndexKey, 0, -1, {
    by: 'rank',
  });
  const feedbackIds = indexedEntries.map(({ member }) => member);
  if (feedbackIds.length > 0) {
    await Promise.all([
      storage.hDel(feedbackRecordsKey, feedbackIds),
      storage.zRem(feedbackIndexKey, feedbackIds),
    ]);
  }
  await storage.del(userIndexKey, getFeedbackRewardKey(userId));
};
