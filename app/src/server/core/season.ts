import {
  getActiveSeasonEvent,
  getSeasonRankRewardBundle,
  getSeasonRewardTierForStanding,
  getSeasonEventScoreMultiplier,
  getSeasonPublicStatus,
  isSeasonConfig,
  isSeasonRewardReceipt,
  isSeasonPausedOnArenaDay,
  isSeasonRankedArenaDay,
  SEASON_DURATION_DAYS,
  SEASON_FINAL_LEADERBOARD_SIZE,
  SEASON_ONE_PARTICIPATION_MILESTONES,
  validateSeasonConfig,
  type SeasonBoard,
  type SeasonBoardEntry,
  type SeasonConfig,
  type SeasonEvent,
  type SeasonPublicState,
  type SeasonRewardReceipt,
  type SeasonRewardTier,
  type SeasonSummary,
} from '../../shared/season';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import { claimRewardBundle } from './inkStore';

const seasonCatalogKey = 'season:catalog';
const seasonScheduleKey = 'season:schedule';
const seasonInitializedKey = 'season:initialized';
const seasonFinalsKey = 'season:finals';
const seasonAuditRecordsKey = 'season:admin-audit:records';
const seasonAuditIndexKey = 'season:admin-audit:index';
const seasonResetAuditKey = 'season:reset-audit';
const cloutUsernameKey = 'clout:usernames';

export type SeasonActor = Readonly<{
  userId: string;
  username: string;
}>;

export type SeasonScoringContext = Readonly<{
  seasonId: string;
  eventId: string | null;
  scoreMultiplier: number;
}>;

export type SeasonAdminAuditEntry = Readonly<{
  operationId: string;
  action: string;
  seasonId: string;
  actorUserId: string;
  actorUsername: string;
  detail: string;
  recordedAtMs: number;
}>;

type StoredSeasonFinalStanding = Readonly<{
  userId: string;
  username: string;
  score: number;
  rank: number;
  picksMade: number;
  rewardTier: SeasonRewardTier | null;
}>;

export type SeasonFinalSnapshot = Readonly<{
  seasonId: string;
  finalizedAtMs: number;
  standings: readonly StoredSeasonFinalStanding[];
}>;

type CatalogMutationPlan = Readonly<{
  season: SeasonConfig;
  schedule: 'add' | 'remove' | 'unchanged';
  action: string;
  detail: string;
}>;

export class SeasonStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeasonStateError';
  }
}

export const getSeasonCatalogKey = (): string => seasonCatalogKey;
export const getSeasonScheduleKey = (): string => seasonScheduleKey;
export const getSeasonInitializedKey = (): string => seasonInitializedKey;
export const getSeasonFinalsKey = (): string => seasonFinalsKey;
export const getSeasonAuditRecordsKey = (): string => seasonAuditRecordsKey;
export const getSeasonAuditIndexKey = (): string => seasonAuditIndexKey;
export const getSeasonResetAuditKey = (): string => seasonResetAuditKey;
export const getSeasonRankingKey = (seasonId: string): string =>
  `season:${seasonId}:ranking`;
export const getSeasonRewardsKey = (seasonId: string): string =>
  `season:${seasonId}:rewards`;
export const getSeasonParticipationKey = (seasonId: string): string =>
  `season:${seasonId}:participation`;
export const getSeasonMilestoneEntitlementsKey = (seasonId: string): string =>
  `season:${seasonId}:milestone-entitlements`;
export const getSeasonMilestoneGrantsKey = (seasonId: string): string =>
  `season:${seasonId}:milestone-grants`;
export const getSeasonFinalRewardGrantsKey = (seasonId: string): string =>
  `season:${seasonId}:final-reward-grants`;

const parseStoredSeason = (
  storedValue: string,
  field: string
): SeasonConfig => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    throw new SeasonStateError(`Stored season ${field} is not valid JSON.`);
  }
  if (!isSeasonConfig(parsed) || parsed.id !== field) {
    throw new SeasonStateError(`Stored season ${field} is invalid.`);
  }
  return parsed;
};

const parseStoredReward = (
  storedValue: string | undefined
): SeasonRewardReceipt | null => {
  if (!storedValue) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    throw new SeasonStateError('Stored season reward is not valid JSON.');
  }
  if (!isSeasonRewardReceipt(parsed)) {
    throw new SeasonStateError('Stored season reward is invalid.');
  }
  return parsed;
};

const isStoredFinalStanding = (
  value: unknown
): value is StoredSeasonFinalStanding => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const standing = value;
  return (
    'userId' in standing &&
    typeof standing.userId === 'string' &&
    standing.userId.length > 0 &&
    'username' in standing &&
    typeof standing.username === 'string' &&
    standing.username.length > 0 &&
    'score' in standing &&
    Number.isSafeInteger(standing.score) &&
    Number(standing.score) >= 0 &&
    'rank' in standing &&
    Number.isSafeInteger(standing.rank) &&
    Number(standing.rank) > 0 &&
    (!('picksMade' in standing) ||
      (Number.isSafeInteger(standing.picksMade) &&
        Number(standing.picksMade) >= 0)) &&
    'rewardTier' in standing &&
    (standing.rewardTier === null ||
      standing.rewardTier === 'champion' ||
      standing.rewardTier === 'top-ten' ||
      standing.rewardTier === 'top-hundred')
  );
};

const parseFinalSnapshot = (
  storedValue: string | undefined
): SeasonFinalSnapshot | null => {
  if (!storedValue) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    throw new SeasonStateError('Stored season final is not valid JSON.');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('seasonId' in parsed) ||
    typeof parsed.seasonId !== 'string' ||
    !('finalizedAtMs' in parsed) ||
    typeof parsed.finalizedAtMs !== 'number' ||
    !Number.isSafeInteger(parsed.finalizedAtMs) ||
    !('standings' in parsed) ||
    !Array.isArray(parsed.standings) ||
    !parsed.standings.every(isStoredFinalStanding)
  ) {
    throw new SeasonStateError('Stored season final is invalid.');
  }
  return {
    seasonId: parsed.seasonId,
    finalizedAtMs: parsed.finalizedAtMs,
    standings: parsed.standings.map((standing) => ({
      ...standing,
      picksMade:
        'picksMade' in standing && Number.isSafeInteger(standing.picksMade)
          ? Number(standing.picksMade)
          : 0,
    })),
  };
};

