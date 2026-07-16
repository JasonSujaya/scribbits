import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error('Run challenge post tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const challenge = require(join(compiledSharedRoot, 'communitychallenge.js'));

test('each challenge post owns an immutable five-theme snapshot', () => {
  const postData = challenge.createCommunityChallengePostData(13, [
    'Season 1 begins',
  ]);

  assert.equal(postData.surface, 'community-challenge');
  assert.equal(postData.arenaDay, 13);
  assert.equal(postData.endsArenaDay, 15);
  assert.equal(postData.themes.length, 5);
  assert.ok(Object.isFrozen(postData));
  assert.ok(Object.isFrozen(postData.themes));
  assert.ok(Buffer.byteLength(JSON.stringify(postData), 'utf8') < 2_048);
  assert.deepEqual(
    challenge.parseCommunityChallengePostData(postData),
    postData
  );
  assert.equal(
    challenge.parseCommunityChallengePostData({ ...postData, arenaDay: 999 }),
    null
  );
  assert.throws(
    () => challenge.createCommunityChallengePostData(14),
    /theme boundary/
  );
  assert.equal(
    challenge.parseCommunityChallengePostData({
      ...postData,
      arenaDay: 14,
      endsArenaDay: 16,
    }),
    null
  );
});

test('challenge progress reveals only the next deterministic dare', () => {
  const progress = challenge.createCommunityChallengeProgress({
    arenaDay: 13,
    currentArenaDay: 14,
    playerKey: 'player-42',
    completedDrawCount: 2,
  });

  assert.equal(progress.status, 'active');
  assert.equal(progress.orderedThemeIds.length, 5);
  assert.deepEqual(
    progress.completedThemeIds,
    progress.orderedThemeIds.slice(0, 2)
  );
  assert.equal(progress.nextThemeId, progress.orderedThemeIds[2]);
});

test('Year One contains complete three-day drops beyond day 365', () => {
  const lastYearOnePost = challenge.createCommunityChallengePostData(373);
  assert.equal(lastYearOnePost.endsArenaDay, 375);
  assert.equal(lastYearOnePost.themes.length, 5);
});
