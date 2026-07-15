import type {
  ArenaState,
  AttachedAccessory,
  CareAction,
  DrawingSupplySelection,
  Element,
  LegacyCosmeticSnapshot,
  Mood,
  GearRank,
  Scribbit,
  ScribbitLegacy,
  ScribbitStats,
  SubmitScribbitRequest,
} from '../../shared/arena';
import { PNG } from 'pngjs';
import {
  ACCESSORY_BASE_SIZE,
  BELIEF_LEGEND_THRESHOLD,
  cloneScribbit,
  LIFESPAN_DAYS,
  MAX_ALIVE_PER_USER,
  MAX_GROWING_PER_USER,
  MAX_MATURE_PER_USER,
  MAX_ACCESSORIES_PER_SCRIBBIT,
  MAX_ACCESSORY_ROTATION,
  MAX_ACCESSORY_SCALE,
  MIN_ACCESSORY_ROTATION,
  MIN_ACCESSORY_SCALE,
  isGearRank,
  XP_REWARDS,
  SCRIBBIT_STAT_KEYS,
} from '../../shared/arena';
import { isElement } from '../../shared/elements';
import {
  parseCompleteScribbitUpgrades,
  resolveStoredScribbitUpgrades,
} from '../../shared/combat/upgrades';
import {
  parsePowerUpBuild,
  POWER_UP_CATALOG,
  POWER_UP_IDS,
  type PowerUpId,
} from '../../shared/combat/powerups';
import { getLevelForXp } from '../../shared/progression';
export { getLevelForXp } from '../../shared/progression';
import { isCommunityDrawThemeId } from '../../shared/content/communitydrawthemes';
import {
  createSparRewardReceipt,
  isSparRewardReceipt,
  type SparRewardReceipt,
} from '../../shared/sparreward';
import {
  createEmptyEquipmentLoadout,
  EQUIPMENT_CATEGORIES,
  equipGearInLoadout,
  isEquipmentCategory,
  type EquipGearRequest,
} from '../../shared/equipment';
import {
  findGearCosmetic,
  validateCatalogEquipmentLoadout,
} from '../../shared/cosmetics';
import { formatUtcDateKey } from './day';
import {
  findInkCatalogEntry,
  isAccessoryCatalogEntry,
  isBrushCatalogEntry,
  isDrawingInkCatalogEntry,
} from './ink';
import {
  getInkKey,
  getInventoryDiscoveryField,
  getInventoryGearRankField,
  getInventoryKey,
} from './inkStore';
import { findFoundingScribbit } from './species';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import { createVersionedJsonCodec } from './versionedJson';
import { jsonValuesMatch } from './jsonValues';
import {
  LEGACY_BELIEF_PRIVACY_MILLISECONDS,
  LEGACY_BELIEF_RECEIPT_MILLISECONDS,
  ROLLOUT_OVERLAP_MILLISECONDS,
  ensureMigrationStartedAt,
  migrationWindowIsOpen,
} from './migrations';
import {
  getPlayerDataDeletionLockKey,
  getPlayerDataGenerationKey,
  readPlayerDataGeneration,
} from './dataDeletion';
import {
  analyze as analyzeDrawing,
  hasMinimumDrawingInk,
  normalizeStats,
} from '../../shared/analyzer-core';
import { isCombatRole } from '../../shared/combat/roles';
import { getStatsForFighterStyle } from '../../shared/combat/selection';
import type { CombatRole } from '../../shared/combat/types';

export type CurrentPlayer = {
  userId: string;
  username: string;
};

export type DecodedPngDataUrl = {
  base64: string;
  bytes: Uint8Array;
  byteLength: number;
  width: number;
  height: number;
  rgba: Uint8Array;
};

export type ValidatedScribbitDraft = {
  name: string;
  baseImageDataUrl: string;
  imageDataUrl: string;
  stats: ScribbitStats;
  element: Element;
  fighterStyle: CombatRole | null;
  accessories: AttachedAccessory[];
  drawingSupplies: DrawingSupplySelection;
};

export type ScribbitSubmissionValidation =
  | Readonly<{ status: 'valid'; draft: ValidatedScribbitDraft }>
  | Readonly<{
      status: 'invalid';
      reason:
        | 'invalid-request'
        | 'invalid-png'
        | 'rendered-mismatch'
        | 'insufficient-ink';
    }>;

export type DailyFlags = Pick<
  ArenaState,
  'drawnToday' | 'enteredToday' | 'bossChallengedToday'
>;

const statNames: readonly (keyof ScribbitStats)[] = SCRIBBIT_STAT_KEYS;

export type DailyFlagField = 'drawn' | 'entered' | 'bossChallenge';

const pngDataUrlPrefix = 'data:image/png;base64,';
const maximumDrawingBytes = 400 * 1024;
const maximumDrawingBase64Characters = Math.ceil(maximumDrawingBytes / 3) * 4;
const drawingCanvasSize = 512;
const minimumPngHeaderBytes = 33;
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const visiblePixelTolerance = 1;
const accessoryAntialiasPaddingPixels = 1;
export const DAILY_FLAG_TTL_SECONDS = 8 * 24 * 60 * 60;
const dailyProgressTtlSeconds = 8 * 24 * 60 * 60;
const careActionOrder: CareAction[] = ['feed', 'pat', 'train'];
const lightProfanityFragments = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'piss',
  'slut',
  'whore',
  'nazi',
];

export const getScribbitKey = (scribbitId: string): string => {
  return `scribbit:${scribbitId}`;
};

export const getScribbitOwnerKey = (scribbitId: string): string => {
  return `scribbit:${scribbitId}:owner`;
};

export const getUserScribbitsKey = (userId: string): string => {
  return `user:${userId}:scribbits`;
};

export const getUserHasCreatedScribbitKey = (userId: string): string => {
  return `user:${userId}:has-created-scribbit`;
};

export const getUserAliveScribbitsKey = (userId: string): string => {
  return `user:${userId}:scribbits:alive`;
};

export const getUserLegacyCardsKey = (userId: string): string => {
  return `user:${userId}:scribbits:legacy`;
};

export const getDailyFlagsKey = (userId: string, day: number): string => {
  return `user:${userId}:daily:${day}`;
};

export const getRumbleKey = (day: number): string => {
  return `rumble:${day}`;
};

export const getRumbleStandingReceiptKey = (scribbitId: string): string => {
  return `scribbit:${scribbitId}:rumble-standings`;
};

export const getScribbitCareKey = (
  scribbitId: string,
  utcDateKey: string
): string => {
  return `scribbit:${scribbitId}:care:${utcDateKey}`;
};

export const getUserDailySparWinRewardsKey = (userId: string): string => {
  return `user:${userId}:daily-spar-win-rewards`;
};

export const getExpiringScribbitsKey = (): string => {
  return 'scribbits:expires';
};

export const getLegendsKey = (): string => {
  return 'legends';
};

export const getFoundingBeliefKey = (): string => {
  return 'belief:founding';
};

export const getCommunityBeliefKey = (): string => {
  return 'belief:community';
};

export const getScribbitBeliefVersionKey = (scribbitId: string): string => {
  return `scribbit:${scribbitId}:belief-version`;
};

const beliefReceiptTtlSeconds = 7 * 24 * 60 * 60;
const userBeliefTargetsTtlSeconds = 30 * 24 * 60 * 60;

// Legacy V1 hash retained only so duplicate checks and privacy deletion remain
// correct until every seven-day receipt written before V2 has expired.
export const getScribbitBeliefVotersKey = (scribbitId: string): string => {
  return `belief:${scribbitId}`;
};

export const getDailyBeliefReceiptKey = (
  scribbitId: string,
  userId: string,
  utcDateKey: string
): string => {
  return `belief:v2:${scribbitId}:${userId}:${utcDateKey}`;
};

export const getUserBeliefTargetsKey = (userId: string): string => {
  return `user:${userId}:belief-targets`;
};

export const getUserDailyBeliefTargetsKey = (
  userId: string,
  utcDateKey: string
): string => {
  return `user:${userId}:belief-targets:v2:${utcDateKey}`;
};

export type ApplyDailyBeliefResult =
  | Readonly<{ status: 'applied'; belief: number }>
  | Readonly<{ status: 'already-believed' }>
  | Readonly<{ status: 'self-belief' }>
  | Readonly<{ status: 'target-unavailable' }>
  | Readonly<{ status: 'user-data-changing' }>;

export const validateScribbitName = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const name = value.trim().replace(/\s+/g, ' ');

  if (name.length < 2 || name.length > 24) {
    return undefined;
  }

  if (!/^[A-Za-z0-9 '.-]+$/.test(name)) {
    return undefined;
  }

  const lowerName = name.toLowerCase();
  if (
    lightProfanityFragments.some((fragment) => {
      return lowerName.includes(fragment);
    })
  ) {
    return undefined;
  }

  return name;
};

const normalizeNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
};

export const isCareAction = (value: unknown): value is CareAction => {
  return value === 'feed' || value === 'pat' || value === 'train';
};

const isMood = (value: unknown): value is Mood => {
  return (
    value === 'happy' ||
    value === 'hungry' ||
    value === 'sleepy' ||
    value === 'pumped'
  );
};

const normalizeCareDoneToday = (value: unknown): CareAction[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return careActionOrder.filter((careAction) => {
    return value.includes(careAction);
  });
};

export const deriveMoodFromCareActions = (
  careDoneToday: CareAction[]
): Mood => {
  if (careDoneToday.length <= 0) {
    return 'hungry';
  }

  if (careDoneToday.length === 1) {
    return 'sleepy';
  }

  if (careDoneToday.length === 2) {
    return 'happy';
  }

  return 'pumped';
};

export type CareProgressionPlan = Readonly<{
  mood: Mood;
  xpGain: number;
}>;

export const planCareProgression = (
  careDoneToday: CareAction[]
): CareProgressionPlan => {
  const mood = deriveMoodFromCareActions(careDoneToday);
  return {
    mood,
    xpGain: mood === 'pumped' ? XP_REWARDS.carePumped : XP_REWARDS.care,
  };
};

export const addXpToScribbit = (
  scribbit: Scribbit,
  xpGain: number
): Scribbit => {
  if (scribbit.status !== 'alive') return cloneScribbit(scribbit);
  const gainedXp = normalizeNonNegativeInteger(xpGain);
  const currentXp = normalizeNonNegativeInteger(scribbit.xp);
  const nextXp = currentXp + gainedXp;
  const nextLevel = getLevelForXp(nextXp);

  return {
    ...scribbit,
    xp: nextXp,
    level: nextLevel,
    powerUpIds: [...(scribbit.powerUpIds ?? [])],
    careDoneToday: [...scribbit.careDoneToday],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCanvasCoordinate = (value: unknown): value is number => {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= drawingCanvasSize
  );
};

const isAccessoryScale = (value: unknown): value is number => {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_ACCESSORY_SCALE &&
    value <= MAX_ACCESSORY_SCALE
  );
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isAccessoryRotation = (value: unknown): value is number => {
  return (
    isFiniteNumber(value) &&
    value >= MIN_ACCESSORY_ROTATION &&
    value <= MAX_ACCESSORY_ROTATION
  );
};

const validateAttachedAccessory = (
  value: unknown
): AttachedAccessory | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return undefined;
  }

  const accessoryId = value.id.trim();

  if (!isAccessoryCatalogEntry(findInkCatalogEntry(accessoryId))) {
    return undefined;
  }

  if (
    !isCanvasCoordinate(value.x) ||
    !isCanvasCoordinate(value.y) ||
    !isAccessoryScale(value.scale) ||
    !isAccessoryRotation(value.rotation)
  ) {
    return undefined;
  }

  return {
    id: accessoryId,
    x: value.x,
    y: value.y,
    scale: value.scale,
    rotation: value.rotation,
  };
};

const validateAttachedAccessories = (
  value: unknown
): AttachedAccessory[] | undefined => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_ACCESSORIES_PER_SCRIBBIT) {
    return undefined;
  }

  const accessories: AttachedAccessory[] = [];

  for (const accessory of value) {
    const validatedAccessory = validateAttachedAccessory(accessory);

    if (!validatedAccessory) {
      return undefined;
    }

    accessories.push(validatedAccessory);
  }

  return accessories;
};

