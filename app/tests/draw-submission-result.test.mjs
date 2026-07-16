import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error('Run Draw submission tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { projectSubmittedScribbitArena } = require(
  join(compiledClientRoot, 'lib', 'drawsubmissionresult.js')
);
const { INK_REWARDS, MAX_ALIVE_PER_USER } = require(
  join(compiledSharedRoot, 'arena.js')
);

const makeScribbit = (id, bornDay = 9) => ({ id, bornDay });
const makeArena = (overrides = {}) => ({
  dayNumber: 9,
  hasCreatedScribbit: false,
  drawnToday: false,
  enteredToday: false,
  drawCharges: { available: 3, capacity: 3, nextRefreshAt: null },
  rumbleEntrants: 0,
  todayEntrants: [],
  myInk: 20,
  myDrawingSupplies: { ink: 2, brush: 1 },
  myScribbits: [],
  pendingPowerUpOffers: [],
  ...overrides,
});
const makeInput = (arena, scribbit, overrides = {}) => ({
  arena,
  scribbit,
  drawingSupplies: { drawingInkId: 'ink', brushId: 'brush' },
  drawCharges: { available: 2, capacity: 3, nextRefreshAt: 123 },
  enteredRumble: true,
  powerUpOffer: null,
  ...overrides,
});

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

test('a repeated submission does not double-charge supplies or award Ink', () => {
  const scribbit = makeScribbit('submitted');
  const arena = makeArena({
    todayEntrants: [scribbit],
    myScribbits: [scribbit],
  });

  const result = projectSubmittedScribbitArena(makeInput(arena, scribbit));

  assert.equal(result.status, 'applied');
  assert.equal(result.alreadyTracked, true);
  assert.equal(result.arena.myInk, arena.myInk);
  assert.deepEqual(result.arena.myDrawingSupplies, arena.myDrawingSupplies);
  assert.equal(result.arena.todayEntrants.length, 1);
  assert.equal(result.arena.myScribbits.length, 1);
});

test('partial retry state repairs whichever submitted collection is missing', () => {
  const scribbit = makeScribbit('submitted');
  const rosterOnlyResult = projectSubmittedScribbitArena(
    makeInput(makeArena({ myScribbits: [scribbit] }), scribbit)
  );
  assert.equal(rosterOnlyResult.alreadyTracked, true);
  assert.deepEqual(rosterOnlyResult.arena.todayEntrants, [scribbit]);
  assert.deepEqual(rosterOnlyResult.arena.myScribbits, [scribbit]);

  const entrantOnlyResult = projectSubmittedScribbitArena(
    makeInput(makeArena({ todayEntrants: [scribbit] }), scribbit)
  );
  assert.equal(entrantOnlyResult.alreadyTracked, true);
  assert.deepEqual(entrantOnlyResult.arena.todayEntrants, [scribbit]);
  assert.deepEqual(entrantOnlyResult.arena.myScribbits, [scribbit]);
  assert.equal(entrantOnlyResult.arena.myInk, 20);
  assert.deepEqual(entrantOnlyResult.arena.myDrawingSupplies, {
    ink: 2,
    brush: 1,
  });
});

test('a submission from another Arena day leaves the current snapshot alone', () => {
  const arena = makeArena();
  const snapshot = structuredClone(arena);

  const result = projectSubmittedScribbitArena(
    makeInput(arena, makeScribbit('stale', arena.dayNumber - 1))
  );

  assert.deepEqual(result, { status: 'day-changed' });
  assert.deepEqual(arena, snapshot);
});

test('rumble entry is optional and the same entrant is added at most once', () => {
  const scribbit = makeScribbit('submitted');
  const arena = makeArena();
  const notEntered = projectSubmittedScribbitArena(
    makeInput(arena, scribbit, { enteredRumble: false })
  );
  assert.equal(notEntered.arena.todayEntrants.length, 0);
  assert.equal(notEntered.arena.enteredToday, false);

  const entered = projectSubmittedScribbitArena(makeInput(arena, scribbit));
  assert.deepEqual(entered.arena.todayEntrants.map(({ id }) => id), [
    scribbit.id,
  ]);
  assert.equal(entered.arena.enteredToday, true);

  const repeated = projectSubmittedScribbitArena(
    makeInput(entered.arena, scribbit)
  );
  assert.equal(repeated.arena.todayEntrants.length, 1);
});

test('the owned roster stays newest-first and capped', () => {
  const existing = Array.from({ length: MAX_ALIVE_PER_USER }, (_, index) =>
    makeScribbit(`existing-${index}`)
  );
  const scribbit = makeScribbit('submitted');

  const result = projectSubmittedScribbitArena(
    makeInput(makeArena({ myScribbits: existing }), scribbit)
  );

  assert.deepEqual(result.arena.myScribbits.map(({ id }) => id), [
    scribbit.id,
    ...existing.slice(0, MAX_ALIVE_PER_USER - 1).map(({ id }) => id),
  ]);
});

test('a submission replaces only its own pending Power-Up offer', () => {
  const scribbit = makeScribbit('submitted');
  const unrelatedOffer = { scribbitId: 'other', offerId: 'keep' };
  const staleOffer = { scribbitId: scribbit.id, offerId: 'stale' };
  const replacementOffer = { scribbitId: scribbit.id, offerId: 'replacement' };
  const arena = makeArena({
    pendingPowerUpOffers: [unrelatedOffer, staleOffer, staleOffer],
  });

  const result = projectSubmittedScribbitArena(
    makeInput(arena, scribbit, { powerUpOffer: replacementOffer })
  );

  assert.deepEqual(result.arena.pendingPowerUpOffers, [
    unrelatedOffer,
    replacementOffer,
  ]);
});

test('projection preserves its input and nested collections', () => {
  const scribbit = deepFreeze(makeScribbit('submitted'));
  const arena = deepFreeze(
    makeArena({ pendingPowerUpOffers: [{ scribbitId: 'other' }] })
  );
  const snapshot = structuredClone(arena);

  const result = projectSubmittedScribbitArena(makeInput(arena, scribbit));

  assert.equal(result.status, 'applied');
  assert.deepEqual(arena, snapshot);
  assert.notEqual(result.arena, arena);
  assert.notEqual(result.arena.myDrawingSupplies, arena.myDrawingSupplies);
  assert.equal(result.arena.myInk, arena.myInk + INK_REWARDS.dailyDraw);
});
