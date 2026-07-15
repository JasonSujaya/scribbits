#!/usr/bin/env node

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockBattleReportFactory } from './mock-battle-factory.mjs';

const port = Number(process.env.PORT ?? 8902);
const autoReload = process.env.MOCK_AUTO_RELOAD !== '0';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = join(repoRoot, 'dist', 'client');
const mockAssetRoot = join(repoRoot, 'dist', 'mock-assets');
const configuredTrailerHeroPath = process.env.MOCK_TRAILER_HERO_PATH?.trim();
const trailerHeroBytes =
  configuredTrailerHeroPath && existsSync(configuredTrailerHeroPath)
    ? readFileSync(configuredTrailerHeroPath)
    : null;
const configuredMockCombatBundleUrl =
  process.env.MOCK_COMBAT_BUNDLE_URL?.trim();
const mockCombatBundleUrl = configuredMockCombatBundleUrl
  ? new URL(configuredMockCombatBundleUrl)
  : new URL('../dist/mock-runtime/battle.mjs', import.meta.url);
if (!existsSync(fileURLToPath(mockCombatBundleUrl))) {
  throw new Error(
    'Production combat mock bundle is missing. Run node scripts/build-mock-combat.mjs.'
  );
}
const {
  CAPSULE_COST,
  GEAR_MERGE_COPY_COST,
  MAX_GEAR_RANK,
  COSMETIC_CATALOG,
  DAILY_LOGIN_TRACK,
  INK_REWARDS,
  MAX_ALIVE_PER_USER,
  MAX_GROWING_PER_USER,
  MAXIMUM_POWER_UPS,
  POWER_UP_CATALOG,
  SCRIBBIT_STAT_KEYS,
  SCOUT_NOTEBOOK_MAXIMUM_ENTRIES,
  XP_REWARDS,
  addXpToScribbit,
  applyBattleOutcomeToScribbit,
  advanceCapsulePity,
  advanceFounderChronicle,
  advanceRivalRunState,
  chooseFoundingSparOpponent,
  cloneScribbit,
  collectLegacyCards,
  createEmptyFounderChronicle,
  createEmptyEquipmentLoadout,
  createDeterministicPowerUpOffer,
  createScribbit,
  createScribbitLegacy,
  createPracticeBattle,
  createCapsuleProgress,
  createRivalRunChoices,
  createRivalRunState,
  createScoutNotebookState,
  dailyLoginRewardAfterClaims,
  createSparRewardReceipt,
  findFoundingScribbit,
  generateForecastForDay,
  getCapsuleCostForDailyState,
  getBattleArenaForDay,
  getLevelForXp,
  getNextBattleArenaUnlock,
  getNextLegacySeenThroughDay,
  getPaintBucketState,
  getRumbleProgressionRewards,
  hashStringToUint32,
  isElement,
  isPowerUpId,
  isScoutNotebookReplayDay,
  paginateLegacyCards,
  parseLegacyCardsPageSize,
  parseCompleteScribbitUpgrades,
  projectFounderChronicle,
  projectLegacyReturnReceipt,
  resolveExpiredScribbitStatus,
  projectScoutNotebookPick,
  projectSubmissionConsumableInventoryConsumption,
  projectCapsuleInventoryGrant,
  projectEquippedTitle,
  projectGearMerge,
  createScribbitUpgradesForLevel,
  equipGearInLoadout,
  findGearCosmetic,
  isEquipmentCategory,
  selectFoundingSparRivalSlate,
  sortLegacyCardsNewestFirst,
  simulate: simulateProductionBattle,
  selectCapsuleDrop,
  selectCommunityDoodleDare,
  validateAndAnalyzeScribbitSubmission,
  validateCatalogEquipmentLoadout,
} = await import(mockCombatBundleUrl.href);
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5l6wAAAABJRU5ErkJggg==',
  'base64'
);

// Transparent, non-square drawings whose silhouette matches each Scribbit's
// dominant stat and therefore its primary combat power.
const mockDrawingFileByDominantStat = Object.freeze({
  chonk: 'drawing-chonk-inkquake.png',
  spike: 'drawing-spike-nib-halo.png',
  zip: 'drawing-zip-smearstep.png',
  charm: 'drawing-charm-colorburst.png',
});
const submittedDrawingBytes = new Map();
const submittedScribbitPreviewModes = new Map();
const freeDrawingsById = new Map();
const freeDrawingOwnerById = new Map();

const maximumLegendsPageSize = 50;
const mockCapsuleCatalogIds = new Set(COSMETIC_CATALOG.map((drop) => drop.id));
const productionCosmeticById = new Map(
  COSMETIC_CATALOG.map((drop) => [drop.id, drop])
);
if (
  COSMETIC_CATALOG.length === 0 ||
  mockCapsuleCatalogIds.size !== COSMETIC_CATALOG.length
) {
  throw new Error('Mock capsule catalog must mirror unique production drops.');
}

const getProductionCosmetic = (cosmeticId, expectedKind) => {
  const cosmetic = productionCosmeticById.get(cosmeticId);
  if (!cosmetic || (expectedKind && cosmetic.kind !== expectedKind)) {
    throw new Error(
      `Unknown production ${expectedKind ?? 'cosmetic'}: ${cosmeticId}`
    );
  }
  return cosmetic;
};

const snapshotCosmetic = (cosmeticId, expectedKind) => {
  const cosmetic = getProductionCosmetic(cosmeticId, expectedKind);
  return Object.freeze({
    id: cosmetic.id,
    name: cosmetic.name,
    rarity: cosmetic.rarity,
  });
};

const makeImmutableLegacySnapshot = (scribbit, creatorTitleId = null) => {
  const creatorTitle = creatorTitleId
    ? snapshotCosmetic(creatorTitleId, 'title')
    : null;
  const legacy = createScribbitLegacy(scribbit, { creatorTitle });
  return Object.freeze({
    ...legacy,
    creatorTitle: legacy.creatorTitle
      ? Object.freeze({ ...legacy.creatorTitle })
      : null,
    accessories: Object.freeze(
      legacy.accessories.map((accessory) => Object.freeze({ ...accessory }))
    ),
  });
};

const nextUtcMidnightMs = () => {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
};

const makeScribbit = (options) => {
  // Founding Scribbits use semantic /creatures routes exactly like the real
  // server, exercising the client's deterministic stat-shaped mascots. Everyone
  // else uses the mock-only /api/drawing/{id} fixture route. Production always
  // uses Reddit media hosting and intentionally has no raw drawing endpoint.
  const defaultImageUrl = options.isFounding
    ? `/creatures/creature-${String(options.id).replace(/^founding-/, '')}.png`
    : `/api/drawing/${options.id}`;
  const xp = Number.isFinite(options.xp)
    ? Math.max(0, Math.floor(options.xp))
    : 0;
  const status = options.status ?? 'alive';
  const level = getLevelForXp(xp);
  const explicitUpgrades =
    options.upgrades === undefined
      ? undefined
      : parseCompleteScribbitUpgrades(options.upgrades, level);
  if (options.upgrades !== undefined && !explicitUpgrades) {
    throw new Error(`Mock Scribbit ${options.id} has malformed Ink Mods.`);
  }
  const accessories = options.accessories ? [...options.accessories] : [];
  const equipmentLoadout =
    options.equipmentLoadout ?? createEmptyEquipmentLoadout();
  const presentedGearIds = new Set([
    ...accessories,
    ...Object.values(equipmentLoadout)
      .flat()
      .filter((gearId) => typeof gearId === 'string'),
  ]);
  const bornDay = options.bornDay ?? 8;
  const scribbit = {
    id: options.id,
    name: options.name,
    artist: options.artist,
    element: options.element,
    stats: { ...options.stats },
    imageUrl: options.imageUrl ?? defaultImageUrl,
    drawingThemeId: options.isFounding
      ? null
      : (options.drawingThemeId ??
        selectCommunityDoodleDare(bornDay, options.artist).id),
    bornDay,
    expiresDay: options.expiresDay ?? 11,
    belief: options.belief ?? 0,
    wins: options.wins ?? 0,
    losses: options.losses ?? 0,
    status,
    legendTitle: options.legendTitle ?? null,
    isFounding: options.isFounding ?? false,
    accessories,
    gearRanks: Object.fromEntries(
      [...presentedGearIds].map((gearId) => [
        gearId,
        options.gearRanks?.[gearId] ?? 1,
      ])
    ),
    equipmentLoadout,
    upgrades:
      explicitUpgrades ?? createScribbitUpgradesForLevel(options.id, level),
    powerUpIds: Array.isArray(options.powerUpIds)
      ? options.powerUpIds.filter(isPowerUpId).slice(0, MAXIMUM_POWER_UPS)
      : [],
    level,
    xp,
    legacy: null,
  };

  if (status !== 'alive') {
    scribbit.legacy = makeImmutableLegacySnapshot(
      scribbit,
      options.creatorTitleId ?? null
    );
  }

  return scribbit;
};

const makeFoundingScribbit = (foundingScribbitId, belief) => {
  const foundingScribbit = findFoundingScribbit(foundingScribbitId);
  if (!foundingScribbit) {
    throw new Error(`Unknown production founder: ${foundingScribbitId}`);
  }
  return makeScribbit({ ...foundingScribbit, belief });
};

const makeForecast = (day) => generateForecastForDay(day);

const createBattleReport = createMockBattleReportFactory({
  simulate: simulateProductionBattle,
  getForecast: () => memory.forecast,
});

const archivedNapCloud = makeScribbit({
  id: 'mine-nap-cloud',
  name: 'Nap Cloud',
  artist: 'mock_player',
  element: 'storm',
  stats: { chonk: 24, spike: 20, zip: 42, charm: 14 },
  bornDay: 6,
  expiresDay: 9,
  belief: 9,
  wins: 2,
  losses: 3,
  status: 'faded',
  xp: 1,
});

const seededOwnedScribbits = [
  makeScribbit({
    id: 'mine-paper-spark',
    name: trailerHeroBytes ? 'Wobble Bean' : 'Paper Spark',
    artist: 'mock_player',
    element: 'ember',
    stats: { chonk: 22, spike: 36, zip: 28, charm: 14 },
    bornDay: 8,
    expiresDay: 11,
    belief: 6,
    wins: 3,
    losses: 1,
    level: 4,
    xp: 13,
    powerUpIds: ['v1-edge-spring'],
    accessories: ['bowtie', 'tiny-sword'],
    gearRanks: {
      'tiny-sword': 6,
      beanie: 5,
      'smearstep-speed-scarf': 4,
      'round-glasses': 3,
    },
    equipmentLoadout: {
      weapon: ['tiny-sword', null],
      armor: ['beanie', null],
      shoes: ['smearstep-speed-scarf', null],
      accessory: ['round-glasses', null],
    },
  }),
  makeScribbit({
    id: 'mine-moss-bun',
    name: 'Moss Bun',
    artist: 'mock_player',
    element: 'moss',
    stats: { chonk: 42, spike: 16, zip: 18, charm: 24 },
    bornDay: 7,
    expiresDay: 9,
    belief: 2,
    wins: 1,
    losses: 2,
    level: 2,
    xp: 4,
    accessories: ['round-glasses'],
  }),
];

const seedOwnedScribbits =
  process.env.MOCK_SEEDED_SCRIBBITS === '1' ||
  (process.env.MOCK_SEEDED_SCRIBBITS === undefined &&
    Boolean(process.env.SCRIBBITS_TEST_TEMP_ROOT));

const todayEntrants = [
  makeScribbit({
    id: 'community-bristle',
    name: 'Bristle',
    artist: 'crayon_lia',
    element: 'ember',
    stats: { chonk: 26, spike: 34, zip: 24, charm: 16 },
    belief: 12,
    wins: 4,
    losses: 2,
    level: 3,
    xp: 8,
    accessories: ['party-hat'],
  }),
  makeScribbit({
    id: 'community-kelploaf',
    name: 'Kelploaf',
    artist: 'ink_mo',
    element: 'tide',
    stats: { chonk: 38, spike: 18, zip: 24, charm: 20 },
    belief: 4,
    wins: 2,
    losses: 2,
    level: 2,
    xp: 4,
  }),
  makeScribbit({
    id: 'community-rootwink',
    name: 'Rootwink',
    artist: 'paper_ren',
    element: 'moss',
    stats: { chonk: 24, spike: 20, zip: 18, charm: 38 },
    belief: 17,
    wins: 5,
    losses: 1,
    level: 4,
    xp: 13,
    accessories: ['flower-crown', 'cape'],
  }),
  makeScribbit({
    id: 'community-staticjam',
    name: 'Static Jam',
    artist: 'marker_tao',
    element: 'storm',
    stats: { chonk: 20, spike: 28, zip: 40, charm: 12 },
    belief: 7,
    wins: 3,
    losses: 3,
    level: 2,
    xp: 5,
  }),
  makeScribbit({
    id: 'community-puffball',
    name: 'Puffball',
    artist: 'doodle_ana',
    element: 'storm',
    stats: { chonk: 35, spike: 14, zip: 22, charm: 29 },
    belief: 9,
    wins: 2,
    losses: 1,
    xp: 6,
  }),
  makeScribbit({
    id: 'community-mistbun',
    name: 'Mistbun',
    artist: 'pencil_jo',
    element: 'tide',
    stats: { chonk: 28, spike: 18, zip: 34, charm: 20 },
    belief: 5,
    wins: 1,
    losses: 2,
    xp: 3,
  }),
  makeScribbit({
    id: 'community-snorebit',
    name: 'Snorebit',
    artist: 'ink_sam',
    element: 'moss',
    stats: { chonk: 40, spike: 20, zip: 16, charm: 24 },
    belief: 11,
    wins: 4,
    losses: 3,
    xp: 9,
  }),
  makeScribbit({
    id: 'community-dewdrop',
    name: 'Dewdrop',
    artist: 'marker_lee',
    element: 'tide',
    stats: { chonk: 18, spike: 24, zip: 20, charm: 38 },
    belief: 14,
    wins: 5,
    losses: 2,
    xp: 12,
  }),
];

