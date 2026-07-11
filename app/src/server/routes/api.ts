import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, media, redis, reddit } from '@devvit/web/server';
import { randomUUID } from 'node:crypto';
import type {
  ArenaErrorResponse,
  ArenaState,
  BattleReport,
  CareAction,
  CapsulePullResponse,
  CloutBoard,
  EquipTitleRequest,
  Inventory,
  LegacyCardsState,
  LegendsState,
  MarkLegacySeenRequest,
  PracticeBattleReport,
  Scribbit,
  SparRequest,
  SparRivalSlate,
  SplashState,
} from '../../shared/arena';
import { CAPSULE_FIRST_DAILY_COST, INK_REWARDS } from '../../shared/arena';
import {
  analyze as analyzeDrawing,
  hasMinimumDrawingInk,
} from '../../shared/analyzer-core';
import { simulate } from '../core/battle';
import {
  getFeaturedRumbleReportId,
  loadBattleReportsForUser,
  loadFeaturedRumbleReport,
  purgeBattleReportsForScribbit,
  saveBattleReport,
} from '../core/battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
  removeCurrentChampionIfMatches,
} from '../core/arenaStore';
import {
  claimDailyBack,
  getBackedScribbitId,
  getUserClout,
  getUserCloutPayout,
  loadCloutBoard,
} from '../core/clout';
import { hashTextToSeed } from '../core/random';
import { loadPlayStreak, recordDailyPlay } from '../core/streak';
import {
  isLegacyCardCursor,
  loadLegacyCardPage,
  loadLegacyReturnReceipt,
  markLegacyCardsSeen,
} from '../core/legacy';
import {
  awardInk,
  consumeAccessoriesForSubmit,
  claimCapsuleOperation,
  createCapsuleProgress,
  getCapsuleOperationKey,
  getNextCapsuleCost,
  getInkBalance,
  loadCapsuleProgress,
  loadInventory,
  pullCapsuleForUser,
  releaseCapsuleOperation,
  setEquippedTitle,
} from '../core/inkStore';
import {
  formatUtcDateKey,
  getArenaDayNumber,
  getNextUtcDayStartMs,
} from '../core/day';
import {
  getProjectedRumbleEntrantCount,
  prepareRumbleEntrants,
} from '../core/rumble';
import { createPracticeBattle } from '../core/practice';
import {
  chooseFoundingSparOpponent,
  selectFoundingSparRivalSlate,
} from '../core/species';
import {
  clearScribbitReports,
  getHiddenScribbitIds,
  reportAndHideScribbit,
  SCRIBBIT_REPORT_REMOVAL_THRESHOLD,
} from '../core/moderation';
import { deletePlayerData, recordUserBeliefTarget } from '../core/privacy';
import {
  addRumbleEntrant,
  awardScribbitXp,
  claimDailyCareAction,
  claimDailyFlags,
  claimUserDailySparWinReward,
  createScribbit,
  decodePngDataUrl,
  deleteStoredScribbit,
  enforceAliveScribbitLimit,
  getAliveScribbitsForUser,
  getCommunityLegendCount,
  getDailyFlags,
  getFadedScribbitsForUser,
  getLegendIds,
  getRumbleEntrantIds,
  getRumbleEntrantCount,
  getScribbitOwner,
  increaseBelief,
  isCareAction,
  isScribbitOwnedByUser,
  loadScribbit,
  loadScribbits,
  markDailyFlag,
  recordBattleOutcomeOnScribbit,
  removeRumbleEntrant,
  releaseDailyCareAction,
  releaseDailyFlags,
  storeScribbit,
  validateRenderedPngBinding,
  validateSubmitScribbitRequest,
  type CurrentPlayer,
  type DailyFlagField,
} from '../core/scribbit';

type ErrorResponse = ArenaErrorResponse;

export const api = new Hono();

const beliefVotersTtlSeconds = 7 * 24 * 60 * 60;
const capsuleOperationPendingTimeoutMs = 15_000;
const foundingSparRivalSlateLimit = 3;
const scribbitIdPattern = /^[A-Za-z0-9:_-]{4,90}$/;
const practiceRequestMaximumBodyBytes = 560 * 1024;
const practiceRequestLimitPerMinute = 6;
const practiceRequestGuardTtlSeconds = 30;
const practiceRequestGuardKey = 'guard:practice:active:v1';

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

type BoundedJsonBody =
  | { status: 'parsed'; value: unknown }
  | { status: 'invalid' }
  | { status: 'too-large' };

const readBoundedJsonBody = async (
  c: HonoContext,
  maximumBytes: number
): Promise<BoundedJsonBody> => {
  const contentLength = c.req.header('content-length');
  if (contentLength && Number(contentLength) > maximumBytes) {
    return { status: 'too-large' };
  }

  const body = c.req.raw.body;
  if (!body) return { status: 'invalid' };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return { status: 'too-large' };
      }
      chunks.push(chunk.value);
    }
  } catch {
    return { status: 'invalid' };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return {
      status: 'parsed',
      value: JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    };
  } catch {
    return { status: 'invalid' };
  }
};

type PracticeRequestClaim = 'claimed' | 'busy' | 'rate-limited';

const claimPracticeRequest = async (
  playerId: string,
  token: string,
  now: Date
): Promise<PracticeRequestClaim> => {
  const minute = Math.floor(now.getTime() / 60_000);
  const rateKey = `guard:practice:rate:v1:${playerId}:${minute}`;
  const requestCount = await redis.incrBy(rateKey, 1);
  await redis.expire(rateKey, 120);
  if (requestCount > practiceRequestLimitPerMinute) return 'rate-limited';

  const claimed = await redis.hSetNX(practiceRequestGuardKey, playerId, token);
  await redis.expire(practiceRequestGuardKey, practiceRequestGuardTtlSeconds);
  return claimed === 1 ? 'claimed' : 'busy';
};

const releasePracticeRequest = async (
  playerId: string,
  token: string
): Promise<void> => {
  if ((await redis.hGet(practiceRequestGuardKey, playerId)) !== token) return;
  await redis.hDel(practiceRequestGuardKey, [playerId]);
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

const conflict = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 409);
};

