import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error(
    'Run Reddit username tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { formatRedditUsername } = require(
  join(compiledClientRoot, 'lib', 'redditusername.js')
);

test('Reddit usernames render once and disappear when no user exists', () => {
  assert.equal(formatRedditUsername('scribbler'), 'u/scribbler');
  assert.equal(formatRedditUsername(' u/Scribbler '), 'u/Scribbler');
  assert.equal(formatRedditUsername('   '), null);
  assert.equal(formatRedditUsername(null), null);
});
