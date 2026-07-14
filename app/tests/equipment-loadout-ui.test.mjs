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
  const cosmeticPreviewSource = readClientFile('lib', 'cosmeticpreview.ts');
  const inventoryGridSource = readClientFile('lib', 'baginventorygrid.ts');
  const raritySource = readClientFile('lib', 'bagrarity.ts');
  const overlaySource = readClientFile('lib', 'overlay.ts');
  const cardSource = collectionSource.slice(
    collectionSource.indexOf('function buildCosmeticCard('),
    collectionSource.indexOf('function openCosmeticDetail(')
  );
  const detailSource = collectionSource.slice(
    collectionSource.indexOf('function openCosmeticDetail(')
  );
  const characterStageSource = collectionSource.slice(
    collectionSource.indexOf('function buildBagCharacterStage('),
    collectionSource.indexOf('function summaryToneColor(')
  );
  const stageIndex = collectionSource.indexOf('buildBagCharacterStage({');
  const filterIndex = collectionSource.indexOf('buildBagFilters(');
  const inventoryIndex = collectionSource.indexOf('mountBagInventoryGrid({');
  assert.ok(stageIndex >= 0, 'Bag renders a dedicated character stage');
  assert.ok(
    filterIndex > stageIndex,
    'filters render below the character stage'
  );
  assert.ok(
    inventoryIndex > filterIndex,
    'the scrollable inventory renders below the filters'
  );
  assert.match(collectionSource, /drawScribbitPlatform/);
  assert.match(collectionSource, /const BAG_GEAR_TILE_SIZE = 120/);
  assert.match(collectionSource, /cardColumns: 4/);
  assert.match(collectionSource, /inventoryPanelMargin: 18/);
  assert.match(collectionSource, /inventoryContentMargin: 42/);
  assert.match(collectionSource, /cardGap: 18/);
  assert.match(collectionSource, /cardRowGap: 20/);
  assert.match(collectionSource, /cardHeight: BAG_GEAR_TILE_SIZE/);
  assert.match(collectionSource, /filterOffset: 640/);
  assert.match(collectionSource, /inventoryTopOffset: 736/);
  assert.match(collectionSource, /inventoryViewportHeaderHeight: 70/);
  assert.doesNotMatch(collectionSource, /`GEAR WEEK/);
  assert.doesNotMatch(collectionSource, /gearWeekDay\.challenge/);
  assert.match(
    collectionSource,
    /fitDrawing\(scene\.add\.image\(0, 0, textureKey\), 320\)/
  );
  assert.match(
    collectionSource,
    /BAG_GEAR_PREVIEW_BOX = Object\.freeze\(\{[\s\S]*width: 88,[\s\S]*height: 82/
  );
  assert.equal(
    (collectionSource.match(/\.\.\.BAG_GEAR_PREVIEW_BOX/g) ?? []).length,
    2,
    'equipped and inventory Gear must use the same preview box'
  );
  assert.equal(
    (collectionSource.match(/size: 104,/g) ?? []).length,
    2,
    'equipped and inventory Gear must start from the same authored size'
  );
  assert.doesNotMatch(
    collectionSource,
    /BAG_(?:ITEM|SLOT)_PREVIEW_BOX/,
    'parallel preview sizes would make equipped and inventory icons drift again'
  );
  assert.match(
    characterStageSource,
    /scene\.add\.container\(width \/ 2, centerY\)/
  );
  assert.doesNotMatch(
    characterStageSource,
    /stickerCard\(/,
    'the character stage should float directly on the screen without a parent paper card'
  );
  assert.match(cosmeticPreviewSource, /fitCosmeticPreviewBounds\(/);
  assert.match(collectionSource, /EQUIPMENT_CATEGORIES\.forEach/);
  assert.match(collectionSource, /\(\[0, 1\] as const\)\.forEach/);
  assert.match(collectionSource, /data-equipment-slot/);
  assert.match(collectionSource, /data-equipped-gear-id/);
  assert.match(collectionSource, /data-equipped-gear-rarity/);
  assert.doesNotMatch(collectionSource, /× REMOVE/);
  assert.doesNotMatch(collectionSource, /paperPagination/);
  assert.match(collectionSource, /inventory\.gear\[entry\.id\] !== undefined/);
  assert.match(inventoryGridSource, /viewportFilterList\.addMask/);
  assert.match(inventoryGridSource, /createGeometryMask\(\)/);
  assert.match(
    inventoryGridSource,
    /scene\.game\.renderer\.type === Phaser\.WEBGL/
  );
  assert.match(inventoryGridSource, /overflowY:/);
  assert.match(inventoryGridSource, /touchAction: 'pan-y'/);
  assert.match(inventoryGridSource, /scrollViewport\.scrollTop/);
  assert.match(inventoryGridSource, /onScrollOffsetChange\(scrollOffset\)/);
  assert.doesNotMatch(inventoryGridSource, /detailAction|DETAIL_TARGET_SIZE/);
  assert.match(cardSource, /createBagGearTile\(/);
  assert.equal(
    (collectionSource.match(/createBagGearTile\(/g) ?? []).length,
    3,
    'one shared renderer must define and draw both equipped and inventory outer squares'
  );
  assert.match(cardSource, /renderCosmeticPreview\(/);
  assert.match(cardSource, /onActivate: openDetail/);
  assert.match(cardSource, /data-ink-kit-entry-rarity/);
  assert.match(cardSource, /data-ink-kit-entry-rank/);
  assert.doesNotMatch(cardSource, /gearRankStars\(/);
  assert.doesNotMatch(
    cardSource,
    /rarityLabel|ownershipLabel|compactOwnershipSummary|const name = label/
  );
  assert.match(detailSource, /gearRankStars\(scene, detail/);
  assert.match(detailSource, /data-gear-detail-equip/);
  assert.match(detailSource, /data-gear-detail-forge/);
  assert.match(detailSource, /EQUIP TO SLOT/);
  assert.match(detailSource, /UNEQUIP SLOT/);
  assert.match(raritySource, /common:[\s\S]*color: 0xa56724/);
  assert.match(raritySource, /rare:[\s\S]*color: 0x0f88bc/);
  assert.match(raritySource, /epic:[\s\S]*color: 0x8340bd/);
  assert.match(raritySource, /strokeWidth: 7/);
  assert.match(raritySource, /strokeWidth: 8/);
  assert.doesNotMatch(collectionSource, /\.setAngle\(index % 2/);
  assert.match(
    collectionSource,
    /GEAR_SECTION_PRESENTATION\[category\]\.icon[\s\S]*size: 36,[\s\S]*fill: UI\.inkHex/
  );
  assert.match(inventoryGridSource, /Math\.round\(x \+ cardWidth \/ 2\)/);
  assert.match(inventoryGridSource, /data-scrollable/);
  assert.match(inventoryGridSource, /data-scroll-maximum/);
  assert.match(inventoryGridSource, /maximumScroll > 0 \? 0\.3 : 0\.16/);
  assert.match(inventoryGridSource, /maximumScroll > 0 \? 0\.95 : 0\.42/);
  assert.match(collectionSource, /selectedFrame\.lineStyle\(4, UI\.coral, 1\)/);
  assert.match(collectionSource, /const UNEQUIPPED_GEAR_TILE_COLOR = 0xd6d4cf/);
  assert.match(
    cardSource,
    /entry\.kind === 'accessory' && equippedSlots\.length === 0/
  );
  assert.match(
    collectionSource,
    /mutedBackground \? UNEQUIPPED_GEAR_TILE_COLOR : UI\.paper/
  );
  assert.match(
    overlaySource,
    /const modalRoot = this\.actionOverlay\.rootForOrdering\(\)[\s\S]*modalRoot\.remove\(\)/,
    'modal teardown must remove its native root before a scene rebuild can orphan it'
  );
  assert.match(overlaySource, /static destroyDialogs\(\): void/);
  assert.match(overlaySource, /static destroyAll\(\): void/);
  assert.doesNotMatch(
    collectionSource,
    /\.filter\(\(\{ ownership \}\) => ownership\.copies > 0\)/,
    'zero-copy discovered Gear must remain visible and equippable'
  );
  assert.match(
    collectionSource,
    /gearSlots\[1\] === null[\s\S]*\? 1[\s\S]*: null/,
    'a full category must ask for an explicit unequip instead of replacing slot 1'
  );
  assert.doesNotMatch(
    collectionSource,
    /disabled:\s*equipmentBusy \? 'true' : 'false'/,
    'native boolean attributes must not receive the string false'
  );
  assert.match(collectionSource, /actionOverlay\.addStatus\(/);
  assert.match(
    collectionSource,
    /inventoryBottom = height - BAG_LAYOUT\.inventoryBottomMargin/
  );
  assert.match(
    collectionSource,
    /inventoryPanelHeight - BAG_LAYOUT\.inventoryViewportHeaderHeight/
  );
  assert.match(collectionSource, /function buildLoadoutEffectsSummary\(/);
  assert.match(collectionSource, /data-loadout-effects-summary/);
  assert.match(collectionSource, /function openLoadoutEffectsDetail\(/);
  assert.match(collectionSource, /const detailHeight = height - 108/);
});

test('Bag replaces the selected living Scribbit after a successful equip', () => {
  const gallerySource = readClientFile('scenes', 'Gallery.ts');
  assert.match(
    gallerySource,
    /private build\(\): void \{[\s\S]*CanvasModalOverlay\.destroyAll\(\)/
  );
  assert.match(gallerySource, /private collectionScrollOffset = 0/);
  assert.doesNotMatch(gallerySource, /collectionPage/);
  assert.match(gallerySource, /private async updateEquipmentSlot\(/);
  assert.match(gallerySource, /setArena\(this, \{/);
  assert.match(
    gallerySource,
    /scribbit\.id === updatedScribbit\.id \? updatedScribbit : scribbit/
  );
});