const tooManyRequests = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 429);
};

const payloadTooLarge = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 413);
};

const paymentRequired = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 402);
};

const serverError = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 500);
};

const getWritableArenaDay = async (now: Date): Promise<number | undefined> => {
  const storedDay = await ensureCurrentArenaDay(redis, now);
  return storedDay < getArenaDayNumber(now) ? undefined : storedDay;
};

const arenaRolloverConflict = (c: HonoContext) => {
  return conflict(c, 'The Rumble is resolving. Try again in a moment.');
};

const getCurrentPlayer = async (): Promise<CurrentPlayer | undefined> => {
  if (!context.userId) {
    return undefined;
  }

  const username =
    context.username ?? (await reddit.getCurrentUsername()) ?? 'reddit-player';

  return {
    userId: context.userId,
    username,
  };
};

const readScribbitIdentifier = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const scribbitId = value.trim();
  return scribbitIdPattern.test(scribbitId) ? scribbitId : undefined;
};

const readScribbitId = (value: unknown): string | undefined => {
  return isRecord(value) ? readScribbitIdentifier(value.scribbitId) : undefined;
};

const readSparRequest = (value: unknown): SparRequest | undefined => {
  if (!isRecord(value)) return undefined;

  const requestFields = Object.keys(value);
  if (
    !requestFields.includes('scribbitId') ||
    requestFields.some((field) => {
      return field !== 'scribbitId' && field !== 'opponentId';
    })
  ) {
    return undefined;
  }

  const scribbitId = readScribbitIdentifier(value.scribbitId);
  if (!scribbitId) return undefined;
  if (!requestFields.includes('opponentId')) return { scribbitId };

  const opponentId = readScribbitIdentifier(value.opponentId);
  return opponentId ? { scribbitId, opponentId } : undefined;
};

const readCareRequest = (
  value: unknown
): { scribbitId: string; action: CareAction } | undefined => {
  const scribbitId = readScribbitId(value);

  if (!scribbitId || !isRecord(value) || !isCareAction(value.action)) {
    return undefined;
  }

  return {
    scribbitId,
    action: value.action,
  };
};

const createScribbitId = (day: number): string => {
  return `scribbit-${day}-${randomUUID().replaceAll('-', '').slice(0, 16)}`;
};

const uploadDrawing = async (imageDataUrl: string): Promise<string> => {
  // User drawings must pass through Reddit media hosting. Failing closed keeps
  // moderation and deletion controls on-platform instead of exposing raw PNGs
  // from an unreviewed Redis fallback endpoint.
  const mediaAsset = await media.upload({
    url: imageDataUrl,
    type: 'image',
  });
  return mediaAsset.mediaUrl;
};

const loadOwnedAliveScribbit = async (
  player: CurrentPlayer,
  scribbitId: string,
  day: number
): Promise<Scribbit | undefined> => {
  const scribbit = await loadScribbit(redis, scribbitId);

  if (
    !scribbit ||
    scribbit.status !== 'alive' ||
    scribbit.isFounding ||
    scribbit.expiresDay <= day
  ) {
    return undefined;
  }

  if (!(await isScribbitOwnedByUser(redis, player.userId, scribbitId))) {
    return undefined;
  }

  return scribbit;
};

const createSparRivalSlate = (
  player: CurrentPlayer,
  challenger: Scribbit,
  utcDateKey: string
): SparRivalSlate => {
  const slateSeed = hashTextToSeed(
    `spar-rivals:${utcDateKey}:${player.userId}:${challenger.id}`
  );

  return {
    challenger,
    rivals: selectFoundingSparRivalSlate(
      challenger,
      slateSeed,
      foundingSparRivalSlateLimit
    ),
  };
};

const loadTodayRumbleEntrants = async (
  day: number,
  utcDateKey: string,
  pinnedScribbitIds: string[]
): Promise<Scribbit[]> => {
  const recentEntrantIds = await getRumbleEntrantIds(redis, day, {
    limit: 24,
    reverse: true,
  });
  const entrantIds = [...new Set([...pinnedScribbitIds, ...recentEntrantIds])];
  const entrants = await loadScribbits(redis, entrantIds, utcDateKey);

  return prepareRumbleEntrants(entrants, day);
};

const runNonCriticalSideEffect = async (
  label: string,
  sideEffect: () => Promise<unknown>
): Promise<void> => {
  try {
    await sideEffect();
  } catch (error) {
    console.error(`${label} failed:`, error);
  }
};