const mockSparRivalSlate = (challenger, previewMode, rivalRun) => {
  const runSeed = rivalRun
    ? `:${rivalRun.id}:${rivalRun.boutsCompleted + 1}`
    : '';
  const seed = hashStringToUint32(
    `spar-rivals:${memory.dayNumber}:${previewMode}:${challenger.id}${runSeed}`
  );
  const founderChronicle = getFounderChronicleForPreview(previewMode);
  return selectFoundingSparRivalSlate(
    challenger,
    seed,
    3,
    rivalRun
      ? { excludedFounderIds: rivalRun.opponentIds }
      : {
          preferredFounderId: founderChronicle.activeRivalry?.founderId,
          excludedFounderIds: founderChronicle.resolvedRivalries.map(
            (rivalry) => rivalry.founderId
          ),
        }
  );
};

const mockRivalRuns = new Map();
let mockRivalRunCounter = 0;

const getOrCreateMockRivalRun = (challenger, previewMode) => {
  const key = `${previewMode}:${challenger.id}`;
  const current = mockRivalRuns.get(key);
  if (current?.status === 'active' && current.dayNumber === memory.dayNumber) {
    return current;
  }
  mockRivalRunCounter += 1;
  const next = createRivalRunState(
    `mock-run-${memory.dayNumber}-${mockRivalRunCounter}`,
    memory.dayNumber,
    challenger.id,
    current?.challenge?.id
  );
  mockRivalRuns.set(key, next);
  return next;
};

const debugPowerStats = Object.freeze({
  inkquake: { chonk: 55, spike: 15, zip: 15, charm: 15 },
  nib_halo: { chonk: 15, spike: 55, zip: 15, charm: 15 },
  colorburst: { chonk: 15, spike: 15, zip: 15, charm: 55 },
});

const debugPowerFighters = Object.freeze({
  inkquake: makeScribbit({
    id: 'debug-inkquake-heavy-page',
    name: 'Heavy Page',
    artist: 'debug_fixture',
    element: 'tide',
    stats: debugPowerStats.inkquake,
    xp: 7,
    accessories: ['inkquake-rumble-belt'],
    gearRanks: { 'inkquake-rumble-belt': 6 },
  }),
  nib_halo: makeScribbit({
    id: 'debug-nib-halo-needle-star',
    name: 'Needle Star',
    artist: 'debug_fixture',
    element: 'tide',
    stats: debugPowerStats.nib_halo,
    xp: 7,
    accessories: ['tiny-sword'],
    gearRanks: { 'tiny-sword': 3 },
  }),
  colorburst: makeScribbit({
    id: 'debug-colorburst-prism-pop',
    name: 'Prism Pop',
    artist: 'debug_fixture',
    element: 'tide',
    stats: debugPowerStats.colorburst,
    xp: 7,
    accessories: ['inkquake-rumble-belt'],
    gearRanks: { 'inkquake-rumble-belt': 5 },
  }),
});

const debugOpponentPower = Object.freeze({
  inkquake: 'colorburst',
  nib_halo: 'inkquake',
  colorburst: 'nib_halo',
});

const debugBattleSeed = Object.freeze({
  // Curated production seeds make each signature move land early enough to
  // read at normal speed. Winners and damage still come entirely from the
  // authoritative simulator.
  inkquake: 584,
  nib_halo: 2,
  colorburst: 74,
});

const champion = makeScribbit({
  id: 'legend-solar-kiln',
  name: 'Solar Kiln',
  artist: 'nib_and_nori',
  element: 'ember',
  stats: { chonk: 36, spike: 40, zip: 10, charm: 14 },
  bornDay: 5,
  expiresDay: 8,
  belief: 31,
  wins: 9,
  losses: 2,
  status: 'legend',
  legendTitle: 'Champion of Day 8',
  level: 5,
  xp: 20,
  accessories: ['golden-crown', 'dragon-wings'],
});

const myChampionLegacy = makeScribbit({
  id: 'legacy-marker-comet',
  name: 'Marker Comet',
  artist: 'mock_player',
  element: 'storm',
  stats: { chonk: 20, spike: 24, zip: 42, charm: 14 },
  bornDay: 5,
  expiresDay: 8,
  belief: 24,
  wins: 8,
  losses: 2,
  status: 'legend',
  legendTitle: 'Champion of Day 8',
  xp: 19,
  accessories: ['golden-crown', 'tiny-sword'],
  creatorTitleId: 'the-pen-ultimate',
});

const myBelievedLegacy = makeScribbit({
  id: 'legacy-velvet-sprout',
  name: 'Velvet Sprout',
  artist: 'mock_player',
  element: 'moss',
  stats: { chonk: 34, spike: 16, zip: 20, charm: 30 },
  bornDay: 4,
  expiresDay: 7,
  belief: 25,
  wins: 5,
  losses: 3,
  status: 'legend',
  legendTitle: 'Believed by 25 arena weirdos',
  xp: 14,
  accessories: ['flower-crown', 'cape'],
  creatorTitleId: 'brushlord',
});

const legends = [
  champion,
  myChampionLegacy,
  myBelievedLegacy,
  makeScribbit({
    id: 'legend-inky-moon',
    name: 'Inky Moon',
    artist: 'linework_luz',
    element: 'tide',
    stats: { chonk: 28, spike: 22, zip: 26, charm: 24 },
    belief: 28,
    wins: 7,
    losses: 3,
    status: 'legend',
    legendTitle: 'Believed by 28 arena weirdos',
    level: 4,
    xp: 14,
    accessories: ['monocle'],
  }),
  makeScribbit({
    id: 'legend-gale-pin',
    name: 'Gale Pin',
    artist: 'washitape_kit',
    element: 'storm',
    stats: { chonk: 24, spike: 32, zip: 28, charm: 16 },
    belief: 33,
    wins: 8,
    losses: 4,
    status: 'legend',
    legendTitle: 'Champion of Day 5',
    level: 5,
    xp: 22,
    accessories: ['headphones', 'propeller-cap'],
  }),
  makeScribbit({
    id: 'legend-moss-opera',
    name: 'Moss Opera',
    artist: 'smudge_sam',
    element: 'moss',
    stats: { chonk: 44, spike: 18, zip: 12, charm: 26 },
    belief: 27,
    wins: 5,
    losses: 4,
    status: 'legend',
    legendTitle: 'Believed by 27 arena weirdos',
    level: 3,
    xp: 9,
    accessories: ['mustache', 'top-hat'],
  }),
  makeScribbit({
    id: 'legend-bubble-vice',
    name: 'Bubble Vice',
    artist: 'charcoal_zed',
    element: 'tide',
    stats: { chonk: 30, spike: 26, zip: 24, charm: 20 },
    belief: 29,
    wins: 6,
    losses: 2,
    status: 'legend',
    legendTitle: 'Champion of Day 3',
    level: 4,
    xp: 15,
  }),
  makeScribbit({
    id: 'legend-cinder-pip',
    name: 'Cinder Pip',
    artist: 'graphite_jo',
    element: 'ember',
    stats: { chonk: 20, spike: 38, zip: 28, charm: 14 },
    belief: 26,
    wins: 6,
    losses: 5,
    status: 'legend',
    legendTitle: 'Believed by 26 arena weirdos',
    level: 3,
    xp: 10,
  }),
];

const archivedOwnedScribbits = [
  archivedNapCloud,
  makeScribbit({
    id: 'faded-pencil-puddle',
    name: 'Pencil Puddle',
    artist: 'mock_player',
    element: 'tide',
    stats: { chonk: 28, spike: 18, zip: 30, charm: 24 },
    bornDay: 3,
    expiresDay: 6,
    belief: 4,
    wins: 1,
    losses: 5,
    status: 'faded',
    xp: 4,
    accessories: ['beanie', 'tiny-sword'],
    creatorTitleId: 'doodler',
  }),
  makeScribbit({
    id: 'faded-eraser-bite',
    name: 'Eraser Bite',
    artist: 'mock_player',
    element: 'moss',
    stats: { chonk: 40, spike: 22, zip: 12, charm: 26 },
    bornDay: 2,
    expiresDay: 5,
    belief: 8,
    wins: 2,
    losses: 4,
    status: 'faded',
    xp: 5,
    accessories: ['round-glasses'],
    creatorTitleId: 'inkslinger',
  }),
  makeScribbit({
    id: 'faded-impossibly-long',
    name: 'Impossibly Long Scribbit',
    artist: 'mock_player',
    element: 'ember',
    stats: { chonk: 22, spike: 41, zip: 18, charm: 19 },
    bornDay: 1,
    expiresDay: 4,
    belief: 12,
    wins: 10,
    losses: 11,
    status: 'faded',
    xp: 18,
    accessories: ['party-hat', 'dragon-wings'],
    creatorTitleId: 'the-pen-ultimate',
  }),
  makeScribbit({
    id: 'faded-tape-ghost',
    name: 'Tape Ghost',
    artist: 'mock_player',
    element: 'storm',
    stats: { chonk: 19, spike: 27, zip: 39, charm: 15 },
    bornDay: 0,
    expiresDay: 3,
    belief: 1,
    wins: 0,
    losses: 7,
    status: 'faded',
    xp: 2,
    accessories: ['propeller-cap'],
    creatorTitleId: 'doodler',
  }),
];

const emptyInventoryState = () => {
  return {
    items: {},
    gear: {},
    pens: [],
    titles: [],
    equippedTitle: null,
    discovered: [],
  };
};

const createPreviewEconomy = (options = {}) => {
  return {
    ink: options.ink ?? 0,
    inventory: options.inventory ?? emptyInventoryState(),
    capsulePullCount: options.capsulePullCount ?? 0,
    pullsSinceEpic: options.pullsSinceEpic ?? 0,
    discountedCapsuleDay: null,
    capsuleOperations: new Map(),
    gearMergeOperations: new Map(),
    sparWinRewardUtcDates: new Set(),
    sparRewardReceipts: new Map(),
    pendingPowerUpOffers: new Map(),
    dailyLogin: {
      claimedTrackDays: options.dailyLoginClaimedTrackDays ?? 0,
      totalClaimedDays:
        options.dailyLoginTotalClaimedDays ??
        options.dailyLoginClaimedTrackDays ??
        0,
      lastClaimDateKey: null,
      lastReward: null,
    },
  };
};

const buildMockFounderChronicle = (facts) => {
  let chronicle = createEmptyFounderChronicle();
  for (const fact of facts) {
    chronicle = advanceFounderChronicle(chronicle, fact).chronicle;
  }
  return chronicle;
};

const returningFounderChronicle = buildMockFounderChronicle([
  {
    founderId: 'founding-mosswhisk',
    reportId: 'mock-chronicle-mosswhisk-1',
    day: 4,
    playerWon: true,
  },
  {
    founderId: 'founding-mosswhisk',
    reportId: 'mock-chronicle-mosswhisk-2',
    day: 5,
    playerWon: true,
  },
  {
    founderId: 'founding-fernibble',
    reportId: 'mock-chronicle-fernibble-1',
    day: 7,
    playerWon: false,
  },
  {
    founderId: 'founding-fernibble',
    reportId: 'mock-chronicle-fernibble-2',
    day: 8,
    playerWon: true,
  },
]);

