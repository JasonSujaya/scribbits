import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, media, redis, reddit } from '@devvit/web/server';
import { randomUUID } from 'node:crypto';
import type {
  CatchAttemptRequest,
  CatchAttemptResponse,
  CatchParams,
  DesignSubmission,
  DexEntry,
  DexState,
  RemonstaErrorResponse,
  WildsState,
} from '../../shared/remonsta';
import { getCatchParams, replayCatchAttempt } from '../core/catch';
import {
  ensureSpawnScheduleForDate,
  findActiveSpawnById,
  formatUtcDateKey,
  getActiveSpawns,
} from '../core/spawnEngine';
import {
  calculatePercent,
  getUserCollectionKey,
  parseStoredWholeNumber,
  recordDailyPlay,
} from '../core/dex';
import {
  getDesignRedisKey,
  getDesignVotersRedisKey,
  getDesignWeekKey,
  getDesignWeekRedisKey,
  parseStoredDesignSubmission,
  toPublicDesignSubmission,
  validateDesignSubmissionDraft,
  validateDesignVoteId,
  type StoredDesignSubmission,
} from '../core/designs';
import {
  findLaunchSpeciesById,
  launchSpecies,
  totalLaunchSpecies,
} from '../core/species';

type ErrorResponse = RemonstaErrorResponse;

type CurrentPlayer = {
  userId: string;
  username: string;
};

const communityDexKey = 'dex:community';
const globalSpeciesCatchCountKey = 'catch-counts:species';
const hunterPresenceSeconds = 5 * 60;
const catchAttemptGraceMs = 8000;
const redisTtlSecondsByPurpose = {
  catchAttempt: 24 * 60 * 60,
  caughtSpawn: 24 * 60 * 60,
  hunterPresence: 2 * 24 * 60 * 60,
  designWeek: 8 * 7 * 24 * 60 * 60,
  designSubmission: 8 * 7 * 24 * 60 * 60,
};

export const api = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJsonBody = async (c: HonoContext): Promise<unknown> => {
  try {
    const body: unknown = await c.req.json();
    return body;
  } catch {
    return undefined;
  }
};

const badRequest = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 400);
};

const unauthorized = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 401);
};

const notFound = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 404);
};

const serverError = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 500);
};

const getCurrentPlayer = async (): Promise<CurrentPlayer | undefined> => {
  if (!context.userId) {
    return undefined;
  }

  const username =
    context.username ?? (await reddit.getCurrentUsername()) ?? context.userId;

  return {
    userId: context.userId,
    username,
  };
};

const validateCatchAttempt = (
  value: unknown
): CatchAttemptRequest | undefined => {
  if (!isRecord(value) || typeof value.spawnId !== 'string') {
    return undefined;
  }

  const spawnId = value.spawnId.trim();
  if (
    spawnId.length < 10 ||
    !Array.isArray(value.tapTimesMs) ||
    value.tapTimesMs.length > 5
  ) {
    return undefined;
  }

  const tapTimesMs: number[] = [];
  for (const tapTimeMs of value.tapTimesMs) {
    if (typeof tapTimeMs !== 'number' || !Number.isFinite(tapTimeMs)) {
      return undefined;
    }
    tapTimesMs.push(tapTimeMs);
  }

  return {
    spawnId,
    tapTimesMs,
  };
};

const areTapTimesStrictlyIncreasingWithinDuration = (
  tapTimesMs: number[],
  durationMs: number
): boolean => {
  let previousTapTimeMs = -1;

  for (const tapTimeMs of tapTimesMs) {
    if (
      tapTimeMs < 0 ||
      tapTimeMs > durationMs ||
      tapTimeMs <= previousTapTimeMs
    ) {
      return false;
    }

    previousTapTimeMs = tapTimeMs;
  }

  return true;
};

const parseStoredTimestampMs = (
  storedTimestampMs: string | undefined
): number | undefined => {
  if (storedTimestampMs === undefined) {
    return undefined;
  }

  const timestampMs = Number(storedTimestampMs);
  if (!Number.isFinite(timestampMs)) {
    return undefined;
  }

  return timestampMs;
};

const getCatchAttemptRedisKey = (userId: string, spawnId: string): string => {
  return `attempt:${userId}:${spawnId}`;
};

const getCaughtSpawnRedisKey = (userId: string, spawnId: string): string => {
  return `caught:${userId}:${spawnId}`;
};

const recordCatchAttemptStart = async (
  userId: string,
  spawnId: string,
  nowMs: number
): Promise<void> => {
  const attemptKey = getCatchAttemptRedisKey(userId, spawnId);
  await redis.set(attemptKey, nowMs.toString());
  await redis.expire(attemptKey, redisTtlSecondsByPurpose.catchAttempt);
};