api.get('/arena', async (c) => {
  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const player = await getCurrentPlayer();
    let myScribbits: Scribbit[] = [];
    let drawnToday = false;
    let enteredToday = false;
    let myBackedScribbitId: string | null = null;
    let playStreakDays = 0;
    let myClout = 0;
    let myInk = 0;
    let myPens: string[] = [];
    let nextCapsuleCost = CAPSULE_FIRST_DAILY_COST;
    let capsuleProgress = createCapsuleProgress(0, 0, 0);
    let legacyReturnReceipt: ArenaState['legacyReturnReceipt'] = null;

    if (player) {
      playStreakDays = (await recordDailyPlay(redis, player.userId, now)).days;
      const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);
      const inventory = await loadInventory(redis, player.userId);
      myScribbits = await getAliveScribbitsForUser(redis, player.userId);
      drawnToday = dailyFlags.drawnToday;
      enteredToday = dailyFlags.enteredToday;
      myBackedScribbitId = await getBackedScribbitId(
        redis,
        dayNumber,
        player.userId
      );
      myClout = await getUserClout(redis, player.userId);
      myInk = await getInkBalance(redis, player.userId);
      myPens = inventory.pens;
      capsuleProgress = await loadCapsuleProgress(
        redis,
        player.userId,
        inventory
      );
      nextCapsuleCost = await getNextCapsuleCost(
        redis,
        player.userId,
        dayNumber
      );
      legacyReturnReceipt = await loadLegacyReturnReceipt(redis, player.userId);
    }

    const allTodayEntrants = await loadTodayRumbleEntrants(
      dayNumber,
      utcDateKey,
      [
        myBackedScribbitId,
        ...myScribbits.map((scribbit) => scribbit.id),
      ].filter((scribbitId): scribbitId is string => scribbitId !== null)
    );
    const hiddenScribbitIds = player
      ? await getHiddenScribbitIds(redis, player.userId)
      : new Set<string>();
    const todayEntrants = allTodayEntrants.filter(
      (entrant) => !hiddenScribbitIds.has(entrant.id)
    );
    const rumbleEntrantCount = getProjectedRumbleEntrantCount(
      await getRumbleEntrantCount(redis, dayNumber)
    );
    const currentChampion = await getCurrentChampion(redis);
    let lastRumbleReceipt: ArenaState['lastRumbleReceipt'] = null;
    if (player && dayNumber > 1) {
      const resolvedDay = dayNumber - 1;
      const backedScribbitId = await getBackedScribbitId(
        redis,
        resolvedDay,
        player.userId
      );
      if (backedScribbitId) {
        const [backedScribbit, cloutEarned, featuredReportId] =
          await Promise.all([
            loadScribbit(redis, backedScribbitId, utcDateKey),
            getUserCloutPayout(redis, resolvedDay, player.userId),
            getFeaturedRumbleReportId(redis, backedScribbitId, resolvedDay),
          ]);
        lastRumbleReceipt = {
          resolvedDay,
          backedName: backedScribbit?.name ?? 'Your pick',
          championName: currentChampion?.name ?? 'No Champion',
          cloutEarned,
          inkAwarded: cloutEarned === 3 ? INK_REWARDS.backedChampion : 0,
          replayAvailable: featuredReportId !== null,
        };
      }
    }

    return c.json<ArenaState>({
      dayNumber,
      loggedIn: Boolean(player),
      myUsername: player?.username ?? null,
      forecast,
      champion:
        currentChampion && !hiddenScribbitIds.has(currentChampion.id)
          ? currentChampion
          : null,
      myScribbits,
      drawnToday,
      enteredToday,
      rumbleEntrants: rumbleEntrantCount,
      communityLegendCount: await getCommunityLegendCount(redis),
      rumbleResolvesAt: getNextUtcDayStartMs(now),
      todayEntrants,
      myBackedScribbitId,
      playStreakDays,
      myClout,
      myInk,
      myPens,
      nextCapsuleCost,
      capsuleProgress,
      lastRumbleReceipt,
      legacyReturnReceipt,
    });
  } catch (error) {
    console.error('Arena route failed:', error);
    return serverError(c, 'The arena doors are jammed. Try again soon.');
  }
});

api.get('/splash', async (c) => {
  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const resolving = dayNumber < getArenaDayNumber(now);
    const player = await getCurrentPlayer();
    const dailyFlags = player
      ? await getDailyFlags(redis, player.userId, dayNumber)
      : null;
    const backedScribbitId = player
      ? await getBackedScribbitId(redis, dayNumber, player.userId)
      : null;
    const playStreak = player
      ? await loadPlayStreak(redis, player.userId)
      : { days: 0 };

    return c.json<SplashState>({
      loggedIn: Boolean(player),
      resolving,
      forecast: await ensureForecastForDay(redis, dayNumber),
      rumbleEntrants: getProjectedRumbleEntrantCount(
        await getRumbleEntrantCount(redis, dayNumber)
      ),
      rumbleResolvesAt: getNextUtcDayStartMs(now),
      drawnToday: dailyFlags?.drawnToday ?? false,
      backedToday: backedScribbitId !== null,
      playStreakDays: playStreak.days,
    });
  } catch (error) {
    console.error('Splash route failed:', error);
    return serverError(c, 'The arena preview is still being sketched.');
  }
});

