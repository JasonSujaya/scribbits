import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
if (!appRoot) {
  throw new Error(
    'Run season admin tests through scripts/run-test-suites.mjs.'
  );
}

test('Devvit registers moderator menu, native form, secret allowlist, and upgrade bootstrap', async () => {
  const config = JSON.parse(
    await readFile(join(appRoot, 'devvit.json'), 'utf8')
  );
  const menuItem = config.menu.items.find(
    (item) => item.endpoint === '/internal/menu/seasons-manage'
  );
  assert.equal(menuItem.forUserType, 'moderator');
  assert.equal(config.forms.manageSeasons, '/internal/menu/seasons-submit');
  assert.deepEqual(config.settings.global.seasonAdminUserIds, {
    type: 'string',
    label: 'Season admin Reddit user IDs',
    helpText: 'Comma-separated Reddit account IDs using the t2_ prefix.',
    placeholder: 't2_abc,t2_def',
    isSecret: true,
    validationEndpoint: '/internal/menu/season-admin-user-ids-validate',
  });
  assert.equal(
    config.triggers.onAppUpgrade,
    '/internal/triggers/on-app-upgrade'
  );
});

test('Season form submission reauthorizes exact owner IDs and current moderators server-side', async () => {
  const authorizationSource = await readFile(
    join(appRoot, 'src/server/core/seasonAdminAuthorization.ts'),
    'utf8'
  );
  const routeSource = await readFile(
    join(appRoot, 'src/server/routes/seasonAdmin.ts'),
    'utf8'
  );

  assert.match(authorizationSource, /context\.userId/);
  assert.match(
    authorizationSource,
    /settings\.get<string>\('seasonAdminUserIds'\)/
  );
  assert.match(authorizationSource, /reddit\.getCurrentUser\(\)/);
  assert.match(authorizationSource, /reddit\s*\.getModerators\(/);
  assert.match(routeSource, /post\('\/seasons-manage', openSeasonManagement\)/);
  assert.match(routeSource, /post\('\/seasons-submit'/);
  assert.equal(
    routeSource.match(/await getAuthorizedSeasonAdmin\(\)/g)?.length,
    2,
    'both menu open and form submit must reauthorize'
  );
  assert.match(routeSource, /Admin reason/);
  assert.match(routeSource, /Confirm this administrative action/);
});
