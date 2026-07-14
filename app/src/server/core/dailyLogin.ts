import {
  dailyLoginRewardAfterClaims,
  DAILY_LOGIN_TRACK_LENGTH,
  type DailyLoginReward,
  type DailyLoginState,
} from '../../shared/dailylogin';
import {
  getInkKey,
  getInventoryDiscoveryField,
  getInventoryGearRankField,
  getInventoryKey,
} from './inkStore';
import { parseUtcDateKey } from './day';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
  type ArenaStorage,
  type ArenaTransaction,
} from './storage';

const claimedTrackDaysField = 'claimed-track-days';
const lastClaimDateField = 'last-claim-date';
const lastRewardField = 'last-reward';

type StoredDailyLogin = Readonly<{
  claimedTrackDays: number;
  lastClaimDateKey: string | null;
  lastReward: DailyLoginReward | null;
}>;

export type DailyLoginClaimResult = Readonly<{
  status: 'claimed' | 'already-claimed';
  dailyLogin: DailyLoginState;
  reward: DailyLoginReward;
  recovered: boolean;
}>;

export const getDailyLoginKey = (userId: string): string => {
  return `user:${userId}:daily-login`;
};

const parseStoredReward = (
  stored: string | undefined
): DailyLoginReward | null => {
  if (stored === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    throw new Error('Stored daily login reward is invalid JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Stored daily login reward is invalid.');
  }
  const reward = value as Record<string, unknown>;
  const trackDay = reward.trackDay;
  if (
    (trackDay !== null &&
      (!Number.isSafeInteger(trackDay) ||
        Number(trackDay) < 1 ||
        Number(trackDay) > DAILY_LOGIN_TRACK_LENGTH)) ||
    !Number.isSafeInteger(reward.inkAwarded) ||
    Number(reward.inkAwarded) < 1 ||
    (reward.gearId !== null && typeof reward.gearId !== 'string') ||
    !Number.isSafeInteger(reward.claimedAtMs) ||
    Number(reward.claimedAtMs) < 0
  ) {
    throw new Error('Stored daily login reward is invalid.');
  }
  return {
    trackDay: trackDay as DailyLoginReward['trackDay'],
    inkAwarded: Number(reward.inkAwarded),
    gearId: reward.gearId as string | null,
    claimedAtMs: Number(reward.claimedAtMs),
  };
};

const parseStoredDailyLogin = (
  stored: Record<string, string>
): StoredDailyLogin => {
  if (Object.keys(stored).length === 0) {
    return {
      claimedTrackDays: 0,
      lastClaimDateKey: null,
      lastReward: null,
    };
  }

  const claimedTrackDays = Number(stored[claimedTrackDaysField]);
  const lastClaimDateKey = stored[lastClaimDateField] ?? null;
  const lastReward = parseStoredReward(stored[lastRewardField]);
  if (
    !Number.isSafeInteger(claimedTrackDays) ||
    claimedTrackDays < 0 ||
    claimedTrackDays > DAILY_LOGIN_TRACK_LENGTH ||
    !lastClaimDateKey ||
    !parseUtcDateKey(lastClaimDateKey) ||
    !lastReward
  ) {
    throw new Error('Stored daily login state is invalid.');
  }
  return { claimedTrackDays, lastClaimDateKey, lastReward };
};

const projectDailyLoginState = (
  stored: StoredDailyLogin,
  currentDateKey: string
): DailyLoginState => {
  return {
    claimedTrackDays: stored.claimedTrackDays,
    claimedToday: stored.lastClaimDateKey === currentDateKey,
    nextReward: dailyLoginRewardAfterClaims(stored.claimedTrackDays),
  };
};

export const loadDailyLoginState = async (
  storage: ArenaStorage,
  userId: string,
  currentDateKey: string
): Promise<DailyLoginState> => {
  if (!parseUtcDateKey(currentDateKey)) {
    throw new Error('Daily login requires a valid UTC date key.');
  }
  const stored = parseStoredDailyLogin(
    await storage.hGetAll(getDailyLoginKey(userId))
  );
  return projectDailyLoginState(stored, currentDateKey);
};

