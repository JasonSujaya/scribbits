import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledSharedRoot || !compiledServerRoot || !compiledClientRoot) {
  throw new Error(
    'Run equipment economy tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const sharedCosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));
const sharedEquipment = require(join(compiledSharedRoot, 'equipment.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const capsulePresentation = require(
  join(compiledClientRoot, 'lib', 'capsulepresentation.js')
);

test('published capsule odds/Ink pacing', () => {
  assert.equal(
    inkStore.chooseCapsuleRarity(0.699),
    'common',
    'capsule roll below 70% should be common'
  );
  assert.equal(
    Object.values(arena.CAPSULE_RARITY_PERCENTAGES).reduce(
      (total, percentage) => total + percentage,
      0
    ),
    100,
    'published capsule rarity percentages should cover the full roll'
  );
  const newPlayerDailyInk =
    arena.INK_REWARDS.dailyDraw + arena.INK_REWARDS.care * 3;
  assert.equal(
    newPlayerDailyInk,
    arena.CAPSULE_FIRST_DAILY_COST,
    'drawing and caring for one new Scribbit should fund one earned-Ink chest'
  );
  assert.equal(
    arena.INK_REWARDS.rumbleWin,
    arena.CAPSULE_COST,
    'one Rumble win should fund one earned-Ink chest'
  );
  assert.equal(
    capsulePresentation.capsuleOpenCost(
      arena.CAPSULE_MAX_BATCH_SIZE,
      arena.CAPSULE_COST
    ),
    arena.INK_REWARDS.rumbleWin * arena.CAPSULE_MAX_BATCH_SIZE,
    'ten Rumble wins should fund the maximum ten-open batch'
  );
  assert.equal(
    inkStore.chooseCapsuleRarity(0.7),
    'rare',
    'capsule roll at 70% should be rare'
  );
  assert.equal(
    inkStore.chooseCapsuleRarity(0.949),
    'rare',
    'capsule roll below 95% should remain rare'
  );
  assert.equal(
    inkStore.chooseCapsuleRarity(0.95),
    'epic',
    'capsule roll at 95% should be epic'
  );
});

test('deterministic capsule selection/entropy', () => {
  const deterministicCapsuleDropOne = inkStore.selectCapsuleDrop({
    userId: 'deterministic-player',
    day: 7,
    pullCount: 3,
    pullsSinceEpic: 0,
  });
  const deterministicCapsuleDropTwo = inkStore.selectCapsuleDrop({
    userId: 'deterministic-player',
    day: 7,
    pullCount: 3,
    pullsSinceEpic: 0,
  });
  assert.deepEqual(
    deterministicCapsuleDropOne,
    deterministicCapsuleDropTwo,
    'same user/day/pull count should select the same capsule drop'
  );
  const entropySelectionOptions = {
    userId: 'entropy-player',
    day: 7,
    pullCount: 3,
    pullsSinceEpic: 0,
  };
  const fixedEntropyDropOne = inkStore.selectCapsuleDrop({
    ...entropySelectionOptions,
    entropy: 'server-operation-entropy-7',
  });
  const fixedEntropyDropTwo = inkStore.selectCapsuleDrop({
    ...entropySelectionOptions,
    entropy: 'server-operation-entropy-7',
  });
  assert.deepEqual(
    fixedEntropyDropOne,
    fixedEntropyDropTwo,
    'the same server entropy should remain deterministic for replayable tests'
  );
  const entropiedDropIds = new Set(
    Array.from({ length: 32 }, (_, entropyIndex) => {
      return inkStore.selectCapsuleDrop({
        ...entropySelectionOptions,
        entropy: `server-operation-entropy-${entropyIndex}`,
      }).id;
    })
  );
  assert.ok(
    entropiedDropIds.size > 1,
    'different server operation entropy should vary otherwise identical drops'
  );
});

test('catalog cardinality/indexing', () => {
  assert.equal(
    sharedCosmetics.ACCESSORY_CATALOG_ENTRIES.length,
    26,
    'shared cosmetic metadata should contain all 26 Gear items'
  );
  assert.equal(
    sharedCosmetics.PEN_CATALOG_ENTRIES.length,
    8,
    'shared cosmetic metadata should contain all 8 pens'
  );
  assert.equal(
    sharedCosmetics.TITLE_CATALOG_ENTRIES.length,
    4,
    'shared cosmetic metadata should contain all 4 titles'
  );
  assert.equal(
    sharedCosmetics.DRAWING_INK_CATALOG_ENTRIES.length,
    3,
    'shared cosmetic metadata should contain all 3 drawing inks'
  );
  assert.equal(
    sharedCosmetics.BRUSH_CATALOG_ENTRIES.length,
    3,
    'shared cosmetic metadata should contain all 3 brushes'
  );
  assert.equal(
    sharedCosmetics.COSMETIC_CATALOG.length,
    44,
    'shared cosmetic metadata should contain exactly 44 entries'
  );
  assert.equal(
    sharedCosmetics.COSMETIC_BY_ID.size,
    sharedCosmetics.COSMETIC_CATALOG.length,
    'every shared cosmetic id should be unique and indexed'
  );
});

test('canonical equipment loadout validation', () => {
  assert.deepEqual(sharedEquipment.EQUIPMENT_CATEGORIES, [
    'weapon',
    'armor',
    'shoes',
    'accessory',
  ]);
  assert.deepEqual(sharedEquipment.EQUIPMENT_CAPACITY, {
    weapon: 2,
    armor: 2,
    shoes: 2,
    accessory: 2,
  });
  assert.equal(
    sharedEquipment.MAX_EQUIPPED_ITEMS,
    8,
    'two slots in each of four categories should allow eight equipped items'
  );
  const emptyEquipmentLoadout = sharedEquipment.createEmptyEquipmentLoadout();
  assert.deepEqual(emptyEquipmentLoadout, {
    weapon: [null, null],
    armor: [null, null],
    shoes: [null, null],
    accessory: [null, null],
  });
  assert.equal(sharedEquipment.equippedItemCount(emptyEquipmentLoadout), 0);

  const fullEquipmentLoadout = Object.fromEntries(
    sharedEquipment.EQUIPMENT_CATEGORIES.map((category) => [
      category,
      sharedCosmetics.GEAR_CATALOG_ENTRIES.filter(
        (entry) => entry.category === category
      )
        .slice(0, 2)
        .map((entry) => entry.id),
    ])
  );
  const parsedFullEquipmentLoadout =
    sharedCosmetics.validateCatalogEquipmentLoadout(fullEquipmentLoadout);
  assert.deepEqual(parsedFullEquipmentLoadout, fullEquipmentLoadout);
  assert.equal(
    sharedEquipment.equippedItemCount(parsedFullEquipmentLoadout),
    sharedEquipment.MAX_EQUIPPED_ITEMS
  );
  assert.equal(
    sharedEquipment.parseEquipmentLoadout({
      ...fullEquipmentLoadout,
      armor: [fullEquipmentLoadout.weapon[0], fullEquipmentLoadout.armor[1]],
    }),
    undefined,
    'one catalog id cannot occupy two loadout slots'
  );
  assert.equal(
    sharedEquipment.parseEquipmentLoadout({
      ...fullEquipmentLoadout,
      shoes: [fullEquipmentLoadout.shoes[0]],
    }),
    undefined,
    'every category should have exactly two slots'
  );
  assert.equal(
    sharedEquipment.parseEquipmentLoadout({
      ...fullEquipmentLoadout,
      helmet: [null, null],
    }),
    undefined,
    'unknown loadout categories should be rejected'
  );
  assert.equal(
    sharedCosmetics.validateCatalogEquipmentLoadout({
      ...fullEquipmentLoadout,
      armor: [fullEquipmentLoadout.weapon[0], fullEquipmentLoadout.armor[1]],
      weapon: [null, fullEquipmentLoadout.weapon[1]],
    }),
    undefined,
    'catalog category metadata, not the client slot, should own classification'
  );
  assert.equal(
    sharedCosmetics.validateCatalogEquipmentLoadout({
      ...fullEquipmentLoadout,
      accessory: ['not-real-gear', fullEquipmentLoadout.accessory[1]],
    }),
    undefined,
    'unknown gear ids should be rejected'
  );
  for (const category of sharedEquipment.EQUIPMENT_CATEGORIES) {
    assert.ok(
      sharedCosmetics.GEAR_CATALOG_ENTRIES.some(
        (entry) => entry.category === category
      ),
      `${category} should have at least one catalog item`
    );
  }
});
