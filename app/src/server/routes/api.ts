import { Hono } from 'hono';
import type { Context as HonoContext, Handler, MiddlewareHandler } from 'hono';
import { context, media, redis, reddit } from '@devvit/web/server';
import { createHash, randomUUID } from 'node:crypto';
import type {
  ArenaErrorResponse,
  ArenaState,
  BattleReport,
  CareAction,
  CareResponse,
  CapsulePullResponse,
  CloutBoard,
  DirectBattleResponse,
  EquipTitleRequest,
  Forecast,
  FreeDrawing,
  Inventory,
  LegacyCardsState,
  LegendsState,
  MarkLegacySeenRequest,
  MergeGearResponse,
  PracticeBattleReport,
  RivalRunChoice,
  RivalRunState,
  ScoutNotebookState,
  SeasonBoard,
  SeasonPublicState,
  Scribbit,
  SparBattleResponse,
  SparRequest,
  SparRivalSlate,
  SplashState,
} from '../../shared/arena';
import {
  createSparRewardReceipt,
  type SparRewardReceipt,
} from '../../shared/sparreward';
import {
  CAPSULE_FIRST_DAILY_COST,
  INK_REWARDS,
  RIVAL_RUN_LENGTH,
  XP_REWARDS,
} from '../../shared/arena';
import { isScoutNotebookReplayDay } from '../../shared/scoutnotebook';
import { selectCommunityDoodleDare } from '../../shared/content/communitydrawthemes';
import {
  isLegacyCardCursor,
  parseLegacyCardsPageSize,
} from '../../shared/legacycards';
import {
  isEquipmentCategory,
  type EquipGearRequest,
} from '../../shared/equipment';
import { simulate } from '../core/battle';
import {
  loadBattleReport,
  loadBattleReportsForUser,
  loadFeaturedRumbleReport,
  saveBattleReport,
} from '../core/battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
} from '../core/arenaStore';
import {
  claimDailyBack,
  getBackedScribbitId,
  getUserClout,
  loadCloutBoard,
} from '../core/clout';
import { hashTextToSeed } from '../core/random';
import { recordDailyPlay } from '../core/streak';
import {
  loadLegacyCardPage,
  loadLegacyReturnReceipt,
  markLegacyCardsSeen,
} from '../core/legacy';
import {
  checkSubmissionConsumablesForSubmit,
  claimCapsuleOperation,
  createCapsuleProgress,
  getCapsuleOperationKey,
  getNextCapsuleCost,
  getInkBalance,
  loadCapsuleProgress,
  loadInventory,
  mergeGearForUser,
  pullCapsuleForUser,
  releaseCapsuleOperation,
  setEquippedTitle,
} from '../core/inkStore';
import {
  commitDailyCareAction,
  commitDailyChampionOutcome,
} from '../core/dailyActions';
import { commitScribbitSubmission } from '../core/submission';
import {
  getFreeDrawingOwner,
  hasFreeDrawingForDay,
  loadFreeDrawing,
  loadFreeDrawingForDay,
  saveFreeDrawing,
} from '../core/freeDrawingStore';
import {
  formatUtcDateKey,
  getArenaDayNumber,
  getNextUtcDayStartMs,
} from '../core/day';
import {
  getProjectedRumbleEntrantCount,
  prepareRumbleEntrants,
} from '../core/rumble';
import {
  acquirePracticeRequest,
  createPracticeBattle,
  releasePracticeRequest,
  type PracticeRequestLease,
} from '../core/practice';
import {
  loadOwnedRumbleReturnReceipt,
  loadRumbleReturnReceipt,
} from '../core/rumbleReturn';
import { loadScoutNotebook } from '../core/scoutNotebook';
import { selectSplashCreations } from '../core/splashShowcase';
import {
  completeFounderChronicleBattle,
  loadFounderChronicle,
  loadStoredFounderChronicle,
  projectFounderChronicle,
  projectFounderChronicleBattle,
  queueFounderChronicleBattle,
  recoverProjectedFounderChronicleBeat,
  repairPendingFounderChronicleBattles,
} from '../core/founderChronicle';
import {
  chooseFoundingSparOpponent,
  findFoundingScribbit,
  selectFoundingSparRivalSlate,
} from '../core/species';
import {
  advanceRivalRun,
  createRivalRunChoices,
  getOrCreateRivalRun,
  loadRivalRun,
} from '../core/rivalRun';
import {
  getHiddenScribbitIds,
  isScribbitHidden,
  reportAndHideScribbit,
  SCRIBBIT_REPORT_REMOVAL_THRESHOLD,
} from '../core/moderation';
import {
  removeReportedScribbitIfEligible,
  removeScribbitCompletely,
} from '../core/removal';
import { deletePlayerData } from '../core/privacy';
import {
  ensureInitialSeason,
  loadSeasonBoard,
  loadSeasonPublicState,
} from '../core/season';
import { runWithPlayerMutationLease } from '../core/dataDeletion';
import {
  claimAndAwardDailySparWin,
  applyDailyBelief,
  createScribbit,
  equipGearForScribbit,
  enforceAliveScribbitLimit,
  getAliveScribbitsForUser,
  getUserScribbitIds,
  getCommunityLegendCount,
  getDailyFlags,
  getLegendIds,
  getRumbleEntrantIds,
  getRumbleEntrantCount,
  getScribbitOwner,
  isCareAction,
  isScribbitOwnedByUser,
  loadScribbit,
  loadScribbits,
  refreshEquippedGearRankForUser,
  validateAndAnalyzeScribbitSubmission,
  type CurrentPlayer,
} from '../core/scribbit';

type ErrorResponse = ArenaErrorResponse;

export const api = new Hono();

const capsuleOperationPendingTimeoutMs = 15_000;
const foundingSparRivalSlateLimit = 3;
const scribbitIdPattern = /^[A-Za-z0-9:_-]{4,90}$/;
const freeDrawingSubmissionIdPattern = /^[A-Za-z0-9_-]{16,80}$/;
const practiceRequestMaximumBodyBytes = 560 * 1024;

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

const badRequest = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'bad_request', message },
    400
  );
};

