import type {
  ArenaState,
  AttachedAccessory,
  CareAction,
  Element,
  LegacyCosmeticSnapshot,
  Mood,
  Scribbit,
  ScribbitLegacy,
  ScribbitStats,
  SubmitScribbitRequest,
} from '../../shared/arena';
import { PNG } from 'pngjs';
import {
  ACCESSORY_BASE_SIZE,
  BELIEF_LEGEND_THRESHOLD,
  LEVEL_XP_THRESHOLDS,
  LIFESPAN_DAYS,
  MAX_ALIVE_PER_USER,
  MAX_ACCESSORIES_PER_SCRIBBIT,
  MAX_ACCESSORY_ROTATION,
  MAX_ACCESSORY_SCALE,
  MAX_LEVEL,
  MIN_ACCESSORY_ROTATION,
  MIN_ACCESSORY_SCALE,
  STAT_BUDGET,
  STAT_MAX,
  STAT_MIN,
} from '../../shared/arena';
import { formatUtcDateKey } from './day';
import { isElement } from './forecast';
import { findInkCatalogEntry, isAccessoryCatalogEntry } from './ink';
import { findFoundingScribbit } from './species';

export type SortedSetEntry = {
  member: string;
  score: number;
};

export type ArenaTransaction = {
  multi: () => Promise<void>;
  exec: () => Promise<unknown[]>;
  discard: () => Promise<void>;
  unwatch: () => Promise<unknown>;
  incrBy: (key: string, value: number) => Promise<unknown>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hSetNX: (key: string, field: string, value: string) => Promise<unknown>;
  hIncrBy: (key: string, field: string, value: number) => Promise<unknown>;
  zIncrBy: (key: string, member: string, value: number) => Promise<unknown>;
};

export type ArenaStorage = {
  watch?: (...keys: string[]) => Promise<ArenaTransaction>;
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  incrBy: (key: string, value: number) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hGet: (key: string, field: string) => Promise<string | undefined>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hSetNX: (key: string, field: string, value: string) => Promise<number>;
  hDel: (key: string, fields: string[]) => Promise<number>;
  hIncrBy: (key: string, field: string, value: number) => Promise<number>;
  zAdd: (key: string, ...members: SortedSetEntry[]) => Promise<unknown>;
  zCard: (key: string) => Promise<number>;
  zRange: (
    key: string,
    start: number | string,
    stop: number | string,
    options?: { by: 'rank' | 'score' | 'lex'; reverse?: boolean }
  ) => Promise<SortedSetEntry[]>;
  zRem: (key: string, members: string[]) => Promise<unknown>;
  zScore: (key: string, member: string) => Promise<number | undefined>;
  zRank: (key: string, member: string) => Promise<number | undefined>;
  zIncrBy: (key: string, member: string, value: number) => Promise<number>;
};

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
  accessories: AttachedAccessory[];
};

export type DailyFlags = Pick<
  ArenaState,
  'drawnToday' | 'enteredToday' | 'bossChallengedToday'
>;

export type DailyFlagField = 'drawn' | 'entered' | 'bossChallenge';

const pngDataUrlPrefix = 'data:image/png;base64,';
const maximumDrawingBytes = 400 * 1024;
const maximumDrawingBase64Characters = Math.ceil(maximumDrawingBytes / 3) * 4;
const drawingCanvasSize = 512;
const minimumPngHeaderBytes = 33;
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const visiblePixelTolerance = 1;
const accessoryAntialiasPaddingPixels = 1;
const dailyFlagTtlSeconds = 8 * 24 * 60 * 60;
const dailyProgressTtlSeconds = 8 * 24 * 60 * 60;
const maximumScribbitTransactionAttempts = 5;
const careActionOrder: CareAction[] = ['feed', 'pat', 'train'];
const statNames: Array<keyof ScribbitStats> = [
  'chonk',
  'spike',
  'zip',
  'charm',
];
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

const clampNumber = (
  value: number,
  minimum: number,
  maximum: number
): number => {
  return Math.min(maximum, Math.max(minimum, value));
};

const normalizeNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
};