const memory = {
  dayNumber: 9,
  forecast: makeForecast(9),
  champion,
  myScribbits: seedOwnedScribbits ? [...seededOwnedScribbits] : [],
  todayEntrants,
  legends,
  archivedOwnedScribbits: seedOwnedScribbits ? [...archivedOwnedScribbits] : [],
  drawnToday: false,
  communityThemeDrawCountByPreviewMode: {
    returning: 0,
    fresh: 0,
  },
  enteredToday: false,
  drawChargesByPreviewMode: {
    returning: { available: 3, capacity: 3, nextRefreshAt: null },
    fresh: { available: 3, capacity: 3, nextRefreshAt: null },
  },
  freeDrawingIdByPreviewMode: {
    returning: null,
    fresh: null,
  },
  bossChallengedToday: false,
  createdScribbitPreviewModes: new Set(seedOwnedScribbits ? ['returning'] : []),
  completedBattlePreviewModes: new Set(seedOwnedScribbits ? ['returning'] : []),
  backedScribbitIdByPreviewMode: {
    returning: null,
    fresh: null,
  },
  playStreakDays: 4,
  activePlayDays: 8,
  myClout: 14,
  economyByPreviewMode: {
    returning: createPreviewEconomy({
      ink: 65,
      inventory: {
        items: {
          'berry-jam-ink': 2,
          'ghostlight-ink': 1,
          'sidewalk-chalk-brush': 2,
          'ribbon-brush': 1,
          'golden-crown': 2,
          'tiny-sword': 1,
          'party-hat': 3,
          cape: 1,
          'round-glasses': 1,
          'dragon-wings': 1,
          beanie: 2,
          'eyepatch-scar': 1,
          'inkquake-rumble-belt': 1,
          'inkquake-crater-crown': 1,
          'nib-halo-headband': 1,
          'nib-halo-circlet': 1,
          'smearstep-speed-scarf': 1,
          'smearstep-ink-skates': 1,
          'colorburst-rosette': 1,
          'colorburst-prism-crown': 1,
          'cardboard-shield': 2,
          'wooden-spoon': 1,
          'canvas-sneakers': 2,
          'button-badge': 1,
          'void-nib-lance': 1,
          'moon-moth-mantle': 1,
          'thundercloud-sneakers': 1,
          'star-eye-mask': 1,
        },
        gear: {
          beanie: { rank: 6, copies: 2, rarity: 'common' },
          cape: { rank: 5, copies: 1, rarity: 'rare' },
          'tiny-sword': { rank: 6, copies: 1, rarity: 'common' },
          'cardboard-shield': { rank: 1, copies: 2, rarity: 'common' },
          'wooden-spoon': { rank: 2, copies: 1, rarity: 'common' },
          'canvas-sneakers': { rank: 1, copies: 2, rarity: 'common' },
          'button-badge': { rank: 1, copies: 1, rarity: 'common' },
          'void-nib-lance': { rank: 2, copies: 1, rarity: 'legendary' },
          'moon-moth-mantle': { rank: 1, copies: 1, rarity: 'legendary' },
          'thundercloud-sneakers': {
            rank: 1,
            copies: 1,
            rarity: 'legendary',
          },
          'star-eye-mask': { rank: 1, copies: 1, rarity: 'legendary' },
        },
        pens: ['warm-greys', 'gold-pen', 'rainbow-crayon', 'midnight-ink'],
        titles: ['doodler', 'inkslinger', 'brushlord', 'the-pen-ultimate'],
        equippedTitle: null,
        discovered: [
          'golden-crown',
          'tiny-sword',
          'party-hat',
          'cape',
          'round-glasses',
          'dragon-wings',
          'beanie',
          'eyepatch-scar',
          'warm-greys',
          'gold-pen',
          'rainbow-crayon',
          'midnight-ink',
          'berry-jam-ink',
          'ghostlight-ink',
          'sidewalk-chalk-brush',
          'ribbon-brush',
          'doodler',
          'inkslinger',
          'brushlord',
          'the-pen-ultimate',
          'inkquake-rumble-belt',
          'inkquake-crater-crown',
          'nib-halo-headband',
          'nib-halo-circlet',
          'smearstep-speed-scarf',
          'smearstep-ink-skates',
          'colorburst-rosette',
          'colorburst-prism-crown',
          'cardboard-shield',
          'wooden-spoon',
          'canvas-sneakers',
          'button-badge',
          'void-nib-lance',
          'moon-moth-mantle',
          'thundercloud-sneakers',
          'star-eye-mask',
        ],
      },
      capsulePullCount: 13,
      pullsSinceEpic: 6,
    }),
    fresh: createPreviewEconomy(),
  },
  founderChronicleByPreviewMode: {
    returning: returningFounderChronicle,
    fresh: createEmptyFounderChronicle(),
  },
  legacySeenThroughDay: 5,
  freshLegacySeenThroughDay: 0,
  beliefVotes: new Set(),
  hiddenScribbitIds: new Set(),
  reportCounts: new Map(),
  cloutBoard: {
    top: [
      { username: 'inkwell_kay', clout: 42 },
      { username: 'marker_jules', clout: 34 },
      { username: 'mock_player', clout: 14 },
      { username: 'pixel_mara', clout: 13 },
      { username: 'crayon_lia', clout: 11 },
      { username: 'paper_ren', clout: 8 },
      { username: 'washitape_kit', clout: 5 },
      { username: 'smudge_sam', clout: 3 },
    ],
    me: { username: 'mock_player', clout: 14, rank: 3 },
  },
  myBattles: [],
  previousRumbleReplay: null,
  rumbleReplaysByDay: new Map(),
};

if (seedOwnedScribbits) {
  for (let index = 0; index < 10; index += 1) {
    const fighterA = seededOwnedScribbits[index % seededOwnedScribbits.length];
    const fighterB = todayEntrants[index % todayEntrants.length];
    memory.myBattles.push(createBattleReport('exhibition', fighterA, fighterB));
  }
}
const inkyMoon = legends.find((scribbit) => scribbit.name === 'Inky Moon');
if (!inkyMoon) throw new Error('Mock Rumble replay needs Inky Moon.');
memory.previousRumbleReplay = createBattleReport('rumble', inkyMoon, champion, {
  forecast: makeForecast(memory.dayNumber - 1),
});
const ownedRumbleReplay = createBattleReport(
  'rumble',
  seededOwnedScribbits[0],
  todayEntrants[1],
  { forecast: makeForecast(memory.dayNumber - 1), seed: 73 }
);
memory.rumbleReplaysByDay.set(
  memory.previousRumbleReplay.day,
  memory.previousRumbleReplay
);
let olderScoutReplay = null;
const championPick = todayEntrants[0];
for (const opponent of todayEntrants.slice(1)) {
  for (let seed = 0; seed < 100 && !olderScoutReplay; seed += 1) {
    for (const [fighterA, fighterB] of [
      [championPick, opponent],
      [opponent, championPick],
    ]) {
      const candidateReplay = createBattleReport('rumble', fighterA, fighterB, {
        seed,
        forecast: makeForecast(memory.dayNumber - 2),
      });
      const winner =
        candidateReplay.winner === 'a' ? candidateReplay.a : candidateReplay.b;
      if (winner.id === championPick.id) {
        olderScoutReplay = candidateReplay;
        break;
      }
    }
  }
  if (olderScoutReplay) break;
}
if (!olderScoutReplay) {
  olderScoutReplay = createBattleReport(
    'rumble',
    championPick,
    todayEntrants[1],
    {
      seed: 0,
      forecast: makeForecast(memory.dayNumber - 2),
    }
  );
}
memory.rumbleReplaysByDay.set(olderScoutReplay.day, olderScoutReplay);

const scoutNotebookPick = (scribbit) => projectScoutNotebookPick(scribbit);

const getBackedScribbitIdForPreview = (previewMode) => {
  if (previewMode === 'logged-out') return null;
  return memory.backedScribbitIdByPreviewMode[previewMode] ?? null;
};

const setBackedScribbitIdForPreview = (previewMode, scribbitId) => {
  if (previewMode === 'logged-out') return;
  memory.backedScribbitIdByPreviewMode[previewMode] = scribbitId;
};

const visibleScoutNotebookPick = (scribbit) => {
  return scribbit && !memory.hiddenScribbitIds.has(scribbit.id)
    ? scoutNotebookPick(scribbit)
    : null;
};

const isMockRumbleReplayVisible = (day, backedScribbitId) => {
  const report = memory.rumbleReplaysByDay.get(day);
  return Boolean(
    report &&
    (report.a.id === backedScribbitId || report.b.id === backedScribbitId) &&
    !memory.hiddenScribbitIds.has(backedScribbitId) &&
    !memory.hiddenScribbitIds.has(report.a.id) &&
    !memory.hiddenScribbitIds.has(report.b.id)
  );
};

const scoutNotebookStateForPreview = (previewMode, previewHasPinnedPick) => {
  const currentDay = memory.dayNumber;
  const entryCount = Math.min(SCOUT_NOTEBOOK_MAXIMUM_ENTRIES, currentDay);
  const currentPickId =
    getBackedScribbitIdForPreview(previewMode) ??
    (previewMode === 'returning' && previewHasPinnedPick
      ? todayEntrants[0]?.id
      : null);
  const currentPickScribbit = currentPickId
    ? todayEntrants.find((scribbit) => scribbit.id === currentPickId)
    : null;
  const currentPick = visibleScoutNotebookPick(currentPickScribbit);
  const currentEntry = {
    day: currentDay,
    forecast: makeForecast(currentDay),
    picked: currentPickId !== null,
    pick: currentPick,
    status: currentPickId !== null ? 'pending' : 'open',
    cloutEarned: 0,
    inkAwarded: 0,
    replayAvailable: false,
  };

  if (previewMode === 'fresh') {
    return createScoutNotebookState({
      currentDay,
      lifetimeClout: 0,
      entries: Array.from({ length: entryCount }, (_, index) => {
        const day = currentDay - index;
        if (index === 0) return currentEntry;
        return {
          day,
          forecast: makeForecast(day),
          picked: false,
          pick: null,
          status: 'missed',
          cloutEarned: 0,
          inkAwarded: 0,
          replayAvailable: false,
        };
      }),
    });
  }

  const bubbleVice = legends.find(
    (scribbit) => scribbit.name === 'Bubble Vice'
  );
  if (!bubbleVice) throw new Error('Mock Scout Notebook needs Bubble Vice.');
  const historicalFixtures = [
    {
      picked: true,
      pick: visibleScoutNotebookPick(inkyMoon),
      status: 'no_clout',
      cloutEarned: 0,
      inkAwarded: 0,
      replayAvailable: isMockRumbleReplayVisible(currentDay - 1, inkyMoon.id),
    },
    {
      picked: true,
      pick: visibleScoutNotebookPick(todayEntrants[0]),
      status: 'champion',
      cloutEarned: 3,
      inkAwarded: INK_REWARDS.backedChampion,
      replayAvailable: isMockRumbleReplayVisible(
        currentDay - 2,
        todayEntrants[0].id
      ),
    },
    {
      picked: true,
      pick: visibleScoutNotebookPick(todayEntrants[1]),
      status: 'finalist',
      cloutEarned: 1,
      inkAwarded: 0,
      replayAvailable: false,
    },
    {
      picked: false,
      pick: null,
      status: 'missed',
      cloutEarned: 0,
      inkAwarded: 0,
      replayAvailable: false,
    },
    {
      picked: true,
      pick: visibleScoutNotebookPick(todayEntrants[2]),
      status: 'no_clout',
      cloutEarned: 0,
      inkAwarded: 0,
      replayAvailable: false,
    },
    {
      picked: true,
      pick: visibleScoutNotebookPick(bubbleVice),
      status: 'champion',
      cloutEarned: 3,
      inkAwarded: INK_REWARDS.backedChampion,
      replayAvailable: false,
    },
  ];

  return createScoutNotebookState({
    currentDay,
    lifetimeClout: memory.myClout,
    entries: Array.from({ length: entryCount }, (_, index) => {
      const day = currentDay - index;
      if (index === 0) return currentEntry;
      const fixture = historicalFixtures[index - 1];
      if (!fixture)
        throw new Error('Mock Scout Notebook history is incomplete.');
      return { day, forecast: makeForecast(day), ...fixture };
    }),
  });
};

const getPreviewEconomy = (previewMode) => {
  return memory.economyByPreviewMode[previewMode];
};

const getFounderChronicleForPreview = (previewMode) => {
  if (previewMode === 'logged-out') {
    return projectFounderChronicle(createEmptyFounderChronicle());
  }
  return projectFounderChronicle(
    memory.founderChronicleByPreviewMode[previewMode] ??
      createEmptyFounderChronicle()
  );
};

const seasonSummaryForPreview = (previewMode) => {
  const standing =
    previewMode === 'logged-out'
      ? null
      : previewMode === 'fresh'
        ? { score: 0, rank: 0 }
        : { score: 84, rank: 3 };
  return {
    id: 'season-1',
    number: 1,
    name: 'Season 1',
    campaignName: 'First Ink',
    status: 'active',
    startArenaDay: memory.dayNumber,
    endArenaDay: memory.dayNumber + 59,
    daysRemaining: 60,
    scoringRuleSetId: 'rumble-clout-v1',
    activeEvent: {
      id: 'opening-rumble',
      name: 'Opening Rumble',
      startArenaDay: memory.dayNumber,
      endArenaDay: memory.dayNumber + 6,
      daysRemaining: 7,
      ruleSetId: 'double-clout',
      scoreMultiplier: 2,
    },
    me: standing,
  };
};

const seasonStateForPreview = (previewMode) => ({
  current: seasonSummaryForPreview(previewMode),
  next: null,
  latestFinalized: null,
  latestReward: null,
});

const seasonBoardForPreview = (previewMode) => {
  const season = seasonSummaryForPreview(previewMode);
  const top = [
    { username: 'inkwell_kay', score: 126, rank: 1, rewardTier: null },
    { username: 'marker_jules', score: 101, rank: 2, rewardTier: null },
    { username: 'mock_player', score: 84, rank: 3, rewardTier: null },
    { username: 'pixel_mara', score: 77, rank: 4, rewardTier: null },
    { username: 'crayon_lia', score: 65, rank: 5, rewardTier: null },
    { username: 'paper_ren', score: 53, rank: 6, rewardTier: null },
    { username: 'washitape_kit', score: 41, rank: 7, rewardTier: null },
    { username: 'smudge_sam', score: 28, rank: 8, rewardTier: null },
  ];
  return {
    season,
    top,
    me:
      previewMode === 'logged-out'
        ? null
        : previewMode === 'fresh'
          ? { username: 'mock_player', score: 0, rank: 0, rewardTier: null }
          : top[2],
    finalized: false,
  };
};

const venueBoardForPreview = (previewMode) => {
  const arena = getBattleArenaForDay(memory.dayNumber);
  const top = [
    { username: 'inkwell_kay', rank: 1, clearMilliseconds: 8_920 },
    { username: 'marker_jules', rank: 2, clearMilliseconds: 9_840 },
    { username: 'pixel_mara', rank: 3, clearMilliseconds: 11_370 },
    { username: 'mock_player', rank: 4, clearMilliseconds: 12_450 },
    { username: 'crayon_lia', rank: 5, clearMilliseconds: 13_110 },
    { username: 'paper_ren', rank: 6, clearMilliseconds: 14_025 },
  ];
  return {
    dayNumber: memory.dayNumber,
    arenaId: arena.id,
    arenaName: arena.name,
    challengeLabel: arena.challengeLabel,
    clearCount: 18,
    top,
    me: previewMode === 'returning' ? top[3] : null,
  };
};

