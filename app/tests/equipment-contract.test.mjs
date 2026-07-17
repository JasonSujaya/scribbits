import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!appRoot || !compiledSharedRoot) {
  throw new Error(
    'Run equipment contracts through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const accessoryEffects = require(
  join(compiledSharedRoot, 'accessoryeffects.js')
);
const cosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));
const typescript = require('typescript');

test('equipment has one canonical four-category contract', () => {
  assert.deepEqual(
    [...equipment.EQUIPMENT_CATEGORIES],
    ['weapon', 'armor', 'shoes', 'accessory']
  );
  assert.deepEqual(equipment.EQUIPMENT_CAPACITY, {
    weapon: 2,
    armor: 2,
    shoes: 2,
    accessory: 2,
  });
  assert.equal(equipment.EQUIPMENT_SLOTS_PER_CATEGORY, 2);
  assert.equal(equipment.MAX_EQUIPPED_ITEMS, 8);
});

test('role relics preserve stored IDs while declaring clear affinities', () => {
  const expectedRelics = {
    'inkquake-rumble-belt': ['brawler', 'accessory'],
    'inkquake-crater-crown': ['brawler', 'armor'],
    'nib-halo-headband': ['longshot', 'accessory'],
    'nib-halo-circlet': ['longshot', 'accessory'],
    'smearstep-speed-scarf': ['longshot', 'shoes'],
    'smearstep-ink-skates': ['longshot', 'shoes'],
    'colorburst-rosette': ['mage', 'accessory'],
    'colorburst-prism-crown': ['mage', 'accessory'],
  };

  for (const [gearId, [role, category]] of Object.entries(expectedRelics)) {
    const gear = cosmetics.findGearCosmetic(gearId);
    assert.ok(gear, `missing persisted relic ${gearId}`);
    assert.equal(gear.roleAffinity, role);
    assert.equal(gear.category, category);
    assert.match(gear.roleEffect, /\S/);
  }
  assert.equal(accessoryEffects.ACCESSORY_EFFECT_MODE, 'role-sidegrade-v1');
});

test('Ink Kit derives categories from equipment and avoids scrap vocabulary', () => {
  const collectionBookSource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'collectionbook.ts'),
    'utf8'
  );
  const collectionBookModule = typescript.createSourceFile(
    'collectionbook.ts',
    collectionBookSource,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const equipmentImport = collectionBookModule.statements.find((statement) => {
    return (
      typescript.isImportDeclaration(statement) &&
      statement.moduleSpecifier.text === '../../shared/equipment'
    );
  });
  assert.ok(equipmentImport, 'Ink Kit must import shared equipment');
  const importedEquipmentNames = new Set(
    equipmentImport.importClause?.namedBindings?.elements.map(
      (element) => element.name.text
    ) ?? []
  );
  assert.equal(importedEquipmentNames.has('EQUIPMENT_CATEGORIES'), true);
  assert.equal(importedEquipmentNames.has('EquipmentCategory'), true);

  const inkKitSection = collectionBookModule.statements.find((statement) => {
    return (
      typescript.isTypeAliasDeclaration(statement) &&
      statement.name.text === 'InkKitSection'
    );
  });
  assert.ok(inkKitSection, 'Ink Kit must expose its section type');
  assert.equal(
    inkKitSection.type.getText(collectionBookModule),
    'EquipmentCategory | DrawKitSection',
    'Gear must use canonical categories while Draw Kit owns its separate sections'
  );

  assert.doesNotMatch(
    collectionBookSource,
    /\bEQUIPMENT_TYPES_BY_INK_KIT_CATEGORY\b/,
    'Ink Kit must not translate through a second category taxonomy'
  );
  assert.doesNotMatch(
    collectionBookSource,
    /\bLOOSE\b|FORGE PIECE/,
    'Ink Kit must not restore loose-piece or forge-piece vocabulary'
  );
  assert.doesNotMatch(
    collectionBookSource,
    /\bpieceIndex\b|\bpieceCount\b/,
    'Ink Kit must render aggregate gear records instead of per-copy cards'
  );
  assert.match(
    collectionBookSource,
    /entry\.category === section/,
    'Each gear section must filter the canonical catalog category directly'
  );
  assert.match(
    collectionBookSource,
    /ACTIVE \$\{attachedRankLabel\}/,
    'equipped lead Gear details must show the frozen combat rank'
  );
  assert.match(
    collectionBookSource,
    /SUPPORT \$\{attachedRankLabel\} · BOOSTS/,
    'equipped support Gear details must explain the combined technique'
  );
  assert.doesNotMatch(
    collectionBookSource,
    /GEAR WEEK/,
    'Bag must not add weekly progress copy above the Gear grid'
  );
  assert.doesNotMatch(
    collectionBookSource,
    /gearWeekDay\.challenge/,
    'Bag must not add the daily challenge above the Gear grid'
  );
  assert.match(
    collectionBookSource,
    /gearWeekDay\.featuredGearIds/,
    'Bag must consume the daily featured Gear list'
  );
  assert.match(
    collectionBookSource,
    /data-gear-week-featured/,
    'daily featured Gear must be exposed to the accessible UI'
  );
});

test('gear technique metadata omits retired Edge and Impact families', () => {
  const effectFamilies = Object.keys(accessoryEffects.ACCESSORY_EFFECTS).sort();
  assert.deepEqual(effectFamilies, [
    'aim',
    'focus',
    'fortune',
    'guard',
    'ready',
    'rush',
  ]);
  for (const family of effectFamilies) {
    const familyGear = cosmetics.ACCESSORY_CATALOG_ENTRIES.filter(
      (entry) => entry.effectFamily === family
    );
    assert.ok(
      familyGear.length >= 4,
      `${family} needs at least four Gear choices`
    );
    assert.ok(
      familyGear.some((entry) => entry.rarity === 'common'),
      `${family} needs a Common choice so rarity is not power`
    );
  }
});
