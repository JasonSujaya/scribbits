import type {
  Forecast,
  LegacyCosmeticSnapshot,
  Scribbit,
} from '../../shared/arena';
import { INK_REWARDS, XP_REWARDS } from '../../shared/arena';
import { saveBattleReport, setFeaturedRumbleReport } from './battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getActiveScribbitSubmissionsKey,
  getNightlyResolutionClaimsKey,
  setCurrentArenaDay,
  setCurrentChampion,
} from './arenaStore';
import { payCloutForRumble } from './clout';
import type { CloutPayoutResult } from './clout';
import { getArenaDayNumber } from './day';
import {
  claimInkReward,
  getInventoryKey,
  getRumbleWinInkPayoutKey,
  loadInventory,
} from './inkStore';
import { findInkCatalogEntry } from './ink';
import { resolveSwissRumble } from './rumble';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import type { NightlyFencedStorage } from './nightlyStorageFence';
import {
  crownScribbit,
  expireDueScribbits,
  getRumbleEntrantIds,
  getScribbitOwner,
  loadScribbits,
  recordRumbleStandingOnScribbit,
} from './scribbit';

export const getRumbleProgressionRewards = (
  wins: number
): Readonly<{ xpAwarded: number; inkAwarded: number }> => {
  const normalizedWins =
    Number.isSafeInteger(wins) && wins > 0 ? Math.floor(wins) : 0;
  return {
    xpAwarded: normalizedWins * XP_REWARDS.rumbleWin,
    inkAwarded: normalizedWins * INK_REWARDS.rumbleWin,
  };
};

export type NightlyArenaJobRunResult = {
  skipped: false;
  previousDay: number;
  newDay: number;
  canonicalDay: number;
  resolvedDay: number;
  forecast: Forecast;
  champion: Scribbit;
  reportCount: number;
  expired: {
    faded: number;
    legends: number;
  };
  resolutions: ResolvedArenaDay[];
};

export type NightlyArenaJobSkippedResult = {
  skipped: true;
  previousDay: number;
  newDay: number;
  canonicalDay: number;
  resolvedDay: null;
  forecast: null;
  champion: null;
  reportCount: 0;
  expired: {
    faded: 0;
    legends: 0;
  };
  resolutions: [];
};

export type NightlyArenaJobResult =
  | NightlyArenaJobRunResult
  | NightlyArenaJobSkippedResult;

export type ResolvedArenaDay = {
  resolvedDay: number;
  champion: Scribbit;
  runnerUp: Scribbit | null;
  reportCount: number;
  resolvedForecast: Forecast;
  nextForecast: Forecast;
  cloutPayout: CloutPayoutResult;
  expired: {
    faded: number;
    legends: number;
  };
};

const resolutionOutboxKey = 'arena:resolution-outbox';
const nightlyClaimTimeoutMs = 10 * 60 * 1000;

const parseNightlyClaimedAtMs = (storedClaim: string | undefined): number => {
  if (storedClaim === undefined) return Number.NaN;
  const legacyTimestamp = Number(storedClaim);
  if (Number.isFinite(legacyTimestamp)) return legacyTimestamp;
  try {
    const parsed: unknown = JSON.parse(storedClaim);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'claimedAtMs' in parsed &&
      typeof parsed.claimedAtMs === 'number' &&
      Number.isFinite(parsed.claimedAtMs)
    ) {
      return parsed.claimedAtMs;
    }
  } catch {
    // Malformed historical claims are stale and can be replaced under WATCH.
  }
  return Number.NaN;
};

