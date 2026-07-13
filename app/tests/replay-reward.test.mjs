import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error('Run replay reward tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const sparReward = require(join(compiledSharedRoot, 'sparreward.js'));
const replayReward = require(
  join(compiledClientRoot, 'lib', 'replayreward.js')
);

test('battle progression receipts preserve exact level boundaries', () => {
  assert.deepEqual(
    sparReward.createSparRewardReceipt({
      reportId: 'report-1',
      scribbitId: 'scribbit-1',
      xpBefore: 1,
      xpAfter: 2,
      inkAwarded: 2,
    }),
    {
      version: 1,
      reportId: 'report-1',
      scribbitId: 'scribbit-1',
      xpAwarded: 1,
      inkAwarded: 2,
      xpBefore: 1,
      xpAfter: 2,
      levelBefore: 1,
      levelAfter: 1,
    }
  );
});

test('battle progression receipt validation rejects client-invented totals', () => {
  const receipt = sparReward.createSparRewardReceipt({
    reportId: 'report-2',
    scribbitId: 'scribbit-2',
    xpBefore: 2,
    xpAfter: 3,
    inkAwarded: 2,
  });
  assert.equal(sparReward.isSparRewardReceipt(receipt), true);
  assert.equal(
    sparReward.isSparRewardReceipt({ ...receipt, xpAfter: 99 }),
    false
  );
  assert.equal(
    sparReward.isSparRewardReceipt({ ...receipt, levelAfter: 5 }),
    false
  );
  for (const numericField of [
    'version',
    'xpAwarded',
    'inkAwarded',
    'xpBefore',
    'xpAfter',
    'levelBefore',
    'levelAfter',
  ]) {
    assert.equal(
      sparReward.isSparRewardReceipt({
        ...receipt,
        [numericField]: String(receipt[numericField]),
      }),
      false,
      `${numericField} must reject numeric strings`
    );
  }
});

test('fresh replay reward stays compact and celebrates level-up', () => {
  assert.deepEqual(
    replayReward.planReplayReward({
      receipt: sparReward.createSparRewardReceipt({
        reportId: 'report-level-up',
        scribbitId: 'scribbit-level-up',
        xpBefore: 2,
        xpAfter: 3,
        inkAwarded: 2,
      }),
      savedReplay: false,
    }),
    {
      label: 'LEVEL UP • LV2 • +2 INK',
      accessibleLabel: 'Level up to level 2. 2 Ink earned.',
      celebratesLevelUp: true,
    }
  );
});

test('saved payout is truthful and reward-free reports stay silent', () => {
  assert.equal(
    replayReward.planReplayReward({ receipt: null, savedReplay: false }),
    null
  );
  assert.equal(
    replayReward.planReplayReward({
      receipt: sparReward.createSparRewardReceipt({
        reportId: 'report-saved',
        scribbitId: 'scribbit-saved',
        xpBefore: 0,
        xpAfter: 1,
        inkAwarded: 2,
      }),
      savedReplay: true,
    })?.label,
    'SAVED • +1 XP • +2 INK'
  );
});

test('max-level XP stays visible without inventing a next level', () => {
  assert.equal(
    replayReward.planReplayReward({
      receipt: sparReward.createSparRewardReceipt({
        reportId: 'report-max',
        scribbitId: 'scribbit-max',
        xpBefore: 18,
        xpAfter: 19,
        inkAwarded: 2,
      }),
      savedReplay: false,
    })?.label,
    '+1 XP • MAX LV • +2 INK'
  );
});

test('Replay stages only a matching owned receipt and clears it for history', () => {
  const receipt = sparReward.createSparRewardReceipt({
    reportId: 'report-owned',
    scribbitId: 'scribbit-owned',
    xpBefore: 0,
    xpAfter: 1,
    inkAwarded: 2,
  });
  assert.deepEqual(
    replayReward.selectReplaySparReward({
      receipt,
      reportId: receipt.reportId,
      ownedScribbitId: receipt.scribbitId,
    }),
    receipt
  );
  assert.equal(
    replayReward.selectReplaySparReward({
      receipt,
      reportId: 'other-report',
      ownedScribbitId: receipt.scribbitId,
    }),
    null
  );

  const registrySource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'registry.ts'),
    'utf8'
  );
  assert.match(
    registrySource,
    /setReplay[\s\S]*scene\.registry\.remove\(REPLAY_SPAR_REWARD_KEY\)/
  );
  assert.match(registrySource, /setSavedReplay[\s\S]*setReplay\(scene, report/);

  const replaySource = readFileSync(
    join(process.cwd(), 'src', 'client', 'scenes', 'Replay.ts'),
    'utf8'
  );
  assert.match(
    replaySource,
    /const reward = label\([\s\S]*outcomeLayout\.lifeY[\s\S]*rewardText/
  );
  assert.doesNotMatch(
    replaySource,
    /floatReward\(this,[\s\S]*rewardText/,
    'earned progression must remain visible on the result instead of fading away'
  );
  assert.match(
    replaySource,
    /const rewardAnnouncement =\s*rewardPlan\?\.accessibleLabel \?\? archivedInkReward/
  );
  assert.match(
    replaySource,
    /resultAnnouncement[\s\S]*rewardAnnouncement \? ` \$\{rewardAnnouncement\}` : ''/,
    'the same persistent payout must be included in the result live-region announcement'
  );
});