const recordMockFounderChronicleBattle = (
  previewMode,
  report,
  ownedScribbitId
) => {
  if (previewMode === 'logged-out') return [];
  if (report.kind !== 'exhibition' && report.kind !== 'boss') return [];
  const ownedSlot =
    report.a.id === ownedScribbitId
      ? 'a'
      : report.b.id === ownedScribbitId
        ? 'b'
        : null;
  if (!ownedSlot) return [];
  const opponent = ownedSlot === 'a' ? report.b : report.a;
  if (!findFoundingScribbit(opponent.id)) return [];

  const chronicle = memory.founderChronicleByPreviewMode[previewMode];
  if (!chronicle) return [];
  const advanced = advanceFounderChronicle(chronicle, {
    founderId: opponent.id,
    reportId: report.id,
    day: report.day,
    playerWon: report.winner === ownedSlot,
  });
  memory.founderChronicleByPreviewMode[previewMode] = advanced.chronicle;
  return advanced.beats;
};

const resetPreviewEconomy = (economy) => {
  economy.ink = 0;
  economy.inventory = emptyInventoryState();
  economy.capsulePullCount = 0;
  economy.pullsSinceEpic = 0;
  economy.discountedCapsuleDay = null;
  economy.capsuleOperations.clear();
  economy.gearMergeOperations.clear();
  economy.sparWinRewardUtcDates.clear();
  economy.sparRewardReceipts.clear();
  economy.pendingPowerUpOffers.clear();
};

const isLivingScribbit = (scribbit) => {
  return scribbit.status === 'alive';
};

const getLivingScribbitsForPreview = (previewMode) => {
  if (previewMode === 'logged-out') return [];
  const livingScribbits = memory.myScribbits.filter(isLivingScribbit);
  if (previewMode === 'fresh') {
    return livingScribbits.filter(
      (scribbit) => submittedScribbitPreviewModes.get(scribbit.id) === 'fresh'
    );
  }
  return livingScribbits.filter(
    (scribbit) => submittedScribbitPreviewModes.get(scribbit.id) !== 'fresh'
  );
};

const featuredCreationsForPreview = () => {
  const featuredCreations = [];
  const selectedIds = new Set();
  const candidates = [...memory.todayEntrants].reverse();

  for (const scribbit of candidates) {
    if (
      featuredCreations.length >= 3 ||
      selectedIds.has(scribbit.id) ||
      memory.hiddenScribbitIds.has(scribbit.id) ||
      scribbit.isFounding ||
      !scribbit.artist?.trim() ||
      !scribbit.imageUrl?.trim()
    ) {
      continue;
    }
    selectedIds.add(scribbit.id);
    featuredCreations.push({
      id: scribbit.id,
      name: scribbit.name,
      artist: scribbit.artist,
      imageUrl: scribbit.imageUrl,
    });
  }

  return featuredCreations;
};

const hasDrawnTodayForPreview = (previewMode) => {
  const joinedCommunityTheme =
    previewMode === 'fresh'
      ? getLivingScribbitsForPreview(previewMode).length > 0
      : memory.drawnToday;
  return (
    joinedCommunityTheme ||
    Boolean(memory.freeDrawingIdByPreviewMode[previewMode])
  );
};

const getTodayFreeDrawingForPreview = (previewMode) => {
  const drawingId = memory.freeDrawingIdByPreviewMode[previewMode];
  const drawing = drawingId ? freeDrawingsById.get(drawingId) : null;
  return drawing?.createdDay === memory.dayNumber ? { ...drawing } : null;
};

const clearFreeDrawingForPreview = (previewMode) => {
  const drawingId = memory.freeDrawingIdByPreviewMode[previewMode];
  if (drawingId) {
    freeDrawingsById.delete(drawingId);
    freeDrawingOwnerById.delete(drawingId);
    submittedDrawingBytes.delete(drawingId);
  }
  memory.freeDrawingIdByPreviewMode[previewMode] = null;
};

const hasEnteredTodayForPreview = (previewMode) => {
  if (previewMode !== 'fresh') return memory.enteredToday;
  const freshScribbitIds = new Set(
    getLivingScribbitsForPreview(previewMode).map(({ id }) => id)
  );
  return memory.todayEntrants.some(({ id }) => freshScribbitIds.has(id));
};

const getOwnedScribbits = () => {
  const ownedById = new Map();
  for (const list of [
    memory.myScribbits,
    memory.archivedOwnedScribbits,
    memory.legends,
  ]) {
    for (const scribbit of list) {
      if (scribbit.artist === 'mock_player') {
        ownedById.set(scribbit.id, scribbit);
      }
    }
  }
  return [...ownedById.values()];
};

const getOwnedScribbitsForPreview = (previewMode) => {
  if (previewMode === 'logged-out') return [];
  if (previewMode === 'fresh') return getLivingScribbitsForPreview(previewMode);
  return getOwnedScribbits();
};

const getPersonalLegacyCards = () => {
  return sortLegacyCardsNewestFirst(collectLegacyCards(getOwnedScribbits()));
};

const legacyReturnReceiptState = () => {
  return projectLegacyReturnReceipt(
    getPersonalLegacyCards(),
    memory.legacySeenThroughDay
  );
};

const backedReturnReceiptState = () => ({
  kind: 'backed',
  resolvedDay: memory.dayNumber - 1,
  backedName: 'Inky Moon',
  championName: memory.champion.name,
  pick: cloneScribbit(inkyMoon),
  opponent: cloneScribbit(memory.champion),
  opponentIsChampion: true,
  cloutEarned: 0,
  inkAwarded: 0,
  replayAvailable: memory.previousRumbleReplay !== null,
});

const removeScribbitFromList = (list, scribbitId) => {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (list[index]?.id === scribbitId) list.splice(index, 1);
  }
};

const removeScribbitEverywhere = (scribbitId) => {
  for (const list of [
    memory.myScribbits,
    memory.todayEntrants,
    memory.legends,
    memory.archivedOwnedScribbits,
  ]) {
    removeScribbitFromList(list, scribbitId);
  }
  memory.myBattles = memory.myBattles.filter(
    (report) => report.a.id !== scribbitId && report.b.id !== scribbitId
  );
  submittedDrawingBytes.delete(scribbitId);
  submittedScribbitPreviewModes.delete(scribbitId);
};

const battleReportsForPreview = (previewMode) => {
  if (previewMode === 'logged-out') return [];
  const belongsToFreshPreview = (report) =>
    submittedScribbitPreviewModes.get(report.a.id) === 'fresh' ||
    submittedScribbitPreviewModes.get(report.b.id) === 'fresh';
  return memory.myBattles.filter((report) =>
    previewMode === 'fresh'
      ? belongsToFreshPreview(report)
      : !belongsToFreshPreview(report)
  );
};

const visibleLists = () => [
  memory.myScribbits,
  memory.todayEntrants,
  memory.legends,
  memory.archivedOwnedScribbits,
  [memory.champion],
  Object.values(debugPowerFighters),
];

const findVisibleScribbit = (scribbitId) => {
  for (const list of visibleLists()) {
    const scribbit = list.find((entry) => entry.id === scribbitId);
    if (scribbit) return scribbit;
  }
  return undefined;
};

const dominantStatFor = (stats) => {
  let dominantStat = SCRIBBIT_STAT_KEYS[0];
  for (const stat of SCRIBBIT_STAT_KEYS.slice(1)) {
    if ((stats?.[stat] ?? 0) > (stats?.[dominantStat] ?? 0)) {
      dominantStat = stat;
    }
  }
  return dominantStat;
};

const drawingBytesFor = (scribbitId) => {
  if (trailerHeroBytes && scribbitId === 'mine-paper-spark') {
    return trailerHeroBytes;
  }
  const submittedDrawing = submittedDrawingBytes.get(scribbitId);
  if (submittedDrawing) return submittedDrawing;

  const scribbit = findVisibleScribbit(scribbitId);
  if (!scribbit) return transparentPng;

  const dominantStat = dominantStatFor(scribbit.stats);
  const filename = mockDrawingFileByDominantStat[dominantStat];
  const filePath = join(mockAssetRoot, filename);
  return existsSync(filePath) ? readFileSync(filePath) : transparentPng;
};

const mutateVisibleScribbit = (scribbitId, mutate) => {
  for (const list of visibleLists()) {
    for (const scribbit of list) {
      if (scribbit.id === scribbitId) {
        mutate(scribbit);
      }
    }
  }
};

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
};

const sendError = (response, status, message) => {
  const codeByStatus = {
    400: 'bad_request',
    401: 'unauthorized',
    402: 'payment_required',
    404: 'not_found',
    409: 'conflict',
    413: 'payload_too_large',
    429: 'too_many_requests',
    500: 'server_error',
  };
  sendJson(response, status, {
    status: 'error',
    code: codeByStatus[status] ?? 'server_error',
    message,
  });
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
};

const readScribbitId = (body) => {
  return typeof body?.scribbitId === 'string' ? body.scribbitId.trim() : '';
};

const cloneItemCounts = (items) => {
  return { ...items };
};

const readPageNumber = (value, fallback, maximum) => {
  if (value === null || value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return undefined;
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) return undefined;
  return maximum === undefined ? parsedValue : Math.min(parsedValue, maximum);
};

const explicitPreviewModeFromUrl = (url) => {
  if (
    url.searchParams.has('logged-out') ||
    url.searchParams.has('loggedOut') ||
    url.searchParams.has('loggedout')
  ) {
    return 'logged-out';
  }
  if (url.searchParams.has('fixtures') || url.searchParams.has('returning')) {
    return 'returning';
  }
  if (url.searchParams.has('fresh')) return 'fresh';
  return null;
};

const previewModeFromUrl = (url) => {
  return explicitPreviewModeFromUrl(url) ?? 'fresh';
};

const requestPreviewMode = (request, url) => {
  const directMode = explicitPreviewModeFromUrl(url);
  if (directMode) return directMode;

  const referrer = request.headers.referer;
  // Direct API calls are fixture-rich for test compatibility. Browser previews
  // inherit the page mode, whose default is the empty new-player experience.
  if (typeof referrer !== 'string') return 'returning';
  try {
    return previewModeFromUrl(new URL(referrer));
  } catch {
    return 'returning';
  }
};

const requestHasPreviewFlag = (request, url, flag) => {
  if (url.searchParams.has(flag)) return true;

  const referrer = request.headers.referer;
  if (typeof referrer !== 'string') return false;
  try {
    return new URL(referrer).searchParams.has(flag);
  } catch {
    return false;
  }
};

const currentUtcDateKey = () => {
  return new Date().toISOString().slice(0, 10);
};

const dailyLoginState = (economy) => {
  return {
    claimedTrackDays: economy.dailyLogin.claimedTrackDays,
    totalClaimedDays: economy.dailyLogin.totalClaimedDays,
    claimedToday: economy.dailyLogin.lastClaimDateKey === currentUtcDateKey(),
    nextReward: dailyLoginRewardAfterClaims(
      economy.dailyLogin.totalClaimedDays
    ),
  };
};

const capsuleCostForCurrentPull = (economy) => {
  const arenaDay = memory.dayNumber;
  const isFirstDailyPull = economy.discountedCapsuleDay !== arenaDay;

  return {
    cost: getCapsuleCostForDailyState(!isFirstDailyPull),
    arenaDay,
  };
};

const capsuleProgressState = (economy) => {
  return createCapsuleProgress(
    economy.capsulePullCount,
    economy.pullsSinceEpic,
    economy.inventory.discovered.length
  );
};

const selectMockCapsuleDrop = (economy) => {
  return selectCapsuleDrop(
    {
      userId: 'mock-player',
      day: memory.dayNumber,
      pullCount: economy.capsulePullCount + 1,
      pullsSinceEpic: economy.pullsSinceEpic,
      entropy: 'local-browser-fixture',
    },
    new Set(economy.inventory.discovered)
  );
};

const getOrCreateMockBirthPowerUpOffer = (economy, scribbit) => {
  const pendingOffer = economy.pendingPowerUpOffers.get(scribbit.id) ?? null;
  if (pendingOffer)
    return pendingOffer.source === 'birth' ? pendingOffer : null;
  if ((scribbit.powerUpIds?.length ?? 0) > 0) return null;
  const sourceEventId = `birth:${scribbit.id}`;
  const choices = createDeterministicPowerUpOffer({
    seed: `power-up-offer:v1:${sourceEventId}:${scribbit.id}`,
    source: 'birth',
    ownedPowerUpIds: scribbit.powerUpIds ?? [],
  });
  if (choices?.length !== 3) return null;
  const offer = {
    version: 1,
    id: `power-up-offer:v1:${sourceEventId}:${scribbit.id}`,
    scribbitId: scribbit.id,
    sourceReportId: sourceEventId,
    source: 'birth',
    choices,
    createdAtMs: Date.now(),
  };
  economy.pendingPowerUpOffers.set(scribbit.id, offer);
  return offer;
};

