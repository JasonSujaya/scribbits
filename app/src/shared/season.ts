export const SEASON_DURATION_DAYS = 60;
export const SEASON_FINAL_LEADERBOARD_SIZE = 100;

export const SEASON_SCORING_RULE_SET_IDS = ['rumble-clout-v1'] as const;
export type SeasonScoringRuleSetId =
  (typeof SEASON_SCORING_RULE_SET_IDS)[number];

export const SEASON_EVENT_RULE_SET_IDS = ['standard', 'double-clout'] as const;
export type SeasonEventRuleSetId = (typeof SEASON_EVENT_RULE_SET_IDS)[number];

export type SeasonLifecycle = 'draft' | 'scheduled' | 'finalized' | 'cancelled';

export type SeasonPause = Readonly<{
  startedOnArenaDay: number;
  resumedOnArenaDay: number | null;
  reason: string;
  actorUserId: string;
  recordedAtMs: number;
}>;

export type SeasonEvent = Readonly<{
  id: string;
  name: string;
  startArenaDay: number;
  endArenaDay: number;
  ruleSetId: SeasonEventRuleSetId;
}>;

export type SeasonConfig = Readonly<{
  id: string;
  number: number;
  name: string;
  campaignName: string;
  startArenaDay: number;
  endArenaDay: number;
  lifecycle: SeasonLifecycle;
  scoringRuleSetId: SeasonScoringRuleSetId;
  events: readonly SeasonEvent[];
  pauses: readonly SeasonPause[];
  createdByUserId: string;
  createdAtMs: number;
  updatedByUserId: string;
  updatedAtMs: number;
  finalizedAtMs: number | null;
}>;

export type SeasonPublicStatus =
  | 'upcoming'
  | 'active'
  | 'paused'
  | 'ended'
  | 'finalized';

export type SeasonEventSummary = Readonly<{
  id: string;
  name: string;
  startArenaDay: number;
  endArenaDay: number;
  daysRemaining: number;
  ruleSetId: SeasonEventRuleSetId;
  scoreMultiplier: number;
}>;

export type SeasonPlayerStanding = Readonly<{
  score: number;
  rank: number;
}>;

export type SeasonRewardTier = 'champion' | 'top-ten' | 'top-hundred';

export type SeasonRewardReceipt = Readonly<{
  seasonId: string;
  seasonNumber: number;
  seasonName: string;
  rank: number;
  score: number;
  tier: SeasonRewardTier;
  badgeLabel: string;
  awardedAtMs: number;
}>;

export type SeasonSummary = Readonly<{
  id: string;
  number: number;
  name: string;
  campaignName: string;
  status: SeasonPublicStatus;
  startArenaDay: number;
  endArenaDay: number;
  daysRemaining: number;
  scoringRuleSetId: SeasonScoringRuleSetId;
  activeEvent: SeasonEventSummary | null;
  me: SeasonPlayerStanding | null;
}>;

export type SeasonPublicState = Readonly<{
  current: SeasonSummary | null;
  next: SeasonSummary | null;
  latestFinalized: SeasonSummary | null;
  latestReward: SeasonRewardReceipt | null;
}>;

export type SeasonBoardEntry = Readonly<{
  username: string;
  score: number;
  rank: number;
  rewardTier: SeasonRewardTier | null;
}>;

export type SeasonBoard = Readonly<{
  season: SeasonSummary;
  top: readonly SeasonBoardEntry[];
  me: SeasonBoardEntry | null;
  finalized: boolean;
}>;

const seasonIdPattern = /^season-[1-9][0-9]*$/;
const eventIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isPositiveInteger = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) > 0;
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) >= 0;
};

const isBoundedText = (
  value: unknown,
  minimumLength: number,
  maximumLength: number
): value is string => {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    value.length >= minimumLength &&
    value.length <= maximumLength
  );
};

const isSeasonLifecycle = (value: unknown): value is SeasonLifecycle => {
  return (
    value === 'draft' ||
    value === 'scheduled' ||
    value === 'finalized' ||
    value === 'cancelled'
  );
};

const isSeasonRewardTier = (value: unknown): value is SeasonRewardTier => {
  return value === 'champion' || value === 'top-ten' || value === 'top-hundred';
};

export const isSeasonEventRuleSetId = (
  value: unknown
): value is SeasonEventRuleSetId => {
  return SEASON_EVENT_RULE_SET_IDS.some((ruleSetId) => ruleSetId === value);
};

export const isSeasonScoringRuleSetId = (
  value: unknown
): value is SeasonScoringRuleSetId => {
  return SEASON_SCORING_RULE_SET_IDS.some((ruleSetId) => ruleSetId === value);
};

export const getSeasonEventScoreMultiplier = (
  ruleSetId: SeasonEventRuleSetId
): number => {
  return ruleSetId === 'double-clout' ? 2 : 1;
};

export const isSeasonPausedOnArenaDay = (
  season: SeasonConfig,
  arenaDay: number
): boolean => {
  return season.pauses.some((pause) => {
    return (
      pause.startedOnArenaDay <= arenaDay &&
      (pause.resumedOnArenaDay === null || arenaDay < pause.resumedOnArenaDay)
    );
  });
};

export const getActiveSeasonEvent = (
  season: SeasonConfig,
  arenaDay: number
): SeasonEvent | null => {
  return (
    season.events.find(
      (event) =>
        event.startArenaDay <= arenaDay && arenaDay <= event.endArenaDay
    ) ?? null
  );
};

