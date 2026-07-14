import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const detailSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'detailmodal.ts'),
  'utf8'
);

test('Scribbit details show a five-slot icon-first Power-Up build', () => {
  assert.match(
    detailSource,
    /POWER-UPS \$\{ownedPowerUpIds\.length\}\/\$\{MAXIMUM_POWER_UPS\}/
  );
  assert.match(detailSource, /POWER_UP_ICONS\[powerUpId\]/);
  assert.match(detailSource, /slotIndex < MAXIMUM_POWER_UPS/);
  assert.match(detailSource, /TAP TO SEE ALL/);
  assert.doesNotMatch(
    detailSource,
    /Ink Mods|INK MODS|'YOUR ELEMENT'|elementBadge|ELEMENT_PAYLOAD_GUIDE/
  );
});

test('Power-Up guide divides build, catalog, and rewards into three pages', () => {
  assert.match(detailSource, /'YOUR BUILD'/);
  assert.match(detailSource, /'POWER-UP CATALOG'/);
  assert.match(detailSource, /'WIN → CHOOSE 1'/);
  assert.match(
    detailSource,
    /const guidePages = \[buildPage, catalogPage, earnPage\]/
  );
  assert.match(detailSource, /POWER_UP_IDS\.forEach/);
  assert.match(detailSource, /STANDARD WIN/);
  assert.match(detailSource, /CHAMPION WIN/);
  assert.match(detailSource, /LOSS = NO POWER-UP/);
});

test('catalog icons expose keyboard-readable effect controls', () => {
  assert.match(
    detailSource,
    /label: `\$\{definition\.name\}, \$\{rarity\.label\}\. \$\{definition\.description\}/
  );
  assert.match(detailSource, /catalogControls\.forEach/);
  assert.match(detailSource, /control\.hidden = !visible/);
  assert.match(detailSource, /control\.disabled = !visible/);
  assert.match(detailSource, /catalogControls\[0\]\?\.focus\(\)/);
});