const hasCatchAttemptExpired = (
  startedAtMs: number,
  nowMs: number,
  durationMs: number
): boolean => {
  const elapsedMs = nowMs - startedAtMs;
  return elapsedMs < 0 || elapsedMs > durationMs + catchAttemptGraceMs;
};

const markSpawnCaughtForPlayer = async (
  userId: string,
  spawnId: string,
  nowMs: number
): Promise<boolean> => {
  const caughtSpawnKey = getCaughtSpawnRedisKey(userId, spawnId);
  const createdCaughtGate = await redis.hSetNX(
    caughtSpawnKey,
    'caughtAt',
    nowMs.toString()
  );
  await redis.expire(caughtSpawnKey, redisTtlSecondsByPurpose.caughtSpawn);
  return createdCaughtGate === 1;
};

const uploadDesignImage = async (imageUrl: string): Promise<string | undefined> => {
  try {
    const mediaAsset = await media.upload({ url: imageUrl, type: 'image' });
    return mediaAsset.mediaUrl;
  } catch (error) {
    console.error('Design image upload failed:', error);
    return undefined;
  }
};

const parseStoredDesignJson = (
  storedDesignJson: string | null | undefined
): StoredDesignSubmission | undefined => {
  return parseStoredDesignSubmission(storedDesignJson ?? undefined);
};

const removeExpiredHunters = async (
  hunterKey: string,
  nowMs: number
): Promise<void> => {
  await redis.zRemRangeByScore(hunterKey, Number.MIN_SAFE_INTEGER, nowMs);
};

const getCurrentHunterId = (): string => {
  return context.userId ?? context.loid ?? 'anonymous';
};

const getCommunityDexPercent = async (): Promise<number> => {
  const communityEntries = await redis.hGetAll(communityDexKey);
  return calculatePercent(Object.keys(communityEntries).length, totalLaunchSpecies);
};

const getPersonalDexPercent = async (userId: string): Promise<number> => {
  const collection = await redis.hGetAll(getUserCollectionKey(userId));
  let caughtSpeciesCount = 0;

  for (const species of launchSpecies) {
    if (parseStoredWholeNumber(collection[species.id]) > 0) {
      caughtSpeciesCount += 1;
    }
  }

  return calculatePercent(caughtSpeciesCount, totalLaunchSpecies);
};

const getSpeciesCatchCount = async (speciesId: string): Promise<number> => {
  return parseStoredWholeNumber(
    await redis.hGet(globalSpeciesCatchCountKey, speciesId)
  );
};

const getHunterPresenceKey = (dateKey: string): string => {
  return `hunters:${dateKey}`;
};

const trackHunterVisit = async (now: Date): Promise<number> => {
  const dateKey = formatUtcDateKey(now);
  const hunterKey = getHunterPresenceKey(dateKey);
  const nowMs = now.getTime();
  const visitorId = getCurrentHunterId();
  const expiresAtMs = nowMs + hunterPresenceSeconds * 1000;

  await redis.zAdd(hunterKey, { member: visitorId, score: expiresAtMs });
  await removeExpiredHunters(hunterKey, nowMs);
  await redis.expire(hunterKey, redisTtlSecondsByPurpose.hunterPresence);
  return redis.zCard(hunterKey);
};

const awardCatch = async (
  player: CurrentPlayer,
  speciesId: string,
  now: Date
): Promise<boolean> => {
  const collectionKey = getUserCollectionKey(player.userId);
  const communityUpdate: Record<string, string> = {};
  communityUpdate[speciesId] = '1';

  const transaction = await redis.watch(
    collectionKey,
    globalSpeciesCatchCountKey,
    communityDexKey
  );
  await transaction.multi();
  await transaction.hIncrBy(collectionKey, speciesId, 1);
  await transaction.hIncrBy(globalSpeciesCatchCountKey, speciesId, 1);
  await transaction.hSet(communityDexKey, communityUpdate);
  await transaction.exec();

  const firstCatchKey = `firstcatch:${speciesId}`;
  const createdFirstCatch = await redis.hSetNX(
    firstCatchKey,
    'username',
    player.username
  );

  if (createdFirstCatch === 1) {
    await redis.hSet(firstCatchKey, {
      userId: player.userId,
      caughtAt: now.getTime().toString(),
    });
    return true;
  }

  return false;
};

const readStoredDesign = async (
  designId: string
): Promise<StoredDesignSubmission | undefined> => {
  return parseStoredDesignSubmission(await redis.get(getDesignRedisKey(designId)));
};

