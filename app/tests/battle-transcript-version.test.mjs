import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error(
    'Run battle transcript version tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const transcriptVersion = require(
  join(compiledSharedRoot, 'combat', 'transcriptversion.js')
);

test('battle transcript versions have one explicit compatibility registry', () => {
  assert.equal(transcriptVersion.CURRENT_BATTLE_TRANSCRIPT_VERSION, 8);
  assert.deepEqual(
    transcriptVersion.SUPPORTED_BATTLE_TRANSCRIPT_VERSIONS,
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.equal(transcriptVersion.isSupportedBattleTranscriptVersion(1), true);
  assert.equal(transcriptVersion.isSupportedBattleTranscriptVersion(8), true);
  assert.equal(transcriptVersion.isSupportedBattleTranscriptVersion(9), false);
});
