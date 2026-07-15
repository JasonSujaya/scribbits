import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error(
    'Run continuous replay tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { calculateReplayFrame } = require(
  join(compiledClientRoot, 'lib', 'continuousreplay.js')
);

const fighterCheckpoint = ({ slot, position, velocity, hitPoints = 100 }) => ({
  slot,
  hitPoints,
  maxHitPoints: 100,
  position,
  velocity,
  primaryPower: 'scribble_shot',
  abilityPhase: 'ready',
  barrierHitPoints: 0,
  echoPosition: null,
});

const transcript = {
  fixedPointScale: 1_000,
  timeline: [
    {
      tick: 5,
      kind: 'damage',
      actor: 'b',
      targetFighter: 'a',
      targetHitPoints: 73,
      damage: 27,
      critical: false,
    },
  ],
  checkpoints: [
    {
      tick: 0,
      arenaHalfWidth: 8_000,
      arenaHalfHeight: 5_000,
      fighters: [
        fighterCheckpoint({
          slot: 'a',
          position: { x: 0, y: 0 },
          velocity: { x: 20, y: 0 },
        }),
        fighterCheckpoint({
          slot: 'b',
          position: { x: 1_000, y: 200 },
          velocity: { x: 0, y: 0 },
        }),
      ],
    },
    {
      tick: 10,
      arenaHalfWidth: 7_800,
      arenaHalfHeight: 4_800,
      fighters: [
        fighterCheckpoint({
          slot: 'a',
          position: { x: 100, y: 100 },
          velocity: { x: 0, y: 20 },
          hitPoints: 73,
        }),
        fighterCheckpoint({
          slot: 'b',
          position: { x: 1_000, y: 200 },
          velocity: { x: 0, y: 0 },
        }),
      ],
    },
  ],
  result: {
    winner: 'b',
    loser: 'a',
    reason: 'timeout',
    completedTick: 10,
  },
};

test('fighter movement follows authoritative velocity between checkpoints', () => {
  const midpoint = calculateReplayFrame(transcript, 5);

  assert.deepEqual(midpoint.fighters[0].position, { x: 75, y: 25 });
  assert.notDeepEqual(
    midpoint.fighters[0].position,
    { x: 50, y: 50 },
    'velocity-aware motion should not fall back to a linear checkpoint blend'
  );
});

test('fighter movement lands exactly on authoritative checkpoint positions', () => {
  assert.deepEqual(calculateReplayFrame(transcript, 0).fighters[0].position, {
    x: 0,
    y: 0,
  });
  assert.deepEqual(calculateReplayFrame(transcript, 10).fighters[0].position, {
    x: 100,
    y: 100,
  });
});

test('velocity smoothing does not delay authoritative timeline state', () => {
  assert.equal(
    calculateReplayFrame(transcript, 4.99).fighters[0].hitPoints,
    100
  );
  assert.equal(calculateReplayFrame(transcript, 5).fighters[0].hitPoints, 73);
});
