import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!appRoot || !compiledSharedRoot || !compiledServerRoot) {
  throw new Error('Run Legends contracts through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const legacyCards = require(join(compiledSharedRoot, 'legacycards.js'));
const cosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));
const combatUpgrades = require(
  join(compiledSharedRoot, 'combat', 'upgrades.js')
);
const scribbitCore = require(join(compiledServerRoot, 'core', 'scribbit.js'));
const mockRuntime = require(join(compiledServerRoot, 'core', 'mockRuntime.js'));

const readAppFile = (...segments) => {
  return readFileSync(join(appRoot, ...segments), 'utf8');
};

const createArchivedScribbit = ({
  id,
  archivedDay = 4,
  belief = 0,
  legendTitle = null,
  accessories = [],
  xp = 15,
  wins = 0,
  losses = 0,
}) => {
  const livingScribbit = scribbitCore.createScribbit({
    id,
    draft: {
      name: id,
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: accessories.map((accessoryId) => ({ id: accessoryId })),
    },
    artist: 'legends-contract-player',
    imageUrl: `/api/drawing/${id}`,
    day: archivedDay - 3,
  });
  const level = scribbitCore.getLevelForXp(xp);
  const terminalScribbit = scribbitCore.resolveExpiredScribbitStatus({
    ...livingScribbit,
    belief,
    legendTitle,
    xp,
    wins,
    losses,
    level,
    upgrades: combatUpgrades.createScribbitUpgradesForLevel(id, level),
  });
  const doodler = cosmetics.COSMETIC_BY_ID.get('doodler');
  assert.ok(doodler, 'the canonical Doodler title must exist');

  return {
    ...terminalScribbit,
    legacy: scribbitCore.createScribbitLegacy(terminalScribbit, {
      creatorTitle: {
        id: doodler.id,
        name: doodler.name,
        rarity: doodler.rarity,
      },
    }),
  };
};

test('Legacy Card expiry freezes versioned snapshots and classifies finishes', () => {
  const fadedScribbit = createArchivedScribbit({
    id: 'fade-me',
    belief: 2,
    wins: 3,
    losses: 4,
    xp: 7,
    accessories: ['beanie', 'retired-pin'],
  });

  assert.equal(fadedScribbit.status, 'faded');
  assert.deepEqual(fadedScribbit.legacy, {
    schemaVersion: 2,
    archivedDay: 4,
    finish: 'faded',
    creatorTitle: {
      id: 'doodler',
      name: 'Doodler',
      rarity: 'common',
    },
    level: 3,
    xp: 7,
    wins: 3,
    losses: 4,
    belief: 2,
    accessories: [
      { id: 'beanie', name: 'Beanie', rarity: 'common' },
      { id: 'retired-pin', name: 'Retired Pin', rarity: 'common' },
    ],
    upgrades: [
      { id: 'v1-thick-paper', acquiredAtLevel: 2 },
      { id: 'v1-bold-tip', acquiredAtLevel: 3 },
    ],
  });

  const believedScribbit = createArchivedScribbit({
    id: 'expiry-believe-me',
    belief: 25,
  });
  assert.equal(believedScribbit.status, 'legend');
  assert.equal(believedScribbit.legacy.finish, 'believed');

  const championScribbit = createArchivedScribbit({
    id: 'expiry-crown-me',
    legendTitle: 'Champion of Day 3',
  });
  assert.equal(championScribbit.status, 'legend');
  assert.equal(championScribbit.legacy.finish, 'champion');

  const historicalTitleScribbit = createArchivedScribbit({
    id: 'expiry-historical-title',
    legendTitle: 'Ancient Favorite',
  });
  assert.equal(historicalTitleScribbit.legacy.finish, 'believed');
});

