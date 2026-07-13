import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;

if (!appRoot) {
  throw new Error('Run architecture contracts through run-test-suites.mjs.');
}

const readTypeScriptFiles = (directory) => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
};

test('Ink balance keys have one production owner', () => {
  const sourceRoot = join(appRoot, 'src');
  const rawInkKeyOwners = readTypeScriptFiles(sourceRoot).filter((path) => {
    return /[`'"]ink:\$\{/.test(readFileSync(path, 'utf8'));
  });

  assert.deepEqual(rawInkKeyOwners, [
    join(appRoot, 'src', 'server', 'core', 'inkStore.ts'),
  ]);
});

test('retired request aliases stay out of the shared contract', () => {
  const arenaSource = readFileSync(
    join(appRoot, 'src', 'shared', 'arena.ts'),
    'utf8'
  );
  const equipmentSource = readFileSync(
    join(appRoot, 'src', 'shared', 'equipment.ts'),
    'utf8'
  );

  assert.doesNotMatch(
    arenaSource,
    /export type (?:RemoveScribbitRequest|ReportScribbitRequest|BelieveRequest)\b/
  );
  assert.doesNotMatch(equipmentSource, /export type EquipmentSlotIndex\b/);
});
