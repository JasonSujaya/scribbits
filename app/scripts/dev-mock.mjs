#!/usr/bin/env node

import { createServer } from 'node:http';
import { existsSync, readFileSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 8902);
const autoReload = process.env.MOCK_AUTO_RELOAD !== '0';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = join(repoRoot, 'dist', 'client');
const mockAssetRoot = join(repoRoot, 'dist', 'mock-assets');
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5l6wAAAABJRU5ErkJggg==',
  'base64'
);

// Real, NON-SQUARE drawing PNGs so the harness reproduces production textures
// (portrait/landscape network PNGs) instead of the old 1x1 transparent stub.
// Rotated by a stable hash of the requested id so every scribbit is consistent.
const mockDrawingFiles = ['drawing-tall.png', 'drawing-wide.png', 'drawing-square.png'];
const submittedDrawingBytes = new Map();
const hashId = (id) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) & 0x7fffffff;
  }
  return hash;
};
const drawingBytesFor = (id) => {
  const submittedDrawing = submittedDrawingBytes.get(id);
  if (submittedDrawing) return submittedDrawing;

  const name = mockDrawingFiles[hashId(id) % mockDrawingFiles.length];
  const filePath = join(mockAssetRoot, name);
  return existsSync(filePath) ? readFileSync(filePath) : transparentPng;
};

const elements = ['ember', 'tide', 'moss', 'storm'];
const careActions = ['feed', 'pat', 'train'];
const statKeys = ['chonk', 'spike', 'zip', 'charm'];
const fallbackStats = { chonk: 25, spike: 25, zip: 25, charm: 25 };
const levelThresholds = [0, 3, 7, 12, 18];
const capsuleCost = 10;
const capsuleFirstDailyCost = 5;
const maximumLegendsPageSize = 50;
const maxAccessoriesPerScribbit = 2;
const accessoryCatalogIds = [
  'bowtie',
  'flower-crown',
  'monocle',
  'beanie',
  'round-glasses',
  'tiny-sword',
  'snail-shell-backpack',
  'party-hat',
  'mustache',
  'top-hat',
  'cape',
  'headphones',
  'eyepatch-scar',
  'propeller-cap',
  'golden-crown',
  'dragon-wings',
];
const accessoryCatalogIdSet = new Set(accessoryCatalogIds);
const rareAccessoryIds = new Set(['tiny-sword', 'top-hat', 'cape']);
const epicAccessoryIds = new Set(['golden-crown', 'dragon-wings']);

const displayNameForAccessory = (id) => {
  return id
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

const rarityForAccessory = (id) => {
  if (epicAccessoryIds.has(id)) return 'epic';
  if (rareAccessoryIds.has(id)) return 'rare';
  return 'common';
};

const accessoryCapsuleDrops = accessoryCatalogIds.map((id) => {
  return {
    rarity: rarityForAccessory(id),
    kind: 'accessory',
    id,
    name: displayNameForAccessory(id),
    description: `A one-use ${displayNameForAccessory(id)} accessory for your next Scribbit.`,
  };
});

const mockCapsuleDrops = [
  ...accessoryCapsuleDrops,
  {
    rarity: 'common',
    kind: 'pen',
    id: 'warm-greys',
    name: 'Warm Greys',
    description: 'Soft sketchbook greys for cozy little smudges.',
  },
  {
    rarity: 'rare',
    kind: 'pen',
    id: 'gold-pen',
    name: 'Gold Pen',
    description: 'A shiny flex for lines that expect applause.',
  },
  {
    rarity: 'common',
    kind: 'title',
    id: 'inkslinger',
    name: 'Inkslinger',
    description: 'For artists who draw first and explain the stain later.',
  },
  {
    rarity: 'epic',
    kind: 'pen',
    id: 'rainbow-crayon',
    name: 'RAINBOW CRAYON',
    description: 'Draws hue-cycling strokes like a parade got sharpened.',
  },
];

const nextUtcMidnightMs = () => {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
};

const levelForXp = (xp) => {
  let level = 1;
  for (let index = 0; index < levelThresholds.length; index += 1) {
    if (xp >= levelThresholds[index]) {
      level = index + 1;
    }
  }
  return Math.min(5, level);
};

const moodFromCare = (careDoneToday) => {
  if (careDoneToday.length <= 0) return 'hungry';
  if (careDoneToday.length === 1) return 'sleepy';
  if (careDoneToday.length === 2) return 'happy';
  return 'pumped';
};

const readSubmittedStats = (body) => {
  const stats = body?.stats;
  if (!stats || typeof stats !== 'object') return { ...fallbackStats };

  const next = {};
  for (const key of statKeys) {
    const value = Number(stats[key]);
    if (!Number.isFinite(value)) return { ...fallbackStats };
    next[key] = Math.max(10, Math.min(55, Math.round(value)));
  }
  return next;
};

const readSubmittedElement = (body) => {
  return elements.includes(body?.element) ? body.element : 'ember';
};

const cloneScribbit = (scribbit) => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...(scribbit.accessories ?? [])],
    careDoneToday: [...scribbit.careDoneToday],
  };
};

