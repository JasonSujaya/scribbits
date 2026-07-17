import type { CapsuleRarity } from './arena';
import type { AccessoryEffectFamily } from './accessoryeffects';
import type { CombatRole } from './combat';
import {
  EQUIPMENT_CATEGORIES,
  parseEquipmentLoadout,
  type EquipmentCategory,
  type EquipmentLoadout,
} from './equipment';

export type CosmeticKind =
  | 'accessory'
  | 'pen'
  | 'title'
  | 'drawing-ink'
  | 'brush';

type CosmeticCatalogEntryBase = {
  id: string;
  kind: CosmeticKind;
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type CosmeticGearCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'accessory';
  label: string;
  category: EquipmentCategory;
  effectFamily: AccessoryEffectFamily;
  roleAffinity?: CombatRole;
  roleEffect?: string;
};

// Compatibility name for the current persisted `kind: accessory` transport.
// New equipment code should use CosmeticGearCatalogEntry.
export type CosmeticAccessoryCatalogEntry = CosmeticGearCatalogEntry;

// Retired Gear moves here instead of disappearing. These complete tombstones
// remain valid for stored loadouts and historical reports but are intentionally
// excluded from the obtainable catalog and Mystery Ink drops.
export const RETIRED_GEAR_TOMBSTONES: readonly CosmeticGearCatalogEntry[] = [];

export type CosmeticPenEffect = 'solid' | 'rainbow' | 'midnight';

export type CosmeticPenCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'pen';
  colors: readonly string[];
  effect: CosmeticPenEffect;
};

export type CosmeticDrawingInkCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'drawing-ink';
  colors: readonly string[];
  effect: CosmeticPenEffect;
};

export type CosmeticBrushEffect = 'chalk' | 'ribbon' | 'spray';

export type CosmeticBrushCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'brush';
  effect: CosmeticBrushEffect;
};

export type CosmeticTitleCatalogEntry = CosmeticCatalogEntryBase & {
  kind: 'title';
};

export type CosmeticCatalogEntry =
  | CosmeticGearCatalogEntry
  | CosmeticPenCatalogEntry
  | CosmeticTitleCatalogEntry
  | CosmeticDrawingInkCatalogEntry
  | CosmeticBrushCatalogEntry;