export const getLevelForXp = (xp: number): number => {
  const normalizedXp = normalizeNonNegativeInteger(xp);
  let level = 1;

  for (let index = 0; index < LEVEL_XP_THRESHOLDS.length; index += 1) {
    const threshold = LEVEL_XP_THRESHOLDS[index];

    if (threshold !== undefined && normalizedXp >= threshold) {
      level = index + 1;
    }
  }

  return clampNumber(level, 1, MAX_LEVEL);
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

export const addXpToScribbit = (
  scribbit: Scribbit,
  xpGain: number
): Scribbit => {
  if (scribbit.status !== 'alive') return cloneScribbit(scribbit);
  const gainedXp = normalizeNonNegativeInteger(xpGain);
  const nextXp = normalizeNonNegativeInteger(scribbit.xp) + gainedXp;

  return {
    ...scribbit,
    xp: nextXp,
    level: getLevelForXp(nextXp),
    careDoneToday: [...scribbit.careDoneToday],
  };
};

const sanitizeRawStat = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
};

const distributeBudgetInsideBounds = (values: number[]): number[] => {
  const nextValues = values.map((value) => {
    return clampNumber(value, STAT_MIN, STAT_MAX);
  });

  for (let pass = 0; pass < 12; pass += 1) {
    const total = nextValues.reduce((sum, value) => sum + value, 0);
    const difference = STAT_BUDGET - total;

    if (Math.abs(difference) < 0.0001) {
      break;
    }

    const adjustableIndexes = nextValues
      .map((value, index) => {
        return { value, index };
      })
      .filter((entry) => {
        return difference > 0 ? entry.value < STAT_MAX : entry.value > STAT_MIN;
      });

    if (adjustableIndexes.length === 0) {
      break;
    }

    const totalRoom = adjustableIndexes.reduce((sum, entry) => {
      return (
        sum + (difference > 0 ? STAT_MAX - entry.value : entry.value - STAT_MIN)
      );
    }, 0);

    if (totalRoom <= 0) {
      break;
    }

    for (const entry of adjustableIndexes) {
      const room =
        difference > 0 ? STAT_MAX - entry.value : entry.value - STAT_MIN;
      const adjustment = difference * (room / totalRoom);
      nextValues[entry.index] = clampNumber(
        entry.value + adjustment,
        STAT_MIN,
        STAT_MAX
      );
    }
  }

  return nextValues;
};

const roundStatsToBudget = (values: number[]): number[] => {
  const roundedValues = values.map((value) => {
    return Math.floor(value);
  });
  let remainingBudget =
    STAT_BUDGET - roundedValues.reduce((sum, value) => sum + value, 0);
  const fractionalOrder = values
    .map((value, index) => {
      return {
        index,
        fraction: value - Math.floor(value),
      };
    })
    .sort((left, right) => {
      return right.fraction - left.fraction;
    });

  while (remainingBudget > 0) {
    let changedValue = false;

    for (const entry of fractionalOrder) {
      const currentValue = roundedValues[entry.index];

      if (currentValue !== undefined && currentValue < STAT_MAX) {
        roundedValues[entry.index] = currentValue + 1;
        remainingBudget -= 1;
        changedValue = true;
      }

      if (remainingBudget === 0) {
        break;
      }
    }

    if (!changedValue) {
      break;
    }
  }

  return roundedValues.map((value) => {
    return clampNumber(value, STAT_MIN, STAT_MAX);
  });
};