const recoverCommittedClaim = async (
  storage: ArenaStorage,
  userId: string,
  currentDateKey: string
): Promise<DailyLoginClaimResult | null> => {
  const stored = parseStoredDailyLogin(
    await storage.hGetAll(getDailyLoginKey(userId))
  );
  if (stored.lastClaimDateKey !== currentDateKey || !stored.lastReward) {
    return null;
  }
  return {
    status: 'claimed',
    dailyLogin: projectDailyLoginState(stored, currentDateKey),
    reward: stored.lastReward,
    recovered: true,
  };
};

export const claimDailyLoginReward = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    currentDateKey: string;
    claimedAtMs: number;
  }>
): Promise<DailyLoginClaimResult> => {
  if (
    !storage.watch ||
    !input.userId ||
    !parseUtcDateKey(input.currentDateKey) ||
    !Number.isSafeInteger(input.claimedAtMs) ||
    input.claimedAtMs < 0
  ) {
    throw new Error('Daily login claim input is invalid.');
  }

  const loginKey = getDailyLoginKey(input.userId);
  const inkKey = getInkKey(input.userId);
  const inventoryKey = getInventoryKey(input.userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(loginKey, inkKey, inventoryKey);
      const stored = parseStoredDailyLogin(await storage.hGetAll(loginKey));
      if (stored.lastClaimDateKey === input.currentDateKey) {
        await transaction.unwatch();
        if (!stored.lastReward) {
          throw new Error('Daily login receipt is missing.');
        }
        return {
          status: 'already-claimed',
          dailyLogin: projectDailyLoginState(stored, input.currentDateKey),
          reward: stored.lastReward,
          recovered: false,
        };
      }

      const rewardPlan = dailyLoginRewardAfterClaims(stored.claimedTrackDays);
      const reward: DailyLoginReward = {
        trackDay: rewardPlan.trackDay,
        inkAwarded: rewardPlan.ink,
        gearId: rewardPlan.gearId,
        claimedAtMs: input.claimedAtMs,
      };
      const nextClaimedTrackDays =
        rewardPlan.trackDay === null
          ? stored.claimedTrackDays
          : Math.min(DAILY_LOGIN_TRACK_LENGTH, stored.claimedTrackDays + 1);
      const rankField = reward.gearId
        ? getInventoryGearRankField(reward.gearId)
        : null;
      const storedRank = rankField
        ? await storage.hGet(inventoryKey, rankField)
        : undefined;

      await transaction.multi();
      await transaction.hSet(loginKey, {
        [claimedTrackDaysField]: nextClaimedTrackDays.toString(),
        [lastClaimDateField]: input.currentDateKey,
        [lastRewardField]: JSON.stringify(reward),
      });
      await transaction.incrBy(inkKey, reward.inkAwarded);
      if (reward.gearId) {
        await transaction.hSet(inventoryKey, {
          [getInventoryDiscoveryField(reward.gearId)]: '1',
          ...(rankField && storedRank === undefined
            ? { [rankField]: '1' }
            : {}),
        });
        await transaction.hIncrBy(inventoryKey, reward.gearId, 1);
      }
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        const committed: StoredDailyLogin = {
          claimedTrackDays: nextClaimedTrackDays,
          lastClaimDateKey: input.currentDateKey,
          lastReward: reward,
        };
        return {
          status: 'claimed',
          dailyLogin: projectDailyLoginState(committed, input.currentDateKey),
          reward,
          recovered: false,
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Daily login');
      const recovered = await recoverCommittedClaim(
        storage,
        input.userId,
        input.currentDateKey
      );
      if (recovered) return recovered;
      throw error;
    }
  }
  throw new Error('Daily login changed too often to claim safely.');
};
