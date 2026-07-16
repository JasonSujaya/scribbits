import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error('Run API refresh retry tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { getBusyGetRetryDelay, waitForBusyGetRetryDelay } = require(
  join(compiledClientRoot, 'lib', 'apiretry.js')
);
const { claimDailyLogin, fetchArena } = require(
  join(compiledClientRoot, 'lib', 'api.js')
);

test('refresh-safe GET retries use a short bounded backoff', () => {
  assert.deepEqual(
    Array.from({ length: 8 }, (_, retryIndex) =>
      getBusyGetRetryDelay(retryIndex)
    ),
    [100, 250, 500, 1_000, 2_000, 2_000, 2_000, 2_000]
  );
  assert.equal(getBusyGetRetryDelay(-1), undefined);
  assert.equal(getBusyGetRetryDelay(0.5), undefined);
});

test('busy retry waits stop immediately when the request times out', async () => {
  const controller = new AbortController();
  const wait = waitForBusyGetRetryDelay(2_000, controller.signal);
  controller.abort();
  await assert.rejects(wait, { name: 'AbortError' });
});

test('refresh retries a busy Arena read and reaches the replacement response', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount < 3) {
      return Response.json(
        {
          status: 'error',
          code: 'busy',
          message: 'Another game action is finishing. Try again.',
        },
        { status: 409 }
      );
    }
    return Response.json({ day: 7 });
  };

  try {
    assert.deepEqual(await fetchArena(), { ok: true, data: { day: 7 } });
    assert.equal(requestCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('player actions do not retry a busy conflict', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json(
      {
        status: 'error',
        code: 'busy',
        message: 'Another game action is finishing. Try again.',
      },
      { status: 409 }
    );
  };

  try {
    assert.deepEqual(await claimDailyLogin(), {
      ok: false,
      error: 'Another game action is finishing. Try again.',
    });
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cached conflict responses keep refresh retry compatibility', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return Response.json(
        {
          status: 'error',
          code: 'conflict',
          message: 'Another game action is finishing. Try again.',
        },
        { status: 409 }
      );
    }
    return Response.json({ day: 8 });
  };

  try {
    assert.deepEqual(await fetchArena(), { ok: true, data: { day: 8 } });
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a real Arena conflict still fails immediately', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json(
      {
        status: 'error',
        code: 'conflict',
        message: 'The Rumble is resolving. Try again in a moment.',
      },
      { status: 409 }
    );
  };

  try {
    assert.deepEqual(await fetchArena(), {
      ok: false,
      error: 'The Rumble is resolving. Try again in a moment.',
    });
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API retries only idempotent busy responses', async () => {
  const apiSource = await readFile(
    new URL('../src/client/lib/api.ts', import.meta.url),
    'utf8'
  );

  assert.match(
    apiSource,
    /init\.method === 'GET' && serverError\.code === 'busy'/
  );
  assert.match(apiSource, /getBusyGetRetryDelay\(busyRetryIndex\)/);
});