const arenaState = (economy, previewMode = 'returning') => {
  const livingScribbitIds = new Set(
    getLivingScribbitsForPreview(previewMode).map((scribbit) => scribbit.id)
  );
  const battleArena = getBattleArenaForDay(memory.dayNumber);
  const venueCleared = previewMode === 'returning';
  return {
    dayNumber: memory.dayNumber,
    loggedIn: true,
    hasCreatedScribbit: memory.createdScribbitPreviewModes.has(previewMode),
    hasCompletedBattle:
      memory.completedBattlePreviewModes.has(previewMode) ||
      economy.capsulePullCount > 0,
    myUsername: 'mock_player',
    communityDrawTheme: selectCommunityDoodleDare(
      memory.dayNumber,
      `mock-player:${previewMode}`,
      memory.communityThemeDrawCountByPreviewMode[previewMode] ?? 0
    ),
    forecast: memory.forecast,
    champion: memory.hiddenScribbitIds.has(memory.champion.id)
      ? null
      : cloneScribbit(memory.champion),
    myScribbits: getLivingScribbitsForPreview(previewMode).map(cloneScribbit),
    discoveredPowerUpIds: [
      ...new Set(
        memory.myScribbits.flatMap((scribbit) => scribbit.powerUpIds ?? [])
      ),
    ],
    pendingPowerUpOffers: [...economy.pendingPowerUpOffers.values()].filter(
      (offer) => livingScribbitIds.has(offer.scribbitId)
    ),
    pendingMaturityScribbitIds: [],
    drawCharges: memory.drawChargesByPreviewMode[previewMode] ?? {
      available: 0,
      capacity: 3,
      nextRefreshAt: null,
    },
    paintBucket: getPaintBucketState(),
    drawnToday: hasDrawnTodayForPreview(previewMode),
    todayFreeDrawing: getTodayFreeDrawingForPreview(previewMode),
    enteredToday: memory.enteredToday,
    bossChallengedToday: memory.bossChallengedToday,
    rumbleEntrants: memory.todayEntrants.length,
    communityLegendCount: memory.legends.length,
    rumbleResolvesAt: nextUtcMidnightMs(),
    season: seasonStateForPreview(previewMode),
    venueStamp: {
      arenaId: battleArena.id,
      arenaName: battleArena.name,
      challengeLabel: battleArena.challengeLabel,
      progress: venueCleared ? battleArena.challenge.target : 0,
      target: battleArena.challenge.target,
      cleared: venueCleared,
      bestClearMilliseconds: venueCleared ? 12_450 : null,
      dailyRank: venueCleared ? 4 : null,
      clearCount: 18,
      nextUnlock: getNextBattleArenaUnlock(memory.dayNumber),
      tourClearedArenaIds: venueCleared ? [battleArena.id] : [],
      tourClearedCount: venueCleared ? 1 : 0,
      tourTotal: 30,
      tourComplete: false,
      tourEffort: 1,
      tourEffortTarget: 3,
    },
    todayEntrants: memory.todayEntrants
      .filter((scribbit) => !memory.hiddenScribbitIds.has(scribbit.id))
      .map(cloneScribbit),
    myBackedScribbitId: getBackedScribbitIdForPreview(previewMode),
    playStreakDays: memory.playStreakDays,
    activePlayDays: memory.activePlayDays,
    dailyLogin: dailyLoginState(economy),
    myClout: memory.myClout,
    myInk: economy.ink,
    myPens: [...economy.inventory.pens],
    myDrawingSupplies: cloneItemCounts(economy.inventory.items),
    nextCapsuleCost: capsuleCostForCurrentPull(economy).cost,
    capsuleProgress: capsuleProgressState(economy),
    founderChronicle: getFounderChronicleForPreview(previewMode),
    lastRumbleReceipt: null,
    legacyReturnReceipt: null,
  };
};

const freshPlayerArenaState = (economy) => {
  const submittedScribbits = getLivingScribbitsForPreview('fresh');
  const submittedScribbitIds = new Set(
    submittedScribbits.map((scribbit) => scribbit.id)
  );
  const enteredToday = memory.todayEntrants.some((scribbit) =>
    submittedScribbitIds.has(scribbit.id)
  );

  return {
    ...arenaState(economy, 'fresh'),
    hasCreatedScribbit: memory.createdScribbitPreviewModes.has('fresh'),
    myScribbits: submittedScribbits.map(cloneScribbit),
    drawnToday: hasDrawnTodayForPreview('fresh'),
    enteredToday,
    myBackedScribbitId: getBackedScribbitIdForPreview('fresh'),
    playStreakDays: 1,
    activePlayDays: 1,
    myClout: 0,
    lastRumbleReceipt: null,
    legacyReturnReceipt: null,
  };
};

const loggedOutArenaState = () => {
  return {
    ...arenaState(createPreviewEconomy(), 'logged-out'),
    loggedIn: false,
    hasCreatedScribbit: false,
    hasCompletedBattle: false,
    myUsername: null,
    communityDrawTheme: null,
    myScribbits: [],
    drawnToday: false,
    enteredToday: false,
    myBackedScribbitId: null,
    playStreakDays: 0,
    activePlayDays: 0,
    myClout: 0,
    lastRumbleReceipt: null,
    legacyReturnReceipt: null,
    founderChronicle: projectFounderChronicle(createEmptyFounderChronicle()),
  };
};

const arenaStateForPreview = (previewMode) => {
  if (previewMode === 'fresh') {
    return freshPlayerArenaState(getPreviewEconomy(previewMode));
  }
  if (previewMode === 'logged-out') return loggedOutArenaState();
  return arenaState(getPreviewEconomy(previewMode));
};

const inventoryState = (inventory) => {
  const discovered = [...inventory.discovered];
  const gear = Object.fromEntries(
    discovered.flatMap((cosmeticId) => {
      const cosmetic = productionCosmeticById.get(cosmeticId);
      if (cosmetic?.kind !== 'accessory') return [];
      const storedGear = inventory.gear?.[cosmeticId];
      return [
        [
          cosmeticId,
          {
            rank: storedGear?.rank ?? 1,
            copies: inventory.items[cosmeticId] ?? 0,
            rarity: cosmetic.rarity,
          },
        ],
      ];
    })
  );
  return {
    items: cloneItemCounts(inventory.items),
    gear,
    pens: [...inventory.pens],
    titles: [...inventory.titles],
    equippedTitle: inventory.equippedTitle,
    discovered,
  };
};

const inventoryStateForPreview = (previewMode) => {
  const economy = getPreviewEconomy(previewMode);
  return economy ? inventoryState(economy.inventory) : emptyInventoryState();
};

