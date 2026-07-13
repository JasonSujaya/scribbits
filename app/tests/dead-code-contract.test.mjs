import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;

if (!appRoot) {
  throw new Error('Run dead-code contracts through run-test-suites.mjs.');
}

test('retired Rumble entrant removal helper stays deleted', () => {
  const scribbitSource = readFileSync(
    join(appRoot, 'src', 'server', 'core', 'scribbit.ts'),
    'utf8'
  );

  assert.doesNotMatch(scribbitSource, /\bremoveRumbleEntrant\b/);
});
