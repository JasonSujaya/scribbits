import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledSharedRoot) {
  throw new Error(
    'Run Founder Rival Episode tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const founderRivalEpisodes = require(
  join(compiledSharedRoot, 'content', 'founderrivalepisodes.js')
);

test('Founder Rival Episode catalog preserves shape, immutability, and page lookup', () => {
  const founderRivalEpisodeValidation =
    founderRivalEpisodes.validateFounderRivalEpisodeArcs();
  assert.equal(founderRivalEpisodeValidation.valid, true);
  assert.deepEqual(founderRivalEpisodeValidation.errors, []);
  assert.equal(founderRivalEpisodeValidation.arcCount, 20);
  assert.equal(founderRivalEpisodeValidation.pageCount, 60);
  assert.equal(founderRivalEpisodeValidation.resultLineCount, 120);
  assert.ok(Object.isFrozen(founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS));

  founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.flatMap((arc) => {
    assert.ok(Object.isFrozen(arc));
    assert.ok(Object.isFrozen(arc.pages));
    assert.deepEqual(
      arc.pages.map((page) => page.pageNumber),
      [1, 2, 3],
      `${arc.founderId} should keep its three-page story order`
    );
    for (const page of arc.pages) {
      assert.ok(Object.isFrozen(page));
      assert.ok(Object.isFrozen(page.resultLines));
      assert.equal(
        founderRivalEpisodes.getFounderRivalEpisodePage(
          arc.founderId,
          page.pageNumber
        ),
        page,
        `${arc.founderId} page ${page.pageNumber} should resolve canonically`
      );
    }
    return arc.pages;
  });
});

test('Founder Rival Episode titles, cues, and outcomes stay uniquely canonical', () => {
  const founderRivalEpisodePages =
    founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.flatMap((arc) => arc.pages);
  assert.equal(
    new Set(founderRivalEpisodePages.map((page) => page.title)).size,
    60,
    'every rivalry page should have a unique title'
  );
  assert.equal(
    new Set(founderRivalEpisodePages.map((page) => page.cue)).size,
    60,
    'every rivalry page should have a unique founder cue'
  );
  const founderRivalEpisodeResultLines = founderRivalEpisodePages.flatMap(
    (page) => [page.resultLines.playerWon, page.resultLines.founderWon]
  );
  assert.equal(
    founderRivalEpisodeResultLines.length,
    120,
    'every page should resolve through both truthful battle outcomes'
  );
  assert.equal(
    new Set(founderRivalEpisodeResultLines).size,
    120,
    'every rivalry outcome should have a unique authored payoff'
  );
  assert.equal(
    founderRivalEpisodes.getFounderRivalEpisodeResultLine(
      'founding-fernibble',
      3,
      'player'
    ),
    'Fernibble salutes as your final lap reaches the waiting margin.'
  );
  assert.equal(
    founderRivalEpisodes.getFounderRivalEpisodeResultLine(
      'founding-fernibble',
      3,
      'founder'
    ),
    'Fernibble completes the last leaf lap and signs the margin.'
  );
});

test('Founder Rival Episode lookups reject invalid pages and founders', () => {
  for (const invalidPageNumber of [0, 4, Number.NaN]) {
    assert.equal(
      founderRivalEpisodes.getFounderRivalEpisodePage(
        'founding-mosswhisk',
        invalidPageNumber
      ),
      null
    );
  }
  assert.equal(
    founderRivalEpisodes.getFounderRivalEpisodePage('community-unknown', 1),
    null
  );
});

test('Founder Rival Episode validation rejects predicted outcomes and invented rewards', () => {
  const unsafeFounderRivalEpisodeArcs =
    founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.map((arc, arcIndex) =>
      arcIndex === 0
        ? {
            ...arc,
            pages: arc.pages.map((page, pageIndex) =>
              pageIndex === 0
                ? { ...page, title: 'MARGIN SIGNED' }
                : { ...page }
            ),
          }
        : arc
    );
  const unsafeFounderRivalEpisodeValidation =
    founderRivalEpisodes.validateFounderRivalEpisodeArcs(
      unsafeFounderRivalEpisodeArcs
    );
  assert.equal(unsafeFounderRivalEpisodeValidation.valid, false);
  assert.match(
    unsafeFounderRivalEpisodeValidation.errors.join('\n'),
    /predicts an outcome or promises a reward/,
    'pre-fight episode copy must reject claims that the margin is already signed'
  );

  const rewardClaimFounderRivalEpisodeArcs =
    founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.map((arc, arcIndex) =>
      arcIndex === 0
        ? {
            ...arc,
            pages: arc.pages.map((page, pageIndex) =>
              pageIndex === 0
                ? {
                    ...page,
                    resultLines: {
                      ...page.resultLines,
                      playerWon:
                        'Mosswhisk gives your mark a guaranteed XP prize.',
                    },
                  }
                : page
            ),
          }
        : arc
    );
  const rewardClaimFounderRivalEpisodeValidation =
    founderRivalEpisodes.validateFounderRivalEpisodeArcs(
      rewardClaimFounderRivalEpisodeArcs
    );
  assert.equal(rewardClaimFounderRivalEpisodeValidation.valid, false);
  assert.match(
    rewardClaimFounderRivalEpisodeValidation.errors.join('\n'),
    /must not promise an economy reward/,
    'narrative result copy must never invent progression rewards'
  );
});