const validateDrawingSupplySelection = (
  value: unknown
): DrawingSupplySelection | undefined => {
  if (value === undefined) {
    return { drawingInkId: null, brushId: null };
  }
  if (!isRecord(value)) return undefined;

  const drawingInkId = value.drawingInkId;
  const brushId = value.brushId;
  if (
    drawingInkId !== null &&
    (typeof drawingInkId !== 'string' ||
      !isDrawingInkCatalogEntry(findInkCatalogEntry(drawingInkId)))
  ) {
    return undefined;
  }
  if (
    brushId !== null &&
    (typeof brushId !== 'string' ||
      !isBrushCatalogEntry(findInkCatalogEntry(brushId)))
  ) {
    return undefined;
  }
  return { drawingInkId, brushId };
};

const normalizeScribbitAccessories = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((accessoryId): accessoryId is string => {
      return (
        typeof accessoryId === 'string' && /^[a-z0-9-]{2,64}$/.test(accessoryId)
      );
    })
    .slice(0, MAX_ACCESSORIES_PER_SCRIBBIT);
};

const normalizeScribbitGearRanks = (
  value: unknown,
  accessories: readonly string[]
): Record<string, GearRank> => {
  const storedRanks = isRecord(value) ? value : {};
  return Object.fromEntries(
    accessories.map((gearId) => {
      const rank = storedRanks[gearId];
      return [gearId, isGearRank(rank) ? rank : 1];
    })
  );
};

export const validateSubmitScribbitRequest = (
  value: unknown
): ValidatedScribbitDraft | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = validateScribbitName(value.name);
  const accessories = validateAttachedAccessories(value.accessories);
  const drawingSupplies = validateDrawingSupplySelection(value.drawingSupplies);
  const fighterStyle =
    value.fighterStyle === undefined
      ? null
      : isCombatRole(value.fighterStyle)
        ? value.fighterStyle
        : undefined;

  if (
    !name ||
    typeof value.baseImageDataUrl !== 'string' ||
    typeof value.imageDataUrl !== 'string' ||
    !accessories ||
    !drawingSupplies ||
    fighterStyle === undefined
  ) {
    return undefined;
  }

  return {
    name,
    baseImageDataUrl: value.baseImageDataUrl,
    imageDataUrl: value.imageDataUrl,
    // Deprecated client-provided values are kept for request compatibility.
    // The submit route derives both fighter style and element from base pixels.
    stats: normalizeStats(value.stats),
    element: isElement(value.element) ? value.element : 'ember',
    fighterStyle,
    accessories,
    drawingSupplies,
  };
};

type AccessoryPixelRegion = {
  centerX: number;
  centerY: number;
  cosine: number;
  sine: number;
  halfSizeWithPadding: number;
};

const createAccessoryPixelRegion = (
  accessory: AttachedAccessory
): AccessoryPixelRegion => {
  const cosine = Math.cos(accessory.rotation);
  const sine = Math.sin(accessory.rotation);
  // Include every raster pixel square touched by the rotated nominal box, plus
  // one antialiasing pixel. This stays conservative without opening its AABB
  // corners to arbitrary rendered changes.
  const pixelSquareProjection = (Math.abs(cosine) + Math.abs(sine)) / 2;

  return {
    centerX: accessory.x,
    centerY: accessory.y,
    cosine,
    sine,
    halfSizeWithPadding:
      (ACCESSORY_BASE_SIZE * accessory.scale) / 2 +
      pixelSquareProjection +
      accessoryAntialiasPaddingPixels,
  };
};

const isPixelInsideAccessoryRegion = (
  pixelX: number,
  pixelY: number,
  region: AccessoryPixelRegion
): boolean => {
  const distanceX = pixelX + 0.5 - region.centerX;
  const distanceY = pixelY + 0.5 - region.centerY;
  const unrotatedX = distanceX * region.cosine + distanceY * region.sine;
  const unrotatedY = -distanceX * region.sine + distanceY * region.cosine;

  return (
    Math.abs(unrotatedX) <= region.halfSizeWithPadding &&
    Math.abs(unrotatedY) <= region.halfSizeWithPadding
  );
};

const premultiplyColorChannel = (channel: number, alpha: number): number => {
  return Math.round((channel * alpha) / 255);
};

const visiblePixelsMatch = (
  baseRgba: Uint8Array,
  renderedRgba: Uint8Array,
  byteOffset: number,
  baseAlpha: number,
  renderedAlpha: number
): boolean => {
  if (Math.abs(renderedAlpha - baseAlpha) > visiblePixelTolerance) {
    return false;
  }

  for (let channelOffset = 0; channelOffset < 3; channelOffset += 1) {
    const baseChannelValue = baseRgba[byteOffset + channelOffset];
    const renderedChannelValue = renderedRgba[byteOffset + channelOffset];

    if (baseChannelValue === undefined || renderedChannelValue === undefined) {
      return false;
    }

    const baseChannel = premultiplyColorChannel(baseChannelValue, baseAlpha);
    const renderedChannel = premultiplyColorChannel(
      renderedChannelValue,
      renderedAlpha
    );

    if (Math.abs(renderedChannel - baseChannel) > visiblePixelTolerance) {
      return false;
    }
  }

  return true;
};

export const validateRenderedPngBinding = (
  basePng: DecodedPngDataUrl,
  renderedPng: DecodedPngDataUrl,
  accessories: AttachedAccessory[]
): boolean => {
  if (
    basePng.width !== drawingCanvasSize ||
    basePng.height !== drawingCanvasSize ||
    renderedPng.width !== basePng.width ||
    renderedPng.height !== basePng.height
  ) {
    return false;
  }

  const expectedRgbaLength = basePng.width * basePng.height * 4;

  if (
    basePng.rgba.length !== expectedRgbaLength ||
    renderedPng.rgba.length !== expectedRgbaLength
  ) {
    return false;
  }

  const validatedAccessories = validateAttachedAccessories(accessories);

  if (!validatedAccessories) {
    return false;
  }

  const allowedRegions = validatedAccessories.map(createAccessoryPixelRegion);
  const pixelCount = basePng.width * basePng.height;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const byteOffset = pixelIndex * 4;
    const baseAlpha = basePng.rgba[byteOffset + 3];
    const renderedAlpha = renderedPng.rgba[byteOffset + 3];

    if (baseAlpha === undefined || renderedAlpha === undefined) {
      return false;
    }

    // Accessories use normal source-over painting, so no submitted decoration
    // is allowed to erase even one alpha level from the player's base drawing.
    if (renderedAlpha < baseAlpha) {
      return false;
    }

    if (
      visiblePixelsMatch(
        basePng.rgba,
        renderedPng.rgba,
        byteOffset,
        baseAlpha,
        renderedAlpha
      )
    ) {
      continue;
    }

    const pixelX = pixelIndex % basePng.width;
    const pixelY = Math.floor(pixelIndex / basePng.width);
    const isInsideDeclaredAccessory = allowedRegions.some((region) => {
      return isPixelInsideAccessoryRegion(pixelX, pixelY, region);
    });

    if (!isInsideDeclaredAccessory) {
      return false;
    }
  }

  return true;
};

const hasExpectedPngHeader = (bytes: Uint8Array): boolean => {
  if (bytes.byteLength < minimumPngHeaderBytes) {
    return false;
  }

  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) {
      return false;
    }
  }

  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return (
    header.getUint32(8, false) === 13 &&
    bytes[12] === 73 &&
    bytes[13] === 72 &&
    bytes[14] === 68 &&
    bytes[15] === 82 &&
    header.getUint32(16, false) === drawingCanvasSize &&
    header.getUint32(20, false) === drawingCanvasSize
  );
};

export const decodePngDataUrl = (
  imageDataUrl: string
): DecodedPngDataUrl | undefined => {
  if (!imageDataUrl.startsWith(pngDataUrlPrefix)) {
    return undefined;
  }

  const base64Length = imageDataUrl.length - pngDataUrlPrefix.length;

  if (
    base64Length <= 0 ||
    base64Length > maximumDrawingBase64Characters ||
    base64Length % 4 !== 0
  ) {
    return undefined;
  }

  const base64 = imageDataUrl.slice(pngDataUrlPrefix.length);

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return undefined;
  }

  const bytes = Buffer.from(base64, 'base64');

  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > maximumDrawingBytes ||
    !hasExpectedPngHeader(bytes)
  ) {
    return undefined;
  }

  try {
    const png = PNG.sync.read(bytes);

    if (png.width !== drawingCanvasSize || png.height !== drawingCanvasSize) {
      return undefined;
    }

    return {
      base64,
      bytes,
      byteLength: bytes.byteLength,
      width: png.width,
      height: png.height,
      rgba: new Uint8Array(png.data),
    };
  } catch {
    return undefined;
  }
};

/**
 * One authoritative boundary for turning an untrusted submit payload into the
 * server-derived Scribbit draft used by both Devvit and the local mock.
 */
export const validateAndAnalyzeScribbitSubmission = (
  value: unknown
): ScribbitSubmissionValidation => {
  const draft = validateSubmitScribbitRequest(value);
  if (!draft) return { status: 'invalid', reason: 'invalid-request' };

  const decodedBasePng = decodePngDataUrl(draft.baseImageDataUrl);
  const decodedRenderedPng = decodePngDataUrl(draft.imageDataUrl);
  if (!decodedBasePng || !decodedRenderedPng) {
    return { status: 'invalid', reason: 'invalid-png' };
  }
  if (
    !validateRenderedPngBinding(
      decodedBasePng,
      decodedRenderedPng,
      draft.accessories
    )
  ) {
    return { status: 'invalid', reason: 'rendered-mismatch' };
  }

  const analysis = analyzeDrawing({
    data: decodedBasePng.rgba,
    width: decodedBasePng.width,
    height: decodedBasePng.height,
  });
  if (!hasMinimumDrawingInk(analysis)) {
    return { status: 'invalid', reason: 'insufficient-ink' };
  }

  return {
    status: 'valid',
    draft: {
      ...draft,
      // The most-used chromatic ink group is authoritative. A claimed style
      // from an already-open client can never override the submitted pixels.
      stats: getStatsForFighterStyle(analysis.fighterStyle),
      element: analysis.element,
    },
  };
};

export const deleteStoredScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbitId: string,
  day: number
): Promise<void> => {
  await storage.del(
    getScribbitKey(scribbitId),
    getScribbitOwnerKey(scribbitId),
    getRumbleStandingReceiptKey(scribbitId),
    getScribbitBeliefVersionKey(scribbitId)
  );
  await storage.zRem(getUserScribbitsKey(ownerUserId), [scribbitId]);
  await storage.zRem(getUserAliveScribbitsKey(ownerUserId), [scribbitId]);
  await storage.zRem(getUserLegacyCardsKey(ownerUserId), [scribbitId]);
  await storage.zRem(getExpiringScribbitsKey(), [scribbitId]);
  await storage.zRem(getRumbleKey(day), [scribbitId]);
  await storage.zRem(getLegendsKey(), [scribbitId]);
  await storage.hDel(getCommunityBeliefKey(), [scribbitId]);
};

export const releaseDailyFlags = async (
  storage: ArenaStorage,
  userId: string,
  day: number,
  fields: DailyFlagField[]
): Promise<void> => {
  if (fields.length === 0) {
    return;
  }

  const dailyFlagsKey = getDailyFlagsKey(userId, day);
  await storage.hDel(dailyFlagsKey, fields);
  await storage.expire(dailyFlagsKey, DAILY_FLAG_TTL_SECONDS);
};

export const claimDailyFlags = async (
  storage: ArenaStorage,
  userId: string,
  day: number,
  fields: DailyFlagField[]
): Promise<boolean> => {
  const dailyFlagsKey = getDailyFlagsKey(userId, day);
  const claimedFields: DailyFlagField[] = [];

  for (const field of fields) {
    const createdFlag = await storage.hSetNX(dailyFlagsKey, field, '1');

    if (createdFlag !== 1) {
      if (claimedFields.length > 0) {
        await releaseDailyFlags(storage, userId, day, claimedFields);
      }
      return false;
    }

    claimedFields.push(field);
  }

  await storage.expire(dailyFlagsKey, DAILY_FLAG_TTL_SECONDS);
  return true;
};

const isScribbitStats = (value: unknown): value is ScribbitStats => {
  if (!isRecord(value)) {
    return false;
  }

  return statNames.every((statName) => {
    return (
      typeof value[statName] === 'number' && Number.isFinite(value[statName])
    );
  });
};

