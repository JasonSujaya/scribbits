import assert from 'node:assert/strict';
import test from 'node:test';
import {
  installationIncludesVersion,
  outputIncludesRuntimeReady,
  parsePlaytestVersion,
} from '../scripts/test-devvit-playtest.mjs';

test('Devvit playtest output yields the installed prerelease version', () => {
  const output = [
    '\u001b[32m✓ Playtest ready\u001b[0m',
    '➜ URL: https://www.reddit.com/r/scribbits_dev/?playtest=scribbits',
    '➜ Version: v0.0.1.357',
  ].join('\r\n');
  assert.equal(parsePlaytestVersion(output), '0.0.1.357');
});

test('hosted runtime proof must match the uploaded playtest version', () => {
  const output =
    'remote {"appVersion":"0.0.1.357","event":"scribbits.app_setup.ready"}';
  assert.equal(outputIncludesRuntimeReady(output, '0.0.1.357'), true);
  assert.equal(outputIncludesRuntimeReady(output, '0.0.1.356'), false);
});

test('installation verification requires the exact app and playtest version', () => {
  const output = [
    'Devvit Admin Helper App (v0.0.6)',
    'scribbits (v0.0.1.357)',
  ].join('\n');
  assert.equal(
    installationIncludesVersion(output, 'scribbits', '0.0.1.357'),
    true
  );
  assert.equal(
    installationIncludesVersion(output, 'scribbits', '0.0.1.356'),
    false
  );
});
