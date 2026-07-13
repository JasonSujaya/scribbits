import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error('Run text-fitting tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { fitText } = require(join(compiledClientRoot, 'lib', 'fittext.js'));

test('fitText keeps short labels and bounds long labels with one ellipsis', () => {
  assert.equal(fitText('  Paper Moth  ', 20), 'Paper Moth');
  assert.equal(fitText('Long Name With Space', 10), 'Long Name…');
  assert.equal(fitText('  Ink  ', 3), 'Ink');
});
