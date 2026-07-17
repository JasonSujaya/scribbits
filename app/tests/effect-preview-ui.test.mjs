import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const collectionSource = await readFile(
  new URL('../src/client/lib/collectionbook.ts', import.meta.url),
  'utf8'
);
const detailSource = await readFile(
  new URL('../src/client/lib/detailmodal.ts', import.meta.url),
  'utf8'
);
const gearPreviewSource = await readFile(
  new URL('../src/client/lib/featuredgeardetail.ts', import.meta.url),
  'utf8'
);
const powerUpPreviewSource = await readFile(
  new URL('../src/client/lib/powerupeffectpreview.ts', import.meta.url),
  'utf8'
);
const sandboxSource = await readFile(
  new URL('../src/client/lib/sandboxbattlepreview.ts', import.meta.url),
  'utf8'
);
const visualAssetsSource = await readFile(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);

test('Bag exposes an optional eye preview only for weapon Gear', () => {
  assert.match(
    collectionSource,
    /entry\.kind === 'accessory' && entry\.category === 'weapon'/
  );
  assert.match(collectionSource, /data-gear-effect-preview/);
  assert.match(collectionSource, /'eye'/);
  assert.match(collectionSource, /openFeaturedGearDetail/);
  assert.match(gearPreviewSource, /LIVE TRAINING LOOP/);
  assert.match(gearPreviewSource, /createSandboxBattlePreview/);
  assert.match(collectionSource, /selectedScribbit/);
});

test('discovered Power-Ups expose an optional eye preview in the guide', () => {
  assert.match(detailSource, /data-power-up-effect-preview/);
  assert.match(detailSource, /openSelectedPowerUpPreview/);
  assert.match(detailSource, /discoveredPowerUpIds\.has\(selectedPowerUpId\)/);
  assert.match(detailSource, /paperIconButton\([\s\S]*?'eye'/);
  assert.match(powerUpPreviewSource, /LIVE TRAINING LOOP/);
  assert.match(powerUpPreviewSource, /POWER_UP_CATALOG\[powerUpId\]/);
  assert.match(powerUpPreviewSource, /createSandboxBattlePreview/);
  assert.match(detailSource, /selectedPowerUpId,[\s\S]*?scribbit,/);
});

test('effect previews fight a generated dummy without rewards or persistence', () => {
  assert.match(sandboxSource, /new LiveSprite/);
  assert.match(sandboxSource, /BATTLE_DUMMY_TEXTURE/);
  assert.match(sandboxSource, /TRAINING DUMMY/);
  assert.match(sandboxSource, /LIVE MINI BATTLE/);
  assert.match(sandboxSource, /LOOP_DURATION_MILLISECONDS = 6_200/);
  assert.match(sandboxSource, /runWeaponMovie/);
  assert.match(sandboxSource, /runIncomingPowerUpMovie/);
  assert.match(sandboxSource, /runOutgoingPowerUpMovie/);
  assert.match(sandboxSource, /fighterSprite\.lunge/);
  assert.match(sandboxSource, /dummyAttack/);
  assert.match(sandboxSource, /showFloatingRead/);
  assert.match(sandboxSource, /PREVIEW ONLY · 0 XP · NOTHING SAVED/);
  assert.doesNotMatch(sandboxSource, /fetch\(|\/api\//);
  assert.match(visualAssetsSource, /battle-dummy\.webp/);
});