const makeScribbit = (options) => {
  // Founding scribbits point at /creatures/*.png (the asset job that never
  // shipped) exactly like the real server, so the client's doodle fallback is
  // exercised. Everyone else uses the working /api/drawing/{id} network route.
  const defaultImageUrl = options.isFounding
    ? `/creatures/creature-${String(options.id).replace(/^founding-/, '')}.png`
    : `/api/drawing/${options.id}`;
  return {
    id: options.id,
    name: options.name,
    artist: options.artist,
    element: options.element,
    stats: options.stats,
    imageUrl: options.imageUrl ?? defaultImageUrl,
    bornDay: options.bornDay ?? 8,
    expiresDay: options.expiresDay ?? 11,
    belief: options.belief ?? 0,
    wins: options.wins ?? 0,
    losses: options.losses ?? 0,
    status: options.status ?? 'alive',
    legendTitle: options.legendTitle ?? null,
    isFounding: options.isFounding ?? false,
    accessories: options.accessories ? [...options.accessories] : [],
    level: options.level ?? levelForXp(options.xp ?? 0),
    xp: options.xp ?? 0,
    mood: options.mood ?? 'hungry',
    careDoneToday: options.careDoneToday ? [...options.careDoneToday] : [],
  };
};

const makeForecast = (day) => {
  return {
    day,
    boostedElement: 'storm',
    nerfedElement: 'moss',
    blurb: 'Storm winds whip loose paper across the arena',
  };
};

let battleCounter = 0;

const createBattleReport = (kind, fighterA, fighterB) => {
  battleCounter += 1;
  const day = memory.dayNumber;
  const winner = battleCounter % 2 === 0 ? 'a' : 'b';
  let hpA = 120 + fighterA.stats.chonk * 2;
  let hpB = 120 + fighterB.stats.chonk * 2;
  const events = [
    {
      type: 'intro',
      actor: 'a',
      move: null,
      damage: null,
      hpA,
      hpB,
      text: `${fighterA.name} and ${fighterB.name} tumble into the arena.`,
    },
    {
      type: 'weather',
      actor: 'a',
      move: null,
      damage: null,
      hpA,
      hpB,
      text: memory.forecast.blurb,
    },
  ];

  for (let index = 0; index < 9; index += 1) {
    const actor = index % 2 === 0 ? 'a' : 'b';
    const damage = 10 + ((battleCounter + index) % 9);
    const move = actor === 'a' ? 'Marker Mash' : 'Sticker Slam';
    events.push({
      type: 'move',
      actor,
      move,
      damage: null,
      hpA,
      hpB,
      text:
        actor === 'a'
          ? `${fighterA.name} winds up ${move}.`
          : `${fighterB.name} winds up ${move}.`,
    });
    if (actor === 'a') {
      hpB = Math.max(winner === 'a' && index === 8 ? 0 : 1, hpB - damage);
    } else {
      hpA = Math.max(winner === 'b' && index === 7 ? 0 : 1, hpA - damage);
    }
    events.push({
      type: index % 4 === 0 ? 'crit' : 'hit',
      actor,
      move,
      damage,
      hpA,
      hpB,
      text:
        actor === 'a'
          ? `${fighterA.name} lands Marker Mash for ${damage}.`
          : `${fighterB.name} lands Sticker Slam for ${damage}.`,
    });
  }

  if (winner === 'a') {
    hpB = 0;
  } else {
    hpA = 0;
  }

  events.push({
    type: 'faint',
    actor: winner === 'a' ? 'b' : 'a',
    move: null,
    damage: null,
    hpA,
    hpB,
    text:
      winner === 'a'
        ? `${fighterB.name} flops into a dramatic doodle pile.`
        : `${fighterA.name} flops into a dramatic doodle pile.`,
  });

  return {
    id: `mock-battle-${kind}-${Date.now()}-${battleCounter}`,
    kind,
    day,
    a: cloneScribbit(fighterA),
    b: cloneScribbit(fighterB),
    winner,
    events,
  };
};

