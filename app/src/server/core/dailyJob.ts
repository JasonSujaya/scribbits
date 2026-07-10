import type { Forecast, Scribbit } from '../../shared/arena';
import { INK_REWARDS } from '../../shared/arena';
import { saveBattleReport } from './battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getArenaPostKey,
  setCurrentArenaDay,
  setCurrentChampion,
} from './arenaStore';
import { payCloutForRumble } from './clout';
import type { CloutPayoutResult } from './clout';
import { getArenaDayNumber } from './day';
import {
  claimInkReward,
  getRumbleWinInkPayoutKey,
} from './inkStore';
import { resolveSwissRumble } from './rumble';
import type { ArenaStorage } from './scribbit';
import {
  addXpToScribbit,
  crownScribbit,
  expireDueScribbits,
  getRumbleEntrantIds,
  getScribbitOwner,
  loadScribbit,
  loadScribbits,
  updateScribbit,
} from './scribbit';

const rumbleWinXp = 2;

export type CreatedArenaPost = {
  id: string;
};

export type CreateArenaPost = (options: {
  day: number;
  forecast: Forecast;
  champion: Scribbit | null;
}) => Promise<CreatedArenaPost>;

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
  postId: string | null;
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
  postId: null;
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
const nightlyClaimKey = 'arena:nightly-resolution-claims';
const nightlyClaimTimeoutMs = 10 * 60 * 1000;

const claimArenaDayResolution = async (
  storage: ArenaStorage,
  day: number,
  claimedAtMs: number
): Promise<boolean> => {
  const field = day.toString();
  const existingClaim = Number(await storage.hGet(nightlyClaimKey, field));
  if (Number.isFinite(existingClaim)) {
    if (claimedAtMs - existingClaim < nightlyClaimTimeoutMs) return false;
    // A worker died without releasing its claim. Removal is followed by
    // hSetNX, so only one of several rescuers can take over.
    await storage.hDel(nightlyClaimKey, [field]);
  }
  return (await storage.hSetNX(
    nightlyClaimKey,
    field,
    claimedAtMs.toString()
  )) === 1;
};

const releaseArenaDayResolution = async (
  storage: ArenaStorage,
  day: number
): Promise<void> => {
  await storage.hDel(nightlyClaimKey, [day.toString()]);
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
    .filter((resolution): resolution is ResolvedArenaDay => resolution !== undefined)
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

    const storedScribbit = await loadScribbit(storage, standing.scribbit.id);

    if (!storedScribbit) {
      continue;
    }

    await updateScribbit(
      storage,
      addXpToScribbit(
        {
          ...storedScribbit,
          wins: storedScribbit.wins + standing.wins,
          losses: storedScribbit.losses + standing.losses,
        },
        standing.wins * rumbleWinXp
      )
    );

    if (standing.wins > 0) {
      const ownerUserId = await getScribbitOwner(storage, standing.scribbit.id);

      if (ownerUserId) {
        await claimInkReward(storage, {
          payoutKey: getRumbleWinInkPayoutKey(resolvedDay),
          payoutField: standing.scribbit.id,
          userId: ownerUserId,
          amount: standing.wins * INK_REWARDS.rumbleWin,
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
  const resolution = resolveSwissRumble(entrants, resolvedForecast, resolvedDay);

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

  const expired = await expireDueScribbits(storage, nextDay);
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

export const runNightlyArenaJob = async (
  storage: ArenaStorage,
  options: {
    now?: Date;
    createPost?: CreateArenaPost;
    force?: boolean;
  } = {}
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
      postId: null,
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
      const claimed = await claimArenaDayResolution(
        storage,
        resolvedDay,
        now.getTime()
      );
      if (!claimed) {
        throw new Error(`Arena day ${resolvedDay} is already being resolved.`);
      }
      try {
        resolution = await resolveArenaDay(
          storage,
          resolvedDay,
          now.getTime()
        );
      } catch (error) {
        await releaseArenaDayResolution(storage, resolvedDay);
        throw error;
      }
      await releaseArenaDayResolution(storage, resolvedDay);
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
  let postId: string | null = null;

  if (options.createPost) {
    const arenaPostKey = getArenaPostKey(newDay);
    const existingPostId = await storage.get(arenaPostKey);

    if (existingPostId) {
      postId = existingPostId;
    } else {
      const post = await options.createPost({
        day: newDay,
        forecast,
        champion: latestResolution.champion,
      });
      postId = post.id;
      await storage.set(arenaPostKey, post.id);
    }
  }

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
    postId,
    resolutions,
  };
};
