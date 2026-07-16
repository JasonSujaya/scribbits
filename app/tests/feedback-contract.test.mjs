import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const [
  appMenu,
  popup,
  clientApi,
  publicApi,
  adminRoute,
  adminPage,
  server,
  menu,
  locale,
  configSource,
  home,
  mock,
] = await Promise.all([
  readSource('src/client/lib/appmenu.ts'),
  readSource('src/client/lib/feedbackpopup.ts'),
  readSource('src/client/lib/api.ts'),
  readSource('src/server/routes/api.ts'),
  readSource('src/server/routes/feedbackAdmin.ts'),
  readSource('src/server/admin/feedbackPage.ts'),
  readSource('src/server/index.ts'),
  readSource('src/server/routes/menu.ts'),
  readSource('src/client/locales/en.ts'),
  readSource('devvit.json'),
  readSource('src/client/scenes/ScribbitHome.ts'),
  readSource('scripts/dev-mock.mjs'),
]);
const config = JSON.parse(configSource);

test('player feedback lives in Settings without changing the gameplay dock', () => {
  assert.match(appMenu, /openFeedbackPopup/);
  assert.match(appMenu, /translate\('appMenu\.feedback'\)/);
  assert.match(locale, /'appMenu\.feedback': 'SEND A NOTE'/);
  assert.match(popup, /document\.createElement\('textarea'\)/);
  assert.match(
    popup,
    /textarea\.maxLength = FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS/
  );
  assert.match(popup, /message = textarea\.value\.trim\(\)/);
  assert.match(popup, /submitFeedback\(\{/);
  assert.match(popup, /sourceScene: scene\.scene\.key/);
  assert.match(popup, /result\.data\.inkAwarded/);
  assert.match(popup, /myInk: result\.data\.ink/);
  assert.match(home, /private renderFeedbackButton\(\)/);
  assert.match(home, /'pencil',[\s\S]*?'FEEDBACK'/);
  assert.match(home, /FEEDBACK_FIRST_REWARD_INK/);
  assert.match(home, /this\.renderFeedbackButton\(\)/);
});

test('feedback submission is authenticated, bounded, and write-only publicly', () => {
  assert.match(clientApi, /'\/api\/feedback'/);
  assert.match(publicApi, /api\.post\('\/feedback'/);
  assert.doesNotMatch(publicApi, /api\.get\('\/feedback'/);
  assert.match(publicApi, /getCurrentRequestPlayer\(c\)/);
  assert.match(publicApi, /readBoundedJsonBody\(c, feedbackMaximumBodyBytes\)/);
  assert.match(publicApi, /parseSubmitFeedbackRequest/);
  assert.match(publicApi, /id: randomUUID\(\)/);
  assert.match(publicApi, /'\/feedback',\s*'\/delete-my-data'/s);
  assert.match(mock, /mockFeedbackRewardedPreviewModes/);
  assert.match(mock, /inkAwarded,[\s\S]*?ink: economy\.ink/);
});

test('feedback viewer is internal, allowlisted-admin-only, and XSS-safe', () => {
  assert.match(server, /internal\.route\('\/feedback', feedbackAdmin\)/);
  assert.match(adminRoute, /getAuthorizedSeasonAdmin\(\)/);
  assert.match(adminRoute, /text\('Not found\.', 404\)/);
  assert.equal(
    adminRoute.match(/const rejected = await requireFeedbackAdmin\(context\)/g)
      ?.length,
    4
  );
  assert.match(adminRoute, /limit: 50/);
  assert.match(adminPage, /feedback\.username/);
  assert.match(adminPage, /feedback\.message/);
  assert.match(adminPage, /\.textContent = feedback\.username/);
  assert.match(adminPage, /\.textContent = feedback\.message/);
  assert.doesNotMatch(
    adminPage,
    /innerHTML|insertAdjacentHTML|document\.write/
  );
  assert.equal(config.post.entrypoints.feedback, undefined);
});

test('authorized moderators have a discoverable admin menu action', () => {
  const menuItem = config.menu.items.find(
    ({ endpoint }) => endpoint === '/internal/menu/feedback-view'
  );
  assert.deepEqual(menuItem, {
    label: 'View player feedback',
    description: 'Open the private Scribbits player feedback inbox',
    location: 'subreddit',
    forUserType: 'moderator',
    endpoint: '/internal/menu/feedback-view',
  });
  assert.match(menu, /getAuthorizedSeasonAdmin\(\)/);
  assert.match(menu, /new URL\('\/internal\/feedback', c\.req\.url\)/);
});
