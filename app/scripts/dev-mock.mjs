#!/usr/bin/env node

import { createServer } from 'node:http';
import { existsSync, readFileSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const port = Number(process.env.PORT ?? 8902);
const autoReload = process.env.MOCK_AUTO_RELOAD !== '0';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = join(repoRoot, 'dist', 'client');
const mockAssetRoot = join(repoRoot, 'dist', 'mock-assets');
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

const elements = ['ember', 'tide', 'moss', 'storm'];
const careActions = ['feed', 'pat', 'train'];
const statKeys = ['chonk', 'spike', 'zip', 'charm'];
const fallbackStats = { chonk: 25, spike: 25, zip: 25, charm: 25 };
const levelThresholds = [0, 3, 7, 12, 18];
const capsuleCost = 10;
const capsuleFirstDailyCost = 5;
const capsulePity = 10;
const careInkReward = 1;
const sparWinInkReward = 2;
const dailyDrawInkReward = 2;
const maximumLegendsPageSize = 50;
const maximumLegacyCardsPageSize = 24;
const legacyReturnPreviewLimit = 3;
const maxAccessoriesPerScribbit = 2;
const cosmeticsSourcePath = join(repoRoot, 'src', 'shared', 'cosmetics.ts');
const cosmeticsSource = readFileSync(cosmeticsSourcePath, 'utf8');
const cosmeticsJavascript = ts.transpileModule(cosmeticsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: cosmeticsSourcePath,
}).outputText;
const cosmeticsModuleUrl = `data:text/javascript;base64,${Buffer.from(
  cosmeticsJavascript,
  'utf8'
).toString('base64')}`;
const { COSMETIC_CATALOG: productionCosmeticCatalog } = await import(
  cosmeticsModuleUrl
);
const mockCapsuleDrops = productionCosmeticCatalog.map(
  ({ rarity, kind, id, name, description }) => ({
    rarity,
    kind,
    id,
    name,
    description,
  })
);
const accessoryCatalogIds = mockCapsuleDrops
  .filter((drop) => drop.kind === 'accessory')
  .map((drop) => drop.id);
const accessoryCatalogIdSet = new Set(accessoryCatalogIds);

