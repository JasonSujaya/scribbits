import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
if (!appRoot) {
  throw new Error(
    'Run equipment loadout UI contracts through scripts/run-test-suites.mjs.'
  );
}

const readClientFile = (...segments) =>
  readFileSync(join(appRoot, 'src', 'client', ...segments), 'utf8');

test('client posts the canonical eight-slot equipment mutation', () => {
  const apiSource = readClientFile('lib', 'api.ts');
  assert.match(apiSource, /export function equipGear\(/);
  assert.match(apiSource, /'\/api\/equip-gear'/);
  for (const requestField of [
    'scribbitId',
    'category',
    'slotIndex',
    'gearId',
  ]) {
    assert.match(apiSource, new RegExp(`\\b${requestField}\\b`));
  }
});

test('Bag presents a staged Scribbit, eight semantic slots, filters, and a scrollable Gear tray', () => {
  const collectionSource = readClientFile('lib', 'collectionbook.ts');
  const inventoryGridSource = readClientFile('lib', 'baginventorygrid.ts');
  const stageIndex = collectionSource.indexOf('buildBagCharacterStage({');
  const filterIndex = collectionSource.indexOf('buildBagFilters(');
  const inventoryIndex = collectionSource.indexOf('mountBagInventoryGrid({');
  assert.ok(stageIndex >= 0, 'Bag renders a dedicated character stage');
  assert.ok(filterIndex > stageIndex, 'filters render below the character stage');
  assert.ok(
    inventoryIndex > filterIndex,
    'the scrollable inventory renders below the filters'
  );
  assert.match(collectionSource, /drawScribbitPlatform/);
  assert.match(collectionSource, /EQUIPMENT_CATEGORIES\.forEach/);
  assert.match(collectionSource, /\(\[0, 1\] as const\)\.forEach/);
  assert.match(collectionSource, /data-equipment-slot/);
  assert.match(collectionSource, /data-equipped-gear-id/);
  assert.doesNotMatch(collectionSource, /× REMOVE/);
  assert.doesNotMatch(collectionSource, /paperPagination/);
  assert.match(collectionSource, /inventory\.gear\[entry\.id\] !== undefined/);
  assert.match(inventoryGridSource, /createGeometryMask\(\)/);
  assert.match(inventoryGridSource, /overflowY:/);
  assert.match(inventoryGridSource, /touchAction: 'pan-y'/);
  assert.match(inventoryGridSource, /scrollViewport\.scrollTop/);
  assert.match(inventoryGridSource, /onScrollOffsetChange\(scrollOffset\)/);
  assert.doesNotMatch(
    collectionSource,
    /\.filter\(\(\{ ownership \}\) => ownership\.copies > 0\)/,
    'zero-copy discovered Gear must remain visible and equippable'
  );
  assert.match(
    collectionSource,
    /slots\[1\] === null \? 1 : null/,
    'a full category must ask for an explicit unequip instead of replacing slot 1'
  );
  assert.doesNotMatch(
    collectionSource,
    /disabled:\s*equipmentBusy \? 'true' : 'false'/,
    'native boolean attributes must not receive the string false'
  );
  assert.match(collectionSource, /actionOverlay\.addStatus\(/);
});

test('Gallery replaces the selected living Scribbit after a successful equip', () => {
  const gallerySource = readClientFile('scenes', 'Gallery.ts');
  assert.match(gallerySource, /private collectionScrollOffset = 0/);
  assert.doesNotMatch(gallerySource, /collectionPage/);
  assert.match(gallerySource, /private async updateEquipmentSlot\(/);
  assert.match(gallerySource, /setArena\(this, \{/);
  assert.match(
    gallerySource,
    /scribbit\.id === result\.data\.id \? result\.data : scribbit/
  );
});