export const normalizeStats = (rawStats: unknown): ScribbitStats => {
  const rawRecord = isRecord(rawStats) ? rawStats : {};
  const rawValues = statNames.map((statName) => {
    return sanitizeRawStat(rawRecord[statName]);
  });
  const rawTotal = rawValues.reduce((sum, value) => sum + value, 0);
  const scaledValues =
    rawTotal > 0
      ? rawValues.map((value) => {
          return (value / rawTotal) * STAT_BUDGET;
        })
      : statNames.map(() => STAT_BUDGET / statNames.length);
  const boundedValues = distributeBudgetInsideBounds(scaledValues);
  const roundedValues = roundStatsToBudget(boundedValues);

  return {
    chonk: roundedValues[0] ?? 25,
    spike: roundedValues[1] ?? 25,
    zip: roundedValues[2] ?? 25,
    charm: roundedValues[3] ?? 25,
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

export const validateSubmitScribbitRequest = (
  value: unknown
): ValidatedScribbitDraft | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = validateScribbitName(value.name);
  const accessories = validateAttachedAccessories(value.accessories);

  if (
    !name ||
    typeof value.baseImageDataUrl !== 'string' ||
    typeof value.imageDataUrl !== 'string' ||
    !accessories
  ) {
    return undefined;
  }

  return {
    name,
    baseImageDataUrl: value.baseImageDataUrl,
    imageDataUrl: value.imageDataUrl,
    // Deprecated client-provided values are kept for request compatibility.
    // The submit route overwrites both with server analyzer output.
    stats: normalizeStats(value.stats),
    element: isElement(value.element) ? value.element : 'ember',
    accessories,
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

export const removeRumbleEntrant = async (
  storage: ArenaStorage,
  day: number,
  scribbitId: string
): Promise<void> => {
  await storage.zRem(getRumbleKey(day), [scribbitId]);
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
  await storage.expire(dailyFlagsKey, dailyFlagTtlSeconds);
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

  await storage.expire(dailyFlagsKey, dailyFlagTtlSeconds);
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

export const createScribbitLegacy = (
  scribbit: Scribbit,
  options: {
    creatorTitle?: LegacyCosmeticSnapshot | null;
  } = {}
): ScribbitLegacy => {
  const xp = normalizeNonNegativeInteger(scribbit.xp);
  return {
    schemaVersion: 1,
    archivedDay: scribbit.expiresDay,
    finish: inferLegacyFinish(scribbit),
    creatorTitle: options.creatorTitle ? { ...options.creatorTitle } : null,
    level: getLevelForXp(xp),
    xp,
    wins: normalizeNonNegativeInteger(scribbit.wins),
    losses: normalizeNonNegativeInteger(scribbit.losses),
    belief: normalizeNonNegativeInteger(scribbit.belief),
    accessories: scribbit.accessories.map(snapshotCosmetic),
  };
};

const normalizeStoredLegacy = (
  value: unknown,
  scribbit: Scribbit
): ScribbitLegacy | undefined => {
  if (
    !isRecord(value) ||
    !isLegacyFinish(value.finish) ||
    !isLegacyFinishValidForStatus(value.finish, scribbit.status) ||
    (value.schemaVersion !== undefined && value.schemaVersion !== 1) ||
    typeof value.archivedDay !== 'number' ||
    !Number.isFinite(value.archivedDay) ||
    value.archivedDay !== scribbit.expiresDay ||
    typeof value.xp !== 'number' ||
    typeof value.wins !== 'number' ||
    typeof value.losses !== 'number' ||
    typeof value.belief !== 'number'
  ) {
    return undefined;
  }

  const xp = normalizeNonNegativeInteger(value.xp);
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
    schemaVersion: 1,
    archivedDay: scribbit.expiresDay,
    finish: value.finish,
    creatorTitle: creatorTitle ?? null,
    level: getLevelForXp(xp),
    xp,
    wins: normalizeNonNegativeInteger(value.wins),
    losses: normalizeNonNegativeInteger(value.losses),
    belief: normalizeNonNegativeInteger(value.belief),
    accessories: legacyAccessories,
  };
};

export const isScribbit = (value: unknown): value is Scribbit => {
  return normalizeScribbitRecord(value) !== undefined;
};

export const normalizeScribbitRecord = (
  value: unknown
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
    const careDoneToday = normalizeCareDoneToday(value.careDoneToday);

    const normalizedScribbit: Scribbit = {
      id: value.id,
      name: value.name,
      artist: value.artist,
      element: value.element,
      stats: { ...value.stats },
      imageUrl: value.imageUrl,
      bornDay: value.bornDay,
      expiresDay: value.expiresDay,
      belief: value.belief,
      wins: value.wins,
      losses: value.losses,
      status: value.status,
      legendTitle: value.legendTitle,
      isFounding: value.isFounding,
      accessories: normalizeScribbitAccessories(value.accessories),
      level: getLevelForXp(xp),
      xp,
      mood: isMood(value.mood)
        ? value.mood
        : deriveMoodFromCareActions(careDoneToday),
      careDoneToday,
      legacy: null,
    };

    if (normalizedScribbit.status !== 'alive') {
      normalizedScribbit.legacy =
        normalizeStoredLegacy(value.legacy, normalizedScribbit) ??
        createScribbitLegacy(normalizedScribbit);
    }

    return normalizedScribbit;
  }

  return undefined;
};

export const parseScribbit = (
  storedScribbit: string | undefined
): Scribbit | undefined => {
  if (storedScribbit === undefined) {
    return undefined;
  }

  try {
    const parsedScribbit: unknown = JSON.parse(storedScribbit);
    const scribbit = normalizeScribbitRecord(parsedScribbit);

    if (scribbit) {
      return scribbit;
    }
  } catch (error) {
    console.error('Failed to parse stored scribbit:', error);
  }

  return undefined;
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
}): Scribbit => {
  return {
    id: options.id,
    name: options.draft.name,
    artist: options.artist,
    element: options.draft.element,
    stats: normalizeStats(options.draft.stats),
    imageUrl: options.imageUrl,
    bornDay: options.day,
    expiresDay: options.day + LIFESPAN_DAYS,
    belief: 0,
    wins: 0,
    losses: 0,
    status: 'alive',
    legendTitle: null,
    isFounding: false,
    accessories: (options.draft.accessories ?? []).map((accessory) => {
      return accessory.id;
    }),
    level: 1,
    xp: 0,
    mood: 'hungry',
    careDoneToday: [],
    legacy: null,
  };
};

export const cloneScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...scribbit.accessories],
    careDoneToday: [...scribbit.careDoneToday],
    legacy: scribbit.legacy
      ? {
          ...scribbit.legacy,
          creatorTitle: scribbit.legacy.creatorTitle
            ? { ...scribbit.legacy.creatorTitle }
            : null,
          accessories: scribbit.legacy.accessories.map((accessory) => ({
            ...accessory,
          })),
        }
      : null,
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

