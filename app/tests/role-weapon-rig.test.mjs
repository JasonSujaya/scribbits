import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const liveSpriteSource = await readFile(
  new URL('../src/client/lib/livesprite.ts', import.meta.url),
  'utf8'
);
const rigSource = await readFile(
  new URL('../src/client/lib/roleweaponrig.ts', import.meta.url),
  'utf8'
);
const actionRendererSource = await readFile(
  new URL('../src/client/lib/roleweaponrenderer.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);

test('permanent role weapons live inside the LiveSprite pose hierarchy', () => {
  assert.match(liveSpriteSource, /rearRoleWeaponLayer/);
  assert.match(liveSpriteSource, /frontRoleWeaponLayer/);
  assert.match(
    liveSpriteSource,
    /this\.poseContainer\.add\(this\.rearRoleWeaponLayer\)[\s\S]*?this\.createHitFlash\([\s\S]*?this\.poseContainer\.add\(this\.frontRoleWeaponLayer\)/
  );
  assert.match(liveSpriteSource, /createAttachedRoleWeapon\(/);
  assert.match(liveSpriteSource, /triggerRoleWeaponAttack\(/);
});

test('equipped weapon art replaces the generated role starter prop', () => {
  assert.match(rigSource, /hasEquippedWeaponArt/);
  assert.match(rigSource, /heldWeapon\.textureKey/);
  assert.match(rigSource, /heldWeapon\.frame/);
  assert.match(rigSource, /starterWeaponTextureForRole/);
  assert.match(rigSource, /STARTER_MOUNTS/);
  assert.match(rigSource, /EQUIPPED_WEAPON_MOUNTS/);
  assert.match(rigSource, /inkquake-rumble-belt/);
  assert.match(rigSource, /drawLegacyBlaster/);
  assert.doesNotMatch(rigSource, /drawInkFist/);
  assert.doesNotMatch(rigSource, /drawQuillLauncher/);
  assert.doesNotMatch(rigSource, /drawPaletteBrush/);
});

test('world-space action marks stay separate from attached weapon silhouettes', () => {
  assert.doesNotMatch(
    actionRendererSource,
    /weapon: Phaser\.GameObjects\.Graphics/
  );
  assert.doesNotMatch(actionRendererSource, /drawWeapon\(/);
  assert.match(
    actionRendererSource,
    /World-space attack marks kept separate from LiveSprite's attached weapon/
  );
  assert.match(actionRendererSource, /attack === 'color_bolt'/);
  assert.match(actionRendererSource, /attack === 'piercing_quill'/);
});

test('replay mounts and recoils the attached prop from authoritative role events', () => {
  assert.match(
    replaySource,
    /combatRole:[\s\S]*?this\.transcript\.version >= 4[\s\S]*?fighter\.combatRole/
  );
  assert.match(
    replaySource,
    /sprite\?\.triggerRoleWeaponAttack\(\s*event\.attack\s*\)/
  );
  assert.match(replaySource, /heldWeapon: resolveHeldWeaponVisual/);
});

test('current replays render authoritative quill and color-bolt projectiles', () => {
  assert.match(
    replaySource,
    /usesAuthoritativeProjectile[\s\S]*version \?\? 0\) >= 8[\s\S]*piercing_quill[\s\S]*color_bolt/
  );
  assert.match(
    replaySource,
    /event\.kind === 'projectile_spawned'[\s\S]*event\.projectile === 'quill'[\s\S]*fillTriangle[\s\S]*fillCircle/
  );
  assert.match(replaySource, /dataset\.activeProjectiles/);
  assert.match(replaySource, /dataset\.activeProjectileTypes/);
  assert.match(replaySource, /dataset\.observedProjectileTypes/);
  assert.match(replaySource, /const launchDistance =/);
  assert.match(replaySource, /lingerProjectileImpact\(visual\)/);
  assert.match(replaySource, /duration: this\.reduceMotion \? 100 : 260/);
  assert.match(replaySource, /this\.tweenProjectile\(/);
  assert.match(replaySource, /projectile_bounced/);
  assert.match(replaySource, /presentProjectileRicochet\(/);
  assert.match(replaySource, /lingerSpentRicochet\(/);
  assert.match(replaySource, /dataset\.lastProjectileBounce/);
  assert.match(replaySource, /projectileVisuals\.delete/);
});

test('ranged starter props visibly release instead of reading like body hits', () => {
  assert.match(rigSource, /const isLongshot =/);
  assert.match(rigSource, /const isMage =/);
  assert.match(rigSource, /isLongshot \? -facing \* 15/);
  assert.match(rigSource, /isMage \? -12/);
});