const handleApi = async (request, response, url) => {
  const method = request.method ?? 'GET';
  const path = url.pathname;
  const previewMode = requestPreviewMode(request, url);
  const economy = getPreviewEconomy(previewMode);

  if (method === 'GET' && path === '/api/debug/battle') {
    const power = url.searchParams.get('power');
    if (!power || !Object.hasOwn(debugPowerFighters, power)) {
      sendError(response, 400, 'Choose inkquake, nib_halo, or colorburst.');
      return;
    }
    const requestedElement = url.searchParams.get('element');
    if (requestedElement !== null && !isElement(requestedElement)) {
      sendError(response, 400, 'Choose ember, tide, moss, or storm.');
      return;
    }
    const requestedSeedText = url.searchParams.get('seed');
    const requestedSeed = Number(requestedSeedText);
    if (
      requestedSeedText !== null &&
      (!Number.isSafeInteger(requestedSeed) || requestedSeed < 0)
    ) {
      sendError(response, 400, 'Choose a non-negative safe integer seed.');
      return;
    }
    const opponentPower = debugOpponentPower[power];
    const baseFighterA = debugPowerFighters[power];
    const fighterB = debugPowerFighters[opponentPower];
    if (!baseFighterA || !fighterB) {
      sendError(response, 500, 'Debug battle fixture is incomplete.');
      return;
    }
    const fighterA = {
      ...cloneScribbit(baseFighterA),
      element: requestedElement ?? baseFighterA.element,
    };
    sendJson(
      response,
      200,
      createBattleReport('exhibition', fighterA, fighterB, {
        seed:
          requestedSeedText === null ? debugBattleSeed[power] : requestedSeed,
      })
    );
    return;
  }

  if (previewMode === 'logged-out' && method === 'POST') {
    sendError(response, 401, 'Sign in to change your Scribbits data.');
    return;
  }

  if (method === 'GET' && path === '/api/arena') {
    const state = arenaStateForPreview(previewMode);
    if (
      previewMode === 'returning' &&
      (requestHasPreviewFlag(request, url, 'backed-return') ||
        requestHasPreviewFlag(request, url, 'legacy-return'))
    ) {
      sendJson(response, 200, {
        ...state,
        lastRumbleReceipt: requestHasPreviewFlag(request, url, 'backed-return')
          ? backedReturnReceiptState()
          : null,
        legacyReturnReceipt: requestHasPreviewFlag(
          request,
          url,
          'legacy-return'
        )
          ? legacyReturnReceiptState()
          : null,
      });
      return;
    }
    if (
      previewMode === 'returning' &&
      requestHasPreviewFlag(request, url, 'owned-return')
    ) {
      const ownedReturnRewards = getRumbleProgressionRewards(2);
      sendJson(response, 200, {
        ...state,
        myBackedScribbitId: null,
        lastRumbleReceipt: {
          kind: 'owned',
          resolvedDay: memory.dayNumber - 1,
          entrant: cloneScribbit(seededOwnedScribbits[0]),
          wins: 2,
          losses: 1,
          xpAwarded: ownedReturnRewards.xpAwarded,
          inkAwarded: ownedReturnRewards.inkAwarded,
          isChampion: false,
          replayAvailable: true,
        },
        legacyReturnReceipt: null,
      });
      return;
    }
    if (
      previewMode === 'returning' &&
      requestHasPreviewFlag(request, url, 'rival-thread')
    ) {
      sendJson(response, 200, {
        ...state,
        drawnToday: true,
        enteredToday: true,
        bossChallengedToday: true,
        myBackedScribbitId: state.todayEntrants[0]?.id ?? null,
        lastRumbleReceipt: null,
        legacyReturnReceipt: null,
      });
      return;
    }
    sendJson(response, 200, state);
    return;
  }

  if (method === 'GET' && path === '/api/splash') {
    const state = arenaStateForPreview(previewMode);
    sendJson(response, 200, {
      loggedIn: state.loggedIn,
      hasCreatedScribbit: state.hasCreatedScribbit,
      featuredCreations: featuredCreationsForPreview(),
    });
    return;
  }

  if (method === 'POST' && path === '/api/battle-clip') {
    const body = await readJsonBody(request);
    if (
      !body ||
      typeof body.videoDataUrl !== 'string' ||
      !body.videoDataUrl.startsWith('data:video/')
    ) {
      sendError(
        response,
        400,
        'Send one WebM or MP4 battle clip under 2.5 MB.'
      );
      return;
    }
    sendJson(response, 200, {
      videoUrl: 'https://v.redd.it/scribbits-mock-battle.webm',
    });
    return;
  }

  if (method === 'GET' && path === '/api/spar-rivals') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to choose spar rivals.');
      return;
    }
    const scribbitId = url.searchParams.get('scribbitId')?.trim() ?? '';
    const challenger = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );
    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to spar.');
      return;
    }
    if (economy.pendingPowerUpOffers.has(challenger.id)) {
      sendError(
        response,
        409,
        'Choose the pending Power-Up before the next fight.'
      );
      return;
    }
    const rivalRun = getOrCreateMockRivalRun(challenger, previewMode);
    sendJson(response, 200, {
      challenger: cloneScribbit(challenger),
      choices: createRivalRunChoices(
        challenger,
        mockSparRivalSlate(challenger, previewMode, rivalRun),
        memory.forecast
      ).map((choice) => ({
        ...choice,
        rival: cloneScribbit(choice.rival),
      })),
      founderChronicle: getFounderChronicleForPreview(previewMode),
      dayNumber: memory.dayNumber,
      forecast: memory.forecast,
      rivalRun,
    });
    return;
  }

  if (method === 'GET' && path === '/api/inventory') {
    sendJson(response, 200, inventoryStateForPreview(previewMode));
    return;
  }

  if (method === 'POST' && path === '/api/equip-gear') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const category = body?.category;
    const slotIndex = body?.slotIndex;
    const gearId =
      body?.gearId === null
        ? null
        : typeof body?.gearId === 'string'
          ? body.gearId.trim()
          : undefined;
    if (
      !scribbitId ||
      !isEquipmentCategory(category) ||
      (slotIndex !== 0 && slotIndex !== 1) ||
      (gearId !== null &&
        (typeof gearId !== 'string' || !/^[a-z0-9-]{2,64}$/.test(gearId)))
    ) {
      sendError(response, 400, 'Choose a valid living Scribbit and Gear slot.');
      return;
    }

    const scribbit = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );
    if (!scribbit || scribbit.isFounding) {
      sendError(response, 404, 'That Scribbit is not in your active roster.');
      return;
    }

    const gear = gearId === null ? undefined : findGearCosmetic(gearId);
    if (gearId !== null && gear?.category !== category) {
      sendError(response, 400, 'Choose Gear that matches that slot category.');
      return;
    }
    const inventory = inventoryState(economy.inventory);
    if (gearId !== null && inventory.gear[gearId] === undefined) {
      sendError(response, 400, 'Discover that Gear before equipping it.');
      return;
    }

    const currentLoadout =
      validateCatalogEquipmentLoadout(scribbit.equipmentLoadout) ??
      createEmptyEquipmentLoadout();
    const projectedLoadout = validateCatalogEquipmentLoadout(
      equipGearInLoadout(currentLoadout, { category, slotIndex, gearId })
    );
    if (!projectedLoadout) {
      sendError(response, 400, 'Choose Gear that matches that slot category.');
      return;
    }
    const presentedGearIds = new Set([
      ...scribbit.accessories,
      ...Object.values(projectedLoadout).flatMap((slots) =>
        slots.filter((catalogId) => catalogId !== null)
      ),
    ]);
    const projectedGearRanks = Object.fromEntries(
      [...presentedGearIds].map((catalogId) => [
        catalogId,
        catalogId === gearId
          ? (inventory.gear[catalogId]?.rank ?? 1)
          : (scribbit.gearRanks?.[catalogId] ?? 1),
      ])
    );
    scribbit.equipmentLoadout = projectedLoadout;
    scribbit.gearRanks = projectedGearRanks;
    for (const mirroredList of [memory.myScribbits, memory.todayEntrants]) {
      const mirroredScribbit = mirroredList.find(
        (entry) => entry.id === scribbitId
      );
      if (mirroredScribbit && mirroredScribbit !== scribbit) {
        mirroredScribbit.equipmentLoadout = projectedLoadout;
        mirroredScribbit.gearRanks = { ...projectedGearRanks };
      }
    }
    sendJson(response, 200, cloneScribbit(scribbit));
    return;
  }

  if (method === 'GET' && path === '/api/scout-notebook') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to open your Scout Notebook.');
      return;
    }
    sendJson(
      response,
      200,
      scoutNotebookStateForPreview(
        previewMode,
        requestHasPreviewFlag(request, url, 'rival-thread')
      )
    );
    return;
  }

  if (method === 'POST' && path === '/api/equip-title') {
    const body = await readJsonBody(request);
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      (body.titleId !== null && typeof body.titleId !== 'string')
    ) {
      sendError(
        response,
        400,
        'Choose an owned title or remove your current title.'
      );
      return;
    }

    const titleId =
      typeof body.titleId === 'string' ? body.titleId.trim() : body.titleId;
    if (titleId !== null && !/^[a-z0-9-]{2,64}$/.test(titleId)) {
      sendError(response, 400, 'Choose a valid creator title.');
      return;
    }

    const inventory = inventoryState(economy.inventory);
    const projectedInventory = projectEquippedTitle(inventory, titleId);
    if (!projectedInventory) {
      sendError(response, 400, 'Discover that title before wearing it.');
      return;
    }

    economy.inventory = projectedInventory;
    sendJson(response, 200, inventoryState(projectedInventory));
    return;
  }

  if (method === 'POST' && path === '/api/merge-gear') {
    const body = await readJsonBody(request);
    const operationId =
      typeof body?.operationId === 'string' ? body.operationId.trim() : '';
    const gearId = typeof body?.gearId === 'string' ? body.gearId.trim() : '';
    const refreshMockEquippedRanks = (rank) => {
      for (const list of [memory.myScribbits, memory.todayEntrants]) {
        for (const scribbit of list) {
          const wearsGear = Object.values(scribbit.equipmentLoadout).some(
            (slots) => slots.includes(gearId)
          );
          if (wearsGear) {
            scribbit.gearRanks = { ...scribbit.gearRanks, [gearId]: rank };
          }
        }
      }
    };
    if (!operationId || !gearId) {
      sendError(response, 400, 'Choose valid Gear and a forge operation.');
      return;
    }
    const cachedMerge = economy.gearMergeOperations.get(operationId);
    if (cachedMerge) {
      if (cachedMerge.gearId !== gearId) {
        sendError(response, 409, 'That forge operation was already used.');
        return;
      }
      refreshMockEquippedRanks(cachedMerge.toRank);
      sendJson(response, 200, cachedMerge);
      return;
    }
    const merge = projectGearMerge(inventoryState(economy.inventory), gearId);
    if (merge.status === 'invalid') {
      sendError(response, 400, 'Discover that Gear before forging it.');
      return;
    }
    if (merge.status === 'insufficientCopies') {
      sendError(response, 409, 'You need three copies to forge this Gear.');
      return;
    }
    if (merge.status === 'maxRank') {
      sendError(response, 409, 'That Gear is already at max rank.');
      return;
    }
    economy.inventory = merge.response.inventory;
    refreshMockEquippedRanks(merge.response.toRank);
    economy.gearMergeOperations.set(operationId, merge.response);
    sendJson(response, 200, merge.response);
    return;
  }

  if (method === 'POST' && path === '/api/daily-login/claim') {
    const dateKey = currentUtcDateKey();
    if (economy.dailyLogin.lastClaimDateKey === dateKey) {
      sendJson(response, 200, {
        dailyLogin: dailyLoginState(economy),
        reward: economy.dailyLogin.lastReward,
        ink: economy.ink,
      });
      return;
    }

    const rewardPlan = dailyLoginRewardAfterClaims(
      economy.dailyLogin.totalClaimedDays
    );
    const reward = {
      trackDay: rewardPlan.trackDay,
      cycleDay: rewardPlan.cycleDay,
      inkAwarded: rewardPlan.ink,
      gearId: rewardPlan.gearId,
      claimedAtMs: Date.now(),
    };
    economy.ink += reward.inkAwarded;
    if (reward.gearId) {
      const gear = getProductionCosmetic(reward.gearId);
      const grant = projectCapsuleInventoryGrant(
        inventoryState(economy.inventory),
        gear
      );
      economy.inventory = grant.inventory;
    }
    if (reward.trackDay !== null) {
      economy.dailyLogin.claimedTrackDays = Math.min(
        DAILY_LOGIN_TRACK.length,
        economy.dailyLogin.claimedTrackDays + 1
      );
    }
    economy.dailyLogin.totalClaimedDays += 1;
    economy.dailyLogin.lastClaimDateKey = dateKey;
    economy.dailyLogin.lastReward = reward;
    sendJson(response, 200, {
      dailyLogin: dailyLoginState(economy),
      reward,
      ink: economy.ink,
    });
    return;
  }

  if (method === 'POST' && path === '/api/maturity/acknowledge') {
    const body = await readJsonBody(request);
    sendJson(response, 200, { scribbitId: body?.scribbitId ?? '' });
    return;
  }

  if (method === 'POST' && path === '/api/progression-event') {
    sendJson(response, 200, { accepted: true, duplicate: false });
    return;
  }

  if (method === 'POST' && path === '/api/capsule') {
    const body = await readJsonBody(request);
    const operationId =
      typeof body?.operationId === 'string' ? body.operationId.trim() : '';
    if (!operationId) {
      sendError(response, 400, 'Open the capsule with a valid operation id.');
      return;
    }
    const cachedOperation = economy.capsuleOperations.get(operationId);
    if (cachedOperation) {
      sendJson(response, 200, cachedOperation);
      return;
    }
    const { cost, arenaDay } = capsuleCostForCurrentPull(economy);

    if (economy.ink < cost) {
      sendError(
        response,
        402,
        `You need ${cost} Mystery Ink to open a capsule.`
      );
      return;
    }

    const drop = selectMockCapsuleDrop(economy);

    if (!drop) {
      sendError(response, 500, 'The capsule machine jammed. Try again soon.');
      return;
    }

    economy.capsulePullCount += 1;
    economy.pullsSinceEpic = advanceCapsulePity(
      economy.pullsSinceEpic,
      drop.rarity
    );
    economy.discountedCapsuleDay = arenaDay;
    economy.ink -= cost;
    const inventoryGrant = projectCapsuleInventoryGrant(
      inventoryState(economy.inventory),
      drop
    );
    economy.inventory = inventoryGrant.inventory;

    const capsuleResponse = {
      pull: {
        ...drop,
        isNew: inventoryGrant.isNew,
        ownedCount: inventoryGrant.ownedCount,
        gearRank: inventoryGrant.inventory.gear[drop.id]?.rank ?? null,
        mergeReady:
          drop.kind === 'accessory' &&
          (inventoryGrant.inventory.gear[drop.id]?.rank ?? 1) < MAX_GEAR_RANK &&
          inventoryGrant.ownedCount >= GEAR_MERGE_COPY_COST,
      },
      ink: economy.ink,
      inventory: inventoryState(economy.inventory),
      nextCost: CAPSULE_COST,
      progress: capsuleProgressState(economy),
    };
    economy.capsuleOperations.set(operationId, capsuleResponse);
    sendJson(response, 200, capsuleResponse);
    return;
  }

  if (method === 'GET' && path === '/api/my-battles') {
    sendJson(
      response,
      200,
      battleReportsForPreview(previewMode)
        .filter(
          (report) =>
            !memory.hiddenScribbitIds.has(report.a.id) &&
            !memory.hiddenScribbitIds.has(report.b.id)
        )
        .map((report) => ({ ...report }))
    );
    return;
  }

  if (method === 'GET' && path === '/api/rumble-replay') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to replay your Rumble pick.');
      return;
    }
    const resolvedDay = Number(url.searchParams.get('day'));
    const report = requestHasPreviewFlag(request, url, 'owned-return')
      ? ownedRumbleReplay
      : memory.rumbleReplaysByDay.get(resolvedDay);
    if (
      previewMode !== 'returning' ||
      !isScoutNotebookReplayDay(memory.dayNumber, resolvedDay) ||
      !report ||
      report.day !== resolvedDay ||
      memory.hiddenScribbitIds.has(report.a.id) ||
      memory.hiddenScribbitIds.has(report.b.id)
    ) {
      sendError(response, 404, 'That featured bout is no longer available.');
      return;
    }
    sendJson(response, 200, report);
    return;
  }

  if (method === 'GET' && path === '/api/legacy-cards') {
    const allCards = getPersonalLegacyCards();
    const requestedLimit = parseLegacyCardsPageSize(
      url.searchParams.get('limit')
    );
    const page =
      requestedLimit === undefined
        ? undefined
        : paginateLegacyCards(
            allCards,
            url.searchParams.get('cursor'),
            requestedLimit
          );
    if (!page) {
      sendError(response, 400, 'Use a valid Legacy Deck cursor and page size.');
      return;
    }

    if (previewMode !== 'returning') {
      sendJson(response, 200, { cards: [], nextCursor: null });
      return;
    }

    sendJson(response, 200, page);
    return;
  }

  if (method === 'POST' && path === '/api/legacy-cards/seen') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to file away Legacy Cards.');
      return;
    }

    const body = await readJsonBody(request);
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !Number.isSafeInteger(body.throughArchivedDay) ||
      body.throughArchivedDay < 0
    ) {
      sendError(response, 400, 'Choose a valid archived day to file away.');
      return;
    }
    if (body.throughArchivedDay > memory.dayNumber) {
      sendError(response, 400, 'That Legacy Card has not been archived yet.');
      return;
    }

    const seenThroughDayKey =
      previewMode === 'fresh'
        ? 'freshLegacySeenThroughDay'
        : 'legacySeenThroughDay';
    memory[seenThroughDayKey] = getNextLegacySeenThroughDay(
      memory[seenThroughDayKey],
      body.throughArchivedDay
    );
    sendJson(response, 200, {
      seenThroughDay: memory[seenThroughDayKey],
    });
    return;
  }

  if (method === 'GET' && path === '/api/legends') {
    const cursorOffset = readPageNumber(url.searchParams.get('cursor'), 0);
    const requestedLimit = readPageNumber(
      url.searchParams.get('limit'),
      maximumLegendsPageSize,
      maximumLegendsPageSize
    );
    if (
      cursorOffset === undefined ||
      requestedLimit === undefined ||
      requestedLimit < 1
    ) {
      sendError(
        response,
        400,
        'Use a valid Legends cursor and a positive page size.'
      );
      return;
    }

    const pageLegends = [];
    let nextCursor = null;
    const hiddenScribbitIds =
      previewMode === 'returning' ? memory.hiddenScribbitIds : new Set();
    for (let index = cursorOffset; index < memory.legends.length; index += 1) {
      const scribbit = memory.legends[index];
      if (!scribbit || hiddenScribbitIds.has(scribbit.id)) continue;
      if (pageLegends.length === requestedLimit) {
        nextCursor = String(index);
        break;
      }
      pageLegends.push(cloneScribbit(scribbit));
    }

    sendJson(response, 200, {
      legends: pageLegends,
      nextCursor,
    });
    return;
  }

  if (method === 'GET' && path === '/api/clout-board') {
    sendJson(response, 200, memory.cloutBoard);
    return;
  }

  if (method === 'GET' && path === '/api/season') {
    sendJson(response, 200, seasonStateForPreview(previewMode));
    return;
  }

  if (method === 'GET' && path === '/api/season-board') {
    sendJson(response, 200, seasonBoardForPreview(previewMode));
    return;
  }

  if (method === 'GET' && path === '/api/venue-board') {
    sendJson(response, 200, venueBoardForPreview(previewMode));
    return;
  }

  if (method === 'GET' && path.startsWith('/api/drawing/')) {
    const id = decodeURIComponent(path.slice('/api/drawing/'.length));
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=60',
    });
    response.end(drawingBytesFor(id));
    return;
  }

  if (method === 'POST' && path === '/api/back') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);

    if (!memory.todayEntrants.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, "Pick one of tonight's Rumble entrants.");
      return;
    }

    if (memory.myScribbits.some((entry) => entry.id === scribbitId)) {
      sendError(
        response,
        400,
        "Pick another Redditor's Scribbit, not your own."
      );
      return;
    }

    if (getBackedScribbitIdForPreview(previewMode)) {
      sendError(response, 409, 'You already picked a Scribbit today.');
      return;
    }

    setBackedScribbitIdForPreview(previewMode, scribbitId);
    sendJson(response, 200, { backed: scribbitId });
    return;
  }

  if (method === 'POST' && path === '/api/remove-scribbit') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to remove your Scribbit.');
      return;
    }
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = getOwnedScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );

    if (!scribbit || scribbit.isFounding) {
      sendError(response, 404, 'That Scribbit is not yours to remove.');
      return;
    }

    removeScribbitEverywhere(scribbitId);
    sendJson(response, 200, { removed: scribbitId });
    return;
  }

  if (method === 'POST' && path === '/api/retire-scribbit') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to retire your Scribbit.');
      return;
    }
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = getOwnedScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );

    if (!scribbit || scribbit.isFounding) {
      sendError(response, 404, 'That Scribbit is not yours to retire.');
      return;
    }
    if (scribbit.status !== 'alive') {
      sendJson(response, 200, { retired: cloneScribbit(scribbit) });
      return;
    }
    if (memory.todayEntrants.some((entry) => entry.id === scribbitId)) {
      sendError(
        response,
        409,
        "This Scribbit is entered in today's Rumble. Retire it after the results."
      );
      return;
    }

    const retired = resolveExpiredScribbitStatus(scribbit, {
      archivedDay: memory.dayNumber,
    });
    removeScribbitFromList(memory.myScribbits, scribbitId);
    memory.archivedOwnedScribbits.push(retired);
    if (retired.status === 'legend') memory.legends.push(retired);
    sendJson(response, 200, { retired: cloneScribbit(retired) });
    return;
  }

  if (method === 'POST' && path === '/api/report-scribbit') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = findVisibleScribbit(scribbitId);

    if (!scribbit || scribbit.isFounding) {
      sendError(
        response,
        404,
        'That community Scribbit is no longer available.'
      );
      return;
    }
    if (memory.myScribbits.some((entry) => entry.id === scribbitId)) {
      sendError(
        response,
        400,
        'Remove your own Scribbit instead of reporting it.'
      );
      return;
    }

    memory.hiddenScribbitIds.add(scribbitId);
    const reportCount = (memory.reportCounts.get(scribbitId) ?? 0) + 1;
    memory.reportCounts.set(scribbitId, reportCount);
    sendJson(response, 200, {
      hidden: scribbitId,
      removedForEveryone: reportCount >= 3,
    });
    return;
  }

  if (method === 'POST' && path === '/api/delete-my-data') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to delete your Scribbits data.');
      return;
    }
    const ownedScribbits = getOwnedScribbitsForPreview(previewMode).filter(
      (scribbit) => !scribbit.isFounding
    );
    const removedScribbits = ownedScribbits.length;
    for (const scribbit of ownedScribbits) {
      removeScribbitEverywhere(scribbit.id);
    }

    resetPreviewEconomy(economy);
    memory.communityThemeDrawCountByPreviewMode[previewMode] = 0;
    memory.createdScribbitPreviewModes.delete(previewMode);
    memory.completedBattlePreviewModes.delete(previewMode);
    memory.founderChronicleByPreviewMode[previewMode] =
      createEmptyFounderChronicle();
    clearFreeDrawingForPreview(previewMode);
    if (previewMode === 'fresh') {
      memory.freshLegacySeenThroughDay = 0;
    }
    if (previewMode === 'returning') {
      memory.drawnToday = false;
      memory.enteredToday = false;
      memory.bossChallengedToday = false;
      setBackedScribbitIdForPreview(previewMode, null);
      memory.myClout = 0;
      memory.playStreakDays = 0;
      memory.legacySeenThroughDay = 0;
      memory.beliefVotes.clear();
      memory.hiddenScribbitIds.clear();
      memory.reportCounts.clear();
    }
    sendJson(response, 200, { deleted: true, removedScribbits });
    return;
  }

  if (method === 'POST' && path === '/api/believe') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = findVisibleScribbit(scribbitId);

    if (
      !scribbit ||
      scribbit.status !== 'alive' ||
      scribbit.expiresDay <= memory.dayNumber
    ) {
      sendError(
        response,
        404,
        'That Scribbit cannot collect belief right now.'
      );
      return;
    }

    if (scribbit.artist === 'mock_player') {
      sendError(response, 400, "believe in someone else's doodle");
      return;
    }

    if (memory.beliefVotes.has(scribbitId)) {
      sendError(response, 409, 'You already believed in that Scribbit today.');
      return;
    }

    memory.beliefVotes.add(scribbitId);
    mutateVisibleScribbit(scribbitId, (entry) => {
      entry.belief += 1;
    });
    sendJson(response, 200, { belief: findVisibleScribbit(scribbitId).belief });
    return;
  }

  if (method === 'POST' && path === '/api/practice-battle') {
    const result = createPracticeBattle({
      request: await readJsonBody(request),
      artist: 'mock_player',
      playerId: `mock:${previewMode}`,
      canonicalDay: memory.dayNumber,
      nonce: randomUUID(),
    });

    if (result.status === 'invalid-request') {
      sendError(
        response,
        400,
        'Send only a 2-24 character name and a base PNG drawing.'
      );
      return;
    }
    if (result.status === 'invalid-png') {
      sendError(
        response,
        400,
        'Practice drawings must be 512x512 PNG data URLs under 400 KB.'
      );
      return;
    }
    if (result.status === 'too-small') {
      sendError(
        response,
        400,
        'Your Scribbit needs a body. Add a few more lines before practicing.'
      );
      return;
    }

    // Deliberately no mock memory writes: production practice is ephemeral.
    sendJson(response, 200, result.report);
    return;
  }

  if (method === 'POST' && path === '/api/spar') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );

    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to spar.');
      return;
    }

    const requestedOpponentId =
      typeof body?.opponentId === 'string' ? body.opponentId.trim() : '';
    const founderChronicle = getFounderChronicleForPreview(previewMode);
    const requestedRivalRun =
      body?.rivalRun &&
      typeof body.rivalRun.id === 'string' &&
      Number.isSafeInteger(body.rivalRun.expectedBoutsCompleted)
        ? body.rivalRun
        : null;
    if (
      (body?.rivalRun !== undefined && !requestedRivalRun) ||
      (requestedRivalRun && !requestedOpponentId)
    ) {
      sendError(response, 400, 'Choose a valid Rival Run bout.');
      return;
    }
    const activeRivalRun = requestedRivalRun
      ? mockRivalRuns.get(`${previewMode}:${challenger.id}`)
      : null;
    const requestedRunOpponent = requestedRivalRun
      ? findFoundingScribbit(requestedOpponentId)
      : undefined;
    const precomputedRunReport =
      requestedRivalRun && requestedRunOpponent
        ? createBattleReport('exhibition', challenger, requestedRunOpponent, {
            seed: hashStringToUint32(
              `rival-run:${requestedRivalRun.id}:${requestedRivalRun.expectedBoutsCompleted + 1}:${requestedRunOpponent.id}`
            ),
          })
        : null;
    if (requestedRivalRun && precomputedRunReport) {
      const storedRunReport = memory.myBattles.find((storedReport) => {
        return (
          storedReport.id === precomputedRunReport.id &&
          storedReport.rivalRun?.id === requestedRivalRun.id &&
          storedReport.rivalRun.boutNumber ===
            requestedRivalRun.expectedBoutsCompleted + 1
        );
      });
      if (storedRunReport) {
        memory.completedBattlePreviewModes.add(previewMode);
        const storedRewardReceipt =
          economy.sparRewardReceipts.get(storedRunReport.id) ??
          createSparRewardReceipt({
            reportId: storedRunReport.id,
            scribbitId: challenger.id,
            xpBefore: storedRunReport.a.xp,
            xpAfter: storedRunReport.a.xp,
            inkAwarded: 0,
          });
        sendJson(response, 200, {
          report: storedRunReport,
          founderChronicle: getFounderChronicleForPreview(previewMode),
          founderChronicleBeat: null,
          rewardReceipt: storedRewardReceipt,
        });
        return;
      }
    }
    if (economy.pendingPowerUpOffers.has(challenger.id)) {
      sendError(
        response,
        409,
        'Choose the pending Power-Up before the next fight.'
      );
      return;
    }
    if (
      requestedRivalRun &&
      (!activeRivalRun ||
        activeRivalRun.id !== requestedRivalRun.id ||
        activeRivalRun.dayNumber !== memory.dayNumber ||
        activeRivalRun.challengerId !== challenger.id ||
        activeRivalRun.status !== 'active' ||
        activeRivalRun.boutsCompleted !==
          requestedRivalRun.expectedBoutsCompleted)
    ) {
      sendError(response, 409, 'That Rival Run moved on. Reopen the board.');
      return;
    }
    const rivalChoices = createRivalRunChoices(
      challenger,
      mockSparRivalSlate(challenger, previewMode, activeRivalRun ?? undefined),
      memory.forecast
    );
    const chosenChoice = requestedOpponentId
      ? rivalChoices.find((choice) => choice.rival.id === requestedOpponentId)
      : null;
    const opponent = requestedOpponentId
      ? chosenChoice?.rival
      : chooseFoundingSparOpponent(
          challenger,
          hashStringToUint32(`quick-spar:${challenger.id}:${Date.now()}`),
          {
            preferredFounderId: founderChronicle.activeRivalry?.founderId,
          }
        );
    if (!opponent) {
      sendError(
        response,
        requestedOpponentId ? 400 : 503,
        requestedOpponentId
          ? 'Choose a rival from the current spar card.'
          : 'No founding spar opponent is available.'
      );
      return;
    }
    const report =
      precomputedRunReport ??
      createBattleReport('exhibition', challenger, opponent);
    const rivalRunReceipt = requestedRivalRun
      ? activeRivalRun && chosenChoice
        ? advanceRivalRunState(activeRivalRun, {
            expectedBoutsCompleted: requestedRivalRun.expectedBoutsCompleted,
            playerWon: report.winner === 'a',
            opponentId: opponent.id,
            tier: chosenChoice.tier,
            winPoints: chosenChoice.winPoints,
          })
        : null
      : null;
    if (requestedRivalRun && !rivalRunReceipt) {
      sendError(response, 409, 'That Rival Run moved on. Reopen the board.');
      return;
    }
    if (rivalRunReceipt) {
      mockRivalRuns.set(`${previewMode}:${challenger.id}`, {
        id: rivalRunReceipt.id,
        dayNumber: rivalRunReceipt.dayNumber,
        challengerId: rivalRunReceipt.challengerId,
        boutsCompleted: rivalRunReceipt.boutsCompleted,
        wins: rivalRunReceipt.wins,
        losses: rivalRunReceipt.losses,
        score: rivalRunReceipt.score,
        opponentIds: [...rivalRunReceipt.opponentIds],
        status: rivalRunReceipt.status,
        challenge: {
          ...rivalRunReceipt.challenge,
          condition: { ...rivalRunReceipt.challenge.condition },
        },
      });
    }
    let rewardedReport = report;
    let rewardReceipt = createSparRewardReceipt({
      reportId: report.id,
      scribbitId: challenger.id,
      xpBefore: challenger.xp,
      xpAfter: challenger.xp,
      inkAwarded: 0,
    });

    if (report.winner === 'a') {
      const utcDateKey = currentUtcDateKey();
      if (!economy.sparWinRewardUtcDates.has(utcDateKey)) {
        economy.sparWinRewardUtcDates.add(utcDateKey);
        economy.ink += INK_REWARDS.sparWin;
        const xpBefore = challenger.xp;
        Object.assign(
          challenger,
          addXpToScribbit(challenger, XP_REWARDS.sparWin)
        );
        rewardReceipt = createSparRewardReceipt({
          reportId: report.id,
          scribbitId: challenger.id,
          xpBefore,
          xpAfter: challenger.xp,
          inkAwarded: INK_REWARDS.sparWin,
        });
        rewardedReport = { ...report, inkAwarded: INK_REWARDS.sparWin };
      }
    }
    economy.sparRewardReceipts.set(report.id, rewardReceipt);

    if (rivalRunReceipt) {
      rewardedReport = { ...rewardedReport, rivalRun: rivalRunReceipt };
    }

    let powerUpOffer = null;
    if (
      report.winner === 'a' &&
      challenger.powerUpIds.length < MAXIMUM_POWER_UPS
    ) {
      const source = rivalRunReceipt
        ? rivalRunReceipt.status === 'complete'
          ? 'rival-run-final-win'
          : 'rival-run-win'
        : 'exhibition-win';
      const choices = createDeterministicPowerUpOffer({
        seed: `power-up-offer:v1:${report.id}:${challenger.id}`,
        source,
        ownedPowerUpIds: challenger.powerUpIds,
      });
      if (choices?.length === 3) {
        powerUpOffer = {
          version: 1,
          id: `power-up-offer:v1:${report.id}:${challenger.id}`,
          scribbitId: challenger.id,
          sourceReportId: report.id,
          source,
          choices,
          createdAtMs: Date.now(),
        };
        economy.pendingPowerUpOffers.set(challenger.id, powerUpOffer);
      }
    }

    memory.myBattles.unshift(rewardedReport);
    memory.completedBattlePreviewModes.add(previewMode);
    const founderChronicleBeats = requestedOpponentId
      ? recordMockFounderChronicleBattle(
          previewMode,
          rewardedReport,
          challenger.id
        )
      : [];
    sendJson(response, 200, {
      report: rewardedReport,
      founderChronicle: getFounderChronicleForPreview(previewMode),
      founderChronicleBeat: founderChronicleBeats.at(-1) ?? null,
      rewardReceipt,
      powerUpOffer,
    });
    return;
  }

  if (method === 'POST' && path === '/api/power-up/choose') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );
    const offer = scribbitId
      ? economy.pendingPowerUpOffers.get(scribbitId)
      : null;
    if (
      !scribbit ||
      !offer ||
      body?.offerId !== offer.id ||
      !isPowerUpId(body?.selectedId) ||
      !offer.choices.includes(body.selectedId) ||
      body?.expectedPowerUpCount !== scribbit.powerUpIds.length
    ) {
      sendError(
        response,
        409,
        'That Power-Up offer changed. Reopen the reward.'
      );
      return;
    }
    scribbit.powerUpIds = [...scribbit.powerUpIds, body.selectedId];
    economy.pendingPowerUpOffers.delete(scribbit.id);
    sendJson(response, 200, {
      scribbitId: scribbit.id,
      selectedId: body.selectedId,
      powerUpIds: [...scribbit.powerUpIds],
    });
    return;
  }

  if (method === 'POST' && path === '/api/boss-challenge') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );

    if (!challenger || challenger.expiresDay > memory.dayNumber) {
      sendError(
        response,
        404,
        'That Scribbit must mature before entering the Arena.'
      );
      return;
    }

    if (memory.bossChallengedToday) {
      sendError(response, 409, "You already challenged today's Champion.");
      return;
    }

    const report = createBattleReport('boss', challenger, memory.champion);
    memory.bossChallengedToday = true;
    Object.assign(
      challenger,
      applyBattleOutcomeToScribbit(
        challenger,
        report.winner === 'a' ? 'win' : 'loss',
        XP_REWARDS.championWin
      )
    );
    memory.myBattles.unshift(report);
    const founderChronicleBeats = recordMockFounderChronicleBattle(
      previewMode,
      report,
      challenger.id
    );
    sendJson(response, 200, {
      report,
      founderChronicle: getFounderChronicleForPreview(previewMode),
      founderChronicleBeat: founderChronicleBeats.at(-1) ?? null,
    });
    return;
  }

  if (method === 'POST' && path === '/api/free-drawing') {
    const body = await readJsonBody(request);
    const submissionId =
      body &&
      typeof body === 'object' &&
      typeof body.submissionId === 'string' &&
      /^[A-Za-z0-9_-]{16,80}$/.test(body.submissionId)
        ? body.submissionId
        : null;
    const submission = validateAndAnalyzeScribbitSubmission(body);
    if (!submissionId || submission.status === 'invalid') {
      const messageByReason = {
        'invalid-request':
          'Send a submission ID, 2-24 character name, and valid drawing images.',
        'invalid-png':
          'Base and rendered drawings must be 512x512 PNG data URLs under 400 KB each.',
        'rendered-mismatch':
          'Rendered drawing must match the base PNG outside declared accessories and must not erase base pixels.',
        'insufficient-ink':
          'Your Free Draw needs a body. Add a few more lines before saving.',
      };
      sendError(
        response,
        400,
        submission.status === 'invalid'
          ? messageByReason[submission.reason]
          : messageByReason['invalid-request']
      );
      return;
    }

    const id = `mock-free-${submissionId}`;
    const existingDrawing = freeDrawingsById.get(id);
    const existingOwner = freeDrawingOwnerById.get(id);
    if (existingDrawing && existingOwner === previewMode) {
      sendJson(response, 200, existingDrawing);
      return;
    }
    if (existingDrawing || existingOwner) {
      sendError(
        response,
        409,
        'That Free Draw submission ID is already in use.'
      );
      return;
    }
    if (getLivingScribbitsForPreview(previewMode).length === 0) {
      sendError(
        response,
        409,
        'Draw your first Scribbit before using Free Draw.'
      );
      return;
    }
    if (hasDrawnTodayForPreview(previewMode)) {
      sendError(response, 409, 'You already chose a drawing mode today.');
      return;
    }

    submittedDrawingBytes.set(
      id,
      Buffer.from(
        submission.draft.imageDataUrl.slice('data:image/png;base64,'.length),
        'base64'
      )
    );
    const freeDrawing = {
      id,
      name: submission.draft.name,
      artist: 'mock_player',
      imageUrl: `/api/drawing/${id}`,
      createdDay: memory.dayNumber,
      createdAtMilliseconds: Date.now(),
    };
    freeDrawingsById.set(id, freeDrawing);
    freeDrawingOwnerById.set(id, previewMode);
    memory.freeDrawingIdByPreviewMode[previewMode] = id;
    sendJson(response, 201, freeDrawing);
    return;
  }

  if (method === 'POST' && path === '/api/scribbit') {
    const body = await readJsonBody(request);
    const submission = validateAndAnalyzeScribbitSubmission(body);
    if (submission.status === 'invalid') {
      const messageByReason = {
        'invalid-request':
          'Send a 2-24 character name, base and rendered PNG data URLs, and valid accessories.',
        'invalid-png':
          'Base and rendered drawings must be 512x512 PNG data URLs under 400 KB each.',
        'rendered-mismatch':
          'Rendered drawing must match the base PNG outside declared accessories and must not erase base pixels.',
        'insufficient-ink':
          'Your Scribbit needs a body. Add a few more lines before submitting.',
      };
      sendError(response, 400, messageByReason[submission.reason]);
      return;
    }
    const { draft } = submission;
    const submissionId =
      body && typeof body.submissionId === 'string' ? body.submissionId : null;
    if (!submissionId) {
      sendError(response, 400, 'Send a valid Scribbit submission ID.');
      return;
    }
    const id = `mock-submitted-${submissionId.replaceAll('_', '-')}`;
    const existingScribbit = memory.myScribbits.find(
      (scribbit) => scribbit.id === id
    );
    if (existingScribbit) {
      submittedScribbitPreviewModes.set(id, previewMode);
      memory.createdScribbitPreviewModes.add(previewMode);
      const powerUpOffer = getOrCreateMockBirthPowerUpOffer(
        economy,
        existingScribbit
      );
      sendJson(response, 200, {
        scribbit: cloneScribbit(existingScribbit),
        drawCharges: memory.drawChargesByPreviewMode[previewMode],
        enteredRumble: memory.todayEntrants.some(
          (entrant) => entrant.id === id
        ),
        powerUpOffer,
      });
      return;
    }
    const drawCharges = memory.drawChargesByPreviewMode[previewMode];
    if (!drawCharges || drawCharges.available <= 0) {
      sendError(response, 409, 'No Draw Charges left.');
      return;
    }
    const growingScribbitCount = getLivingScribbitsForPreview(
      previewMode
    ).filter((scribbit) => scribbit.expiresDay > memory.dayNumber).length;
    if (growingScribbitCount >= MAX_GROWING_PER_USER) {
      sendError(response, 409, 'You already have three growing Scribbits.');
      return;
    }

    const inventoryBeforeSubmission = inventoryState(economy.inventory);
    const consumableConsumption =
      projectSubmissionConsumableInventoryConsumption(
        inventoryBeforeSubmission,
        draft.accessories.map(({ id: accessoryId }) => accessoryId),
        draft.drawingSupplies
      );
    if (consumableConsumption.status === 'invalid') {
      sendError(
        response,
        400,
        'Choose valid Mystery Ink accessories and drawing supplies.'
      );
      return;
    }
    if (consumableConsumption.status === 'insufficient') {
      sendError(
        response,
        409,
        `Your ${getProductionCosmetic(consumableConsumption.consumableId).name} supply has run out.`
      );
      return;
    }

    // Display the decorated copy while keeping the undecorated copy separate,
    // matching production's cosmetic-only accessory boundary.
    submittedDrawingBytes.set(
      id,
      Buffer.from(
        draft.imageDataUrl.slice('data:image/png;base64,'.length),
        'base64'
      )
    );
    const scribbit = createScribbit({
      id,
      draft,
      artist: 'mock_player',
      imageUrl: `/api/drawing/${id}`,
      day: memory.dayNumber,
      drawingThemeId: selectCommunityDoodleDare(
        memory.dayNumber,
        `mock-player:${previewMode}`,
        memory.communityThemeDrawCountByPreviewMode[previewMode] ?? 0
      ).id,
    });
    scribbit.gearRanks = Object.fromEntries(
      scribbit.accessories.map((gearId) => [
        gearId,
        inventoryBeforeSubmission.gear[gearId]?.rank ?? 1,
      ])
    );

    economy.inventory = consumableConsumption.inventory;
    memory.myScribbits.unshift(scribbit);
    submittedScribbitPreviewModes.set(id, previewMode);
    memory.createdScribbitPreviewModes.add(previewMode);
    memory.communityThemeDrawCountByPreviewMode[previewMode] =
      (memory.communityThemeDrawCountByPreviewMode[previewMode] ?? 0) + 1;
    const enteredRumble = !hasEnteredTodayForPreview(previewMode);
    if (enteredRumble) memory.todayEntrants.push(scribbit);
    memory.drawChargesByPreviewMode[previewMode] = {
      available: drawCharges.available - 1,
      capacity: drawCharges.capacity,
      nextRefreshAt:
        drawCharges.nextRefreshAt ?? Date.now() + 8 * 60 * 60 * 1_000,
    };
    if (previewMode === 'returning') {
      memory.drawnToday = true;
      memory.enteredToday = true;
    }
    economy.ink += INK_REWARDS.dailyDraw;
    const powerUpOffer = getOrCreateMockBirthPowerUpOffer(economy, scribbit);
    sendJson(response, 201, {
      scribbit: cloneScribbit(scribbit),
      drawCharges: memory.drawChargesByPreviewMode[previewMode],
      enteredRumble,
      powerUpOffer,
    });
    return;
  }

  sendError(response, 404, `No mock endpoint for ${method} ${path}`);
};

