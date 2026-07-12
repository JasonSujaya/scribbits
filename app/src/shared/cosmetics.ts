import type { CapsuleRarity } from './arena';

export type CosmeticKind = 'accessory' | 'pen' | 'title';

type CosmeticCatalogEntryBase = {
  id: string;
  kind: CosmeticKind;
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type CosmeticAccessoryCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'accessory';
  label: string;
};

export type CosmeticPenEffect = 'solid' | 'rainbow' | 'midnight';

export type CosmeticPenCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'pen';
  colors: readonly string[];
  effect: CosmeticPenEffect;
};

export type CosmeticTitleCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'title';
};

export type CosmeticCatalogEntry =
  | CosmeticAccessoryCatalogEntry
  | CosmeticPenCatalogEntry
  | CosmeticTitleCatalogEntry;

export const ACCESSORY_CATALOG_ENTRIES: readonly CosmeticAccessoryCatalogEntry[] =
  [
    {
      id: 'bowtie',
      kind: 'accessory',
      rarity: 'common',
      name: 'Bowtie',
      label: 'Bowtie',
      description: 'Instant tiny-gentleman energy for chaotic doodles.',
    },
    {
      id: 'flower-crown',
      kind: 'accessory',
      rarity: 'common',
      name: 'Flower Crown',
      label: 'Flower Crown',
      description: 'Petals for monsters who insist they are approachable.',
    },
    {
      id: 'monocle',
      kind: 'accessory',
      rarity: 'common',
      name: 'Monocle',
      label: 'Monocle',
      description: 'Makes every squiggle look like it owns a library ladder.',
    },
    {
      id: 'beanie',
      kind: 'accessory',
      rarity: 'common',
      name: 'Beanie',
      label: 'Beanie',
      description: 'A cozy hat for thoughts too weird to air out.',
    },
    {
      id: 'round-glasses',
      kind: 'accessory',
      rarity: 'common',
      name: 'Round Glasses',
      label: 'Round Glasses',
      description: 'Bookish circles for creatures with suspiciously big plans.',
    },
    {
      id: 'tiny-sword',
      kind: 'accessory',
      rarity: 'common',
      name: 'Tiny Sword',
      label: 'Tiny Sword',
      description: 'A pocket-sized blade for dramatic arena pointing.',
    },
    {
      id: 'snail-shell-backpack',
      kind: 'accessory',
      rarity: 'common',
      name: 'Snail Shell Backpack',
      label: 'Snail Shell Backpack',
      description: 'Carries snacks, secrets, and one heroic nap.',
    },
    {
      id: 'party-hat',
      kind: 'accessory',
      rarity: 'common',
      name: 'Party Hat',
      label: 'Party Hat',
      description: 'Proof that this battle is technically a celebration.',
    },
    {
      id: 'mustache',
      kind: 'accessory',
      rarity: 'common',
      name: 'Mustache',
      label: 'Mustache',
      description: 'Adds suspicious authority to any wobbly face.',
    },
    {
      id: 'inkquake-rumble-belt',
      kind: 'accessory',
      rarity: 'common',
      name: 'Inkquake Rumble Belt',
      label: 'Rumble Belt',
      description: 'A fault-line buckle that looks ready to split the page.',
    },
    {
      id: 'nib-halo-headband',
      kind: 'accessory',
      rarity: 'common',
      name: 'Nib Halo Headband',
      label: 'Nib Headband',
      description: 'Three tiny paper nibs in a very pointy parade formation.',
    },
    {
      id: 'smearstep-speed-scarf',
      kind: 'accessory',
      rarity: 'common',
      name: 'Smearstep Speed Scarf',
      label: 'Speed Scarf',
      description:
        'A streaky scrap that looks fast while standing perfectly still.',
    },
    {
      id: 'colorburst-rosette',
      kind: 'accessory',
      rarity: 'common',
      name: 'Colorburst Rosette',
      label: 'Colorburst Rosette',
      description:
        'A crayon-bright prize ribbon for winning the color argument.',
    },
    {
      id: 'top-hat',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Top Hat',
      label: 'Top Hat',
      description: 'Tall enough to store one terrible arena scheme.',
    },
    {
      id: 'cape',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Cape',
      label: 'Cape',
      description: 'Flaps heroically even when the Scribbit is standing still.',
    },
    {
      id: 'headphones',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Headphones',
      label: 'Headphones',
      description: 'Blocks heckles and boosts imaginary theme music.',
    },
    {
      id: 'eyepatch-scar',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Eyepatch + Scar',
      label: 'Eyepatch',
      description: 'A backstory shortcut with excellent squint potential.',
    },
    {
      id: 'propeller-cap',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Propeller Cap',
      label: 'Propeller Cap',
      description: 'For Scribbits who believe gravity is negotiable.',
    },
    {
      id: 'inkquake-crater-crown',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Inkquake Crater Crown',
      label: 'Crater Crown',
      description:
        'A fault-lined crown chipped from the fanciest crater on paper.',
    },
    {
      id: 'smearstep-ink-skates',
      kind: 'accessory',
      rarity: 'rare',
      name: 'Smearstep Ink Skates',
      label: 'Ink Skates',
      description:
        'Wobbly wheel-shoes with the speed lines already scribbled in.',
    },
    {
      id: 'golden-crown',
      kind: 'accessory',
      rarity: 'epic',
      name: 'GOLDEN CROWN',
      label: 'Golden Crown',
      description: 'Royal shine for a doodle with boss-fight posture.',
    },
    {
      id: 'dragon-wings',
      kind: 'accessory',
      rarity: 'epic',
      name: 'DRAGON WINGS',
      label: 'Dragon Wings',
      description: 'Big flap energy for tiny paper legends.',
    },
    {
      id: 'nib-halo-circlet',
      kind: 'accessory',
      rarity: 'epic',
      name: 'NIB HALO CIRCLET',
      label: 'Nib Halo Circlet',
      description: 'Three gilded nibs hold formation around one glorious halo.',
    },
    {
      id: 'colorburst-prism-crown',
      kind: 'accessory',
      rarity: 'epic',
      name: 'COLORBURST PRISM CROWN',
      label: 'Prism Crown',
      description:
        'A hand-cut rainbow crown that turns every pose into an event.',
    },
  ];