const claimArenaDayResolution = async (
  storage: ArenaStorage,
  day: number,
  claimedAtMs: number,
  claimId: string
): Promise<string | null> => {
  const nightlyClaimKey = getNightlyResolutionClaimsKey();
  const activeSubmissionsKey = getActiveScribbitSubmissionsKey(day);
  const field = day.toString();
  const claimValue = JSON.stringify({ claimedAtMs, claimId });

  const expiredSubmissions = await storage.zRange(
    activeSubmissionsKey,
    0,
    claimedAtMs,
    { by: 'score' }
  );
  if (expiredSubmissions.length > 0) {
    await storage.zRem(
      activeSubmissionsKey,
      expiredSubmissions.map((entry) => entry.member)
    );
  }

  if (!storage.watch) {
    throw new Error('Nightly resolution claim requires transaction support.');
  }
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(nightlyClaimKey, activeSubmissionsKey);
      const [storedClaim, activeSubmissionCount] = await Promise.all([
        storage.hGet(nightlyClaimKey, field),
        storage.zCard(activeSubmissionsKey),
      ]);
      const existingClaimedAtMs = parseNightlyClaimedAtMs(storedClaim);
      if (activeSubmissionCount > 0) {
        await transaction.unwatch();
        return null;
      }
      if (
        Number.isFinite(existingClaimedAtMs) &&
        claimedAtMs - existingClaimedAtMs < nightlyClaimTimeoutMs
      ) {
        await transaction.unwatch();
        return null;
      }

      await transaction.multi();
      await transaction.hSet(nightlyClaimKey, {
        [field]: claimValue,
      });
      const result = await transaction.exec();
      if (!Array.isArray(result) || result.length === 0) continue;
      if (result.length !== 1) {
        throw new Error(
          'Nightly resolution claim returned an unexpected transaction result.'
        );
      }
      if (result[0] instanceof Error) {
        throw new Error('Nightly resolution claim command failed.', {
          cause: result[0],
        });
      }
      return claimValue;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly resolution claim');
      if ((await storage.hGet(nightlyClaimKey, field)) === claimValue) {
        return claimValue;
      }
      throw error;
    }
  }

  throw new Error('Nightly resolution claim changed too often to acquire.');
};

const releaseArenaDayResolution = async (
  storage: ArenaStorage,
  day: number,
  claimValue: string
): Promise<void> => {
  if (!storage.watch) {
    throw new Error('Nightly resolution claim release requires transaction support.');
  }
  const nightlyClaimKey = getNightlyResolutionClaimsKey();
  const field = day.toString();
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(nightlyClaimKey);
      if ((await storage.hGet(nightlyClaimKey, field)) !== claimValue) {
        await transaction.unwatch();
        return;
      }
      await transaction.multi();
      await transaction.hDel(nightlyClaimKey, [field]);
      const result = await transaction.exec();
      if (!Array.isArray(result) || result.length === 0) continue;
      if (result.length !== 1) {
        throw new Error(
          'Nightly resolution claim release returned an unexpected transaction result.'
        );
      }
      if (result[0] instanceof Error) {
        throw new Error('Nightly resolution claim release command failed.', {
          cause: result[0],
        });
      }
      return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly resolution claim release');
      if ((await storage.hGet(nightlyClaimKey, field)) !== claimValue) return;
      throw error;
    }
  }
  throw new Error('Nightly resolution claim changed too often to release.');
};

