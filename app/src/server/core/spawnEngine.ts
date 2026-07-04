import type {
  ActiveSpawn,
  Rarity,
  Species,
  Weather,
} from '../../shared/remonsta';
import { launchSpecies } from './species';
import {
  createSeededNumberGenerator,
  getRandomInteger,
  hashTextToSeed,
  type SeededNumberGenerator,
} from './random';

export type SpawnWindow = ActiveSpawn & {
  startsAt: number;
};

export type SpawnDaySchedule = {
  dateKey: string;
  dayNumber: number;
  weather: Weather;
  generatedAt: number;
  windows: SpawnWindow[];
};

export type SpawnStorage = {
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<unknown>;
  expire: (key: string, seconds: number) => Promise<unknown>;
};

type RarityWeights = Record<Rarity, number>;

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const remonstaEpochUtcMs = Date.UTC(2026, 6, 4);

const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

const rarityWeightsByWeather: Record<Weather, RarityWeights> = {
  quiet: {
    common: 75,
    uncommon: 20,
    rare: 5,
    legendary: 0,
  },
  lively: {
    common: 62,
    uncommon: 25,
    rare: 10,
    legendary: 3,
  },
  stormy: {
    common: 45,
    uncommon: 30,
    rare: 18,
    legendary: 7,
  },
};

const spawnDurationHoursByRarity: Record<
  Rarity,
  { minimum: number; maximum: number }
> = {
  common: { minimum: 6, maximum: 10 },
  uncommon: { minimum: 3, maximum: 6 },
  rare: { minimum: 1, maximum: 3 },
  legendary: { minimum: 1, maximum: 2 },
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isRarity = (value: unknown): value is Rarity => {
  return (
    value === 'common' ||
    value === 'uncommon' ||
    value === 'rare' ||
    value === 'legendary'
  );
};

const isWeather = (value: unknown): value is Weather => {
  return value === 'quiet' || value === 'lively' || value === 'stormy';
};

export const formatUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export const parseUtcDateKey = (dateKey: string): Date | undefined => {
  if (!/^\d{8}$/.test(dateKey)) {
    return undefined;
  }

  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(4, 6));
  const day = Number(dateKey.slice(6, 8));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (formatUtcDateKey(parsedDate) !== dateKey) {
    return undefined;
  }

  return parsedDate;
};

export const getUtcDayStartMs = (date: Date): number => {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
};

export const addUtcDays = (date: Date, days: number): Date => {
  return new Date(getUtcDayStartMs(date) + days * millisecondsPerDay);
};

export const getWildsDayNumber = (date: Date): number => {
  const dayOffset = Math.floor(
    (getUtcDayStartMs(date) - remonstaEpochUtcMs) / millisecondsPerDay
  );
  return Math.max(1, dayOffset + 1);
};

export const getSpawnScheduleKey = (dateKey: string): string => {
  return `spawns:${dateKey}`;
};

export const getActivityMetricKey = (dateKey: string): string => {
  return `activity:${dateKey}`;
};

export const deriveWeatherFromActivityScore = (
  activityScore: number | undefined
): Weather => {
  if (activityScore === undefined) {
    return 'lively';
  }

  if (activityScore < 25) {
    return 'quiet';
  }

  if (activityScore >= 120) {
    return 'stormy';
  }

  return 'lively';
};

export const parseActivityScore = (
  storedActivityScore: string | undefined
): number | undefined => {
  if (storedActivityScore === undefined) {
    return undefined;
  }

  const parsedScore = Number(storedActivityScore);
  if (!Number.isFinite(parsedScore) || parsedScore < 0) {
    return undefined;
  }

  return parsedScore;
};

export const readStoredActivityScore = async (
  storage: Pick<SpawnStorage, 'get'>,
  dateKey: string
): Promise<number | undefined> => {
  return parseActivityScore(await storage.get(getActivityMetricKey(dateKey)));
};

