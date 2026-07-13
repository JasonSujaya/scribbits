import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;

if (!appRoot) {
  throw new Error('Run Legends contracts through run-test-suites.mjs.');
}

const readAppFile = (...segments) => {
  return readFileSync(join(appRoot, ...segments), 'utf8');
};

test('Legends stays a public paged response without a personal archive', () => {
  const arenaSource = readAppFile('src', 'shared', 'arena.ts');
  const scribbitSource = readAppFile('src', 'server', 'core', 'scribbit.ts');
  const apiSource = readAppFile('src', 'server', 'routes', 'api.ts');
  const gallerySource = readAppFile('src', 'client', 'scenes', 'Gallery.ts');

  const legendsState = arenaSource.match(
    /export type LegendsState = \{([\s\S]*?)\n\};/
  )?.[1];
  assert.ok(legendsState, 'shared arena must declare LegendsState');
  assert.match(legendsState, /legends: Scribbit\[\]/);
  assert.match(legendsState, /nextCursor: string \| null/);

  for (const source of [
    arenaSource,
    scribbitSource,
    apiSource,
    gallerySource,
  ]) {
    assert.doesNotMatch(source, /\bmyFaded\b|\bgetFadedScribbitsForUser\b/);
  }
});

test('mock Legacy fixtures remain internal to owned archive behavior', () => {
  const mockSource = readAppFile('scripts', 'dev-mock.mjs');

  assert.match(mockSource, /const archivedOwnedScribbits = \[/);
  assert.match(mockSource, /memory\.archivedOwnedScribbits/);
  assert.match(
    mockSource,
    /collectLegacyCards\(getOwnedScribbits\(\)\)/,
    'Legacy Cards must still collect archived owned fixtures'
  );
  assert.doesNotMatch(mockSource, /\bmyFaded\b/);
});