const parseAuditEntry = (storedValue: string): SeasonAdminAuditEntry => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    throw new SeasonStateError('Stored season audit is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SeasonStateError('Stored season audit is invalid.');
  }
  if (
    !('operationId' in parsed) ||
    typeof parsed.operationId !== 'string' ||
    !('action' in parsed) ||
    typeof parsed.action !== 'string' ||
    !('seasonId' in parsed) ||
    typeof parsed.seasonId !== 'string' ||
    !('actorUserId' in parsed) ||
    typeof parsed.actorUserId !== 'string' ||
    !('actorUsername' in parsed) ||
    typeof parsed.actorUsername !== 'string' ||
    !('detail' in parsed) ||
    typeof parsed.detail !== 'string' ||
    !('recordedAtMs' in parsed) ||
    typeof parsed.recordedAtMs !== 'number' ||
    !Number.isSafeInteger(parsed.recordedAtMs)
  ) {
    throw new SeasonStateError('Stored season audit is invalid.');
  }
  return {
    operationId: parsed.operationId,
    action: parsed.action,
    seasonId: parsed.seasonId,
    actorUserId: parsed.actorUserId,
    actorUsername: parsed.actorUsername,
    detail: parsed.detail,
    recordedAtMs: parsed.recordedAtMs,
  };
};

const auditDetail = (summary: string, reason: string): string => {
  const cleanReason = reason.trim();
  if (cleanReason.length < 1 || cleanReason.length > 160) {
    throw new SeasonStateError(
      'An admin reason of 1-160 characters is required.'
    );
  }
  return `${summary} Reason: ${cleanReason}`;
};

export const loadSeasonCatalog = async (
  storage: ArenaStorage
): Promise<SeasonConfig[]> => {
  const storedSeasons = await storage.hGetAll(seasonCatalogKey);
  return Object.entries(storedSeasons)
    .map(([field, storedValue]) => parseStoredSeason(storedValue, field))
    .sort((left, right) => left.number - right.number);
};

const serializeSeason = (season: SeasonConfig): string => {
  const errors = validateSeasonConfig(season);
  if (errors.length > 0) {
    throw new SeasonStateError(errors.join(' '));
  }
  return JSON.stringify(season);
};

const buildAuditEntry = (
  operationId: string,
  actor: SeasonActor,
  plan: CatalogMutationPlan,
  recordedAtMs: number
): SeasonAdminAuditEntry => ({
  operationId,
  action: plan.action,
  seasonId: plan.season.id,
  actorUserId: actor.userId,
  actorUsername: actor.username,
  detail: plan.detail,
  recordedAtMs,
});

const commitCatalogMutation = async (
  storage: ArenaStorage,
  options: Readonly<{
    operationId: string;
    actor: SeasonActor;
    recordedAtMs: number;
    operationName: string;
    buildPlan: (catalog: readonly SeasonConfig[]) => CatalogMutationPlan;
  }>
): Promise<SeasonConfig> => {
  if (!storage.watch) {
    throw new SeasonStateError(
      `${options.operationName} requires transactions.`
    );
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        seasonCatalogKey,
        seasonScheduleKey,
        seasonAuditRecordsKey,
        seasonAuditIndexKey
      );
      const [catalog, existingAudit] = await Promise.all([
        loadSeasonCatalog(storage),
        storage.hGet(seasonAuditRecordsKey, options.operationId),
      ]);
      if (existingAudit) {
        const audit = parseAuditEntry(existingAudit);
        const committedSeason = catalog.find(
          (season) => season.id === audit.seasonId
        );
        await transaction.unwatch();
        if (!committedSeason) {
          throw new SeasonStateError(
            `${options.operationName} audit exists without its season.`
          );
        }
        return committedSeason;
      }

      const plan = options.buildPlan(catalog);
      const audit = buildAuditEntry(
        options.operationId,
        options.actor,
        plan,
        options.recordedAtMs
      );
      await transaction.multi();
      await transaction.hSet(seasonCatalogKey, {
        [plan.season.id]: serializeSeason(plan.season),
      });
      if (plan.schedule === 'add') {
        await transaction.zAdd(seasonScheduleKey, {
          member: plan.season.id,
          score: plan.season.startArenaDay,
        });
      } else if (plan.schedule === 'remove') {
        await transaction.zRem(seasonScheduleKey, [plan.season.id]);
      }
      await transaction.hSet(seasonAuditRecordsKey, {
        [options.operationId]: JSON.stringify(audit),
      });
      await transaction.zAdd(seasonAuditIndexKey, {
        member: options.operationId,
        score: options.recordedAtMs,
      });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return plan.season;
    } catch (error) {
      await discardWatchedTransaction(transaction, options.operationName);
      const existingAudit = await storage.hGet(
        seasonAuditRecordsKey,
        options.operationId
      );
      if (existingAudit) {
        const audit = parseAuditEntry(existingAudit);
        const catalog = await loadSeasonCatalog(storage);
        const committedSeason = catalog.find(
          (season) => season.id === audit.seasonId
        );
        if (committedSeason) return committedSeason;
      }
      throw error;
    }
  }

  throw new SeasonStateError(`${options.operationName} changed too often.`);
};

const findSeason = (
  catalog: readonly SeasonConfig[],
  seasonId: string
): SeasonConfig => {
  const season = catalog.find((candidate) => candidate.id === seasonId);
  if (!season) throw new SeasonStateError(`Season ${seasonId} does not exist.`);
  return season;
};