const chooseWeightedRarity = (
  weights: RarityWeights,
  randomNumber: SeededNumberGenerator
): Rarity => {
  const totalWeight = rarityOrder.reduce((total, rarity) => {
    return total + weights[rarity];
  }, 0);
  const targetWeight = randomNumber() * totalWeight;
  let runningWeight = 0;

  for (const rarity of rarityOrder) {
    runningWeight += weights[rarity];
    if (targetWeight <= runningWeight) {
      return rarity;
    }
  }

  return 'common';
};

const chooseSpeciesByRarity = (
  speciesList: Species[],
  rarity: Rarity,
  randomNumber: SeededNumberGenerator
): Species => {
  const matchingSpecies = speciesList.filter((species) => {
    return species.rarity === rarity;
  });
  const availableSpecies =
    matchingSpecies.length > 0
      ? matchingSpecies
      : speciesList.filter((species) => species.rarity === 'common');
  const fallbackSpecies = availableSpecies[0];

  if (!fallbackSpecies) {
    throw new Error('At least one launch species is required to create spawns');
  }

  const speciesIndex = getRandomInteger(
    0,
    availableSpecies.length - 1,
    randomNumber
  );
  return availableSpecies[speciesIndex] ?? fallbackSpecies;
};

const createSpawnWindow = (
  dateKey: string,
  windowIndex: number,
  species: Species,
  startsAt: number,
  expiresAt: number
): SpawnWindow => {
  const seed = hashTextToSeed(
    `${dateKey}:${windowIndex}:${species.id}:${startsAt}:${expiresAt}`
  );

  return {
    spawnId: `${dateKey}-${windowIndex}-${species.id}`,
    speciesId: species.id,
    startsAt,
    expiresAt,
    seed,
  };
};

export const createSpawnScheduleForDay = (
  date: Date,
  activityScore: number | undefined,
  speciesList: Species[] = launchSpecies
): SpawnDaySchedule => {
  const dateKey = formatUtcDateKey(date);
  const dayStartMs = getUtcDayStartMs(date);
  const dayEndMs = dayStartMs + millisecondsPerDay;
  const weather = deriveWeatherFromActivityScore(activityScore);
  const randomNumber = createSeededNumberGenerator(
    hashTextToSeed(`${dateKey}:${weather}:${activityScore ?? 'default'}`)
  );
  const windowCount = getRandomInteger(4, 6, randomNumber);
  const commonSpecies = chooseSpeciesByRarity(
    speciesList,
    'common',
    randomNumber
  );
  const windows: SpawnWindow[] = [
    createSpawnWindow(dateKey, 0, commonSpecies, dayStartMs, dayEndMs),
  ];

  for (let windowIndex = 1; windowIndex < windowCount; windowIndex += 1) {
    const rarity = chooseWeightedRarity(
      rarityWeightsByWeather[weather],
      randomNumber
    );
    const species = chooseSpeciesByRarity(speciesList, rarity, randomNumber);
    const durationHours = spawnDurationHoursByRarity[species.rarity];
    const durationMs =
      getRandomInteger(
        durationHours.minimum,
        durationHours.maximum,
        randomNumber
      ) *
      60 *
      60 *
      1000;
    const latestStartOffsetMs = Math.max(
      0,
      millisecondsPerDay - durationMs - 1
    );
    const startsAt =
      dayStartMs + getRandomInteger(0, latestStartOffsetMs, randomNumber);
    const expiresAt = Math.min(dayEndMs, startsAt + durationMs);

    windows.push(
      createSpawnWindow(dateKey, windowIndex, species, startsAt, expiresAt)
    );
  }

  return {
    dateKey,
    dayNumber: getWildsDayNumber(date),
    weather,
    generatedAt: Date.now(),
    windows,
  };
};

const isSpawnWindow = (value: unknown): value is SpawnWindow => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.spawnId === 'string' &&
    typeof value.speciesId === 'string' &&
    typeof value.startsAt === 'number' &&
    typeof value.expiresAt === 'number' &&
    typeof value.seed === 'number'
  );
};