api.post('/scribbit', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to draw a Scribbit.');
  }

  const draft = validateSubmitScribbitRequest(await readJsonBody(c));

  if (!draft) {
    return badRequest(
      c,
      'Send a 2-24 character name, base and rendered PNG data URLs, and valid accessories.'
    );
  }

  const decodedBasePng = decodePngDataUrl(draft.baseImageDataUrl);
  const decodedRenderedPng = decodePngDataUrl(draft.imageDataUrl);

  if (!decodedBasePng || !decodedRenderedPng) {
    return badRequest(
      c,
      'Base and rendered drawings must be 512x512 PNG data URLs under 400 KB each.'
    );
  }

  if (
    !validateRenderedPngBinding(
      decodedBasePng,
      decodedRenderedPng,
      draft.accessories
    )
  ) {
    return badRequest(
      c,
      'Rendered drawing must match the base PNG outside declared accessories and must not erase base pixels.'
    );
  }

  // Analyze only the undecorated drawing used by the live preview. Accessories
  // remain cosmetic while the rendered PNG below is uploaded for display.
  const drawingAnalysis = analyzeDrawing({
    data: decodedBasePng.rgba,
    width: decodedBasePng.width,
    height: decodedBasePng.height,
  });
  if (!hasMinimumDrawingInk(drawingAnalysis)) {
    return badRequest(
      c,
      'Your Scribbit needs a body. Add a few more lines before submitting.'
    );
  }
  let createdScribbit: { id: string; day: number } | null = null;
  let claimedSubmitFlags: { day: number; fields: DailyFlagField[] } | null =
    null;
  let rollbackConsumedAccessories: (() => Promise<void>) | undefined;

  try {
    const now = new Date();
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);

    if (dailyFlags.drawnToday) {
      return conflict(c, 'You already drew a Scribbit today.');
    }

    if (dailyFlags.enteredToday) {
      return conflict(c, "You already entered today's Rumble.");
    }

    if (!(await enforceAliveScribbitLimit(redis, player.userId))) {
      return conflict(c, 'You already have three living Scribbits.');
    }

    const accessoryIds = draft.accessories.map((accessory) => {
      return accessory.id;
    });
    const accessoryConsumption = await consumeAccessoriesForSubmit(
      redis,
      player.userId,
      accessoryIds
    );

    if (accessoryConsumption.status === 'invalid') {
      return badRequest(
        c,
        'Choose valid accessories from the capsule catalog.'
      );
    }

    if (accessoryConsumption.status === 'insufficient') {
      return conflict(c, 'You do not have enough copies of that accessory.');
    }

    if (accessoryConsumption.status === 'race') {
      return conflict(
        c,
        'One accessory copy was already used. Refresh and try again.'
      );
    }

    rollbackConsumedAccessories = accessoryConsumption.rollback;

    const scribbitId = createScribbitId(dayNumber);
    createdScribbit = { id: scribbitId, day: dayNumber };
    const imageUrl = await uploadDrawing(draft.imageDataUrl);

    const scribbit = createScribbit({
      id: scribbitId,
      draft: {
        ...draft,
        stats: drawingAnalysis.stats,
        element: drawingAnalysis.element,
      },
      artist: player.username,
      imageUrl,
      day: dayNumber,
    });

    await storeScribbit(redis, player.userId, scribbit);
    await addRumbleEntrant(redis, dayNumber, scribbit.id);
    await recordDailyPlay(redis, player.userId, now);

    const submitDailyFlags: DailyFlagField[] = ['drawn', 'entered'];
    const claimedDailyEntry = await claimDailyFlags(
      redis,
      player.userId,
      dayNumber,
      submitDailyFlags
    );

    if (!claimedDailyEntry) {
      await rollbackConsumedAccessories();
      rollbackConsumedAccessories = undefined;
      await deleteStoredScribbit(redis, player.userId, scribbit.id, dayNumber);
      return conflict(c, 'You already drew or entered today.');
    }

    claimedSubmitFlags = { day: dayNumber, fields: submitDailyFlags };
    await awardInk(redis, player.userId, INK_REWARDS.dailyDraw);
    claimedSubmitFlags = null;
    rollbackConsumedAccessories = undefined;
    return c.json<Scribbit>(scribbit, 201);
  } catch (error) {
    if (rollbackConsumedAccessories) {
      try {
        await rollbackConsumedAccessories();
      } catch (cleanupError) {
        console.error('Accessory consume rollback failed:', cleanupError);
      }
    }

    if (createdScribbit) {
      try {
        await deleteStoredScribbit(
          redis,
          player.userId,
          createdScribbit.id,
          createdScribbit.day
        );
      } catch (cleanupError) {
        console.error('Submit Scribbit cleanup failed:', cleanupError);
      }
    }

    if (claimedSubmitFlags) {
      try {
        await releaseDailyFlags(
          redis,
          player.userId,
          claimedSubmitFlags.day,
          claimedSubmitFlags.fields
        );
      } catch (cleanupError) {
        console.error(
          'Submit Scribbit daily flag cleanup failed:',
          cleanupError
        );
      }
    }

    console.error('Submit Scribbit route failed:', error);
    return serverError(c, 'The ink would not dry. Try again soon.');
  }
});

api.post('/enter-rumble', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to enter the Rumble.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit to enter.');
  }

  let addedEntrant: { id: string; day: number } | null = null;

  try {
    const now = new Date();
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);

    if (dailyFlags.enteredToday) {
      return conflict(c, "You already entered today's Rumble.");
    }

    const scribbit = await loadOwnedAliveScribbit(
      player,
      scribbitId,
      dayNumber
    );

    if (!scribbit) {
      return notFound(c, 'That living Scribbit is not in your sketchbook.');
    }

    await addRumbleEntrant(redis, dayNumber, scribbit.id);
    addedEntrant = { id: scribbit.id, day: dayNumber };
    await recordDailyPlay(redis, player.userId, now);

    const createdEntryFlag = await claimDailyFlags(
      redis,
      player.userId,
      dayNumber,
      ['entered']
    );

    if (!createdEntryFlag) {
      await removeRumbleEntrant(redis, dayNumber, scribbit.id);
      return conflict(c, "You already entered today's Rumble.");
    }

    return c.json<{ entered: true }>({ entered: true });
  } catch (error) {
    if (addedEntrant) {
      try {
        await removeRumbleEntrant(redis, addedEntrant.day, addedEntrant.id);
      } catch (cleanupError) {
        console.error('Enter Rumble cleanup failed:', cleanupError);
      }
    }
    console.error('Enter Rumble route failed:', error);
    return serverError(c, 'The bracket ate that entry. Try again soon.');
  }
});

api.post('/care', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to care for a Scribbit.');
  }

  const careRequest = readCareRequest(await readJsonBody(c));

  if (!careRequest) {
    return badRequest(c, 'Choose a valid Scribbit and care action.');
  }

  let claimedCareAction: {
    scribbitId: string;
    action: CareAction;
    utcDateKey: string;
  } | null = null;

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const scribbit = await loadScribbit(
      redis,
      careRequest.scribbitId,
      utcDateKey
    );

    if (!scribbit) {
      return notFound(c, 'That Scribbit is not in the arena.');
    }

    if (scribbit.isFounding) {
      return badRequest(
        c,
        'Founding Scribbits are already looked after by the arena.'
      );
    }

    if (scribbit.status !== 'alive' || scribbit.expiresDay <= dayNumber) {
      return notFound(c, 'That living Scribbit is not ready for care.');
    }

    if (!(await isScribbitOwnedByUser(redis, player.userId, scribbit.id))) {
      return notFound(c, 'That Scribbit is not in your sketchbook.');
    }

    const careClaim = await claimDailyCareAction(
      redis,
      scribbit.id,
      careRequest.action,
      utcDateKey,
      Date.now()
    );

    if (!careClaim.claimed) {
      return conflict(c, 'You already used that care action today.');
    }

    claimedCareAction = {
      scribbitId: scribbit.id,
      action: careRequest.action,
      utcDateKey,
    };
    const caredScribbit = await awardScribbitXp(
      redis,
      scribbit.id,
      careClaim.xpGain,
      utcDateKey
    );

    if (!caredScribbit) {
      await releaseDailyCareAction(
        redis,
        claimedCareAction.scribbitId,
        claimedCareAction.action,
        claimedCareAction.utcDateKey
      );
      claimedCareAction = null;
      return notFound(c, 'That Scribbit slipped out of the arena.');
    }

    claimedCareAction = null;
    await runNonCriticalSideEffect('Daily play record', () =>
      recordDailyPlay(redis, player.userId, now)
    );
    await runNonCriticalSideEffect('Care ink award', () =>
      awardInk(redis, player.userId, INK_REWARDS.care)
    );
    return c.json<Scribbit>(caredScribbit);
  } catch (error) {
    if (claimedCareAction) {
      try {
        await releaseDailyCareAction(
          redis,
          claimedCareAction.scribbitId,
          claimedCareAction.action,
          claimedCareAction.utcDateKey
        );
      } catch (cleanupError) {
        console.error('Care claim rollback failed:', cleanupError);
      }
    }

    console.error('Care route failed:', error);
    return serverError(c, 'The snack bowl tipped over. Try again soon.');
  }
});

