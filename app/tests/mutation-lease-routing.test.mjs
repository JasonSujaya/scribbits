import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Splash stays read-only while Arena owns creation-marker repair', async () => {
  const [routeSource, scribbitSource] = await Promise.all([
    readFile(new URL('../src/server/routes/api.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/server/core/scribbit.ts', import.meta.url),
      'utf8'
    ),
  ]);

  assert.match(routeSource, /api\.get\('\/splash', async \(c\) =>/);
  assert.doesNotMatch(routeSource, /registerPlayerMutatingGet\('\/splash'/);
  assert.match(
    routeSource,
    /readHasUserCreatedScribbit\(redis, player\.userId\)/
  );

  const readOnlyHelperStart = scribbitSource.indexOf(
    'export const readHasUserCreatedScribbit'
  );
  const readOnlyHelperEnd = scribbitSource.indexOf(
    'export const getDailyFlags',
    readOnlyHelperStart
  );
  assert.notEqual(readOnlyHelperStart, -1);
  assert.notEqual(readOnlyHelperEnd, -1);
  assert.doesNotMatch(
    scribbitSource.slice(readOnlyHelperStart, readOnlyHelperEnd),
    /storage\.set\(/
  );
});

test('non-gameplay POST work cannot block an Arena refresh', async () => {
  const routeSource = await readFile(
    new URL('../src/server/routes/api.ts', import.meta.url),
    'utf8'
  );
  const exemptionStart = routeSource.indexOf(
    'const playerMutationLeaseExemptPostPathSuffixes'
  );
  const middlewareEnd = routeSource.indexOf(
    'const registerPlayerMutatingGet',
    exemptionStart
  );
  const leaseRouting = routeSource.slice(exemptionStart, middlewareEnd);

  assert.match(leaseRouting, /'\/battle-clip'/);
  assert.match(leaseRouting, /'\/practice-battle'/);
  assert.match(leaseRouting, /'\/delete-my-data'/);
  assert.match(leaseRouting, /c\.req\.path\.endsWith\(pathSuffix\)/);
});
