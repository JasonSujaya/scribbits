import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Draw automation tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const drawAutomation = require(
  join(compiledClientRoot, 'lib', 'drawautomation.js')
);

test('untimed Draw automation requires localhost, debug flags, and mock proof', () => {
  const localRequest = {
    hostname: 'localhost',
    search: '?debug&untimed-draw',
  };

  assert.equal(drawAutomation.isLocalDrawAutomationRequest(localRequest), true);
  assert.equal(
    drawAutomation.isLocalDrawAutomationMode(localRequest, true),
    true
  );
  assert.equal(
    drawAutomation.isLocalDrawAutomationMode(localRequest, false),
    false
  );
  assert.equal(
    drawAutomation.isLocalDrawAutomationRequest({
      hostname: 'www.reddit.com',
      search: '?debug&untimed-draw',
    }),
    false
  );
  assert.equal(
    drawAutomation.isLocalDrawAutomationRequest({
      hostname: 'localhost',
      search: '?debug',
    }),
    false
  );
});

test('the local authoring API uses the real Draw canvas and mock capability', () => {
  const drawSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'scenes', 'Draw.ts'),
    'utf8'
  );
  const canvasSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'drawcanvas.ts'),
    'utf8'
  );
  const gameSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'game.ts'),
    'utf8'
  );
  const mockSource = readFileSync(
    join(process.cwd(), 'scripts', 'dev-mock.mjs'),
    'utf8'
  );
  const viteMockSource = readFileSync(
    join(process.cwd(), 'vite.mock.config.ts'),
    'utf8'
  );

  assert.match(drawSource, /scribbitsDrawAutomation/);
  assert.match(drawSource, /this\.canvas\.drawAutomationStrokes\(strokes\)/);
  assert.match(drawSource, /this\.canvas\.exportSubmissionImages\(\)/);
  assert.match(canvasSource, /drawAutomationStrokes/);
  assert.match(gameSource, /__mock\/draw-automation/);
  assert.match(mockSource, /url\.pathname === '\/__mock\/draw-automation'/);
  assert.match(viteMockSource, /'\/__mock': mockApiTarget/);
});