const unauthorized = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'unauthorized', message },
    401
  );
};

const notFound = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'not_found', message },
    404
  );
};

const conflict = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'conflict', message },
    409
  );
};

const tooManyRequests = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'too_many_requests', message },
    429
  );
};

const payloadTooLarge = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'payload_too_large', message },
    413
  );
};

const paymentRequired = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'payment_required', message },
    402
  );
};

const serverError = (c: HonoContext, message: string) => {
  return c.json<ErrorResponse>(
    { status: 'error', code: 'server_error', message },
    500
  );
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

const withPlayerMutationLease: MiddlewareHandler = async (c, next) => {
  const player = await getCurrentPlayer();
  if (!player) return next();
  const mutation = await runWithPlayerMutationLease(
    redis,
    player.userId,
    randomUUID(),
    next
  );
  if (mutation.status === 'busy') {
    return conflict(c, 'Another game action is finishing. Try again.');
  }
  if (mutation.status === 'lost') {
    return serverError(c, 'Your game action lost its safety lock. Try again.');
  }
};

// Every non-GET game action mutates or may repair player state. The deletion
// endpoint owns the inverse side of this lease and therefore must not acquire
// it here.
api.use('*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.path.endsWith('/delete-my-data')) {
    return next();
  }
  return withPlayerMutationLease(c, next);
});

// A small number of compatibility GETs intentionally repair/migrate player
// records. Register the lease beside the handler so adding or reviewing one
// never depends on a separate route-name allowlist elsewhere in this file.
const registerPlayerMutatingGet = (path: string, handler: Handler): void => {
  api.get(path, withPlayerMutationLease, handler);
};

const readScribbitIdentifier = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const scribbitId = value.trim();
  return scribbitIdPattern.test(scribbitId) ? scribbitId : undefined;
};

const readScribbitId = (value: unknown): string | undefined => {
  return isRecord(value) ? readScribbitIdentifier(value.scribbitId) : undefined;
};

const readEquipGearRequest = (value: unknown): EquipGearRequest | undefined => {
  if (!isRecord(value)) return undefined;
  const fields = Object.keys(value);
  if (
    fields.length !== 4 ||
    !fields.includes('scribbitId') ||
    !fields.includes('category') ||
    !fields.includes('slotIndex') ||
    !fields.includes('gearId')
  ) {
    return undefined;
  }

  const scribbitId = readScribbitIdentifier(value.scribbitId);
  if (
    !scribbitId ||
    !isEquipmentCategory(value.category) ||
    (value.slotIndex !== 0 && value.slotIndex !== 1) ||
    (value.gearId !== null && typeof value.gearId !== 'string')
  ) {
    return undefined;
  }

  const gearId =
    typeof value.gearId === 'string' ? value.gearId.trim() : value.gearId;
  if (gearId !== null && !/^[a-z0-9-]{2,64}$/.test(gearId)) {
    return undefined;
  }

  return {
    scribbitId,
    category: value.category,
    slotIndex: value.slotIndex,
    gearId,
  };
};