export const GEAR_CATALOG_ENTRIES: readonly CosmeticGearCatalogEntry[] = [
  {
    id: 'bowtie',
    kind: 'accessory',
    rarity: 'common',
    name: 'Bowtie',
    label: 'Bowtie',
    category: 'accessory',
    effectFamily: 'ready',
    description: 'Instant tiny-gentleman energy for chaotic doodles.',
  },
  {
    id: 'flower-crown',
    kind: 'accessory',
    rarity: 'common',
    name: 'Flower Crown',
    label: 'Flower Crown',
    category: 'accessory',
    effectFamily: 'fortune',
    description: 'Petals for monsters who insist they are approachable.',
  },
  {
    id: 'monocle',
    kind: 'accessory',
    rarity: 'common',
    name: 'Monocle',
    label: 'Monocle',
    category: 'accessory',
    effectFamily: 'focus',
    description: 'Makes every squiggle look like it owns a library ladder.',
  },
  {
    id: 'beanie',
    kind: 'accessory',
    rarity: 'common',
    name: 'Beanie',
    label: 'Beanie',
    category: 'armor',
    effectFamily: 'guard',
    description: 'A cozy hat for thoughts too weird to air out.',
  },
  {
    id: 'round-glasses',
    kind: 'accessory',
    rarity: 'common',
    name: 'Round Glasses',
    label: 'Round Glasses',
    category: 'accessory',
    effectFamily: 'focus',
    description: 'Bookish circles for creatures with suspiciously big plans.',
  },
  {
    id: 'tiny-sword',
    kind: 'accessory',
    rarity: 'common',
    name: 'Tiny Sword',
    label: 'Tiny Sword',
    category: 'weapon',
    effectFamily: 'aim',
    description: 'A pocket-sized blade for dramatic arena pointing.',
  },
  {
    id: 'snail-shell-backpack',
    kind: 'accessory',
    rarity: 'common',
    name: 'Snail Shell Backpack',
    label: 'Snail Shell Backpack',
    category: 'armor',
    effectFamily: 'guard',
    description: 'Carries snacks, secrets, and one heroic nap.',
  },
  {
    id: 'party-hat',
    kind: 'accessory',
    rarity: 'common',
    name: 'Party Hat',
    label: 'Party Hat',
    category: 'accessory',
    effectFamily: 'ready',
    description: 'Proof that this battle is technically a celebration.',
  },
  {
    id: 'mustache',
    kind: 'accessory',
    rarity: 'common',
    name: 'Mustache',
    label: 'Mustache',
    category: 'accessory',
    effectFamily: 'focus',
    description: 'Adds suspicious authority to any wobbly face.',
  },
  {
    id: 'inkquake-rumble-belt',
    kind: 'accessory',
    rarity: 'common',
    name: 'Inkquake Rumble Belt',
    label: 'Rumble Belt',
    category: 'weapon',
    effectFamily: 'ready',
    roleAffinity: 'brawler',
    roleEffect: 'Tightens the opening Body Slam and reinforces Inkquake.',
    description: 'A fault-line buckle that looks ready to split the page.',
  },
  {
    id: 'nib-halo-headband',
    kind: 'accessory',
    rarity: 'common',
    name: 'Nib Halo Headband',
    label: 'Nib Headband',
    category: 'accessory',
    effectFamily: 'aim',
    roleAffinity: 'longshot',
    roleEffect: 'Steadies Piercing Quill aim and the three-shot Nib Volley.',
    description: 'Three tiny paper nibs in a very pointy parade formation.',
  },
  {
    id: 'smearstep-speed-scarf',
    kind: 'accessory',
    rarity: 'common',
    name: 'Longshot Trail Scarf',
    label: 'Speed Scarf',
    category: 'shoes',
    effectFamily: 'rush',
    roleAffinity: 'longshot',
    roleEffect: 'Helps Longshot make space before firing the Quill Launcher.',
    description:
      'A streaky scrap that looks fast while standing perfectly still.',
  },
  {
    id: 'colorburst-rosette',
    kind: 'accessory',
    rarity: 'common',
    name: 'Colorburst Rosette',
    label: 'Colorburst Rosette',
    category: 'accessory',
    effectFamily: 'fortune',
    roleAffinity: 'mage',
    roleEffect: 'Focuses Color Bolts and reinforces the Colorburst channel.',
    description: 'A crayon-bright prize ribbon for winning the color argument.',
  },
  {
    id: 'cardboard-shield',
    kind: 'accessory',
    rarity: 'common',
    name: 'Cardboard Shield',
    label: 'Cardboard Shield',
    category: 'armor',
    effectFamily: 'guard',
    description: 'A sturdy box-lid shield with brave marker lines.',
  },
  {
    id: 'wooden-spoon',
    kind: 'accessory',
    rarity: 'common',
    name: 'Wooden Spoon',
    label: 'Wooden Spoon',
    category: 'weapon',
    effectFamily: 'aim',
    description: 'Kitchen-table equipment for surprisingly precise bonks.',
  },
  {
    id: 'canvas-sneakers',
    kind: 'accessory',
    rarity: 'common',
    name: 'Canvas Sneakers',
    label: 'Canvas Sneakers',
    category: 'shoes',
    effectFamily: 'rush',
    description: 'Plain lace-ups made for dashing across notebook margins.',
  },
  {
    id: 'button-badge',
    kind: 'accessory',
    rarity: 'common',
    name: 'Button Badge',
    label: 'Button Badge',
    category: 'accessory',
    effectFamily: 'fortune',
    description: 'A cheerful pin that makes ordinary luck feel official.',
  },
  {
    id: 'top-hat',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Top Hat',
    label: 'Top Hat',
    category: 'accessory',
    effectFamily: 'ready',
    description: 'Tall enough to store one terrible arena scheme.',
  },
  {
    id: 'cape',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Cape',
    label: 'Cape',
    category: 'armor',
    effectFamily: 'guard',
    description: 'Flaps heroically even when the Scribbit is standing still.',
  },
  {
    id: 'headphones',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Headphones',
    label: 'Headphones',
    category: 'accessory',
    effectFamily: 'focus',
    description: 'Blocks heckles and boosts imaginary theme music.',
  },
  {
    id: 'eyepatch-scar',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Eyepatch + Scar',
    label: 'Eyepatch',
    category: 'accessory',
    effectFamily: 'aim',
    description: 'A backstory shortcut with excellent squint potential.',
  },
  {
    id: 'propeller-cap',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Propeller Cap',
    label: 'Propeller Cap',
    category: 'shoes',
    effectFamily: 'rush',
    description: 'For Scribbits who believe gravity is negotiable.',
  },
  {
    id: 'inkquake-crater-crown',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Inkquake Stone Guard',
    label: 'Stone Guard',
    category: 'armor',
    effectFamily: 'guard',
    roleAffinity: 'brawler',
    roleEffect: 'Adds close-range guard while the Brawler closes distance.',
    description: 'A fault-lined stone guard chipped from a paper crater.',
  },
  {
    id: 'smearstep-ink-skates',
    kind: 'accessory',
    rarity: 'rare',
    name: 'Longshot Ink Skates',
    label: 'Ink Skates',
    category: 'shoes',
    effectFamily: 'rush',
    roleAffinity: 'longshot',
    roleEffect: 'Reinforces Longshot movement between heavy quill shots.',
    description:
      'Wobbly wheel-shoes with the speed lines already scribbled in.',
  },
  {
    id: 'golden-crown',
    kind: 'accessory',
    rarity: 'epic',
    name: 'GOLDEN CROWN',
    label: 'Golden Crown',
    category: 'armor',
    effectFamily: 'fortune',
    description: 'Royal shine for a doodle with boss-fight posture.',
  },
  {
    id: 'dragon-wings',
    kind: 'accessory',
    rarity: 'epic',
    name: 'DRAGON WINGS',
    label: 'Dragon Wings',
    category: 'armor',
    effectFamily: 'rush',
    description: 'Big flap energy for tiny paper legends.',
  },
  {
    id: 'nib-halo-circlet',
    kind: 'accessory',
    rarity: 'epic',
    name: 'NIB HALO CIRCLET',
    label: 'Nib Halo Circlet',
    category: 'accessory',
    effectFamily: 'aim',
    roleAffinity: 'longshot',
    roleEffect: 'Stabilizes long-range aim before a heavy Nib Volley.',
    description: 'Three gilded nibs hold formation around one glorious halo.',
  },
  {
    id: 'colorburst-prism-crown',
    kind: 'accessory',
    rarity: 'epic',
    name: 'COLORBURST PRISM AMULET',
    label: 'Prism Amulet',
    category: 'accessory',
    effectFamily: 'fortune',
    roleAffinity: 'mage',
    roleEffect: 'Strengthens the palette ward during a visible channel.',
    description: 'A hand-cut prism amulet that turns every pose into an event.',
  },
  {
    id: 'comet-crayon-blade',
    kind: 'accessory',
    rarity: 'epic',
    name: 'COMET CRAYON BLADE',
    label: 'Comet Blade',
    category: 'weapon',
    effectFamily: 'aim',
    description: 'A blazing crayon sword that leaves a bright scribble trail.',
  },
  {
    id: 'rocket-eraser-boots',
    kind: 'accessory',
    rarity: 'epic',
    name: 'ROCKET ERASER BOOTS',
    label: 'Rocket Boots',
    category: 'shoes',
    effectFamily: 'rush',
    description: 'Twin eraser rockets built for very fast corrections.',
  },
  {
    id: 'void-nib-lance',
    kind: 'accessory',
    rarity: 'legendary',
    name: 'Void Nib Lance',
    label: 'Void Nib Lance',
    category: 'weapon',
    effectFamily: 'aim',
    description:
      'A midnight nib-lance that draws one impossible straight line.',
  },
  {
    id: 'moon-moth-mantle',
    kind: 'accessory',
    rarity: 'legendary',
    name: 'Moon Moth Mantle',
    label: 'Moon Moth Mantle',
    category: 'armor',
    effectFamily: 'guard',
    description:
      'Soft lunar wings folded into a mantle that catches every blow.',
  },
  {
    id: 'thundercloud-sneakers',
    kind: 'accessory',
    rarity: 'legendary',
    name: 'Thundercloud Sneakers',
    label: 'Thundercloud Sneakers',
    category: 'shoes',
    effectFamily: 'rush',
    description: 'Storm-laced sneakers that leave a crackling ink trail.',
  },
  {
    id: 'star-eye-mask',
    kind: 'accessory',
    rarity: 'legendary',
    name: 'Star-Eye Mask',
    label: 'Star-Eye Mask',
    category: 'accessory',
    effectFamily: 'focus',
    description:
      'A deep-space mask with one bright eye fixed on the next move.',
  },
];

