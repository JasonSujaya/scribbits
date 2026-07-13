import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run operation receipt tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));

test('capsule operation claims maintain the privacy receipt index', async () => {
  const memory = createMemoryStorage({ watch: true });
  const userId = 'indexed-capsule-player';
  const operationKey = inkStore.getCapsuleOperationKey(
    userId,
    'indexed-operation'
  );
  const indexKey = inkStore.getUserOperationReceiptIndexKey(userId);

  const claim = await inkStore.claimCapsuleOperation(
    memory.storage,
    operationKey,
    10_000,
    15_000
  );
  assert.equal(claim.status, 'claimed');
  assert.equal(
    await memory.storage.zScore(indexKey, operationKey),
    10_000 + 3 * 24 * 60 * 60 * 1000
  );

  assert.equal(
    await inkStore.releaseCapsuleOperation(
      memory.storage,
      operationKey,
      claim.pendingValue
    ),
    true
  );
  assert.equal(await memory.storage.get(operationKey), undefined);
  assert.equal(await memory.storage.zScore(indexKey, operationKey), undefined);
});
