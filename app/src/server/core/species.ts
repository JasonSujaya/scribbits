import type { Biome, Rarity, Species } from '../../shared/remonsta';

export type SpeciesCountByBiome = Record<Biome, number>;
export type SpeciesCountByRarity = Record<Rarity, number>;

export const launchSpecies: Species[] = [
  {
    id: 'mosswhisk',
    name: 'Mosswhisk',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'forest',
    lore: 'It braids fallen leaves into its tail so the forest can hear where it has wandered.',
    spriteKey: 'creature-mosswhisk',
  },
  {
    id: 'fernibble',
    name: 'Fernibble',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'forest',
    lore: 'It trims overgrown paths with tiny teeth and hides the clippings under sleeping roots.',
    spriteKey: 'creature-fernibble',
  },
  {
    id: 'barkbloom',
    name: 'Barkbloom',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'forest',
    lore: 'New flowers open along its wooden shell whenever a kind rumor crosses the grove.',
    spriteKey: 'creature-barkbloom',
  },
  {
    id: 'gladepuff',
    name: 'Gladepuff',
    artist: 'remonsta',
    rarity: 'uncommon',
    biome: 'forest',
    lore: 'It floats between sunbeams and shakes glittering pollen over lost seedlings.',
    spriteKey: 'creature-gladepuff',
  },
  {
    id: 'elderglen',
    name: 'Elderglen',
    artist: 'remonsta',
    rarity: 'rare',
    biome: 'forest',
    lore: 'The rings on its antlers mark every dawn it has guarded without breaking a twig.',
    spriteKey: 'creature-elderglen',
  },
  {
    id: 'coalimp',
    name: 'Coalimp',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'ember',
    lore: 'It stores warm cinders in its cheeks and trades them for shiny pebbles.',
    spriteKey: 'creature-coalimp',
  },
  {
    id: 'cindercoil',
    name: 'Cindercoil',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'ember',
    lore: 'Its looping trail cools into glassy ribbons that chime under moonlight.',
    spriteKey: 'creature-cindercoil',
  },
  {
    id: 'ashwaddle',
    name: 'Ashwaddle',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'ember',
    lore: 'It naps in soft ash piles and wakes wearing a new smoky pattern each day.',
    spriteKey: 'creature-ashwaddle',
  },
  {
    id: 'flintstag',
    name: 'Flintstag',
    artist: 'remonsta',
    rarity: 'uncommon',
    biome: 'ember',
    lore: 'Every hoofbeat sparks a brief constellation over the black stone flats.',
    spriteKey: 'creature-flintstag',
  },
  {
    id: 'solarkiln',
    name: 'Solarkiln',
    artist: 'remonsta',
    rarity: 'rare',
    biome: 'ember',
    lore: 'It swallows noonlight and exhales gentle heat for nests built in the cold.',
    spriteKey: 'creature-solarkiln',
  },
  {
    id: 'brinebutton',
    name: 'Brinebutton',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'tidepool',
    lore: 'It pops between puddles after rain and leaves perfect salt circles behind.',
    spriteKey: 'creature-brinebutton',
  },
  {
    id: 'kelpkit',
    name: 'Kelpkit',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'tidepool',
    lore: 'It knots seaweed into tiny ladders for smaller shore creatures at low tide.',
    spriteKey: 'creature-kelpkit',
  },
  {
    id: 'pearlmote',
    name: 'Pearlmote',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'tidepool',
    lore: 'Its shell glows brighter when someone nearby remembers a forgotten promise.',
    spriteKey: 'creature-pearlmote',
  },
  {
    id: 'coraloom',
    name: 'Coraloom',
    artist: 'remonsta',
    rarity: 'uncommon',
    biome: 'tidepool',
    lore: 'It weaves broken coral into bright reef arches that hum with the current.',
    spriteKey: 'creature-coraloom',
  },
  {
    id: 'moonurchin',
    name: 'Moonurchin',
    artist: 'remonsta',
    rarity: 'uncommon',
    biome: 'tidepool',
    lore: 'At dusk it rolls along the shore collecting moonlit foam on its silver spines.',
    spriteKey: 'creature-moonurchin',
  },
  {
    id: 'cloudpip',
    name: 'Cloudpip',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'sky',
    lore: 'It pecks tiny holes in clouds so sunbeams can visit the ground below.',
    spriteKey: 'creature-cloudpip',
  },
  {
    id: 'gustling',
    name: 'Gustling',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'sky',
    lore: 'It laughs through hollow reeds and sends playful breezes around corners.',
    spriteKey: 'creature-gustling',
  },
  {
    id: 'ribbonrook',
    name: 'Ribbonrook',
    artist: 'remonsta',
    rarity: 'common',
    biome: 'sky',
    lore: 'Its long tail writes loops in the air that migrating flocks use as road signs.',
    spriteKey: 'creature-ribbonrook',
  },
  {
    id: 'thunderbud',
    name: 'Thunderbud',
    artist: 'remonsta',
    rarity: 'uncommon',
    biome: 'sky',
    lore: 'It carries small rumbles in its petals and releases them only to wake sleepy hills.',
    spriteKey: 'creature-thunderbud',
  },
  {
    id: 'aurorawing',
    name: 'Aurorawing',
    artist: 'remonsta',
    rarity: 'legendary',
    biome: 'sky',
    lore: 'Its wings repaint the horizon when the world needs one more chance at morning.',
    spriteKey: 'creature-aurorawing',
  },
];

const makeSpeciesIdEntries = (speciesList: Species[]): [string, Species][] => {
  return speciesList.map((species) => [species.id, species]);
};

export const launchSpeciesById = new Map<string, Species>(
  makeSpeciesIdEntries(launchSpecies)
);

export const countSpeciesByBiome = (
  speciesList: Species[]
): SpeciesCountByBiome => {
  const counts: SpeciesCountByBiome = {
    forest: 0,
    ember: 0,
    tidepool: 0,
    sky: 0,
  };

  for (const species of speciesList) {
    counts[species.biome] += 1;
  }

  return counts;
};

export const countSpeciesByRarity = (
  speciesList: Species[]
): SpeciesCountByRarity => {
  const counts: SpeciesCountByRarity = {
    common: 0,
    uncommon: 0,
    rare: 0,
    legendary: 0,
  };

  for (const species of speciesList) {
    counts[species.rarity] += 1;
  }

  return counts;
};

export const launchSpeciesCountByBiome = countSpeciesByBiome(launchSpecies);
export const launchSpeciesCountByRarity = countSpeciesByRarity(launchSpecies);
export const totalLaunchSpecies = launchSpecies.length;

export const findLaunchSpeciesById = (
  speciesId: string
): Species | undefined => {
  return launchSpeciesById.get(speciesId);
};
