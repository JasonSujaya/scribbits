import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error('Run Legacy return presentation tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const legacyReturnPresentation = require(
  join(compiledClientRoot, 'lib', 'legacyreturnpresentation.js')
);

const createLegacyCard = ({
  id,
  finish,
  archivedDay = 12,
  wins = 4,
  losses = 1,
  level = 3,
}) => ({
  id,
  legacy: { finish, archivedDay, wins, losses, level },
});

test('Legacy return presentation prioritizes the strongest saved story', () => {
  const fadedCard = createLegacyCard({
    id: 'faded-card',
    finish: 'faded',
    archivedDay: 14,
  });
  const believedCard = createLegacyCard({
    id: 'beloved-card',
    finish: 'believed',
    archivedDay: 13,
  });
  const championCard = createLegacyCard({
    id: 'champion-card',
    finish: 'champion',
    archivedDay: 12,
    wins: 9,
    losses: 2,
    level: 7,
  });

  assert.equal(
    legacyReturnPresentation.formatLegacyFinishLabel(championCard),
    'CHAMPION'
  );
  assert.equal(
    legacyReturnPresentation.formatLegacyFinishLabel(believedCard),
    'BELOVED LEGEND'
  );
  assert.equal(
    legacyReturnPresentation.formatLegacyFinishLabel(fadedCard),
    'FADED'
  );

  const championPlan = legacyReturnPresentation.planLegacyReturnPresentation({
    cards: [fadedCard, believedCard, championCard],
    total: 3,
    newestArchivedDay: fadedCard.legacy.archivedDay,
  });

  assert.equal(
    championPlan?.hero.id,
    championCard.id,
    'a Champion remains the ceremony hero even when it is not the newest card'
  );
  assert.equal(championPlan?.eyebrow, '3 CARDS SAVED');
  assert.equal(championPlan?.headline, 'LEGEND!');
  assert.equal(championPlan?.summary, 'CHAMPION • 9–2 • LV 7');
  assert.ok(
    [championPlan?.eyebrow, championPlan?.headline, championPlan?.summary].every(
      (copy) => typeof copy === 'string' && copy.length <= 40
    ),
    'return ceremony copy remains concise'
  );
});

test('Legacy return presentation falls back through beloved and faded stories', () => {
  const fadedCard = createLegacyCard({
    id: 'faded-card',
    finish: 'faded',
    archivedDay: 14,
  });
  const believedCard = createLegacyCard({
    id: 'beloved-card',
    finish: 'believed',
    archivedDay: 13,
  });

  const believedPlan = legacyReturnPresentation.planLegacyReturnPresentation({
    cards: [fadedCard, believedCard],
    total: 2,
    newestArchivedDay: fadedCard.legacy.archivedDay,
  });
  assert.equal(believedPlan?.hero.id, believedCard.id);
  assert.equal(believedPlan?.headline, 'LEGEND!');

  const fadedPlan = legacyReturnPresentation.planLegacyReturnPresentation({
    cards: [fadedCard],
    total: 1,
    newestArchivedDay: fadedCard.legacy.archivedDay,
  });
  assert.equal(fadedPlan?.eyebrow, 'DAY 14');
  assert.equal(fadedPlan?.headline, 'MEMORY SAVED');
  assert.equal(
    legacyReturnPresentation.planLegacyReturnPresentation({
      cards: [],
      total: 0,
      newestArchivedDay: 0,
    }),
    null
  );
});