api.get('/wilds', async (c) => {
  try {
    const now = new Date();
    const player = await getCurrentPlayer();
    const schedule = await ensureSpawnScheduleForDate(redis, now, launchSpecies);
    const activeSpawns = getActiveSpawns(
      schedule,
      now.getTime(),
      launchSpecies
    );
    const huntersOnline = await trackHunterVisit(now);

    if (player) {
      await recordDailyPlay(redis, player.userId, now);
    }

    return c.json<WildsState>({
      dayNumber: schedule.dayNumber,
      weather: schedule.weather,
      spawns: activeSpawns,
      huntersOnline,
      communityDexPercent: await getCommunityDexPercent(),
      species: launchSpecies,
      loggedIn: Boolean(context.userId),
    });
  } catch (error) {
    console.error('Wilds route failed:', error);
    return serverError(c, 'The Wilds are tangled right now. Try again soon.');
  }
});

api.get('/catch-params', async (c) => {
  const userId = context.userId;
  const spawnId = c.req.query('spawnId')?.trim();

  if (!userId) {
    return unauthorized(c, 'Sign in to start a catch.');
  }

  if (!spawnId) {
    return badRequest(c, 'Choose a wild creature before starting a catch.');
  }

  try {
    const now = new Date();
    const activeSpawn = await findActiveSpawnById(
      redis,
      spawnId,
      now,
      launchSpecies
    );

    if (!activeSpawn) {
      return notFound(c, 'That creature has already wandered off.');
    }

    const species = findLaunchSpeciesById(activeSpawn.speciesId);
    if (!species) {
      return notFound(c, 'That creature is missing from the Remonsta registry.');
    }

    await recordCatchAttemptStart(userId, spawnId, now.getTime());

    return c.json<CatchParams>(getCatchParams(activeSpawn.seed, species.rarity));
  } catch (error) {
    console.error('Catch params route failed:', error);
    return serverError(c, 'The catch ring slipped. Try again soon.');
  }
});

api.post('/catch', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to add creatures to your Dex.');
  }

  const catchAttempt = validateCatchAttempt(await readJsonBody(c));

  if (!catchAttempt) {
    return badRequest(c, 'Send a spawnId and up to five tap timestamps.');
  }

  try {
    const now = new Date();
    const activeSpawn = await findActiveSpawnById(
      redis,
      catchAttempt.spawnId,
      now,
      launchSpecies
    );

    if (!activeSpawn) {
      return notFound(c, 'That creature has already wandered off.');
    }

    const species = findLaunchSpeciesById(activeSpawn.speciesId);
    if (!species) {
      return notFound(c, 'That creature is missing from the Remonsta registry.');
    }

    const catchParams = getCatchParams(activeSpawn.seed, species.rarity);
    const attemptKey = getCatchAttemptRedisKey(
      player.userId,
      catchAttempt.spawnId
    );
    const attemptStartedAtMs = parseStoredTimestampMs(await redis.get(attemptKey));

    if (attemptStartedAtMs === undefined) {
      return badRequest(c, 'Start the catch from the Wilds first.');
    }

    await redis.del(attemptKey);

    if (
      hasCatchAttemptExpired(
        attemptStartedAtMs,
        now.getTime(),
        catchParams.durationMs
      )
    ) {
      return badRequest(c, 'That catch took too long. Try again from the Wilds.');
    }

    if (
      !areTapTimesStrictlyIncreasingWithinDuration(
        catchAttempt.tapTimesMs,
        catchParams.durationMs
      )
    ) {
      return badRequest(c, 'Tap timestamps must be in order and inside the catch timer.');
    }

    const replayResult = replayCatchAttempt(
      catchAttempt.tapTimesMs,
      catchParams
    );
    let isFirstCatch = false;

    if (replayResult.caught) {
      const shouldAwardCatch = await markSpawnCaughtForPlayer(
        player.userId,
        catchAttempt.spawnId,
        now.getTime()
      );

      if (shouldAwardCatch) {
        isFirstCatch = await awardCatch(player, species.id, now);
        await recordDailyPlay(redis, player.userId, now);
      }
    }

    return c.json<CatchAttemptResponse>({
      caught: replayResult.caught,
      species,
      isFirstCatch,
      totalCatchesOfSpecies: await getSpeciesCatchCount(species.id),
      personalDexPercent: await getPersonalDexPercent(player.userId),
      communityDexPercent: await getCommunityDexPercent(),
    });
  } catch (error) {
    console.error('Catch route failed:', error);
    return serverError(c, 'The catch could not be saved. Try again soon.');
  }
});