const isSpawnDaySchedule = (value: unknown): value is SpawnDaySchedule => {
  if (!isRecord(value) || !Array.isArray(value.windows)) {
    return false;
  }

  return (
    typeof value.dateKey === 'string' &&
    typeof value.dayNumber === 'number' &&
    isWeather(value.weather) &&
    typeof value.generatedAt === 'number' &&
    value.windows.every(isSpawnWindow)
  );
};

export const parseSpawnSchedule = (
  storedSchedule: string | undefined
): SpawnDaySchedule | undefined => {
  if (storedSchedule === undefined) {
    return undefined;
  }

  try {
    const parsedSchedule: unknown = JSON.parse(storedSchedule);
    if (isSpawnDaySchedule(parsedSchedule)) {
      return parsedSchedule;
    }
  } catch (error) {
    console.error('Failed to parse stored spawn schedule:', error);
  }

  return undefined;
};

export const ensureSpawnScheduleForDate = async (
  storage: SpawnStorage,
  date: Date,
  speciesList: Species[] = launchSpecies
): Promise<SpawnDaySchedule> => {
  const dateKey = formatUtcDateKey(date);
  const existingSchedule = parseSpawnSchedule(
    await storage.get(getSpawnScheduleKey(dateKey))
  );

  if (existingSchedule) {
    return existingSchedule;
  }

  const activityScore = await readStoredActivityScore(storage, dateKey);
  const schedule = createSpawnScheduleForDay(date, activityScore, speciesList);
  await storage.set(getSpawnScheduleKey(dateKey), JSON.stringify(schedule));
  await storage.expire(getSpawnScheduleKey(dateKey), 3 * 24 * 60 * 60);
  return schedule;
};

export const getActiveSpawns = (
  schedule: SpawnDaySchedule,
  nowMs: number,
  speciesList: Species[] = launchSpecies
): ActiveSpawn[] => {
  const activeSpawns = schedule.windows.filter((spawnWindow) => {
    return spawnWindow.startsAt <= nowMs && nowMs < spawnWindow.expiresAt;
  });
  const hasActiveCommonSpawn = activeSpawns.some((spawnWindow) => {
    const species = speciesList.find((candidateSpecies) => {
      return candidateSpecies.id === spawnWindow.speciesId;
    });
    return species?.rarity === 'common';
  });
  const firstActiveSpawn = activeSpawns[0];
  const guaranteedActiveSpawns =
    hasActiveCommonSpawn || !firstActiveSpawn
      ? activeSpawns
      : [firstActiveSpawn];

  return guaranteedActiveSpawns.map((spawnWindow) => {
    return {
      spawnId: spawnWindow.spawnId,
      speciesId: spawnWindow.speciesId,
      expiresAt: spawnWindow.expiresAt,
      seed: spawnWindow.seed,
    };
  });
};

export const getDateKeyFromSpawnId = (spawnId: string): string | undefined => {
  const dateKey = spawnId.slice(0, 8);
  return parseUtcDateKey(dateKey) ? dateKey : undefined;
};

export const findActiveSpawnById = async (
  storage: SpawnStorage,
  spawnId: string,
  now: Date,
  speciesList: Species[] = launchSpecies
): Promise<ActiveSpawn | undefined> => {
  const dateKey = getDateKeyFromSpawnId(spawnId);
  const scheduleDate = dateKey ? parseUtcDateKey(dateKey) : undefined;

  if (!scheduleDate) {
    return undefined;
  }

  const schedule = await ensureSpawnScheduleForDate(
    storage,
    scheduleDate,
    speciesList
  );
  const activeSpawns = getActiveSpawns(schedule, now.getTime(), speciesList);

  return activeSpawns.find((spawn) => spawn.spawnId === spawnId);
};

export const isKnownRarity = isRarity;