const isScribbitStatus = (value: unknown): value is Scribbit['status'] => {
  return value === 'alive' || value === 'faded' || value === 'legend';
};

const isLegacyFinish = (value: unknown): value is ScribbitLegacy['finish'] => {
  return value === 'faded' || value === 'believed' || value === 'champion';
};

const isLegacyFinishValidForStatus = (
  finish: ScribbitLegacy['finish'],
  status: Scribbit['status']
): boolean => {
  return status === 'faded'
    ? finish === 'faded'
    : status === 'legend' && finish !== 'faded';
};

const fallbackCosmeticName = (cosmeticId: string): string => {
  return cosmeticId
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

const snapshotCosmetic = (cosmeticId: string): LegacyCosmeticSnapshot => {
  const entry = findInkCatalogEntry(cosmeticId);
  return {
    id: cosmeticId,
    name: entry?.name ?? fallbackCosmeticName(cosmeticId),
    rarity: entry?.rarity ?? 'common',
  };
};

const normalizeLegacyCosmetic = (
  value: unknown
): LegacyCosmeticSnapshot | undefined => {
  if (typeof value === 'string' && /^[a-z0-9-]{2,64}$/.test(value)) {
    return snapshotCosmetic(value);
  }
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !/^[a-z0-9-]{2,64}$/.test(value.id) ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    !['common', 'rare', 'epic'].includes(String(value.rarity))
  ) {
    return undefined;
  }
  return {
    id: value.id,
    name: value.name.trim().slice(0, 80),
    rarity: value.rarity as LegacyCosmeticSnapshot['rarity'],
  };
};

const inferLegacyFinish = (
  scribbit: Pick<Scribbit, 'status' | 'legendTitle'>
): ScribbitLegacy['finish'] => {
  if (scribbit.status === 'faded') return 'faded';
  return scribbit.legendTitle?.startsWith('Champion of Day ')
    ? 'champion'
    : 'believed';
};

const createScribbitLegacySnapshot = (
  scribbit: Scribbit,
  schemaVersion: 1 | 2 | 3,
  options: {
    creatorTitle?: LegacyCosmeticSnapshot | null;
    archivedDay?: number;
  } = {}
): ScribbitLegacy => {
  const xp = normalizeNonNegativeInteger(scribbit.xp);
  const level = getLevelForXp(xp);
  const upgrades =
    schemaVersion >= 2
      ? parseCompleteScribbitUpgrades(scribbit.upgrades, level)
      : [];
  if (!upgrades) {
    throw new Error('Cannot archive malformed Ink Mod progression.');
  }
  return {
    schemaVersion,
    archivedDay:
      Number.isSafeInteger(options.archivedDay) &&
      (options.archivedDay ?? 0) >= scribbit.bornDay
        ? (options.archivedDay as number)
        : scribbit.expiresDay,
    finish: inferLegacyFinish(scribbit),
    creatorTitle: options.creatorTitle ? { ...options.creatorTitle } : null,
    level,
    xp,
    wins: normalizeNonNegativeInteger(scribbit.wins),
    losses: normalizeNonNegativeInteger(scribbit.losses),
    belief: normalizeNonNegativeInteger(scribbit.belief),
    accessories: scribbit.accessories.map(snapshotCosmetic),
    upgrades: upgrades.map((upgrade) => ({ ...upgrade })),
  };
};

export const createScribbitLegacy = (
  scribbit: Scribbit,
  options: {
    creatorTitle?: LegacyCosmeticSnapshot | null;
    archivedDay?: number;
  } = {}
): ScribbitLegacy => {
  return createScribbitLegacySnapshot(
    scribbit,
    options.archivedDay !== undefined &&
      options.archivedDay !== scribbit.expiresDay
      ? 3
      : 2,
    options
  );
};

const normalizeStoredLegacy = (
  value: unknown,
  scribbit: Scribbit
): ScribbitLegacy | undefined => {
  if (
    !isRecord(value) ||
    !isLegacyFinish(value.finish) ||
    !isLegacyFinishValidForStatus(value.finish, scribbit.status) ||
    (value.schemaVersion !== undefined &&
      value.schemaVersion !== 1 &&
      value.schemaVersion !== 2 &&
      value.schemaVersion !== 3) ||
    typeof value.archivedDay !== 'number' ||
    !Number.isSafeInteger(value.archivedDay) ||
    value.archivedDay < scribbit.bornDay ||
    (value.schemaVersion !== 3 && value.archivedDay !== scribbit.expiresDay) ||
    typeof value.xp !== 'number' ||
    typeof value.wins !== 'number' ||
    typeof value.losses !== 'number' ||
    typeof value.belief !== 'number'
  ) {
    return undefined;
  }

  const xp = normalizeNonNegativeInteger(value.xp);
  const level = getLevelForXp(xp);
  const schemaVersion =
    value.schemaVersion === 3 ? 3 : value.schemaVersion === 2 ? 2 : 1;
  const upgrades =
    schemaVersion >= 2
      ? parseCompleteScribbitUpgrades(value.upgrades, level)
      : value.upgrades === undefined ||
          (Array.isArray(value.upgrades) && value.upgrades.length === 0)
        ? []
        : undefined;
  if (!upgrades) return undefined;
  const creatorTitle = normalizeLegacyCosmetic(
    value.creatorTitle ?? value.creatorTitleId
  );
  const legacyAccessories = Array.isArray(value.accessories)
    ? value.accessories
        .map(normalizeLegacyCosmetic)
        .filter(
          (accessory): accessory is LegacyCosmeticSnapshot =>
            accessory !== undefined
        )
        .slice(0, MAX_ACCESSORIES_PER_SCRIBBIT)
    : [];
  return {
    schemaVersion,
    archivedDay: value.archivedDay,
    finish: value.finish,
    creatorTitle: creatorTitle ?? null,
    level,
    xp,
    wins: normalizeNonNegativeInteger(value.wins),
    losses: normalizeNonNegativeInteger(value.losses),
    belief: normalizeNonNegativeInteger(value.belief),
    accessories: legacyAccessories,
    upgrades,
  };
};

// Frozen v1 semantics. A future v2 must add a separate normalizer and migration
// instead of changing which missing or legacy fields v0 -> v1 accepts.
const normalizeScribbitV1Value = (
  value: unknown,
  allowPreFeatureMigration: boolean
): Scribbit | undefined => {
  if (!isRecord(value) || !isScribbitStats(value.stats)) {
    return undefined;
  }

  if (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.artist === 'string' &&
    isElement(value.element) &&
    typeof value.imageUrl === 'string' &&
    typeof value.bornDay === 'number' &&
    typeof value.expiresDay === 'number' &&
    typeof value.belief === 'number' &&
    typeof value.wins === 'number' &&
    typeof value.losses === 'number' &&
    isScribbitStatus(value.status) &&
    (typeof value.legendTitle === 'string' || value.legendTitle === null) &&
    typeof value.isFounding === 'boolean'
  ) {
    const xp = normalizeNonNegativeInteger(value.xp);
    const level = getLevelForXp(xp);
    const careDoneToday = normalizeCareDoneToday(value.careDoneToday);
    const status = value.status;
    let upgrades: Scribbit['upgrades'];
    if (status === 'alive') {
      if (allowPreFeatureMigration) {
        const upgradeResolution = resolveStoredScribbitUpgrades(
          value.id,
          level,
          value.upgrades
        );
        if (upgradeResolution.status === 'invalid') return undefined;
        upgrades = [...upgradeResolution.upgrades];
      } else {
        const parsedUpgrades = parseCompleteScribbitUpgrades(
          value.upgrades,
          level
        );
        if (!parsedUpgrades) return undefined;
        upgrades = parsedUpgrades;
      }
    } else {
      const hasCompleteLegacy =
        isRecord(value.legacy) &&
        (value.legacy.schemaVersion === 2 || value.legacy.schemaVersion === 3);
      if (hasCompleteLegacy) {
        const parsedUpgrades = parseCompleteScribbitUpgrades(
          value.upgrades,
          level
        );
        if (!parsedUpgrades) return undefined;
        upgrades = parsedUpgrades;
      } else if (
        value.upgrades === undefined ||
        (Array.isArray(value.upgrades) && value.upgrades.length === 0)
      ) {
        upgrades = [];
      } else {
        return undefined;
      }
    }

    const accessories = normalizeScribbitAccessories(value.accessories);
    const drawingThemeId =
      value.drawingThemeId === undefined || value.drawingThemeId === null
        ? null
        : isCommunityDrawThemeId(value.drawingThemeId)
          ? value.drawingThemeId
          : undefined;
    if (drawingThemeId === undefined) return undefined;
    const equipmentLoadout =
      value.equipmentLoadout === undefined
        ? createEmptyEquipmentLoadout()
        : validateCatalogEquipmentLoadout(value.equipmentLoadout);
    if (!equipmentLoadout) return undefined;
    const rankedGearIds = [
      ...accessories,
      ...EQUIPMENT_CATEGORIES.flatMap((category) =>
        equipmentLoadout[category].filter(
          (gearId): gearId is string => gearId !== null
        )
      ),
    ];
    const normalizedScribbit: Scribbit = {
      id: value.id,
      name: value.name,
      artist: value.artist,
      element: value.element,
      // Stored stats are historical authority. Validate their shape above but
      // never rebalance them while reading; normalization applies only to new
      // writes so old fights and Legacy Cards remain immutable.
      stats: { ...value.stats },
      imageUrl: value.imageUrl,
      drawingThemeId,
      bornDay: value.bornDay,
      expiresDay: value.expiresDay,
      belief: value.belief,
      wins: value.wins,
      losses: value.losses,
      status,
      legendTitle: value.legendTitle,
      isFounding: value.isFounding,
      accessories,
      gearRanks: normalizeScribbitGearRanks(value.gearRanks, rankedGearIds),
      equipmentLoadout,
      upgrades,
      level,
      xp,
      mood: isMood(value.mood)
        ? value.mood
        : deriveMoodFromCareActions(careDoneToday),
      careDoneToday,
      legacy: null,
    };

    if (normalizedScribbit.status !== 'alive') {
      if (value.legacy === undefined || value.legacy === null) {
        if (!allowPreFeatureMigration) return undefined;
        normalizedScribbit.legacy = createScribbitLegacySnapshot(
          normalizedScribbit,
          1
        );
      } else {
        const legacy = normalizeStoredLegacy(value.legacy, normalizedScribbit);
        if (!legacy) return undefined;
        normalizedScribbit.legacy = legacy;
      }
    }

    return normalizedScribbit;
  }

  return undefined;
};

export const normalizeScribbitRecord = (
  value: unknown
): Scribbit | undefined => {
  return normalizeScribbitV2Value(value, true, true);
};

export const SCRIBBIT_SCHEMA_VERSION = 2;

// This explicit key list is the immutable v1 storage shape. Keeping it separate
// from cloneScribbit prevents a future runtime field from silently changing old
// migration output.
const encodeScribbitV1 = (scribbit: Scribbit): Record<string, unknown> => {
  const clonedScribbit = cloneScribbit(scribbit);
  return {
    schemaVersion: 1,
    id: clonedScribbit.id,
    name: clonedScribbit.name,
    artist: clonedScribbit.artist,
    element: clonedScribbit.element,
    stats: clonedScribbit.stats,
    imageUrl: clonedScribbit.imageUrl,
    drawingThemeId: clonedScribbit.drawingThemeId,
    bornDay: clonedScribbit.bornDay,
    expiresDay: clonedScribbit.expiresDay,
    belief: clonedScribbit.belief,
    wins: clonedScribbit.wins,
    losses: clonedScribbit.losses,
    status: clonedScribbit.status,
    legendTitle: clonedScribbit.legendTitle,
    isFounding: clonedScribbit.isFounding,
    accessories: clonedScribbit.accessories,
    gearRanks: clonedScribbit.gearRanks,
    equipmentLoadout: clonedScribbit.equipmentLoadout,
    upgrades: clonedScribbit.upgrades,
    level: clonedScribbit.level,
    xp: clonedScribbit.xp,
    mood: clonedScribbit.mood,
    careDoneToday: clonedScribbit.careDoneToday,
    legacy: clonedScribbit.legacy,
  };
};

export const migrateScribbitV0ToV1 = (storedValue: unknown): unknown => {
  const normalizedScribbit = normalizeScribbitV1Value(storedValue, true);
  return normalizedScribbit
    ? encodeScribbitV1(normalizedScribbit)
    : storedValue;
};