const readSparRequest = (value: unknown): SparRequest | undefined => {
  if (!isRecord(value)) return undefined;

  const requestFields = Object.keys(value);
  if (
    !requestFields.includes('scribbitId') ||
    requestFields.some((field) => {
      return (
        field !== 'scribbitId' && field !== 'opponentId' && field !== 'rivalRun'
      );
    })
  ) {
    return undefined;
  }

  const scribbitId = readScribbitIdentifier(value.scribbitId);
  if (!scribbitId) return undefined;
  if (!requestFields.includes('opponentId')) {
    return requestFields.includes('rivalRun') ? undefined : { scribbitId };
  }

  const opponentId = readScribbitIdentifier(value.opponentId);
  if (!opponentId) return undefined;
  if (!requestFields.includes('rivalRun')) return { scribbitId, opponentId };
  if (!isRecord(value.rivalRun)) return undefined;
  const rivalRunFields = Object.keys(value.rivalRun);
  if (
    rivalRunFields.length !== 2 ||
    !rivalRunFields.includes('id') ||
    !rivalRunFields.includes('expectedBoutsCompleted') ||
    typeof value.rivalRun.id !== 'string' ||
    value.rivalRun.id.length < 1 ||
    value.rivalRun.id.length > 128 ||
    !Number.isSafeInteger(value.rivalRun.expectedBoutsCompleted) ||
    Number(value.rivalRun.expectedBoutsCompleted) < 0 ||
    Number(value.rivalRun.expectedBoutsCompleted) >= RIVAL_RUN_LENGTH
  ) {
    return undefined;
  }
  return {
    scribbitId,
    opponentId,
    rivalRun: {
      id: value.rivalRun.id,
      expectedBoutsCompleted: Number(value.rivalRun.expectedBoutsCompleted),
    },
  };
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

const createFreeDrawingId = (userId: string, submissionId: string): string => {
  const digest = createHash('sha256')
    .update(`${userId}:${submissionId}`)
    .digest('hex')
    .slice(0, 24);
  return `free-${digest}`;
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

const selectSparRivalSlateOpponents = (
  player: CurrentPlayer,
  challenger: Scribbit,
  utcDateKey: string,
  founderChronicle: ArenaState['founderChronicle'],
  rivalRun?: Readonly<{
    id: string;
    boutsCompleted: number;
    opponentIds: readonly string[];
  }>
): Scribbit[] => {
  const runSeed = rivalRun
    ? `:${rivalRun.id}:${rivalRun.boutsCompleted + 1}`
    : '';
  const slateSeed = hashTextToSeed(
    `spar-rivals:${utcDateKey}:${player.userId}:${challenger.id}${runSeed}`
  );
  return selectFoundingSparRivalSlate(
    challenger,
    slateSeed,
    foundingSparRivalSlateLimit,
    rivalRun
      ? { excludedFounderIds: rivalRun.opponentIds }
      : {
          preferredFounderId: founderChronicle.activeRivalry?.founderId,
          excludedFounderIds: founderChronicle.resolvedRivalries.map(
            (rivalry) => rivalry.founderId
          ),
        }
  );
};

const createSparRivalSlate = (
  player: CurrentPlayer,
  challenger: Scribbit,
  utcDateKey: string,
  founderChronicle: ArenaState['founderChronicle'],
  dayNumber: number,
  forecast: Forecast,
  rivalRun: RivalRunState
): SparRivalSlate => {
  return {
    challenger,
    choices: createRivalRunChoices(
      challenger,
      selectSparRivalSlateOpponents(
        player,
        challenger,
        utcDateKey,
        founderChronicle,
        rivalRun
      ),
      forecast
    ),
    founderChronicle,
    dayNumber,
    forecast,
    rivalRun,
  };
};

const loadPlayerFounderChronicle = async (
  userId: string
): Promise<ArenaState['founderChronicle']> => {
  await repairPendingFounderChronicleBattles(
    redis,
    userId,
    Date.now(),
    (battleReportId) => loadBattleReport(redis, battleReportId)
  );
  return loadFounderChronicle(redis, userId);
};

const finishDirectBattleResponse = async (
  userId: string,
  report: BattleReport,
  ownedScribbitId: string,
  fallbackFounderChronicle: ArenaState['founderChronicle']
): Promise<DirectBattleResponse> => {
  const projectedBattle = projectFounderChronicleBattle(
    fallbackFounderChronicle,
    report,
    ownedScribbitId
  );
  let completedBeat: DirectBattleResponse['founderChronicleBeat'] = null;
  let completionFailed = false;
  try {
    const beats = await completeFounderChronicleBattle(
      redis,
      userId,
      report,
      ownedScribbitId
    );
    completedBeat = beats.at(-1) ?? null;
  } catch (error) {
    completionFailed = true;
    console.error('Founder Chronicle completion failed; repairing:', error);
    try {
      await repairPendingFounderChronicleBattles(
        redis,
        userId,
        Date.now(),
        (battleReportId) => loadBattleReport(redis, battleReportId)
      );
    } catch (repairError) {
      // The pending receipt remains durable for the next Arena or Rival read.
      console.error('Founder Chronicle repair deferred:', repairError);
    }
  }

  let founderChronicle = fallbackFounderChronicle;
  let founderChronicleBeat: DirectBattleResponse['founderChronicleBeat'] = null;
  try {
    // Do not run pending repair a second time here. The battle and its rewards
    // are already committed; a cosmetic Chronicle read must never turn that
    // successful action into a 500 response.
    const storedFounderChronicle = await loadStoredFounderChronicle(
      redis,
      userId
    );
    founderChronicle = projectFounderChronicle(storedFounderChronicle);
    founderChronicleBeat =
      completedBeat ??
      (completionFailed
        ? recoverProjectedFounderChronicleBeat(
            projectedBattle,
            storedFounderChronicle
          )
        : null);
  } catch (loadError) {
    console.error('Founder Chronicle read deferred:', loadError);
  }
  return {
    report,
    founderChronicle,
    founderChronicleBeat,
  };
};

const finalizeSparBattle = async (
  input: Readonly<{
    userId: string;
    challengerId: string;
    report: BattleReport;
    utcDateKey: string;
    completedAt: Date;
    fallbackFounderChronicle: ArenaState['founderChronicle'];
    tracksFounderChronicle: boolean;
  }>
): Promise<SparBattleResponse> => {
  const completedAtMilliseconds = input.completedAt.getTime();
  await saveBattleReport(redis, input.report, completedAtMilliseconds);
  if (input.tracksFounderChronicle) {
    await queueFounderChronicleBattle(
      redis,
      input.userId,
      input.report,
      input.challengerId,
      completedAtMilliseconds
    );
  }

  let inkAwarded = input.report.inkAwarded ?? 0;
  let rewardReceipt: SparRewardReceipt | null = createSparRewardReceipt({
    reportId: input.report.id,
    scribbitId: input.challengerId,
    xpBefore: input.report.a.xp,
    xpAfter: input.report.a.xp,
    inkAwarded: 0,
  });
  if (input.report.winner === 'a') {
    const rewardResult = await claimAndAwardDailySparWin(redis, {
      userId: input.userId,
      scribbitId: input.challengerId,
      utcDateKey: input.utcDateKey,
      reportId: input.report.id,
      inkAmount: INK_REWARDS.sparWin,
    });
    if (rewardResult.receipt) {
      inkAwarded = rewardResult.receipt.inkAwarded;
      rewardReceipt = rewardResult.receipt;
    } else if (rewardResult.status === 'already-awarded-this-report') {
      // A legacy report marker proves only that this report claimed the day.
      // Preserve any archived report payout, but never invent a modern receipt
      // or a fixed Ink amount without exact stored reward state.
      rewardReceipt = null;
    }
  }

  const rewardedReport: BattleReport = {
    ...input.report,
    ...(inkAwarded > 0 ? { inkAwarded } : {}),
  };
  await saveBattleReport(redis, rewardedReport, completedAtMilliseconds);
  await recordDailyPlay(redis, input.userId, input.completedAt);
  const directBattleResponse = input.tracksFounderChronicle
    ? await finishDirectBattleResponse(
        input.userId,
        rewardedReport,
        input.challengerId,
        input.fallbackFounderChronicle
      )
    : {
        report: rewardedReport,
        founderChronicle: input.fallbackFounderChronicle,
        founderChronicleBeat: null,
      };
  return { ...directBattleResponse, rewardReceipt };
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
): Promise<boolean> => {
  try {
    await sideEffect();
    return true;
  } catch (error) {
    console.error(`${label} failed:`, error);
    return false;
  }
};

registerPlayerMutatingGet('/arena', async (c) => {
  try {
    const now = new Date();
    const utcDateKey = formatUtcDateKey(now);
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    await ensureInitialSeason(redis, dayNumber, now.getTime());
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const player = await getCurrentPlayer();
    let myScribbits: Scribbit[] = [];
    let hasCreatedScribbit = false;
    let drawnToday = false;
    let todayFreeDrawing: FreeDrawing | null = null;
    let enteredToday = false;
    let bossChallengedToday = false;
    let myBackedScribbitId: string | null = null;
    let playStreakDays = 0;
    let myClout = 0;
    let myInk = 0;
    let myPens: string[] = [];
    let myDrawingSupplies: Record<string, number> = {};
    let nextCapsuleCost = CAPSULE_FIRST_DAILY_COST;
    let capsuleProgress = createCapsuleProgress(0, 0, 0);
    let founderChronicle: ArenaState['founderChronicle'] = {
      activeRivalry: null,
      resolvedRivalries: [],
      lastAdvancedDay: null,
    };
    let legacyReturnReceipt: ArenaState['legacyReturnReceipt'] = null;

    if (player) {
      playStreakDays = (await recordDailyPlay(redis, player.userId, now)).days;
      const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);
      const inventory = await loadInventory(redis, player.userId);
      myScribbits = await getAliveScribbitsForUser(redis, player.userId);
      hasCreatedScribbit =
        (await getUserScribbitIds(redis, player.userId, 1)).length > 0;
      const [freeDrawingLocked, loadedFreeDrawing] = await Promise.all([
        hasFreeDrawingForDay(redis, player.userId, dayNumber),
        loadFreeDrawingForDay(redis, player.userId, dayNumber),
      ]);
      todayFreeDrawing = loadedFreeDrawing ?? null;
      drawnToday =
        dailyFlags.drawnToday || freeDrawingLocked || todayFreeDrawing !== null;
      enteredToday = dailyFlags.enteredToday;
      bossChallengedToday = dailyFlags.bossChallengedToday;
      myBackedScribbitId = await getBackedScribbitId(
        redis,
        dayNumber,
        player.userId
      );
      myClout = await getUserClout(redis, player.userId);
      myInk = await getInkBalance(redis, player.userId);
      myPens = inventory.pens;
      myDrawingSupplies = { ...inventory.items };
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
      founderChronicle = await loadPlayerFounderChronicle(player.userId);
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
    const season = await loadSeasonPublicState(
      redis,
      dayNumber,
      player?.userId
    );
    let lastRumbleReceipt: ArenaState['lastRumbleReceipt'] = null;
    if (player && dayNumber > 1) {
      const resolvedDay = dayNumber - 1;
      lastRumbleReceipt = await loadRumbleReturnReceipt(redis, {
        userId: player.userId,
        resolvedDay,
        utcDateKey,
        champion: currentChampion,
        hiddenScribbitIds,
      });
    }

    return c.json<ArenaState>({
      dayNumber,
      loggedIn: Boolean(player),
      hasCreatedScribbit,
      myUsername: player?.username ?? null,
      forecast,
      champion:
        currentChampion && !hiddenScribbitIds.has(currentChampion.id)
          ? currentChampion
          : null,
      myScribbits,
      drawnToday,
      todayFreeDrawing,
      enteredToday,
      bossChallengedToday,
      rumbleEntrants: rumbleEntrantCount,
      communityLegendCount: await getCommunityLegendCount(redis),
      rumbleResolvesAt: getNextUtcDayStartMs(now),
      season,
      todayEntrants,
      myBackedScribbitId,
      playStreakDays,
      myClout,
      myInk,
      myPens,
      myDrawingSupplies,
      nextCapsuleCost,
      capsuleProgress,
      founderChronicle,
      lastRumbleReceipt,
      legacyReturnReceipt,
    });
  } catch (error) {
    console.error('Arena route failed:', error);
    return serverError(c, 'The arena doors are jammed. Try again soon.');
  }
});

api.get('/season', async (c) => {
  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    await ensureInitialSeason(redis, dayNumber, now.getTime());
    const player = await getCurrentPlayer();
    return c.json<SeasonPublicState>(
      await loadSeasonPublicState(redis, dayNumber, player?.userId)
    );
  } catch (error) {
    console.error('Season route failed:', error);
    return serverError(c, 'The season board is unavailable. Try again soon.');
  }
});

api.get('/season-board', async (c) => {
  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    await ensureInitialSeason(redis, dayNumber, now.getTime());
    const player = await getCurrentPlayer();
    const board = await loadSeasonBoard(redis, dayNumber, player);
    if (!board) return notFound(c, 'No Scribbits season is available.');
    return c.json<SeasonBoard>(board);
  } catch (error) {
    console.error('Season board route failed:', error);
    return serverError(c, 'The season board is unavailable. Try again soon.');
  }
});