api.get('/spar-rivals', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to choose a spar rival.');
  }

  const scribbitId = readScribbitIdentifier(c.req.query('scribbitId'));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit to see spar rivals.');
  }

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const challenger = await loadOwnedAliveScribbit(
      player,
      scribbitId,
      dayNumber
    );

    if (!challenger) {
      return notFound(c, 'That living Scribbit is not ready to spar.');
    }

    return c.json<SparRivalSlate>(
      createSparRivalSlate(player, challenger, utcDateKey)
    );
  } catch (error) {
    console.error('Spar rivals route failed:', error);
    return serverError(c, 'The rival cards blew away. Try again soon.');
  }
});

api.post('/practice-battle', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to test a Scribbit in the Practice Lab.');
  }

  const now = new Date();
  const requestToken = randomUUID();
  try {
    const requestClaim = await claimPracticeRequest(
      player.userId,
      requestToken,
      now
    );
    if (requestClaim === 'rate-limited') {
      return tooManyRequests(
        c,
        'The Practice Lab needs a breather. Try again in a minute.'
      );
    }
    if (requestClaim === 'busy') {
      return tooManyRequests(
        c,
        'Your previous practice replay is still being drawn.'
      );
    }

    const body = await readBoundedJsonBody(c, practiceRequestMaximumBodyBytes);
    if (body.status === 'too-large') {
      return payloadTooLarge(c, 'That practice drawing is too large.');
    }
    if (body.status === 'invalid') {
      return badRequest(c, 'Send a valid Practice Lab request.');
    }

    const result = createPracticeBattle({
      request: body.value,
      artist: player.username,
      playerId: player.userId,
      canonicalDay: getArenaDayNumber(now),
      nonce: requestToken,
    });

    if (result.status === 'invalid-request') {
      return badRequest(
        c,
        'Send only a 2-24 character name and a base PNG drawing.'
      );
    }

    if (result.status === 'invalid-png') {
      return badRequest(
        c,
        'Practice drawings must be 512x512 PNG data URLs under 400 KB.'
      );
    }

    if (result.status === 'too-small') {
      return badRequest(
        c,
        'Your Scribbit needs a body. Add a few more lines before practicing.'
      );
    }

    // Practice reports cross the response boundary once and are never stored,
    // rewarded, indexed, uploaded, or attached to arena lifecycle state.
    return c.json<PracticeBattleReport>(result.report);
  } catch (error) {
    console.error('Practice battle route failed:', error);
    return serverError(c, 'The Practice Lab bell fell off. Try again soon.');
  } finally {
    try {
      await releasePracticeRequest(player.userId, requestToken);
    } catch (error) {
      console.warn('Practice request guard release failed:', error);
    }
  }
});

api.post('/spar', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to spar with a Scribbit.');
  }

  const sparRequest = readSparRequest(await readJsonBody(c));

  if (!sparRequest) {
    return badRequest(c, 'Choose a valid Scribbit to spar.');
  }

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const challenger = await loadOwnedAliveScribbit(
      player,
      sparRequest.scribbitId,
      dayNumber
    );

    if (!challenger) {
      return notFound(c, 'That living Scribbit is not ready to spar.');
    }

    const sparSeed = hashTextToSeed(
      `spar:${utcDateKey}:${player.userId}:${challenger.id}:${Date.now()}:${randomUUID()}`
    );
    let opponent: Scribbit;
    if (sparRequest.opponentId) {
      const currentSlate = createSparRivalSlate(player, challenger, utcDateKey);
      const chosenOpponent = currentSlate.rivals.find((rival) => {
        return rival.id === sparRequest.opponentId;
      });

      if (!chosenOpponent) {
        return badRequest(c, 'Choose a rival from the current spar slate.');
      }
      opponent = chosenOpponent;
    } else {
      opponent = chooseFoundingSparOpponent(challenger, sparSeed);
    }

    const forecast = await ensureForecastForDay(redis, dayNumber);
    const report = simulate(
      challenger,
      opponent,
      sparSeed,
      forecast,
      'exhibition'
    );

    let inkAwarded = 0;
    if (report.winner === 'a') {
      const claimedDailySparWinReward = await claimUserDailySparWinReward(
        redis,
        player.userId,
        utcDateKey,
        Date.now()
      );

      if (claimedDailySparWinReward) {
        await awardScribbitXp(redis, challenger.id, 1, utcDateKey);
        await awardInk(redis, player.userId, INK_REWARDS.sparWin);
        inkAwarded = INK_REWARDS.sparWin;
      }
    }

    const rewardedReport: BattleReport = {
      ...report,
      ...(inkAwarded > 0 ? { inkAwarded } : {}),
    };
    await saveBattleReport(redis, rewardedReport, Date.now());
    await recordDailyPlay(redis, player.userId, now);
    return c.json<BattleReport>(rewardedReport);
  } catch (error) {
    console.error('Spar route failed:', error);
    return serverError(c, 'The practice bell fell off. Try again soon.');
  }
});

