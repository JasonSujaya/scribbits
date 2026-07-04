import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, media, redis, reddit } from '@devvit/web/server';
import { randomUUID } from 'node:crypto';
import type {
  ArenaErrorResponse,
  ArenaState,
  BattleReport,
  CareAction,
  LegendsState,
  Scribbit,
} from '../../shared/arena';
import { analyze as analyzeDrawing } from '../../shared/analyzer-core';
import { simulate } from '../core/battle';
import { loadBattleReportsForUser, saveBattleReport } from '../core/battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
} from '../core/arenaStore';
import { hashTextToSeed } from '../core/random';
import { recordDailyPlay } from '../core/dex';
import { formatUtcDateKey } from '../core/day';
import { getProjectedRumbleEntrantCount } from '../core/rumble';
import { chooseFoundingSparOpponent } from '../core/species';
import {
  addRumbleEntrant,
  awardScribbitXp,
  claimDailyCareAction,
  claimDailySparWinXp,
  claimDailyFlags,
  createScribbit,
  decodePngDataUrl,
  deleteStoredScribbit,
  enforceAliveScribbitLimit,
  expireDueScribbits,
  getAliveScribbitsForUser,
  getCommunityLegendCount,
  getDailyFlags,
  getFadedScribbitsForUser,
  getLegends,
  getRumbleEntrantCount,
  increaseBelief,
  isCareAction,
  isScribbitOwnedByUser,
  loadScribbit,
  markDailyFlag,
  readDrawingFallback,
  recordBattleOutcomeOnScribbit,
  removeRumbleEntrant,
  storeDrawingFallback,
  storeScribbit,
  validateSubmitScribbitRequest,
  type CurrentPlayer,
  type DecodedPngDataUrl,
} from '../core/scribbit';

type ErrorResponse = ArenaErrorResponse;

export const api = new Hono();

const beliefVotersTtlSeconds = 7 * 24 * 60 * 60;

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

const conflict = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>({ status: 'error', message }, 409);
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

const readScribbitId = (value: unknown): string | undefined => {
  if (!isRecord(value) || typeof value.scribbitId !== 'string') {
    return undefined;
  }

  const scribbitId = value.scribbitId.trim();

  if (!/^[A-Za-z0-9:_-]{4,90}$/.test(scribbitId)) {
    return undefined;
  }

  return scribbitId;
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

const uploadOrStoreDrawing = async (
  scribbitId: string,
  imageDataUrl: string,
  decodedPng: DecodedPngDataUrl
): Promise<string> => {
  try {
    const mediaAsset = await media.upload({
      url: imageDataUrl,
      type: 'image',
    });
    return mediaAsset.mediaUrl;
  } catch (error) {
    console.warn('Drawing media upload failed; storing PNG in Redis:', error);
    await storeDrawingFallback(redis, scribbitId, decodedPng);
    return `/api/drawing/${scribbitId}`;
  }
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

api.get('/arena', async (c) => {
  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    await expireDueScribbits(redis, dayNumber);
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const player = await getCurrentPlayer();
    let myScribbits: Scribbit[] = [];
    let drawnToday = false;
    let enteredToday = false;

    if (player) {
      await recordDailyPlay(redis, player.userId, now);
      const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);
      myScribbits = await getAliveScribbitsForUser(redis, player.userId);
      drawnToday = dailyFlags.drawnToday;
      enteredToday = dailyFlags.enteredToday;
    }

    const storedRumbleEntrants = await getRumbleEntrantCount(redis, dayNumber);

    return c.json<ArenaState>({
      dayNumber,
      loggedIn: Boolean(player),
      forecast,
      champion: await getCurrentChampion(redis),
      myScribbits,
      drawnToday,
      enteredToday,
      rumbleEntrants: getProjectedRumbleEntrantCount(storedRumbleEntrants),
      communityLegendCount: await getCommunityLegendCount(redis),
    });
  } catch (error) {
    console.error('Arena route failed:', error);
    return serverError(c, 'The arena doors are jammed. Try again soon.');
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
      'Send a 2-24 character name and PNG data URL.'
    );
  }

  const decodedPng = decodePngDataUrl(draft.imageDataUrl);

  if (!decodedPng) {
    return badRequest(c, 'Drawings must be 512x512 PNG data URLs under 400 KB.');
  }

  const drawingAnalysis = analyzeDrawing({
    data: decodedPng.rgba,
    width: decodedPng.width,
    height: decodedPng.height,
  });
  let createdScribbit: { id: string; day: number } | null = null;

  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    await expireDueScribbits(redis, dayNumber);
    const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);

    if (dailyFlags.drawnToday) {
      return conflict(c, 'You already drew a Scribbit today.');
    }

    if (dailyFlags.enteredToday) {
      return conflict(c, 'You already entered today\'s Rumble.');
    }

    if (!(await enforceAliveScribbitLimit(redis, player.userId))) {
      return conflict(c, 'You already have three living Scribbits.');
    }

    const scribbitId = createScribbitId(dayNumber);
    createdScribbit = { id: scribbitId, day: dayNumber };
    const imageUrl = await uploadOrStoreDrawing(
      scribbitId,
      draft.imageDataUrl,
      decodedPng
    );

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

    const claimedDailyEntry = await claimDailyFlags(
      redis,
      player.userId,
      dayNumber,
      ['drawn', 'entered']
    );

    if (!claimedDailyEntry) {
      await deleteStoredScribbit(
        redis,
        player.userId,
        scribbit.id,
        dayNumber
      );
      return conflict(c, 'You already drew or entered today.');
    }

    return c.json<Scribbit>(scribbit, 201);
  } catch (error) {
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
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);

    if (dailyFlags.enteredToday) {
      return conflict(c, 'You already entered today\'s Rumble.');
    }

    const scribbit = await loadOwnedAliveScribbit(player, scribbitId, dayNumber);

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
      return conflict(c, 'You already entered today\'s Rumble.');
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

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await ensureCurrentArenaDay(redis, now);
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

    if (
      !(await isScribbitOwnedByUser(redis, player.userId, scribbit.id))
    ) {
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

    const caredScribbit = await awardScribbitXp(
      redis,
      scribbit.id,
      careClaim.xpGain,
      utcDateKey
    );

    if (!caredScribbit) {
      return notFound(c, 'That Scribbit slipped out of the arena.');
    }

    await recordDailyPlay(redis, player.userId, now);
    return c.json<Scribbit>(caredScribbit);
  } catch (error) {
    console.error('Care route failed:', error);
    return serverError(c, 'The snack bowl tipped over. Try again soon.');
  }
});

