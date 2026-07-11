import type {
  Element,
  Mood,
  Scribbit,
  ScribbitStats,
} from '../../shared/arena';
import { LEVEL_XP_THRESHOLDS } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { shuffleWithSeed } from './random';

type FoundingBiome = 'forest' | 'ember' | 'tidepool' | 'sky';

type FoundingSpeciesSource = {
  id: string;
  name: string;
  artist: string;
  biome: FoundingBiome;
  stats: ScribbitStats;
  level: 1 | 2 | 3;
  mood: Mood;
};

const elementByBiome: Record<FoundingBiome, Element> = {
  forest: 'moss',
  ember: 'ember',
  tidepool: 'tide',
  sky: 'storm',
};

const foundingSpeciesSources: FoundingSpeciesSource[] = [
  {
    id: 'mosswhisk',
    name: 'Mosswhisk',
    artist: 'inkwell_kay',
    biome: 'forest',
    stats: { chonk: 34, spike: 18, zip: 28, charm: 20 },
    level: 1,
    mood: 'happy',
  },
  {
    id: 'fernibble',
    name: 'Fernibble',
    artist: 'crayon_bandit',
    biome: 'forest',
    stats: { chonk: 22, spike: 30, zip: 34, charm: 14 },
    level: 2,
    mood: 'sleepy',
  },
  {
    id: 'barkbloom',
    name: 'Barkbloom',
    artist: 'marker_jules',
    biome: 'forest',
    stats: { chonk: 48, spike: 16, zip: 12, charm: 24 },
    level: 3,
    mood: 'hungry',
  },
  {
    id: 'gladepuff',
    name: 'Gladepuff',
    artist: 'doodle_ren',
    biome: 'forest',
    stats: { chonk: 20, spike: 14, zip: 30, charm: 36 },
    level: 1,
    mood: 'pumped',
  },
  {
    id: 'elderglen',
    name: 'Elderglen',
    artist: 'smudge_sam',
    biome: 'forest',
    stats: { chonk: 42, spike: 26, zip: 10, charm: 22 },
    level: 2,
    mood: 'happy',
  },
  {
    id: 'coalimp',
    name: 'Coalimp',
    artist: 'pastel_vin',
    biome: 'ember',
    stats: { chonk: 18, spike: 38, zip: 28, charm: 16 },
    level: 1,
    mood: 'sleepy',
  },
  {
    id: 'cindercoil',
    name: 'Cindercoil',
    artist: 'graphite_jo',
    biome: 'ember',
    stats: { chonk: 26, spike: 34, zip: 30, charm: 10 },
    level: 2,
    mood: 'happy',
  },
  {
    id: 'ashwaddle',
    name: 'Ashwaddle',
    artist: 'eraser_vee',
    biome: 'ember',
    stats: { chonk: 44, spike: 28, zip: 10, charm: 18 },
    level: 3,
    mood: 'pumped',
  },
  {
    id: 'flintstag',
    name: 'Flintstag',
    artist: 'sketchbook_max',
    biome: 'ember',
    stats: { chonk: 30, spike: 32, zip: 24, charm: 14 },
    level: 1,
    mood: 'hungry',
  },
  {
    id: 'solarkiln',
    name: 'Solarkiln',
    artist: 'nib_and_nori',
    biome: 'ember',
    stats: { chonk: 36, spike: 40, zip: 10, charm: 14 },
    level: 2,
    mood: 'happy',
  },
  {
    id: 'brinebutton',
    name: 'Brinebutton',
    artist: 'charcoal_zed',
    biome: 'tidepool',
    stats: { chonk: 28, spike: 20, zip: 36, charm: 16 },
    level: 1,
    mood: 'sleepy',
  },
  {
    id: 'kelpkit',
    name: 'Kelpkit',
    artist: 'pixel_mara',
    biome: 'tidepool',
    stats: { chonk: 24, spike: 18, zip: 32, charm: 26 },
    level: 2,
    mood: 'pumped',
  },
  {
    id: 'pearlmote',
    name: 'Pearlmote',
    artist: 'linework_luz',
    biome: 'tidepool',
    stats: { chonk: 20, spike: 12, zip: 24, charm: 44 },
    level: 3,
    mood: 'happy',
  },
  {
    id: 'coraloom',
    name: 'Coraloom',
    artist: 'sticker_tess',
    biome: 'tidepool',
    stats: { chonk: 40, spike: 22, zip: 16, charm: 22 },
    level: 1,
    mood: 'hungry',
  },
  {
    id: 'moonurchin',
    name: 'Moonurchin',
    artist: 'colorwheel_ivy',
    biome: 'tidepool',
    stats: { chonk: 34, spike: 36, zip: 10, charm: 20 },
    level: 2,
    mood: 'sleepy',
  },
  {
    id: 'cloudpip',
    name: 'Cloudpip',
    artist: 'paperclip_noa',
    biome: 'sky',
    stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
    level: 1,
    mood: 'happy',
  },
  {
    id: 'gustling',
    name: 'Gustling',
    artist: 'inkdrop_milo',
    biome: 'sky',
    stats: { chonk: 20, spike: 24, zip: 42, charm: 14 },
    level: 2,
    mood: 'pumped',
  },
  {
    id: 'ribbonrook',
    name: 'Ribbonrook',
    artist: 'loopdoodle_ari',
    biome: 'sky',
    stats: { chonk: 24, spike: 16, zip: 34, charm: 26 },
    level: 3,
    mood: 'sleepy',
  },
  {
    id: 'thunderbud',
    name: 'Thunderbud',
    artist: 'washitape_kit',
    biome: 'sky',
    stats: { chonk: 26, spike: 38, zip: 20, charm: 16 },
    level: 1,
    mood: 'hungry',
  },
  {
    id: 'aurorawing',
    name: 'Aurorawing',
    artist: 'prism_nell',
    biome: 'sky',
    stats: { chonk: 22, spike: 26, zip: 28, charm: 24 },
    level: 2,
    mood: 'happy',
  },
];