api.get('/my-battles', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return c.json<BattleReport[]>([]);
  }

  try {
    const hiddenScribbitIds = await getHiddenScribbitIds(redis, player.userId);
    const reports = await loadBattleReportsForUser(redis, player.userId, 20);
    return c.json<BattleReport[]>(
      reports.filter(
        (report) =>
          !hiddenScribbitIds.has(report.a.id) &&
          !hiddenScribbitIds.has(report.b.id)
      )
    );
  } catch (error) {
    console.error('My battles route failed:', error);
    return serverError(c, 'The replay pile fell over. Try again soon.');
  }
});

api.get('/rumble-replay', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to replay your Rumble pick.');

  const requestedDay = Number(c.req.query('day'));
  if (!Number.isSafeInteger(requestedDay) || requestedDay < 1) {
    return badRequest(c, 'Choose a valid resolved Rumble day.');
  }

  try {
    const currentDay = await getWritableArenaDay(new Date());
    if (!currentDay) return arenaRolloverConflict(c);
    if (requestedDay !== currentDay - 1) {
      return notFound(c, 'That Rumble replay is no longer on this receipt.');
    }

    const backedScribbitId = await getBackedScribbitId(
      redis,
      requestedDay,
      player.userId
    );
    if (!backedScribbitId) {
      return notFound(
        c,
        'Back a contender before the Rumble to earn a replay.'
      );
    }

    const report = await loadFeaturedRumbleReport(
      redis,
      backedScribbitId,
      requestedDay
    );
    if (!report) {
      return notFound(c, 'That featured bout is no longer available.');
    }

    const hiddenScribbitIds = await getHiddenScribbitIds(redis, player.userId);
    if (
      hiddenScribbitIds.has(report.a.id) ||
      hiddenScribbitIds.has(report.b.id)
    ) {
      return notFound(c, 'That featured bout is hidden from your replay pile.');
    }
    return c.json<BattleReport>(report);
  } catch (error) {
    console.error('Rumble replay route failed:', error);
    return serverError(c, 'The Rumble film reel snapped. Try again soon.');
  }
});

api.post('/believe', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to believe in a Scribbit.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit to believe in.');
  }

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const scribbit = await loadScribbit(redis, scribbitId, utcDateKey);

    if (
      !scribbit ||
      scribbit.status !== 'alive' ||
      scribbit.expiresDay <= dayNumber
    ) {
      return notFound(c, 'That Scribbit cannot collect belief right now.');
    }

    if (await isScribbitOwnedByUser(redis, player.userId, scribbit.id)) {
      return badRequest(c, "believe in someone else's doodle");
    }

    const beliefKey = `belief:${scribbit.id}`;
    const createdBelief = await redis.hSetNX(
      beliefKey,
      `${player.userId}:${utcDateKey}`,
      Date.now().toString()
    );
    await redis.expire(beliefKey, beliefVotersTtlSeconds);

    if (createdBelief !== 1) {
      return conflict(c, 'You already believed in that Scribbit today.');
    }

    await recordUserBeliefTarget(redis, player.userId, scribbit.id, utcDateKey);

    const believedScribbit = await increaseBelief(redis, scribbit);
    const freshScribbit = await loadScribbit(
      redis,
      believedScribbit.id,
      utcDateKey
    );
    return c.json<{ belief: number }>({
      belief: freshScribbit?.belief ?? believedScribbit.belief,
    });
  } catch (error) {
    console.error('Believe route failed:', error);
    return serverError(c, 'The belief spark fizzled. Try again soon.');
  }
});

api.post('/back', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to Back a Scribbit.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit to back.');
  }

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);

    const todayEntrants = await loadTodayRumbleEntrants(
      dayNumber,
      utcDateKey,
      []
    );
    const targetIsInRumble = todayEntrants.some((entrant) => {
      return entrant.id === scribbitId;
    });

    if (!targetIsInRumble) {
      return badRequest(c, "Back one of tonight's Rumble entrants.");
    }

    if (await isScribbitOwnedByUser(redis, player.userId, scribbitId)) {
      return badRequest(c, "Back another Redditor's Scribbit, not your own.");
    }

    const backClaim = await claimDailyBack(
      redis,
      dayNumber,
      player,
      scribbitId
    );

    if (!backClaim.claimed) {
      return conflict(c, 'You already backed a Scribbit today.');
    }

    await recordDailyPlay(redis, player.userId, now);
    return c.json<{ backed: string }>({ backed: backClaim.backedScribbitId });
  } catch (error) {
    console.error('Back route failed:', error);
    return serverError(c, 'The Back slip blew away. Try again soon.');
  }
});

api.post('/remove-scribbit', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to remove your Scribbit.');

  const scribbitId = readScribbitId(await readJsonBody(c));
  if (!scribbitId) return badRequest(c, 'Choose a valid Scribbit to remove.');

  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const scribbit = await loadScribbit(redis, scribbitId);

    if (
      !scribbit ||
      scribbit.isFounding ||
      !(await isScribbitOwnedByUser(redis, player.userId, scribbitId))
    ) {
      return notFound(c, 'That Scribbit is not yours to remove.');
    }

    await purgeBattleReportsForScribbit(redis, scribbitId);
    await deleteStoredScribbit(redis, player.userId, scribbitId, dayNumber);
    await removeCurrentChampionIfMatches(redis, scribbitId);
    await clearScribbitReports(redis, scribbitId);
    return c.json<{ removed: string }>({ removed: scribbitId });
  } catch (error) {
    console.error('Remove Scribbit route failed:', error);
    return serverError(c, 'That Scribbit could not be removed. Try again.');
  }
});

