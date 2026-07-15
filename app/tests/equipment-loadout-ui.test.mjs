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

test('Bag presents the mobile Binder, character details, eight slots, and separate Gear and Draw Kit trays', () => {
  const collectionSource = readClientFile('lib', 'collectionbook.ts');
  const gallerySource = readClientFile('scenes', 'Gallery.ts');
  const cosmeticPreviewSource = readClientFile('lib', 'cosmeticpreview.ts');
  const inventoryGridSource = readClientFile('lib', 'baginventorygrid.ts');
  const raritySource = readClientFile('lib', 'bagrarity.ts');
  const overlaySource = readClientFile('lib', 'overlay.ts');
  const visualAssetsSource = readClientFile('lib', 'visualassets.ts');
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
  assert.match(collectionSource, /drawScribbitNamePlate/);
  assert.match(collectionSource, /createEquipmentPanelHeader/);
  assert.match(collectionSource, /const BAG_GEAR_TILE_SIZE = 120/);
  assert.match(collectionSource, /const BAG_EQUIPMENT_SLOT_SIZE = 84/);
  assert.match(collectionSource, /const BAG_EQUIPMENT_SLOT_HIT_WIDTH = 90/);
  assert.match(collectionSource, /const BAG_BINDER_WIDTH = 680/);
  assert.match(collectionSource, /const BAG_BINDER_HEIGHT = 1250/);
  assert.match(collectionSource, /const BAG_BINDER_SOURCE_HEIGHT = 1085/);
  assert.match(collectionSource, /binderOffsetY/);
  assert.match(collectionSource, /const afterBagPress/);
  assert.match(collectionSource, /const BAG_COMPACT_CARD_SCALE = 0\.54/);
  assert.match(collectionSource, /const BAG_COMPACT_SLOT_SIZE = 65/);
  assert.match(collectionSource, /cardColumns: 4/);
  assert.match(collectionSource, /inventoryPanelMargin: 18/);
  assert.match(collectionSource, /inventoryContentMargin: 42/);
  assert.match(collectionSource, /cardGap: 18/);
  assert.match(collectionSource, /cardRowGap: 20/);
  assert.match(collectionSource, /cardHeight: BAG_GEAR_TILE_SIZE/);
  assert.match(collectionSource, /filterGap: 50/);
  assert.match(collectionSource, /expandedFilterOffset: 165/);
  assert.match(collectionSource, /inventoryGap: 78/);
  assert.match(collectionSource, /inventoryViewportHeaderHeight: 100/);
  assert.match(collectionSource, /function planBagLayout\(/);
  assert.match(collectionSource, /if \(layout\.showBinder\)/);
  assert.match(collectionSource, /SHOW BINDER ↓/);
  assert.match(collectionSource, /EXPAND ↑/);
  assert.match(collectionSource, /data-bag-inventory-expanded/);
  assert.match(collectionSource, /'aria-expanded'/);
  assert.doesNotMatch(collectionSource, /`GEAR WEEK/);
  assert.doesNotMatch(collectionSource, /gearWeekDay\.challenge/);
  assert.match(
    collectionSource,
    /fitDrawing\(scene\.add\.image\(0, 0, textureKey\), 280\)/
  );
  assert.match(
    collectionSource,
    /BAG_GEAR_PREVIEW_BOX = Object\.freeze\(\{[\s\S]*width: 88,[\s\S]*height: 82/
  );
  assert.equal(
    (collectionSource.match(/: BAG_GEAR_PREVIEW_BOX\)/g) ?? []).length,
    1,
    'inventory Gear uses the canonical preview box directly'
  );
  assert.match(
    collectionSource,
    /BAG_GEAR_PREVIEW_BOX\.width \* BAG_EQUIPMENT_SLOT_SIZE/
  );
  assert.match(
    collectionSource,
    /BAG_GEAR_PREVIEW_BOX\.height \* BAG_EQUIPMENT_SLOT_SIZE/
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
  assert.match(
    characterStageSource,
    /image\(0, 0, BAG_BINDER_SHELL_TEXTURE\)[\s\S]*setDisplaySize\(BAG_BINDER_WIDTH, BAG_BINDER_HEIGHT\)/
  );
  assert.match(visualAssetsSource, /bag-binder-base-shell-v7\.webp/);
  assert.match(
    characterStageSource,
    /emptyBinderPrompt[\s\S]*DRAW A\\nSCRIBBIT\\nTO START\\nYOUR BINDER/
  );
  assert.doesNotMatch(characterStageSource, /binder\.fillRoundedRect/);
  assert.match(collectionSource, /function addReusableBinderPanel\(/);
  assert.match(collectionSource, /function addReusableBinderRing\(/);
  assert.match(collectionSource, /function buildCompactBagInventory\(/);
  assert.match(collectionSource, /BAG_COMPACT_SLOT_X/);
  assert.match(collectionSource, /sideTabs: true/);
  assert.match(collectionSource, /data-ink-kit-section/);
  assert.match(characterStageSource, /CHANGE SCRIBBIT/);
  assert.match(characterStageSource, /const portraitY = binderOffsetY\(-320\)/);
  assert.match(characterStageSource, /const selectorArrowX = 200/);
  assert.match(
    characterStageSource,
    /paperArrowButton\([\s\S]*?'previous'[\s\S]*?paperArrowButton\([\s\S]*?'next'/
  );
  assert.doesNotMatch(characterStageSource, /ELEMENT ·/);
  assert.doesNotMatch(characterStageSource, /ROLE ·/);
  assert.doesNotMatch(characterStageSource, /MATERIAL ·/);
  assert.doesNotMatch(characterStageSource, /MATURITY ·/);
  assert.doesNotMatch(characterStageSource, /CHONK/);
  assert.doesNotMatch(characterStageSource, /SPIKE/);
  assert.doesNotMatch(characterStageSource, /ZIP/);
  assert.doesNotMatch(characterStageSource, /CHARM/);
  assert.match(characterStageSource, /data-selected-scribbit-name/);
  assert.match(characterStageSource, /data-selected-scribbit-element/);
  assert.match(characterStageSource, /data-selected-scribbit-maturity/);
  assert.match(characterStageSource, /data-selected-scribbit-theme/);
  assert.match(collectionSource, /data-bag-mode/);
  assert.match(collectionSource, /'draw-kit', label: 'DRAW KIT'/);
  assert.match(collectionSource, /'colors', label: 'COLORS'/);
  assert.match(collectionSource, /'brushes', label: 'BRUSHES'/);
  assert.match(collectionSource, /'titles', label: 'TITLES'/);
  assert.match(collectionSource, /SELECT WHILE DRAWING/);
  assert.match(collectionSource, /PERMANENT · ∞ USES/);
  assert.match(collectionSource, /×\$\{charges\} · 1 USE EACH/);
  assert.match(collectionSource, /EMPTY · FIND MORE IN MYSTERY INK/);
  assert.match(cardSource, /entry\.name\.toUpperCase\(\)/);
  assert.match(cardSource, /const quantityText/);
  assert.match(cardSource, /emptySupply/);
  assert.match(cosmeticPreviewSource, /fitCosmeticPreviewBounds\(/);
  assert.match(collectionSource, /EQUIPMENT_CATEGORIES\.forEach/);
  assert.match(collectionSource, /\(\[0, 1\] as const\)\.forEach/);
  assert.match(collectionSource, /data-equipment-slot/);
  assert.match(collectionSource, /data-equipped-gear-id/);
  assert.match(collectionSource, /data-equipped-gear-rarity/);
  assert.match(collectionSource, /addEmptyEquipmentSlotPrompt/);
  assert.match(
    characterStageSource,
    /selectedEquipmentSlot\?\.category === category[\s\S]*selectedEquipmentSlot\.slotIndex === slotIndex/
  );
  assert.match(collectionSource, /const selectedOpenGearSlotIndex/);
  assert.match(
    gallerySource,
    /onEquipmentSlotSelect:[\s\S]*this\.selectedEquipmentSlot = \{ category, slotIndex \};[\s\S]*this\.collectionInventoryExpanded = true/
  );
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
    5,
    'one shared renderer must define and draw empty, equipped, and inventory outer squares'
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
  assert.match(raritySource, /legendary:[\s\S]*color: 0xb52e5d/);
  assert.match(raritySource, /strokeWidth: 7/);
  assert.match(raritySource, /strokeWidth: 8/);
  assert.doesNotMatch(collectionSource, /\.setAngle\(index % 2/);
  assert.match(
    collectionSource,
    /function addEmptyEquipmentSlotPrompt[\s\S]*available \? '\+' : '—'[\s\S]*'EMPTY'/
  );
  assert.match(inventoryGridSource, /Math\.round\(x \+ cardWidth \/ 2\)/);
  assert.match(inventoryGridSource, /data-scrollable/);
  assert.match(inventoryGridSource, /data-scroll-maximum/);
  assert.match(inventoryGridSource, /maximumScroll > 0 \? 0\.3 : 0\.16/);
  assert.match(inventoryGridSource, /maximumScroll > 0 \? 0\.95 : 0\.42/);
  assert.match(
    collectionSource,
    /selectedFrame\.lineStyle\(Math\.max\(2, 4 \* scale\), UI\.coral, 1\)/
  );
  assert.match(collectionSource, /const UNEQUIPPED_GEAR_TILE_COLOR = 0xd6d4cf/);
  assert.match(
    cardSource,
    /entry\.kind === 'accessory' && equippedSlots\.length === 0/
  );
  assert.match(
    collectionSource,
    /emptyBackground[\s\S]*\? UI\.paper[\s\S]*UNEQUIPPED_GEAR_TILE_COLOR/
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
    /inventoryBottom: height - NAV_SAFE - BAG_LAYOUT\.inventoryBottomGap/
  );
  assert.doesNotMatch(collectionSource, /Math\.max\(260,/);
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
  assert.match(gallerySource, /private collectionInventoryExpanded = false/);
  assert.match(
    gallerySource,
    /inventoryExpanded: this\.collectionInventoryExpanded/
  );
  assert.match(gallerySource, /onInventoryExpandedChange: \(expanded\) =>/);
  assert.doesNotMatch(gallerySource, /renderDrawChargeInventory/);
  assert.doesNotMatch(gallerySource, /DRAW CHARGES|PAINT BUCKET/);
  assert.doesNotMatch(gallerySource, /collectionPage/);
  assert.match(gallerySource, /private async updateEquipmentSlot\(/);
  assert.match(gallerySource, /setArena\(this, \{/);
  assert.match(
    gallerySource,
    /scribbit\.id === updatedScribbit\.id \? updatedScribbit : scribbit/
  );
});