const LEGACY_MIGRATION_POWER_UP_IDS = POWER_UP_IDS.filter(
  (powerUpId) => POWER_UP_CATALOG[powerUpId].rarity === 'common'
);

const migrateLegacyProgressionToPowerUps = (
  scribbitId: string,
  legacyUpgradeCount: number
): readonly PowerUpId[] => {
  const count = Math.min(4, Math.max(0, legacyUpgradeCount));
  if (count === 0) return [];
  const startIndex = [...scribbitId].reduce(
    (sum, character) =>
      (sum + character.charCodeAt(0)) % LEGACY_MIGRATION_POWER_UP_IDS.length,
    0
  );
  return Array.from({ length: count }, (_, index) => {
    return LEGACY_MIGRATION_POWER_UP_IDS[
      (startIndex + index) % LEGACY_MIGRATION_POWER_UP_IDS.length
    ]!;
  });
};

const normalizeScribbitV2Value = (
  value: unknown,
  allowMissingPowerUps: boolean,
  allowLegacyUpgradeMigration: boolean
): Scribbit | undefined => {
  if (!isRecord(value)) return undefined;
  const legacyCompatibleValue =
    allowLegacyUpgradeMigration && value.status === 'alive'
      ? { ...value, upgrades: undefined }
      : value;
  const normalizedV1 = normalizeScribbitV1Value(
    legacyCompatibleValue,
    allowLegacyUpgradeMigration
  );
  if (!normalizedV1) return undefined;
  const powerUpIds =
    value.powerUpIds === undefined && allowMissingPowerUps
      ? []
      : parsePowerUpBuild(value.powerUpIds);
  if (!powerUpIds) return undefined;
  return {
    ...normalizedV1,
    powerUpIds: [...powerUpIds],
  };
};

export const isScribbit = (value: unknown): value is Scribbit => {
  return normalizeScribbitV2Value(value, true, true) !== undefined;
};

const encodeScribbitV2 = (scribbit: Scribbit): Record<string, unknown> => {
  const encodedV1 = encodeScribbitV1(scribbit);
  return {
    ...encodedV1,
    schemaVersion: 2,
    powerUpIds: [...(scribbit.powerUpIds ?? [])],
  };
};

export const migrateScribbitV1ToV2 = (storedValue: unknown): unknown => {
  if (!isRecord(storedValue)) return storedValue;
  const scribbitValue = { ...storedValue };
  delete scribbitValue.schemaVersion;
  const normalizedV1 = normalizeScribbitV1Value(scribbitValue, true);
  if (!normalizedV1) return storedValue;
  return encodeScribbitV2({
    ...normalizedV1,
    powerUpIds: [
      ...migrateLegacyProgressionToPowerUps(
        normalizedV1.id,
        normalizedV1.upgrades.length
      ),
    ],
  });
};

const scribbitJsonCodec = createVersionedJsonCodec<Scribbit>({
  currentVersion: SCRIBBIT_SCHEMA_VERSION,
  legacyVersion: 0,
  migrations: { 0: migrateScribbitV0ToV1, 1: migrateScribbitV1ToV2 },
  decodeCurrent: (storedValue) => {
    if (
      !isRecord(storedValue) ||
      storedValue.schemaVersion !== SCRIBBIT_SCHEMA_VERSION
    ) {
      return undefined;
    }
    const scribbitValue = { ...storedValue };
    delete scribbitValue.schemaVersion;
    const scribbit = normalizeScribbitV2Value(scribbitValue, false, true);
    if (!scribbit) return undefined;
    const canonicalValue = encodeScribbitV2(scribbit);
    delete canonicalValue.schemaVersion;
    return jsonValuesMatch(scribbitValue, canonicalValue)
      ? scribbit
      : undefined;
  },
  encodeCurrent: encodeScribbitV2,
});

export const parseStoredScribbit = (storedScribbit: string | undefined) =>
  scribbitJsonCodec.parse(storedScribbit);

export const serializeScribbit = (scribbit: Scribbit): string => {
  const normalizedScribbit = normalizeScribbitV2Value(scribbit, true, true);
  if (!normalizedScribbit) {
    throw new Error('Scribbit failed authoritative runtime validation.');
  }
  return scribbitJsonCodec.serialize(normalizedScribbit);
};

export const parseScribbit = (
  storedScribbit: string | undefined
): Scribbit | undefined => {
  const parsedScribbit = parseStoredScribbit(storedScribbit);
  return parsedScribbit.status === 'valid' ? parsedScribbit.value : undefined;
};

export const createScribbit = (options: {
  id: string;
  draft: Pick<
    SubmitScribbitRequest,
    'name' | 'stats' | 'element' | 'accessories'
  >;
  artist: string;
  imageUrl: string;
  day: number;
  drawingThemeId?: string | null;
}): Scribbit => {
  const accessories = (options.draft.accessories ?? []).map((accessory) => {
    return accessory.id;
  });
  return {
    id: options.id,
    name: options.draft.name,
    artist: options.artist,
    element: options.draft.element,
    stats: normalizeStats(options.draft.stats),
    imageUrl: options.imageUrl,
    drawingThemeId: options.drawingThemeId ?? null,
    bornDay: options.day,
    expiresDay: options.day + LIFESPAN_DAYS,
    belief: 0,
    wins: 0,
    losses: 0,
    status: 'alive',
    legendTitle: null,
    isFounding: false,
    accessories,
    gearRanks: Object.fromEntries(
      accessories.map((gearId) => [gearId, 1 as const])
    ),
    equipmentLoadout: createEmptyEquipmentLoadout(),
    upgrades: [],
    powerUpIds: [],
    level: 1,
    xp: 0,
    mood: 'hungry',
    careDoneToday: [],
    legacy: null,
  };
};

export const readCareDoneToday = async (
  storage: ArenaStorage,
  scribbitId: string,
  utcDateKey: string
): Promise<CareAction[]> => {
  const storedCare = await storage.hGetAll(
    getScribbitCareKey(scribbitId, utcDateKey)
  );

  return careActionOrder.filter((careAction) => {
    return storedCare[careAction] !== undefined;
  });
};

const hydrateScribbitForUtcDay = async (
  storage: ArenaStorage,
  scribbit: Scribbit,
  utcDateKey: string
): Promise<Scribbit> => {
  if (scribbit.isFounding) {
    return cloneScribbit(scribbit);
  }

  const careDoneToday = await readCareDoneToday(
    storage,
    scribbit.id,
    utcDateKey
  );
  const storedBelief = await storage.hGet(getCommunityBeliefKey(), scribbit.id);
  const belief =
    storedBelief === undefined ? scribbit.belief : Number(storedBelief);

  return {
    ...scribbit,
    belief:
      Number.isFinite(belief) && belief >= 0
        ? Math.floor(belief)
        : scribbit.belief,
    mood: deriveMoodFromCareActions(careDoneToday),
    careDoneToday,
  };
};

const hydrateFoundingScribbit = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<Scribbit> => {
  const storedBelief = await storage.hGet(getFoundingBeliefKey(), scribbit.id);
  const belief =
    storedBelief === undefined ? scribbit.belief : Number(storedBelief);

  return {
    ...cloneScribbit(scribbit),
    belief: Number.isFinite(belief) && belief >= 0 ? Math.floor(belief) : 0,
  };
};

export const loadScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  utcDateKey = formatUtcDateKey(new Date())
): Promise<Scribbit | undefined> => {
  const foundingScribbit = findFoundingScribbit(scribbitId);

  if (foundingScribbit) {
    return await hydrateFoundingScribbit(storage, foundingScribbit);
  }

  const scribbit = parseScribbit(await storage.get(getScribbitKey(scribbitId)));

  if (!scribbit) {
    return undefined;
  }

  return await hydrateScribbitForUtcDay(storage, scribbit, utcDateKey);
};

export const loadScribbits = async (
  storage: ArenaStorage,
  scribbitIds: string[],
  utcDateKey = formatUtcDateKey(new Date())
): Promise<Scribbit[]> => {
  const scribbits: Scribbit[] = [];

  // Redis round trips dominate this path. Load a bounded batch concurrently so
  // a busy arena is fast without creating an unbounded Promise fan-out.
  const batchSize = 24;
  for (let start = 0; start < scribbitIds.length; start += batchSize) {
    const batch = await Promise.all(
      scribbitIds
        .slice(start, start + batchSize)
        .map((scribbitId) => loadScribbit(storage, scribbitId, utcDateKey))
    );
    for (const scribbit of batch) {
      if (scribbit) scribbits.push(scribbit);
    }
  }

  return scribbits;
};

const prepareScribbitForStorage = (scribbit: Scribbit): Scribbit => {
  const normalizedScribbit = normalizeScribbitV1Value(scribbit, false);
  if (!normalizedScribbit) {
    throw new Error('Scribbit failed authoritative runtime validation.');
  }
  return normalizedScribbit;
};

const setValidatedScribbitRecord = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<void> => {
  if (!storage.watch) {
    throw new Error('Safe Scribbit storage requires transaction support.');
  }
  const key = getScribbitKey(scribbit.id);
  const scribbitJson = serializeScribbit(scribbit);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key);
      const existingJson = await storage.get(key);
      if (existingJson !== undefined && !parseScribbit(existingJson)) {
        throw new Error(
          `Stored Scribbit ${scribbit.id} is invalid and was preserved.`
        );
      }
      await transaction.multi();
      await transaction.set(key, scribbitJson);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Scribbit storage');
      if ((await storage.get(key)) === scribbitJson) return;
      throw error;
    }
  }

  throw new Error(`Scribbit ${scribbit.id} changed too often to save safely.`);
};

export const queueStoredScribbit = async (
  transaction: ArenaTransaction,
  ownerUserId: string,
  scribbit: Scribbit
): Promise<Scribbit> => {
  const storedScribbit = prepareScribbitForStorage(scribbit);
  await transaction.set(
    getScribbitKey(storedScribbit.id),
    serializeScribbit(storedScribbit)
  );
  await transaction.set(getScribbitOwnerKey(storedScribbit.id), ownerUserId);
  await transaction.set(getUserHasCreatedScribbitKey(ownerUserId), '1');
  await transaction.zAdd(getUserScribbitsKey(ownerUserId), {
    member: storedScribbit.id,
    score: storedScribbit.bornDay,
  });

  if (storedScribbit.status === 'alive') {
    await transaction.zAdd(getUserAliveScribbitsKey(ownerUserId), {
      member: storedScribbit.id,
      score: storedScribbit.bornDay,
    });
    await transaction.zAdd(getExpiringScribbitsKey(), {
      member: storedScribbit.id,
      score: storedScribbit.expiresDay,
    });
  } else if (storedScribbit.legacy) {
    await transaction.zAdd(getUserLegacyCardsKey(ownerUserId), {
      member: storedScribbit.id,
      score: storedScribbit.legacy.archivedDay,
    });
  }

  return storedScribbit;
};

const storedScribbitMatches = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbit: Scribbit
): Promise<boolean> => {
  const [
    storedJson,
    owner,
    hasCreatedScribbit,
    userIndexScore,
    statusIndexScore,
  ] = await Promise.all([
    storage.get(getScribbitKey(scribbit.id)),
    storage.get(getScribbitOwnerKey(scribbit.id)),
    storage.get(getUserHasCreatedScribbitKey(ownerUserId)),
    storage.zScore(getUserScribbitsKey(ownerUserId), scribbit.id),
    scribbit.status === 'alive'
      ? storage.zScore(getUserAliveScribbitsKey(ownerUserId), scribbit.id)
      : scribbit.legacy
        ? storage.zScore(getUserLegacyCardsKey(ownerUserId), scribbit.id)
        : Promise.resolve(undefined),
  ]);

  if (
    storedJson !== serializeScribbit(scribbit) ||
    owner !== ownerUserId ||
    hasCreatedScribbit !== '1' ||
    userIndexScore !== scribbit.bornDay
  ) {
    return false;
  }

  if (scribbit.status === 'alive') {
    return (
      statusIndexScore === scribbit.bornDay &&
      (await storage.zScore(getExpiringScribbitsKey(), scribbit.id)) ===
        scribbit.expiresDay
    );
  }

  return !scribbit.legacy || statusIndexScore === scribbit.legacy.archivedDay;
};

