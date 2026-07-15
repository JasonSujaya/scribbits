import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);

const auraStart = replaySource.indexOf('private createPersistentVictoryAura(');
const ceremonyStart = replaySource.indexOf(
  'private showWinCeremony(',
  auraStart
);
const auraSource = replaySource.slice(auraStart, ceremonyStart);

test('the settled win screen keeps a depth-safe victory aura', () => {
  assert.ok(auraStart >= 0, 'Replay should own a persistent victory aura');
  assert.match(auraSource, /container\(x, y\)\.setDepth\(55\)/);
  assert.match(auraSource, /circle\(0, 0, 146, elementStyle\.soft, 0\.18\)/);
  assert.match(auraSource, /const rayCount = 12;/);
  assert.match(auraSource, /const sparkPlacements = \[/);
  assert.ok(
    auraSource.indexOf('aura.add([glow, rays, ...sparks])') <
      auraSource.indexOf('if (this.reduceMotion) return'),
    'reduced motion should keep the static aura while skipping its animation'
  );
});

test('knockout winners receive the persistent aura at the victory anchor', () => {
  const ceremonySource = replaySource.slice(ceremonyStart);
  assert.match(
    ceremonySource,
    /if \(winner\.sprite && !usesVerdictCeremony\) \{[\s\S]{0,220}this\.createPersistentVictoryAura\([\s\S]{0,120}width \/ 2,[\s\S]{0,80}victoryY/
  );
  assert.match(
    ceremonySource,
    /if \(!this\.reduceMotion && \(!usesVerdictCeremony \|\| rivalRunFinish\)\)[\s\S]{0,500}delayedCall\(1700, \(\) => emitter\.destroy\(\)\)/,
    'the short entrance burst should remain bounded'
  );
});

test('win and loss results show playful outcome banners above the fighters', () => {
  assert.match(
    replaySource,
    /victory \? 'VICTORY! INK-CREDIBLE!' : 'DEFEAT! PAPER JAM!'/,
    'both banners should name the outcome in playful player-facing copy'
  );
  assert.match(replaySource, /icon: victory \? 'trophy' : 'defeat'/);
  assert.match(replaySource, /this\.scale\.width \/ 2,\s*150,/);
  assert.match(replaySource, /createOutcomeBanner\('victory'\)/);
  assert.match(replaySource, /createOutcomeBanner\('defeat'\)/);
});