api.get('/splash', async (c) => {
  try {
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const player = await getCurrentPlayer();
    const [recentCreationIds, hiddenScribbitIds, createdScribbitIds] =
      await Promise.all([
        getRumbleEntrantIds(redis, dayNumber, { limit: 12, reverse: true }),
        player
          ? getHiddenScribbitIds(redis, player.userId)
          : Promise.resolve(new Set<string>()),
        player
          ? getUserScribbitIds(redis, player.userId, 1)
          : Promise.resolve([]),
      ]);
    const recentCreations = await loadScribbits(
      redis,
      recentCreationIds,
      formatUtcDateKey(now)
    );

    return c.json<SplashState>({
      loggedIn: Boolean(player),
      hasCreatedScribbit: createdScribbitIds.length > 0,
      featuredCreations: selectSplashCreations({
        recentCreations,
        hiddenScribbitIds,
      }),
    });
  } catch (error) {
    console.error('Splash route failed:', error);
    return serverError(c, 'The arena preview is still being sketched.');
  }
});

api.get('/scout-notebook', async (c) => {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return unauthorized(c, 'Sign in to open your Scout Notebook.');
    }
    const now = new Date();
    const currentDay = await getWritableArenaDay(now);
    if (!currentDay) return arenaRolloverConflict(c);
    const notebook = await loadScoutNotebook(redis, {
      currentDay,
      userId: player.userId,
      utcDateKey: formatUtcDateKey(now),
    });
    return c.json<ScoutNotebookState>(notebook);
  } catch (error) {
    console.error('Scout Notebook route failed:', error);
    return serverError(
      c,
      'The Scout Notebook pages are stuck together. Try again soon.'
    );
  }
});

