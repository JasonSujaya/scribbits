import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error(
    'Run battle share tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const battleShare = require(join(compiledSharedRoot, 'battleshare.js'));

test('battle share data accepts only bounded Reddit-hosted clips', () => {
  const videoUrl = 'https://v.redd.it/scribbits-battle.webm';
  const serialized = battleShare.serializeBattleShareData(videoUrl);
  assert.ok(serialized);
  assert.deepEqual(battleShare.parseBattleShareData(serialized), {
    version: 1,
    clipUrl: videoUrl,
  });
  assert.equal(
    battleShare.serializeBattleShareData('https://example.com/battle.webm'),
    null
  );
  assert.equal(
    battleShare.parseBattleShareData(
      JSON.stringify({ version: 1, clipUrl: 'javascript:alert(1)' })
    ),
    null
  );
  assert.equal(
    battleShare.parseBattleShareData(
      'x'.repeat(battleShare.BATTLE_SHARE_DATA_MAXIMUM_CHARACTERS + 1)
    ),
    null
  );
});

test('battle clip uploads accept bounded WebM and MP4 data URLs only', () => {
  const validWebm = battleShare.parseBattleClipDataUrl(
    `data:video/webm;codecs=vp8;base64,${Buffer.from('battle').toString('base64')}`
  );
  assert.equal(validWebm?.byteLength, 6);
  assert.ok(
    battleShare.parseBattleClipDataUrl(
      `data:video/mp4;base64,${Buffer.from('battle').toString('base64')}`
    )
  );
  assert.equal(
    battleShare.parseBattleClipDataUrl(
      `data:image/png;base64,${Buffer.from('battle').toString('base64')}`
    ),
    null
  );
  assert.equal(battleShare.parseBattleClipDataUrl('https://example.com'), null);
  assert.equal(
    battleShare.parseBattleClipDataUrl(
      `data:video/webm;base64,${'A'.repeat(
        Math.ceil((battleShare.BATTLE_CLIP_MAXIMUM_BYTES * 4) / 3) + 8
      )}`
    ),
    null
  );
});
