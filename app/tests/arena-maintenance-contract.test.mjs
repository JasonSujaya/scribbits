import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const [maintenanceSource, schedulerSource, triggerSource, dailyJobSource] =
  await Promise.all([
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
    readFile(
      new URL('../src/server/core/dailyJob.ts', import.meta.url),
      'utf8'
    ),
  ]);

test('scheduler and app upgrades share one catch-up maintenance path', () => {
  assert.match(schedulerSource, /maintainArena\(redis/);
  assert.match(triggerSource, /scheduler\.runJob/);
  assert.match(triggerSource, /status: 'success'/);
  assert.doesNotMatch(triggerSource, /maintainArena/);
  assert.doesNotMatch(triggerSource, /ensureCurrentArenaPost/);
  assert.match(maintenanceSource, /runNightlyArenaJob/);
  assert.match(maintenanceSource, /loadPendingArenaResolutions/);
  assert.doesNotMatch(maintenanceSource, /publishRumbleResultComment/);
  assert.match(maintenanceSource, /publishCommunityPosts/);
  assert.match(schedulerSource, /publishArenaCommunityPosts/);
  assert.match(dailyJobSource, /recordDailyStrongestFight/);
  assert.match(maintenanceSource, /acknowledgeArenaResolution/);
  assert.ok(
    maintenanceSource.indexOf('publishCommunityPosts?.') <
      maintenanceSource.indexOf('acknowledgeArenaResolution(fencedStorage'),
    'community posts must publish before the resolution outbox is acknowledged'
  );
});