// Persisted capsule receipts and drawing submissions still call these items
// accessories. Keep one catalog reference while the transport migration is
// deliberately deferred.
export const ACCESSORY_CATALOG_ENTRIES = GEAR_CATALOG_ENTRIES;

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
    colors: [
      '#8b5a2b',
      '#ff5a3d',
      '#ff9a3d',
      '#f2cf3d',
      '#4faa4f',
      '#3ba0e0',
      '#7fd8e6',
      '#8a5cd8',
      '#ff7fb0',
    ],
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

export const DRAWING_INK_CATALOG_ENTRIES: readonly CosmeticDrawingInkCatalogEntry[] =
  [
    {
      id: 'berry-jam-ink',
      kind: 'drawing-ink',
      rarity: 'common',
      name: 'Berry Jam Ink',
      description: 'A juicy berry-red paint charge for one finished Scribbit.',
      colors: ['#8f315b'],
      effect: 'solid',
    },
    {
      id: 'ghostlight-ink',
      kind: 'drawing-ink',
      rarity: 'rare',
      name: 'Ghostlight Ink',
      description: 'An eerie blue-green paint charge that glows off the page.',
      colors: ['#35d6c0'],
      effect: 'solid',
    },
    {
      id: 'prism-shift-ink',
      kind: 'drawing-ink',
      rarity: 'epic',
      name: 'Prism Shift Ink',
      description:
        'A full-spectrum paint charge that changes color as it moves.',
      colors: [
        '#ff5a3d',
        '#ff9a3d',
        '#f2cf3d',
        '#4faa4f',
        '#3ba0e0',
        '#8a5cd8',
      ],
      effect: 'rainbow',
    },
    {
      id: 'starlight-ink',
      kind: 'drawing-ink',
      rarity: 'legendary',
      name: 'Starlight Ink',
      description:
        'A midnight paint charge dusted with stars for one finished Scribbit.',
      colors: ['#13102b', '#fff4a8'],
      effect: 'midnight',
    },
  ];