test('Legacy Card migration preserves frozen metadata and validates versions', () => {
  const terminalScribbit = createArchivedScribbit({
    id: 'legacyless-record',
    accessories: ['retired-pin'],
  });
  const legacylessRecord = structuredClone(terminalScribbit);
  delete legacylessRecord.legacy;
  delete legacylessRecord.upgrades;

  const migratedLegacyRecord = scribbitCore.normalizeScribbitRecord(
    legacylessRecord
  );
  assert.ok(migratedLegacyRecord?.legacy);
  assert.equal(migratedLegacyRecord.legacy.schemaVersion, 1);
  assert.deepEqual(migratedLegacyRecord.legacy.upgrades, []);
  assert.equal(
    migratedLegacyRecord.legacy.archivedDay,
    migratedLegacyRecord.expiresDay
  );
  assert.deepEqual(migratedLegacyRecord.legacy.accessories, [
    { id: 'retired-pin', name: 'Retired Pin', rarity: 'common' },
  ]);

  const normalizedFrozenRecord = scribbitCore.normalizeScribbitRecord({
    ...migratedLegacyRecord,
    wins: 99,
    belief: 99,
  });
  assert.equal(
    normalizedFrozenRecord?.legacy?.wins,
    migratedLegacyRecord.legacy.wins
  );
  assert.equal(
    normalizedFrozenRecord?.legacy?.belief,
    migratedLegacyRecord.legacy.belief
  );

  const malformedVersionTwoLegacy = structuredClone(terminalScribbit);
  malformedVersionTwoLegacy.legacy.upgrades = [
    { id: 'unknown-mod', acquiredAtLevel: 2 },
  ];
  assert.equal(
    scribbitCore.normalizeScribbitRecord(malformedVersionTwoLegacy),
    undefined
  );

  const missingVersionTwoLegacyUpgrades = structuredClone(terminalScribbit);
  delete missingVersionTwoLegacyUpgrades.legacy.upgrades;
  assert.equal(
    scribbitCore.normalizeScribbitRecord(missingVersionTwoLegacyUpgrades),
    undefined
  );

  const versionOneLegacyWithMods = structuredClone(migratedLegacyRecord);
  versionOneLegacyWithMods.legacy.upgrades = [
    { id: 'v1-bold-tip', acquiredAtLevel: 2 },
  ];
  assert.equal(
    scribbitCore.normalizeScribbitRecord(versionOneLegacyWithMods),
    undefined
  );
});

test('Legends stays a public paged response without a personal archive', () => {
  const arenaSource = readAppFile('src', 'shared', 'arena.ts');
  const scribbitSource = readAppFile('src', 'server', 'core', 'scribbit.ts');
  const apiSource = readAppFile('src', 'server', 'routes', 'api.ts');
  const gallerySource = readAppFile('src', 'client', 'scenes', 'Gallery.ts');

  const legendsState = arenaSource.match(
    /export type LegendsState = \{([\s\S]*?)\n\};/
  )?.[1];
  assert.ok(legendsState, 'shared arena must declare LegendsState');
  assert.match(legendsState, /legends: Scribbit\[\]/);
  assert.match(legendsState, /nextCursor: string \| null/);

  for (const source of [
    arenaSource,
    scribbitSource,
    apiSource,
    gallerySource,
  ]) {
    assert.doesNotMatch(source, /\bmyFaded\b|\bgetFadedScribbitsForUser\b/);
  }
});

