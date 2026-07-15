import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ceremonySource = await readFile(
  new URL('../src/client/lib/battleceremony.ts', import.meta.url),
  'utf8'
);

const timingBlockMatch = ceremonySource.match(
  /export const VS_CEREMONY_TIMING = Object\.freeze\(\{([\s\S]*?)\}\);/
);
assert.ok(
  timingBlockMatch,
  'battle ceremony should expose one timing contract'
);

const timingBlock = timingBlockMatch[1];
const readTiming = (name) => {
  const match = timingBlock.match(new RegExp(`${name}: ([\\d_]+)`));
  assert.ok(match, `missing ${name} from battle ceremony timing`);
  return Number(match[1].replaceAll('_', ''));
};

test('the VS ceremony enters the replay within one smooth 1.2-1.5 second beat', () => {
  const standardTotal = readTiming('standardDwellMs') + readTiming('fadeMs');
  const storyTotal = readTiming('storyDwellMs') + readTiming('fadeMs');

  assert.ok(standardTotal >= 1_200 && standardTotal <= 1_500);
  assert.ok(storyTotal >= 1_200 && storyTotal <= 1_500);
  assert.ok(
    readTiming('fighterEntranceMs') + readTiming('badgePopMs') <
      readTiming('standardDwellMs'),
    'fighter and VS entrances should settle before the ceremony exits'
  );
});

test('reduced motion skips movement while retaining the full reading dwell', () => {
  assert.equal(readTiming('reducedMotionTweenMs'), 1);
  assert.match(
    ceremonySource,
    /const dwellMs =[\s\S]*scene\.time\.delayedCall\(dwellMs/,
    'the shared dwell must not be collapsed for reduced motion'
  );
  assert.doesNotMatch(ceremonySource, /reduceMotion \? 180/);
});

test('all ceremony animation stages use the shared timing contract', () => {
  for (const timingName of [
    'fighterEntranceMs',
    'badgeDelayMs',
    'badgePopMs',
    'clashDelayMs',
    'clashLifespanMs',
    'clashCleanupMs',
    'standardDwellMs',
    'storyDwellMs',
    'fadeMs',
    'reducedMotionTweenMs',
  ]) {
    const references = ceremonySource.match(
      new RegExp(`VS_CEREMONY_TIMING\\.${timingName}`, 'g')
    );
    assert.ok(
      references && references.length > 0,
      `${timingName} should drive the ceremony implementation`
    );
  }

  assert.doesNotMatch(ceremonySource, /rivalryStakes \? 3000 : 2800/);
});