export const BRUSH_CATALOG_ENTRIES: readonly CosmeticBrushCatalogEntry[] = [
  {
    id: 'sidewalk-chalk-brush',
    kind: 'brush',
    rarity: 'common',
    name: 'Sidewalk Chalk Brush',
    description: 'A dusty chalk charge for soft, broken-edged Scribbit lines.',
    effect: 'chalk',
  },
  {
    id: 'ribbon-brush',
    kind: 'brush',
    rarity: 'rare',
    name: 'Ribbon Brush',
    description: 'A flowing ribbon charge for broad, folded-looking strokes.',
    effect: 'ribbon',
  },
  {
    id: 'star-spray-brush',
    kind: 'brush',
    rarity: 'epic',
    name: 'Star Spray Brush',
    description: 'A sparkling spray charge for one gloriously messy Scribbit.',
    effect: 'spray',
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
  ...GEAR_CATALOG_ENTRIES,
  ...PEN_CATALOG_ENTRIES,
  ...TITLE_CATALOG_ENTRIES,
  ...DRAWING_INK_CATALOG_ENTRIES,
  ...BRUSH_CATALOG_ENTRIES,
];

export const COSMETIC_BY_ID: ReadonlyMap<string, CosmeticCatalogEntry> =
  new Map(COSMETIC_CATALOG.map((entry) => [entry.id, entry]));

export const PERSISTED_GEAR_CATALOG_ENTRIES: readonly CosmeticGearCatalogEntry[] =
  Object.freeze([...GEAR_CATALOG_ENTRIES, ...RETIRED_GEAR_TOMBSTONES]);

const PERSISTED_GEAR_BY_ID: ReadonlyMap<string, CosmeticGearCatalogEntry> =
  new Map(PERSISTED_GEAR_CATALOG_ENTRIES.map((entry) => [entry.id, entry]));

if (PERSISTED_GEAR_BY_ID.size !== PERSISTED_GEAR_CATALOG_ENTRIES.length) {
  throw new Error('Persisted Gear IDs must remain unique.');
}

export const findAccessoryCosmetic = (
  accessoryId: string
): CosmeticAccessoryCatalogEntry | undefined => {
  return PERSISTED_GEAR_BY_ID.get(accessoryId);
};

export const findGearCosmetic = findAccessoryCosmetic;

export function validateCatalogEquipmentLoadout(
  value: unknown
): EquipmentLoadout | undefined {
  const loadout = parseEquipmentLoadout(value);
  if (!loadout) return undefined;

  for (const category of EQUIPMENT_CATEGORIES) {
    for (const catalogId of loadout[category]) {
      if (catalogId === null) continue;
      if (findGearCosmetic(catalogId)?.category !== category) return undefined;
    }
  }
  return loadout;
}