const mockCapsuleCatalogIds = new Set(mockCapsuleDrops.map((drop) => drop.id));
const productionCosmeticById = new Map(
  mockCapsuleDrops.map((drop) => [drop.id, drop])
);
if (
  mockCapsuleDrops.length !== 28 ||
  mockCapsuleCatalogIds.size !== mockCapsuleDrops.length
) {
  throw new Error(
    'Mock capsule catalog must contain 28 unique production drops.'
  );
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

const cloneLegacySnapshot = (legacy) => {
  if (!legacy) return null;
  return {
    ...legacy,
    creatorTitle: legacy.creatorTitle ? { ...legacy.creatorTitle } : null,
    accessories: legacy.accessories.map((accessory) => ({ ...accessory })),
  };
};

const legacyFinishFor = (status, legendTitle) => {
  if (status === 'faded') return 'faded';
  return legendTitle?.startsWith('Champion of Day ') ? 'champion' : 'believed';
};

const makeImmutableLegacySnapshot = (scribbit, creatorTitleId = null) => {
  const accessories = Object.freeze(
    scribbit.accessories.map((accessoryId) =>
      snapshotCosmetic(accessoryId, 'accessory')
    )
  );
  const creatorTitle = creatorTitleId
    ? snapshotCosmetic(creatorTitleId, 'title')
    : null;

  return Object.freeze({
    schemaVersion: 1,
    archivedDay: scribbit.expiresDay,
    finish: legacyFinishFor(scribbit.status, scribbit.legendTitle),
    creatorTitle,
    level: levelForXp(scribbit.xp),
    xp: scribbit.xp,
    wins: scribbit.wins,
    losses: scribbit.losses,
    belief: scribbit.belief,
    accessories,
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
    legacy: cloneLegacySnapshot(scribbit.legacy),
  };
};

const makeScribbit = (options) => {
  // Founding scribbits point at /creatures/*.png (the asset job that never
  // shipped) exactly like the real server, so the client's doodle fallback is
  // exercised. Everyone else uses the working /api/drawing/{id} network route.
  const defaultImageUrl = options.isFounding
    ? `/creatures/creature-${String(options.id).replace(/^founding-/, '')}.png`
    : `/api/drawing/${options.id}`;
  const xp = Number.isFinite(options.xp)
    ? Math.max(0, Math.floor(options.xp))
    : 0;
  const status = options.status ?? 'alive';
  const scribbit = {
    id: options.id,
    name: options.name,
    artist: options.artist,
    element: options.element,
    stats: { ...options.stats },
    imageUrl: options.imageUrl ?? defaultImageUrl,
    bornDay: options.bornDay ?? 8,
    expiresDay: options.expiresDay ?? 11,
    belief: options.belief ?? 0,
    wins: options.wins ?? 0,
    losses: options.losses ?? 0,
    status,
    legendTitle: options.legendTitle ?? null,
    isFounding: options.isFounding ?? false,
    accessories: options.accessories ? [...options.accessories] : [],
    level: levelForXp(xp),
    xp,
    mood: options.mood ?? 'hungry',
    careDoneToday: options.careDoneToday ? [...options.careDoneToday] : [],
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

const makeForecast = (day) => {
  return {
    day,
    boostedElement: 'storm',
    nerfedElement: 'moss',
    blurb: 'Storm winds whip loose paper across the arena',
  };
};

let battleCounter = 0;

const combatPowerByStat = {
  chonk: 'inkquake',
  spike: 'nib_halo',
  zip: 'smearstep',
  charm: 'colorburst',
};

const combatPowerFor = (scribbit) => {
  let dominantStat = statKeys[0];
  for (const stat of statKeys) {
    if (scribbit.stats[stat] > scribbit.stats[dominantStat]) {
      dominantStat = stat;
    }
  }
  return combatPowerByStat[dominantStat];
};

const mockBattleMaximumHitPoints = (scribbit) => 170 + scribbit.stats.chonk;

const triangleWave = (tick, period, phase) => {
  const progress = ((tick + phase) % period) / period;
  return progress < 0.5 ? progress * 2 : 2 - progress * 2;
};

const mockArenaAtTick = (tick) => {
  const shrinkProgress = Math.max(0, Math.min(1, (tick - 280) / 100));
  return {
    halfWidth: Math.round(8000 + (6200 - 8000) * shrinkProgress),
    halfHeight: Math.round(5000 + (3800 - 5000) * shrinkProgress),
  };
};

const mockPositionAtTick = (slot, tick) => {
  const arena = mockArenaAtTick(tick);
  const phase = slot === 'a' ? 0 : 61;
  const xUnit = triangleWave(tick, 122, phase) * 2 - 1;
  const yUnit = triangleWave(tick, 174, phase + 37) * 2 - 1;
  return {
    x: Math.round(xUnit * (arena.halfWidth - 800)),
    y: Math.round(yUnit * (arena.halfHeight - 700)),
  };
};

const createMockSimulation = (kind, fighterA, fighterB, winner) => {
  const completedTick = 380;
  const fighters = [fighterA, fighterB];
  const powers = [combatPowerFor(fighterA), combatPowerFor(fighterB)];
  const maximumHitPoints = fighters.map(mockBattleMaximumHitPoints);
  const currentHitPoints = [...maximumHitPoints];
  const damageDealt = [0, 0];
  const plannedHits = [
    { tick: 58, source: 0, ratio: 0.13 },
    { tick: 96, source: 1, ratio: 0.14 },
    { tick: 136, source: 0, ratio: 0.16 },
    { tick: 176, source: 1, ratio: 0.17 },
    { tick: 216, source: 0, ratio: 0.18 },
    { tick: 256, source: 1, ratio: 0.16 },
    { tick: 296, source: winner === 'a' ? 0 : 1, ratio: 0.2 },
    { tick: 334, source: winner === 'a' ? 1 : 0, ratio: 0.1 },
    { tick: completedTick, source: winner === 'a' ? 0 : 1, ratio: 1 },
  ];
  const timeline = [
    {
      tick: 0,
      kind: 'battle_started',
      battleId: `mock-simulation-${kind}-${battleCounter}`,
    },
    {
      tick: 280,
      kind: 'arena_shrink_started',
      targetHalfWidth: 6200,
      targetHalfHeight: 3800,
    },
    {
      tick: 360,
      kind: 'late_fight_started',
      cooldownMultiplierPermille: 750,
      defenseTicks: 2,
    },
  ];
  fighters.forEach((fighter, index) => {
    if (fighter.element !== 'moss') return;
    const actor = index === 0 ? 'a' : 'b';
    timeline.push(
      { tick: 0, kind: 'barrier_created', actor, hitPoints: 18 },
      {
        tick: 130,
        kind: 'barrier_hit',
        actor,
        absorbedDamage: 18,
        remainingHitPoints: 0,
      },
      { tick: 130, kind: 'barrier_broken', actor }
    );
  });
  const resolvedHits = [];

  for (const [index, plannedHit] of plannedHits.entries()) {
    const sourceIndex = plannedHit.source;
    const targetIndex = sourceIndex === 0 ? 1 : 0;
    const sourceSlot = sourceIndex === 0 ? 'a' : 'b';
    const targetSlot = targetIndex === 0 ? 'a' : 'b';
    const abilityFinishedTick = Math.min(completedTick, plannedHit.tick + 20);
    const sourcePosition = mockPositionAtTick(sourceSlot, plannedHit.tick - 8);
    const targetPosition = mockPositionAtTick(targetSlot, plannedHit.tick - 8);
    const requestedDamage = Math.max(
      8,
      Math.round(maximumHitPoints[targetIndex] * plannedHit.ratio)
    );
    const damage =
      index === plannedHits.length - 1
        ? currentHitPoints[targetIndex]
        : Math.min(currentHitPoints[targetIndex] - 1, requestedDamage);
    currentHitPoints[targetIndex] = Math.max(
      index === plannedHits.length - 1 ? 0 : 1,
      currentHitPoints[targetIndex] - damage
    );
    damageDealt[sourceIndex] += damage;
    const aimDirection = {
      x: targetPosition.x - sourcePosition.x,
      y: targetPosition.y - sourcePosition.y,
    };
    timeline.push(
      {
        tick: plannedHit.tick - 10,
        kind: 'ability_telegraphed',
        actor: sourceSlot,
        power: powers[sourceIndex],
        activationNumber: index + 1,
        origin: sourcePosition,
        aimDirection,
        activatesAtTick: plannedHit.tick - 4,
      },
      {
        tick: plannedHit.tick - 4,
        kind: 'ability_activated',
        actor: sourceSlot,
        power: powers[sourceIndex],
        activationNumber: index + 1,
        activeUntilTick: abilityFinishedTick,
      }
    );
    if (powers[sourceIndex] === 'colorburst') {
      const echoFireTick = Math.min(completedTick, plannedHit.tick + 3);
      const echoPosition = {
        x: sourcePosition.x - 900,
        y: sourcePosition.y + 300,
      };
      timeline.push({
        tick: plannedHit.tick - 3,
        kind: 'echo_created',
        actor: sourceSlot,
        position: echoPosition,
        aimDirection,
        firesAtTick: echoFireTick,
      });
      timeline.push({
        tick: echoFireTick,
        kind: 'echo_fired',
        actor: sourceSlot,
        position: echoPosition,
        aimDirection,
      });
    }
    timeline.push({
      tick: plannedHit.tick,
      kind: 'damage',
      sourceFighter: sourceSlot,
      targetFighter: targetSlot,
      source: powers[sourceIndex],
      amount: damage,
      targetHitPoints: currentHitPoints[targetIndex],
      critical: index % 4 === 2,
      position: mockPositionAtTick(targetSlot, plannedHit.tick),
    });
    if (abilityFinishedTick < completedTick) {
      timeline.push({
        tick: abilityFinishedTick,
        kind: 'ability_finished',
        actor: sourceSlot,
        power: powers[sourceIndex],
        activationNumber: index + 1,
      });
    }
    resolvedHits.push({
      tick: plannedHit.tick,
      hitPoints: [...currentHitPoints],
    });
  }

  const loser = winner === 'a' ? 'b' : 'a';
  timeline.push(
    {
      tick: 300,
      kind: 'ink_pressure',
      actor: loser,
      refreshedImmediately: true,
    },
    { tick: completedTick, kind: 'fighter_defeated', actor: loser },
    { tick: completedTick, kind: 'battle_ended', winner, reason: 'knockout' }
  );
  timeline.sort((left, right) => left.tick - right.tick);

  const hitPointsAtTick = (tick) => {
    let values = [...maximumHitPoints];
    for (const resolvedHit of resolvedHits) {
      if (resolvedHit.tick > tick) break;
      values = [...resolvedHit.hitPoints];
    }
    return values;
  };
  const abilityPhaseAtTick = (slot, tick) => {
    const relevantHit = plannedHits.find((plannedHit) => {
      const sourceSlot = plannedHit.source === 0 ? 'a' : 'b';
      return (
        sourceSlot === slot &&
        tick >= plannedHit.tick - 10 &&
        tick <= Math.min(completedTick, plannedHit.tick + 20)
      );
    });
    if (!relevantHit) return 'cooldown';
    return tick < relevantHit.tick - 4 ? 'telegraph' : 'active';
  };
  const checkpoints = [];
  for (let tick = 0; tick <= completedTick; tick += 10) {
    const arena = mockArenaAtTick(tick);
    const hitPoints = hitPointsAtTick(tick);
    checkpoints.push({
      tick,
      arenaHalfWidth: arena.halfWidth,
      arenaHalfHeight: arena.halfHeight,
      fighters: ['a', 'b'].map((slot, index) => {
        const position = mockPositionAtTick(slot, tick);
        const nextPosition = mockPositionAtTick(
          slot,
          Math.min(completedTick, tick + 1)
        );
        const isCharmEchoVisible =
          powers[index] === 'colorburst' &&
          abilityPhaseAtTick(slot, tick) === 'active';
        return {
          slot,
          hitPoints: hitPoints[index],
          maxHitPoints: maximumHitPoints[index],
          position,
          velocity: {
            x: nextPosition.x - position.x,
            y: nextPosition.y - position.y,
          },
          primaryPower: powers[index],
          abilityPhase: abilityPhaseAtTick(slot, tick),
          barrierHitPoints:
            fighters[index].element === 'moss' && tick < 130 ? 18 : 0,
          echoPosition: isCharmEchoVisible
            ? { x: position.x - 900, y: position.y + 300 }
            : null,
        };
      }),
    });
  }

  const resultFighters = fighters.map((fighter, index) => ({
    slot: index === 0 ? 'a' : 'b',
    id: fighter.id,
    finalHitPoints: currentHitPoints[index],
    maxHitPoints: maximumHitPoints[index],
    hitPointPermille: Math.round(
      (currentHitPoints[index] * 1000) / maximumHitPoints[index]
    ),
    damageDealt: damageDealt[index],
    primaryPower: powers[index],
    inkPressureUsed: (index === 0 ? 'a' : 'b') === loser,
  }));

  return {
    version: 1,
    battleId: `mock-simulation-${kind}-${battleCounter}`,
    seed: `mock:${battleCounter}`,
    tickRate: 20,
    fixedPointScale: 100,
    maxTicks: 500,
    fighters: fighters.map((fighter) => ({
      id: fighter.id,
      name: fighter.name,
      element: fighter.element,
      stats: { ...fighter.stats },
    })),
    timeline,
    checkpoints,
    result: {
      winner,
      loser,
      reason: 'knockout',
      completedTick,
      completedMilliseconds: completedTick * 50,
      fighters: resultFighters,
    },
    eventsTruncated: false,
  };
};

const createBattleReport = (kind, fighterA, fighterB) => {
  battleCounter += 1;
  const day = memory.dayNumber;
  const winner = battleCounter % 2 === 0 ? 'a' : 'b';
  let hpA = mockBattleMaximumHitPoints(fighterA);
  let hpB = mockBattleMaximumHitPoints(fighterB);
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
    simulation: createMockSimulation(kind, fighterA, fighterB, winner),
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
    stats: { chonk: 24, spike: 20, zip: 18, charm: 38 },
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
    discountedCapsuleUtcDate: null,
    capsuleOperations: new Map(),
    sparWinRewardUtcDates: new Set(),
  };
};

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
  economyByPreviewMode: {
    returning: createPreviewEconomy({
      ink: 35,
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
          'doodler',
          'inkslinger',
          'brushlord',
          'the-pen-ultimate',
        ],
      },
      capsulePullCount: 13,
      pullsSinceEpic: 6,
    }),
    fresh: createPreviewEconomy(),
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
};

for (let index = 0; index < 10; index += 1) {
  const fighterA = myScribbits[index % myScribbits.length];
  const fighterB = todayEntrants[index % todayEntrants.length];
  memory.myBattles.push(createBattleReport('exhibition', fighterA, fighterB));
}
const inkyMoon = legends.find((scribbit) => scribbit.name === 'Inky Moon');
if (!inkyMoon) throw new Error('Mock Rumble replay needs Inky Moon.');
memory.previousRumbleReplay = {
  ...createBattleReport('rumble', inkyMoon, champion),
  day: memory.dayNumber - 1,
};

const getPreviewEconomy = (previewMode) => {
  return memory.economyByPreviewMode[previewMode];
};

const resetPreviewEconomy = (economy) => {
  economy.ink = 0;
  economy.inventory = emptyInventoryState();
  economy.capsulePullCount = 0;
  economy.pullsSinceEpic = 0;
  economy.discountedCapsuleUtcDate = null;
  economy.capsuleOperations.clear();
  economy.sparWinRewardUtcDates.clear();
};

const getLivingScribbitsForPreview = (previewMode) => {
  if (previewMode === 'logged-out') return [];
  if (previewMode === 'fresh') {
    return memory.myScribbits.filter((scribbit) =>
      scribbit.id.startsWith('mock-submitted-')
    );
  }
  return memory.myScribbits;
};

const getOwnedScribbits = () => {
  const ownedById = new Map();
  for (const list of [memory.myScribbits, memory.myFaded, memory.legends]) {
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

const toLegacyCard = (scribbit) => {
  if (scribbit.status === 'alive' || !scribbit.legacy) return undefined;
  return {
    id: scribbit.id,
    name: scribbit.name,
    artist: scribbit.artist,
    element: scribbit.element,
    imageUrl: scribbit.imageUrl,
    bornDay: scribbit.bornDay,
    expiresDay: scribbit.expiresDay,
    status: scribbit.status,
    legendTitle: scribbit.legendTitle,
    legacy: cloneLegacySnapshot(scribbit.legacy),
  };
};

const getPersonalLegacyCards = () => {
  return getOwnedScribbits()
    .map(toLegacyCard)
    .filter(Boolean)
    .sort((left, right) => {
      const archivedDayDifference =
        right.legacy.archivedDay - left.legacy.archivedDay;
      return archivedDayDifference || right.id.localeCompare(left.id);
    });
};

const encodeLegacyCursor = (card, cards) => {
  const descendingIndex = cards.findIndex(
    (candidate) => candidate.id === card.id
  );
  const ascendingRank = Math.max(0, cards.length - 1 - descendingIndex);
  return `v2|${card.legacy.archivedDay}|${ascendingRank}|${encodeURIComponent(card.id)}`;
};

const getLegacyCursorOffset = (rawCursor, cards) => {
  if (rawCursor === null) return 0;
  if (/^\d+$/.test(rawCursor)) {
    const offset = Number(rawCursor);
    return Number.isSafeInteger(offset) ? offset : undefined;
  }
  const match = /^v2\|(\d+)\|(\d+)\|(.+)$/.exec(rawCursor);
  const previousMatch = /^v1\|(\d+)\|(.+)$/.exec(rawCursor);
  const cursorMatch = match ?? previousMatch;
  if (!cursorMatch) return undefined;
  const score = Number(cursorMatch[1]);
  let member;
  try {
    member = decodeURIComponent(match ? match[3] : cursorMatch[2]);
  } catch {
    return undefined;
  }
  if (!Number.isSafeInteger(score) || !member) return undefined;
  const exactIndex = cards.findIndex(
    (card) => card.id === member && card.legacy.archivedDay === score
  );
  if (exactIndex >= 0) return exactIndex + 1;
  const nextIndex = cards.findIndex(
    (card) =>
      card.legacy.archivedDay < score ||
      (card.legacy.archivedDay === score && card.id < member)
  );
  return nextIndex < 0 ? cards.length : nextIndex;
};

const legacyReturnReceiptState = () => {
  const unseenCards = getPersonalLegacyCards().filter(
    (card) => card.legacy.archivedDay > memory.legacySeenThroughDay
  );
  if (unseenCards.length === 0) return null;

  return {
    cards: unseenCards.slice(0, legacyReturnPreviewLimit),
    total: unseenCards.length,
    newestArchivedDay: unseenCards[0].legacy.archivedDay,
  };
};

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
    memory.myFaded,
  ]) {
    removeScribbitFromList(list, scribbitId);
  }
  memory.myBattles = memory.myBattles.filter(
    (report) => report.a.id !== scribbitId && report.b.id !== scribbitId
  );
  submittedDrawingBytes.delete(scribbitId);
};

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