const myScribbits = [
  makeScribbit({
    id: 'mine-paper-spark',
    name: 'Paper Spark',
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
    mood: 'pumped',
    careDoneToday: ['feed', 'pat', 'train'],
    accessories: ['bowtie', 'tiny-sword'],
  }),
  makeScribbit({
    id: 'mine-moss-bun',
    name: 'Moss Bun',
    artist: 'mock_player',
    element: 'moss',
    stats: { chonk: 42, spike: 16, zip: 18, charm: 24 },
    bornDay: 7,
    expiresDay: 10,
    belief: 2,
    wins: 1,
    losses: 2,
    level: 2,
    xp: 4,
    mood: 'happy',
    careDoneToday: ['feed', 'pat'],
    accessories: ['round-glasses'],
  }),
  makeScribbit({
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
    level: 1,
    xp: 1,
    mood: 'sleepy',
    careDoneToday: ['pat'],
  }),
];

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
    mood: 'happy',
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
    mood: 'hungry',
  }),
  makeScribbit({
    id: 'community-rootwink',
    name: 'Rootwink',
    artist: 'paper_ren',
    element: 'moss',
    stats: { chonk: 32, spike: 20, zip: 18, charm: 30 },
    belief: 17,
    wins: 5,
    losses: 1,
    level: 4,
    xp: 13,
    mood: 'pumped',
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
    mood: 'sleepy',
  }),
  makeScribbit({
    id: 'founding-coalimp',
    name: 'Coalimp',
    artist: 'pastel_vin',
    element: 'ember',
    stats: { chonk: 18, spike: 38, zip: 28, charm: 16 },
    belief: 3,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 1,
    xp: 0,
    mood: 'sleepy',
  }),
  makeScribbit({
    id: 'founding-kelpkit',
    name: 'Kelpkit',
    artist: 'pixel_mara',
    element: 'tide',
    stats: { chonk: 24, spike: 18, zip: 32, charm: 26 },
    belief: 5,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 2,
    xp: 3,
    mood: 'pumped',
  }),
  makeScribbit({
    id: 'founding-barkbloom',
    name: 'Barkbloom',
    artist: 'marker_jules',
    element: 'moss',
    stats: { chonk: 48, spike: 16, zip: 12, charm: 24 },
    belief: 2,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 3,
    xp: 7,
    mood: 'hungry',
  }),
  makeScribbit({
    id: 'founding-cloudpip',
    name: 'Cloudpip',
    artist: 'paperclip_noa',
    element: 'storm',
    stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
    belief: 8,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 1,
    xp: 0,
    mood: 'happy',
  }),
];

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
  mood: 'happy',
  accessories: ['golden-crown', 'dragon-wings'],
});

const legends = [
  champion,
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

const myFaded = [
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
    level: 2,
    xp: 4,
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
    level: 2,
    xp: 5,
  }),
];

const memory = {
  dayNumber: 9,
  forecast: makeForecast(9),
  champion,
  myScribbits,
  todayEntrants,
  legends,
  myFaded,
  drawnToday: false,
  enteredToday: false,
  myBackedScribbitId: null,
  playStreakDays: 4,
  myClout: 14,
  myInk: 35,
  inventory: {
    items: {
      'golden-crown': 2,
      'tiny-sword': 1,
      'party-hat': 3,
      cape: 1,
      'round-glasses': 1,
      'dragon-wings': 1,
      beanie: 2,
      'eyepatch-scar': 1,
    },
    pens: ['warm-greys', 'gold-pen', 'rainbow-crayon', 'midnight-ink'],
    titles: ['doodler'],
  },
  capsulePullCount: 0,
  discountedCapsuleUtcDate: null,
  capsuleOperations: new Map(),
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
};

for (let index = 0; index < 10; index += 1) {
  const fighterA = myScribbits[index % myScribbits.length];
  const fighterB = todayEntrants[index % todayEntrants.length];
  memory.myBattles.push(createBattleReport('exhibition', fighterA, fighterB));
}

const visibleLists = () => [
  memory.myScribbits,
  memory.todayEntrants,
  memory.legends,
  memory.myFaded,
  [memory.champion],
];

