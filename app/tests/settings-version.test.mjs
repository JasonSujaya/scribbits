import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), 'utf8');

const [
  appMenuSource,
  englishMessagesSource,
] = await Promise.all([
  readSource('../src/client/lib/appmenu.ts'),
  readSource('../src/client/locales/en.ts'),
]);

test('Settings shows the authoritative deployed app version', () => {
  assert.match(
    appMenuSource,
    /context as devvitContext.*from '@devvit\/web\/client'/
  );
  assert.match(
    appMenuSource,
    /devvitContext\?\.appVersion\?\.trim\(\) \|\| 'LOCAL'/
  );
  assert.match(
    appMenuSource,
    /translate\('appMenu\.version', \{ version: appVersion \}\)/
  );
  assert.match(
    englishMessagesSource,
    /'appMenu\.version': 'VERSION \{version\}'/
  );
});

test('Settings version is quiet metadata rather than another action', () => {
  assert.match(
    appMenuSource,
    /const versionLabel = label\([\s\S]{0,220}20,[\s\S]{0,40}UI\.inkSoft/
  );
  assert.match(
    appMenuSource,
    /translate\('appMenu\.modalDescription', \{ version: appVersion \}\)/
  );
  assert.doesNotMatch(
    appMenuSource,
    /modalOverlay\.add\([\s\S]{0,120}appMenu\.version/
  );
});