api.post('/report-scribbit', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to report a Scribbit.');

  const scribbitId = readScribbitId(await readJsonBody(c));
  if (!scribbitId) return badRequest(c, 'Choose a valid Scribbit to report.');

  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const scribbit = await loadScribbit(redis, scribbitId);

    if (!scribbit || scribbit.isFounding) {
      return notFound(c, 'That community Scribbit is no longer available.');
    }
    if (await isScribbitOwnedByUser(redis, player.userId, scribbitId)) {
      return badRequest(c, 'Remove your own Scribbit instead of reporting it.');
    }

    const report = await reportAndHideScribbit(
      redis,
      player.userId,
      scribbitId,
      now.getTime()
    );
    let removedForEveryone = false;

    if (report.reportCount >= SCRIBBIT_REPORT_REMOVAL_THRESHOLD) {
      const ownerUserId = await getScribbitOwner(redis, scribbitId);
      if (ownerUserId) {
        await purgeBattleReportsForScribbit(redis, scribbitId);
        await deleteStoredScribbit(redis, ownerUserId, scribbitId, dayNumber);
        await removeCurrentChampionIfMatches(redis, scribbitId);
        await clearScribbitReports(redis, scribbitId);
        removedForEveryone = true;
      }
    }

    return c.json({
      hidden: scribbitId,
      removedForEveryone,
    });
  } catch (error) {
    console.error('Report Scribbit route failed:', error);
    return serverError(c, 'The report slip was lost. Try again.');
  }
});

api.post('/delete-my-data', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to delete your game data.');

  try {
    const dayNumber = await ensureCurrentArenaDay(redis, new Date());
    const result = await deletePlayerData(redis, player.userId, dayNumber);
    return c.json({ deleted: true, removedScribbits: result.removedScribbits });
  } catch (error) {
    console.error('Delete player data route failed:', error);
    return serverError(c, 'Your game data could not be deleted. Try again.');
  }
});

api.get('/clout-board', async (c) => {
  try {
    return c.json<CloutBoard>(
      await loadCloutBoard(redis, await getCurrentPlayer())
    );
  } catch (error) {
    console.error('Clout board route failed:', error);
    return serverError(c, 'The Clout board fell off the wall.');
  }
});

api.get('/inventory', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return c.json<Inventory>({
      items: {},
      pens: [],
      titles: [],
      equippedTitle: null,
      discovered: [],
    });
  }

  try {
    return c.json<Inventory>(await loadInventory(redis, player.userId));
  } catch (error) {
    console.error('Inventory route failed:', error);
    return serverError(c, 'The ink drawer is stuck. Try again soon.');
  }
});

api.post('/equip-title', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to wear a creator title.');

  const body = await readJsonBody(c);
  if (
    !isRecord(body) ||
    (body.titleId !== null && typeof body.titleId !== 'string')
  ) {
    return badRequest(c, 'Choose an owned title or remove your current title.');
  }
  const request: EquipTitleRequest = {
    titleId:
      typeof body.titleId === 'string' ? body.titleId.trim() : body.titleId,
  };
  if (request.titleId !== null && !/^[a-z0-9-]{2,64}$/.test(request.titleId)) {
    return badRequest(c, 'Choose a valid creator title.');
  }

  try {
    const inventory = await setEquippedTitle(
      redis,
      player.userId,
      request.titleId
    );
    if (!inventory) {
      return badRequest(c, 'Discover that title before wearing it.');
    }
    return c.json<Inventory>(inventory);
  } catch (error) {
    console.error('Equip title route failed:', error);
    return serverError(c, 'The title ribbon slipped. Try again soon.');
  }
});

api.post('/capsule', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to open a Mystery Ink capsule.');
  }

  const request = await readJsonBody(c);
  const operationId =
    isRecord(request) && typeof request.operationId === 'string'
      ? request.operationId.trim()
      : '';
  if (!/^[A-Za-z0-9-]{16,80}$/.test(operationId)) {
    return badRequest(c, 'Open the capsule with a valid operation id.');
  }
  const operationKey = getCapsuleOperationKey(player.userId, operationId);

  try {
    const now = new Date();
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const operationClaim = await claimCapsuleOperation(
      redis,
      operationKey,
      now.getTime(),
      capsuleOperationPendingTimeoutMs
    );
    if (operationClaim.status === 'pending') {
      return conflict(
        c,
        'That capsule is already opening. Try again in a moment.'
      );
    }
    if (operationClaim.status === 'completed') {
      return c.json<CapsulePullResponse>(operationClaim.response);
    }

    const result = await pullCapsuleForUser(redis, player.userId, dayNumber, {
      operationKey,
      expectedPendingValue: operationClaim.pendingValue,
      selectionEntropy: randomUUID(),
    });

    if (result.status === 'insufficientInk') {
      await releaseCapsuleOperation(
        redis,
        operationKey,
        operationClaim.pendingValue
      );
      return paymentRequired(
        c,
        `You need ${result.cost} Mystery Ink to open a capsule.`
      );
    }

    const response: CapsulePullResponse = {
      pull: result.pull,
      ink: result.ink,
      inventory: result.inventory,
      nextCost: result.nextCost,
      progress: result.progress,
    };
    return c.json<CapsulePullResponse>(response);
  } catch (error) {
    // Do not clear an indeterminate claim here. The pull transaction stores its
    // final response in the same atomic commit as Ink/inventory. If Redis fails
    // before commit, the pending claim safely blocks retries until timeout; if
    // the commit succeeded but the response was interrupted, the stored receipt
    // makes the next request idempotent.
    console.error('Capsule route failed:', error);
    return serverError(c, 'The capsule machine jammed. Try again soon.');
  }
});

api.post('/boss-challenge', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to challenge the Champion.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit for the boss challenge.');
  }

  let claimedBossChallenge: { userId: string; day: number } | null = null;

  try {
    const now = new Date();
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const challenger = await loadOwnedAliveScribbit(
      player,
      scribbitId,
      dayNumber
    );
    const champion = await getCurrentChampion(redis);

    if (!challenger) {
      return notFound(c, 'That living Scribbit is not ready to fight.');
    }

    if (!champion) {
      return conflict(c, 'No Champion is on the boss throne yet.');
    }

    const createdBossFlag = await markDailyFlag(
      redis,
      player.userId,
      dayNumber,
      'bossChallenge'
    );

    if (!createdBossFlag) {
      return conflict(c, "You already challenged today's Champion.");
    }

    claimedBossChallenge = { userId: player.userId, day: dayNumber };
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const report = simulate(
      challenger,
      champion,
      hashTextToSeed(
        `boss:${dayNumber}:${player.userId}:${challenger.id}:${champion.id}`
      ),
      forecast,
      'boss'
    );

    await saveBattleReport(redis, report, Date.now());
    await recordBattleOutcomeOnScribbit(
      redis,
      challenger.id,
      report.winner === 'a' ? 'win' : 'loss',
      2
    );
    claimedBossChallenge = null;
    await runNonCriticalSideEffect('Daily play record', () =>
      recordDailyPlay(redis, player.userId, now)
    );

    return c.json<BattleReport>(report);
  } catch (error) {
    if (claimedBossChallenge) {
      try {
        await releaseDailyFlags(
          redis,
          claimedBossChallenge.userId,
          claimedBossChallenge.day,
          ['bossChallenge']
        );
      } catch (cleanupError) {
        console.error('Boss challenge flag rollback failed:', cleanupError);
      }
    }

    console.error('Boss challenge route failed:', error);
    return serverError(
      c,
      'The Champion ducked behind paperwork. Try again soon.'
    );
  }
});

