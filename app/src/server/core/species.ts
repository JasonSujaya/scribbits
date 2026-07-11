import type { Scribbit } from '../../shared/arena';
import { LEVEL_XP_THRESHOLDS } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  FOUNDING_SCRIBBIT_DEFINITIONS,
  type FoundingScribbitDefinition,
} from '../../shared/founders';
import { shuffleWithSeed } from './random';

const createFoundingScribbit = (
  definition: FoundingScribbitDefinition
): Scribbit => {
  return {
    id: definition.id,
    name: definition.name,
    artist: definition.artist,
    element: definition.element,
    stats: { ...definition.stats },
    imageUrl: definition.imageUrl,
    bornDay: 0,
    expiresDay: Number.MAX_SAFE_INTEGER,
    belief: 0,
    wins: 0,
    losses: 0,
    status: 'alive',
    legendTitle: null,
    isFounding: true,
    accessories: [],
    level: definition.level,
    xp: LEVEL_XP_THRESHOLDS[definition.level - 1] ?? 0,
    mood: definition.mood,
    careDoneToday: [],
    legacy: null,
  };
};

export const foundingScribbits: Scribbit[] = FOUNDING_SCRIBBIT_DEFINITIONS.map(
  createFoundingScribbit
);

const foundingScribbitsById = new Map<string, Scribbit>(
  foundingScribbits.map((scribbit) => [scribbit.id, scribbit])
);

const cloneFoundingScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...scribbit.accessories],
    careDoneToday: [...scribbit.careDoneToday],
  };
};

export const findFoundingScribbit = (
  scribbitId: string
): Scribbit | undefined => {
  const foundingScribbit = foundingScribbitsById.get(scribbitId);
  return foundingScribbit ? cloneFoundingScribbit(foundingScribbit) : undefined;
};

export const chooseFoundingSparOpponent = (
  challenger: Pick<Scribbit, 'element' | 'level'>,
  seed: number
): Scribbit => {
  const challengerLevel = Number.isFinite(challenger.level)
    ? Math.max(1, Math.floor(challenger.level))
    : 1;
  const closestLevelDistance = Math.min(
    ...foundingScribbits.map((scribbit) => {
      return Math.abs(scribbit.level - challengerLevel);
    })
  );
  const closestLevelScribbits = foundingScribbits.filter((scribbit) => {
    return Math.abs(scribbit.level - challengerLevel) === closestLevelDistance;
  });
  const differentElementScribbits = closestLevelScribbits.filter((scribbit) => {
    return scribbit.element !== challenger.element;
  });
  const candidates =
    differentElementScribbits.length > 0
      ? differentElementScribbits
      : closestLevelScribbits;
  const shuffledCandidates = shuffleWithSeed(candidates, seed);
  const opponent = shuffledCandidates[0];

  if (!opponent) {
    throw new Error('Founding spar roster is empty');
  }

  return cloneFoundingScribbit(opponent);
};

type FoundingSparRivalCandidate = {
  scribbit: Scribbit;
  levelDistance: number;
  primaryPower: ReturnType<typeof selectPrimaryPower>;
};

const getSafeRivalLimit = (limit: number): number => {
  if (Number.isNaN(limit) || limit <= 0) return 0;
  if (!Number.isFinite(limit)) return foundingScribbits.length;
  return Math.min(Math.floor(limit), foundingScribbits.length);
};

export const selectFoundingSparRivalSlate = (
  challenger: Pick<Scribbit, 'element' | 'level'>,
  seed: number,
  limit = 3
): Scribbit[] => {
  const safeLimit = getSafeRivalLimit(limit);
  if (safeLimit === 0 || foundingScribbits.length === 0) return [];

  const challengerLevel = Number.isFinite(challenger.level)
    ? Math.max(1, Math.floor(challenger.level))
    : 1;
  const shuffledCandidates: FoundingSparRivalCandidate[] = shuffleWithSeed(
    foundingScribbits,
    seed
  ).map((scribbit) => ({
    scribbit,
    levelDistance: Math.abs(scribbit.level - challengerLevel),
    primaryPower: selectPrimaryPower(scribbit.stats),
  }));
  const allowedLevelDistances = [
    ...new Set(shuffledCandidates.map(({ levelDistance }) => levelDistance)),
  ]
    .sort((left, right) => left - right)
    .slice(0, 2);
  const closestLevelDistance = allowedLevelDistances[0];
  const extraLevelDistance = allowedLevelDistances[1];
  const closestLevelCandidates = shuffledCandidates.filter(
    ({ levelDistance }) => {
      return levelDistance === closestLevelDistance;
    }
  );
  const extraLevelCandidates = shuffledCandidates.filter(
    ({ levelDistance }) => {
      return levelDistance === extraLevelDistance;
    }
  );
  const selectedCandidates: FoundingSparRivalCandidate[] = [];
  const selectedIds = new Set<string>();
  const selectedPowers = new Set<ReturnType<typeof selectPrimaryPower>>();

  const selectCandidates = (
    candidates: FoundingSparRivalCandidate[],
    requireNewPower: boolean
  ): void => {
    while (selectedCandidates.length < safeLimit) {
      const availableCandidates = candidates.filter((candidate) => {
        return (
          !selectedIds.has(candidate.scribbit.id) &&
          (!requireNewPower || !selectedPowers.has(candidate.primaryPower))
        );
      });
      const differentElementCandidate = availableCandidates.find(
        (candidate) => {
          return candidate.scribbit.element !== challenger.element;
        }
      );
      const selectedCandidate =
        differentElementCandidate ?? availableCandidates[0];

      if (!selectedCandidate) return;

      selectedCandidates.push(selectedCandidate);
      selectedIds.add(selectedCandidate.scribbit.id);
      selectedPowers.add(selectedCandidate.primaryPower);
    }
  };

  // Stay in the closest level tier while it can add a new Shape Power. Reach
  // into only the next distance tier when doing so adds genuine build variety.
  selectCandidates(closestLevelCandidates, true);
  selectCandidates(extraLevelCandidates, true);
  selectCandidates(closestLevelCandidates, false);
  selectCandidates(extraLevelCandidates, false);

  return selectedCandidates.map(({ scribbit }) => {
    return cloneFoundingScribbit(scribbit);
  });
};