const createFoundingScribbit = (species: FoundingSpeciesSource): Scribbit => {
  return {
    id: `founding-${species.id}`,
    name: species.name,
    artist: species.artist,
    element: elementByBiome[species.biome],
    stats: species.stats,
    imageUrl: `/creatures/creature-${species.id}.png`,
    bornDay: 0,
    expiresDay: Number.MAX_SAFE_INTEGER,
    belief: 0,
    wins: 0,
    losses: 0,
    status: 'alive',
    legendTitle: null,
    isFounding: true,
    accessories: [],
    level: species.level,
    xp: LEVEL_XP_THRESHOLDS[species.level - 1] ?? 0,
    mood: species.mood,
    careDoneToday: [],
    legacy: null,
  };
};

export const foundingScribbits: Scribbit[] = foundingSpeciesSources.map(
  createFoundingScribbit
);

export const foundingScribbitsById = new Map<string, Scribbit>(
  foundingScribbits.map((scribbit) => [scribbit.id, scribbit])
);

export const findFoundingScribbit = (
  scribbitId: string
): Scribbit | undefined => {
  const foundingScribbit = foundingScribbitsById.get(scribbitId);

  if (!foundingScribbit) {
    return undefined;
  }

  return {
    ...foundingScribbit,
    stats: { ...foundingScribbit.stats },
    accessories: [...foundingScribbit.accessories],
    careDoneToday: [...foundingScribbit.careDoneToday],
  };
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

  return {
    ...opponent,
    stats: { ...opponent.stats },
    accessories: [...opponent.accessories],
    careDoneToday: [...opponent.careDoneToday],
  };
};

type FoundingSparRivalCandidate = {
  scribbit: Scribbit;
  levelDistance: number;
  primaryPower: ReturnType<typeof selectPrimaryPower>;
};

const cloneFoundingScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...scribbit.accessories],
    careDoneToday: [...scribbit.careDoneToday],
  };
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
