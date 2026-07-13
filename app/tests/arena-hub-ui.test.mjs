import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const arenaSource = await readFile(
  new URL('../src/client/scenes/ArenaHome.ts', import.meta.url),
  'utf8'
);
const gallerySource = await readFile(
  new URL('../src/client/scenes/Gallery.ts', import.meta.url),
  'utf8'
);
const shopSource = await readFile(
  new URL('../src/client/scenes/Shop.ts', import.meta.url),
  'utf8'
);
const capsuleMachineSource = await readFile(
  new URL('../src/client/lib/capsulemachine.ts', import.meta.url),
  'utf8'
);
const featuredGearDetailSource = await readFile(
  new URL('../src/client/lib/featuredgeardetail.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const rivalRunFlowSource = await readFile(
  new URL('../src/client/lib/rivalrunflow.ts', import.meta.url),
  'utf8'
);

test('Arena renders one visible matchup and one primary fight action', () => {
  assert.match(arenaSource, /private renderBattleOpponent\(\): void/);
  assert.match(arenaSource, /champion\.name\.toUpperCase\(\)/);
  assert.match(arenaSource, /'CHOOSE A RIVAL'/);
  assert.match(arenaSource, /versusBadge\(this, 0, -150/);
});

test('Arena surfaces the rotating venue without adding another panel', () => {
  assert.match(arenaSource, /battleArena\.name\.toUpperCase\(\)/);
  assert.match(arenaSource, /battleArena\.challengeLabel\.toUpperCase\(\)/);
  assert.match(arenaSource, /paperIcon\(this, 'info'/);
  assert.match(arenaSource, /battleArena\.shortRule/);
});

test('Replay keeps the arena goal visible when founder story copy is present', () => {
  assert.match(replaySource, /private drawArenaChallengeStamp\(/);
  assert.equal(
    (replaySource.match(/this\.drawArenaChallengeStamp\(/g) ?? []).length,
    2,
    'win and loss outcomes must both render the arena goal stamp'
  );
  assert.doesNotMatch(
    replaySource,
    /founderOutcome \?\?[\s\S]{0,80}this\.battleArenaChallengeResult\(\)\?\.label/,
    'the venue goal must not disappear into the mutually exclusive story line'
  );
});

test('Arena reuses the shared paper button system instead of local box variants', () => {
  assert.match(arenaSource, /const championButton = iconButton\(/);
  assert.match(arenaSource, /const fightButton = iconButton\(/);
  assert.doesNotMatch(arenaSource, /private battleChoiceChip\(/);
  assert.doesNotMatch(arenaSource, /private simpleFightButton\(/);
  assert.doesNotMatch(arenaSource, /private rumblePickButton\(/);
});

test('Arena keeps prediction compact and removes the old pick-grid language', () => {
  assert.match(arenaSource, /rumblePickLocked \? 'PICKED' : 'RUMBLE PICK'/);
  assert.doesNotMatch(arenaSource, /PICK A WINNER|DRAW TODAY|PICK LOCKED/);
});

test('Mystery Ink lives in Shop while Bag remains equipment-only', () => {
  assert.doesNotMatch(
    arenaSource,
    /buildInkChip|openCapsuleMachine|pullCapsule/
  );
  assert.doesNotMatch(gallerySource, /openCapsuleMachine|pullCapsule/);
  assert.match(shopSource, /openCapsuleMachine\(this/);
  assert.match(shopSource, /pullCapsule\(operationId\)/);
  assert.match(shopSource, /onViewCollection:/);
  assert.match(capsuleMachineSource, /'VIEW BAG'/);
  assert.match(capsuleMachineSource, /OPEN 10/);
  assert.match(capsuleMachineSource, /COMING SOON/);
  assert.match(capsuleMachineSource, /COSMETIC ONLY/);
  assert.match(capsuleMachineSource, /'LOOT'/);
  assert.doesNotMatch(capsuleMachineSource, /BATTLE SPOILS/);
  assert.match(capsuleMachineSource, /Inspect featured Gear:/);
  assert.match(capsuleMachineSource, /width: 100,[\s\S]{0,40}height: 100/);
  assert.match(capsuleMachineSource, /featuredGearControl\.hidden = visible/);
  assert.match(featuredGearDetailSource, /createStickerModalShell\(/);
  assert.match(featuredGearDetailSource, /getGearTechniqueEffect\(entry, 1\)/);
  assert.match(featuredGearDetailSource, /renderCosmeticPreview\(/);
  assert.match(featuredGearDetailSource, /createStickerShine\(/);
  assert.match(featuredGearDetailSource, /prefersReducedMotion\(\)/);
  assert.match(
    capsuleMachineSource,
    /reward chests containing Gear and styles/
  );
  assert.doesNotMatch(capsuleMachineSource, /open one or ten cosmetic chests/);
  assert.doesNotMatch(capsuleMachineSource, /OPEN 100|AUTO.OPEN/);
  assert.doesNotMatch(capsuleMachineSource, /INK KIT/);
});

test('Every player-facing Spar enters one server-authored Rival Run flow', () => {
  assert.match(arenaSource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.match(drawSource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.match(replaySource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.doesNotMatch(arenaSource, /\bspar\(/);
  assert.doesNotMatch(drawSource, /\bspar\(/);
  assert.doesNotMatch(replaySource, /\bspar\(/);
  assert.match(
    rivalRunFlowSource,
    /fetchSparRivals\(options\.challenger\.id\)/
  );
  assert.match(
    rivalRunFlowSource,
    /spar\(options\.challenger\.id, rival\.id, rivalRun\)/
  );
  assert.match(rivalRunFlowSource, /createSparRivalDraft\(scene/);
  assert.match(rivalRunFlowSource, /stageDirectBattle\(/);
  assert.match(rivalRunFlowSource, /showVsCeremony\(scene/);
});

test('Champion keeps its focused lifecycle-safe launcher', () => {
  assert.match(arenaSource, /private async launchChampionBattle\(/);
  assert.match(arenaSource, /await bossChallenge\(scribbit\.id\)/);
  assert.match(
    arenaSource,
    /finally \{\s*if \(sceneEpoch === this\.sceneEpoch\) \{\s*this\.busy = false;/
  );
});

test('Champion and Spar expose their selected state to assistive controls', () => {
  assert.match(arenaSource, /private championModeAction: HTMLButtonElement/);
  assert.match(arenaSource, /private sparModeAction: HTMLButtonElement/);
  assert.match(arenaSource, /'aria-pressed': String\(this\.selectedBattleMode/);
  assert.match(arenaSource, /this\.championModeAction\?\.setAttribute\(/);
  assert.match(arenaSource, /this\.sparModeAction\?\.setAttribute\(/);
});