const overlaps = (left: SeasonConfig, right: SeasonConfig): boolean => {
  return (
    left.startArenaDay <= right.endArenaDay &&
    right.startArenaDay <= left.endArenaDay
  );
};

const assertNoPublishedOverlap = (
  catalog: readonly SeasonConfig[],
  candidate: SeasonConfig
): void => {
  const conflict = catalog.find(
    (season) =>
      season.id !== candidate.id &&
      season.lifecycle !== 'draft' &&
      season.lifecycle !== 'cancelled' &&
      overlaps(season, candidate)
  );
  if (conflict) {
    throw new SeasonStateError(
      `${candidate.id} overlaps published ${conflict.id}.`
    );
  }
};

const createFirstSeasonConfig = (
  startArenaDay: number,
  recordedAtMs: number,
  actor: SeasonActor
): SeasonConfig =>
  Object.freeze({
    id: 'season-1',
    number: 1,
    name: 'Season 1',
    campaignName: 'First Ink',
    startArenaDay,
    endArenaDay: startArenaDay + SEASON_DURATION_DAYS - 1,
    lifecycle: 'scheduled',
    scoringRuleSetId: 'rumble-clout-v1',
    events: Object.freeze([
      Object.freeze({
        id: 'opening-rumble',
        name: 'Opening Rumble',
        startArenaDay,
        endArenaDay: startArenaDay + 6,
        ruleSetId: 'double-clout',
      }),
    ]),
    pauses: Object.freeze([]),
    createdByUserId: actor.userId,
    createdAtMs: recordedAtMs,
    updatedByUserId: actor.userId,
    updatedAtMs: recordedAtMs,
    finalizedAtMs: null,
  });

export const ensureInitialSeason = async (
  storage: ArenaStorage,
  currentArenaDay: number,
  recordedAtMs: number,
  actor: SeasonActor = { userId: 'system', username: 'Scribbits' }
): Promise<SeasonConfig> => {
  const existingCatalog = await loadSeasonCatalog(storage);
  const initialized = await storage.get(seasonInitializedKey);
  if (initialized) {
    const firstSeason = existingCatalog[0];
    if (!firstSeason) {
      throw new SeasonStateError('Season initialization marker has no season.');
    }
    return firstSeason;
  }
  if (!storage.watch) {
    throw new SeasonStateError('Season initialization requires transactions.');
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    const operationId = 'season-bootstrap-v1';
    try {
      transaction = await storage.watch(
        seasonInitializedKey,
        seasonCatalogKey,
        seasonScheduleKey,
        seasonAuditRecordsKey,
        seasonAuditIndexKey
      );
      const [storedMarker, catalog] = await Promise.all([
        storage.get(seasonInitializedKey),
        loadSeasonCatalog(storage),
      ]);
      if (storedMarker) {
        await transaction.unwatch();
        const firstSeason = catalog[0];
        if (!firstSeason) {
          throw new SeasonStateError(
            'Season initialization marker has no season.'
          );
        }
        return firstSeason;
      }

      const existingSeason = catalog[0];
      const season: SeasonConfig =
        existingSeason ??
        createFirstSeasonConfig(currentArenaDay, recordedAtMs, actor);
      const plan: CatalogMutationPlan = {
        season,
        schedule: existingSeason ? 'unchanged' : 'add',
        action: 'bootstrap',
        detail: existingSeason
          ? 'Adopted existing season catalog.'
          : 'Created the first 60-day season.',
      };
      const audit = buildAuditEntry(operationId, actor, plan, recordedAtMs);

      await transaction.multi();
      if (!existingSeason) {
        await transaction.hSet(seasonCatalogKey, {
          [season.id]: serializeSeason(season),
        });
        await transaction.zAdd(seasonScheduleKey, {
          member: season.id,
          score: season.startArenaDay,
        });
      }
      await transaction.set(seasonInitializedKey, season.id);
      await transaction.hSet(seasonAuditRecordsKey, {
        [operationId]: JSON.stringify(audit),
      });
      await transaction.zAdd(seasonAuditIndexKey, {
        member: operationId,
        score: recordedAtMs,
      });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 3) return season;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Season initialization');
      if (await storage.get(seasonInitializedKey)) {
        const catalog = await loadSeasonCatalog(storage);
        const firstSeason = catalog[0];
        if (firstSeason) return firstSeason;
      }
      throw error;
    }
  }

  throw new SeasonStateError('Season initialization changed too often.');
};

