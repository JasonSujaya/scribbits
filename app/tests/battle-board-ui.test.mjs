import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const boardSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'MyBattles.ts'),
  'utf8'
);
const historySource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'BattleHistory.ts'),
  'utf8'
);
const sceneRoutesSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'sceneroutes.ts'),
  'utf8'
);
const battleCeremonySource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'battleceremony.ts'),
  'utf8'
);
const replayBattleHudSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'replaybattlehud.ts'),
  'utf8'
);

test('Battles is an active three-choice Rival Run board', () => {
  assert.match(boardSource, /fetchSparRivals\(selected\.id\)/);
  assert.match(boardSource, /selectBattleBoardChoices\(slate\.choices\)/);
  assert.match(boardSource, /spar\([\s\S]*slate\.rivalRun/);
  assert.match(boardSource, /stageDirectBattle\([\s\S]*'MyBattles'/);
});

test('the board uses real drawings and a native character dropdown', () => {
  assert.match(boardSource, /loadDrawing\(this, selected\)/);
  assert.match(boardSource, /loadDrawing\(this, opponent\)/);
  assert.match(boardSource, /document\.createElement\('select'\)/);
  assert.match(boardSource, /battles\.board\.chooseCharacter/);
  assert.match(boardSource, /battles\.board\.characterRecord/);
  assert.match(boardSource, /selected\.wins/);
  assert.match(boardSource, /isBattleBoardCharacterLocked/);
  assert.match(boardSource, /focusRing\.setAlpha\(1\)/);
  assert.doesNotMatch(boardSource, /generateDoodleTexture/);
});

test('usernames identify each Scribbit before and during a fight', () => {
  assert.match(boardSource, /formatRedditUsername\(selected\.artist\)/);
  assert.match(boardSource, /formatRedditUsername\(opponent\.artist\)/);
  assert.match(battleCeremonySource, /formatRedditUsername\(fighter\.artist\)/);
  assert.match(
    replayBattleHudSource,
    /formatRedditUsername\(scribbit\.artist\)/
  );
  assert.match(
    replayBattleHudSource,
    /floatingUsername[\s\S]*floatingVitalsFeedback/
  );
});

test('past battle history remains secondary and replayable', () => {
  assert.match(boardSource, /startScene\(this, 'BattleHistory'\)/);
  assert.match(
    historySource,
    /setSavedReplay\(this, report, 'BattleHistory'\)/
  );
  assert.match(sceneRoutesSource, /BattleHistory/);
});