export const storeScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbit: Scribbit
): Promise<void> => {
  if (!storage.watch) {
    throw new Error('Safe Scribbit storage requires transaction support.');
  }
  const storedScribbit = prepareScribbitForStorage(scribbit);
  const scribbitKey = getScribbitKey(storedScribbit.id);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(scribbitKey);
      const existingJson = await storage.get(scribbitKey);
      if (existingJson !== undefined && !parseScribbit(existingJson)) {
        throw new Error(
          `Stored Scribbit ${storedScribbit.id} is invalid and was preserved.`
        );
      }
      await transaction.multi();
      await queueStoredScribbit(transaction, ownerUserId, storedScribbit);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Scribbit storage');
      if (await storedScribbitMatches(storage, ownerUserId, storedScribbit)) {
        return;
      }
      throw error;
    }
  }

  throw new Error(`Scribbit ${scribbit.id} changed too often to save safely.`);
};

export const updateScribbit = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<void> => {
  if (scribbit.isFounding) {
    return;
  }

  const storedScribbit = prepareScribbitForStorage(scribbit);
  await setValidatedScribbitRecord(storage, storedScribbit);
};

type AliveScribbitMutationResult = {
  scribbit: Scribbit | undefined;
  changed: boolean;
};

type AliveScribbitMutationOptions = {
  additionalWatchedKeys?: string[];
  utcDateKey?: string;
};

const mutateAliveScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  mutate: (scribbit: Scribbit) => Scribbit | Promise<Scribbit>,
  options: AliveScribbitMutationOptions = {}
): Promise<AliveScribbitMutationResult> => {
  if (!storage.watch) {
    throw new Error('Atomic Scribbit mutations require transaction support.');
  }

  const scribbitKey = getScribbitKey(scribbitId);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        scribbitKey,
        ...(options.additionalWatchedKeys ?? [])
      );
      const scribbit = await loadScribbit(
        storage,
        scribbitId,
        options.utcDateKey
      );
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return { scribbit, changed: false };
      }

      const updatedScribbit = await mutate(scribbit);
      await transaction.multi();
      await transaction.set(scribbitKey, serializeScribbit(updatedScribbit));
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return { scribbit: updatedScribbit, changed: true };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Scribbit mutation');
      throw error;
    }
  }

  throw new Error(`Scribbit ${scribbitId} changed too often to update safely.`);
};

export type EquipGearResult =
  | Readonly<{ status: 'updated'; scribbit: Scribbit }>
  | Readonly<{ status: 'scribbit-unavailable' }>
  | Readonly<{ status: 'not-owned' }>
  | Readonly<{ status: 'invalid-gear' }>
  | Readonly<{ status: 'gear-undiscovered' }>;

export const equipGearForScribbit = async (
  storage: ArenaStorage,
  userId: string,
  request: EquipGearRequest
): Promise<EquipGearResult> => {
  if (!storage.watch) {
    throw new Error('Atomic Gear equipment requires transaction support.');
  }
  if (
    !isEquipmentCategory(request.category) ||
    (request.slotIndex !== 0 && request.slotIndex !== 1) ||
    (request.gearId !== null && !/^[a-z0-9-]{2,64}$/.test(request.gearId))
  ) {
    return { status: 'invalid-gear' };
  }

  const gear =
    request.gearId === null ? undefined : findGearCosmetic(request.gearId);
  if (request.gearId !== null && gear?.category !== request.category) {
    return { status: 'invalid-gear' };
  }

  const scribbitKey = getScribbitKey(request.scribbitId);
  const ownerKey = getScribbitOwnerKey(request.scribbitId);
  const inventoryKey = getInventoryKey(userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    let expectedScribbit: Scribbit | undefined;
    try {
      transaction = await storage.watch(scribbitKey, ownerKey, inventoryKey);
      const [storedScribbitJson, ownerUserId] = await Promise.all([
        storage.get(scribbitKey),
        storage.get(ownerKey),
      ]);
      const scribbit = parseScribbit(storedScribbitJson);
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return { status: 'scribbit-unavailable' };
      }
      if (ownerUserId !== userId) {
        await transaction.unwatch();
        return { status: 'not-owned' };
      }

      let equippedRank: GearRank = 1;
      if (request.gearId !== null) {
        const storedInventory = await storage.hGetAll(inventoryKey);
        const storedCopies = Number(storedInventory[request.gearId] ?? '0');
        const permanentlyDiscovered =
          storedInventory[getInventoryDiscoveryField(request.gearId)] === '1';
        const storedRank = Number(
          storedInventory[getInventoryGearRankField(request.gearId)]
        );
        const hasDurableGearRank = isGearRank(storedRank);
        if (hasDurableGearRank) equippedRank = storedRank;
        const hasLegacyOwnedCopy =
          Number.isSafeInteger(storedCopies) && storedCopies > 0;
        if (
          !permanentlyDiscovered &&
          !hasDurableGearRank &&
          !hasLegacyOwnedCopy
        ) {
          await transaction.unwatch();
          return { status: 'gear-undiscovered' };
        }
      }

      const projectedLoadout = validateCatalogEquipmentLoadout(
        equipGearInLoadout(scribbit.equipmentLoadout, request)
      );
      if (!projectedLoadout) {
        throw new Error(
          'Projected equipment loadout failed catalog validation.'
        );
      }
      expectedScribbit = prepareScribbitForStorage({
        ...scribbit,
        equipmentLoadout: projectedLoadout,
        gearRanks:
          request.gearId === null
            ? scribbit.gearRanks
            : {
                ...(scribbit.gearRanks ?? {}),
                [request.gearId]: equippedRank,
              },
      });
      await transaction.multi();
      await transaction.set(scribbitKey, serializeScribbit(expectedScribbit));
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return {
          status: 'updated',
          scribbit: cloneScribbit(expectedScribbit),
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Gear equipment');
      if (expectedScribbit) {
        const [storedAfterFailure, ownerAfterFailure] = await Promise.all([
          storage.get(scribbitKey),
          storage.get(ownerKey),
        ]);
        const recoveredScribbit = parseScribbit(storedAfterFailure);
        if (
          ownerAfterFailure === userId &&
          recoveredScribbit?.status === 'alive' &&
          JSON.stringify(recoveredScribbit.equipmentLoadout) ===
            JSON.stringify(expectedScribbit.equipmentLoadout) &&
          JSON.stringify(recoveredScribbit.gearRanks) ===
            JSON.stringify(expectedScribbit.gearRanks)
        ) {
          return {
            status: 'updated',
            scribbit: cloneScribbit(recoveredScribbit),
          };
        }
      }
      throw error;
    }
  }

  throw new Error(
    `Scribbit ${request.scribbitId} changed too often to equip Gear safely.`
  );
};

export const refreshEquippedGearRankForUser = async (
  storage: ArenaStorage,
  userId: string,
  gearId: string,
  rank: GearRank
): Promise<void> => {
  if (!storage.watch || !findGearCosmetic(gearId) || !isGearRank(rank)) {
    throw new Error('Refreshing forged Gear requires valid durable state.');
  }
  const rankedScribbits = await storage.zRange(
    getUserAliveScribbitsKey(userId),
    0,
    MAX_ALIVE_PER_USER + 10,
    { by: 'rank', reverse: true }
  );

  for (const { member: scribbitId } of rankedScribbits) {
    const scribbitKey = getScribbitKey(scribbitId);
    const ownerKey = getScribbitOwnerKey(scribbitId);
    let settled = false;
    for (
      let attempt = 0;
      attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
      attempt += 1
    ) {
      let transaction: ArenaTransaction | undefined;
      let expectedScribbit: Scribbit | undefined;
      try {
        transaction = await storage.watch(scribbitKey, ownerKey);
        const [storedScribbitJson, ownerUserId] = await Promise.all([
          storage.get(scribbitKey),
          storage.get(ownerKey),
        ]);
        const scribbit = parseScribbit(storedScribbitJson);
        if (!scribbit && storedScribbitJson !== undefined) {
          throw new Error(
            `Stored Scribbit ${scribbitId} is invalid and was preserved.`
          );
        }
        const wearsGear =
          scribbit?.status === 'alive' &&
          Object.values(scribbit.equipmentLoadout).some((slots) =>
            slots.includes(gearId)
          );
        if (!scribbit || ownerUserId !== userId || !wearsGear) {
          await transaction.unwatch();
          settled = true;
          break;
        }
        if (scribbit.gearRanks?.[gearId] === rank) {
          await transaction.unwatch();
          settled = true;
          break;
        }

        expectedScribbit = prepareScribbitForStorage({
          ...scribbit,
          gearRanks: { ...(scribbit.gearRanks ?? {}), [gearId]: rank },
        });
        await transaction.multi();
        await transaction.set(scribbitKey, serializeScribbit(expectedScribbit));
        const result = await transaction.exec();
        if (Array.isArray(result) && result.length > 0) {
          settled = true;
          break;
        }
      } catch (error) {
        await discardWatchedTransaction(transaction, 'Forged Gear refresh');
        const recoveredScribbit = parseScribbit(await storage.get(scribbitKey));
        if (
          expectedScribbit &&
          recoveredScribbit?.gearRanks?.[gearId] === rank
        ) {
          settled = true;
          break;
        }
        throw error;
      }
    }
    if (!settled) {
      throw new Error(
        `Scribbit ${scribbitId} changed too often to apply forged Gear.`
      );
    }
  }
};

export type DailyCareClaim = {
  claimed: boolean;
  careDoneToday: CareAction[];
  mood: Mood;
  xpGain: number;
};

export const claimDailyCareAction = async (
  storage: ArenaStorage,
  scribbitId: string,
  action: CareAction,
  utcDateKey: string,
  claimedAtMs: number
): Promise<DailyCareClaim> => {
  const careKey = getScribbitCareKey(scribbitId, utcDateKey);
  const createdCare = await storage.hSetNX(
    careKey,
    action,
    claimedAtMs.toString()
  );
  await storage.expire(careKey, dailyProgressTtlSeconds);
  const careDoneToday = await readCareDoneToday(
    storage,
    scribbitId,
    utcDateKey
  );
  const progression = planCareProgression(careDoneToday);

  return {
    claimed: createdCare === 1,
    careDoneToday,
    mood: progression.mood,
    xpGain: createdCare === 1 ? progression.xpGain : 0,
  };
};

export const releaseDailyCareAction = async (
  storage: ArenaStorage,
  scribbitId: string,
  action: CareAction,
  utcDateKey: string
): Promise<void> => {
  const careKey = getScribbitCareKey(scribbitId, utcDateKey);
  await storage.hDel(careKey, [action]);
  await storage.expire(careKey, dailyProgressTtlSeconds);
};

export const claimUserDailySparWinReward = async (
  storage: ArenaStorage,
  userId: string,
  utcDateKey: string,
  claimedAtMs: number
): Promise<boolean> => {
  const dailySparWinRewardsKey = getUserDailySparWinRewardsKey(userId);
  const createdDailyReward = await storage.hSetNX(
    dailySparWinRewardsKey,
    utcDateKey,
    claimedAtMs.toString()
  );
  await storage.expire(dailySparWinRewardsKey, dailyProgressTtlSeconds);
  return createdDailyReward === 1;
};

export type DailySparWinRewardResult = Readonly<{
  status: 'awarded' | 'already-awarded-this-report' | 'already-claimed';
  receipt: SparRewardReceipt | null;
}>;

const parseStoredDailySparReward = (
  value: string
): Readonly<{ reportId: string; receipt: SparRewardReceipt | null }> | null => {
  if (value.startsWith('report:')) {
    const reportId = value.slice('report:'.length);
    return reportId ? { reportId, receipt: null } : null;
  }
  try {
    const receipt: unknown = JSON.parse(value);
    return isSparRewardReceipt(receipt)
      ? { reportId: receipt.reportId, receipt }
      : null;
  } catch {
    return null;
  }
};

type DailySparRewardKeys = Readonly<{
  dailyRewardKey: string;
  scribbitKey: string;
  inkKey: string;
}>;

type DailySparRewardProjection = Readonly<{
  receipt: SparRewardReceipt;
  receiptValue: string;
  scribbitBeforeValue: string;
  scribbitAfterValue: string;
  inkBeforeValue: string | undefined;
  inkAfterValue: string;
}>;

