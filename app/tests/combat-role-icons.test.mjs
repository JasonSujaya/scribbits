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
const detailSource = await readFile(
  new URL('../src/client/lib/detailmodal.ts', import.meta.url),
  'utf8'
);
const appMenuSource = await readFile(
  new URL('../src/client/lib/appmenu.ts', import.meta.url),
  'utf8'
);
const fighterGuidePopupSource = await readFile(
  new URL('../src/client/lib/fighterguidepopup.ts', import.meta.url),
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
  assert.match(roleSource, /mage:[\s\S]*?icon: 'spark'/);
  assert.match(roleSource, /LEGACY_GUNNER_CONTENT[\s\S]*?icon: 'gun'/);

  for (const source of [
    drawSource,
    bestiarySource,
    fighterGuidePopupSource,
    battlesSource,
    rivalDraftSource,
  ]) {
    assert.match(
      source,
      /getCombatRoleContent\([^)]+\)\.icon|(?:content|roleContent)\.icon/
    );
    assert.doesNotMatch(source, /function (?:fighterStyleIconKey|roleIconKey)/);
    assert.doesNotMatch(source, /ROLE_GUIDE_ICON/);
  }
});

test('newborn reveal and character info reuse the canonical role icon', () => {
  assert.match(
    drawSource,
    /private revealCard\([\s\S]*?const combatRole = getCombatRoleContent\(combatRoleId\);[\s\S]*?paperIcon\(\s*this,\s*combatRole\.icon,/
  );
  assert.match(
    detailSource,
    /const roleBand = scene\.add\.graphics\(\);[\s\S]*?card\.add\(\s*paperIcon\(\s*scene,\s*combatRole\.icon,/
  );
  assert.match(
    detailSource,
    /icon: combatRole\.icon,[\s\S]*?title: 'ROLE = YOUR DRAWING'/
  );
  assert.doesNotMatch(detailSource, /paperStatIcon/);
});

test('the fighter guide opens as a complete matchup popup', () => {
  assert.match(appMenuSource, /openFighterGuidePopup\(/);
  assert.match(fighterGuidePopupSource, /popupLayer/);
  assert.match(fighterGuidePopupSource, /new CanvasModalOverlay\(/);
  assert.match(fighterGuidePopupSource, /COMBAT_ROLE_IDS\.forEach/);
  assert.match(
    fighterGuidePopupSource,
    /`BEATS \$\{beatenRole\.displayName\.toUpperCase\(\)\}`/
  );
  assert.match(
    fighterGuidePopupSource,
    /`WEAK TO \$\{counter\.displayName\.toUpperCase\(\)\}`/
  );
  assert.match(fighterGuidePopupSource, /ROLE_STYLES\[role\]/);
  assert.match(
    fighterGuidePopupSource,
    /translate\('appMenu\.openMoreRules'\)/
  );
});
