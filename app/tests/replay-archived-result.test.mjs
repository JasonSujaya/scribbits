import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run archived Replay result tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const archivedResult = require(
  join(compiledClientRoot, 'lib', 'replayarchivedresultplan.js')
);

test('archived Replay copy preserves viewer perspective and server status', () => {
  assert.deepEqual(
    archivedResult.planArchivedReplayResultCopy({
      winnerName: 'Crayonator',
      perspective: 'viewer_win',
      rivalRun: undefined,
    }),
    {
      lead: 'YOU WON',
      status: 'ARCHIVED • SERVER RESULT SAVED',
    }
  );
  assert.equal(
    archivedResult.planArchivedReplayResultCopy({
      winnerName: 'Crayonator',
      perspective: 'viewer_loss',
      rivalRun: undefined,
    }).lead,
    'YOU LOST'
  );
  assert.equal(
    archivedResult.planArchivedReplayResultCopy({
      winnerName: 'Crayonator',
      perspective: 'spectator',
      rivalRun: undefined,
    }).lead,
    'CRAYONATOR WON'
  );
});

test('archived Rival Run copy retains the exact resolved score line', () => {
  const rivalRun = {
    status: 'complete',
    score: 30,
    challenge: {
      name: 'INK CONNECT',
      completionAchieved: true,
      stamp: 'CONNECTED',
    },
  };
  assert.deepEqual(
    archivedResult.planArchivedReplayResultCopy({
      winnerName: 'Crayonator',
      perspective: 'viewer_win',
      rivalRun,
    }),
    {
      lead: 'YOU WON',
      status: 'INK CONNECT • CONNECTED • 30 PTS • ARCHIVED',
    }
  );
});

test('archived active Rival Run copy retains progress and score', () => {
  const rivalRun = {
    status: 'active',
    score: 4,
    challenge: {
      name: 'SIGNATURE INK',
      premise: 'Let your Shape Power leave its mark across the card.',
      goal: 'TRIGGER 3 SHAPE POWERS',
      stamp: 'SIGNATURE',
      condition: { kind: 'player_ability_activations', target: 3 },
      progress: 2,
      completionAchieved: false,
    },
  };
  assert.equal(
    archivedResult.planArchivedReplayResultCopy({
      winnerName: 'Crayonator',
      perspective: 'viewer_win',
      rivalRun,
    }).status,
    'SIGNATURE INK • 2/3 • 4 PTS • ARCHIVED'
  );
});

test('archived result renderer remains return-only and owns its cleanup', async () => {
  const rendererSource = await readFile(
    new URL('../src/client/lib/replayarchivedresult.ts', import.meta.url),
    'utf8'
  );

  for (const disabledAction of [
    'canChooseRival: false',
    'canBackContender: false',
    'canReplay: false',
    'canShareClip: false',
  ]) {
    assert.match(rendererSource, new RegExp(disabledAction));
  }
  assert.match(rendererSource, /onReturn: options\.onReturn/);
  assert.match(rendererSource, /let destroyed = false/);
  assert.match(rendererSource, /if \(destroyed\) return/);
  assert.match(rendererSource, /scene\.tweens\.killTweensOf\(card\)/);
  assert.match(rendererSource, /actions\.destroy\(\)/);
  assert.match(rendererSource, /card\.destroy\(true\)/);
});