export const resetSeasonOne = async (
  storage: ArenaStorage,
  input: Readonly<{
    currentArenaDay: number;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
    reason: string;
  }>
): Promise<SeasonConfig> => {
  if (!storage.watch) {
    throw new SeasonStateError('Season reset requires transactions.');
  }
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      const catalogBeforeWatch = await loadSeasonCatalog(storage);
      const seasonKeys = catalogBeforeWatch.flatMap((season) => [
        getSeasonRankingKey(season.id),
        getSeasonRewardsKey(season.id),
        getSeasonParticipationKey(season.id),
        getSeasonMilestoneEntitlementsKey(season.id),
        getSeasonMilestoneGrantsKey(season.id),
        getSeasonFinalRewardGrantsKey(season.id),
      ]);
      const resetKeys = [
        seasonCatalogKey,
        seasonScheduleKey,
        seasonInitializedKey,
        seasonFinalsKey,
        seasonAuditRecordsKey,
        seasonAuditIndexKey,
        ...seasonKeys,
      ];
      transaction = await storage.watch(seasonResetAuditKey, ...resetKeys);
      const existingReset = await storage.hGet(
        seasonResetAuditKey,
        input.operationId
      );
      if (existingReset !== undefined) {
        await transaction.unwatch();
        const existingSeason = (await loadSeasonCatalog(storage)).find(
          (season) => season.id === 'season-1'
        );
        if (existingSeason) return existingSeason;
        throw new SeasonStateError('Season reset audit has no Season 1.');
      }
      const catalog = await loadSeasonCatalog(storage);
      if (JSON.stringify(catalog) !== JSON.stringify(catalogBeforeWatch)) {
        await transaction.unwatch();
        continue;
      }
      for (const season of catalog) {
        const [milestoneGrants, finalGrants] = await Promise.all([
          storage.hKeys(getSeasonMilestoneGrantsKey(season.id)),
          storage.hKeys(getSeasonFinalRewardGrantsKey(season.id)),
        ]);
        if (milestoneGrants.length > 0 || finalGrants.length > 0) {
          throw new SeasonStateError(
            'Season rewards were already granted; reset would duplicate player inventory.'
          );
        }
      }

      const startArenaDay = input.currentArenaDay + 1;
      const season = createFirstSeasonConfig(
        startArenaDay,
        input.recordedAtMs,
        input.actor
      );
      const audit: SeasonAdminAuditEntry = {
        operationId: input.operationId,
        action: 'reset-season-one',
        seasonId: season.id,
        actorUserId: input.actor.userId,
        actorUsername: input.actor.username,
        detail: `Reset Season 1 to Arena days ${season.startArenaDay}-${season.endArenaDay}. ${input.reason}`,
        recordedAtMs: input.recordedAtMs,
      };

      await transaction.multi();
      await transaction.del(...resetKeys);
      await transaction.hSet(seasonCatalogKey, {
        [season.id]: serializeSeason(season),
      });
      await transaction.zAdd(seasonScheduleKey, {
        member: season.id,
        score: season.startArenaDay,
      });
      await transaction.set(seasonInitializedKey, season.id);
      await transaction.hSet(seasonAuditRecordsKey, {
        [input.operationId]: JSON.stringify(audit),
      });
      await transaction.zAdd(seasonAuditIndexKey, {
        member: input.operationId,
        score: input.recordedAtMs,
      });
      await transaction.hSet(seasonResetAuditKey, {
        [input.operationId]: JSON.stringify(audit),
      });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 7) return season;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Season reset');
      if (
        (await storage.hGet(seasonResetAuditKey, input.operationId)) !==
        undefined
      ) {
        const recovered = (await loadSeasonCatalog(storage)).find(
          (season) => season.id === 'season-1'
        );
        if (recovered) return recovered;
      }
      throw error;
    }
  }
  throw new SeasonStateError('Season reset changed too often.');
};

export const createSeasonDraft = async (
  storage: ArenaStorage,
  input: Readonly<{
    name: string;
    campaignName: string;
    startArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season draft creation',
    buildPlan: (catalog) => {
      const seasonNumber =
        Math.max(0, ...catalog.map((season) => season.number)) + 1;
      const season: SeasonConfig = {
        id: `season-${seasonNumber}`,
        number: seasonNumber,
        name: input.name.trim(),
        campaignName: input.campaignName.trim(),
        startArenaDay: input.startArenaDay,
        endArenaDay: input.startArenaDay + SEASON_DURATION_DAYS - 1,
        lifecycle: 'draft',
        scoringRuleSetId: 'rumble-clout-v1',
        events: [],
        pauses: [],
        createdByUserId: input.actor.userId,
        createdAtMs: input.recordedAtMs,
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
        finalizedAtMs: null,
      };
      serializeSeason(season);
      return {
        season,
        schedule: 'unchanged',
        action: 'create-draft',
        detail: auditDetail(`Created ${season.name}.`, input.reason),
      };
    },
  });
};

export const updateSeasonDraft = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    name: string;
    campaignName: string;
    startArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season draft update',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (current.lifecycle !== 'draft') {
        throw new SeasonStateError('Only draft seasons can be edited.');
      }
      const season: SeasonConfig = {
        ...current,
        name: input.name.trim(),
        campaignName: input.campaignName.trim(),
        startArenaDay: input.startArenaDay,
        endArenaDay: input.startArenaDay + SEASON_DURATION_DAYS - 1,
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      serializeSeason(season);
      return {
        season,
        schedule: 'unchanged',
        action: 'update-draft',
        detail: auditDetail(`Updated ${season.name}.`, input.reason),
      };
    },
  });
};

export const addSeasonEvent = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    event: SeasonEvent;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season event creation',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (
        current.lifecycle === 'finalized' ||
        current.lifecycle === 'cancelled' ||
        input.currentArenaDay >= current.startArenaDay
      ) {
        throw new SeasonStateError(
          'Events can only be added before a season starts.'
        );
      }
      if (current.events.some((event) => event.id === input.event.id)) {
        throw new SeasonStateError(`Event ${input.event.id} already exists.`);
      }
      const season: SeasonConfig = {
        ...current,
        events: [...current.events, { ...input.event }],
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      serializeSeason(season);
      return {
        season,
        schedule: 'unchanged',
        action: 'add-event',
        detail: auditDetail(`Added event ${input.event.id}.`, input.reason),
      };
    },
  });
};

export const removeSeasonEvent = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    eventId: string;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season event removal',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (
        current.lifecycle === 'finalized' ||
        current.lifecycle === 'cancelled' ||
        input.currentArenaDay >= current.startArenaDay
      ) {
        throw new SeasonStateError(
          'Events can only be removed before a season starts.'
        );
      }
      if (!current.events.some((event) => event.id === input.eventId)) {
        throw new SeasonStateError(`Event ${input.eventId} does not exist.`);
      }
      const season: SeasonConfig = {
        ...current,
        events: current.events.filter((event) => event.id !== input.eventId),
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      return {
        season,
        schedule: 'unchanged',
        action: 'remove-event',
        detail: auditDetail(`Removed event ${input.eventId}.`, input.reason),
      };
    },
  });
};

export const scheduleSeason = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season scheduling',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (current.lifecycle !== 'draft') {
        throw new SeasonStateError('Only a draft season can be scheduled.');
      }
      if (current.startArenaDay < input.currentArenaDay) {
        throw new SeasonStateError('A season cannot start in the past.');
      }
      const season: SeasonConfig = {
        ...current,
        lifecycle: 'scheduled',
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      assertNoPublishedOverlap(catalog, season);
      return {
        season,
        schedule: 'add',
        action: 'schedule',
        detail: auditDetail(
          `Scheduled Arena days ${season.startArenaDay}-${season.endArenaDay}.`,
          input.reason
        ),
      };
    },
  });
};

