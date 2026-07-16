import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
if (!appRoot) {
  throw new Error(
    'Run player vocabulary tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const typescript = require('typescript');
const apiSource = readFileSync(
  join(appRoot, 'src', 'server', 'routes', 'api.ts'),
  'utf8'
);
const inventoryRouteSource = readFileSync(
  join(appRoot, 'src', 'server', 'routes', 'inventory.ts'),
  'utf8'
);
const mockSource = readFileSync(
  join(appRoot, 'scripts', 'dev-mock.mjs'),
  'utf8'
);

const sliceSource = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
};

const collectStringValues = (source) => {
  const sourceFile = typescript.createSourceFile(
    'player-copy.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const values = [];
  const visit = (node) => {
    if (
      typescript.isStringLiteral(node) ||
      typescript.isNoSubstitutionTemplateLiteral(node)
    ) {
      values.push(node.text);
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
};

const playerCopyFrom = (source, allowedInternalValues) => {
  const allowedValues = new Set(allowedInternalValues);
  return collectStringValues(source).filter(
    (value) => !allowedValues.has(value)
  );
};

test('Pick copy stays canonical while Back transport identifiers remain stable', () => {
  const apiPickRoute = sliceSource(
    apiSource,
    "api.post('/back'",
    "api.post('/remove-scribbit'"
  );
  const mockPickRoute = sliceSource(
    mockSource,
    "if (method === 'POST' && path === '/api/back')",
    "if (method === 'POST' && path === '/api/remove-scribbit')"
  );
  const apiPlayerCopy = playerCopyFrom(apiPickRoute, [
    '/back',
    'Back route failed:',
  ]);
  const mockPlayerCopy = playerCopyFrom(mockPickRoute, ['POST', '/api/back']);

  assert.doesNotMatch(apiPlayerCopy.join('\n'), /\bback(?:ed)?\b/i);
  assert.doesNotMatch(mockPlayerCopy.join('\n'), /\bback(?:ed)?\b/i);
  assert.match(apiPickRoute, /api\.post\('\/back'/);
  assert.match(apiPickRoute, /c\.json<\{ backed: string \}>\(\{ backed:/);
  assert.match(apiPickRoute, /console\.error\('Back route failed:'/);
  assert.match(mockPickRoute, /path === '\/api\/back'/);
  assert.match(
    mockPickRoute,
    /sendJson\(response, 200, \{ backed: scribbitId \}\)/
  );
  assert.match(
    apiSource,
    /Neither your Pick nor an owned Rumble entrant has a replay for that day\./
  );
  assert.doesNotMatch(apiSource, /No backed or owned Rumble entrant/);
});

test('Gear forging copy avoids accessory, loose, and merge vocabulary', () => {
  const apiForgeRoute = sliceSource(
    inventoryRouteSource,
    'const mergeGear:',
    'const capsule:'
  );
  const mockForgeRoute = sliceSource(
    mockSource,
    "if (method === 'POST' && path === '/api/merge-gear')",
    "if (method === 'POST' && path === '/api/daily-login/claim')"
  );
  const statusValues = [
    'string',
    'invalid',
    'insufficientCopies',
    'maxRank',
    'operationConflict',
  ];
  const apiPlayerCopy = playerCopyFrom(apiForgeRoute, [
    '/merge-gear',
    'Merge gear route failed:',
    ...statusValues,
  ]);
  const mockPlayerCopy = playerCopyFrom(mockForgeRoute, [
    'POST',
    '/api/merge-gear',
    ...statusValues,
  ]);
  const retiredGearTerms = /\b(?:accessory|loose|merge|merging)\b/i;

  assert.doesNotMatch(apiPlayerCopy.join('\n'), retiredGearTerms);
  assert.doesNotMatch(mockPlayerCopy.join('\n'), retiredGearTerms);
  assert.match(
    apiSource,
    /api\.post\('\/merge-gear', inventoryRouteHandlers\.mergeGear\)/
  );
  assert.match(apiForgeRoute, /mergeGearForUser\(/);
  assert.match(apiForgeRoute, /console\.error\('Merge gear route failed:'/);
  assert.match(mockForgeRoute, /path === '\/api\/merge-gear'/);
  assert.match(mockForgeRoute, /projectGearMerge\(/);
  assert.match(mockSource, /kind !== 'accessory'/);
});
