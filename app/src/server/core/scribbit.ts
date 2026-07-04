import type {
  ArenaState,
  Element,
  Scribbit,
  ScribbitStats,
  SubmitScribbitRequest,
} from '../../shared/arena';
import {
  BELIEF_LEGEND_THRESHOLD,
  LIFESPAN_DAYS,
  MAX_ALIVE_PER_USER,
  STAT_BUDGET,
  STAT_MAX,
  STAT_MIN,
} from '../../shared/arena';
import { isElement } from './forecast';
import { findFoundingScribbit } from './species';

export type SortedSetEntry = {
  member: string;
  score: number;
};

export type ArenaStorage = {
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hGet: (key: string, field: string) => Promise<string | undefined>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hSetNX: (key: string, field: string, value: string) => Promise<number>;
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
};

export type CurrentPlayer = {
  userId: string;
  username: string;
};

export type DecodedPngDataUrl = {
  base64: string;
  bytes: Uint8Array<ArrayBuffer>;
  byteLength: number;
};

export type ValidatedScribbitDraft = {
  name: string;
  imageDataUrl: string;
  stats: ScribbitStats;
  element: Element;
};

export type DailyFlags = Pick<ArenaState, 'drawnToday' | 'enteredToday'> & {
  bossChallengedToday: boolean;
};

const pngDataUrlPrefix = 'data:image/png;base64,';
const maximumDrawingBytes = 400 * 1024;
const drawingTtlSeconds = 30 * 24 * 60 * 60;
const dailyFlagTtlSeconds = 8 * 24 * 60 * 60;
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

export const getDrawingKey = (scribbitId: string): string => {
  return `drawing:${scribbitId}`;
};

export const getExpiringScribbitsKey = (): string => {
  return 'scribbits:expires';
};

export const getLegendsKey = (): string => {
  return 'legends';
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

export const validateSubmitScribbitRequest = (
  value: unknown
): ValidatedScribbitDraft | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = validateScribbitName(value.name);

  if (
    !name ||
    typeof value.imageDataUrl !== 'string' ||
    !isElement(value.element)
  ) {
    return undefined;
  }

  return {
    name,
    imageDataUrl: value.imageDataUrl,
    stats: normalizeStats(value.stats),
    element: value.element,
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
  const hasPngSignature =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > maximumDrawingBytes ||
    !hasPngSignature
  ) {
    return undefined;
  }

  return {
    base64,
    bytes,
    byteLength: bytes.byteLength,
  };
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
  if (!isRecord(value) || !isScribbitStats(value.stats)) {
    return false;
  }

  return (
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
  );
};

export const parseScribbit = (
  storedScribbit: string | undefined
): Scribbit | undefined => {
  if (storedScribbit === undefined) {
    return undefined;
  }

  try {
    const parsedScribbit: unknown = JSON.parse(storedScribbit);
    if (isScribbit(parsedScribbit)) {
      return parsedScribbit;
    }
  } catch (error) {
    console.error('Failed to parse stored scribbit:', error);
  }

  return undefined;
};

export const createScribbit = (options: {
  id: string;
  draft: Pick<SubmitScribbitRequest, 'name' | 'stats' | 'element'>;
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
  };
};

export const cloneScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
  };
};

export const loadScribbit = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<Scribbit | undefined> => {
  const foundingScribbit = findFoundingScribbit(scribbitId);

  if (foundingScribbit) {
    return foundingScribbit;
  }

  return parseScribbit(await storage.get(getScribbitKey(scribbitId)));
};

export const loadScribbits = async (
  storage: ArenaStorage,
  scribbitIds: string[]
): Promise<Scribbit[]> => {
  const scribbits: Scribbit[] = [];

  for (const scribbitId of scribbitIds) {
    const scribbit = await loadScribbit(storage, scribbitId);

    if (scribbit) {
      scribbits.push(scribbit);
    }
  }

  return scribbits;
};

export const storeDrawingFallback = async (
  storage: ArenaStorage,
  scribbitId: string,
  decodedPng: DecodedPngDataUrl
): Promise<void> => {
  const drawingKey = getDrawingKey(scribbitId);
  await storage.set(drawingKey, decodedPng.base64);
  await storage.expire(drawingKey, drawingTtlSeconds);
};

export const readDrawingFallback = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<Uint8Array<ArrayBuffer> | undefined> => {
  const base64 = await storage.get(getDrawingKey(scribbitId));

  if (!base64) {
    return undefined;
  }

  return Buffer.from(base64, 'base64');
};

export const storeScribbit = async (
  storage: ArenaStorage,
  ownerUserId: string,
  scribbit: Scribbit
): Promise<void> => {
  await storage.set(getScribbitKey(scribbit.id), JSON.stringify(scribbit));
  await storage.set(getScribbitOwnerKey(scribbit.id), ownerUserId);
  await storage.zAdd(getUserScribbitsKey(ownerUserId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });

  if (scribbit.status === 'alive') {
    await storage.zAdd(getUserAliveScribbitsKey(ownerUserId), {
      member: scribbit.id,
      score: scribbit.bornDay,
    });
    await storage.zAdd(getExpiringScribbitsKey(), {
      member: scribbit.id,
      score: scribbit.expiresDay,
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

  await storage.set(getScribbitKey(scribbit.id), JSON.stringify(scribbit));
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
    drawnToday: storedFlags.drawn === '1',
    enteredToday: storedFlags.entered === '1',
    bossChallengedToday: storedFlags.bossChallenge === '1',
  };
};

export const markDailyFlag = async (
  storage: ArenaStorage,
  userId: string,
  day: number,
  field: 'drawn' | 'entered' | 'bossChallenge'
): Promise<boolean> => {
  const dailyFlagsKey = getDailyFlagsKey(userId, day);
  const createdFlag = await storage.hSetNX(
    dailyFlagsKey,
    field,
    Date.now().toString()
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
  day: number
): Promise<string[]> => {
  const entries = await storage.zRange(getRumbleKey(day), 0, -1, {
    by: 'rank',
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

export const getLegends = async (
  storage: ArenaStorage,
  limit: number
): Promise<Scribbit[]> => {
  const rankedLegends = await storage.zRange(getLegendsKey(), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  const scribbits = await loadScribbits(
    storage,
    rankedLegends.map((entry) => entry.member)
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
    return scribbit;
  }

  const nextScribbit = {
    ...scribbit,
    belief: scribbit.belief + 1,
  };
  await updateScribbit(storage, nextScribbit);
  return nextScribbit;
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
  loser: Scribbit
): Promise<void> => {
  if (!winner.isFounding) {
    await updateScribbit(storage, {
      ...winner,
      wins: winner.wins + 1,
    });
  }

  if (!loser.isFounding) {
    await updateScribbit(storage, {
      ...loser,
      losses: loser.losses + 1,
    });
  }
};