export const hydrateScribbitForUtcDay = async (
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

export const storeScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbit: Scribbit
): Promise<void> => {
  const storedScribbit = cloneScribbit(scribbit);

  await storage.set(
    getScribbitKey(storedScribbit.id),
    JSON.stringify(storedScribbit)
  );
  await storage.set(getScribbitOwnerKey(storedScribbit.id), ownerUserId);
  await storage.zAdd(getUserScribbitsKey(ownerUserId), {
    member: storedScribbit.id,
    score: storedScribbit.bornDay,
  });

  if (storedScribbit.status === 'alive') {
    await storage.zAdd(getUserAliveScribbitsKey(ownerUserId), {
      member: storedScribbit.id,
      score: storedScribbit.bornDay,
    });
    await storage.zAdd(getExpiringScribbitsKey(), {
      member: storedScribbit.id,
      score: storedScribbit.expiresDay,
    });
  } else if (storedScribbit.legacy) {
    await storage.zAdd(getUserLegacyCardsKey(ownerUserId), {
      member: storedScribbit.id,
      score: storedScribbit.legacy.archivedDay,
    });
  }
};

export const updateScribbit = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<void> => {
  if (scribbit.isFounding) {
    return;
  }

  await storage.set(
    getScribbitKey(scribbit.id),
    JSON.stringify(cloneScribbit(scribbit))
  );
};

type AliveScribbitMutationResult = {
  scribbit: Scribbit | undefined;
  changed: boolean;
};

type AliveScribbitMutationOptions = {
  additionalWatchedKeys?: string[];
  utcDateKey?: string;
};