const assertDailySparRewardStorageTypes = async (
  storage: ArenaStorage,
  keys: DailySparRewardKeys
): Promise<void> => {
  if (!storage.type) {
    throw new Error('Atomic spar rewards require Redis type checks.');
  }
  const [rewardType, scribbitType, inkType] = await Promise.all([
    storage.type(keys.dailyRewardKey),
    storage.type(keys.scribbitKey),
    storage.type(keys.inkKey),
  ]);
  if (
    (rewardType !== 'none' && rewardType !== 'hash') ||
    (scribbitType !== 'none' && scribbitType !== 'string') ||
    (inkType !== 'none' && inkType !== 'string')
  ) {
    throw new Error('Daily spar reward found incompatible stored data.');
  }
};

const dailySparRewardWasCommitted = async (
  storage: ArenaStorage,
  keys: DailySparRewardKeys,
  utcDateKey: string,
  projection: DailySparRewardProjection
): Promise<boolean> => {
  const [receiptValue, scribbitValue, inkValue] = await Promise.all([
    storage.hGet(keys.dailyRewardKey, utcDateKey),
    storage.get(keys.scribbitKey),
    storage.get(keys.inkKey),
  ]);
  return (
    receiptValue === projection.receiptValue &&
    scribbitValue === projection.scribbitAfterValue &&
    inkValue === projection.inkAfterValue
  );
};

const transactionCommandsSucceeded = (
  result: unknown,
  expectedCommandCount: number
): boolean => {
  return (
    Array.isArray(result) &&
    result.length === expectedCommandCount &&
    result.every((commandResult) => !(commandResult instanceof Error))
  );
};

const refreshDailySparRewardExpiry = async (
  storage: ArenaStorage,
  dailyRewardKey: string
): Promise<void> => {
  try {
    await storage.expire(dailyRewardKey, dailyProgressTtlSeconds);
  } catch (error) {
    console.warn('Daily spar reward expiry refresh failed:', error);
  }
};

const repairDailySparReward = async (
  storage: ArenaStorage,
  keys: DailySparRewardKeys,
  utcDateKey: string,
  projection: DailySparRewardProjection
): Promise<boolean> => {
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch!(
        keys.dailyRewardKey,
        keys.scribbitKey,
        keys.inkKey
      );
      await assertDailySparRewardStorageTypes(storage, keys);
      const [receiptValue, scribbitValue, inkValue] = await Promise.all([
        storage.hGet(keys.dailyRewardKey, utcDateKey),
        storage.get(keys.scribbitKey),
        storage.get(keys.inkKey),
      ]);
      if (
        (receiptValue !== undefined &&
          receiptValue !== projection.receiptValue) ||
        (scribbitValue !== projection.scribbitBeforeValue &&
          scribbitValue !== projection.scribbitAfterValue) ||
        (inkValue !== projection.inkBeforeValue &&
          inkValue !== projection.inkAfterValue)
      ) {
        await transaction.unwatch();
        return false;
      }

      await transaction.multi();
      await transaction.set(keys.scribbitKey, projection.scribbitAfterValue);
      await transaction.set(keys.inkKey, projection.inkAfterValue);
      await transaction.hSet(keys.dailyRewardKey, {
        [utcDateKey]: projection.receiptValue,
      });
      const result = await transaction.exec();
      if (transactionCommandsSucceeded(result, 3)) {
        await refreshDailySparRewardExpiry(storage, keys.dailyRewardKey);
        return true;
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Daily spar reward repair');
      if (
        await dailySparRewardWasCommitted(storage, keys, utcDateKey, projection)
      ) {
        await refreshDailySparRewardExpiry(storage, keys.dailyRewardKey);
        return true;
      }
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  return false;
};

const quarantineDailySparReward = async (
  storage: ArenaStorage,
  dailyRewardKey: string,
  utcDateKey: string,
  projection: DailySparRewardProjection
): Promise<void> => {
  const quarantineValue = `report:${projection.receipt.reportId}`;
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch!(dailyRewardKey);
      const currentValue = await storage.hGet(dailyRewardKey, utcDateKey);
      if (
        currentValue !== undefined &&
        currentValue !== projection.receiptValue &&
        currentValue !== quarantineValue
      ) {
        await transaction.unwatch();
        return;
      }
      if (currentValue === quarantineValue) {
        await transaction.unwatch();
        return;
      }
      await transaction.multi();
      await transaction.hSet(dailyRewardKey, {
        [utcDateKey]: quarantineValue,
      });
      const result = await transaction.exec();
      if (transactionCommandsSucceeded(result, 1)) {
        await refreshDailySparRewardExpiry(storage, dailyRewardKey);
        return;
      }
    } catch (error) {
      await discardWatchedTransaction(
        transaction,
        'Daily spar reward quarantine'
      );
      if (
        (await storage.hGet(dailyRewardKey, utcDateKey)) === quarantineValue
      ) {
        return;
      }
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) {
        console.error('Daily spar reward quarantine failed:', error);
      }
    }
  }
};

export const claimAndAwardDailySparWin = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    scribbitId: string;
    utcDateKey: string;
    reportId: string;
    inkAmount: number;
  }>
): Promise<DailySparWinRewardResult> => {
  if (!storage.watch || !storage.type) {
    throw new Error(
      'Atomic spar rewards require transaction support and Redis type checks.'
    );
  }
  if (
    !input.reportId ||
    input.reportId.length > 128 ||
    !Number.isSafeInteger(input.inkAmount) ||
    input.inkAmount <= 0
  ) {
    throw new Error('Spar reward input is invalid.');
  }

  const keys: DailySparRewardKeys = {
    dailyRewardKey: getUserDailySparWinRewardsKey(input.userId),
    scribbitKey: getScribbitKey(input.scribbitId),
    inkKey: getInkKey(input.userId),
  };

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    let projection: DailySparRewardProjection | undefined;
    try {
      transaction = await storage.watch(
        keys.dailyRewardKey,
        keys.scribbitKey,
        keys.inkKey
      );
      await assertDailySparRewardStorageTypes(storage, keys);
      const existingReceipt = await storage.hGet(
        keys.dailyRewardKey,
        input.utcDateKey
      );
      if (existingReceipt !== undefined) {
        await transaction.unwatch();
        const storedReward = parseStoredDailySparReward(existingReceipt);
        return storedReward?.reportId === input.reportId
          ? {
              status: 'already-awarded-this-report',
              receipt: storedReward.receipt,
            }
          : { status: 'already-claimed', receipt: null };
      }

      const [scribbitValue, inkValue] = await Promise.all([
        storage.get(keys.scribbitKey),
        storage.get(keys.inkKey),
      ]);
      const scribbit = parseScribbit(scribbitValue);
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return { status: 'already-claimed', receipt: null };
      }
      const inkBalance = Number(inkValue ?? '0');
      if (!Number.isSafeInteger(inkBalance) || inkBalance < 0) {
        throw new Error('Stored Ink balance is invalid.');
      }
      const rewardedScribbit = addXpToScribbit(scribbit, XP_REWARDS.sparWin);
      const rewardReceipt = createSparRewardReceipt({
        reportId: input.reportId,
        scribbitId: input.scribbitId,
        xpBefore: scribbit.xp,
        xpAfter: rewardedScribbit.xp,
        inkAwarded: input.inkAmount,
      });
      projection = {
        receipt: rewardReceipt,
        receiptValue: JSON.stringify(rewardReceipt),
        scribbitBeforeValue: scribbitValue!,
        scribbitAfterValue: serializeScribbit(rewardedScribbit),
        inkBeforeValue: inkValue,
        inkAfterValue: (inkBalance + input.inkAmount).toString(),
      };
      await transaction.multi();
      await transaction.set(keys.scribbitKey, projection.scribbitAfterValue);
      await transaction.set(keys.inkKey, projection.inkAfterValue);
      await transaction.hSet(keys.dailyRewardKey, {
        [input.utcDateKey]: projection.receiptValue,
      });
      const result = await transaction.exec();
      if (transactionCommandsSucceeded(result, 3)) {
        await refreshDailySparRewardExpiry(storage, keys.dailyRewardKey);
        return { status: 'awarded', receipt: rewardReceipt };
      }
      if (Array.isArray(result) && result.length > 0) {
        if (
          (await dailySparRewardWasCommitted(
            storage,
            keys,
            input.utcDateKey,
            projection
          )) ||
          (await repairDailySparReward(
            storage,
            keys,
            input.utcDateKey,
            projection
          ))
        ) {
          await refreshDailySparRewardExpiry(storage, keys.dailyRewardKey);
          return { status: 'awarded', receipt: rewardReceipt };
        }
        throw new Error('Daily spar reward could not be repaired safely.');
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Daily spar reward');
      if (
        projection &&
        ((await dailySparRewardWasCommitted(
          storage,
          keys,
          input.utcDateKey,
          projection
        )) ||
          (await repairDailySparReward(
            storage,
            keys,
            input.utcDateKey,
            projection
          )))
      ) {
        await refreshDailySparRewardExpiry(storage, keys.dailyRewardKey);
        return {
          status: 'already-awarded-this-report',
          receipt: projection.receipt,
        };
      }
      if (projection) {
        // Exact payout state could not be proven. Replace any partial modern
        // receipt with a no-payout marker so retries cannot duplicate or claim
        // an unverifiable reward, then preserve the original failure.
        await quarantineDailySparReward(
          storage,
          keys.dailyRewardKey,
          input.utcDateKey,
          projection
        );
        throw error;
      }
      const storedReceipt = await storage.hGet(
        keys.dailyRewardKey,
        input.utcDateKey
      );
      const storedReward =
        storedReceipt === undefined
          ? null
          : parseStoredDailySparReward(storedReceipt);
      if (storedReward?.reportId === input.reportId) {
        return {
          status: 'already-awarded-this-report',
          receipt: storedReward.receipt,
        };
      }
      throw error;
    }
  }
  throw new Error('Daily spar reward changed too often to award safely.');
};

export const awardScribbitXp = async (
  storage: ArenaStorage,
  scribbitId: string,
  xpGain: number,
  utcDateKey = formatUtcDateKey(new Date())
): Promise<Scribbit | undefined> => {
  const result = await mutateAliveScribbit(
    storage,
    scribbitId,
    (scribbit) => addXpToScribbit(scribbit, xpGain),
    { utcDateKey }
  );
  return result.scribbit;
};

export const applyBattleOutcomeToScribbit = (
  scribbit: Scribbit,
  outcome: 'win' | 'loss',
  winnerXpGain: number
): Scribbit => {
  if (scribbit.status !== 'alive') return cloneScribbit(scribbit);
  return addXpToScribbit(
    {
      ...scribbit,
      wins: outcome === 'win' ? scribbit.wins + 1 : scribbit.wins,
      losses: outcome === 'loss' ? scribbit.losses + 1 : scribbit.losses,
    },
    outcome === 'win' ? winnerXpGain : 0
  );
};

export const recordBattleOutcomeOnScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  outcome: 'win' | 'loss',
  winnerXpGain: number
): Promise<Scribbit | undefined> => {
  const result = await mutateAliveScribbit(storage, scribbitId, (scribbit) =>
    applyBattleOutcomeToScribbit(scribbit, outcome, winnerXpGain)
  );
  return result.scribbit;
};

export const recordRumbleStandingOnScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  resolvedDay: number,
  wins: number,
  losses: number,
  winnerXpGain: number
): Promise<Scribbit | undefined> => {
  if (!storage.watch) {
    throw new Error('Atomic Rumble standings require transaction support.');
  }

  const scribbitKey = getScribbitKey(scribbitId);
  const receiptKey = getRumbleStandingReceiptKey(scribbitId);
  const receiptField = resolvedDay.toString();
  const receiptValue = `${wins}:${losses}:${winnerXpGain}`;
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(scribbitKey, receiptKey);
      const [existingReceipt, scribbit] = await Promise.all([
        storage.hGet(receiptKey, receiptField),
        loadScribbit(storage, scribbitId),
      ]);
      if (existingReceipt !== undefined) {
        await transaction.unwatch();
        return scribbit;
      }
      if (!scribbit) {
        await transaction.unwatch();
        return undefined;
      }

      const updatedScribbit =
        !scribbit.isFounding && scribbit.status === 'alive'
          ? addXpToScribbit(
              {
                ...scribbit,
                wins: scribbit.wins + Math.max(0, Math.floor(wins)),
                losses: scribbit.losses + Math.max(0, Math.floor(losses)),
              },
              winnerXpGain
            )
          : scribbit;

      await transaction.multi();
      if (updatedScribbit && !updatedScribbit.isFounding) {
        await transaction.set(scribbitKey, serializeScribbit(updatedScribbit));
      }
      await transaction.hSet(receiptKey, {
        [receiptField]: receiptValue,
      });
      await transaction.expire(receiptKey, dailyProgressTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return updatedScribbit;
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Scribbit mutation');
      throw error;
    }
  }

  throw new Error(
    `Rumble standing for ${scribbitId} changed too often to record safely.`
  );
};

