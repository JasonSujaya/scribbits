import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const appRoot = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(appRoot, 'src', 'client');
const catalogPath = path.join(clientRoot, 'lib', 'audiocatalog.ts');
const sfxDirectory = path.join(clientRoot, 'assets', 'sfx');

const catalogSource = await readFile(catalogPath, 'utf8');
const shippedFiles = (await readdir(sfxDirectory))
  .filter((fileName) => fileName.endsWith('.mp3'))
  .sort();
const catalogFiles = [
  ...catalogSource.matchAll(
    /new URL\('\.\.\/assets\/sfx\/([^']+\.mp3)', import\.meta\.url\)/g
  ),
]
  .map((match) => match[1])
  .sort();

test('every curated SFX file is cataloged exactly once', () => {
  assert.equal(catalogFiles.length, 28);
  assert.equal(new Set(catalogFiles).size, catalogFiles.length);
  assert.deepEqual(catalogFiles, shippedFiles);
});

test('the curated SFX pack stays lightweight and browser-safe', async () => {
  const byteSizes = await Promise.all(
    shippedFiles.map(
      async (fileName) => (await stat(path.join(sfxDirectory, fileName))).size
    )
  );
  assert.ok(byteSizes.every((byteSize) => byteSize > 0));
  assert.ok(
    byteSizes.reduce((total, byteSize) => total + byteSize, 0) < 256_000,
    'curated SFX must remain below the 256 KB shipping budget'
  );
});

