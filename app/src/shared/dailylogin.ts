export const DAILY_LOGIN_TRACK_LENGTH = 7;
export const DAILY_LOGIN_DAY_SEVEN_GEAR_ID = 'golden-crown';

export type DailyLoginTrackDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DailyLoginCycleDay = DailyLoginTrackDay;

export type DailyLoginRewardPlan = Readonly<{
  trackDay: DailyLoginTrackDay | null;
  cycleDay: DailyLoginCycleDay | null;
  ink: number;
  gearId: string | null;
}>;

export const DAILY_LOGIN_TRACK: readonly DailyLoginRewardPlan[] = Object.freeze(
  [
    Object.freeze({ trackDay: 1, cycleDay: null, ink: 1, gearId: null }),
    Object.freeze({ trackDay: 2, cycleDay: null, ink: 1, gearId: null }),
    Object.freeze({ trackDay: 3, cycleDay: null, ink: 2, gearId: null }),
    Object.freeze({ trackDay: 4, cycleDay: null, ink: 2, gearId: null }),
    Object.freeze({ trackDay: 5, cycleDay: null, ink: 3, gearId: null }),
    Object.freeze({ trackDay: 6, cycleDay: null, ink: 3, gearId: null }),
    Object.freeze({
      trackDay: 7,
      cycleDay: null,
      ink: 5,
      gearId: DAILY_LOGIN_DAY_SEVEN_GEAR_ID,
    }),
  ]
);

// A gentler weekly loop follows the starter track forever. It pays 18 Ink per
// seven claimed days: enough for regular visible progress without replacing
// battle rewards as the main source of chest pulls.
export const DAILY_LOGIN_REPEAT_TRACK: readonly DailyLoginRewardPlan[] =
  Object.freeze(
    [1, 1, 2, 2, 2, 3, 7].map((ink, index) =>
      Object.freeze({
        trackDay: null,
        cycleDay: (index + 1) as DailyLoginCycleDay,
        ink,
        gearId: null,
      })
    )
  );

export const dailyLoginRewardAfterClaims = (
  totalClaimedDays: number
): DailyLoginRewardPlan => {
  const safeClaimedDays = Number.isSafeInteger(totalClaimedDays)
    ? Math.max(0, totalClaimedDays)
    : 0;
  if (safeClaimedDays < DAILY_LOGIN_TRACK_LENGTH) {
    return DAILY_LOGIN_TRACK[safeClaimedDays]!;
  }
  const repeatIndex =
    (safeClaimedDays - DAILY_LOGIN_TRACK_LENGTH) %
    DAILY_LOGIN_REPEAT_TRACK.length;
  return DAILY_LOGIN_REPEAT_TRACK[repeatIndex]!;
};

export type DailyLoginReward = Readonly<{
  trackDay: DailyLoginTrackDay | null;
  cycleDay: DailyLoginCycleDay | null;
  inkAwarded: number;
  gearId: string | null;
  claimedAtMs: number;
}>;

export type DailyLoginState = Readonly<{
  claimedTrackDays: number;
  totalClaimedDays: number;
  claimedToday: boolean;
  nextReward: DailyLoginRewardPlan;
}>;

export type DailyLoginClaimResponse = Readonly<{
  dailyLogin: DailyLoginState;
  reward: DailyLoginReward;
  ink: number;
}>;