const dominantStatFor = (stats) => {
  let dominantStat = statKeys[0];
  for (const stat of statKeys.slice(1)) {
    if ((stats?.[stat] ?? 0) > (stats?.[dominantStat] ?? 0)) {
      dominantStat = stat;
    }
  }
  return dominantStat;
};

const drawingBytesFor = (scribbitId) => {
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

const readPageNumber = (value, fallback, maximum) => {
  if (value === null || value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return undefined;
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) return undefined;
  return maximum === undefined ? parsedValue : Math.min(parsedValue, maximum);
};

const previewModeFromUrl = (url) => {
  if (
    url.searchParams.has('logged-out') ||
    url.searchParams.has('loggedOut') ||
    url.searchParams.has('loggedout')
  ) {
    return 'logged-out';
  }
  return url.searchParams.has('fresh') ? 'fresh' : 'returning';
};

const requestPreviewMode = (request, url) => {
  const directMode = previewModeFromUrl(url);
  if (directMode !== 'returning') return directMode;

  const referrer = request.headers.referer;
  if (typeof referrer !== 'string') return 'returning';
  try {
    return previewModeFromUrl(new URL(referrer));
  } catch {
    return 'returning';
  }
};

const currentUtcDateKey = () => {
  return new Date().toISOString().slice(0, 10);
};

const capsuleCostForCurrentPull = (economy) => {
  const utcDateKey = currentUtcDateKey();
  const isFirstDailyPull = economy.discountedCapsuleUtcDate !== utcDateKey;

  return {
    cost: isFirstDailyPull ? capsuleFirstDailyCost : capsuleCost,
    utcDateKey,
  };
};

const capsuleProgressState = (economy) => {
  const inventory = economy.inventory;
  const collectionIds = new Set([
    ...mockCapsuleCatalogIds,
    ...inventory.discovered,
  ]);
  return {
    pullCount: economy.capsulePullCount,
    pityRemaining: Math.max(1, capsulePity - economy.pullsSinceEpic),
    discoveredCount: inventory.discovered.length,
    collectionTotal: collectionIds.size,
  };
};

const countAccessoryIds = (accessoryIds) => {
  const counts = {};

  for (const accessoryId of accessoryIds) {
    counts[accessoryId] = (counts[accessoryId] ?? 0) + 1;
  }

  return counts;
};

const addCapsuleDropToInventory = (economy, drop) => {
  const inventory = economy.inventory;
  const isNew = !inventory.discovered.includes(drop.id);
  if (isNew) inventory.discovered.push(drop.id);

  if (drop.kind === 'accessory') {
    const previousCount = inventory.items[drop.id] ?? 0;
    const ownedCount = previousCount + 1;
    inventory.items[drop.id] = ownedCount;

    return {
      isNew,
      ownedCount,
    };
  }

  const inventoryList = drop.kind === 'pen' ? inventory.pens : inventory.titles;
  if (!inventoryList.includes(drop.id)) {
    inventoryList.push(drop.id);
  }

  return {
    isNew,
    ownedCount: 1,
  };
};

const selectMockCapsuleDrop = (economy) => {
  const naturalDrop =
    mockCapsuleDrops[economy.capsulePullCount % mockCapsuleDrops.length];
  if (!naturalDrop) return undefined;

  const rarity =
    economy.pullsSinceEpic + 1 >= capsulePity ? 'epic' : naturalDrop.rarity;
  const matchingDrops = mockCapsuleDrops.filter((drop) => {
    return drop.rarity === rarity;
  });
  const usefulDrops = matchingDrops.filter((drop) => {
    return (
      drop.kind === 'accessory' ||
      !economy.inventory.discovered.includes(drop.id)
    );
  });
  const dropPool = usefulDrops.length > 0 ? usefulDrops : matchingDrops;
  return dropPool[economy.capsulePullCount % dropPool.length];
};

const consumeInventoryItems = (inventory, requiredCounts) => {
  for (const [accessoryId, requiredCount] of Object.entries(requiredCounts)) {
    const nextCount = (inventory.items[accessoryId] ?? 0) - requiredCount;

    if (nextCount > 0) {
      inventory.items[accessoryId] = nextCount;
    } else {
      delete inventory.items[accessoryId];
    }
  }
};

const readSubmittedAccessoryIds = (body, inventory) => {
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
    if ((inventory.items[accessoryId] ?? 0) < requiredCount) {
      return {
        status: 409,
        message: `You need ${requiredCount} ${getProductionCosmetic(accessoryId, 'accessory').name} accessory copy.`,
      };
    }
  }

  return { accessoryIds, requiredCounts };
};