const contentTypeFor = (filePath) => {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
};

const reloadScript = `
<script>
(() => {
  const events = new EventSource('/__mock-reload');
  events.onmessage = (event) => {
    if (event.data === 'reload') window.location.reload();
  };
})();
</script>`;

const sendHtmlFile = async (response, filePath) => {
  let html = await readFile(filePath, 'utf8');
  if (autoReload) {
    html = html.includes('</body>')
      ? html.replace('</body>', `${reloadScript}</body>`)
      : `${html}${reloadScript}`;
  }

  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(html);
};

const serveStatic = async (request, response, url) => {
  const requestedPath = url.pathname === '/' ? '/game.html' : url.pathname;
  const relativePath = normalize(decodeURIComponent(requestedPath)).replace(
    /^(\.\.[/\\])+/,
    ''
  );
  const filePath = join(clientRoot, relativePath);

  if (!filePath.startsWith(clientRoot) || !existsSync(filePath)) {
    const fallbackPath = join(clientRoot, 'game.html');
    if (existsSync(fallbackPath)) {
      await sendHtmlFile(response, fallbackPath);
      return;
    }
    sendError(
      response,
      404,
      'dist/client is missing. Run pnpm run build before pnpm run mock.'
    );
    return;
  }

  if (extname(filePath) === '.html') {
    await sendHtmlFile(response, filePath);
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Cache-Control': 'no-store',
  });
  response.end(await readFile(filePath));
};

