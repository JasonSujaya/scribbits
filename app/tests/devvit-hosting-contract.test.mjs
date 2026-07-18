import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [
  configSource,
  splashSource,
  challengeHtml,
  challengeSource,
  communityHtml,
  communitySource,
  gameHtml,
  gameSource,
  drawSource,
  serverSource,
  mainPostSource,
  communityPostPublisherSource,
  communityFeedSource,
  preloaderSource,
  homeSource,
] = await Promise.all([
  readFile(new URL('../devvit.json', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/splash.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/challenge.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/challenge.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/community.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/community.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/game.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/game.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/scenes/Draw.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/server/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/server/core/post.ts', import.meta.url), 'utf8'),
  readFile(
    new URL('../src/server/core/communityPosts.ts', import.meta.url),
    'utf8'
  ),
  readFile(new URL('../src/shared/communityfeed.ts', import.meta.url), 'utf8'),
  readFile(
    new URL('../src/client/scenes/Preloader.ts', import.meta.url),
    'utf8'
  ),
  readFile(
    new URL('../src/client/scenes/ScribbitHome.ts', import.meta.url),
    'utf8'
  ),
]);

const config = JSON.parse(configSource);

test('Devvit maps inline, expanded, and server entrypoints to production files', () => {
  assert.deepEqual(config.post.entrypoints.default, {
    inline: true,
    entry: 'splash.html',
  });
  assert.deepEqual(config.post.entrypoints.challenge, {
    inline: true,
    entry: 'challenge.html',
  });
  assert.deepEqual(config.post.entrypoints.community, {
    inline: true,
    entry: 'community.html',
  });
  assert.deepEqual(config.post.entrypoints.game, { entry: 'game.html' });
  assert.equal(
    config.marketingAssets.icon,
    'src/client/assets/scribbits-app-icon.png'
  );
  assert.equal(config.server.entry, 'index.cjs');
  assert.equal(config.dev.subreddit, 'scribbits_dev');
});

test('community posts render visual fight and update cards with real actions', () => {
  assert.match(communityHtml, /FIGHT OF THE WEEK/);
  assert.match(communityHtml, /ARENA BULLETIN/);
  assert.match(communityHtml, /id="replay-button"/);
  assert.match(
    communitySource,
    /parseCommunityVisualPostData\(context\?\.postData\)/
  );
  assert.match(communitySource, /fight\.moments\.forEach/);
  assert.match(communitySource, /await requestExpandedMode\(event, 'game'\)/);
});

test('every Scribbits-authored Reddit post uses a visual custom surface', () => {
  assert.match(mainPostSource, /reddit\.submitCustomPost\(/);
  assert.match(communityPostPublisherSource, /reddit\.submitCustomPost\(/);
  assert.doesNotMatch(communityPostPublisherSource, /reddit\.submitPost\(/);
  assert.doesNotMatch(communityFeedSource, /kind: 'text'/);
});

test('challenge post renders five dares and opens the existing game', () => {
  assert.equal((challengeHtml.match(/class="dare-card"/g) ?? []).length, 5);
  assert.match(challengeHtml, /DRAW THEM ALL/);
  assert.match(
    challengeSource,
    /parseCommunityChallengePostData\(context\?\.postData\)/
  );
  assert.match(challengeSource, /await requestExpandedMode\(event, 'game'\)/);
});

test('the trusted Continue gesture awaits expanded mode and reports rejection', () => {
  assert.match(splashSource, /await requestExpandedMode\(event, 'game'\)/);
  assert.match(
    splashSource,
    /showToast\(translate\('splash\.error\.expand'\)\)/
  );
});

test('expanded boot remains visible through startup and can fall back to Canvas', () => {
  assert.match(gameHtml, /id="game-boot-status"/);
  assert.match(gameSource, /StartGame\('game-container', CANVAS\)/);
  assert.match(gameSource, /reportGameBootError/);
  assert.doesNotMatch(preloaderSource, /markGameBootPhase\('ready'\)/);
  assert.match(
    homeSource,
    /this\.build\(\);[\s\S]{0,220}Phaser\.Core\.Events\.POST_RENDER[\s\S]{0,140}markGameBootPhase\('ready'\)/
  );
});

test('hosted Draw inlines its analyzer worker and the server exposes health', () => {
  assert.match(drawSource, /analyzer\.worker\?worker&inline/);
  assert.match(serverSource, /app\.get\('\/api\/health'/);
});