const maximumLegendsPageSize = 50;
const maximumLegacyCardsPageSize = 24;

const readPageNumber = (
  value: string | undefined,
  fallback: number,
  maximum?: number
): number | undefined => {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return undefined;

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) return undefined;
  return maximum === undefined ? parsedValue : Math.min(parsedValue, maximum);
};

const loadVisibleLegendPage = async (
  hiddenScribbitIds: Set<string>,
  offset: number,
  limit: number
): Promise<Pick<LegendsState, 'legends' | 'nextCursor'>> => {
  const legends: Scribbit[] = [];
  const scanBatchSize = Math.min(
    maximumLegendsPageSize,
    Math.max(8, limit + 1)
  );
  let scanOffset = offset;

  while (true) {
    const batchStartOffset = scanOffset;
    const legendIds = await getLegendIds(
      redis,
      scanBatchSize,
      batchStartOffset
    );
    if (legendIds.length === 0) break;
    const loadedLegends = new Map(
      (await loadScribbits(redis, legendIds))
        .filter((scribbit) => scribbit.status === 'legend')
        .map((scribbit) => [scribbit.id, scribbit])
    );

    for (let index = 0; index < legendIds.length; index += 1) {
      const scribbitOffset = batchStartOffset + index;
      scanOffset = scribbitOffset + 1;
      const scribbitId = legendIds[index];
      if (!scribbitId) continue;
      const scribbit = loadedLegends.get(scribbitId);
      // Missing/non-Legend rows are stale zset members. Consume their raw rank
      // without returning them so the next cursor never duplicates or skips a
      // valid Scribbit around the stale entry.
      if (!scribbit) continue;
      if (hiddenScribbitIds.has(scribbit.id)) continue;

      // The cursor points at (rather than past) the first visible item on the
      // next page. Hidden rows between pages are consumed once and never leave
      // a mysteriously short page for this player.
      if (legends.length === limit) {
        return {
          legends,
          nextCursor: String(scribbitOffset),
        };
      }
      legends.push(scribbit);
    }

    if (legendIds.length < scanBatchSize) break;
  }

  return { legends, nextCursor: null };
};

api.get('/legacy-cards', async (c) => {
  const cursor = c.req.query('cursor') ?? null;
  const requestedLimit = readPageNumber(
    c.req.query('limit'),
    maximumLegacyCardsPageSize,
    maximumLegacyCardsPageSize
  );
  if (
    !isLegacyCardCursor(cursor) ||
    requestedLimit === undefined ||
    requestedLimit < 1
  ) {
    return badRequest(c, 'Use a valid Legacy Deck cursor and page size.');
  }

  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return c.json<LegacyCardsState>({ cards: [], nextCursor: null });
    }
    return c.json<LegacyCardsState>(
      await loadLegacyCardPage(redis, player.userId, cursor, requestedLimit)
    );
  } catch (error) {
    console.error('Legacy Cards route failed:', error);
    return serverError(c, 'Your Legacy Deck is stuck between pages.');
  }
});

api.post('/legacy-cards/seen', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to file away Legacy Cards.');

  const body = await readJsonBody(c);
  if (
    !isRecord(body) ||
    !Number.isSafeInteger(body.throughArchivedDay) ||
    Number(body.throughArchivedDay) < 0
  ) {
    return badRequest(c, 'Choose a valid archived day to file away.');
  }
  const request: MarkLegacySeenRequest = {
    throughArchivedDay: Number(body.throughArchivedDay),
  };

  try {
    const currentDay = await getWritableArenaDay(new Date());
    if (!currentDay) return arenaRolloverConflict(c);
    if (request.throughArchivedDay > currentDay) {
      return badRequest(c, 'That Legacy Card has not been archived yet.');
    }
    const seenThroughDay = await markLegacyCardsSeen(
      redis,
      player.userId,
      request.throughArchivedDay
    );
    return c.json({ seenThroughDay });
  } catch (error) {
    console.error('Mark Legacy Cards seen route failed:', error);
    return serverError(c, 'The archive stamp missed the page. Try again.');
  }
});

api.get('/legends', async (c) => {
  const cursorOffset = readPageNumber(c.req.query('cursor'), 0);
  const requestedLimit = readPageNumber(
    c.req.query('limit'),
    maximumLegendsPageSize,
    maximumLegendsPageSize
  );
  if (
    cursorOffset === undefined ||
    requestedLimit === undefined ||
    requestedLimit < 1
  ) {
    return badRequest(
      c,
      'Use a valid Legends cursor and a positive page size.'
    );
  }

  try {
    const player = await getCurrentPlayer();
    const hiddenScribbitIds = player
      ? await getHiddenScribbitIds(redis, player.userId)
      : new Set<string>();
    const myFaded = player
      ? await getFadedScribbitsForUser(redis, player.userId, 30)
      : [];
    const legendPage = await loadVisibleLegendPage(
      hiddenScribbitIds,
      cursorOffset,
      requestedLimit
    );
    const legendsState: LegendsState = { ...legendPage, myFaded };

    return c.json<LegendsState>(legendsState);
  } catch (error) {
    console.error('Legends route failed:', error);
    return serverError(c, 'The Hall of Legends is dusty right now.');
  }
});
