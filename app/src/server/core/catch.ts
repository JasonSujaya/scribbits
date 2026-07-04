import type { CatchParams, Rarity } from '../../shared/remonsta';
import {
  createSeededNumberGenerator,
  getRandomInteger,
  hashTextToSeed,
} from './random';

export type CatchReplayResult = {
  caught: boolean;
  validTapCount: number;
  totalTapCount: number;
};

type CatchDifficultyProfile = {
  minimumDurationMs: number;
  maximumDurationMs: number;
  minimumSweetWidth: number;
  maximumSweetWidth: number;
  tapsRequired: number;
};

const catchDifficultyByRarity: Record<Rarity, CatchDifficultyProfile> = {
  common: {
    minimumDurationMs: 5000,
    maximumDurationMs: 5500,
    minimumSweetWidth: 16,
    maximumSweetWidth: 18,
    tapsRequired: 1,
  },
  uncommon: {
    minimumDurationMs: 4200,
    maximumDurationMs: 5000,
    minimumSweetWidth: 13,
    maximumSweetWidth: 16,
    tapsRequired: 2,
  },
  rare: {
    minimumDurationMs: 3300,
    maximumDurationMs: 4100,
    minimumSweetWidth: 10,
    maximumSweetWidth: 13,
    tapsRequired: 2,
  },
  legendary: {
    minimumDurationMs: 2500,
    maximumDurationMs: 3200,
    minimumSweetWidth: 8,
    maximumSweetWidth: 10,
    tapsRequired: 3,
  },
};

export const getCatchParams = (seed: number, rarity: Rarity): CatchParams => {
  const profile = catchDifficultyByRarity[rarity];
  const randomNumber = createSeededNumberGenerator(
    hashTextToSeed(`${seed}:${rarity}:catch`)
  );
  const durationMs = getRandomInteger(
    profile.minimumDurationMs,
    profile.maximumDurationMs,
    randomNumber
  );
  const sweetWidth = getRandomInteger(
    profile.minimumSweetWidth,
    profile.maximumSweetWidth,
    randomNumber
  );
  const halfSweetWidth = sweetWidth / 2;
  const sweetCenter = getRandomInteger(
    Math.ceil(20 + halfSweetWidth),
    Math.floor(80 - halfSweetWidth),
    randomNumber
  );

  return {
    durationMs,
    sweetMin: sweetCenter - halfSweetWidth,
    sweetMax: sweetCenter + halfSweetWidth,
    tapsRequired: profile.tapsRequired,
  };
};

export const getRingRadiusAtTime = (
  tapTimeMs: number,
  durationMs: number
): number => {
  return 100 * (1 - tapTimeMs / durationMs);
};

export const isTapInsideSweetZone = (
  tapTimeMs: number,
  catchParams: CatchParams
): boolean => {
  if (tapTimeMs < 0 || tapTimeMs > catchParams.durationMs) {
    return false;
  }

  const radius = getRingRadiusAtTime(tapTimeMs, catchParams.durationMs);
  return radius >= catchParams.sweetMin && radius <= catchParams.sweetMax;
};

export const replayCatchAttempt = (
  tapTimesMs: number[],
  catchParams: CatchParams
): CatchReplayResult => {
  if (tapTimesMs.length > 5) {
    return {
      caught: false,
      validTapCount: 0,
      totalTapCount: tapTimesMs.length,
    };
  }

  const validTapCount = tapTimesMs.filter((tapTimeMs) => {
    return isTapInsideSweetZone(tapTimeMs, catchParams);
  }).length;

  return {
    caught: validTapCount >= catchParams.tapsRequired,
    validTapCount,
    totalTapCount: tapTimesMs.length,
  };
};

export const isValidTapTimes = (tapTimesMs: unknown): tapTimesMs is number[] => {
  if (!Array.isArray(tapTimesMs)) {
    return false;
  }

  return tapTimesMs.every((tapTimeMs) => {
    return (
      typeof tapTimeMs === 'number' &&
      Number.isFinite(tapTimeMs) &&
      tapTimeMs >= 0
    );
  });
};
