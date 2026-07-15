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

const humanDoodleStrokes = [
  {
    color: '#5a3da8',
    size: 30,
    points: [
      { x: 225, y: 205 },
      { x: 247, y: 142 },
      { x: 278, y: 202 },
    ],
  },
  {
    color: '#5a3da8',
    size: 30,
    points: [
      { x: 310, y: 198 },
      { x: 350, y: 154 },
      { x: 360, y: 218 },
    ],
  },
  { color: '#4ea5d8', size: 66, points: [{ x: 225, y: 220 }, { x: 344, y: 215 }] },
  { color: '#4ea5d8', size: 72, points: [{ x: 205, y: 255 }, { x: 370, y: 250 }] },
  { color: '#4ea5d8', size: 78, points: [{ x: 210, y: 292 }, { x: 366, y: 287 }] },
  { color: '#4ea5d8', size: 70, points: [{ x: 225, y: 328 }, { x: 345, y: 324 }] },
  {
    color: '#211a17',
    size: 15,
    points: [
      { x: 221, y: 204 },
      { x: 248, y: 145 },
      { x: 279, y: 201 },
      { x: 311, y: 196 },
      { x: 350, y: 155 },
      { x: 361, y: 218 },
      { x: 379, y: 240 },
      { x: 383, y: 278 },
      { x: 374, y: 318 },
      { x: 349, y: 348 },
      { x: 315, y: 363 },
      { x: 276, y: 361 },
      { x: 239, y: 349 },
      { x: 214, y: 321 },
      { x: 202, y: 286 },
      { x: 205, y: 250 },
      { x: 215, y: 220 },
      { x: 221, y: 204 },
    ],
  },
  { color: '#211a17', size: 14, points: [{ x: 200, y: 260 }, { x: 155, y: 245 }, { x: 136, y: 272 }] },
  { color: '#211a17', size: 14, points: [{ x: 375, y: 257 }, { x: 425, y: 229 }, { x: 447, y: 250 }] },
  { color: '#211a17', size: 15, points: [{ x: 250, y: 350 }, { x: 237, y: 402 }, { x: 212, y: 410 }] },
  { color: '#211a17', size: 15, points: [{ x: 326, y: 348 }, { x: 345, y: 399 }, { x: 370, y: 402 }] },
  { color: '#f7eedc', size: 39, points: [{ x: 264, y: 240 }, { x: 266, y: 241 }] },
  { color: '#f7eedc', size: 34, points: [{ x: 326, y: 231 }, { x: 328, y: 232 }] },
  {
    color: '#211a17',
    size: 12,
    points: [{ x: 269, y: 244 }, { x: 271, y: 245 }],
  },
  { color: '#211a17', size: 11, points: [{ x: 320, y: 234 }, { x: 322, y: 235 }] },
  {
    color: '#211a17',
    size: 10,
    points: [
      { x: 270, y: 284 },
      { x: 288, y: 299 },
      { x: 312, y: 293 },
      { x: 327, y: 279 },
    ],
  },
  { color: '#ff745d', size: 20, points: [{ x: 235, y: 283 }, { x: 237, y: 284 }] },
  { color: '#ff745d', size: 18, points: [{ x: 354, y: 277 }, { x: 356, y: 278 }] },
  { color: '#5a3da8', size: 11, points: [{ x: 268, y: 324 }, { x: 284, y: 332 }, { x: 300, y: 323 }] },
];

try {
  if (shouldCapture('draw-paper-spark')) await captureClip({
    name: 'draw-paper-spark',
    url: '/game.html?debug&returning&untimed-draw',
    holdMilliseconds: 1_400,
    action: async (page) => {
      await page.waitForFunction(() => Boolean(window.scribbitsDrawAutomation));
      for (const stroke of humanDoodleStrokes) {
        await page.evaluate((nextStroke) => {
          window.scribbitsDrawAutomation.draw([nextStroke]);
        }, stroke);
        await page.waitForTimeout(230);
      }
    },
  });

  if (shouldCapture('home-paper-spark')) await captureClip({
    name: 'home-paper-spark',
    url: '/game.html?debug&returning',
    holdMilliseconds: 5_200,
    action: async (page) => {
      const choice = page.getByRole('button', { name: /^Choose Echo Mark/i });
      if (await choice.count()) {
        await choice.evaluate((button) => button.click());
        await page.waitForTimeout(1_400);
      }
    },
  });

  if (shouldCapture('battle-paper-spark')) await captureClip({
    name: 'battle-paper-spark',
    url: '/game.html?debug&returning&ceremony',
    holdMilliseconds: 12_000,
    action: async (page) => {
      const result = await page.evaluate(() =>
        window.debugSpar('nib_halo', 'storm', 2)
      );
      if (!result.startsWith('spar power=')) {
        throw new Error(`Could not start trailer battle: ${result}`);
      }
      await page.waitForFunction(
        () => window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'Replay'),
        null,
        { timeout: 8_000 }
      );
      await page.waitForTimeout(700);
      await page.evaluate(() => window.debugTap(360, 1_140));
      await page.waitForTimeout(260);
      await page.evaluate(() => window.debugTap(360, 1_140));
    },
  });

  if (shouldCapture('shop-reward')) await captureClip({
    name: 'shop-reward',
    url: '/game.html?debug&returning&shop',
    holdMilliseconds: 6_000,
    action: async (page) => {
      const openButton = page.getByRole('button', {
        name: /Take 1 Mystery Gear capsule for 7 Ink/i,
      });
      await openButton.waitFor({ state: 'visible', timeout: 8_000 });
      await page.waitForTimeout(1_000);
      await openButton.evaluate((button) => button.click());
    },
  });

  if (shouldCapture('gallery-roster')) await captureClip({
    name: 'gallery-roster',
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
