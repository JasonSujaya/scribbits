import type { CapsuleRarity } from '../../shared/arena';

export type InkAccessoryCatalogEntry = {
  id: string;
  kind: 'accessory';
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type InkPenCatalogEntry = {
  id: string;
  kind: 'pen';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  colors: string[];
};

export type InkTitleCatalogEntry = {
  id: string;
  kind: 'title';
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type InkCatalogEntry =
  | InkAccessoryCatalogEntry
  | InkPenCatalogEntry
  | InkTitleCatalogEntry;

export const INK_ACCESSORY_CATALOG: InkAccessoryCatalogEntry[] = [
  {
    id: 'bowtie',
    kind: 'accessory',
    rarity: 'common',
    name: 'Bowtie',
    description: 'Instant tiny-gentleman energy for chaotic doodles.',
  },
  {
    id: 'flower-crown',
    kind: 'accessory',
    rarity: 'common',
    name: 'Flower Crown',
    description: 'Petals for monsters who insist they are approachable.',
  },
  {
    id: 'monocle',
    kind: 'accessory',
    rarity: 'common',
    name: 'Monocle',
    description: 'Makes every squiggle look like it owns a library ladder.',
  },
  {
    id: 'beanie',
    kind: 'accessory',
    rarity: 'common',
    name: 'Beanie',
    description: 'A cozy hat for thoughts too weird to air out.',
  },
  {
    id: 'round-glasses',
    kind: 'accessory',
    rarity: 'common',
    name: 'Round Glasses',
    description: 'Bookish circles for creatures with suspiciously big plans.',
  },
  {
    id: 'tiny-sword',
    kind: 'accessory',
    rarity: 'common',
    name: 'Tiny Sword',
    description: 'A pocket-sized blade for dramatic arena pointing.',
  },
  {
    id: 'snail-shell-backpack',
    kind: 'accessory',
    rarity: 'common',
    name: 'Snail Shell Backpack',
    description: 'Carries snacks, secrets, and one heroic nap.',
  },
  {
    id: 'party-hat',
    kind: 'accessory',
    rarity: 'common',
    name: 'Party Hat',
    description: 'Proof that this battle is technically a celebration.',
  },
  {
    id: 'mustache',
    kind: 'accessory',
    rarity: 'common',
    name: 'Mustache',
    description: 'Adds suspicious authority to any wobbly face.',
  },
  {
    id: 'top-hat',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Top Hat',
    description: 'Tall enough to store one terrible arena scheme.',
  },
  {
    id: 'cape',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Cape',
    description: 'Flaps heroically even when the Scribbit is standing still.',
  },
  {
    id: 'headphones',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Headphones',
    description: 'Blocks heckles and boosts imaginary theme music.',
  },
  {
    id: 'eyepatch-scar',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Eyepatch + Scar',
    description: 'A backstory shortcut with excellent squint potential.',
  },
  {
    id: 'propeller-cap',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Propeller Cap',
    description: 'For Scribbits who believe gravity is negotiable.',
  },
  {
    id: 'golden-crown',
    kind: 'accessory',
    rarity: 'epic',
    name: 'GOLDEN CROWN',
    description: 'Royal shine for a doodle with boss-fight posture.',
  },
  {
    id: 'dragon-wings',
    kind: 'accessory',
    rarity: 'epic',
    name: 'DRAGON WINGS',
    description: 'Big flap energy for tiny paper legends.',
  },
];

export const INK_PEN_CATALOG: InkPenCatalogEntry[] = [
  {
    id: 'warm-greys',
    kind: 'pen',
    rarity: 'common',
    name: 'Warm Greys',
    description: 'Soft sketchbook greys for cozy little smudges.',
    colors: ['#2F2A26', '#5C524B', '#8B8178', '#B9AEA4', '#E2D8CE'],
  },
  {
    id: 'pastel-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Pastel Set',
    description: 'Candy-light colors that refuse to yell.',
    colors: ['#F6A6C9', '#B9E4C9', '#B8D7FF', '#FFE29A', '#CDB7F6'],
  },
  {
    id: 'autumn-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Autumn Set',
    description: 'Crunchy leaf tones with sweater-weather attitude.',
    colors: ['#7A3418', '#B75A25', '#D99A3D', '#8E6F38', '#4D3A24'],
  },
  {
    id: 'ocean-set',
    kind: 'pen',
    rarity: 'common',
    name: 'Ocean Set',
    description: 'Tidepool blues for doodles that smell faintly salty.',
    colors: ['#063B5B', '#0C6E91', '#1597A5', '#5FC9C4', '#C7F3ED'],
  },
  {
    id: 'gold-pen',
    kind: 'pen',
    rarity: 'rare',
    name: 'Gold Pen',
    description: 'A shiny flex for lines that expect applause.',
    colors: ['#5C3D05', '#B98212', '#E3B23C', '#FFE08A', '#FFF3C4'],
  },
  {
    id: 'neon-set',
    kind: 'pen',
    rarity: 'rare',
    name: 'Neon Set',
    description: 'Arcade-bright ink that looks illegal after midnight.',
    colors: ['#39FF14', '#00F5FF', '#FF2BD6', '#FFF200', '#FF5F1F'],
  },
];

export const INK_TITLE_CATALOG: InkTitleCatalogEntry[] = [
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

export const INK_CATALOG: InkCatalogEntry[] = [
  ...INK_ACCESSORY_CATALOG,
  ...INK_PEN_CATALOG,
  ...INK_TITLE_CATALOG,
];

const inkCatalogById = new Map<string, InkCatalogEntry>(
  INK_CATALOG.map((entry) => {
    return [entry.id, entry];
  })
);

export const findInkCatalogEntry = (
  catalogId: string
): InkCatalogEntry | undefined => {
  return inkCatalogById.get(catalogId);
};

export const isAccessoryCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkAccessoryCatalogEntry => {
  return entry?.kind === 'accessory';
};
