import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const roleSource = await readFile(
  new URL('../src/shared/combat/roles.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const bestiarySource = await readFile(
  new URL('../src/client/scenes/Bestiary.ts', import.meta.url),
  'utf8'
);
const battlesSource = await readFile(
  new URL('../src/client/scenes/MyBattles.ts', import.meta.url),
  'utf8'
);
const rivalDraftSource = await readFile(
  new URL('../src/client/lib/replaysparrivaldraft.ts', import.meta.url),
  'utf8'
);

test('combat role content owns the canonical fighter-style icons', () => {
  assert.match(roleSource, /brawler:[\s\S]*?icon: 'sword'/);
  assert.match(roleSource, /longshot:[\s\S]*?icon: 'target'/);
  assert.match(roleSource, /gunner:[\s\S]*?icon: 'gun'/);
  assert.match(roleSource, /mage:[\s\S]*?icon: 'spark'/);

  for (const source of [
    drawSource,
    bestiarySource,
    battlesSource,
    rivalDraftSource,
  ]) {
    assert.match(source, /getCombatRoleContent\([^)]+\)\.icon|content\.icon/);
    assert.doesNotMatch(source, /function (?:fighterStyleIconKey|roleIconKey)/);
    assert.doesNotMatch(source, /ROLE_GUIDE_ICON/);
  }
});
