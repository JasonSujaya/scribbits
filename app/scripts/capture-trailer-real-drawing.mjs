import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const gameplayDirectory = path.join(repoRoot, 'artifacts/trailer/gameplay');
const rawDirectory = path.join(gameplayDirectory, 'raw');
const baseUrl = process.env.SCRIBBITS_TRAILER_URL ?? 'http://127.0.0.1:8902';
const playwrightModulePath =
  process.env.PLAYWRIGHT_MODULE_PATH ??
  '/Users/jasons/Github/Components/ImageForce/frontend/node_modules/playwright/index.mjs';

const { chromium } = await import(pathToFileURL(playwrightModulePath).href);

await mkdir(rawDirectory, { recursive: true });

const runFfmpeg = (arguments_) =>
  new Promise((resolve, reject) => {
    const childProcess = spawn('ffmpeg', arguments_, { stdio: 'inherit' });
    childProcess.once('error', reject);
    childProcess.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

const transcodeSegment = async ({
  inputPath,
  outputPath,
  startSeconds,
  sourceDurationSeconds,
  outputDurationSeconds,
}) => {
  const speedFactor = outputDurationSeconds / sourceDurationSeconds;
  await runFfmpeg([
    '-y',
    '-loglevel',
    'error',
    '-ss',
    startSeconds.toFixed(3),
    '-i',
    inputPath,
    '-t',
    sourceDurationSeconds.toFixed(3),
    '-vf',
    `setpts=${speedFactor.toFixed(6)}*PTS,scale=720:1280:flags=lanczos,format=yuv420p`,
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

const isSceneActive = (sceneName) =>
  window.game?.scene
    ?.getScenes(true)
    ?.some((scene) => scene.scene.key === sceneName);

const clickRealControl = async (control) => {
  await control.waitFor({ state: 'visible' });
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error('Could not locate a real game control.');
  await control.page().mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
};

const drawStroke = async (page, canvasBounds, points, durationMilliseconds = 300) => {
  if (points.length < 2) throw new Error('A stroke needs at least two points.');
  const absolutePoints = points.map(([x, y]) => ({
    x: canvasBounds.x + x,
    y: canvasBounds.y + y,
  }));
  await page.mouse.move(absolutePoints[0].x, absolutePoints[0].y);
  await page.mouse.down();
  const segmentDuration = durationMilliseconds / (absolutePoints.length - 1);
  for (const point of absolutePoints.slice(1)) {
    const steps = Math.max(2, Math.round(segmentDuration / 15));
    await page.mouse.move(point.x, point.y, { steps });
  }
  await page.mouse.up();
  await page.waitForTimeout(75);
};

let browser;
let context;

try {
  browser = await chromium.launch({ headless: true });
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
  await page.waitForFunction(isSceneActive, 'Draw');

  const drawingCanvas = page.locator(
    'canvas[aria-label^="Untimed local asset drawing"]'
  );
  await drawingCanvas.waitFor({ state: 'visible' });
  const canvasBounds = await drawingCanvas.boundingBox();
  if (!canvasBounds) throw new Error('The Scribbits drawing canvas was not visible.');

  const control = (name) => page.getByRole('button', { name });
  const useBlack = control(/^Use black paint/i);
  const useWhite = control(/^Use white paint/i);
  const useAqua = control(/^Use aqua paint/i);
  const useCoral = control(/^Use coral paint/i);
  const pen = control(/^Draw with the selected pen and brush/i);
  const fill = control(/^Fill a line-bounded area/i);
  const increaseBrush = control(/^Increase brush size$/i);
  const decreaseBrush = control(/^Decrease brush size$/i);

  const drawStartSeconds = (Date.now() - recordingStartedAt) / 1_000;

  // Every mark below is made through the real Scribbits controls and canvas.
  // The slightly uneven outline is intentional: it should look hand-drawn.
  await clickRealControl(useBlack);
  await clickRealControl(pen);
  await clickRealControl(increaseBrush);
  await drawStroke(page, canvasBounds, [
    [220, 170], [194, 184], [172, 218], [164, 264], [170, 316],
    [186, 358], [218, 391], [266, 407], [318, 404], [365, 388],
    [397, 354], [413, 310], [416, 260], [408, 216], [386, 183],
    [351, 162], [309, 154], [267, 157], [220, 170],
  ], 1_350);

  await clickRealControl(useAqua);
  await clickRealControl(fill);
  await page.mouse.click(canvasBounds.x + 292, canvasBounds.y + 278);
  await page.waitForTimeout(350);

  await clickRealControl(useBlack);
  await clickRealControl(pen);
  await drawStroke(page, canvasBounds, [[172, 278], [139, 266], [115, 279], [94, 263]], 330);
  await drawStroke(page, canvasBounds, [[414, 278], [446, 263], [470, 280], [490, 258]], 330);
  await drawStroke(page, canvasBounds, [[232, 398], [224, 436], [204, 452]], 280);
  await drawStroke(page, canvasBounds, [[350, 397], [359, 435], [380, 449]], 280);

  await clickRealControl(useWhite);
  for (let index = 0; index < 4; index += 1) await clickRealControl(increaseBrush);
  await drawStroke(page, canvasBounds, [[248, 245], [250, 245]], 110);
  await drawStroke(page, canvasBounds, [[336, 239], [338, 240]], 110);

  await clickRealControl(useBlack);
  for (let index = 0; index < 4; index += 1) await clickRealControl(decreaseBrush);
  await drawStroke(page, canvasBounds, [[252, 246], [254, 249]], 100);
  await drawStroke(page, canvasBounds, [[340, 241], [342, 244]], 100);
  await drawStroke(page, canvasBounds, [[244, 314], [264, 330], [292, 335], [321, 327], [343, 309]], 420);

  await clickRealControl(useCoral);
  await clickRealControl(increaseBrush);
  await drawStroke(page, canvasBounds, [[214, 300], [216, 301]], 90);
  await drawStroke(page, canvasBounds, [[370, 296], [372, 297]], 90);

  const drawEndSeconds = (Date.now() - recordingStartedAt) / 1_000;
  const drawingPngDataUrl = await drawingCanvas.evaluate((canvas) =>
    canvas.toDataURL('image/png')
  );
  await writeFile(
    path.join(gameplayDirectory, 'wobble-bean.png'),
    Buffer.from(drawingPngDataUrl.split(',')[1], 'base64')
  );

  const nextButton = control(/^Next$/i);
  await nextButton.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.getAttribute('aria-label') === 'Next'
    );
    return button && !button.disabled;
  });
  await clickRealControl(nextButton);

  const nameInput = page.getByRole('textbox', { name: /Name your Scribbit/i });
  await nameInput.waitFor({ state: 'visible' });
  await nameInput.fill('Wobble Bean');
  await clickRealControl(control(/^Bring Scribbit to life$/i));

  await page.waitForFunction(
    () =>
      document.body.innerText.includes("IT'S ALIVE!") ||
      [...document.querySelectorAll('button')].some((button) =>
        /START FIRST FIGHT|CHOOSE FIRST POWER-UP/i.test(button.textContent ?? '')
      ),
    null,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(600);

  await page.goto(`${baseUrl}/game.html?debug&returning`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(isSceneActive, 'ScribbitHome');
  await page.waitForTimeout(1_000);
  const powerChoice = page.locator('button[aria-label^="Choose "]').first();
  if (await powerChoice.count()) {
    await powerChoice.waitFor({ state: 'visible', timeout: 5_000 });
    await clickRealControl(powerChoice);
    await page.waitForTimeout(1_000);
  }
  const homeStartSeconds = (Date.now() - recordingStartedAt) / 1_000;
  await page.waitForTimeout(4_500);

  const runtimeErrors = await page
    .locator('#game-container canvas')
    .getAttribute('data-runtime-errors');
  if (runtimeErrors !== '0' || browserErrors.length > 0) {
    throw new Error(
      `Real drawing capture reported runtime errors: ${runtimeErrors}; ${browserErrors.join('; ')}`
    );
  }

  const video = page.video();
  await page.close();
  const rawPath = path.join(rawDirectory, 'real-drawing-session.webm');
  const temporaryVideoPath = await video.path();
  await video.saveAs(rawPath);
  if (path.resolve(temporaryVideoPath) !== path.resolve(rawPath)) {
    await rm(temporaryVideoPath, { force: true });
  }

  await transcodeSegment({
    inputPath: rawPath,
    outputPath: path.join(gameplayDirectory, 'draw-manual.mp4'),
    startSeconds: Math.max(0, drawStartSeconds - 0.2),
    sourceDurationSeconds: drawEndSeconds - drawStartSeconds + 0.4,
    outputDurationSeconds: 5,
  });
  await transcodeSegment({
    inputPath: rawPath,
    outputPath: path.join(gameplayDirectory, 'home-manual.mp4'),
    startSeconds: homeStartSeconds,
    sourceDurationSeconds: 4,
    outputDurationSeconds: 4,
  });

  console.log(`Saved real mouse-drawn trailer clips in ${gameplayDirectory}`);
} finally {
  await context?.close();
  await browser?.close();
}
