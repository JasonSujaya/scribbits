import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  POWER_UP_RARITY_ORDER,
  adjacentLowerPowerUpRarity,
  powerUpRarityComparisonBand,
  powerUpRarityComparisonVerdict,
  powerUpRarityRank,
  powerUpTierAdvantageVerdict,
} from '../tools/balancer/rarity-model.mjs';

const scenarios = JSON.parse(
  await readFile(new URL('../tools/balancer/scenarios.json', import.meta.url))
);
const config = scenarios.suites.powerUpUsefulness;

test('Power-Up rarity order has one adjacent lower comparison per higher tier', () => {
  assert.deepEqual(POWER_UP_RARITY_ORDER, [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
  ]);
  assert.equal(adjacentLowerPowerUpRarity('common'), null);
  assert.equal(adjacentLowerPowerUpRarity('uncommon'), 'common');
  assert.equal(adjacentLowerPowerUpRarity('rare'), 'uncommon');
  assert.equal(adjacentLowerPowerUpRarity('epic'), 'rare');
  assert.equal(adjacentLowerPowerUpRarity('legendary'), 'epic');
  assert.ok(powerUpRarityRank('legendary') > powerUpRarityRank('epic'));
});

test('every adjacent rarity step must win a bounded majority without exponential power creep', () => {
  const minimums = ['uncommon', 'rare', 'epic', 'legendary'].map(
    (rarity) =>
      powerUpRarityComparisonBand(config, 'rarity-advantage', rarity).minimum
  );
  assert.deepEqual(minimums, [0.48, 0.48, 0.48, 0.48]);
  assert.equal(
    powerUpRarityComparisonVerdict({
      config,
      comparisonKind: 'rarity-advantage',
      targetRarity: 'rare',
      targetWinRate: 0.6,
      triggerRate: 1,
    }),
    'OK'
  );
  assert.equal(
    powerUpRarityComparisonVerdict({
      config,
      comparisonKind: 'rarity-advantage',
      targetRarity: 'epic',
      targetWinRate: 0.47,
      triggerRate: 1,
    }),
    'FLAG_RARITY_ADVANTAGE_MISSING'
  );
  assert.equal(powerUpTierAdvantageVerdict(config, 0.57), 'OK');
  assert.equal(
    powerUpTierAdvantageVerdict(config, 0.49),
    'FLAG_TIER_ADVANTAGE_MISSING'
  );
});

test('equal-rarity cards must stay close and every tested card must activate', () => {
  assert.equal(
    powerUpRarityComparisonVerdict({
      config,
      comparisonKind: 'equal-rarity',
      targetRarity: 'common',
      targetWinRate: 0.5,
      triggerRate: 0.8,
    }),
    'OK'
  );
  assert.equal(
    powerUpRarityComparisonVerdict({
      config,
      comparisonKind: 'equal-rarity',
      targetRarity: 'common',
      targetWinRate: 0.7,
      triggerRate: 0.1,
    }),
    'FLAG_DEAD_CARD+FLAG_EQUAL_RARITY_OVERPOWERED'
  );
});

test('Monte Carlo compares upgraded fighters and gives Legendary cards legal support', async () => {
  const runner = await readFile(
    new URL('../tools/balancer/run.mjs', import.meta.url),
    'utf8'
  );
  const usefulnessStart = runner.indexOf('function runPowerUpUsefulness');
  const usefulnessEnd = runner.indexOf('function runRivalRunRisk');
  const usefulnessSource = runner.slice(usefulnessStart, usefulnessEnd);
  assert.match(usefulnessSource, /opponentOverrides:\s*{\s*powerUpIds:/);
  assert.match(usefulnessSource, /comparisonKind:\s*'equal-rarity'/);
  assert.match(usefulnessSource, /comparisonKind:\s*'rarity-advantage'/);
  assert.match(usefulnessSource, /targetUpgradeCount:\s*1/);
  assert.match(usefulnessSource, /targetUpgradeCount:\s*4/);
  assert.match(usefulnessSource, /buildLegendarySupport/);
  assert.match(usefulnessSource, /opponentBuild:\s*targetBuild/);
  assert.doesNotMatch(
    usefulnessSource,
    /for \(const opponentBuild of builds\)/
  );
  assert.match(runner, /comparisonScope:\s*'mirror-role'/);
  assert.match(usefulnessSource, /summarizePowerUpTierAdvantages/);
  assert.doesNotMatch(usefulnessSource, /Paired no-Power-Up field/);

  const rewardStart = runner.indexOf('function runRewardPath');
  const rewardEnd = runner.indexOf('const ROLE_GEAR_FAMILY_PRIORITY');
  const rewardSource = runner.slice(rewardStart, rewardEnd);
  assert.match(rewardSource, /rarity-weighted upgraded field/);
  assert.doesNotMatch(
    rewardSource,
    /immediate reward|variantId:\s*'immediate'/
  );
});