api.post('/spar', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to spar with a Scribbit.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit to spar.');
  }

  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const challenger = await loadOwnedAliveScribbit(
      player,
      scribbitId,
      dayNumber
    );

    if (!challenger) {
      return notFound(c, 'That living Scribbit is not ready to spar.');
    }

    const sparSeed = hashTextToSeed(
      `spar:${utcDateKey}:${player.userId}:${challenger.id}:${Date.now()}:${randomUUID()}`
    );
    const opponent = chooseFoundingSparOpponent(challenger, sparSeed);
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const report = simulate(
      challenger,
      opponent,
      sparSeed,
      forecast,
      'exhibition'
    );

    await saveBattleReport(redis, report, Date.now());

    if (report.winner === 'a') {
      const shouldAwardSparXp = await claimDailySparWinXp(
        redis,
        challenger.id,
        utcDateKey,
        Date.now()
      );

      if (shouldAwardSparXp) {
        await awardScribbitXp(redis, challenger.id, 1, utcDateKey);
      }
    }

    await recordDailyPlay(redis, player.userId, now);
    return c.json<BattleReport>(report);
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
    return c.json<BattleReport[]>(
      await loadBattleReportsForUser(redis, player.userId, 20)
    );
  } catch (error) {
    console.error('My battles route failed:', error);
    return serverError(c, 'The replay pile fell over. Try again soon.');
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
    const dayNumber = await ensureCurrentArenaDay(redis, new Date());
    const scribbit = await loadScribbit(redis, scribbitId);

    if (
      !scribbit ||
      scribbit.status !== 'alive' ||
      scribbit.isFounding ||
      scribbit.expiresDay <= dayNumber
    ) {
      return notFound(c, 'That Scribbit cannot collect belief right now.');
    }

    const beliefKey = `belief:${scribbit.id}`;
    const createdBelief = await redis.hSetNX(
      beliefKey,
      `${player.userId}:${dayNumber}`,
      Date.now().toString()
    );
    await redis.expire(beliefKey, beliefVotersTtlSeconds);

    if (createdBelief !== 1) {
      return conflict(c, 'You already believed in that Scribbit today.');
    }

    const believedScribbit = await increaseBelief(redis, scribbit);
    return c.json<{ belief: number }>({ belief: believedScribbit.belief });
  } catch (error) {
    console.error('Believe route failed:', error);
    return serverError(c, 'The belief spark fizzled. Try again soon.');
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

  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const challenger = await loadOwnedAliveScribbit(player, scribbitId, dayNumber);
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
      return conflict(c, 'You already challenged today\'s Champion.');
    }

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
    await recordDailyPlay(redis, player.userId, now);

    return c.json<BattleReport>(report);
  } catch (error) {
    console.error('Boss challenge route failed:', error);
    return serverError(c, 'The Champion ducked behind paperwork. Try again soon.');
  }
});

api.get('/legends', async (c) => {
  try {
    const player = await getCurrentPlayer();
    const myFaded = player
      ? await getFadedScribbitsForUser(redis, player.userId, 30)
      : [];
    const legendsState: LegendsState = {
      legends: await getLegends(redis, 50),
      myFaded,
    };

    return c.json<LegendsState>(legendsState);
  } catch (error) {
    console.error('Legends route failed:', error);
    return serverError(c, 'The Hall of Legends is dusty right now.');
  }
});

api.get('/drawing/:id', async (c) => {
  const scribbitId = c.req.param('id');

  try {
    const drawing = await readDrawingFallback(redis, scribbitId);

    if (!drawing) {
      return notFound(c, 'That drawing is not stored here.');
    }

    return c.body(drawing, 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000, immutable',
    });
  } catch (error) {
    console.error('Drawing route failed:', error);
    return serverError(c, 'The drawing smudged in storage.');
  }
});
