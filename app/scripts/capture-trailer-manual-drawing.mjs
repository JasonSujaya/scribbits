import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const gameplayDirectory = path.join(repoRoot, 'artifacts/trailer/gameplay');
const rawDirectory = path.join(gameplayDirectory, 'raw');
const baseUrl = process.env.SCRIBBITS_TRAILER_URL ?? 'http://127.0.0.1:8902';
const playwrightModulePath =
  process.env.PLAYWRIGHT_MODULE_PATH ??
  '/Users/jasons/Github/Components/ImageForce/frontend/node_modules/playwright/index.mjs';

if (!process.stdin.isTTY) {
  throw new Error('Manual trailer capture must be run from an interactive terminal.');
}

const { chromium } = await import(pathToFileURL(playwrightModulePath).href);
const terminal = createInterface({ input: process.stdin, output: process.stdout });

await mkdir(rawDirectory, { recursive: true });

const runFfmpeg = (arguments_) =>
  new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', arguments_, { stdio: 'inherit' });
    process.once('error', reject);
    process.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

const transcodeSegment = async ({ inputPath, outputPath, startSeconds, durationSeconds }) => {
  await runFfmpeg([
    '-y',
    '-loglevel',
    'error',
    '-ss',
    startSeconds.toFixed(3),
    '-i',
    inputPath,
    '-t',
    durationSeconds.toFixed(3),
    '-vf',
    'scale=720:1280:flags=lanczos,format=yuv420p',
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-an',
    outputPath,
  ]);
};

let browser;
let context;

try {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawDirectory,
      size: { width: 720, height: 1280 },
    },
  });

  const recordingStartedAt = Date.now();
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto(`${baseUrl}/game.html?debug&returning&untimed-draw`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('canvas');
  await page.waitForFunction(() =>
    window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'Draw')
  );
  await page.bringToFront();

  console.log('\nDraw the trailer Scribbit in the browser window.');
  console.log('Press Enter here immediately after your final stroke.');
  await terminal.question('');
  const drawEndSeconds = (Date.now() - recordingStartedAt) / 1_000;

  console.log('Now finish the in-game flow: tap Next, name it, and save it.');
  console.log('Capture will stop automatically after the new Scribbit reaches Home.');
  await page.waitForFunction(
    () => window.game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'ScribbitHome'),
    null,
    { timeout: 10 * 60 * 1_000 }
  );
  const homeStartSeconds = (Date.now() - recordingStartedAt) / 1_000;
  await page.waitForTimeout(4_500);

  const runtimeErrors = await page
    .locator('#game-container canvas')
    .getAttribute('data-runtime-errors');
  if (runtimeErrors !== '0' || browserErrors.length > 0) {
    throw new Error(
      `Manual capture reported runtime errors: ${runtimeErrors}; ${browserErrors.join('; ')}`
    );
  }

  const video = page.video();
  await page.close();
  const rawPath = path.join(rawDirectory, 'manual-scribbit-session.webm');
  const temporaryVideoPath = await video.path();
  await video.saveAs(rawPath);
  if (path.resolve(temporaryVideoPath) !== path.resolve(rawPath)) {
    await rm(temporaryVideoPath, { force: true });
  }

  await transcodeSegment({
    inputPath: rawPath,
    outputPath: path.join(gameplayDirectory, 'draw-manual.mp4'),
    startSeconds: Math.max(0, drawEndSeconds - 5),
    durationSeconds: Math.min(5, drawEndSeconds),
  });
  await transcodeSegment({
    inputPath: rawPath,
    outputPath: path.join(gameplayDirectory, 'home-manual.mp4'),
    startSeconds: homeStartSeconds + 0.35,
    durationSeconds: 4,
  });

  console.log(`\nSaved manual trailer clips in ${gameplayDirectory}`);
} finally {
  terminal.close();
  await context?.close();
  await browser?.close();
}