test('catalog owns semantic cues, tuning, and CC0 provenance', async () => {
  const cueIds = [
    ...catalogSource.matchAll(/^  '([a-z]+\.[a-z]+)': \{$/gm),
  ].map((match) => match[1]);
  assert.ok(cueIds.length >= 25);
  assert.equal(new Set(cueIds).size, cueIds.length);

  const volumes = [...catalogSource.matchAll(/\n    volume: ([0-9.]+),/g)].map(
    (match) => Number(match[1])
  );
  assert.ok(volumes.length >= cueIds.length);
  assert.ok(volumes.every((volume) => volume >= 0 && volume <= 1));

  const cooldowns = [
    ...catalogSource.matchAll(/cooldownMilliseconds: ([0-9_]+),/g),
  ].map((match) => Number(match[1].replaceAll('_', '')));
  assert.equal(cooldowns.length, cueIds.length);
  assert.ok(cooldowns.every((cooldown) => cooldown >= 0));

  const voiceLimits = [
    ...catalogSource.matchAll(/maximumVoices: ([0-9]+),/g),
  ].map((match) => Number(match[1]));
  assert.equal(voiceLimits.length, cueIds.length);
  assert.ok(voiceLimits.every((limit) => limit >= 1 && limit <= 4));

  assert.match(catalogSource, /license: 'CC0-1\.0'/);
  assert.match(catalogSource, /sourcePack: 'kenney-interface'/);
  assert.match(catalogSource, /sourcePack: 'kenney-impact'/);
  assert.match(catalogSource, /sourcePack: 'kenney-rpg'/);
  assert.match(catalogSource, /sourcePack: 'freesound-referee-whistle'/);

  const license = await readFile(
    path.join(sfxDirectory, 'LICENSE-KENNEY-CC0.txt'),
    'utf8'
  );
  assert.match(license, /Creative Commons Zero 1\.0 Universal/);
  assert.match(license, /kenney\.nl\/assets\/interface-sounds/);
  assert.match(license, /kenney\.nl\/assets\/impact-sounds/);
  assert.match(license, /kenney\.nl\/assets\/rpg-audio/);

  const whistleLicense = await readFile(
    path.join(sfxDirectory, 'LICENSE-FREESOUND-CC0.txt'),
    'utf8'
  );
  assert.match(whistleLicense, /Creative Commons Zero 1\.0 Universal/);
  assert.match(whistleLicense, /Rosa-Orenes256/);
  assert.match(whistleLicense, /sounds\/538422/);
});

test('runtime routes all battle and shared UI sound through the catalog', async () => {
  const battleSound = await readFile(
    path.join(clientRoot, 'lib', 'battlesound.ts'),
    'utf8'
  );
  const ui = await readFile(path.join(clientRoot, 'lib', 'ui.ts'), 'utf8');
  const sfx = await readFile(path.join(clientRoot, 'lib', 'sfx.ts'), 'utf8');
  const overlay = await readFile(
    path.join(clientRoot, 'lib', 'overlay.ts'),
    'utf8'
  );
  const capsuleMachine = await readFile(
    path.join(clientRoot, 'lib', 'capsulemachine.ts'),
    'utf8'
  );
  const game = await readFile(path.join(clientRoot, 'game.ts'), 'utf8');
  const splash = await readFile(path.join(clientRoot, 'splash.ts'), 'utf8');
  const draw = await readFile(
    path.join(clientRoot, 'scenes', 'Draw.ts'),
    'utf8'
  );
  const replay = await readFile(
    path.join(clientRoot, 'scenes', 'Replay.ts'),
    'utf8'
  );
  const arenaHome = await readFile(
    path.join(clientRoot, 'scenes', 'ArenaHome.ts'),
    'utf8'
  );

  assert.doesNotMatch(battleSound, /createOscillator|AudioContext/);
  assert.match(battleSound, /playSfx\(BATTLE_CUES\[cue\]\)/);
  assert.match(ui, /markSfxManaged\(hit\)/);
  assert.match(ui, /playSfx\(cue\)/);
  assert.match(ui, /playSfx\('ui\.error'\)/);
  assert.match(
    ui,
    /paperArrowButton\([\s\S]*?scaleX: 0\.84,[\s\S]*?pressOnHover: false,[\s\S]*?'ui\.page'/
  );
  assert.match(ui, /pointerPassthrough = true/);
  assert.match(ui, /attributes: \{ 'data-sfx-cue': 'ui\.page' \}/);
  assert.match(sfx, /gameObject\.getData\?\.\(SFX_CUE_DATA_KEY\)/);
  assert.match(overlay, /nativeButton\.click\(\)/);
  assert.match(overlay, /playSfx\('ui\.close'\)/);
  assert.match(capsuleMachine, /playSfx\('reward\.ink'\)/);
  assert.match(capsuleMachine, /playSfx\('reward\.reveal'\)/);
  assert.match(draw, /playSfx\('draw\.ink'\)/);
  assert.match(draw, /playSfx\('draw\.tool'\)/);
  assert.match(
    draw,
    /playSfx\(snapshot\.remainingSeconds <= 10 \? 'draw\.tick' : 'draw\.timer'\)/
  );
  assert.match(
    draw,
    /playSfx\(isDrawStep \? 'draw\.start' : 'draw\.countdown'\)/
  );
  assert.match(
    catalogSource,
    /'draw\.countdown': \{[\s\S]{0,240}maximumVoices: 3/
  );
  assert.match(catalogSource, /'draw\.timer': \{[\s\S]{0,200}maximumVoices: 2/);
  assert.match(catalogSource, /'draw\.tick': \{[\s\S]{0,220}maximumVoices: 2/);
  assert.match(draw, /preloadSfx\('draw\.countdown'\)/);
  assert.match(draw, /preloadSfx\('draw\.start'\)/);
  assert.match(draw, /preloadSfx\('draw\.timer'\)/);
  assert.match(draw, /preloadSfx\('draw\.tick'\)/);
  assert.match(draw, /playSfx\('draw\.finish'\)/);
  assert.match(draw, /playSfx\('draw\.submit'\)/);
  assert.match(draw, /playSfx\('scribbit\.birth'\)/);
  assert.match(replay, /this\.soundboard\.play\('loss'\)/);
  assert.match(replay, /playSfx\('reward\.ink'\)/);
  assert.match(arenaHome, /'battle\.win' : 'battle\.loss'/);
  assert.match(game, /installSfx\(game\)/);
  assert.doesNotMatch(splash, /installSfx\(\)/);
});

test('dismiss surfaces and direct canvas actions declare semantic sounds', async () => {
  const paths = [
    'lib/appmenu.ts',
    'lib/detailmodal.ts',
    'lib/stickermodalshell.ts',
    'lib/seasonboard.ts',
    'lib/cloutboard.ts',
    'lib/founderchroniclemargin.ts',
    'lib/arenacontenderpicker.ts',
    'lib/capsulemachine.ts',
    'scenes/ScribbitHome.ts',
  ];
  const sources = await Promise.all(
    paths.map((relativePath) =>
      readFile(path.join(clientRoot, relativePath), 'utf8')
    )
  );
  const combined = sources.join('\n');
  assert.ok(
    [...combined.matchAll(/setSfxCue\([^,]+, 'ui\.close'\)/g)].length >= 8
  );
  assert.match(combined, /setSfxCue\(hitTarget, 'ui\.open'\)/);
  assert.doesNotMatch(combined, /care\.action/);
});
