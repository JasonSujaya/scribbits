import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!appRoot || !compiledServerRoot) {
  throw new Error('Run storage contract tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const migrations = require(join(compiledServerRoot, 'core', 'migrations.js'));

const expectedFixtureVersions = Object.freeze({
  scribbit: [0, 1, 2, 3, 4],
  inventory: [1],
  'power-up-discoveries': [0, 1],
  'power-up-offer': [1],
  'power-up-claim-receipt': [1],
  'gear-merge-receipt': [0, 1],
});
test('durable storage manifest is complete, frozen, and release-reviewable', () => {
  assert.equal(migrations.STORAGE_CONTRACT_MANIFEST_VERSION, 1);
  const contracts = Object.values(migrations.DURABLE_STORAGE_CONTRACTS);
  assert.equal(Object.isFrozen(migrations.DURABLE_STORAGE_CONTRACTS), true);
  assert.equal(contracts.length, Object.keys(expectedFixtureVersions).length);
  assert.deepEqual(
    contracts.map((contract) => contract.id).sort(),
    Object.keys(expectedFixtureVersions).sort()
  );

  const keyPatterns = new Set();
  for (const contract of contracts) {
    assert.equal(Object.isFrozen(contract), true);
    assert.equal(Object.isFrozen(contract.frozenFixtureVersions), true);
    assert.equal(Object.isFrozen(contract.indexKeyPatterns), true);
    assert.equal(keyPatterns.has(contract.keyPattern), false);
    keyPatterns.add(contract.keyPattern);

    assert.deepEqual(
      contract.frozenFixtureVersions,
      expectedFixtureVersions[contract.id]
    );
    assert.equal(
      contract.frozenFixtureVersions.at(-1),
      contract.latestReadableVersion
    );
    assert.ok(contract.activeWriteVersion <= contract.latestReadableVersion);
    assert.ok(contract.ownerModule.startsWith('src/server/core/'));
    assert.ok(contract.privacyDeletionOwner.startsWith('src/server/core/'));
    assert.ok(contract.repairStrategy.length >= 12);

    for (const evidencePath of [
      contract.ownerModule,
      contract.privacyDeletionOwner,
      contract.fixtureTestFile,
    ]) {
      assert.equal(
        existsSync(join(appRoot, evidencePath)),
        true,
        `${contract.id} references missing evidence ${evidencePath}`
      );
    }
  }
});