export const pauseSeason = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season pause',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (
        current.lifecycle !== 'scheduled' ||
        input.currentArenaDay < current.startArenaDay ||
        input.currentArenaDay > current.endArenaDay
      ) {
        throw new SeasonStateError('Only an active season can be paused.');
      }
      if (current.pauses.some((pause) => pause.resumedOnArenaDay === null)) {
        throw new SeasonStateError('This season is already paused.');
      }
      const reason = input.reason.trim();
      const season: SeasonConfig = {
        ...current,
        pauses: [
          ...current.pauses,
          {
            startedOnArenaDay: input.currentArenaDay,
            resumedOnArenaDay: null,
            reason,
            actorUserId: input.actor.userId,
            recordedAtMs: input.recordedAtMs,
          },
        ],
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      serializeSeason(season);
      return {
        season,
        schedule: 'unchanged',
        action: 'pause',
        detail: auditDetail('Paused season ranking.', reason),
      };
    },
  });
};

export const resumeSeason = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season resume',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      const openPauseIndex = current.pauses.findIndex(
        (pause) => pause.resumedOnArenaDay === null
      );
      if (
        current.lifecycle !== 'scheduled' ||
        openPauseIndex < 0 ||
        input.currentArenaDay > current.endArenaDay
      ) {
        throw new SeasonStateError('This season is not paused.');
      }
      const pauses = current.pauses.map((pause, index) =>
        index === openPauseIndex
          ? { ...pause, resumedOnArenaDay: input.currentArenaDay }
          : pause
      );
      const season: SeasonConfig = {
        ...current,
        pauses,
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      serializeSeason(season);
      return {
        season,
        schedule: 'unchanged',
        action: 'resume',
        detail: auditDetail('Resumed season ranking.', input.reason),
      };
    },
  });
};

