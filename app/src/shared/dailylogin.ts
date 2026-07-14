export const DAILY_LOGIN_TRACK_LENGTH = 7;
export const DAILY_LOGIN_DAY_SEVEN_GEAR_ID = 'golden-crown';
export const DAILY_LOGIN_AFTER_TRACK_INK = 1;

export type DailyLoginTrackDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DailyLoginRewardPlan = Readonly<{
  trackDay: DailyLoginTrackDay | null;
  ink: number;
  gearId: string | null;
}>;

export const DAILY_LOGIN_TRACK: readonly DailyLoginRewardPlan[] = Object.freeze(
  [
    Object.freeze({ trackDay: 1, ink: 1, gearId: null }),
    Object.freeze({ trackDay: 2, ink: 1, gearId: null }),
    Object.freeze({ trackDay: 3, ink: 2, gearId: null }),
    Object.freeze({ trackDay: 4, ink: 2, gearId: null }),
    Object.freeze({ trackDay: 5, ink: 3, gearId: null }),
    Object.freeze({ trackDay: 6, ink: 3, gearId: null }),
    Object.freeze({
      trackDay: 7,
      ink: 5,
      gearId: DAILY_LOGIN_DAY_SEVEN_GEAR_ID,
    }),
  ]
);

export const dailyLoginRewardAfterClaims = (
  claimedTrackDays: number
): DailyLoginRewardPlan => {
  const safeClaimedDays = Number.isSafeInteger(claimedTrackDays)
    ? Math.max(0, Math.min(DAILY_LOGIN_TRACK_LENGTH, claimedTrackDays))
    : 0;
  return (
    DAILY_LOGIN_TRACK[safeClaimedDays] ??
    Object.freeze({
      trackDay: null,
      ink: DAILY_LOGIN_AFTER_TRACK_INK,
      gearId: null,
    })
  );
};

export type DailyLoginReward = Readonly<{
  trackDay: DailyLoginTrackDay | null;
  inkAwarded: number;
  gearId: string | null;
  claimedAtMs: number;
}>;

export type DailyLoginState = Readonly<{
  claimedTrackDays: number;
  claimedToday: boolean;
  nextReward: DailyLoginRewardPlan;
}>;

export type DailyLoginClaimResponse = Readonly<{
  dailyLogin: DailyLoginState;
  reward: DailyLoginReward;
  ink: number;
}>;