export type RumbleStandingReceipt = Readonly<{
  wins: number;
  losses: number;
  xpAwarded: number;
}>;

export const loadRumbleStandingReceipt = async (
  storage: ArenaStorage,
  scribbitId: string,
  resolvedDay: number
): Promise<RumbleStandingReceipt | null> => {
  if (!Number.isSafeInteger(resolvedDay) || resolvedDay < 1) return null;
  const stored = await storage.hGet(
    getRumbleStandingReceiptKey(scribbitId),
    resolvedDay.toString()
  );
  if (stored === undefined) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return null;
  const wins = Number(parts[0]);
  const losses = Number(parts[1]);
  const xpAwarded = Number(parts[2]);
  if (
    !Number.isSafeInteger(wins) ||
    wins < 0 ||
    !Number.isSafeInteger(losses) ||
    losses < 0 ||
    !Number.isSafeInteger(xpAwarded) ||
    xpAwarded < 0
  ) {
    return null;
  }
  return { wins, losses, xpAwarded };
};

export const getScribbitOwner = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<string | undefined> => {
  return await storage.get(getScribbitOwnerKey(scribbitId));
};

export const isScribbitOwnedByUser = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string
): Promise<boolean> => {
  return (await getScribbitOwner(storage, scribbitId)) === userId;
};

const sortNewestFirst = (left: Scribbit, right: Scribbit): number => {
  if (left.bornDay !== right.bornDay) {
    return right.bornDay - left.bornDay;
  }

  return right.id.localeCompare(left.id);
};

export const getAliveScribbitsForUser = async (
  storage: ArenaStorage,
  userId: string
): Promise<Scribbit[]> => {
  const rankedScribbits = await storage.zRange(
    getUserAliveScribbitsKey(userId),
    0,
    MAX_ALIVE_PER_USER + 10,
    { by: 'rank', reverse: true }
  );
  const scribbits = await loadScribbits(
    storage,
    rankedScribbits.map((entry) => entry.member)
  );
  const ownedScribbits = await Promise.all(
    scribbits.map(async (scribbit) => ({
      scribbit,
      isOwnedByUser: (await getScribbitOwner(storage, scribbit.id)) === userId,
    }))
  );

  return ownedScribbits
    .filter(
      ({ scribbit, isOwnedByUser }) =>
        isOwnedByUser && scribbit.status === 'alive'
    )
    .map(({ scribbit }) => scribbit)
    .sort(sortNewestFirst);
};

export const enforceAliveScribbitLimit = async (
  storage: ArenaStorage,
  userId: string,
  currentArenaDay: number
): Promise<boolean> => {
  const aliveScribbits = await getAliveScribbitsForUser(storage, userId);
  const growingCount = aliveScribbits.filter(
    (scribbit) => scribbit.expiresDay > currentArenaDay
  ).length;
  return growingCount < MAX_GROWING_PER_USER;
};

export const getUserScribbitIds = async (
  storage: ArenaStorage,
  userId: string,
  limit: number,
  offset = 0
): Promise<string[]> => {
  if (limit <= 0) return [];
  const rankedScribbits = await storage.zRange(
    getUserScribbitsKey(userId),
    offset,
    offset + Math.max(0, limit) - 1,
    { by: 'rank', reverse: true }
  );
  return rankedScribbits.map((entry) => entry.member);
};

export const hasUserCreatedScribbit = async (
  storage: ArenaStorage,
  userId: string
): Promise<boolean> => {
  const creationStateKey = getUserHasCreatedScribbitKey(userId);
  if ((await storage.get(creationStateKey)) === '1') return true;

  // Older accounts predate the explicit marker. Their permanent owner index
  // is authoritative, and the one-time backfill keeps the answer durable even
  // if every individual Scribbit is later removed.
  if ((await getUserScribbitIds(storage, userId, 1)).length === 0) return false;
  await storage.set(creationStateKey, '1');
  return true;
};

export const getDailyFlags = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<DailyFlags> => {
  const storedFlags = await storage.hGetAll(getDailyFlagsKey(userId, day));

  return {
    drawnToday: storedFlags.drawn !== undefined,
    enteredToday: storedFlags.entered !== undefined,
    bossChallengedToday: storedFlags.bossChallenge !== undefined,
  };
};

export const markDailyFlag = async (
  storage: ArenaStorage,
  userId: string,
  day: number,
  field: DailyFlagField
): Promise<boolean> => {
  const dailyFlagsKey = getDailyFlagsKey(userId, day);
  const createdFlag = await storage.hSetNX(dailyFlagsKey, field, '1');
  await storage.expire(dailyFlagsKey, DAILY_FLAG_TTL_SECONDS);
  return createdFlag === 1;
};

export const addRumbleEntrant = async (
  storage: ArenaStorage,
  day: number,
  scribbitId: string
): Promise<void> => {
  await storage.zAdd(getRumbleKey(day), {
    member: scribbitId,
    score: Date.now(),
  });
};

export const getRumbleEntrantIds = async (
  storage: ArenaStorage,
  day: number,
  options: { limit?: number; reverse?: boolean } = {}
): Promise<string[]> => {
  const stop =
    options.limit === undefined ? -1 : Math.max(0, options.limit - 1);
  const entries = await storage.zRange(getRumbleKey(day), 0, stop, {
    by: 'rank',
    reverse: options.reverse,
  });
  return entries.map((entry) => entry.member);
};

export const getRumbleEntrantCount = async (
  storage: ArenaStorage,
  day: number
): Promise<number> => {
  return await storage.zCard(getRumbleKey(day));
};

export const addLegend = async (
  storage: ArenaStorage,
  scribbit: Scribbit,
  day: number
): Promise<void> => {
  await storage.zAdd(getLegendsKey(), {
    member: scribbit.id,
    score: day,
  });
};

export const getLegendIds = async (
  storage: ArenaStorage,
  limit: number,
  offset = 0
): Promise<string[]> => {
  const safeLimit = Math.max(0, Math.floor(limit));
  const safeOffset = Math.max(0, Math.floor(offset));
  if (safeLimit === 0) return [];

  const rankedLegends = await storage.zRange(
    getLegendsKey(),
    safeOffset,
    safeOffset + safeLimit - 1,
    {
      by: 'rank',
      reverse: true,
    }
  );
  return rankedLegends.map((entry) => entry.member);
};

export const getLegends = async (
  storage: ArenaStorage,
  limit: number,
  offset = 0
): Promise<Scribbit[]> => {
  const legendIds = await getLegendIds(storage, limit, offset);
  const scribbits = await loadScribbits(storage, legendIds);

  return scribbits.filter((scribbit) => scribbit.status === 'legend');
};

export const getCommunityLegendCount = async (
  storage: ArenaStorage
): Promise<number> => {
  return await storage.zCard(getLegendsKey());
};

export const resolveExpiredScribbitStatus = (
  scribbit: Scribbit,
  options: {
    creatorTitle?: LegacyCosmeticSnapshot | null;
    archivedDay?: number;
  } = {}
): Scribbit => {
  if (scribbit.status !== 'alive' || scribbit.isFounding) {
    return cloneScribbit(scribbit);
  }

  let expiredScribbit: Scribbit;
  if (
    scribbit.belief >= BELIEF_LEGEND_THRESHOLD ||
    scribbit.legendTitle !== null
  ) {
    expiredScribbit = {
      ...scribbit,
      status: 'legend',
      legendTitle:
        scribbit.legendTitle ?? `Believed by ${scribbit.belief} arena weirdos`,
    };
  } else {
    expiredScribbit = {
      ...scribbit,
      status: 'faded',
    };
  }

  return {
    ...expiredScribbit,
    legacy: createScribbitLegacy(expiredScribbit, options),
  };
};

export type ExpireDueScribbitsOptions = {
  getCreatorTitle?: (
    ownerUserId: string
  ) => Promise<LegacyCosmeticSnapshot | null>;
  getCreatorTitleWatchKey?: (ownerUserId: string) => string;
};

export type RetireOwnedScribbitResult =
  | Readonly<{ status: 'retired'; scribbit: Scribbit }>
  | Readonly<{ status: 'already-retired'; scribbit: Scribbit }>
  | Readonly<{ status: 'scribbit-unavailable' }>
  | Readonly<{ status: 'not-owned' }>
  | Readonly<{ status: 'entered-today' }>;

const fileArchivedScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbit: Scribbit,
  currentArenaDay: number
): Promise<void> => {
  if (!scribbit.legacy || scribbit.status === 'alive') return;

  await storage.zRem(getUserAliveScribbitsKey(ownerUserId), [scribbit.id]);
  await storage.zRem(getExpiringScribbitsKey(), [scribbit.id]);
  await storage.zRem(getRumbleKey(currentArenaDay), [scribbit.id]);
  await storage.zAdd(getUserLegacyCardsKey(ownerUserId), {
    member: scribbit.id,
    score: scribbit.legacy.archivedDay,
  });

  if (scribbit.status === 'legend') {
    await addLegend(storage, scribbit, scribbit.legacy.archivedDay);
  }
};

export const retireOwnedScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbitId: string,
  currentArenaDay: number,
  options: ExpireDueScribbitsOptions = {}
): Promise<RetireOwnedScribbitResult> => {
  const scribbit = await loadScribbit(storage, scribbitId);
  if (!scribbit || scribbit.isFounding) {
    return { status: 'scribbit-unavailable' };
  }
  if ((await getScribbitOwner(storage, scribbitId)) !== ownerUserId) {
    return { status: 'not-owned' };
  }
  if (scribbit.status !== 'alive') {
    await fileArchivedScribbit(storage, ownerUserId, scribbit, currentArenaDay);
    return { status: 'already-retired', scribbit };
  }
  if (
    (await storage.zScore(getRumbleKey(currentArenaDay), scribbitId)) !==
    undefined
  ) {
    return { status: 'entered-today' };
  }

  const titleWatchKey = options.getCreatorTitle
    ? options.getCreatorTitleWatchKey?.(ownerUserId)
    : undefined;
  if (options.getCreatorTitle && !titleWatchKey) {
    throw new Error('Legacy title snapshots require an inventory watch key.');
  }

  const transition = await mutateAliveScribbit(
    storage,
    scribbitId,
    async (currentScribbit) => {
      const creatorTitle = options.getCreatorTitle
        ? await options.getCreatorTitle(ownerUserId)
        : null;
      return resolveExpiredScribbitStatus(currentScribbit, {
        creatorTitle,
        archivedDay: currentArenaDay,
      });
    },
    {
      additionalWatchedKeys: [
        getScribbitBeliefVersionKey(scribbitId),
        ...(titleWatchKey ? [titleWatchKey] : []),
      ],
    }
  );

  if (!transition.scribbit || transition.scribbit.status === 'alive') {
    return { status: 'scribbit-unavailable' };
  }
  await fileArchivedScribbit(
    storage,
    ownerUserId,
    transition.scribbit,
    currentArenaDay
  );
  return {
    status: transition.changed ? 'retired' : 'already-retired',
    scribbit: transition.scribbit,
  };
};