export const cancelSeason = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    currentArenaDay: number;
    reason: string;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
  }>
): Promise<SeasonConfig> => {
  return commitCatalogMutation(storage, {
    ...input,
    operationName: 'Season cancellation',
    buildPlan: (catalog) => {
      const current = findSeason(catalog, input.seasonId);
      if (
        !['draft', 'scheduled'].includes(current.lifecycle) ||
        input.currentArenaDay >= current.startArenaDay
      ) {
        throw new SeasonStateError(
          'Only a draft or future season can be cancelled.'
        );
      }
      const season: SeasonConfig = {
        ...current,
        lifecycle: 'cancelled',
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      return {
        season,
        schedule: current.lifecycle === 'scheduled' ? 'remove' : 'unchanged',
        action: 'cancel',
        detail: auditDetail('Cancelled season.', input.reason),
      };
    },
  });
};

const activeScheduledSeasonsForDay = (
  catalog: readonly SeasonConfig[],
  arenaDay: number
): SeasonConfig[] => {
  return catalog.filter(
    (season) =>
      season.lifecycle === 'scheduled' &&
      season.startArenaDay <= arenaDay &&
      arenaDay <= season.endArenaDay
  );
};

export const loadSeasonScoringContext = async (
  storage: ArenaStorage,
  arenaDay: number
): Promise<SeasonScoringContext | null> => {
  const candidates = activeScheduledSeasonsForDay(
    await loadSeasonCatalog(storage),
    arenaDay
  );
  if (candidates.length > 1) {
    throw new SeasonStateError(`Multiple seasons own Arena day ${arenaDay}.`);
  }
  const season = candidates[0];
  if (!season || !isSeasonRankedArenaDay(season, arenaDay)) return null;
  const event = getActiveSeasonEvent(season, arenaDay);
  return {
    seasonId: season.id,
    eventId: event?.id ?? null,
    scoreMultiplier: getSeasonEventScoreMultiplier(
      event?.ruleSetId ?? 'standard'
    ),
  };
};

const getReverseRank = async (
  storage: ArenaStorage,
  rankingKey: string,
  userId: string
): Promise<number> => {
  const score = await storage.zScore(rankingKey, userId);
  if (score === undefined) return 0;
  const tiedAndHigher = await storage.zRange(
    rankingKey,
    score,
    Number.POSITIVE_INFINITY,
    { by: 'score', reverse: true }
  );
  return tiedAndHigher.filter((entry) => entry.score > score).length + 1;
};

export const getSeasonParticipationCount = async (
  storage: ArenaStorage,
  seasonId: string,
  userId: string
): Promise<number> => {
  return Math.floor(
    (await storage.zScore(getSeasonParticipationKey(seasonId), userId)) ?? 0
  );
};

const createSeasonSummary = async (
  storage: ArenaStorage,
  season: SeasonConfig,
  currentArenaDay: number,
  userId?: string
): Promise<SeasonSummary> => {
  const rankingKey = getSeasonRankingKey(season.id);
  const event = getActiveSeasonEvent(season, currentArenaDay);
  const status = getSeasonPublicStatus(season, currentArenaDay);
  const score = userId
    ? Math.floor((await storage.zScore(rankingKey, userId)) ?? 0)
    : 0;
  const rank = userId ? await getReverseRank(storage, rankingKey, userId) : 0;
  const picksMade = userId
    ? await getSeasonParticipationCount(storage, season.id, userId)
    : 0;
  return {
    id: season.id,
    number: season.number,
    name: season.name,
    campaignName: season.campaignName,
    status,
    startArenaDay: season.startArenaDay,
    endArenaDay: season.endArenaDay,
    daysRemaining:
      status === 'upcoming'
        ? Math.max(0, season.startArenaDay - currentArenaDay)
        : Math.max(0, season.endArenaDay - currentArenaDay + 1),
    scoringRuleSetId: season.scoringRuleSetId,
    activeEvent: event
      ? {
          ...event,
          daysRemaining: Math.max(0, event.endArenaDay - currentArenaDay + 1),
          scoreMultiplier: getSeasonEventScoreMultiplier(event.ruleSetId),
        }
      : null,
    me: userId
      ? {
          score,
          rank,
          picksMade,
          projectedRewardTier: getSeasonRewardTierForStanding(rank, picksMade),
        }
      : null,
  };
};

export const settleSeasonMilestoneRewards = async (
  storage: ArenaStorage,
  seasonId: string,
  userId: string,
  awardedAtMs: number
): Promise<readonly string[]> => {
  const entitlementKey = getSeasonMilestoneEntitlementsKey(seasonId);
  const grantKey = getSeasonMilestoneGrantsKey(seasonId);
  const claimedMilestoneIds: string[] = [];
  for (const milestone of SEASON_ONE_PARTICIPATION_MILESTONES) {
    const receiptField = `${userId}:${milestone.id}`;
    if ((await storage.hGet(entitlementKey, receiptField)) === undefined) {
      continue;
    }
    const claimed = await claimRewardBundle(storage, {
      receiptKey: grantKey,
      receiptField,
      userId,
      reward: milestone.reward,
      awardedAtMs,
    });
    if (claimed) claimedMilestoneIds.push(milestone.id);
  }
  return claimedMilestoneIds;
};

const settleSeasonFinalReward = async (
  storage: ArenaStorage,
  userId: string,
  reward: SeasonRewardReceipt
): Promise<SeasonRewardReceipt> => {
  const bundle = reward.reward ?? getSeasonRankRewardBundle(reward.tier);
  await claimRewardBundle(storage, {
    receiptKey: getSeasonFinalRewardGrantsKey(reward.seasonId),
    receiptField: userId,
    userId,
    reward: bundle,
    awardedAtMs: reward.awardedAtMs,
  });
  return { ...reward, reward: bundle, claimed: true };
};

const loadLatestReward = async (
  storage: ArenaStorage,
  finalizedSeasons: readonly SeasonConfig[],
  userId: string
): Promise<SeasonRewardReceipt | null> => {
  let latestReward: SeasonRewardReceipt | null = null;
  for (const season of [...finalizedSeasons].sort(
    (left, right) => right.number - left.number
  )) {
    const reward = parseStoredReward(
      await storage.hGet(getSeasonRewardsKey(season.id), userId)
    );
    if (!reward) continue;
    const settledReward = await settleSeasonFinalReward(
      storage,
      userId,
      reward
    );
    latestReward ??= settledReward;
  }
  return latestReward;
};

export const loadSeasonPublicState = async (
  storage: ArenaStorage,
  currentArenaDay: number,
  userId?: string
): Promise<SeasonPublicState> => {
  const catalog = await loadSeasonCatalog(storage);
  const currentCandidates = activeScheduledSeasonsForDay(
    catalog,
    currentArenaDay
  );
  if (currentCandidates.length > 1) {
    throw new SeasonStateError(
      `Multiple seasons own Arena day ${currentArenaDay}.`
    );
  }
  const current = currentCandidates[0] ?? null;
  const next =
    catalog
      .filter(
        (season) =>
          season.lifecycle === 'scheduled' &&
          season.startArenaDay > currentArenaDay
      )
      .sort((left, right) => left.startArenaDay - right.startArenaDay)[0] ??
    null;
  const finalized = catalog.filter(
    (season) => season.lifecycle === 'finalized'
  );
  const latestFinalized = [...finalized].sort(
    (left, right) => right.number - left.number
  )[0];
  if (userId) {
    const awardedAtMs = Date.now();
    for (const season of catalog) {
      await settleSeasonMilestoneRewards(
        storage,
        season.id,
        userId,
        awardedAtMs
      );
    }
  }
  return {
    current: current
      ? await createSeasonSummary(storage, current, currentArenaDay, userId)
      : null,
    next: next
      ? await createSeasonSummary(storage, next, currentArenaDay)
      : null,
    latestFinalized: latestFinalized
      ? await createSeasonSummary(
          storage,
          latestFinalized,
          currentArenaDay,
          userId
        )
      : null,
    latestReward: userId
      ? await loadLatestReward(storage, finalized, userId)
      : null,
  };
};

const badgeLabelForReward = (
  season: SeasonConfig,
  tier: SeasonRewardTier
): string => {
  if (tier === 'champion') return `${season.name} Champion`;
  if (tier === 'top-ten') return `${season.name} Finalist`;
  return `${season.name} Contender`;
};

export const finalizeSeason = async (
  storage: ArenaStorage,
  input: Readonly<{
    seasonId: string;
    currentArenaDay: number;
    actor: SeasonActor;
    operationId: string;
    recordedAtMs: number;
    reason: string;
  }>
): Promise<SeasonFinalSnapshot> => {
  if (!storage.watch) {
    throw new SeasonStateError('Season finalization requires transactions.');
  }
  const rankingKey = getSeasonRankingKey(input.seasonId);
  const rewardsKey = getSeasonRewardsKey(input.seasonId);
  const participationKey = getSeasonParticipationKey(input.seasonId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        seasonCatalogKey,
        seasonScheduleKey,
        seasonFinalsKey,
        rankingKey,
        rewardsKey,
        participationKey,
        seasonAuditRecordsKey,
        seasonAuditIndexKey
      );
      const [catalog, storedFinal] = await Promise.all([
        loadSeasonCatalog(storage),
        storage.hGet(seasonFinalsKey, input.seasonId),
      ]);
      const existingFinal = parseFinalSnapshot(storedFinal);
      if (existingFinal) {
        await transaction.unwatch();
        return existingFinal;
      }
      const current = findSeason(catalog, input.seasonId);
      if (current.lifecycle !== 'scheduled') {
        throw new SeasonStateError(
          'Only a completed scheduled season can finalize.'
        );
      }
      if (input.currentArenaDay <= current.endArenaDay) {
        throw new SeasonStateError('A season cannot finalize before it ends.');
      }

      const leadingRankingEntries = await storage.zRange(
        rankingKey,
        0,
        SEASON_FINAL_LEADERBOARD_SIZE - 1,
        { by: 'rank', reverse: true }
      );
      const cutoffScore = leadingRankingEntries.at(-1)?.score;
      const rankingEntries =
        cutoffScore === undefined
          ? leadingRankingEntries
          : await storage.zRange(
              rankingKey,
              cutoffScore,
              Number.POSITIVE_INFINITY,
              { by: 'score', reverse: true }
            );
      const standings: StoredSeasonFinalStanding[] = [];
      const rewardFields: Record<string, string> = {};
      let competitionRank = 0;
      let previousScore: number | undefined;
      for (let index = 0; index < rankingEntries.length; index += 1) {
        const entry = rankingEntries[index];
        if (!entry) continue;
        const score = Math.floor(entry.score);
        if (previousScore === undefined || entry.score !== previousScore) {
          competitionRank = index + 1;
          previousScore = entry.score;
        }
        const rank = competitionRank;
        const picksMade = await getSeasonParticipationCount(
          storage,
          current.id,
          entry.member
        );
        const rewardTier = getSeasonRewardTierForStanding(rank, picksMade);
        const username =
          (await storage.hGet(cloutUsernameKey, entry.member)) ?? entry.member;
        standings.push({
          userId: entry.member,
          username,
          score,
          rank,
          picksMade,
          rewardTier,
        });
        if (rewardTier) {
          const reward: SeasonRewardReceipt = {
            seasonId: current.id,
            seasonNumber: current.number,
            seasonName: current.name,
            rank,
            score,
            tier: rewardTier,
            badgeLabel: badgeLabelForReward(current, rewardTier),
            reward: getSeasonRankRewardBundle(rewardTier),
            awardedAtMs: input.recordedAtMs,
          };
          rewardFields[entry.member] = JSON.stringify(reward);
        }
      }
      const snapshot: SeasonFinalSnapshot = {
        seasonId: current.id,
        finalizedAtMs: input.recordedAtMs,
        standings,
      };
      const finalizedSeason: SeasonConfig = {
        ...current,
        lifecycle: 'finalized',
        finalizedAtMs: input.recordedAtMs,
        updatedByUserId: input.actor.userId,
        updatedAtMs: input.recordedAtMs,
      };
      const plan: CatalogMutationPlan = {
        season: finalizedSeason,
        schedule: 'remove',
        action: 'finalize',
        detail: auditDetail(
          `Finalized ${standings.length} ranked players.`,
          input.reason
        ),
      };
      const audit = buildAuditEntry(
        input.operationId,
        input.actor,
        plan,
        input.recordedAtMs
      );

      await transaction.multi();
      await transaction.hSet(seasonCatalogKey, {
        [finalizedSeason.id]: serializeSeason(finalizedSeason),
      });
      await transaction.hSet(seasonFinalsKey, {
        [finalizedSeason.id]: JSON.stringify(snapshot),
      });
      if (Object.keys(rewardFields).length > 0) {
        await transaction.hSet(rewardsKey, rewardFields);
      }
      await transaction.zRem(seasonScheduleKey, [finalizedSeason.id]);
      await transaction.hSet(seasonAuditRecordsKey, {
        [input.operationId]: JSON.stringify(audit),
      });
      await transaction.zAdd(seasonAuditIndexKey, {
        member: input.operationId,
        score: input.recordedAtMs,
      });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 5) return snapshot;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Season finalization');
      const recovered = parseFinalSnapshot(
        await storage.hGet(seasonFinalsKey, input.seasonId)
      );
      if (recovered) return recovered;
      throw error;
    }
  }

  throw new SeasonStateError('Season finalization changed too often.');
};