api.get('/dex', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to view your personal Dex.');
  }

  try {
    const now = new Date();
    const streak = await recordDailyPlay(redis, player.userId, now);
    const collection = await redis.hGetAll(getUserCollectionKey(player.userId));
    const communityEntries = await redis.hGetAll(communityDexKey);
    const entries: DexEntry[] = [];

    for (const species of launchSpecies) {
      entries.push({
        species,
        caughtCount: parseStoredWholeNumber(collection[species.id]),
        discoveredByCommunity: communityEntries[species.id] === '1',
        firstCaughtBy:
          (await redis.hGet(`firstcatch:${species.id}`, 'username')) ?? null,
      });
    }

    return c.json<DexState>({
      entries,
      personalPercent: await getPersonalDexPercent(player.userId),
      communityPercent: calculatePercent(
        Object.keys(communityEntries).length,
        totalLaunchSpecies
      ),
      streakDays: streak.streakDays,
      eggProgress: streak.eggProgress,
    });
  } catch (error) {
    console.error('Dex route failed:', error);
    return serverError(c, 'The Dex pages are stuck together. Try again soon.');
  }
});

api.post('/design', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to submit a design.');
  }

  const designDraft = validateDesignSubmissionDraft(await readJsonBody(c));

  if (!designDraft) {
    return badRequest(
      c,
      'Designs need a short name, one-line lore, and a valid image URL.'
    );
  }

  try {
    const now = new Date();
    const redditImageUrl = await uploadDesignImage(designDraft.imageUrl);

    if (!redditImageUrl) {
      return badRequest(
        c,
        "We couldn't fetch that image — try a direct PNG/JPEG link."
      );
    }

    const weekKey = getDesignWeekKey(now);
    const designId = `design-${weekKey}-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 16)}`;
    const storedDesign: StoredDesignSubmission = {
      id: designId,
      name: designDraft.name,
      artist: player.username,
      lore: designDraft.lore,
      imageUrl: redditImageUrl,
      votes: 0,
      weekKey,
      submittedAt: now.getTime(),
    };

    await redis.set(getDesignRedisKey(designId), JSON.stringify(storedDesign));
    await redis.expire(
      getDesignRedisKey(designId),
      redisTtlSecondsByPurpose.designSubmission
    );
    await redis.zAdd(getDesignWeekRedisKey(weekKey), {
      member: designId,
      score: 0,
    });
    await redis.expire(
      getDesignWeekRedisKey(weekKey),
      redisTtlSecondsByPurpose.designWeek
    );

    return c.json<DesignSubmission>(
      toPublicDesignSubmission(storedDesign, 0),
      201
    );
  } catch (error) {
    console.error('Design route failed:', error);
    return serverError(c, 'The design table is full of ink. Try again soon.');
  }
});

api.get('/designs', async (c) => {
  try {
    const weekKey = getDesignWeekKey(new Date());
    const rankedDesigns = await redis.zRange(
      getDesignWeekRedisKey(weekKey),
      0,
      49,
      { by: 'rank', reverse: true }
    );

    if (rankedDesigns.length === 0) {
      return c.json<DesignSubmission[]>([]);
    }

    const storedDesigns = await redis.mGet(
      rankedDesigns.map((rankedDesign) => {
        return getDesignRedisKey(rankedDesign.member);
      })
    );
    const designs: DesignSubmission[] = [];

    rankedDesigns.forEach((rankedDesign, designIndex) => {
      const storedDesign = parseStoredDesignJson(storedDesigns[designIndex]);
      if (storedDesign) {
        designs.push(
          toPublicDesignSubmission(
            storedDesign,
            Math.max(0, Math.floor(rankedDesign.score))
          )
        );
      }
    });

    return c.json<DesignSubmission[]>(designs);
  } catch (error) {
    console.error('Designs route failed:', error);
    return serverError(c, 'The design wall is not loading. Try again soon.');
  }
});

api.post('/design-vote', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to vote on designs.');
  }

  const designId = validateDesignVoteId(await readJsonBody(c));

  if (!designId) {
    return badRequest(c, 'Choose a valid design to vote on.');
  }

  try {
    const storedDesign = await readStoredDesign(designId);

    if (!storedDesign) {
      return notFound(c, 'That design is not in this week\'s gallery.');
    }

    const voteCreated = await redis.hSetNX(
      getDesignVotersRedisKey(designId),
      player.userId,
      Date.now().toString()
    );
    await redis.expire(
      getDesignVotersRedisKey(designId),
      redisTtlSecondsByPurpose.designWeek
    );

    const votes =
      voteCreated === 1
        ? await redis.zIncrBy(getDesignWeekRedisKey(storedDesign.weekKey), designId, 1)
        : await redis.zScore(getDesignWeekRedisKey(storedDesign.weekKey), designId);
    const publicVotes = Math.max(0, Math.floor(votes ?? storedDesign.votes));
    const updatedStoredDesign: StoredDesignSubmission = {
      ...storedDesign,
      votes: publicVotes,
    };

    await redis.set(
      getDesignRedisKey(designId),
      JSON.stringify(updatedStoredDesign)
    );

    return c.json<{ votes: number }>({ votes: publicVotes });
  } catch (error) {
    console.error('Design vote route failed:', error);
    return serverError(c, 'The vote did not stick. Try again soon.');
  }
});