const parseResolvedArenaDay = (
  storedResolution: string | undefined
): ResolvedArenaDay | undefined => {
  if (!storedResolution) return undefined;
  try {
    const parsed: unknown = JSON.parse(storedResolution);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'resolvedDay' in parsed &&
      typeof parsed.resolvedDay === 'number' &&
      'champion' in parsed &&
      typeof parsed.champion === 'object' &&
      parsed.champion !== null
    ) {
      return parsed as ResolvedArenaDay;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const loadOutboxResolution = async (
  storage: ArenaStorage,
  day: number
): Promise<ResolvedArenaDay | undefined> => {
  return parseResolvedArenaDay(
    await storage.hGet(resolutionOutboxKey, day.toString())
  );
};

export const loadPendingArenaResolutions = async (
  storage: ArenaStorage
): Promise<ResolvedArenaDay[]> => {
  const pending = await storage.hGetAll(resolutionOutboxKey);
  return Object.values(pending)
    .map(parseResolvedArenaDay)
    .filter(
      (resolution): resolution is ResolvedArenaDay => resolution !== undefined
    )
    .sort((left, right) => left.resolvedDay - right.resolvedDay);
};

export const acknowledgeArenaResolution = async (
  storage: ArenaStorage,
  day: number
): Promise<void> => {
  await storage.hDel(resolutionOutboxKey, [day.toString()]);
};

const getBattleScore = (
  day: number,
  reportIndex: number,
  reportCount: number
): number => {
  return day * 1000000 + reportCount - reportIndex;
};

const applyRumbleStandingsToStoredScribbits = async (
  storage: ArenaStorage,
  resolution: ReturnType<typeof resolveSwissRumble>,
  resolvedDay: number,
  paidAtMs: number
): Promise<void> => {
  for (const standing of resolution.standings) {
    if (standing.scribbit.isFounding) {
      continue;
    }

    const rewards = getRumbleProgressionRewards(standing.wins);
    const storedScribbit = await recordRumbleStandingOnScribbit(
      storage,
      standing.scribbit.id,
      resolvedDay,
      standing.wins,
      standing.losses,
      rewards.xpAwarded
    );

    if (!storedScribbit) continue;

    if (standing.wins > 0) {
      const ownerUserId = await getScribbitOwner(storage, standing.scribbit.id);

      if (ownerUserId) {
        await claimInkReward(storage, {
          payoutKey: getRumbleWinInkPayoutKey(resolvedDay),
          payoutField: standing.scribbit.id,
          userId: ownerUserId,
          amount: rewards.inkAwarded,
          paidAtMs,
        });
      }
    }
  }
};

const crownChampionSnapshot = async (
  storage: ArenaStorage,
  champion: Scribbit,
  resolvedDay: number
): Promise<Scribbit> => {
  const legendTitle = `Champion of Day ${resolvedDay}`;

  if (champion.isFounding) {
    return {
      ...champion,
      legendTitle,
    };
  }

  const crownedScribbit = await crownScribbit(
    storage,
    champion.id,
    legendTitle
  );

  if (crownedScribbit) {
    return crownedScribbit;
  }

  return {
    ...champion,
    legendTitle,
  };
};

const resolveArenaDay = async (
  storage: ArenaStorage,
  resolvedDay: number,
  paidAtMs: number
): Promise<ResolvedArenaDay> => {
  const nextDay = resolvedDay + 1;
  const resolvedForecast = await ensureForecastForDay(storage, resolvedDay);
  const entrantIds = await getRumbleEntrantIds(storage, resolvedDay);
  const entrants = await loadScribbits(storage, entrantIds);
  const resolution = resolveSwissRumble(
    entrants,
    resolvedForecast,
    resolvedDay
  );

  await applyRumbleStandingsToStoredScribbits(
    storage,
    resolution,
    resolvedDay,
    paidAtMs
  );

  for (let index = 0; index < resolution.reports.length; index += 1) {
    const report = resolution.reports[index];

    if (report) {
      await saveBattleReport(
        storage,
        report,
        getBattleScore(nextDay, index, resolution.reports.length)
      );
      await setFeaturedRumbleReport(storage, report, index);
    }
  }

  const champion = await crownChampionSnapshot(
    storage,
    resolution.champion,
    resolvedDay
  );
  await setCurrentChampion(storage, champion);
  const runnerUp = resolution.standings[1]?.scribbit ?? null;
  const cloutPayout = await payCloutForRumble(storage, {
    day: resolvedDay,
    championScribbitId: champion.id,
    runnerUpScribbitId: runnerUp?.id ?? null,
    paidAtMs,
  });

  const expired = await expireDueScribbits(storage, nextDay, {
    getCreatorTitleWatchKey: getInventoryKey,
    getCreatorTitle: async (ownerUserId) => {
      // This is intentionally re-read on every WATCH retry so a concurrent
      // equip change cannot be hidden behind a cached promise.
      const inventory = await loadInventory(storage, ownerUserId);
      if (!inventory.equippedTitle) return null;
      const entry = findInkCatalogEntry(inventory.equippedTitle);
      if (!entry || entry.kind !== 'title') return null;
      return {
        id: entry.id,
        name: entry.name,
        rarity: entry.rarity,
      } satisfies LegacyCosmeticSnapshot;
    },
  });
  const nextForecast = await ensureForecastForDay(storage, nextDay);
  const resolvedArenaDay: ResolvedArenaDay = {
    resolvedDay,
    champion,
    runnerUp,
    reportCount: resolution.reports.length,
    resolvedForecast,
    nextForecast,
    cloutPayout,
    expired,
  };
  // Persist the full publishing payload before advancing the authoritative day.
  // A retry can now recover without resolving the same fights twice.
  await storage.hSet(resolutionOutboxKey, {
    [resolvedDay.toString()]: JSON.stringify(resolvedArenaDay),
  });
  await setCurrentArenaDay(storage, nextDay);
  return resolvedArenaDay;
};

export type NightlyArenaJobOptions = {
  now?: Date;
  force?: boolean;
};

type NightlyArenaJobCoreOptions = NightlyArenaJobOptions & {
  claimId: string;
};

const runNightlyArenaJobCore = async (
  storage: ArenaStorage,
  options: NightlyArenaJobCoreOptions
): Promise<NightlyArenaJobResult> => {
  const now = options.now ?? new Date();
  const previousDay = await ensureCurrentArenaDay(storage, now);
  const canonicalDay = getArenaDayNumber(now);

  if (!options.force && previousDay >= canonicalDay) {
    console.log(
      `Nightly arena job skipped; stored day ${previousDay} is current for canonical day ${canonicalDay}.`
    );
    return {
      skipped: true,
      previousDay,
      newDay: previousDay,
      canonicalDay,
      resolvedDay: null,
      forecast: null,
      champion: null,
      reportCount: 0,
      expired: {
        faded: 0,
        legends: 0,
      },
      resolutions: [],
    };
  }

  const newDay = options.force ? previousDay + 1 : canonicalDay;
  let latestResolution: ResolvedArenaDay | null = null;
  const resolutions: ResolvedArenaDay[] = [];
  let reportCount = 0;
  const expired = { faded: 0, legends: 0 };

  for (
    let resolvedDay = Math.max(1, previousDay);
    resolvedDay < newDay;
    resolvedDay += 1
  ) {
    const pendingResolution = await loadOutboxResolution(storage, resolvedDay);
    let resolution = pendingResolution;
    if (!resolution) {
      const claimValue = await claimArenaDayResolution(
        storage,
        resolvedDay,
        now.getTime(),
        options.claimId
      );
      if (!claimValue) {
        throw new Error(`Arena day ${resolvedDay} is already being resolved.`);
      }
      try {
        resolution = await resolveArenaDay(storage, resolvedDay, now.getTime());
      } catch (error) {
        await releaseArenaDayResolution(storage, resolvedDay, claimValue);
        throw error;
      }
      await releaseArenaDayResolution(storage, resolvedDay, claimValue);
    }
    if (pendingResolution) {
      await setCurrentArenaDay(storage, resolvedDay + 1);
    }
    latestResolution = resolution;
    resolutions.push(resolution);
    reportCount += resolution.reportCount;
    expired.faded += resolution.expired.faded;
    expired.legends += resolution.expired.legends;
  }

  if (!latestResolution) {
    throw new Error('Nightly arena job had no due day to resolve.');
  }

  const forecast = await ensureForecastForDay(storage, newDay);

  return {
    skipped: false,
    previousDay,
    newDay,
    canonicalDay,
    resolvedDay: latestResolution.resolvedDay,
    forecast,
    champion: latestResolution.champion,
    reportCount,
    expired,
    resolutions,
  };
};

export const runNightlyArenaJob = (
  storage: NightlyFencedStorage,
  options: NightlyArenaJobCoreOptions
): Promise<NightlyArenaJobResult> => {
  return runNightlyArenaJobCore(storage, options);
};

/** Deterministic core entrypoint for the in-memory simulation suite only. */
let testingClaimSequence = 0;
export const runNightlyArenaJobForTesting = (
  storage: ArenaStorage,
  options: NightlyArenaJobOptions = {}
): Promise<NightlyArenaJobResult> => {
  testingClaimSequence += 1;
  return runNightlyArenaJobCore(storage, {
    ...options,
    claimId: `test-nightly-claim-${testingClaimSequence}`,
  });
};