const arenaState = (economy) => {
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
    myInk: economy.ink,
    myPens: [...economy.inventory.pens],
    nextCapsuleCost: capsuleCostForCurrentPull(economy).cost,
    capsuleProgress: capsuleProgressState(economy),
    lastRumbleReceipt: {
      resolvedDay: memory.dayNumber - 1,
      backedName: 'Inky Moon',
      championName: memory.champion.name,
      cloutEarned: 0,
      inkAwarded: 0,
      replayAvailable: memory.previousRumbleReplay !== null,
    },
    legacyReturnReceipt: legacyReturnReceiptState(),
  };
};

const freshPlayerArenaState = (economy) => {
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
    ...arenaState(economy),
    myScribbits: submittedScribbits.map(cloneScribbit),
    drawnToday: submittedScribbits.length > 0,
    enteredToday,
    myBackedScribbitId: null,
    playStreakDays: 1,
    myClout: 0,
    lastRumbleReceipt: null,
    legacyReturnReceipt: null,
  };
};

const loggedOutArenaState = () => {
  return {
    ...arenaState(createPreviewEconomy()),
    loggedIn: false,
    myUsername: null,
    myScribbits: [],
    drawnToday: false,
    enteredToday: false,
    myBackedScribbitId: null,
    playStreakDays: 0,
    myClout: 0,
    lastRumbleReceipt: null,
    legacyReturnReceipt: null,
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
  return {
    items: cloneItemCounts(inventory.items),
    pens: [...inventory.pens],
    titles: [...inventory.titles],
    equippedTitle: inventory.equippedTitle,
    discovered: [...inventory.discovered],
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

  if (previewMode === 'logged-out' && method === 'POST') {
    sendError(response, 401, 'Sign in to change your Scribbits data.');
    return;
  }

  if (method === 'GET' && path === '/api/arena') {
    sendJson(response, 200, arenaStateForPreview(previewMode));
    return;
  }

  if (method === 'GET' && path === '/api/splash') {
    const state = arenaStateForPreview(previewMode);
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
    sendJson(response, 200, inventoryStateForPreview(previewMode));
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
    if (titleId !== null && !inventory.titles.includes(titleId)) {
      sendError(response, 400, 'Discover that title before wearing it.');
      return;
    }

    economy.inventory.equippedTitle = titleId;
    sendJson(response, 200, inventoryState(economy.inventory));
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
    const { cost, utcDateKey } = capsuleCostForCurrentPull(economy);

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
    economy.pullsSinceEpic =
      drop.rarity === 'epic'
        ? 0
        : Math.min(capsulePity - 1, economy.pullsSinceEpic + 1);
    economy.discountedCapsuleUtcDate = utcDateKey;
    economy.ink -= cost;
    const pullInventoryState = addCapsuleDropToInventory(economy, drop);

    const capsuleResponse = {
      pull: {
        ...drop,
        ...pullInventoryState,
      },
      ink: economy.ink,
      inventory: inventoryState(economy.inventory),
      nextCost: capsuleCost,
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

  if (method === 'GET' && path === '/api/rumble-replay') {
    if (previewMode === 'logged-out') {
      sendError(response, 401, 'Sign in to replay your Rumble pick.');
      return;
    }
    const resolvedDay = Number(url.searchParams.get('day'));
    const report = memory.previousRumbleReplay;
    if (
      previewMode !== 'returning' ||
      !report ||
      resolvedDay !== report.day ||
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
    const cursorOffset = getLegacyCursorOffset(
      url.searchParams.get('cursor'),
      allCards
    );
    const requestedLimit = readPageNumber(
      url.searchParams.get('limit'),
      maximumLegacyCardsPageSize,
      maximumLegacyCardsPageSize
    );
    if (
      cursorOffset === undefined ||
      requestedLimit === undefined ||
      requestedLimit < 1
    ) {
      sendError(response, 400, 'Use a valid Legacy Deck cursor and page size.');
      return;
    }

    if (previewMode !== 'returning') {
      sendJson(response, 200, { cards: [], nextCursor: null });
      return;
    }

    const cards = allCards.slice(cursorOffset, cursorOffset + requestedLimit);
    const nextOffset = cursorOffset + cards.length;
    sendJson(response, 200, {
      cards,
      nextCursor:
        nextOffset < allCards.length && cards.length > 0
          ? encodeLegacyCursor(cards[cards.length - 1], allCards)
          : null,
    });
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
    memory[seenThroughDayKey] = Math.max(
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
      myFaded:
        previewMode === 'returning' ? memory.myFaded.map(cloneScribbit) : [],
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
    const scribbit = getLivingScribbitsForPreview(previewMode).find(
      (entry) => entry.id === scribbitId
    );

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
    economy.ink += careInkReward;
    sendJson(response, 200, cloneScribbit(scribbit));
    return;
  }

  if (method === 'POST' && path === '/api/back') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);

    if (!memory.todayEntrants.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, "Back one of tonight's Rumble entrants.");
      return;
    }

    if (memory.myScribbits.some((entry) => entry.id === scribbitId)) {
      sendError(
        response,
        400,
        "Back another Redditor's Scribbit, not your own."
      );
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
    if (previewMode === 'fresh') {
      memory.freshLegacySeenThroughDay = 0;
    }
    if (previewMode === 'returning') {
      memory.drawnToday = false;
      memory.enteredToday = false;
      memory.myBackedScribbitId = null;
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

    const opponent =
      memory.todayEntrants.find((entry) => entry.artist !== 'mock_player') ??
      memory.todayEntrants[0];
    const report = createBattleReport('exhibition', challenger, opponent);
    let rewardedReport = report;

    if (report.winner === 'a') {
      const utcDateKey = currentUtcDateKey();
      if (!economy.sparWinRewardUtcDates.has(utcDateKey)) {
        economy.sparWinRewardUtcDates.add(utcDateKey);
        economy.ink += sparWinInkReward;
        challenger.xp += 1;
        challenger.level = levelForXp(challenger.xp);
        rewardedReport = { ...report, inkAwarded: sparWinInkReward };
      }
    }

    memory.myBattles.unshift(rewardedReport);
    sendJson(response, 200, rewardedReport);
    return;
  }

  if (method === 'POST' && path === '/api/boss-challenge') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = memory.myScribbits.find(
      (entry) => entry.id === scribbitId
    );

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
    const scribbit = memory.myScribbits.find(
      (entry) => entry.id === scribbitId
    );

    if (!scribbit) {
      sendError(
        response,
        404,
        'That living Scribbit is not in your sketchbook.'
      );
      return;
    }

    if (memory.enteredToday) {
      sendError(response, 409, "You already entered today's Rumble.");
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
    const submittedAccessories = readSubmittedAccessoryIds(
      body,
      economy.inventory
    );

    if (submittedAccessories.message) {
      sendError(
        response,
        submittedAccessories.status,
        submittedAccessories.message
      );
      return;
    }

    const baseImageDataUrl = body?.baseImageDataUrl;
    const renderedImageDataUrl = body?.imageDataUrl;
    if (
      typeof baseImageDataUrl !== 'string' ||
      !baseImageDataUrl.startsWith('data:image/png;base64,') ||
      typeof renderedImageDataUrl !== 'string' ||
      !renderedImageDataUrl.startsWith('data:image/png;base64,')
    ) {
      sendError(response, 400, 'Send both the base drawing and rendered PNG.');
      return;
    }

    const id = `mock-submitted-${Date.now()}`;
    // Display the decorated copy while keeping the undecorated copy separate,
    // matching production's cosmetic-only accessory boundary.
    submittedDrawingBytes.set(
      id,
      Buffer.from(
        renderedImageDataUrl.slice('data:image/png;base64,'.length),
        'base64'
      )
    );
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

    consumeInventoryItems(
      economy.inventory,
      submittedAccessories.requiredCounts ?? {}
    );
    memory.myScribbits.unshift(scribbit);
    memory.todayEntrants.push(scribbit);
    memory.drawnToday = true;
    memory.enteredToday = true;
    economy.ink += dailyDrawInkReward;
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
    (report) => !submittedIds.has(report.a.id) && !submittedIds.has(report.b.id)
  );
  for (const scribbitId of submittedIds)
    submittedDrawingBytes.delete(scribbitId);
  memory.drawnToday = false;
  memory.enteredToday = false;
  memory.myBackedScribbitId = null;
  memory.freshLegacySeenThroughDay = 0;
  memory.hiddenScribbitIds.clear();
  memory.reportCounts.clear();
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