api.post('/free-drawing', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) {
    return unauthorized(c, 'Sign in to save a Free Draw.');
  }

  const rawSubmission = await readJsonBody(c);
  const submissionId =
    isRecord(rawSubmission) &&
    typeof rawSubmission.submissionId === 'string' &&
    freeDrawingSubmissionIdPattern.test(rawSubmission.submissionId)
      ? rawSubmission.submissionId
      : undefined;
  const submission = validateAndAnalyzeScribbitSubmission(rawSubmission);
  if (!submissionId || submission.status === 'invalid') {
    if (
      submission.status === 'invalid' &&
      submission.reason === 'insufficient-ink'
    ) {
      return badRequest(
        c,
        'Your Free Draw needs a body. Add a few more lines before saving.'
      );
    }
    if (
      submission.status === 'invalid' &&
      submission.reason === 'rendered-mismatch'
    ) {
      return badRequest(
        c,
        'Rendered drawing must match the base PNG outside declared accessories and must not erase base pixels.'
      );
    }
    if (
      submission.status === 'invalid' &&
      submission.reason === 'invalid-png'
    ) {
      return badRequest(
        c,
        'Base and rendered drawings must be 512x512 PNG data URLs under 400 KB each.'
      );
    }
    return badRequest(
      c,
      'Send a submission ID, 2-24 character name, and valid drawing images.'
    );
  }

  try {
    const now = new Date();
    const dayNumber = await getWritableArenaDay(now);
    if (!dayNumber) return arenaRolloverConflict(c);
    const drawingId = createFreeDrawingId(player.userId, submissionId);
    const [existingDrawing, existingOwner] = await Promise.all([
      loadFreeDrawing(redis, drawingId),
      getFreeDrawingOwner(redis, drawingId),
    ]);
    if (existingDrawing && existingOwner === player.userId) {
      return c.json<FreeDrawing>(existingDrawing);
    }
    if (existingDrawing || existingOwner) {
      return conflict(c, 'That Free Draw submission ID is already in use.');
    }

    const dailyFlags = await getDailyFlags(redis, player.userId, dayNumber);
    if (dailyFlags.drawnToday || dailyFlags.enteredToday) {
      return conflict(c, 'You already chose today’s Community Theme.');
    }
    if (await hasFreeDrawingForDay(redis, player.userId, dayNumber)) {
      return conflict(c, 'You already saved today’s Free Draw.');
    }

    const imageUrl = await uploadDrawing(submission.draft.imageDataUrl);
    const drawing: FreeDrawing = {
      id: drawingId,
      name: submission.draft.name,
      artist: player.username,
      imageUrl,
      createdDay: dayNumber,
      createdAtMilliseconds: now.getTime(),
    };
    const saved = await saveFreeDrawing(redis, player.userId, drawing);
    if (saved.status === 'already-drawn') {
      return conflict(c, 'You already saved today’s Free Draw.');
    }
    if (saved.status === 'id-collision') {
      return conflict(c, 'That Free Draw submission ID is already in use.');
    }
    return c.json<FreeDrawing>(
      saved.drawing,
      saved.status === 'saved' ? 201 : 200
    );
  } catch (error) {
    console.error('Submit Free Draw route failed:', error);
    return serverError(c, 'The Free Draw would not save. Try again soon.');
  }
});

api.post('/scribbit', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to draw a Scribbit.');
  }

  const submission = validateAndAnalyzeScribbitSubmission(
    await readJsonBody(c)
  );

  if (
    submission.status === 'invalid' &&
    submission.reason === 'invalid-request'
  ) {
    return badRequest(
      c,
      'Send a 2-24 character name, base and rendered PNG data URLs, and valid accessories.'
    );
  }
  if (submission.status === 'invalid' && submission.reason === 'invalid-png') {
    return badRequest(
      c,
      'Base and rendered drawings must be 512x512 PNG data URLs under 400 KB each.'
    );
  }
  if (
    submission.status === 'invalid' &&
    submission.reason === 'rendered-mismatch'
  ) {
    return badRequest(
      c,
      'Rendered drawing must match the base PNG outside declared accessories and must not erase base pixels.'
    );
  }
  if (
    submission.status === 'invalid' &&
    submission.reason === 'insufficient-ink'
  ) {
    return badRequest(
      c,
      'Your Scribbit needs a body. Add a few more lines before submitting.'
    );
  }
  if (submission.status !== 'valid') {
    return badRequest(c, 'The Scribbit submission could not be validated.');
  }
  const draft = submission.draft;

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

    if (await hasFreeDrawingForDay(redis, player.userId, dayNumber)) {
      return conflict(c, 'You already chose today’s Free Draw.');
    }

    if (!(await enforceAliveScribbitLimit(redis, player.userId))) {
      return conflict(c, 'You already have three living Scribbits.');
    }

    const accessoryIds = draft.accessories.map((accessory) => {
      return accessory.id;
    });
    const consumableAvailability = await checkSubmissionConsumablesForSubmit(
      redis,
      player.userId,
      accessoryIds,
      draft.drawingSupplies
    );

    if (consumableAvailability.status === 'invalid') {
      return badRequest(
        c,
        'Choose valid accessories, paints, and brushes from Mystery Ink.'
      );
    }

    if (consumableAvailability.status === 'insufficient') {
      return conflict(c, 'That drawing supply has already run out.');
    }

    const scribbitId = createScribbitId(dayNumber);
    const imageUrl = await uploadDrawing(draft.imageDataUrl);

    const scribbit = createScribbit({
      id: scribbitId,
      draft,
      artist: player.username,
      imageUrl,
      day: dayNumber,
      drawingThemeId: selectCommunityDoodleDare(dayNumber).id,
    });

    const commitResult = await commitScribbitSubmission(redis, {
      userId: player.userId,
      scribbit,
      currentDate: now,
      accessoryIds,
      drawingSupplies: draft.drawingSupplies,
      rumbleScore: now.getTime(),
      inkAward: INK_REWARDS.dailyDraw,
    });

    if (commitResult.status === 'rollover') {
      return arenaRolloverConflict(c);
    }
    if (commitResult.status === 'already-drawn') {
      return conflict(c, 'You already drew a Scribbit today.');
    }
    if (commitResult.status === 'already-entered') {
      return conflict(c, "You already entered today's Rumble.");
    }
    if (commitResult.status === 'alive-limit') {
      return conflict(c, 'You already have three living Scribbits.');
    }
    if (commitResult.status === 'invalid-accessory') {
      return badRequest(
        c,
        'Choose valid accessories from the capsule catalog.'
      );
    }
    if (commitResult.status === 'insufficient-accessory') {
      return conflict(
        c,
        'One accessory copy was already used. Refresh and try again.'
      );
    }
    if (commitResult.status === 'invalid-supply') {
      return badRequest(c, 'Choose valid paint and brush charges.');
    }
    if (commitResult.status === 'insufficient-supply') {
      return conflict(c, 'That paint or brush charge was already used.');
    }
    if (commitResult.status === 'id-collision') {
      return conflict(c, 'That Scribbit ID was already used. Try again.');
    }

    const committedScribbit = await loadScribbit(redis, scribbit.id);
    if (!committedScribbit) {
      throw new Error('Committed Scribbit could not be loaded.');
    }
    return c.json<Scribbit>(committedScribbit, 201);
  } catch (error) {
    console.error('Submit Scribbit route failed:', error);
    return serverError(c, 'The ink would not dry. Try again soon.');
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
      return notFound(c, 'That Scribbit is not in your active roster.');
    }

    const careCommit = await commitDailyCareAction(redis, {
      userId: player.userId,
      scribbitId: scribbit.id,
      action: careRequest.action,
      utcDateKey,
      operationId: randomUUID(),
      claimedAtMilliseconds: now.getTime(),
      inkAward: INK_REWARDS.care,
    });

    if (careCommit.status === 'already-claimed') {
      return conflict(c, 'You already used that care action today.');
    }
    if (careCommit.status === 'target-unavailable') {
      return notFound(c, 'That Scribbit slipped out of the arena.');
    }

    await runNonCriticalSideEffect('Daily play record', () =>
      recordDailyPlay(redis, player.userId, now)
    );
    return c.json<CareResponse>({
      scribbit: careCommit.scribbit,
      inkAwarded: careCommit.inkAwarded,
    });
  } catch (error) {
    console.error('Care route failed:', error);
    return serverError(c, 'The snack bowl tipped over. Try again soon.');
  }
});

