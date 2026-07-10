import type {
  ArenaState,
  AttachedAccessory,
  CareAction,
  Element,
  Mood,
  Scribbit,
  ScribbitStats,
  SubmitScribbitRequest,
} from '../../shared/arena';
import { PNG } from 'pngjs';
import {
  BELIEF_LEGEND_THRESHOLD,
  LEVEL_XP_THRESHOLDS,
  LIFESPAN_DAYS,
  MAX_ALIVE_PER_USER,
  MAX_ACCESSORIES_PER_SCRIBBIT,
  MAX_ACCESSORY_SCALE,
  MAX_LEVEL,
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

export type ArenaStorage = {
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

export type DailyFlags = Pick<ArenaState, 'drawnToday' | 'enteredToday'> & {
  bossChallengedToday: boolean;
};

export type DailyFlagField = 'drawn' | 'entered' | 'bossChallenge';

const pngDataUrlPrefix = 'data:image/png;base64,';
const maximumDrawingBytes = 400 * 1024;
const dailyFlagTtlSeconds = 8 * 24 * 60 * 60;
const dailyProgressTtlSeconds = 8 * 24 * 60 * 60;
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

export const getDailyFlagsKey = (userId: string, day: number): string => {
  return `user:${userId}:daily:${day}`;
};

export const getRumbleKey = (day: number): string => {
  return `rumble:${day}`;
};

export const getScribbitCareKey = (
  scribbitId: string,
  utcDateKey: string
): string => {
  return `scribbit:${scribbitId}:care:${utcDateKey}`;
};

export const getScribbitSparWinKey = (
  scribbitId: string,
  utcDateKey: string
): string => {
  return `scribbit:${scribbitId}:spar-win:${utcDateKey}`;
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

const clampNumber = (value: number, minimum: number, maximum: number): number => {
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
        return difference > 0
          ? entry.value < STAT_MAX
          : entry.value > STAT_MIN;
      });

    if (adjustableIndexes.length === 0) {
      break;
    }

    const totalRoom = adjustableIndexes.reduce((sum, entry) => {
      return (
        sum +
        (difference > 0 ? STAT_MAX - entry.value : entry.value - STAT_MIN)
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
    value >= 0 &&
    value <= 512
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
    !isFiniteNumber(value.rotation)
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

  if (
    !Array.isArray(value) ||
    value.length > MAX_ACCESSORIES_PER_SCRIBBIT
  ) {
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

  return value.filter((accessoryId) => {
    return (
      typeof accessoryId === 'string' &&
      isAccessoryCatalogEntry(findInkCatalogEntry(accessoryId))
    );
  });
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

export const decodePngDataUrl = (
  imageDataUrl: string
): DecodedPngDataUrl | undefined => {
  if (!imageDataUrl.startsWith(pngDataUrlPrefix)) {
    return undefined;
  }

  const base64 = imageDataUrl.slice(pngDataUrlPrefix.length);

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return undefined;
  }

  const bytes = Buffer.from(base64, 'base64');

  if (bytes.byteLength === 0 || bytes.byteLength > maximumDrawingBytes) {
    return undefined;
  }

  try {
    const png = PNG.sync.read(bytes);

    if (png.width !== 512 || png.height !== 512) {
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
    getScribbitOwnerKey(scribbitId)
  );
  await storage.zRem(getUserScribbitsKey(ownerUserId), [scribbitId]);
  await storage.zRem(getUserAliveScribbitsKey(ownerUserId), [scribbitId]);
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
    const createdFlag = await storage.hSetNX(
      dailyFlagsKey,
      field,
      '1'
    );

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
    return typeof value[statName] === 'number' && Number.isFinite(value[statName]);
  });
};

const isScribbitStatus = (value: unknown): value is Scribbit['status'] => {
  return value === 'alive' || value === 'faded' || value === 'legend';
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

    return {
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
    };
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
  };
};

export const cloneScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...scribbit.accessories],
    careDoneToday: [...scribbit.careDoneToday],
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
  const storedBelief = await storage.hGet(
    getCommunityBeliefKey(),
    scribbit.id
  );
  const belief = storedBelief === undefined
    ? scribbit.belief
    : Number(storedBelief);

  return {
    ...scribbit,
    belief: Number.isFinite(belief) && belief >= 0
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
  const belief = storedBelief === undefined ? scribbit.belief : Number(storedBelief);

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
  }
};

export const updateScribbit = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<void> => {
  if (scribbit.isFounding) {
    return;
  }

  await storage.set(getScribbitKey(scribbit.id), JSON.stringify(cloneScribbit(scribbit)));
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

export const claimDailySparWinXp = async (
  storage: ArenaStorage,
  scribbitId: string,
  utcDateKey: string,
  claimedAtMs: number
): Promise<boolean> => {
  const sparWinKey = getScribbitSparWinKey(scribbitId, utcDateKey);
  const createdSparWin = await storage.hSetNX(
    sparWinKey,
    'xp',
    claimedAtMs.toString()
  );
  await storage.expire(sparWinKey, dailyProgressTtlSeconds);
  return createdSparWin === 1;
};

export const awardScribbitXp = async (
  storage: ArenaStorage,
  scribbitId: string,
  xpGain: number,
  utcDateKey = formatUtcDateKey(new Date())
): Promise<Scribbit | undefined> => {
  const scribbit = await loadScribbit(storage, scribbitId, utcDateKey);

  if (!scribbit || scribbit.isFounding) {
    return scribbit;
  }

  const updatedScribbit = addXpToScribbit(scribbit, xpGain);
  await updateScribbit(storage, updatedScribbit);
  return updatedScribbit;
};

export const recordBattleOutcomeOnScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  outcome: 'win' | 'loss',
  winnerXpGain: number
): Promise<Scribbit | undefined> => {
  const scribbit = await loadScribbit(storage, scribbitId);

  if (!scribbit || scribbit.isFounding) {
    return scribbit;
  }

  const updatedOutcomeScribbit = addXpToScribbit(
    {
      ...scribbit,
      wins: outcome === 'win' ? scribbit.wins + 1 : scribbit.wins,
      losses: outcome === 'loss' ? scribbit.losses + 1 : scribbit.losses,
    },
    outcome === 'win' ? winnerXpGain : 0
  );
  await updateScribbit(storage, updatedOutcomeScribbit);
  return updatedOutcomeScribbit;
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

  return scribbits.filter((scribbit) => scribbit.status === 'alive').sort(sortNewestFirst);
};

export const enforceAliveScribbitLimit = async (
  storage: ArenaStorage,
  userId: string
): Promise<boolean> => {
  const aliveScribbits = await getAliveScribbitsForUser(storage, userId);
  return aliveScribbits.length < MAX_ALIVE_PER_USER;
};

export const getFadedScribbitsForUser = async (
  storage: ArenaStorage,
  userId: string,
  limit: number
): Promise<Scribbit[]> => {
  const rankedScribbits = await storage.zRange(
    getUserScribbitsKey(userId),
    0,
    99,
    { by: 'rank', reverse: true }
  );
  const scribbits = await loadScribbits(
    storage,
    rankedScribbits.map((entry) => entry.member)
  );

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
  const createdFlag = await storage.hSetNX(
    dailyFlagsKey,
    field,
    '1'
  );
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
  const stop = options.limit === undefined
    ? -1
    : Math.max(0, options.limit - 1);
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
  const scribbits = await loadScribbits(
    storage,
    legendIds
  );

  return scribbits.filter((scribbit) => scribbit.status === 'legend');
};

export const getCommunityLegendCount = async (
  storage: ArenaStorage
): Promise<number> => {
  return await storage.zCard(getLegendsKey());
};

export const resolveExpiredScribbitStatus = (
  scribbit: Scribbit
): Scribbit => {
  if (scribbit.status !== 'alive' || scribbit.isFounding) {
    return cloneScribbit(scribbit);
  }

  if (
    scribbit.belief >= BELIEF_LEGEND_THRESHOLD ||
    scribbit.legendTitle !== null
  ) {
    return {
      ...scribbit,
      status: 'legend',
      legendTitle:
        scribbit.legendTitle ??
        `Believed by ${scribbit.belief} arena weirdos`,
    };
  }

  return {
    ...scribbit,
    status: 'faded',
  };
};

export const expireDueScribbits = async (
  storage: ArenaStorage,
  day: number
): Promise<{ faded: number; legends: number }> => {
  const expiringEntries = await storage.zRange(
    getExpiringScribbitsKey(),
    0,
    day,
    { by: 'score' }
  );
  let faded = 0;
  let legends = 0;

  for (const entry of expiringEntries) {
    const scribbit = await loadScribbit(storage, entry.member);

    if (!scribbit || scribbit.status !== 'alive') {
      continue;
    }

    const expiredScribbit = resolveExpiredScribbitStatus(scribbit);
    const ownerUserId = await getScribbitOwner(storage, scribbit.id);
    await updateScribbit(storage, expiredScribbit);

    if (ownerUserId) {
      await storage.zRem(getUserAliveScribbitsKey(ownerUserId), [scribbit.id]);
    }

    if (expiredScribbit.status === 'legend') {
      legends += 1;
      await addLegend(storage, expiredScribbit, day);
    } else if (expiredScribbit.status === 'faded') {
      faded += 1;
    }
  }

  if (expiringEntries.length > 0) {
    await storage.zRem(
      getExpiringScribbitsKey(),
      expiringEntries.map((entry) => entry.member)
    );
  }

  return { faded, legends };
};

export const increaseBelief = async (
  storage: ArenaStorage,
  scribbit: Scribbit
): Promise<Scribbit> => {
  if (scribbit.isFounding) {
    const belief = await storage.hIncrBy(getFoundingBeliefKey(), scribbit.id, 1);

    return {
      ...cloneScribbit(scribbit),
      belief,
    };
  }

  await storage.hSetNX(
    getCommunityBeliefKey(),
    scribbit.id,
    scribbit.belief.toString()
  );
  const belief = await storage.hIncrBy(
    getCommunityBeliefKey(),
    scribbit.id,
    1
  );
  return {
    ...scribbit,
    belief,
  };
};

export const crownScribbit = async (
  storage: ArenaStorage,
  scribbitId: string,
  legendTitle: string
): Promise<Scribbit | undefined> => {
  const scribbit = await loadScribbit(storage, scribbitId);

  if (!scribbit || scribbit.isFounding) {
    return scribbit;
  }

  const crownedScribbit = {
    ...scribbit,
    legendTitle,
  };
  await updateScribbit(storage, crownedScribbit);
  return crownedScribbit;
};

export const recordBattleResultOnScribbits = async (
  storage: ArenaStorage,
  winner: Scribbit,
  loser: Scribbit,
  winnerXpGain = 0
): Promise<void> => {
  await recordBattleOutcomeOnScribbit(
    storage,
    winner.id,
    'win',
    winnerXpGain
  );
  await recordBattleOutcomeOnScribbit(storage, loser.id, 'loss', 0);
};
