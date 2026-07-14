import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error(
    'Run replay commentary copy tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { createReplayCommentaryAuthor } = require(
  join(compiledClientRoot, 'lib', 'replaycommentary.js')
);
const { validateInkcastCommentaryPack } = require(
  join(compiledSharedRoot, 'content', 'replaycommentary.js')
);

const context = {
  battleId: 'plain-copy-proof',
  fighters: {
    a: {
      id: 'paper-spark',
      name: 'Paper Spark',
      element: 'ember',
      primaryPower: 'nib_halo',
    },
    b: {
      id: 'bristle',
      name: 'Bristle',
      element: 'moss',
      primaryPower: 'inkquake',
    },
  },
};

const forbiddenJargon =
  /Ink connects|afterburn|page-check|INK PRESSURE|SUDDEN SCRIBBLE|\bnib\b|\becho\b|capped|cooldown|uncaps|live nibs|orbiting ink|two-step ink|palette|\bcone\b|point tremor|folds .*lane/i;

function assertPlainBattleLine(line) {
  assert.doesNotMatch(line, forbiddenJargon);
  assert.ok(line.length <= 70, `battle line is too long: ${line}`);
}

test('battle damage copy uses fighter names and plain language', () => {
  const author = createReplayCommentaryAuthor(context);
  const damageLines = Array.from({ length: 5 }, (_, index) =>
    author.author({
      kind: 'damage',
      tick: index,
      sourceFighter: 'a',
      targetFighter: 'b',
      sourceName: 'Ember afterburn',
      sourcePower: null,
      amount: 2,
      critical: false,
    })
  );

  for (const line of damageLines) {
    assert.match(line, /Paper Spark/);
    assert.match(line, /Bristle/);
    assert.match(line, /2/);
    assertPlainBattleLine(line);
  }
});

test('status copy stays short and hides internal combat labels', () => {
  const author = createReplayCommentaryAuthor(context);
  const facts = [
    { kind: 'burn', tick: 1, targetFighter: 'b' },
    { kind: 'barrier-created', tick: 2, actor: 'b' },
    { kind: 'barrier-hit', tick: 3, actor: 'b', absorbedDamage: 4 },
    { kind: 'barrier-broken', tick: 4, actor: 'b' },
    { kind: 'ink-pressure', tick: 5, actor: 'a' },
    { kind: 'nib-recoil', tick: 6, actor: 'a' },
    { kind: 'arena-shrink', tick: 7 },
    { kind: 'echo-created', tick: 8, actor: 'a' },
    { kind: 'echo-fired', tick: 9, actor: 'a' },
    { kind: 'echo-shattered', tick: 10, actor: 'a' },
    { kind: 'late-fight', tick: 11 },
  ];

  for (const fact of facts) {
    assertPlainBattleLine(author.author(fact));
  }
});

test('power commentary uses simple player-facing sentences', () => {
  const powers = ['inkquake', 'nib_halo', 'smearstep', 'colorburst'];

  for (const power of powers) {
    const author = createReplayCommentaryAuthor({
      ...context,
      battleId: `plain-${power}`,
      fighters: {
        ...context.fighters,
        a: { ...context.fighters.a, id: `plain-${power}`, primaryPower: power },
      },
    });

    for (let index = 0; index < 5; index += 1) {
      assertPlainBattleLine(
        author.author({
          kind: 'power-telegraph',
          tick: index,
          actor: 'a',
          power,
          activationNumber: index + 2,
        })
      );
      assertPlainBattleLine(
        author.author({
          kind: 'damage',
          tick: index,
          sourceFighter: 'a',
          targetFighter: 'b',
          sourceName: 'internal power label',
          sourcePower: power,
          amount: 3,
          critical: false,
        })
      );
    }

    if (power !== 'colorburst') {
      for (let index = 0; index < 4; index += 1) {
        assertPlainBattleLine(
          author.author({
            kind: 'power-missed',
            tick: index,
            actor: 'a',
            power,
            activationNumber: index + 2,
          })
        );
      }
    }
  }
});

test('the simplified v2 commentary pack remains valid', () => {
  const validation = validateInkcastCommentaryPack();
  assert.equal(validation.valid, true, validation.errors.join('\n'));
});
