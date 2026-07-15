import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const outputDirectory = path.join(repoRoot, 'artifacts/trailer/gameplay/raw');
const baseUrl = process.env.SCRIBBITS_TRAILER_URL ?? 'http://127.0.0.1:8902';
const requestedClip = process.env.SCRIBBITS_TRAILER_CLIP ?? '';
const playwrightModulePath =
  process.env.PLAYWRIGHT_MODULE_PATH ??
  '/Users/jasons/Github/Components/ImageForce/frontend/node_modules/playwright/index.mjs';

const { chromium } = await import(pathToFileURL(playwrightModulePath).href);

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

const waitForGame = async (page) => {
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => window.game?.scene?.getScenes(true)?.length > 0);
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas?.dataset.runtimeErrors === '0';
  });
};

const captureClip = async ({ name, url, action, holdMilliseconds }) => {
  const context = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outputDirectory,
      size: { width: 720, height: 1280 },
    },
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    requestUrl.searchParams.set('returning', '1');
    await route.continue({ url: requestUrl.toString() });
  });
  await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
  await waitForGame(page);
  await page.waitForTimeout(900);
  await action?.(page);
  await page.waitForTimeout(holdMilliseconds);

  const runtimeErrors = await page
    .locator('#game-container canvas')
    .getAttribute('data-runtime-errors');
  if (runtimeErrors !== '0' || browserErrors.length > 0) {
    throw new Error(
      `${name} capture reported runtime errors: ${runtimeErrors}; ${browserErrors.join('; ')}`
    );
  }

  const video = page.video();
  await page.close();
  const outputPath = path.join(outputDirectory, `${name}.webm`);
  const temporaryVideoPath = await video.path();
  await video.saveAs(outputPath);
  if (path.resolve(temporaryVideoPath) !== path.resolve(outputPath)) {
    await rm(temporaryVideoPath, { force: true });
  }
  await context.close();
};

const shouldCapture = (name) => requestedClip === '' || requestedClip === name;


try {
  if (shouldCapture('battle-wobble-bean')) await captureClip({
    name: 'battle-wobble-bean',
    url: '/game.html?debug&returning',
    holdMilliseconds: 8_000,
    action: async (page) => {
      const pendingPowerChoice = page.locator('button[aria-label^="Choose "]').first();
      if (await pendingPowerChoice.count()) {
        await pendingPowerChoice.click();
        await page.waitForTimeout(700);
      }
      let result = 'no scribbit';
      for (let attempt = 0; attempt < 20 && result === 'no scribbit'; attempt += 1) {
        result = await page.evaluate(() => window.debugSpar());
        if (result === 'no scribbit') await page.waitForTimeout(300);
      }
      if (!result.startsWith('spar id=')) {
        throw new Error(`Could not start trailer battle: ${result}`);
      }
      await page.waitForFunction(
        () => window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'Replay'),
        null,
        { timeout: 15_000 }
      );
      await page.waitForTimeout(700);
      await page.mouse.click(360, 1_140);
      await page.waitForFunction(
        () => document.querySelector('#game-container canvas')?.dataset.replaySpeed === '2'
      );
      await page.mouse.click(360, 1_140);
      await page.waitForFunction(
        () => document.querySelector('#game-container canvas')?.dataset.replaySpeed === '4'
      );
    },
  });

  if (shouldCapture('gacha-reward')) await captureClip({
    name: 'gacha-reward',
    url: '/game.html?debug&returning&shop',
    holdMilliseconds: 6_000,
    action: async (page) => {
      const takeOne = page.getByRole('button', {
        name: /Take 1 Mystery Gear capsule for 7 Ink/i,
      });
      await takeOne.waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(700);
      await takeOne.evaluate((button) => button.click());
    },
  });

  if (shouldCapture('bag-items')) await captureClip({
    name: 'bag-items',
    url: '/game.html?debug&returning&collection&gearSection=weapon',
    holdMilliseconds: 2_200,
    action: async (page) => {
      const expandInventory = page.getByRole('button', {
        name: 'Expand WEAPON inventory',
        exact: true,
      });
      await expandInventory.waitFor({ state: 'visible', timeout: 10_000 });
      await expandInventory.evaluate((button) => button.click());
      await page.waitForTimeout(1_600);
      const drawKit = page.getByRole('button', { name: 'DRAW KIT', exact: true });
      await drawKit.evaluate((button) => button.click());
    },
  });

  if (shouldCapture('arena-tour')) await captureClip({
    name: 'arena-tour',
    url: '/game.html?debug&returning',
    holdMilliseconds: 4_000,
    action: async (page) => {
      await page.waitForFunction(
        () => window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'ScribbitHome'),
        null,
        { timeout: 10_000 }
      );
      await page.evaluate(() => window.debugScene('ArenaHome'));
      await page.waitForFunction(
        () => window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'ArenaHome')
      );
    },
  });

  if (shouldCapture('gallery-wobble-bean')) await captureClip({
    name: 'gallery-wobble-bean',
    url: '/game.html?debug&returning',
    holdMilliseconds: 4_400,
    action: async (page) => {
      await page.evaluate(() => window.debugScene('Gallery'));
      const growingTab = page.getByRole('tab', { name: /Growing Scribbits/i });
      await growingTab.waitFor({ state: 'visible', timeout: 8_000 });
      await page.waitForTimeout(1_600);
      const retiredTab = page.getByRole('tab', { name: /Retired Scribbits/i });
      await retiredTab.evaluate((tab) => tab.click());
      await page.waitForTimeout(1_200);
    },
  });
} finally {
  await browser.close();
}

console.log(`Captured Scribbits trailer gameplay in ${outputDirectory}`);
