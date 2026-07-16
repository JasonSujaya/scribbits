import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledServerRoot || !compiledSharedRoot) {
  throw new Error('Run feedback tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const feedbackStore = require(join(compiledServerRoot, 'core', 'feedback.js'));
const feedbackContract = require(join(compiledSharedRoot, 'feedback.js'));

const makeFeedback = (overrides = {}) => ({
  id: 'feedback-1',
  userId: 't2_player',
  username: 'player',
  category: 'idea',
  message: '  Great game!  ',
  sourceScene: 'ScribbitHome',
  appVersion: '1.2.3',
  createdAtMs: 1_000,
  ...overrides,
});

test('feedback requests are trimmed and strictly bounded', () => {
  assert.deepEqual(
    feedbackContract.parseSubmitFeedbackRequest({
      category: 'bug',
      message: '  The button is stuck.  ',
      sourceScene: ' Draw ',
      appVersion: ' 1.2.3 ',
    }),
    {
      category: 'bug',
      message: 'The button is stuck.',
      sourceScene: 'Draw',
      appVersion: '1.2.3',
    }
  );
  assert.equal(
    feedbackContract.parseSubmitFeedbackRequest({
      category: 'idea',
      message: '  ',
    }),
    undefined
  );
  assert.equal(
    feedbackContract.parseSubmitFeedbackRequest({
      category: 'unknown',
      message: 'Valid length',
    }),
    undefined
  );
  assert.equal(
    feedbackContract.parseSubmitFeedbackRequest({
      category: 'other',
      message: 'x'.repeat(
        feedbackContract.FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS + 1
      ),
    }),
    undefined
  );
  assert.ok(
    feedbackContract.parseSubmitFeedbackRequest({
      category: 'balance',
      message: 'x'.repeat(feedbackContract.FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS),
    })
  );
});

test('blank feedback never saves or awards Ink', async () => {
  const memory = createMemoryStorage();
  await assert.rejects(
    feedbackStore.savePlayerFeedback(
      memory.storage,
      makeFeedback({ message: '   ' })
    ),
    /message is invalid/
  );
  assert.equal(await memory.storage.get('ink:t2_player'), undefined);
  assert.deepEqual(
    (await feedbackStore.loadFeedbackPage(memory.storage)).entries,
    []
  );
});

test('feedback is versioned, private by user, and listed newest first', async () => {
  const memory = createMemoryStorage();
  const older = await feedbackStore.savePlayerFeedback(
    memory.storage,
    makeFeedback()
  );
  const newer = await feedbackStore.savePlayerFeedback(
    memory.storage,
    makeFeedback({
      id: 'feedback-2',
      category: 'bug',
      message: 'The battle froze.',
      createdAtMs: 2_000,
    })
  );

  assert.equal(older.feedback.message, 'Great game!');
  assert.equal(older.feedback.version, 1);
  assert.equal(older.inkAwarded, 5);
  assert.equal(older.ink, 5);
  assert.equal(newer.feedback.sourceScene, 'ScribbitHome');
  assert.equal(newer.inkAwarded, 0);
  assert.equal(newer.ink, 5);
  assert.deepEqual(
    (await feedbackStore.loadFeedbackPage(memory.storage)).entries.map(
      ({ id }) => id
    ),
    ['feedback-2', 'feedback-1']
  );
  const firstPage = await feedbackStore.loadFeedbackPage(memory.storage, {
    limit: 1,
  });
  assert.deepEqual(
    firstPage.entries.map(({ id }) => id),
    ['feedback-2']
  );
  assert.equal(firstPage.nextCursor, '1');
  const secondPage = await feedbackStore.loadFeedbackPage(memory.storage, {
    cursor: firstPage.nextCursor,
    limit: 1,
  });
  assert.deepEqual(
    secondPage.entries.map(({ id }) => id),
    ['feedback-1']
  );
  assert.equal(secondPage.nextCursor, null);

  await feedbackStore.deleteFeedbackForUser(memory.storage, 't2_player');
  assert.deepEqual(
    (await feedbackStore.loadFeedbackPage(memory.storage)).entries,
    []
  );
  assert.equal(
    await memory.storage.get(feedbackStore.getFeedbackRewardKey('t2_player')),
    undefined
  );
});

test('feedback listing skips corrupt records and daily submissions are capped', async () => {
  const memory = createMemoryStorage();
  await memory.storage.hSet(feedbackStore.getFeedbackRecordsKey(), {
    corrupt: '{not-json',
  });
  await memory.storage.zAdd(feedbackStore.getFeedbackIndexKey(), {
    member: 'corrupt',
    score: 9_000,
  });
  assert.deepEqual(
    (await feedbackStore.loadFeedbackPage(memory.storage)).entries,
    []
  );

  for (let index = 0; index < 5; index += 1) {
    await feedbackStore.savePlayerFeedback(
      memory.storage,
      makeFeedback({ id: `feedback-${index}`, createdAtMs: 10_000 + index })
    );
  }
  await assert.rejects(
    feedbackStore.savePlayerFeedback(
      memory.storage,
      makeFeedback({ id: 'feedback-over-limit', createdAtMs: 20_000 })
    ),
    feedbackStore.FeedbackRateLimitError
  );
  assert.equal(
    await memory.storage.get(
      feedbackStore.getFeedbackDailyLimitKey('t2_player', new Date(20_000))
    ),
    '5'
  );
});

test('only the first saved note awards Mystery Ink', async () => {
  const memory = createMemoryStorage();
  const left = await feedbackStore.savePlayerFeedback(
    memory.storage,
    makeFeedback({ id: 'feedback-left', createdAtMs: 30_000 })
  );
  const right = await feedbackStore.savePlayerFeedback(
    memory.storage,
    makeFeedback({ id: 'feedback-right', createdAtMs: 30_001 })
  );

  assert.deepEqual(
    [left.inkAwarded, right.inkAwarded].sort((a, b) => a - b),
    [0, 5]
  );
  assert.equal(await memory.storage.get('ink:t2_player'), '5');
});

test('a lost transaction reply recovers the saved note and one Ink reward', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const result = await feedbackStore.savePlayerFeedback(
    memory.storage,
    makeFeedback({ id: 'feedback-recovered', createdAtMs: 40_000 })
  );

  assert.equal(result.feedback.id, 'feedback-recovered');
  assert.equal(result.inkAwarded, 5);
  assert.equal(result.ink, 5);
  assert.equal(await memory.storage.get('ink:t2_player'), '5');
  assert.equal(
    (await feedbackStore.loadFeedbackPage(memory.storage)).entries.length,
    1
  );
});
