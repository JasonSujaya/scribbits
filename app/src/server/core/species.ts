import type { Element, Scribbit, ScribbitStats } from '../../shared/arena';

type FoundingBiome = 'forest' | 'ember' | 'tidepool' | 'sky';

type FoundingSpeciesSource = {
  id: string;
  name: string;
  biome: FoundingBiome;
  stats: ScribbitStats;
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
    biome: 'forest',
    stats: { chonk: 34, spike: 18, zip: 28, charm: 20 },
  },
  {
    id: 'fernibble',
    name: 'Fernibble',
    biome: 'forest',
    stats: { chonk: 22, spike: 30, zip: 34, charm: 14 },
  },
  {
    id: 'barkbloom',
    name: 'Barkbloom',
    biome: 'forest',
    stats: { chonk: 48, spike: 16, zip: 12, charm: 24 },
  },
  {
    id: 'gladepuff',
    name: 'Gladepuff',
    biome: 'forest',
    stats: { chonk: 20, spike: 14, zip: 30, charm: 36 },
  },
  {
    id: 'elderglen',
    name: 'Elderglen',
    biome: 'forest',
    stats: { chonk: 42, spike: 26, zip: 10, charm: 22 },
  },
  {
    id: 'coalimp',
    name: 'Coalimp',
    biome: 'ember',
    stats: { chonk: 18, spike: 38, zip: 28, charm: 16 },
  },
  {
    id: 'cindercoil',
    name: 'Cindercoil',
    biome: 'ember',
    stats: { chonk: 26, spike: 34, zip: 30, charm: 10 },
  },
  {
    id: 'ashwaddle',
    name: 'Ashwaddle',
    biome: 'ember',
    stats: { chonk: 44, spike: 28, zip: 10, charm: 18 },
  },
  {
    id: 'flintstag',
    name: 'Flintstag',
    biome: 'ember',
    stats: { chonk: 30, spike: 32, zip: 24, charm: 14 },
  },
  {
    id: 'solarkiln',
    name: 'Solarkiln',
    biome: 'ember',
    stats: { chonk: 36, spike: 40, zip: 10, charm: 14 },
  },
  {
    id: 'brinebutton',
    name: 'Brinebutton',
    biome: 'tidepool',
    stats: { chonk: 28, spike: 20, zip: 36, charm: 16 },
  },
  {
    id: 'kelpkit',
    name: 'Kelpkit',
    biome: 'tidepool',
    stats: { chonk: 24, spike: 18, zip: 32, charm: 26 },
  },
  {
    id: 'pearlmote',
    name: 'Pearlmote',
    biome: 'tidepool',
    stats: { chonk: 20, spike: 12, zip: 24, charm: 44 },
  },
  {
    id: 'coraloom',
    name: 'Coraloom',
    biome: 'tidepool',
    stats: { chonk: 40, spike: 22, zip: 16, charm: 22 },
  },
  {
    id: 'moonurchin',
    name: 'Moonurchin',
    biome: 'tidepool',
    stats: { chonk: 34, spike: 36, zip: 10, charm: 20 },
  },
  {
    id: 'cloudpip',
    name: 'Cloudpip',
    biome: 'sky',
    stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
  },
  {
    id: 'gustling',
    name: 'Gustling',
    biome: 'sky',
    stats: { chonk: 20, spike: 24, zip: 42, charm: 14 },
  },
  {
    id: 'ribbonrook',
    name: 'Ribbonrook',
    biome: 'sky',
    stats: { chonk: 24, spike: 16, zip: 34, charm: 26 },
  },
  {
    id: 'thunderbud',
    name: 'Thunderbud',
    biome: 'sky',
    stats: { chonk: 26, spike: 38, zip: 20, charm: 16 },
  },
  {
    id: 'aurorawing',
    name: 'Aurorawing',
    biome: 'sky',
    stats: { chonk: 22, spike: 26, zip: 28, charm: 24 },
  },
];

const createFoundingScribbit = (
  species: FoundingSpeciesSource
): Scribbit => {
  return {
    id: `founding-${species.id}`,
    name: species.name,
    artist: 'scribbits',
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
  };
};

export const foundingScribbits: Scribbit[] =
  foundingSpeciesSources.map(createFoundingScribbit);

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
  };
};