registerPlayerMutatingGet('/spar-rivals', async (c) => {
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

    const founderChronicle = await loadPlayerFounderChronicle(player.userId);
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const rivalRun = await getOrCreateRivalRun(redis, {
      userId: player.userId,
      runId: `run-${dayNumber}-${randomUUID().replaceAll('-', '')}`,
      dayNumber,
      challengerId: challenger.id,
    });
    return c.json<SparRivalSlate>(
      createSparRivalSlate(
        player,
        challenger,
        utcDateKey,
        founderChronicle,
        dayNumber,
        forecast,
        rivalRun
      )
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
  let practiceLease: PracticeRequestLease | undefined;
  try {
    const requestClaim = await acquirePracticeRequest(redis, {
      playerId: player.userId,
      token: requestToken,
      requestedAtMs: now.getTime(),
    });
    if (requestClaim.status === 'rate-limited') {
      return tooManyRequests(
        c,
        'The Practice Lab needs a breather. Try again in a minute.'
      );
    }
    if (requestClaim.status === 'busy') {
      return tooManyRequests(
        c,
        'Your previous practice replay is still being drawn.'
      );
    }
    practiceLease = requestClaim.lease;

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
    if (practiceLease) {
      try {
        await releasePracticeRequest(redis, practiceLease);
      } catch (error) {
        console.warn('Practice request guard release failed:', error);
      }
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

    const randomSparSeed = hashTextToSeed(
      `spar:${utcDateKey}:${player.userId}:${challenger.id}:${Date.now()}:${randomUUID()}`
    );
    const founderChronicle = await loadPlayerFounderChronicle(player.userId);
    const forecast = await ensureForecastForDay(redis, dayNumber);
    const requestedRunOpponent =
      sparRequest.rivalRun && sparRequest.opponentId
        ? findFoundingScribbit(sparRequest.opponentId)
        : undefined;
    const precomputedRunReport =
      sparRequest.rivalRun && requestedRunOpponent
        ? simulate(
            challenger,
            requestedRunOpponent,
            hashTextToSeed(
              `rival-run:${sparRequest.rivalRun.id}:${sparRequest.rivalRun.expectedBoutsCompleted + 1}:${requestedRunOpponent.id}`
            ),
            forecast,
            'exhibition'
          )
        : null;
    if (sparRequest.rivalRun && precomputedRunReport) {
      const storedReport = await loadBattleReport(
        redis,
        precomputedRunReport.id
      );
      if (
        storedReport?.rivalRun?.id === sparRequest.rivalRun.id &&
        storedReport.rivalRun.boutNumber ===
          sparRequest.rivalRun.expectedBoutsCompleted + 1
      ) {
        return c.json<SparBattleResponse>(
          await finalizeSparBattle({
            userId: player.userId,
            challengerId: challenger.id,
            report: storedReport,
            utcDateKey,
            completedAt: now,
            fallbackFounderChronicle: founderChronicle,
            tracksFounderChronicle: true,
          })
        );
      }
    }
    const authoritativeRivalRun = sparRequest.rivalRun
      ? await loadRivalRun(redis, player.userId)
      : null;
    if (
      sparRequest.rivalRun &&
      (!authoritativeRivalRun ||
        authoritativeRivalRun.id !== sparRequest.rivalRun.id ||
        authoritativeRivalRun.dayNumber !== dayNumber ||
        authoritativeRivalRun.challengerId !== challenger.id ||
        authoritativeRivalRun.status !== 'active' ||
        authoritativeRivalRun.boutsCompleted !==
          sparRequest.rivalRun.expectedBoutsCompleted)
    ) {
      return conflict(c, 'That Rival Run moved on. Reopen the rival board.');
    }
    let opponent: Scribbit;
    let rivalRunChoice: RivalRunChoice | null = null;
    if (sparRequest.opponentId) {
      const currentSlate = createRivalRunChoices(
        challenger,
        selectSparRivalSlateOpponents(
          player,
          challenger,
          utcDateKey,
          founderChronicle,
          authoritativeRivalRun ?? undefined
        ),
        forecast
      );
      const chosenChoice = currentSlate.find((choice) => {
        return choice.rival.id === sparRequest.opponentId;
      });

      if (!chosenChoice) {
        return badRequest(c, 'Choose a rival from the current spar slate.');
      }
      opponent = chosenChoice.rival;
      rivalRunChoice = sparRequest.rivalRun ? chosenChoice : null;
    } else {
      opponent = chooseFoundingSparOpponent(challenger, randomSparSeed, {
        preferredFounderId: founderChronicle.activeRivalry?.founderId,
        excludedFounderIds: founderChronicle.resolvedRivalries.map(
          (rivalry) => rivalry.founderId
        ),
      });
    }

    const sparSeed = sparRequest.rivalRun
      ? hashTextToSeed(
          `rival-run:${sparRequest.rivalRun.id}:${sparRequest.rivalRun.expectedBoutsCompleted + 1}:${opponent.id}`
        )
      : randomSparSeed;

    const simulatedReport =
      precomputedRunReport ??
      simulate(challenger, opponent, sparSeed, forecast, 'exhibition');
    const rivalRunReceipt = sparRequest.rivalRun
      ? rivalRunChoice
        ? await advanceRivalRun(redis, {
            userId: player.userId,
            runId: sparRequest.rivalRun.id,
            dayNumber,
            challengerId: challenger.id,
            expectedBoutsCompleted: sparRequest.rivalRun.expectedBoutsCompleted,
            reportId: simulatedReport.id,
            report: simulatedReport,
            playerWon: simulatedReport.winner === 'a',
            opponentId: opponent.id,
            tier: rivalRunChoice.tier,
            winPoints: rivalRunChoice.winPoints,
          })
        : null
      : null;
    if (sparRequest.rivalRun && !rivalRunReceipt) {
      return conflict(c, 'That Rival Run moved on. Reopen the rival board.');
    }
    const report: BattleReport = {
      ...simulatedReport,
      ...(rivalRunReceipt ? { rivalRun: rivalRunReceipt } : {}),
    };
    return c.json<SparBattleResponse>(
      await finalizeSparBattle({
        userId: player.userId,
        challengerId: challenger.id,
        report,
        utcDateKey,
        completedAt: now,
        fallbackFounderChronicle: founderChronicle,
        tracksFounderChronicle: sparRequest.opponentId !== undefined,
      })
    );
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
    if (!isScoutNotebookReplayDay(currentDay, requestedDay)) {
      return notFound(c, 'That Rumble replay is outside your Scout Notebook.');
    }

    const backedScribbitId = await getBackedScribbitId(
      redis,
      requestedDay,
      player.userId
    );
    const replayScribbitId =
      backedScribbitId ??
      (
        await loadOwnedRumbleReturnReceipt(redis, {
          userId: player.userId,
          resolvedDay: requestedDay,
          utcDateKey: formatUtcDateKey(new Date()),
          champion: await getCurrentChampion(redis),
        })
      )?.entrant.id;
    if (!replayScribbitId) {
      return notFound(
        c,
        'Neither your Pick nor an owned Rumble entrant has a replay for that day.'
      );
    }

    const report = await loadFeaturedRumbleReport(
      redis,
      replayScribbitId,
      requestedDay
    );
    if (!report) {
      return notFound(c, 'That featured bout is no longer available.');
    }

    const [fighterAHidden, fighterBHidden] = await Promise.all([
      isScribbitHidden(redis, player.userId, report.a.id),
      isScribbitHidden(redis, player.userId, report.b.id),
    ]);
    if (fighterAHidden || fighterBHidden) {
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
    const result = await applyDailyBelief(redis, {
      scribbitId,
      userId: player.userId,
      utcDateKey,
      currentArenaDay: dayNumber,
      operationId: randomUUID(),
      operationStartedAtMs: now.getTime(),
    });

    if (result.status === 'target-unavailable') {
      return notFound(c, 'That Scribbit cannot collect belief right now.');
    }
    if (result.status === 'self-belief') {
      return badRequest(c, "believe in someone else's doodle");
    }
    if (result.status === 'already-believed') {
      return conflict(c, 'You already believed in that Scribbit today.');
    }
    if (result.status === 'user-data-changing') {
      return conflict(c, 'Your game data is changing. Try again.');
    }
    return c.json<{ belief: number }>({ belief: result.belief });
  } catch (error) {
    console.error('Believe route failed:', error);
    return serverError(c, 'The belief spark fizzled. Try again soon.');
  }
});

api.post('/back', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return unauthorized(c, 'Sign in to make a Pick.');
  }

  const scribbitId = readScribbitId(await readJsonBody(c));

  if (!scribbitId) {
    return badRequest(c, 'Choose a valid Scribbit for your Pick.');
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
      return badRequest(c, "Pick one of tonight's Rumble entrants.");
    }

    if (await isScribbitOwnedByUser(redis, player.userId, scribbitId)) {
      return badRequest(c, "Pick another Redditor's Scribbit, not your own.");
    }

    const backClaim = await claimDailyBack(
      redis,
      dayNumber,
      player,
      scribbitId
    );

    if (!backClaim.claimed) {
      return conflict(c, 'You already picked a Scribbit today.');
    }

    await recordDailyPlay(redis, player.userId, now);
    return c.json<{ backed: string }>({ backed: backClaim.backedScribbitId });
  } catch (error) {
    console.error('Back route failed:', error);
    return serverError(c, 'The Pick slip blew away. Try again soon.');
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

    await removeScribbitCompletely(redis, {
      ownerUserId: player.userId,
      scribbitId,
      currentDay: dayNumber,
    });
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
        const removal = await runWithPlayerMutationLease(
          redis,
          ownerUserId,
          randomUUID(),
          async () => {
            return await removeReportedScribbitIfEligible(redis, {
              expectedOwnerUserId: ownerUserId,
              scribbitId,
              currentDay: dayNumber,
              minimumReportCount: SCRIBBIT_REPORT_REMOVAL_THRESHOLD,
            });
          }
        );
        if (removal.status === 'busy') {
          return conflict(
            c,
            'That Scribbit is changing. Your report was saved; try again.'
          );
        }
        if (removal.status === 'lost') {
          return serverError(c, 'The safety removal lost its lock. Try again.');
        }
        removedForEveryone = removal.value;
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
    const now = new Date();
    const dayNumber = await ensureCurrentArenaDay(redis, now);
    const result = await deletePlayerData(
      redis,
      player.userId,
      dayNumber,
      formatUtcDateKey(now),
      now.getTime(),
      randomUUID()
    );
    if (result.status === 'busy') {
      return conflict(c, 'Your game data is already being deleted.');
    }
    return c.json({ deleted: true, removedScribbits: result.removedScribbits });
  } catch (error) {
    console.error('Delete player data route failed:', error);
    return serverError(c, 'Your game data could not be deleted. Try again.');
  }
});

