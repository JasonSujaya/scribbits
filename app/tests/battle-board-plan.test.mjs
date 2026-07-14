import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Battle Board plan tests through the suite runner.');
}

const require = createRequire(import.meta.url);
const battleBoard = require(join(compiledClientRoot, 'lib', 'battleboard.js'));

test('every Rival Run bout keeps safe, even, and risky choices', () => {
  const choices = [
    { tier: 'safe', rival: { id: 'safe' } },
    { tier: 'even', rival: { id: 'even' } },
    { tier: 'risky', rival: { id: 'risky' } },
    { tier: 'risky', rival: { id: 'extra' } },
  ];

  assert.deepEqual(
    battleBoard.selectBattleBoardChoices(choices).map((choice) => choice.tier),
    ['safe', 'even', 'risky']
  );
});

test('character selection locks only after a run starts', () => {
  assert.equal(
    battleBoard.isBattleBoardCharacterLocked({
      boutsCompleted: 0,
      status: 'active',
    }),
    false
  );
  assert.equal(
    battleBoard.isBattleBoardCharacterLocked({
      boutsCompleted: 1,
      status: 'active',
    }),
    true
  );
  assert.equal(
    battleBoard.isBattleBoardCharacterLocked({
      boutsCompleted: 3,
      status: 'complete',
    }),
    false
  );
});