const findVisibleScribbit = (scribbitId) => {
  for (const list of visibleLists()) {
    const scribbit = list.find((entry) => entry.id === scribbitId);
    if (scribbit) return scribbit;
  }
  return undefined;
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
  sendJson(response, status, { status: 'error', message });
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

const currentUtcDateKey = () => {
  return new Date().toISOString().slice(0, 10);
};

const capsuleCostForCurrentPull = () => {
  const utcDateKey = currentUtcDateKey();
  const isFirstDailyPull = memory.discountedCapsuleUtcDate !== utcDateKey;

  return {
    cost: isFirstDailyPull ? capsuleFirstDailyCost : capsuleCost,
    utcDateKey,
  };
};

const countAccessoryIds = (accessoryIds) => {
  const counts = {};

  for (const accessoryId of accessoryIds) {
    counts[accessoryId] = (counts[accessoryId] ?? 0) + 1;
  }

  return counts;
};

const addCapsuleDropToInventory = (drop) => {
  if (drop.kind === 'accessory') {
    const previousCount = memory.inventory.items[drop.id] ?? 0;
    const ownedCount = previousCount + 1;
    memory.inventory.items[drop.id] = ownedCount;

    return {
      isNew: previousCount === 0,
      ownedCount,
    };
  }

  const inventoryList =
    drop.kind === 'pen' ? memory.inventory.pens : memory.inventory.titles;
  const isNew = !inventoryList.includes(drop.id);

  if (isNew) {
    inventoryList.push(drop.id);
  }

  return {
    isNew,
    ownedCount: 1,
  };
};

const consumeInventoryItems = (requiredCounts) => {
  for (const [accessoryId, requiredCount] of Object.entries(requiredCounts)) {
    const nextCount = (memory.inventory.items[accessoryId] ?? 0) - requiredCount;

    if (nextCount > 0) {
      memory.inventory.items[accessoryId] = nextCount;
    } else {
      delete memory.inventory.items[accessoryId];
    }
  }
};

const readSubmittedAccessoryIds = (body) => {
  if (body?.accessories === undefined) {
    return { accessoryIds: [] };
  }

  if (!Array.isArray(body.accessories)) {
    return {
      status: 400,
      message: 'Accessories must be submitted as an array.',
    };
  }

  if (body.accessories.length > maxAccessoriesPerScribbit) {
    return {
      status: 400,
      message: `Attach up to ${maxAccessoriesPerScribbit} accessories.`,
    };
  }

  const accessoryIds = [];

  for (const accessory of body.accessories) {
    const accessoryId =
      typeof accessory?.id === 'string' ? accessory.id.trim() : '';

    if (!accessoryCatalogIdSet.has(accessoryId)) {
      return {
        status: 400,
        message: 'Choose valid Mystery Ink accessories.',
      };
    }

    accessoryIds.push(accessoryId);
  }

  const requiredCounts = countAccessoryIds(accessoryIds);

  for (const [accessoryId, requiredCount] of Object.entries(requiredCounts)) {
    if ((memory.inventory.items[accessoryId] ?? 0) < requiredCount) {
      return {
        status: 409,
        message: `You need ${requiredCount} ${displayNameForAccessory(accessoryId)} accessory copy.`,
      };
    }
  }

  return { accessoryIds, requiredCounts };
};

const arenaState = () => {
  return {
    dayNumber: memory.dayNumber,
    loggedIn: true,
    myUsername: 'mock_player',
    forecast: memory.forecast,
    champion: memory.hiddenScribbitIds.has(memory.champion.id)
      ? null
      : cloneScribbit(memory.champion),
    myScribbits: memory.myScribbits.map(cloneScribbit),
    drawnToday: memory.drawnToday,
    enteredToday: memory.enteredToday,
    rumbleEntrants: memory.todayEntrants.length,
    communityLegendCount: memory.legends.length,
    rumbleResolvesAt: nextUtcMidnightMs(),
    todayEntrants: memory.todayEntrants
      .filter((scribbit) => !memory.hiddenScribbitIds.has(scribbit.id))
      .map(cloneScribbit),
    myBackedScribbitId: memory.myBackedScribbitId,
    playStreakDays: memory.playStreakDays,
    myClout: memory.myClout,
    myInk: memory.myInk,
    myPens: [...memory.inventory.pens],
    nextCapsuleCost: capsuleCostForCurrentPull().cost,
    lastRumbleReceipt: {
      resolvedDay: memory.dayNumber - 1,
      backedName: 'Inky Moon',
      championName: memory.champion.name,
      cloutEarned: 0,
      inkAwarded: 0,
    },
  };
};

const isFreshPlayerPreview = (request) => {
  const referrer = request.headers.referer;
  if (typeof referrer !== 'string') return false;

  try {
    return new URL(referrer).searchParams.has('fresh');
  } catch {
    return false;
  }
};

const freshPlayerArenaState = () => {
  const submittedScribbits = memory.myScribbits.filter((scribbit) =>
    scribbit.id.startsWith('mock-submitted-')
  );
  const submittedScribbitIds = new Set(
    submittedScribbits.map((scribbit) => scribbit.id)
  );
  const enteredToday = memory.todayEntrants.some((scribbit) =>
    submittedScribbitIds.has(scribbit.id)
  );

  return {
    ...arenaState(),
    myScribbits: submittedScribbits.map(cloneScribbit),
    drawnToday: submittedScribbits.length > 0,
    enteredToday,
    myBackedScribbitId: memory.myBackedScribbitId,
    playStreakDays: 1,
    myClout: 0,
    myInk: submittedScribbits.length * 2,
    myPens: [],
    lastRumbleReceipt: null,
  };
};

const inventoryState = () => {
  return {
    items: cloneItemCounts(memory.inventory.items),
    pens: [...memory.inventory.pens],
    titles: [...memory.inventory.titles],
  };
};

const handleApi = async (request, response, url) => {
  const method = request.method ?? 'GET';
  const path = url.pathname;

  if (method === 'GET' && path === '/api/arena') {
    sendJson(
      response,
      200,
      isFreshPlayerPreview(request) ? freshPlayerArenaState() : arenaState()
    );
    return;
  }

  if (method === 'GET' && path === '/api/splash') {
    const state = isFreshPlayerPreview(request) ? freshPlayerArenaState() : arenaState();
    sendJson(response, 200, {
      loggedIn: state.loggedIn,
      resolving: false,
      forecast: state.forecast,
      rumbleEntrants: state.rumbleEntrants,
      rumbleResolvesAt: state.rumbleResolvesAt,
      drawnToday: state.drawnToday,
      backedToday: state.myBackedScribbitId !== null,
      playStreakDays: state.playStreakDays,
    });
    return;
  }

  if (method === 'GET' && path === '/api/inventory') {
    sendJson(response, 200, inventoryState());
    return;
  }

  if (method === 'POST' && path === '/api/capsule') {
    const body = await readJsonBody(request);
    const operationId = typeof body?.operationId === 'string'
      ? body.operationId.trim()
      : '';
    if (!operationId) {
      sendError(response, 400, 'Open the capsule with a valid operation id.');
      return;
    }
    const cachedOperation = memory.capsuleOperations.get(operationId);
    if (cachedOperation) {
      sendJson(response, 200, cachedOperation);
      return;
    }
    const { cost, utcDateKey } = capsuleCostForCurrentPull();

    if (memory.myInk < cost) {
      sendError(
        response,
        402,
        `You need ${cost} Mystery Ink to open a capsule.`
      );
      return;
    }

    const drop =
      mockCapsuleDrops[memory.capsulePullCount % mockCapsuleDrops.length];

    if (!drop) {
      sendError(response, 500, 'The capsule machine jammed. Try again soon.');
      return;
    }

    memory.capsulePullCount += 1;
    memory.discountedCapsuleUtcDate = utcDateKey;
    memory.myInk -= cost;
    const pullInventoryState = addCapsuleDropToInventory(drop);

    const capsuleResponse = {
      pull: {
        ...drop,
        ...pullInventoryState,
      },
      ink: memory.myInk,
      inventory: inventoryState(),
      nextCost: capsuleCost,
    };
    memory.capsuleOperations.set(operationId, capsuleResponse);
    sendJson(response, 200, capsuleResponse);
    return;
  }

  if (method === 'GET' && path === '/api/my-battles') {
    sendJson(
      response,
      200,
      memory.myBattles
        .filter(
          (report) =>
            !memory.hiddenScribbitIds.has(report.a.id) &&
            !memory.hiddenScribbitIds.has(report.b.id)
        )
        .map((report) => ({ ...report }))
    );
    return;
  }

  if (method === 'GET' && path === '/api/legends') {
    const readPageNumber = (value, fallback, maximum) => {
      if (value === null) return fallback;
      if (!/^(0|[1-9][0-9]*)$/.test(value)) return undefined;
      const parsedValue = Number(value);
      if (!Number.isSafeInteger(parsedValue)) return undefined;
      return maximum === undefined
        ? parsedValue
        : Math.min(parsedValue, maximum);
    };
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
      sendError(response, 400, 'Use a valid Legends cursor and a positive page size.');
      return;
    }

    const pageLegends = [];
    let nextCursor = null;
    for (let index = cursorOffset; index < memory.legends.length; index += 1) {
      const scribbit = memory.legends[index];
      if (!scribbit || memory.hiddenScribbitIds.has(scribbit.id)) continue;
      if (pageLegends.length === requestedLimit) {
        nextCursor = String(index);
        break;
      }
      pageLegends.push(cloneScribbit(scribbit));
    }

    sendJson(response, 200, {
      legends: pageLegends,
      nextCursor,
      myFaded: memory.myFaded.map(cloneScribbit),
    });
    return;
  }

  if (method === 'GET' && path === '/api/clout-board') {
    sendJson(response, 200, memory.cloutBoard);
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

  if (method === 'POST' && path === '/api/care') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const action = typeof body?.action === 'string' ? body.action : '';
    const scribbit = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!scribbit || !careActions.includes(action)) {
      sendError(response, 400, 'Choose a valid Scribbit and care action.');
      return;
    }

    if (scribbit.careDoneToday.includes(action)) {
      sendError(response, 409, 'You already used that care action today.');
      return;
    }

    scribbit.careDoneToday.push(action);
    scribbit.mood = moodFromCare(scribbit.careDoneToday);
    scribbit.xp += scribbit.mood === 'pumped' ? 2 : 1;
    scribbit.level = levelForXp(scribbit.xp);
    sendJson(response, 200, cloneScribbit(scribbit));
    return;
  }

  if (method === 'POST' && path === '/api/back') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);

    if (!memory.todayEntrants.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, 'Back one of tonight\'s Rumble entrants.');
      return;
    }

    if (memory.myScribbits.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, 'Back another Redditor\'s Scribbit, not your own.');
      return;
    }

    if (memory.myBackedScribbitId) {
      sendError(response, 409, 'You already backed a Scribbit today.');
      return;
    }

    memory.myBackedScribbitId = scribbitId;
    sendJson(response, 200, { backed: scribbitId });
    return;
  }

  if (method === 'POST' && path === '/api/remove-scribbit') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!scribbit || scribbit.isFounding) {
      sendError(response, 404, 'That Scribbit is not yours to remove.');
      return;
    }

    for (const list of [memory.myScribbits, memory.todayEntrants, memory.legends, memory.myFaded]) {
      const index = list.findIndex((entry) => entry.id === scribbitId);
      if (index >= 0) list.splice(index, 1);
    }
    memory.myBattles = memory.myBattles.filter(
      (report) => report.a.id !== scribbitId && report.b.id !== scribbitId
    );
    submittedDrawingBytes.delete(scribbitId);
    sendJson(response, 200, { removed: scribbitId });
    return;
  }

  if (method === 'POST' && path === '/api/report-scribbit') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = findVisibleScribbit(scribbitId);

    if (!scribbit || scribbit.isFounding) {
      sendError(response, 404, 'That community Scribbit is no longer available.');
      return;
    }
    if (memory.myScribbits.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, 'Remove your own Scribbit instead of reporting it.');
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
    const removedScribbits = memory.myScribbits.filter(
      (scribbit) => !scribbit.isFounding
    ).length;
    const ownedIds = new Set(memory.myScribbits.map((scribbit) => scribbit.id));
    memory.myScribbits.splice(0, memory.myScribbits.length);
    for (let index = memory.todayEntrants.length - 1; index >= 0; index -= 1) {
      if (ownedIds.has(memory.todayEntrants[index]?.id)) {
        memory.todayEntrants.splice(index, 1);
      }
    }
    memory.myBattles = memory.myBattles.filter(
      (report) => !ownedIds.has(report.a.id) && !ownedIds.has(report.b.id)
    );
    memory.myBackedScribbitId = null;
    memory.myClout = 0;
    memory.myInk = 0;
    memory.playStreakDays = 0;
    memory.hiddenScribbitIds.clear();
    sendJson(response, 200, { deleted: true, removedScribbits });
    return;
  }

  if (method === 'POST' && path === '/api/believe') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = findVisibleScribbit(scribbitId);

    if (!scribbit) {
      sendError(response, 404, 'That Scribbit cannot collect belief right now.');
      return;
    }

    if (scribbit.artist === 'mock_player') {
      sendError(response, 400, 'believe in someone else\'s doodle');
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

  if (method === 'POST' && path === '/api/spar') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to spar.');
      return;
    }

    const opponent =
      memory.todayEntrants.find((entry) => entry.artist !== 'mock_player') ??
      memory.todayEntrants[0];
    const report = createBattleReport('exhibition', challenger, opponent);
    memory.myBattles.unshift(report);
    sendJson(response, 200, report);
    return;
  }

  if (method === 'POST' && path === '/api/boss-challenge') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to fight.');
      return;
    }

    const report = createBattleReport('boss', challenger, memory.champion);
    memory.myBattles.unshift(report);
    sendJson(response, 200, report);
    return;
  }

  if (method === 'POST' && path === '/api/enter-rumble') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!scribbit) {
      sendError(response, 404, 'That living Scribbit is not in your sketchbook.');
      return;
    }

    if (memory.enteredToday) {
      sendError(response, 409, 'You already entered today\'s Rumble.');
      return;
    }

    memory.enteredToday = true;
    if (!memory.todayEntrants.some((entry) => entry.id === scribbit.id)) {
      memory.todayEntrants.push(scribbit);
    }
    sendJson(response, 200, { entered: true });
    return;
  }

  if (method === 'POST' && path === '/api/scribbit') {
    const body = await readJsonBody(request);
    const name =
      typeof body?.name === 'string' && body.name.trim().length >= 2
        ? body.name.trim().slice(0, 24)
        : 'Fresh Scribbit';
    const submittedAccessories = readSubmittedAccessoryIds(body);

    if (submittedAccessories.message) {
      sendError(response, submittedAccessories.status, submittedAccessories.message);
      return;
    }

    const id = `mock-submitted-${Date.now()}`;
    if (
      typeof body?.imageDataUrl === 'string' &&
      body.imageDataUrl.startsWith('data:image/png;base64,')
    ) {
      submittedDrawingBytes.set(
        id,
        Buffer.from(body.imageDataUrl.slice('data:image/png;base64,'.length), 'base64')
      );
    }
    const scribbit = makeScribbit({
      id,
      name,
      artist: 'mock_player',
      element: readSubmittedElement(body),
      stats: readSubmittedStats(body),
      bornDay: memory.dayNumber,
      expiresDay: memory.dayNumber + 3,
      belief: 0,
      level: 1,
      xp: 0,
      mood: 'hungry',
      accessories: submittedAccessories.accessoryIds,
    });

    consumeInventoryItems(submittedAccessories.requiredCounts ?? {});
    memory.myScribbits.unshift(scribbit);
    memory.todayEntrants.push(scribbit);
    memory.drawnToday = true;
    memory.enteredToday = true;
    sendJson(response, 201, cloneScribbit(scribbit));
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
      'dist/client is missing. Run npm run build before npm run mock.'
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
      .filter((scribbit) => scribbit.id.startsWith('mock-submitted-'))
      .map((scribbit) => scribbit.id)
  );
  for (const list of [memory.myScribbits, memory.todayEntrants]) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (submittedIds.has(list[index]?.id)) list.splice(index, 1);
    }
  }
  memory.myBattles = memory.myBattles.filter(
    (report) =>
      !submittedIds.has(report.a.id) && !submittedIds.has(report.b.id)
  );
  for (const scribbitId of submittedIds) submittedDrawingBytes.delete(scribbitId);
  memory.drawnToday = false;
  memory.enteredToday = false;
  memory.myBackedScribbitId = null;
  memory.hiddenScribbitIds.clear();
  memory.reportCounts.clear();
  memory.capsuleOperations.clear();
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
      url.searchParams.has('fresh')
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

    // Production reality: the founding-art asset job was cancelled, so every
    // /creatures/*.png 404s. Reproduce that so the client fallback is exercised.
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

server.listen(port, '127.0.0.1', () => {
  console.log(`Scribbits mock server running at http://localhost:${port}`);
  if (autoReload) {
    console.log('Auto reload watching dist/client.');
  }
});