registerPlayerMutatingGet('/clout-board', async (c) => {
  try {
    return c.json<CloutBoard>(
      await loadCloutBoard(redis, await getCurrentPlayer())
    );
  } catch (error) {
    console.error('Clout board route failed:', error);
    return serverError(c, 'The Clout board fell off the wall.');
  }
});

registerPlayerMutatingGet('/inventory', async (c) => {
  const player = await getCurrentPlayer();

  if (!player) {
    return c.json<Inventory>({
      items: {},
      gear: {},
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

api.post('/equip-gear', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to equip Gear.');

  const request = readEquipGearRequest(await readJsonBody(c));
  if (!request) {
    return badRequest(c, 'Choose a valid living Scribbit and Gear slot.');
  }

  try {
    const result = await equipGearForScribbit(redis, player.userId, request);
    if (
      result.status === 'scribbit-unavailable' ||
      result.status === 'not-owned'
    ) {
      return notFound(c, 'That Scribbit is not in your active roster.');
    }
    if (result.status === 'invalid-gear') {
      return badRequest(c, 'Choose Gear that matches that slot category.');
    }
    if (result.status === 'gear-undiscovered') {
      return badRequest(c, 'Discover that Gear before equipping it.');
    }
    return c.json<Scribbit>(result.scribbit);
  } catch (error) {
    console.error('Equip Gear route failed:', error);
    return serverError(c, 'The Gear rack jammed. Try again soon.');
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

api.post('/merge-gear', async (c) => {
  const player = await getCurrentPlayer();
  if (!player) return unauthorized(c, 'Sign in to forge your Gear.');

  const body = await readJsonBody(c);
  const operationId =
    isRecord(body) && typeof body.operationId === 'string'
      ? body.operationId.trim()
      : '';
  const gearId =
    isRecord(body) && typeof body.gearId === 'string' ? body.gearId.trim() : '';
  if (!/^[A-Za-z0-9-]{16,80}$/.test(operationId)) {
    return badRequest(c, 'Forge Gear with a valid operation id.');
  }
  if (!/^[a-z0-9-]{2,64}$/.test(gearId)) {
    return badRequest(c, 'Choose valid Gear to forge.');
  }

  try {
    const result = await mergeGearForUser(
      redis,
      player.userId,
      gearId,
      operationId
    );
    if (result.status === 'invalid') {
      return badRequest(c, 'Discover that Gear before forging it.');
    }
    if (result.status === 'insufficientCopies') {
      return conflict(c, 'You need three copies to forge this Gear.');
    }
    if (result.status === 'maxRank') {
      return conflict(c, 'That Gear is already at max rank.');
    }
    if (result.status === 'operationConflict') {
      return conflict(c, 'That forge operation was already used.');
    }
    await refreshEquippedGearRankForUser(
      redis,
      player.userId,
      gearId,
      result.response.toRank
    );
    return c.json<MergeGearResponse>(result.response);
  } catch (error) {
    console.error('Merge gear route failed:', error);
    return serverError(c, 'The Gear forge jammed. Try again soon.');
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

    const founderChronicle = await loadPlayerFounderChronicle(player.userId);

    const forecast = await ensureForecastForDay(redis, dayNumber);
    const simulatedReport = simulate(
      challenger,
      champion,
      hashTextToSeed(
        `boss:${dayNumber}:${player.userId}:${challenger.id}:${champion.id}`
      ),
      forecast,
      'boss'
    );
    const championCommit = await commitDailyChampionOutcome(redis, {
      userId: player.userId,
      day: dayNumber,
      challengerId: challenger.id,
      championId: champion.id,
      report: simulatedReport,
      winnerXpGain: XP_REWARDS.championWin,
    });
    if (championCommit.status === 'already-challenged') {
      return conflict(c, "You already challenged today's Champion.");
    }
    if (championCommit.status === 'target-unavailable') {
      return notFound(c, 'That living Scribbit is not ready to fight.');
    }

    const report = championCommit.report;
    await saveBattleReport(redis, report, now.getTime());
    await queueFounderChronicleBattle(
      redis,
      player.userId,
      report,
      challenger.id,
      now.getTime()
    );
    await runNonCriticalSideEffect('Daily play record', () =>
      recordDailyPlay(redis, player.userId, now)
    );

    return c.json<DirectBattleResponse>(
      await finishDirectBattleResponse(
        player.userId,
        report,
        challenger.id,
        founderChronicle
      )
    );
  } catch (error) {
    console.error('Boss challenge route failed:', error);
    return serverError(
      c,
      'The Champion ducked behind paperwork. Try again soon.'
    );
  }
});

const maximumLegendsPageSize = 50;

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
): Promise<LegendsState> => {
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

registerPlayerMutatingGet('/legacy-cards', async (c) => {
  const cursor = c.req.query('cursor') ?? null;
  const requestedLimit = parseLegacyCardsPageSize(c.req.query('limit'));
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
    const legendPage = await loadVisibleLegendPage(
      hiddenScribbitIds,
      cursorOffset,
      requestedLimit
    );
    return c.json<LegendsState>(legendPage);
  } catch (error) {
    console.error('Legends route failed:', error);
    return serverError(c, 'The Hall of Legends is dusty right now.');
  }
});