const discardArenaTransaction = async (
  transaction: ArenaTransaction | undefined
): Promise<void> => {
  if (!transaction) return;
  try {
    await transaction.discard();
  } catch {
    // EXEC and connection failures can leave nothing to discard.
  }
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
    attempt < maximumScribbitTransactionAttempts;
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
      await transaction.set(
        scribbitKey,
        JSON.stringify(cloneScribbit(updatedScribbit))
      );
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return { scribbit: updatedScribbit, changed: true };
      }
    } catch (error) {
      await discardArenaTransaction(transaction);
      throw error;
    }
  }

  throw new Error(`Scribbit ${scribbitId} changed too often to update safely.`);
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
  const mood = deriveMoodFromCareActions(careDoneToday);

  return {
    claimed: createdCare === 1,
    careDoneToday,
    mood,
    xpGain: createdCare === 1 ? (mood === 'pumped' ? 2 : 1) : 0,
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

export type DailySparWinRewardResult =
  | 'awarded'
  | 'already-awarded-this-report'
  | 'already-claimed';

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
  if (!storage.watch) {
    throw new Error('Atomic spar rewards require transaction support.');
  }
  if (
    !input.reportId ||
    input.reportId.length > 128 ||
    !Number.isSafeInteger(input.inkAmount) ||
    input.inkAmount <= 0
  ) {
    throw new Error('Spar reward input is invalid.');
  }

  const dailyRewardKey = getUserDailySparWinRewardsKey(input.userId);
  const scribbitKey = getScribbitKey(input.scribbitId);
  const inkKey = `ink:${input.userId}`;
  const receiptValue = `report:${input.reportId}`;

  for (
    let attempt = 0;
    attempt < maximumScribbitTransactionAttempts;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(dailyRewardKey, scribbitKey, inkKey);
      const existingReceipt = await storage.hGet(
        dailyRewardKey,
        input.utcDateKey
      );
      if (existingReceipt !== undefined) {
        await transaction.unwatch();
        return existingReceipt === receiptValue
          ? 'already-awarded-this-report'
          : 'already-claimed';
      }

      const scribbit = parseScribbit(await storage.get(scribbitKey));
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return 'already-claimed';
      }
      const rewardedScribbit = addXpToScribbit(scribbit, 1);
      await transaction.multi();
      await transaction.hSet(dailyRewardKey, {
        [input.utcDateKey]: receiptValue,
      });
      await transaction.expire(dailyRewardKey, dailyProgressTtlSeconds);
      await transaction.set(
        scribbitKey,
        JSON.stringify(cloneScribbit(rewardedScribbit))
      );
      await transaction.incrBy(inkKey, input.inkAmount);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return 'awarded';
    } catch (error) {
      await discardArenaTransaction(transaction);
      if (
        (await storage.hGet(dailyRewardKey, input.utcDateKey)) === receiptValue
      ) {
        return 'already-awarded-this-report';
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

export const recordBattleOutcomeOnScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  outcome: 'win' | 'loss',
  winnerXpGain: number
): Promise<Scribbit | undefined> => {
  const result = await mutateAliveScribbit(storage, scribbitId, (scribbit) =>
    addXpToScribbit(
      {
        ...scribbit,
        wins: outcome === 'win' ? scribbit.wins + 1 : scribbit.wins,
        losses: outcome === 'loss' ? scribbit.losses + 1 : scribbit.losses,
      },
      outcome === 'win' ? winnerXpGain : 0
    )
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
    attempt < maximumScribbitTransactionAttempts;
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
        await transaction.set(
          scribbitKey,
          JSON.stringify(cloneScribbit(updatedScribbit))
        );
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
      await discardArenaTransaction(transaction);
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

  return scribbits
    .filter((scribbit) => scribbit.status === 'alive')
    .sort(sortNewestFirst);
};

export const enforceAliveScribbitLimit = async (
  storage: ArenaStorage,
  userId: string
): Promise<boolean> => {
  const aliveScribbits = await getAliveScribbitsForUser(storage, userId);
  return aliveScribbits.length < MAX_ALIVE_PER_USER;
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

/** @deprecated Use the paged Legacy Cards API for the complete owner archive. */
export const getFadedScribbitsForUser = async (
  storage: ArenaStorage,
  userId: string,
  limit: number
): Promise<Scribbit[]> => {
  const scribbitIds = await getUserScribbitIds(storage, userId, 100);
  const scribbits = await loadScribbits(storage, scribbitIds);
  return scribbits
    .filter((scribbit) => scribbit.status === 'faded')
    .sort(sortNewestFirst)
    .slice(0, limit);
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
  await storage.expire(dailyFlagsKey, dailyFlagTtlSeconds);
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
      let transitionedAtExpiry = false;
      let expiredScribbit = scribbit;
      if (scribbit.status === 'alive') {
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
          scribbit.id,
          async (currentScribbit) => {
            // This lookup runs after WATCH. A transient failure or concurrent
            // equip change aborts without filing an incomplete/stale card.
            const creatorTitle =
              ownerUserId && options.getCreatorTitle
                ? await options.getCreatorTitle(ownerUserId)
                : null;
            return resolveExpiredScribbitStatus(currentScribbit, {
              creatorTitle,
            });
          },
          {
            additionalWatchedKeys: [
              getScribbitBeliefVersionKey(scribbit.id),
              ...(titleWatchKey ? [titleWatchKey] : []),
            ],
          }
        );
        if (!transition.scribbit) {
          await storage.zRem(getExpiringScribbitsKey(), [entry.member]);
          continue;
        }
        expiredScribbit = transition.scribbit;
        transitionedAtExpiry = transition.changed;
      } else if (expiredScribbit.legacy) {
        // Persist synthesized V1 stamps for records archived before Legacy Cards.
        await updateScribbit(storage, expiredScribbit);
      }

      if (ownerUserId && expiredScribbit.legacy) {
        await storage.zRem(getUserAliveScribbitsKey(ownerUserId), [
          scribbit.id,
        ]);
        await storage.zAdd(getUserLegacyCardsKey(ownerUserId), {
          member: expiredScribbit.id,
          score: expiredScribbit.legacy.archivedDay,
        });
      }

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

      // Remove the due member only after the terminal record and every required
      // index are durable. A retry repairs partial work without double-counting.
      await storage.zRem(getExpiringScribbitsKey(), [entry.member]);
    }
  }

  return { faded, legends };
};