export const finalizeDueSeasons = async (
  storage: ArenaStorage,
  resolvedThroughArenaDay: number,
  recordedAtMs: number
): Promise<readonly string[]> => {
  const dueSeasons = (await loadSeasonCatalog(storage)).filter(
    (season) =>
      season.lifecycle === 'scheduled' &&
      season.endArenaDay <= resolvedThroughArenaDay
  );
  const finalizedSeasonIds: string[] = [];
  for (const season of dueSeasons) {
    await finalizeSeason(storage, {
      seasonId: season.id,
      currentArenaDay: season.endArenaDay + 1,
      actor: { userId: 'system', username: 'Scribbits' },
      operationId: `season-finalize:${season.id}`,
      recordedAtMs,
      reason: 'Automatic end-of-season rollover.',
    });
    finalizedSeasonIds.push(season.id);
  }

  if (dueSeasons.length > 0) {
    const catalog = await loadSeasonCatalog(storage);
    const highestFinalized = [...dueSeasons].sort(
      (left, right) => right.number - left.number
    )[0];
    if (
      highestFinalized &&
      !catalog.some((season) => season.number === highestFinalized.number + 1)
    ) {
      const nextNumber = highestFinalized.number + 1;
      await createSeasonDraft(storage, {
        name: `Season ${nextNumber}`,
        campaignName: `Season ${nextNumber} Campaign`,
        startArenaDay: highestFinalized.endArenaDay + 1,
        actor: { userId: 'system', username: 'Scribbits' },
        operationId: `season-next-draft:${nextNumber}`,
        recordedAtMs,
        reason: 'Automatic next-season draft after rollover.',
      });
    }
  }
  return finalizedSeasonIds;
};

const finalSnapshotToBoardEntries = (
  snapshot: SeasonFinalSnapshot
): SeasonBoardEntry[] => {
  return snapshot.standings.map((standing) => ({
    username: standing.username,
    score: standing.score,
    rank: standing.rank,
    picksMade: standing.picksMade,
    projectedRewardTier: standing.rewardTier,
    rewardTier: standing.rewardTier,
  }));
};