export const expireDueScribbits = async (
  storage: ArenaStorage,
  day: number,
  options: ExpireDueScribbitsOptions = {}
): Promise<{ faded: number; legends: number }> => {
  let faded = 0;
  let legends = 0;
  const batchSize = 200;

  while (true) {
    const firstEntries = await storage.zRange(
      getExpiringScribbitsKey(),
      0,
      batchSize - 1,
      { by: 'rank' }
    );
    const dueEntries = firstEntries.filter((entry) => entry.score <= day);
    if (dueEntries.length === 0) break;

    for (const entry of dueEntries) {
      const scribbit = await loadScribbit(storage, entry.member);
      if (!scribbit || scribbit.isFounding) {
        await storage.zRem(getExpiringScribbitsKey(), [entry.member]);
        continue;
      }

      const ownerUserId = await getScribbitOwner(storage, scribbit.id);

      // A previous worker may have committed the archive snapshot and stopped
      // before filing its owner/public indexes. Keep the queue entry as the
      // recovery receipt until those idempotent writes finish.
      if (scribbit.status !== 'alive') {
        if (ownerUserId && scribbit.legacy) {
          await fileArchivedScribbit(storage, ownerUserId, scribbit, day);
        } else {
          await storage.zRem(getExpiringScribbitsKey(), [entry.member]);
        }
        continue;
      }

      // Reaching expiresDay now means maturity: the Scribbit remains active,
      // keeps its locked base build, and can use Gear in the Mature Arena.
      // Remove the one-shot maturity queue entry before enforcing the owner's
      // bounded mature roster. A fourth mature Scribbit retires the oldest one
      // into the immutable archive; no drawing is ever discarded.
      await storage.zRem(getExpiringScribbitsKey(), [entry.member]);
      if (!ownerUserId) continue;

      const matureScribbits = (
        await getAliveScribbitsForUser(storage, ownerUserId)
      )
        .filter((candidate) => candidate.expiresDay <= day)
        .sort((left, right) => {
          if (left.expiresDay !== right.expiresDay) {
            return left.expiresDay - right.expiresDay;
          }
          if (left.bornDay !== right.bornDay) {
            return left.bornDay - right.bornDay;
          }
          return left.id.localeCompare(right.id);
        });
      const archiveCount = Math.max(
        0,
        matureScribbits.length - MAX_MATURE_PER_USER
      );

      for (const matureScribbit of matureScribbits.slice(0, archiveCount)) {
        const titleWatchKey =
          ownerUserId && options.getCreatorTitle
            ? options.getCreatorTitleWatchKey?.(ownerUserId)
            : undefined;
        if (ownerUserId && options.getCreatorTitle && !titleWatchKey) {
          throw new Error(
            'Legacy title snapshots require an inventory watch key.'
          );
        }
        const transition = await mutateAliveScribbit(
          storage,
          matureScribbit.id,
          async (currentScribbit) => {
            // This lookup runs after WATCH. A transient failure or concurrent
            // equip change aborts without filing an incomplete/stale card.
            const creatorTitle =
              ownerUserId && options.getCreatorTitle
                ? await options.getCreatorTitle(ownerUserId)
                : null;
            return resolveExpiredScribbitStatus(currentScribbit, {
              creatorTitle,
              archivedDay: day,
            });
          },
          {
            additionalWatchedKeys: [
              getScribbitBeliefVersionKey(matureScribbit.id),
              ...(titleWatchKey ? [titleWatchKey] : []),
            ],
          }
        );
        if (!transition.scribbit) {
          continue;
        }
        const expiredScribbit = transition.scribbit;
        const transitionedAtExpiry = transition.changed;

        await fileArchivedScribbit(storage, ownerUserId, expiredScribbit, day);

        if (expiredScribbit.status === 'legend') {
          await addLegend(
            storage,
            expiredScribbit,
            expiredScribbit.legacy?.archivedDay ?? expiredScribbit.expiresDay
          );
          if (transitionedAtExpiry) legends += 1;
        } else if (expiredScribbit.status === 'faded' && transitionedAtExpiry) {
          faded += 1;
        }
      }
    }
  }

  return { faded, legends };
};

const readCommittedBelief = async (
  storage: ArenaStorage,
  scribbitId: string,
  utcDateKey: string
): Promise<number> => {
  return (await loadScribbit(storage, scribbitId, utcDateKey))?.belief ?? 0;
};

export const applyDailyBelief = async (
  storage: ArenaStorage,
  input: Readonly<{
    scribbitId: string;
    userId: string;
    utcDateKey: string;
    currentArenaDay: number;
    operationId: string;
    operationStartedAtMs?: number;
  }>
): Promise<ApplyDailyBeliefResult> => {
  if (!storage.watch) {
    throw new Error('Atomic Belief requires transaction support.');
  }

  const operationStartedAtMs = input.operationStartedAtMs ?? Date.now();
  const receiptKey = getDailyBeliefReceiptKey(
    input.scribbitId,
    input.userId,
    input.utcDateKey
  );
  const legacyReceiptKey = getScribbitBeliefVotersKey(input.scribbitId);
  const legacyReceiptField = `${input.userId}:${input.utcDateKey}`;
  const userTargetsKey = getUserDailyBeliefTargetsKey(
    input.userId,
    input.utcDateKey
  );
  const legacyUserTargetsKey = getUserBeliefTargetsKey(input.userId);
  const scribbitKey = getScribbitKey(input.scribbitId);
  const ownerKey = getScribbitOwnerKey(input.scribbitId);
  const beliefVersionKey = getScribbitBeliefVersionKey(input.scribbitId);
  const isFoundingScribbit =
    findFoundingScribbit(input.scribbitId) !== undefined;
  const aggregateBeliefKey = isFoundingScribbit
    ? getFoundingBeliefKey()
    : getCommunityBeliefKey();
  // Capture the voter generation before any migration housekeeping and keep it
  // immutable across retries so a concurrent erasure cannot become an ABA.
  const deletionLockKey = getPlayerDataDeletionLockKey(input.userId);
  const dataGenerationKey = getPlayerDataGenerationKey(input.userId);
  const initialDataGeneration = await readPlayerDataGeneration(
    storage,
    input.userId
  );
  const migrationStartedAtMs = await ensureMigrationStartedAt(
    storage,
    'belief-receipt-v2',
    operationStartedAtMs
  );
  const shouldWriteLegacyBelief = migrationWindowIsOpen(
    migrationStartedAtMs,
    operationStartedAtMs,
    ROLLOUT_OVERLAP_MILLISECONDS
  );
  const shouldReadLegacyReceipt = migrationWindowIsOpen(
    migrationStartedAtMs,
    operationStartedAtMs,
    ROLLOUT_OVERLAP_MILLISECONDS + LEGACY_BELIEF_RECEIPT_MILLISECONDS
  );
  // Legacy keys carry their own bounded TTL. Once reads and writes stop, Redis
  // drains them without request-path deletes racing older workers.

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        receiptKey,
        ...(shouldReadLegacyReceipt ? [legacyReceiptKey] : []),
        scribbitKey,
        ownerKey,
        beliefVersionKey,
        deletionLockKey,
        dataGenerationKey
      );
      const [
        storedOperationId,
        legacyReceipt,
        ownerUserId,
        currentScribbit,
        activeDeletionToken,
        currentDataGeneration,
      ] = await Promise.all([
        storage.get(receiptKey),
        shouldReadLegacyReceipt
          ? storage.hGet(legacyReceiptKey, legacyReceiptField)
          : Promise.resolve(undefined),
        storage.get(ownerKey),
        loadScribbit(storage, input.scribbitId, input.utcDateKey),
        storage.get(deletionLockKey),
        readPlayerDataGeneration(storage, input.userId),
      ]);

      if (
        activeDeletionToken !== undefined ||
        currentDataGeneration !== initialDataGeneration
      ) {
        await transaction.unwatch();
        return { status: 'user-data-changing' };
      }

      if (storedOperationId !== undefined || legacyReceipt !== undefined) {
        await transaction.unwatch();
        if (storedOperationId === input.operationId) {
          return {
            status: 'applied',
            belief: currentScribbit?.belief ?? 0,
          };
        }
        return { status: 'already-believed' };
      }
      if (
        !currentScribbit ||
        currentScribbit.status !== 'alive' ||
        currentScribbit.expiresDay <= input.currentArenaDay
      ) {
        await transaction.unwatch();
        return { status: 'target-unavailable' };
      }
      if (ownerUserId === input.userId) {
        await transaction.unwatch();
        return { status: 'self-belief' };
      }

      await transaction.multi();
      await transaction.set(receiptKey, input.operationId);
      await transaction.expire(receiptKey, beliefReceiptTtlSeconds);
      await transaction.hSet(userTargetsKey, {
        [input.scribbitId]: input.operationId,
      });
      await transaction.expire(userTargetsKey, userBeliefTargetsTtlSeconds);
      if (shouldWriteLegacyBelief) {
        // Keep old in-flight workers coherent only during the explicit overlap.
        await transaction.hSetNX(
          legacyReceiptKey,
          legacyReceiptField,
          input.operationId
        );
        await transaction.expire(legacyReceiptKey, beliefReceiptTtlSeconds);
        await transaction.hSet(legacyUserTargetsKey, {
          [input.scribbitId]: input.utcDateKey,
        });
        await transaction.expire(
          legacyUserTargetsKey,
          userBeliefTargetsTtlSeconds
        );
      }
      if (!isFoundingScribbit) {
        await transaction.hSetNX(
          aggregateBeliefKey,
          input.scribbitId,
          currentScribbit.belief.toString()
        );
      }
      await transaction.hIncrBy(aggregateBeliefKey, input.scribbitId, 1);
      await transaction.incrBy(beliefVersionKey, 1);
      const result = await transaction.exec();
      const legacyCommandCount = shouldWriteLegacyBelief ? 4 : 0;
      const beliefResultIndex =
        4 + legacyCommandCount + (isFoundingScribbit ? 0 : 1);
      const expectedResultCount =
        4 + legacyCommandCount + (isFoundingScribbit ? 2 : 3);
      if (Array.isArray(result) && result.length >= expectedResultCount) {
        const belief = Number(result[beliefResultIndex]);
        return {
          status: 'applied',
          belief: Number.isFinite(belief) ? belief : currentScribbit.belief + 1,
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Scribbit mutation');
      const storedOperationId = await storage.get(receiptKey);
      if (storedOperationId === input.operationId) {
        return {
          status: 'applied',
          belief: await readCommittedBelief(
            storage,
            input.scribbitId,
            input.utcDateKey
          ),
        };
      }
      if (storedOperationId !== undefined) {
        return { status: 'already-believed' };
      }
      throw error;
    }
  }

  throw new Error(
    `Belief for ${input.scribbitId} changed too often to update safely.`
  );
};

export const removeUserBeliefReceipts = async (
  storage: ArenaStorage,
  userId: string,
  currentUtcDateKey = formatUtcDateKey(new Date()),
  observedAtMs = Date.now()
): Promise<void> => {
  const migrationStartedAtMs = await ensureMigrationStartedAt(
    storage,
    'belief-receipt-v2',
    observedAtMs
  );
  const shouldReadLegacyPrivacy = migrationWindowIsOpen(
    migrationStartedAtMs,
    observedAtMs,
    ROLLOUT_OVERLAP_MILLISECONDS + LEGACY_BELIEF_PRIVACY_MILLISECONDS
  );
  const legacyTargetsKey = getUserBeliefTargetsKey(userId);
  if (shouldReadLegacyPrivacy) {
    const legacyTargets = await storage.hGetAll(legacyTargetsKey);
    for (const scribbitId of Object.keys(legacyTargets)) {
      const legacyReceiptKey = getScribbitBeliefVotersKey(scribbitId);
      const ownedReceiptFields = (await storage.hKeys(legacyReceiptKey)).filter(
        (field) => field.startsWith(`${userId}:`)
      );
      if (ownedReceiptFields.length > 0) {
        await storage.hDel(legacyReceiptKey, ownedReceiptFields);
      }
    }
  }
  await storage.del(legacyTargetsKey);

  const year = Number(currentUtcDateKey.slice(0, 4));
  const month = Number(currentUtcDateKey.slice(4, 6));
  const day = Number(currentUtcDateKey.slice(6, 8));
  const currentDate = new Date(Date.UTC(year, month - 1, day));
  if (formatUtcDateKey(currentDate) !== currentUtcDateKey) {
    throw new Error('Belief privacy cleanup requires a valid UTC date key.');
  }

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const receiptDate = new Date(currentDate);
    receiptDate.setUTCDate(receiptDate.getUTCDate() - dayOffset);
    const utcDateKey = formatUtcDateKey(receiptDate);
    const dailyTargetsKey = getUserDailyBeliefTargetsKey(userId, utcDateKey);
    const dailyTargets = await storage.hGetAll(dailyTargetsKey);
    const receiptKeys = Object.keys(dailyTargets).map((scribbitId) => {
      return getDailyBeliefReceiptKey(scribbitId, userId, utcDateKey);
    });
    if (receiptKeys.length > 0) await storage.del(...receiptKeys);
    await storage.del(dailyTargetsKey);
  }
};

export const crownScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  legendTitle: string
): Promise<Scribbit | undefined> => {
  const result = await mutateAliveScribbit(storage, scribbitId, (scribbit) => ({
    ...scribbit,
    legendTitle,
  }));
  return result.scribbit;
};
