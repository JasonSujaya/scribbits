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
    "EquipmentCategory | 'styles'",
    'gear sections must use the canonical categories while styles remain separate'
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
});

test('gear style metadata omits retired Edge and Impact families', () => {
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
    assert.equal(
      cosmetics.ACCESSORY_CATALOG_ENTRIES.filter(
        (entry) => entry.effectFamily === family
      ).length,
      4
    );
  }
});
