import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const detailSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'detailmodal.ts'),
  'utf8'
);
const paperIconsSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'papericons.ts'),
  'utf8'
);
const powerUpDraftSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'powerupdraft.ts'),
  'utf8'
);
const mockSource = readFileSync(
  join(process.cwd(), 'scripts', 'dev-mock.mjs'),
  'utf8'
);

test('Scribbit details show a five-slot icon-first Power-Up build', () => {
  assert.match(
    detailSource,
    /POWER-UPS \$\{ownedPowerUpIds\.length\}\/\$\{MAXIMUM_POWER_UPS\}/
  );
  assert.match(detailSource, /powerUpPaperIcon\(scene, powerUpId/);
  assert.match(detailSource, /slotIndex < MAXIMUM_POWER_UPS/);
  assert.match(detailSource, /TAP TO SEE ALL/);
  assert.doesNotMatch(
    detailSource,
    /Ink Mods|INK MODS|'YOUR ELEMENT'|elementBadge|ELEMENT_PAYLOAD_GUIDE/
  );
});

test('every Power-Up owns a distinct code-native paper icon', () => {
  const powerUpIds = [
    'v1-edge-spring',
    'v1-smudge-step',
    'v1-paper-shield',
    'v1-combo-spark',
    'v1-center-fold',
    'v1-double-doodle',
    'v1-backup-plan',
    'v1-counter-sketch',
    'v1-wallop',
    'v1-echo-mark',
    'v1-last-scribble',
    'v1-second-draft',
    'v1-paper-twin',
    'v1-masterpiece',
  ];
  assert.match(paperIconsSource, /export function powerUpPaperIcon\(/);
  powerUpIds.forEach((powerUpId) => {
    assert.match(paperIconsSource, new RegExp(`key === '${powerUpId}'`));
  });
  assert.match(paperIconsSource, /setData\('power-up-id', key\)/);
  assert.match(paperIconsSource, /graphics\.arc\(-7 \* scale/);
});

test('Power-Up choices react to hover and press without forcing motion', () => {
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerenter'/);
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerleave'/);
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerdown'/);
  assert.match(
    powerUpDraftSource,
    /control\.addEventListener\('pointercancel'/
  );
  assert.match(powerUpDraftSource, /canvasFocusIsKeyboardDriven/);
  assert.match(powerUpDraftSource, /hoverShadow\.setFillStyle/);
  assert.match(powerUpDraftSource, /const rareRail = scene\.add\.rectangle/);
  assert.match(powerUpDraftSource, /const rareIconBacking = scene\.add\.circle/);
  assert.match(powerUpDraftSource, /const legendaryIconHalo = scene\.add\.star/);
  assert.match(powerUpDraftSource, /const legendaryGlint = scene\.add\.star/);
  assert.match(powerUpDraftSource, /drawRarityChip/);
  assert.doesNotMatch(powerUpDraftSource, /name\.setColor/);
  assert.doesNotMatch(powerUpDraftSource, /tweens\.chain/);
  assert.match(powerUpDraftSource, /if \(hovered\) return/);
  assert.match(powerUpDraftSource, /if \(reduceMotion\)/);
});

test('Power-Up guide divides the rarity catalog across five focused pages', () => {
  assert.match(detailSource, /'YOUR BUILD'/);
  assert.match(detailSource, /'COMMON POWER-UPS'/);
  assert.match(detailSource, /'RARE POWER-UPS'/);
  assert.match(detailSource, /'EPIC \+ LEGENDARY'/);
  assert.match(detailSource, /'WIN → CHOOSE 1'/);
  assert.match(
    detailSource,
    /const guidePages = \[buildPage, \.\.\.catalogPages, earnPage\]/
  );
  assert.match(detailSource, /POWER_UP_GUIDE_PAGE_COUNT = 5/);
  assert.match(detailSource, /section\.ids\.forEach/);
  assert.match(detailSource, /CHARCOAL CARDS/);
  assert.match(detailSource, /BLUE CARDS/);
  assert.match(detailSource, /PURPLE = EPIC · GOLD = LEGENDARY/);
  assert.match(detailSource, /STANDARD WIN/);
  assert.match(detailSource, /CHAMPION WIN/);
  assert.match(detailSource, /LOSS = NO POWER-UP/);
});

test('catalog renders collectible Power-Up cards and hides undiscovered effects', () => {
  assert.match(detailSource, /collectDiscoveredPowerUpIds/);
  assert.match(detailSource, /LOCKED_POWER_UP_FILL = 0xd4c7ae/);
  assert.match(detailSource, /const featuredCardHeight = 570/);
  assert.match(detailSource, /const renderFeaturedPowerUp =/);
  assert.match(detailSource, /const renderSelectors =/);
  assert.match(detailSource, /'UNDISCOVERED'/);
  assert.match(detailSource, /paperIcon\(scene, 'lock'/);
  assert.match(detailSource, /size: 112,[\s\S]*?fill: rarity\.color/);
  assert.match(detailSource, /definition\.shortName,[\s\S]*?30,/);
  assert.match(detailSource, /definition\.when,[\s\S]*?21,/);
  assert.match(detailSource, /definition\.effect,[\s\S]*?23,/);
  assert.match(detailSource, /onActivate: \(\) => renderFeaturedPowerUp/);
  assert.doesNotMatch(detailSource, /const catalogCardHeight/);
  assert.doesNotMatch(detailSource, /`WHEN  \$\{definition\.when\}`/);
  assert.doesNotMatch(detailSource, /`THEN  \$\{definition\.effect\}`/);
  assert.doesNotMatch(
    detailSource,
    /'MYSTERY POWER-UP'|'WIN BATTLES TO FIND IT'|Choose it after a win/
  );
  assert.match(
    detailSource,
    /Undiscovered \$\{rarity\.label\} Power-Up\. Win battles and choose it to reveal its effect\./
  );
  assert.match(detailSource, /catalogControlsByPage\.forEach/);
  assert.match(detailSource, /control\.hidden = !visible/);
  assert.match(detailSource, /control\.disabled = !visible/);
  assert.match(
    detailSource,
    /catalogControlsByPage\[safePageIndex - 1\]\?\.\[0\]\?\.focus\(\)/
  );
  assert.match(mockSource, /powerUpIds: \['v1-edge-spring'\]/);
  assert.match(mockSource, /discoveredPowerUpIds:/);
});