export const loadSeasonFinalBoardEntries = async (
  storage: ArenaStorage,
  seasonId: string
): Promise<readonly SeasonBoardEntry[] | null> => {
  const snapshot = parseFinalSnapshot(
    await storage.hGet(seasonFinalsKey, seasonId)
  );
  return snapshot ? finalSnapshotToBoardEntries(snapshot) : null;
};

export const loadSeasonBoard = async (
  storage: ArenaStorage,
  currentArenaDay: number,
  user?: Readonly<{ userId: string; username: string }>
): Promise<SeasonBoard | null> => {
  const catalog = await loadSeasonCatalog(storage);
  const current = activeScheduledSeasonsForDay(catalog, currentArenaDay)[0];
  const latestFinalized = catalog
    .filter((season) => season.lifecycle === 'finalized')
    .sort((left, right) => right.number - left.number)[0];
  const next = catalog
    .filter(
      (season) =>
        season.lifecycle === 'scheduled' &&
        season.startArenaDay > currentArenaDay
    )
    .sort((left, right) => left.startArenaDay - right.startArenaDay)[0];
  const season = current ?? latestFinalized ?? next;
  if (!season) return null;
  const summary = await createSeasonSummary(
    storage,
    season,
    currentArenaDay,
    user?.userId
  );
  const finalSnapshot = parseFinalSnapshot(
    await storage.hGet(seasonFinalsKey, season.id)
  );
  if (finalSnapshot) {
    const top = finalSnapshotToBoardEntries(finalSnapshot);
    const me = user
      ? (() => {
          const standing = finalSnapshot.standings.find(
            (entry) => entry.userId === user.userId
          );
          return standing
            ? {
                username: standing.username,
                score: standing.score,
                rank: standing.rank,
                picksMade: standing.picksMade,
                projectedRewardTier: standing.rewardTier,
                rewardTier: standing.rewardTier,
              }
            : null;
        })()
      : null;
    return { season: summary, top, me, finalized: true };
  }

  const rankingKey = getSeasonRankingKey(season.id);
  const rankingEntries = await storage.zRange(rankingKey, 0, 19, {
    by: 'rank',
    reverse: true,
  });
  const top: SeasonBoardEntry[] = [];
  let competitionRank = 0;
  let previousScore: number | undefined;
  for (let index = 0; index < rankingEntries.length; index += 1) {
    const entry = rankingEntries[index];
    if (!entry) continue;
    if (previousScore === undefined || entry.score !== previousScore) {
      competitionRank = index + 1;
      previousScore = entry.score;
    }
    const picksMade = await getSeasonParticipationCount(
      storage,
      season.id,
      entry.member
    );
    top.push({
      username:
        (await storage.hGet(cloutUsernameKey, entry.member)) ?? entry.member,
      score: Math.floor(entry.score),
      rank: competitionRank,
      picksMade,
      projectedRewardTier: getSeasonRewardTierForStanding(
        competitionRank,
        picksMade
      ),
      rewardTier: null,
    });
  }
  const me = user
    ? await (async () => {
        const score = Math.floor(
          (await storage.zScore(rankingKey, user.userId)) ?? 0
        );
        const rank = await getReverseRank(storage, rankingKey, user.userId);
        const picksMade = await getSeasonParticipationCount(
          storage,
          season.id,
          user.userId
        );
        return {
          username: user.username,
          score,
          rank,
          picksMade,
          projectedRewardTier: getSeasonRewardTierForStanding(rank, picksMade),
          rewardTier: null,
        };
      })()
    : null;
  return { season: summary, top, me, finalized: false };
};

export const describeSeasonCatalog = (
  catalog: readonly SeasonConfig[],
  currentArenaDay: number
): string => {
  if (catalog.length === 0) return 'No seasons configured.';
  return catalog
    .slice(-6)
    .map((season) => {
      const paused = isSeasonPausedOnArenaDay(season, currentArenaDay);
      const status = paused
        ? 'paused'
        : getSeasonPublicStatus(season, currentArenaDay);
      return `${season.id}: ${season.name} · ${status} · days ${season.startArenaDay}-${season.endArenaDay}`;
    })
    .join('\n');
};

const removePlayerFromFinalSnapshot = async (
  storage: ArenaStorage,
  seasonId: string,
  userId: string
): Promise<void> => {
  if (!storage.watch) {
    throw new SeasonStateError(
      'Season privacy deletion requires transactions.'
    );
  }
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(seasonFinalsKey);
      const snapshot = parseFinalSnapshot(
        await storage.hGet(seasonFinalsKey, seasonId)
      );
      if (!snapshot) {
        await transaction.unwatch();
        return;
      }
      const standings = snapshot.standings.filter(
        (standing) => standing.userId !== userId
      );
      if (standings.length === snapshot.standings.length) {
        await transaction.unwatch();
        return;
      }
      const updatedSnapshot: SeasonFinalSnapshot = { ...snapshot, standings };
      await transaction.multi();
      await transaction.hSet(seasonFinalsKey, {
        [seasonId]: JSON.stringify(updatedSnapshot),
      });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Season privacy deletion');
      throw error;
    }
  }
  throw new SeasonStateError('Season privacy deletion changed too often.');
};

export const deleteSeasonPlayerData = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  const catalog = await loadSeasonCatalog(storage);
  for (const season of catalog) {
    await storage.zRem(getSeasonRankingKey(season.id), [userId]);
    await storage.zRem(getSeasonParticipationKey(season.id), [userId]);
    await storage.hDel(getSeasonRewardsKey(season.id), [userId]);
    await storage.hDel(getSeasonFinalRewardGrantsKey(season.id), [userId]);
    const milestoneFields = SEASON_ONE_PARTICIPATION_MILESTONES.map(
      (milestone) => `${userId}:${milestone.id}`
    );
    await storage.hDel(
      getSeasonMilestoneEntitlementsKey(season.id),
      milestoneFields
    );
    await storage.hDel(getSeasonMilestoneGrantsKey(season.id), milestoneFields);
    await removePlayerFromFinalSnapshot(storage, season.id, userId);
  }
};