export const PEN_CATALOG_ENTRIES: readonly CosmeticPenCatalogEntry[] = [
  {
    id: 'warm-greys',
    kind: 'pen',
    rarity: 'common',
    name: 'Warm Greys',
    description: 'Soft sketchbook greys for cozy little smudges.',
    colors: ['#8a7f6d', '#b6a894', '#d8ccb7'],
    effect: 'solid',
  },
  {
    id: 'pastel-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Pastel Set',
    description: 'Candy-light colors that refuse to yell.',
    colors: ['#f6a6c9', '#b9e4c9', '#b8d7ff', '#ffe29a', '#cdb7f6'],
    effect: 'solid',
  },
  {
    id: 'autumn-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Autumn Set',
    description: 'Crunchy leaf tones with sweater-weather attitude.',
    colors: ['#7a3418', '#b75a25', '#d99a3d', '#8e6f38', '#4d3a24'],
    effect: 'solid',
  },
  {
    id: 'ocean-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Ocean Set',
    description: 'Tidepool blues for doodles that smell faintly salty.',
    colors: ['#063b5b', '#0c6e91', '#1597a5', '#5fc9c4', '#c7f3ed'],
    effect: 'solid',
  },
  {
    id: 'gold-pen',
    kind: 'pen',
    rarity: 'rare',
    name: 'Gold Pen',
    description: 'A shiny flex for lines that expect applause.',
    colors: ['#f0b000', '#ffd447'],
    effect: 'solid',
  },
  {
    id: 'neon-set',
    kind: 'pen',
    rarity: 'rare',
    name: 'Neon Set',
    description: 'Arcade-bright ink that looks illegal after midnight.',
    colors: ['#39ff14', '#00f5ff', '#ff2bd6', '#fff200', '#ff5f1f'],
    effect: 'solid',
  },
  {
    id: 'rainbow-crayon',
    kind: 'pen',
    rarity: 'epic',
    name: 'Rainbow Crayon',
    description: 'Draws hue-cycling strokes like a parade got sharpened.',
    colors: ['#ff5a3d', '#ff9a3d', '#f2cf3d', '#4faa4f', '#3ba0e0', '#8a5cd8'],
    effect: 'rainbow',
  },
  {
    id: 'midnight-ink',
    kind: 'pen',
    rarity: 'epic',
    name: 'Midnight Ink',
    description: 'Near-black ink with tiny star flecks.',
    colors: ['#0b0a12'],
    effect: 'midnight',
  },
];

export const TITLE_CATALOG_ENTRIES: readonly CosmeticTitleCatalogEntry[] = [
  {
    id: 'doodler',
    kind: 'title',
    rarity: 'common',
    name: 'Doodler',
    description: 'A humble badge for brave scribblers with messy hands.',
  },
  {
    id: 'inkslinger',
    kind: 'title',
    rarity: 'common',
    name: 'Inkslinger',
    description: 'For artists who draw first and explain the stain later.',
  },
  {
    id: 'brushlord',
    kind: 'title',
    rarity: 'rare',
    name: 'Brushlord',
    description: 'A fancy title for commanding one very loyal brush.',
  },
  {
    id: 'the-pen-ultimate',
    kind: 'title',
    rarity: 'epic',
    name: 'The Pen Ultimate',
    description: 'The final form of stationery-based confidence.',
  },
];

export const COSMETIC_CATALOG: readonly CosmeticCatalogEntry[] = [
  ...ACCESSORY_CATALOG_ENTRIES,
  ...PEN_CATALOG_ENTRIES,
  ...TITLE_CATALOG_ENTRIES,
];

export const COSMETIC_BY_ID: ReadonlyMap<string, CosmeticCatalogEntry> =
  new Map(COSMETIC_CATALOG.map((entry) => [entry.id, entry]));

const findCosmeticCatalogEntry = (
  cosmeticId: string
): CosmeticCatalogEntry | undefined => {
  return COSMETIC_BY_ID.get(cosmeticId);
};

export const findAccessoryCosmetic = (
  accessoryId: string
): CosmeticAccessoryCatalogEntry | undefined => {
  const entry = findCosmeticCatalogEntry(accessoryId);
  return entry?.kind === 'accessory' ? entry : undefined;
};