export const increaseBelief = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<Scribbit> => {
  if (scribbit.status !== 'alive') return cloneScribbit(scribbit);
  if (scribbit.isFounding) {
    const belief = await storage.hIncrBy(
      getFoundingBeliefKey(),
      scribbit.id,
      1
    );

    return {
      ...cloneScribbit(scribbit),
      belief,
    };
  }

  if (!storage.watch) {
    throw new Error('Atomic Belief updates require transaction support.');
  }
  const scribbitKey = getScribbitKey(scribbit.id);
  const beliefKey = getCommunityBeliefKey();
  const beliefVersionKey = getScribbitBeliefVersionKey(scribbit.id);

  for (
    let attempt = 0;
    attempt < maximumScribbitTransactionAttempts;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(scribbitKey, beliefVersionKey);
      const currentScribbit = await loadScribbit(storage, scribbit.id);
      if (!currentScribbit || currentScribbit.status !== 'alive') {
        await transaction.unwatch();
        return currentScribbit ?? cloneScribbit(scribbit);
      }

      await transaction.multi();
      await transaction.hSetNX(
        beliefKey,
        scribbit.id,
        currentScribbit.belief.toString()
      );
      await transaction.hIncrBy(beliefKey, scribbit.id, 1);
      await transaction.incrBy(beliefVersionKey, 1);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 3) {
        const belief = Number(result[1]);
        return {
          ...currentScribbit,
          belief: Number.isFinite(belief) ? belief : currentScribbit.belief + 1,
        };
      }
    } catch (error) {
      await discardArenaTransaction(transaction);
      throw error;
    }
  }

  throw new Error(
    `Belief for ${scribbit.id} changed too often to update safely.`
  );
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

export const recordBattleResultOnScribbits = async (
  storage: ArenaStorage,
  winner: Scribbit,
  loser: Scribbit,
  winnerXpGain = 0
): Promise<void> => {
  await recordBattleOutcomeOnScribbit(storage, winner.id, 'win', winnerXpGain);
  await recordBattleOutcomeOnScribbit(storage, loser.id, 'loss', 0);
};
