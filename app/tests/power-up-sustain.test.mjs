import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error('Run Power-Up sustain tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const combat = require(join(compiledSharedRoot, 'combat', 'index.js'));
const transcriptValidation = require(
  join(compiledSharedRoot, 'combat', 'transcriptvalidation.js')
);

const stats = (dominantStat) => ({
  chonk: dominantStat === 'chonk' ? 55 : 15,
  spike: dominantStat === 'spike' ? 55 : 15,
  zip: dominantStat === 'zip' ? 55 : 15,
  charm: dominantStat === 'charm' ? 55 : 15,
});

test('sustain Power-Ups restore health without exceeding maximum health', () => {
  const healingEvents = [];
  const roles = ['chonk', 'spike', 'charm'];
  for (const ownerRole of roles) {
    for (const rivalRole of roles) {
      for (let seed = 0; seed < 12; seed += 1) {
        const transcript = combat.simulateCombat({
          seed: `sustain-power-ups-${ownerRole}-${rivalRole}-${seed}`,
          fighters: [
            {
              id: 'sustain-owner',
              name: 'Sustain Owner',
              stats: stats(ownerRole),
              powerUpIds: [
                'v1-combo-spark',
                'v1-center-fold',
                'v1-last-scribble',
              ],
            },
            {
              id: 'sustain-rival',
              name: 'Sustain Rival',
              stats: stats(rivalRole),
            },
          ],
        });
        assert.ok(transcriptValidation.parseBattleTranscript(transcript));
        healingEvents.push(
          ...transcript.timeline.filter(
            (event) => event.kind === 'healing' && event.actor === 'a'
          )
        );
      }
    }
  }

  assert.ok(healingEvents.length > 0);
  assert.ok(
    healingEvents.some((event) => event.powerUpId === 'v1-combo-spark')
  );
  assert.ok(
    healingEvents.some((event) => event.powerUpId === 'v1-center-fold')
  );
  assert.ok(
    healingEvents.every(
      (event) => event.amount > 0 && event.targetHitPoints > event.amount
    )
  );
});

test('the redesigned catalog triggers across deterministic role matchups', () => {
  const builds = [
    [
      'v1-edge-spring',
      'v1-smudge-step',
      'v1-paper-shield',
      'v1-combo-spark',
      'v1-endless-draft',
    ],
    [
      'v1-double-doodle',
      'v1-backup-plan',
      'v1-counter-sketch',
      'v1-wallop',
      'v1-echo-mark',
    ],
    [
      'v1-last-scribble',
      'v1-second-draft',
      'v1-paper-twin',
      'v1-center-fold',
      'v1-masterpiece',
    ],
  ];
  const triggeredIds = new Set();
  for (const build of builds) {
    for (const ownerRole of ['chonk', 'spike', 'charm']) {
      for (const rivalRole of ['chonk', 'spike', 'charm']) {
        for (let seed = 0; seed < 12; seed += 1) {
          const transcript = combat.simulateCombat({
            seed: `catalog-coverage-${build[0]}-${ownerRole}-${rivalRole}-${seed}`,
            fighters: [
              {
                id: 'catalog-owner',
                name: 'Catalog Owner',
                stats: stats(ownerRole),
                powerUpIds: build,
              },
              {
                id: 'catalog-rival',
                name: 'Catalog Rival',
                stats: stats(rivalRole),
              },
            ],
          });
          transcript.timeline.forEach((event) => {
            if (event.kind === 'power_up_triggered' && event.actor === 'a') {
              triggeredIds.add(event.powerUpId);
            }
          });
        }
      }
    }
  }

  assert.deepEqual(
    [...combat.POWER_UP_IDS].filter((id) => !triggeredIds.has(id)),
    []
  );
});