export const getSeasonPublicStatus = (
  season: SeasonConfig,
  arenaDay: number
): SeasonPublicStatus => {
  if (season.lifecycle === 'finalized') return 'finalized';
  if (arenaDay < season.startArenaDay) return 'upcoming';
  if (arenaDay > season.endArenaDay) return 'ended';
  return isSeasonPausedOnArenaDay(season, arenaDay) ? 'paused' : 'active';
};

export const isSeasonRankedArenaDay = (
  season: SeasonConfig,
  arenaDay: number
): boolean => {
  return (
    season.lifecycle === 'scheduled' &&
    season.startArenaDay <= arenaDay &&
    arenaDay <= season.endArenaDay &&
    !isSeasonPausedOnArenaDay(season, arenaDay)
  );
};

const isSeasonPause = (value: unknown): value is SeasonPause => {
  if (!isRecord(value)) return false;
  return (
    isPositiveInteger(value.startedOnArenaDay) &&
    (value.resumedOnArenaDay === null ||
      (isPositiveInteger(value.resumedOnArenaDay) &&
        value.resumedOnArenaDay >= value.startedOnArenaDay)) &&
    isBoundedText(value.reason, 1, 160) &&
    isBoundedText(value.actorUserId, 1, 80) &&
    isNonNegativeInteger(value.recordedAtMs)
  );
};

const isSeasonEvent = (value: unknown): value is SeasonEvent => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    eventIdPattern.test(value.id) &&
    isBoundedText(value.name, 1, 48) &&
    isPositiveInteger(value.startArenaDay) &&
    isPositiveInteger(value.endArenaDay) &&
    value.startArenaDay <= value.endArenaDay &&
    isSeasonEventRuleSetId(value.ruleSetId)
  );
};

export const validateSeasonConfig = (
  season: SeasonConfig
): readonly string[] => {
  const errors: string[] = [];
  if (season.id !== `season-${season.number}`) {
    errors.push('Season id must match its number.');
  }
  if (season.endArenaDay !== season.startArenaDay + SEASON_DURATION_DAYS - 1) {
    errors.push(
      `A season must last exactly ${SEASON_DURATION_DAYS} Arena days.`
    );
  }
  const sortedEvents = [...season.events].sort(
    (left, right) => left.startArenaDay - right.startArenaDay
  );
  for (let index = 0; index < sortedEvents.length; index += 1) {
    const event = sortedEvents[index];
    const previous = sortedEvents[index - 1];
    if (!event) continue;
    if (
      event.startArenaDay < season.startArenaDay ||
      event.endArenaDay > season.endArenaDay
    ) {
      errors.push(`Event ${event.id} must stay inside its season.`);
    }
    if (previous && previous.endArenaDay >= event.startArenaDay) {
      errors.push(`Event ${event.id} overlaps ${previous.id}.`);
    }
  }
  const openPauses = season.pauses.filter(
    (pause) => pause.resumedOnArenaDay === null
  );
  if (openPauses.length > 1)
    errors.push('A season cannot have two open pauses.');
  for (const pause of season.pauses) {
    if (
      pause.startedOnArenaDay < season.startArenaDay ||
      pause.startedOnArenaDay > season.endArenaDay
    ) {
      errors.push('Season pauses must begin inside the season.');
    }
  }
  return errors;
};

export const isSeasonConfig = (value: unknown): value is SeasonConfig => {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    !seasonIdPattern.test(value.id) ||
    !isPositiveInteger(value.number) ||
    !isBoundedText(value.name, 1, 48) ||
    !isBoundedText(value.campaignName, 1, 64) ||
    !isPositiveInteger(value.startArenaDay) ||
    !isPositiveInteger(value.endArenaDay) ||
    !isSeasonLifecycle(value.lifecycle) ||
    !isSeasonScoringRuleSetId(value.scoringRuleSetId) ||
    !Array.isArray(value.events) ||
    !value.events.every(isSeasonEvent) ||
    !Array.isArray(value.pauses) ||
    !value.pauses.every(isSeasonPause) ||
    !isBoundedText(value.createdByUserId, 1, 80) ||
    !isNonNegativeInteger(value.createdAtMs) ||
    !isBoundedText(value.updatedByUserId, 1, 80) ||
    !isNonNegativeInteger(value.updatedAtMs) ||
    !(value.finalizedAtMs === null || isNonNegativeInteger(value.finalizedAtMs))
  ) {
    return false;
  }
  const season: SeasonConfig = {
    id: value.id,
    number: value.number,
    name: value.name,
    campaignName: value.campaignName,
    startArenaDay: value.startArenaDay,
    endArenaDay: value.endArenaDay,
    lifecycle: value.lifecycle,
    scoringRuleSetId: value.scoringRuleSetId,
    events: value.events,
    pauses: value.pauses,
    createdByUserId: value.createdByUserId,
    createdAtMs: value.createdAtMs,
    updatedByUserId: value.updatedByUserId,
    updatedAtMs: value.updatedAtMs,
    finalizedAtMs: value.finalizedAtMs,
  };
  return validateSeasonConfig(season).length === 0;
};

export const isSeasonRewardReceipt = (
  value: unknown
): value is SeasonRewardReceipt => {
  if (!isRecord(value)) return false;
  return (
    typeof value.seasonId === 'string' &&
    seasonIdPattern.test(value.seasonId) &&
    isPositiveInteger(value.seasonNumber) &&
    isBoundedText(value.seasonName, 1, 48) &&
    isPositiveInteger(value.rank) &&
    isNonNegativeInteger(value.score) &&
    isSeasonRewardTier(value.tier) &&
    isBoundedText(value.badgeLabel, 1, 80) &&
    isNonNegativeInteger(value.awardedAtMs)
  );
};