const reloadClients = new Set();
let reloadTimer = null;

const sendReload = () => {
  reloadTimer = null;
  for (const response of reloadClients) {
    response.write('data: reload\n\n');
  }
};

const resetFreshPreview = () => {
  const submittedIds = new Set(
    memory.myScribbits
      .filter(
        (scribbit) => submittedScribbitPreviewModes.get(scribbit.id) === 'fresh'
      )
      .map((scribbit) => scribbit.id)
  );
  for (const list of [memory.myScribbits, memory.todayEntrants]) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (submittedIds.has(list[index]?.id)) list.splice(index, 1);
    }
  }
  memory.myBattles = memory.myBattles.filter(
    (report) => !submittedIds.has(report.a.id) && !submittedIds.has(report.b.id)
  );
  for (const scribbitId of submittedIds)
    submittedDrawingBytes.delete(scribbitId);
  for (const scribbitId of submittedIds)
    submittedScribbitPreviewModes.delete(scribbitId);
  memory.drawnToday = false;
  memory.communityThemeDrawCountByPreviewMode.fresh = 0;
  memory.enteredToday = false;
  clearFreeDrawingForPreview('fresh');
  memory.bossChallengedToday = false;
  memory.createdScribbitPreviewModes.delete('fresh');
  memory.completedBattlePreviewModes.delete('fresh');
  setBackedScribbitIdForPreview('fresh', null);
  memory.freshLegacySeenThroughDay = 0;
  memory.hiddenScribbitIds.clear();
  memory.reportCounts.clear();
  memory.founderChronicleByPreviewMode.fresh = createEmptyFounderChronicle();
  resetPreviewEconomy(memory.economyByPreviewMode.fresh);
};

if (autoReload && existsSync(clientRoot)) {
  try {
    watch(clientRoot, { recursive: true }, () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(sendReload, 250);
    });
  } catch (error) {
    console.warn(`Mock auto reload disabled: ${error.message}`);
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);

    if (
      request.method === 'GET' &&
      url.pathname === '/' &&
      previewModeFromUrl(url) === 'fresh'
    ) {
      resetFreshPreview();
    }

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    if (url.pathname === '/__mock-reload') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      response.write('retry: 1000\n\n');
      reloadClients.add(response);
      request.on('close', () => reloadClients.delete(response));
      return;
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/__mock/draw-automation'
    ) {
      sendJson(response, 200, { enabled: true });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/__mock/reset-fresh') {
      resetFreshPreview();
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    // Founding routes deliberately fall through to generated stat-shaped mascot
    // art, matching the production content contract without bundled bitmaps.
    if (url.pathname.startsWith('/creatures/')) {
      sendError(response, 404, 'creature art not found');
      return;
    }

    await serveStatic(request, response, url);
  } catch (error) {
    console.error('Mock server failed:', error);
    sendError(response, 500, 'Mock server failed.');
  }
});

const shutDownServer = () => {
  for (const response of reloadClients) response.end();
  reloadClients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1_500).unref();
};

process.once('SIGTERM', shutDownServer);
process.once('SIGINT', shutDownServer);

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  const listeningPort =
    address && typeof address === 'object' ? address.port : port;
  console.log(
    `Scribbits mock server running at http://localhost:${listeningPort}`
  );
  if (autoReload) {
    console.log('Auto reload watching dist/client.');
  }
});
