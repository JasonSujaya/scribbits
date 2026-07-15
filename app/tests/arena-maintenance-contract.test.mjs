import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const [maintenanceSource, schedulerSource, triggerSource] = await Promise.all([
  readFile(
    new URL('../src/server/core/arenaMaintenance.ts', import.meta.url),
    'utf8'
  ),
  readFile(
    new URL('../src/server/routes/scheduler.ts', import.meta.url),
    'utf8'
  ),
  readFile(
    new URL('../src/server/routes/triggers.ts', import.meta.url),
    'utf8'
  ),
]);

test('scheduler and app upgrades share one catch-up maintenance path', () => {
  assert.match(schedulerSource, /maintainArena\(redis/);
  assert.match(triggerSource, /maintainArena\(redis/);
  assert.doesNotMatch(triggerSource, /ensureCurrentArenaPost/);
  assert.match(maintenanceSource, /runNightlyArenaJob/);
  assert.match(maintenanceSource, /loadPendingArenaResolutions/);
  assert.match(maintenanceSource, /publishRumbleResultComment/);
  assert.match(maintenanceSource, /acknowledgeArenaResolution/);
});
