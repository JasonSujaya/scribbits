import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PNG } from 'pngjs';

const iconBytes = await readFile(
  new URL('../src/client/assets/scribbits-app-icon.png', import.meta.url)
);
const icon = PNG.sync.read(iconBytes);

test('the Devvit app avatar is a valid hand-drawn square icon', () => {
  assert.equal(icon.width, 1024);
  assert.equal(icon.height, 1024);
  assert.ok(iconBytes.byteLength <= 500 * 1024);
  assert.equal(icon.data[3], 0, 'the square corner should stay transparent');

  const centerOffset = (512 * icon.width + 512) * 4;
  assert.ok(icon.data[centerOffset + 3] > 0);
});