test('mock Legacy fixtures remain internal to owned archive behavior', () => {
  const mockSource = readAppFile('scripts', 'dev-mock.mjs');

  assert.match(mockSource, /const archivedOwnedScribbits = \[/);
  assert.match(mockSource, /memory\.archivedOwnedScribbits/);
  assert.match(
    mockSource,
    /collectLegacyCards\(getOwnedScribbits\(\)\)/,
    'Legacy Cards must still collect archived owned fixtures'
  );
  assert.doesNotMatch(mockSource, /\bmyFaded\b/);
});

test('Legends preserve raw offset pagination when stale IDs are skipped', async () => {
  const storage = createMemoryStorage().storage;
  const legends = Array.from({ length: 5 }, (_, index) => {
    const rank = index + 1;
    const legend = scribbitCore.normalizeScribbitRecord({
      id: `pagination-legend-${rank}`,
      name: `Pagination Legend ${rank}`,
      artist: 'legend-contract-player',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      imageUrl: `/api/drawing/pagination-legend-${rank}`,
      bornDay: 1,
      expiresDay: 4,
      belief: 0,
      wins: 0,
      losses: 0,
      status: 'legend',
      legendTitle: `Legend rank ${rank}`,
      isFounding: false,
      accessories: [],
      level: 1,
      xp: 0,
      mood: 'hungry',
      careDoneToday: [],
      legacy: null,
    });
    assert.ok(legend, `pagination Legend ${rank} must normalize`);
    return legend;
  });
  for (const [index, legend] of legends.entries()) {
    await scribbitCore.storeScribbit(
      storage,
      `pagination-owner-${index + 1}`,
      legend
    );
    await scribbitCore.addLegend(storage, legend, index + 1);
  }

  assert.deepEqual(
    await scribbitCore.getLegendIds(storage, 2, 0),
    ['pagination-legend-5', 'pagination-legend-4'],
    'first Legend id page should be newest first'
  );
  assert.deepEqual(
    await scribbitCore.getLegendIds(storage, 2, 2),
    ['pagination-legend-3', 'pagination-legend-2'],
    'second Legend id page should continue without overlap'
  );
  assert.deepEqual(
    (await scribbitCore.getLegends(storage, 2, 0)).map((legend) => legend.id),
    ['pagination-legend-5', 'pagination-legend-4'],
    'hydrated first Legend page should preserve ranked order'
  );
  assert.deepEqual(
    (await scribbitCore.getLegends(storage, 2, 2)).map((legend) => legend.id),
    ['pagination-legend-3', 'pagination-legend-2'],
    'hydrated second Legend page should preserve its raw offset'
  );

  await storage.zAdd(scribbitCore.getLegendsKey(), {
    member: 'pagination-legend-stale',
    score: 4.5,
  });
  assert.deepEqual(
    await scribbitCore.getLegendIds(storage, 3, 0),
    ['pagination-legend-5', 'pagination-legend-stale', 'pagination-legend-4'],
    'raw Legend cursors should retain stale zset positions'
  );
  assert.deepEqual(
    (await scribbitCore.getLegends(storage, 3, 0)).map((legend) => legend.id),
    ['pagination-legend-5', 'pagination-legend-4'],
    'hydration should omit a stale Legend id without shifting the raw page'
  );
  assert.deepEqual(
    (await scribbitCore.getLegends(storage, 3, 3)).map((legend) => legend.id),
    ['pagination-legend-3', 'pagination-legend-2', 'pagination-legend-1'],
    'the next raw offset should remain non-overlapping after a stale id'
  );
});

test('Legacy Cards share cursor, paging, projection, and mock contracts', () => {
  const fadedScribbit = createArchivedScribbit({
    id: 'fade-me',
    accessories: ['beanie'],
  });
  const believedScribbit = createArchivedScribbit({
    id: 'believe-me',
    belief: 25,
  });
  const championScribbit = createArchivedScribbit({
    id: 'crown-me',
    legendTitle: 'Champion of Day 3',
  });
  const fadedLegacyCard = legacyCards.toLegacyCard(fadedScribbit);
  const believedLegacyCard = legacyCards.toLegacyCard(believedScribbit);
  const championLegacyCard = legacyCards.toLegacyCard(championScribbit);
  assert.ok(fadedLegacyCard && believedLegacyCard && championLegacyCard);

  assert.deepEqual(legacyCards.parseLegacyCardCursor(null), null);
  assert.deepEqual(legacyCards.parseLegacyCardCursor('000'), {
    kind: 'offset',
    offset: 0,
  });
  assert.deepEqual(legacyCards.parseLegacyCardCursor('v1|4|fade-me'), {
    kind: 'anchor',
    member: 'fade-me',
    score: 4,
  });
  assert.deepEqual(legacyCards.parseLegacyCardCursor('v2|4|2|fade-me'), {
    kind: 'anchor',
    member: 'fade-me',
    score: 4,
    rankHint: 2,
  });
  for (const malformedCursor of [
    '',
    '-1',
    '1.2',
    '1e2',
    'v1|4|%',
    'v1|4|line%0Abreak',
    `v1|4|${'x'.repeat(257)}`,
    `v2|4|0|${'x'.repeat(500)}`,
    `v2|4|${Number.MAX_SAFE_INTEGER + 1}|fade-me`,
  ]) {
    assert.equal(
      legacyCards.parseLegacyCardCursor(malformedCursor),
      undefined,
      `cursor must reject ${malformedCursor.slice(0, 32)}`
    );
  }
  assert.equal(legacyCards.parseLegacyCardsPageSize(undefined), 24);
  assert.equal(legacyCards.parseLegacyCardsPageSize('999'), 24);
  assert.equal(legacyCards.parseLegacyCardsPageSize('2'), 2);
  assert.equal(legacyCards.parseLegacyCardsPageSize('0'), undefined);
  assert.equal(legacyCards.parseLegacyCardsPageSize('02'), undefined);

  const legacyCardsNewestFirst = legacyCards.sortLegacyCardsNewestFirst([
    believedLegacyCard,
    fadedLegacyCard,
    championLegacyCard,
  ]);
  assert.deepEqual(
    legacyCardsNewestFirst.map(({ id }) => id),
    ['fade-me', 'crown-me', 'believe-me'],
    'same-day Legacy Cards must use deterministic member ordering'
  );
  const firstLegacyPage = legacyCards.paginateLegacyCards(
    legacyCardsNewestFirst,
    null,
    2
  );
  assert.ok(firstLegacyPage?.nextCursor?.startsWith('v2|4|1|'));
  assert.deepEqual(
    legacyCards
      .paginateLegacyCards(
        legacyCardsNewestFirst,
        firstLegacyPage.nextCursor,
        2
      )
      ?.cards.map(({ id }) => id),
    ['believe-me']
  );

  const isolatedLegacyCard = legacyCards.toLegacyCard(fadedScribbit);
  assert.ok(isolatedLegacyCard);
  isolatedLegacyCard.legacy.creatorTitle.name = 'Mutated title';
  isolatedLegacyCard.legacy.accessories[0].name = 'Mutated accessory';
  isolatedLegacyCard.legacy.upgrades[0].id = 'mutated-upgrade';
  assert.equal(fadedScribbit.legacy.creatorTitle.name, 'Doodler');
  assert.equal(fadedScribbit.legacy.accessories[0].name, 'Beanie');
  assert.notEqual(
    fadedScribbit.legacy.upgrades[0].id,
    'mutated-upgrade',
    'Legacy Card projection must clone current upgrade snapshots'
  );

  const receiptProjection = legacyCards.projectLegacyReturnReceipt(
    [...legacyCardsNewestFirst, { ...believedLegacyCard, id: 'another-memory' }],
    0
  );
  assert.equal(receiptProjection?.cards.length, 3);
  assert.equal(receiptProjection?.total, 4);
  assert.equal(
    legacyCards.getNextLegacySeenThroughDay(9, 3),
    9,
    'seen state must be monotonic'
  );
  assert.equal(
    mockRuntime.paginateLegacyCards,
    legacyCards.paginateLegacyCards,
    'mock pagination must re-export the canonical contract'
  );
  assert.equal(
    mockRuntime.projectLegacyReturnReceipt,
    legacyCards.projectLegacyReturnReceipt,
    'mock receipt projection must re-export the canonical contract'
  );
});
