import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const defaultImageForceDirectory = path.resolve(
  repositoryDirectory,
  '..',
  '..',
  'Components',
  'ImageForce'
);
const imageForceDirectory = path.resolve(
  process.env.IMAGEFORCE_ROOT || defaultImageForceDirectory
);
const imageForceFrontendDirectory = path.join(imageForceDirectory, 'frontend');
const imageForceRenderScript = path.join(
  imageForceFrontendDirectory,
  'scripts',
  'render-remotion-composition.mjs'
);
const imageForceCompositionEntry = path.join(
  imageForceFrontendDirectory,
  'scripts',
  'remotion-composition-entry.jsx'
);
const outputDirectory = path.join(repositoryDirectory, 'artifacts', 'trailer');
const proofFrameDirectory = path.join(outputDirectory, 'frames');
const projectPath = path.join(outputDirectory, 'scribbits-intro.project.json');
const soundtrackPath = path.join(outputDirectory, 'scribbits-intro-soundtrack.wav');
const videoPath = path.join(outputDirectory, 'scribbits-intro-vertical.mp4');
const renderResultPath = path.join(outputDirectory, 'scribbits-intro.render.json');
const contactSheetPath = path.join(outputDirectory, 'scribbits-intro-contact-sheet.png');
const proofManifestPath = path.join(outputDirectory, 'scribbits-intro-proof.json');

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_SECONDS = 18;
const TOTAL_FRAMES = FPS * DURATION_SECONDS;
const FONT_FAMILY = 'DynaPuff Trailer';
const INK = '#261f18';
const PAPER = '#fff7e8';
const RED = '#ef5b49';
const YELLOW = '#f6c646';
const TEAL = '#55c8c5';
const PURPLE = '#7156a5';

const sceneSpecs = [
  { id: 'scene-1', name: 'Every legend starts as a line', duration: 2.0 },
  { id: 'scene-2', name: 'Draw it', duration: 2.6 },
  { id: 'scene-3', name: 'It wakes up', duration: 2.8 },
  { id: 'scene-4', name: 'Watch it fight', duration: 4.0 },
  { id: 'scene-5', name: 'Gear up and grow', duration: 2.6 },
  { id: 'scene-6', name: 'Scribbits brand close', duration: 4.0 },
];

const sourceImages = [
  {
    id: 'paper-stage',
    name: 'Scribbits paper stage',
    relativePath: 'app/src/client/assets/scribbits-stage.png',
    role: 'background',
  },
  {
    id: 'scribbits-logo',
    name: 'Scribbits logo',
    relativePath: 'app/src/client/assets/scribbits-logo.png',
    role: 'component',
    renderMode: 'component',
    hasTransparency: true,
  },
  {
    id: 'mossmop',
    name: 'Mossmop',
    relativePath: 'app/src/client/assets/splash-doodle-mossmop.png',
    role: 'component',
    renderMode: 'component',
    hasTransparency: true,
  },
  {
    id: 'looplet',
    name: 'Looplet',
    relativePath: 'app/src/client/assets/splash-doodle-looplet.png',
    role: 'component',
    renderMode: 'component',
    hasTransparency: true,
  },
  {
    id: 'stormpuff',
    name: 'Stormpuff',
    relativePath: 'app/src/client/assets/splash-doodle-stormpuff.png',
    role: 'component',
    renderMode: 'component',
    hasTransparency: true,
  },
  {
    id: 'draw-challenge',
    name: 'Draw challenge',
    relativePath: 'artifacts/screenshots/draw-prestart-fullscreen-imagegen.png',
    role: 'gameplay',
  },
  {
    id: 'draw-result',
    name: 'Draw result',
    relativePath: 'artifacts/screenshots/scribbits-untimed-tool-stormpuff.jpg',
    role: 'gameplay',
  },
  {
    id: 'battle',
    name: 'Scribbits battle',
    relativePath: 'artifacts/screenshots/scribbits-clean-battle-header.png',
    role: 'gameplay',
  },
  {
    id: 'gear-battle',
    name: 'Gear battle effect',
    relativePath: 'artifacts/screenshots/gear-red-star-blade-volley-live.png',
    role: 'gameplay',
  },
  {
    id: 'chest-open',
    name: 'Mystery Ink Chest open',
    relativePath: 'artifacts/screenshots/scribbits-shop-generated-chest-open.png',
    role: 'gameplay',
  },
];

const fontPath = path.join(
  repositoryDirectory,
  'app',
  'node_modules',
  '@fontsource',
  'dynapuff',
  'files',
  'dynapuff-latin-700-normal.woff2'
);

const frameCountForSeconds = (seconds) => Math.round(seconds * FPS);

const timedElement = (sceneId, elementId, type, frameCount, options = {}) => {
  const startFrame = Math.max(0, Math.round(options.startFrame || 0));
  const durationFrames = Math.max(
    1,
    Math.min(
      frameCount - startFrame,
      Math.round(options.durationFrames || frameCount - startFrame)
    )
  );
  return {
    id: `${sceneId}-${elementId}`,
    type,
    x: 0,
    y: 0,
    width: 320,
    height: 160,
    opacity: 1,
    scale: 1,
    rotation: 0,
    startFrame,
    durationFrames,
    animation: 'none',
    animationFrames: 1,
    keyframes: [],
    ...options,
    startFrame,
    durationFrames,
  };
};

const imageElement = (sceneId, elementId, frameCount, assetId, options = {}) =>
  timedElement(sceneId, elementId, 'image', frameCount, {
    assetId,
    alt: elementId,
    fit: 'contain',
    renderMode: 'frame',
    radius: 0,
    strokeWidth: 0,
    ...options,
  });

const textElement = (sceneId, elementId, frameCount, text, options = {}) =>
  timedElement(sceneId, elementId, 'text', frameCount, {
    text,
    fontFamily: FONT_FAMILY,
    fontSize: 72,
    fontWeight: 700,
    lineHeight: 0.96,
    color: INK,
    align: 'center',
    textStrokeColor: '#00000000',
    textStrokeWidth: 0,
    ...options,
  });

const shapeElement = (sceneId, elementId, frameCount, options = {}) =>
  timedElement(sceneId, elementId, 'shape', frameCount, {
    shape: 'rect',
    fill: RED,
    fill2: RED,
    fillStyle: 'solid',
    radius: 0,
    stroke: '#00000000',
    strokeWidth: 0,
    ...options,
  });

const paperBackdrop = (sceneId, frameCount) =>
  imageElement(sceneId, 'paper-backdrop', frameCount, 'paper-stage', {
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    fit: 'cover',
  });

const framedScreenshot = (
  sceneId,
  elementId,
  frameCount,
  assetId,
  options = {}
) =>
  imageElement(sceneId, elementId, frameCount, assetId, {
    fit: 'cover',
    radius: 36,
    stroke: INK,
    strokeWidth: 8,
    shadowColor: '#3c281d55',
    shadowBlur: 34,
    shadowOffsetY: 22,
    ...options,
  });

const buildSceneOne = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  return {
    ...scene,
    transition: 'fade',
    background: PAPER,
    elements: [
      paperBackdrop(scene.id, frameCount),
      shapeElement(scene.id, 'black-pencil-line', frameCount, {
        shape: 'pill',
        x: 165,
        y: 510,
        width: 760,
        height: 22,
        fill: INK,
        rotation: -4,
        animation: 'wipe-right',
        animationFrames: 26,
        startFrame: 4,
        keyframes: [
          { frame: 4, width: 20, rotation: -4 },
          { frame: frameCount - 1, width: 760, rotation: 2 },
        ],
      }),
      shapeElement(scene.id, 'red-pencil-line', frameCount, {
        shape: 'pill',
        x: 235,
        y: 558,
        width: 620,
        height: 16,
        fill: RED,
        rotation: 3,
        animation: 'wipe-right',
        animationFrames: 22,
        startFrame: 10,
        keyframes: [
          { frame: 10, width: 12, rotation: 3 },
          { frame: frameCount - 1, width: 620, rotation: -1 },
        ],
      }),
      textElement(scene.id, 'hook-one', frameCount, 'EVERY LEGEND', {
        x: 90,
        y: 710,
        width: 900,
        height: 150,
        fontSize: 112,
        animation: 'slam-left',
        animationFrames: 16,
        startFrame: 8,
      }),
      textElement(scene.id, 'hook-two', frameCount, 'STARTS AS A LINE.', {
        x: 90,
        y: 858,
        width: 900,
        height: 120,
        fontSize: 76,
        color: RED,
        animation: 'fade-up',
        animationFrames: 18,
        startFrame: 18,
      }),
      shapeElement(scene.id, 'ink-dot-one', frameCount, {
        shape: 'ellipse',
        x: 180,
        y: 1100,
        width: 34,
        height: 34,
        fill: TEAL,
        animation: 'pop',
        animationFrames: 14,
        startFrame: 26,
      }),
      shapeElement(scene.id, 'ink-dot-two', frameCount, {
        shape: 'ellipse',
        x: 840,
        y: 1190,
        width: 48,
        height: 48,
        fill: YELLOW,
        animation: 'pop',
        animationFrames: 14,
        startFrame: 32,
      }),
    ],
  };
};

const buildSceneTwo = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  const switchFrame = 36;
  return {
    ...scene,
    transition: 'slide',
    background: PAPER,
    elements: [
      paperBackdrop(scene.id, frameCount),
      framedScreenshot(scene.id, 'draw-challenge', frameCount, 'draw-challenge', {
        x: 174,
        y: 110,
        width: 732,
        height: 1585,
        animation: 'zoom-through',
        animationFrames: 16,
        durationFrames: switchFrame,
        keyframes: [
          { frame: 0, scale: 0.94, rotation: -2 },
          { frame: switchFrame - 1, scale: 1.04, rotation: 1 },
        ],
      }),
      framedScreenshot(scene.id, 'draw-result', frameCount, 'draw-result', {
        x: 174,
        y: 110,
        width: 732,
        height: 1585,
        animation: 'pop',
        animationFrames: 12,
        startFrame: switchFrame,
        keyframes: [
          { frame: switchFrame, scale: 0.9, rotation: 2 },
          { frame: frameCount - 1, scale: 1.03, rotation: -1 },
        ],
      }),
      shapeElement(scene.id, 'caption-paper', frameCount, {
        shape: 'squircle',
        x: 210,
        y: 1540,
        width: 660,
        height: 180,
        radius: 34,
        fill: RED,
        stroke: INK,
        strokeWidth: 7,
        animation: 'pop',
        animationFrames: 14,
        startFrame: 8,
      }),
      textElement(scene.id, 'draw-it', frameCount, 'DRAW IT.', {
        x: 240,
        y: 1582,
        width: 600,
        height: 94,
        fontSize: 86,
        color: PAPER,
        animation: 'fade-in',
        animationFrames: 12,
        startFrame: 14,
      }),
    ],
  };
};

const buildSceneThree = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  const character = (assetId, x, y, rotation, startFrame) =>
    imageElement(scene.id, assetId, frameCount, assetId, {
      x,
      y,
      width: 440,
      height: 440,
      renderMode: 'component',
      fit: 'contain',
      animation: 'elastic',
      animationFrames: 28,
      startFrame,
      keyframes: [
        { frame: startFrame, y: y + 90, scale: 0.64, rotation: rotation - 8 },
        { frame: startFrame + 28, y: y - 16, scale: 1.05, rotation: rotation + 4 },
        { frame: frameCount - 1, y, scale: 1, rotation },
      ],
      shadowColor: '#3c281d55',
      shadowBlur: 24,
      shadowOffsetY: 18,
    });
  return {
    ...scene,
    transition: 'zoom',
    background: PAPER,
    elements: [
      paperBackdrop(scene.id, frameCount),
      textElement(scene.id, 'wake-up', frameCount, 'IT WAKES UP.', {
        x: 80,
        y: 180,
        width: 920,
        height: 150,
        fontSize: 112,
        color: INK,
        animation: 'wipe-right',
        animationFrames: 20,
        startFrame: 2,
      }),
      character('mossmop', 45, 580, -7, 8),
      character('looplet', 595, 580, 7, 18),
      character('stormpuff', 320, 1010, -2, 28),
      shapeElement(scene.id, 'teal-spark', frameCount, {
        shape: 'star',
        x: 126,
        y: 1180,
        width: 90,
        height: 90,
        fill: TEAL,
        animation: 'orbit-in',
        animationFrames: 24,
        startFrame: 36,
      }),
      shapeElement(scene.id, 'yellow-spark', frameCount, {
        shape: 'star',
        x: 840,
        y: 820,
        width: 74,
        height: 74,
        fill: YELLOW,
        animation: 'pop',
        animationFrames: 18,
        startFrame: 42,
      }),
    ],
  };
};

const buildSceneFour = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  return {
    ...scene,
    transition: 'slide',
    background: '#6e4930',
    elements: [
      framedScreenshot(scene.id, 'battle-screen', frameCount, 'battle', {
        x: 92,
        y: 12,
        width: 896,
        height: 1938,
        radius: 0,
        strokeWidth: 0,
        animation: 'zoom-through',
        animationFrames: 20,
        keyframes: [
          { frame: 0, scale: 1.08, y: -24 },
          { frame: 45, scale: 1, y: 12 },
          { frame: 70, scale: 1.035, y: -6 },
          { frame: frameCount - 1, scale: 1.01, y: 12 },
        ],
      }),
      shapeElement(scene.id, 'impact-flash', frameCount, {
        shape: 'star',
        x: 380,
        y: 700,
        width: 320,
        height: 320,
        fill: YELLOW,
        opacity: 0.92,
        rotation: -8,
        animation: 'elastic',
        animationFrames: 8,
        startFrame: 44,
        durationFrames: 13,
        keyframes: [
          { frame: 44, scale: 0.2, rotation: -18, opacity: 0.95 },
          { frame: 50, scale: 1.15, rotation: 8, opacity: 0.9 },
          { frame: 56, scale: 1.45, rotation: 18, opacity: 0 },
        ],
      }),
      shapeElement(scene.id, 'caption-paper', frameCount, {
        shape: 'squircle',
        x: 120,
        y: 1490,
        width: 840,
        height: 230,
        radius: 38,
        fill: PAPER,
        stroke: INK,
        strokeWidth: 8,
        rotation: -1,
        shadowColor: '#261f1870',
        shadowBlur: 30,
        shadowOffsetY: 18,
        animation: 'slam-left',
        animationFrames: 16,
        startFrame: 62,
      }),
      textElement(
        scene.id,
        'shape-power',
        frameCount,
        'EVERY SHAPE\nFIGHTS DIFFERENT.',
        {
          x: 155,
          y: 1530,
          width: 770,
          height: 150,
          fontSize: 66,
          lineHeight: 0.94,
          color: INK,
          animation: 'fade-up',
          animationFrames: 18,
          startFrame: 69,
        }
      ),
    ],
  };
};

const buildSceneFive = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  return {
    ...scene,
    transition: 'zoom',
    background: PAPER,
    elements: [
      paperBackdrop(scene.id, frameCount),
      textElement(scene.id, 'gear-up', frameCount, 'GEAR UP. GROW.', {
        x: 70,
        y: 110,
        width: 940,
        height: 130,
        fontSize: 96,
        color: PURPLE,
        animation: 'slam-left',
        animationFrames: 16,
        startFrame: 2,
      }),
      framedScreenshot(scene.id, 'gear-card', frameCount, 'gear-battle', {
        x: 30,
        y: 350,
        width: 510,
        height: 1105,
        radius: 34,
        rotation: -5,
        animation: 'swing-in',
        animationFrames: 24,
        startFrame: 8,
        keyframes: [
          { frame: 8, x: -70, rotation: -13, scale: 0.88 },
          { frame: frameCount - 1, x: 30, rotation: -5, scale: 1 },
        ],
      }),
      framedScreenshot(scene.id, 'chest-card', frameCount, 'chest-open', {
        x: 540,
        y: 350,
        width: 510,
        height: 1105,
        radius: 34,
        rotation: 5,
        animation: 'swing-in',
        animationFrames: 24,
        startFrame: 18,
        keyframes: [
          { frame: 18, x: 650, rotation: 14, scale: 0.88 },
          { frame: frameCount - 1, x: 540, rotation: 5, scale: 1 },
        ],
      }),
      shapeElement(scene.id, 'bottom-label', frameCount, {
        shape: 'pill',
        x: 168,
        y: 1580,
        width: 744,
        height: 120,
        radius: 999,
        fill: YELLOW,
        stroke: INK,
        strokeWidth: 7,
        animation: 'pop',
        animationFrames: 16,
        startFrame: 34,
      }),
      textElement(scene.id, 'leave-mark', frameCount, 'LEAVE A MARK.', {
        x: 190,
        y: 1610,
        width: 700,
        height: 70,
        fontSize: 58,
        color: INK,
        animation: 'fade-in',
        animationFrames: 12,
        startFrame: 40,
      }),
    ],
  };
};

const buildSceneSix = (scene) => {
  const frameCount = frameCountForSeconds(scene.duration);
  const closingCharacter = (assetId, x, y, rotation, startFrame) =>
    imageElement(scene.id, `closing-${assetId}`, frameCount, assetId, {
      x,
      y,
      width: 350,
      height: 350,
      renderMode: 'component',
      fit: 'contain',
      rotation,
      animation: 'pop',
      animationFrames: 22,
      startFrame,
      keyframes: [
        { frame: startFrame, y: y + 80, scale: 0.75, rotation: rotation - 8 },
        { frame: startFrame + 22, y: y - 10, scale: 1.04, rotation: rotation + 3 },
        { frame: frameCount - 1, y, scale: 1, rotation },
      ],
    });
  return {
    ...scene,
    transition: 'fade',
    background: PAPER,
    elements: [
      paperBackdrop(scene.id, frameCount),
      imageElement(scene.id, 'logo', frameCount, 'scribbits-logo', {
        x: 72,
        y: 360,
        width: 936,
        height: 445,
        renderMode: 'component',
        fit: 'contain',
        animation: 'elastic',
        animationFrames: 34,
        startFrame: 2,
        keyframes: [
          { frame: 2, scale: 0.7, rotation: -3 },
          { frame: 35, scale: 1.04, rotation: 1 },
          { frame: frameCount - 1, scale: 1, rotation: 0 },
        ],
      }),
      closingCharacter('mossmop', 24, 910, -8, 16),
      closingCharacter('stormpuff', 365, 980, 0, 24),
      closingCharacter('looplet', 706, 910, 8, 32),
      textElement(
        scene.id,
        'tagline',
        frameCount,
        'DRAW A SCRIBBIT.\nWATCH IT FIGHT.',
        {
          x: 90,
          y: 1325,
          width: 900,
          height: 190,
          fontSize: 72,
          lineHeight: 0.98,
          animation: 'wipe-right',
          animationFrames: 24,
          startFrame: 38,
        }
      ),
      shapeElement(scene.id, 'draw-today-button', frameCount, {
        shape: 'squircle',
        x: 180,
        y: 1600,
        width: 720,
        height: 150,
        radius: 34,
        fill: RED,
        stroke: INK,
        strokeWidth: 8,
        shadowColor: '#261f1855',
        shadowBlur: 22,
        shadowOffsetY: 14,
        animation: 'pop',
        animationFrames: 20,
        startFrame: 54,
      }),
      textElement(scene.id, 'draw-today', frameCount, 'DRAW TODAY', {
        x: 200,
        y: 1640,
        width: 680,
        height: 78,
        fontSize: 66,
        color: PAPER,
        animation: 'fade-in',
        animationFrames: 12,
        startFrame: 61,
      }),
    ],
  };
};

const sceneBuilders = [
  buildSceneOne,
  buildSceneTwo,
  buildSceneThree,
  buildSceneFour,
  buildSceneFive,
  buildSceneSix,
];

const mediaTypeForImage = (bytes) => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes.subarray(1, 4).toString('ascii') === 'PNG'
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 12 && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  throw new Error('Unsupported image bytes; expected PNG, JPEG, or WebP.');
};

const imageAssetFromSource = async (source) => {
  const absolutePath = path.join(repositoryDirectory, source.relativePath);
  const bytes = await readFile(absolutePath);
  const type = mediaTypeForImage(bytes);
  return {
    id: source.id,
    name: source.name,
    type,
    size: bytes.length,
    dataUrl: `data:${type};base64,${bytes.toString('base64')}`,
    role: source.role,
    renderMode: source.renderMode || 'frame',
    hasTransparency: Boolean(source.hasTransparency),
    sourcePath: source.relativePath,
  };
};

const seededRandom = (() => {
  let state = 0x5f3759df;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0xffffffff) * 2 - 1;
  };
})();

const createSoundtrackSamples = () => {
  const sampleRate = 48_000;
  const samples = new Float64Array(sampleRate * DURATION_SECONDS);
  const addSample = (index, value) => {
    if (index >= 0 && index < samples.length) samples[index] += value;
  };
  const addBell = (startSeconds, frequency, durationSeconds, volume = 0.18) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const sampleCount = Math.round(durationSeconds * sampleRate);
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      const envelope = Math.exp(-5.4 * time / durationSeconds);
      const shimmer =
        Math.sin(2 * Math.PI * frequency * time) +
        0.34 * Math.sin(2 * Math.PI * frequency * 2.01 * time) +
        0.16 * Math.sin(2 * Math.PI * frequency * 3.98 * time);
      addSample(startSample + offset, shimmer * envelope * volume);
    }
  };
  const addBass = (startSeconds, frequency, durationSeconds, volume = 0.12) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const sampleCount = Math.round(durationSeconds * sampleRate);
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      const attack = Math.min(1, time / 0.018);
      const envelope = attack * Math.exp(-3.4 * time / durationSeconds);
      const tone =
        Math.sin(2 * Math.PI * frequency * time) +
        0.18 * Math.sin(2 * Math.PI * frequency * 2 * time);
      addSample(startSample + offset, tone * envelope * volume);
    }
  };
  const addKick = (startSeconds, volume = 0.28) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const durationSeconds = 0.18;
    const sampleCount = Math.round(durationSeconds * sampleRate);
    let phase = 0;
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      const frequency = 120 * Math.exp(-13 * time) + 44;
      phase += (2 * Math.PI * frequency) / sampleRate;
      const envelope = Math.exp(-24 * time);
      addSample(startSample + offset, Math.sin(phase) * envelope * volume);
    }
  };
  const addPencilTap = (startSeconds, volume = 0.12) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const sampleCount = Math.round(0.055 * sampleRate);
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      const envelope = Math.exp(-70 * time);
      const tick =
        seededRandom() * 0.7 +
        Math.sin(2 * Math.PI * 1_850 * time) * 0.3;
      addSample(startSample + offset, tick * envelope * volume);
    }
  };
  const addClap = (startSeconds, volume = 0.11) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const sampleCount = Math.round(0.16 * sampleRate);
    let previousNoise = 0;
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      const burst =
        Math.exp(-38 * time) +
        (time > 0.028 ? Math.exp(-52 * (time - 0.028)) * 0.6 : 0);
      const noise = seededRandom();
      const brightNoise = noise - previousNoise * 0.72;
      previousNoise = noise;
      addSample(startSample + offset, brightNoise * burst * volume);
    }
  };
  const addPageSwish = (startSeconds, volume = 0.075) => {
    const startSample = Math.round(startSeconds * sampleRate);
    const sampleCount = Math.round(0.32 * sampleRate);
    let smoothNoise = 0;
    for (let offset = 0; offset < sampleCount; offset += 1) {
      const time = offset / sampleRate;
      smoothNoise = smoothNoise * 0.86 + seededRandom() * 0.14;
      const envelope = Math.sin(Math.PI * Math.min(1, time / 0.32));
      addSample(startSample + offset, smoothNoise * envelope * volume);
    }
  };

  const beatSeconds = 60 / 118;
  const bassNotes = [98, 130.81, 110, 146.83];
  for (let beat = 0; beat * beatSeconds < DURATION_SECONDS; beat += 1) {
    const time = beat * beatSeconds;
    addKick(time, beat % 4 === 0 ? 0.3 : 0.22);
    addPencilTap(time + beatSeconds / 2, beat % 2 === 0 ? 0.11 : 0.075);
    if (beat % 4 === 1 || beat % 4 === 3) addClap(time, 0.1);
    if (beat % 2 === 0) {
      addBass(time, bassNotes[Math.floor(beat / 4) % bassNotes.length], beatSeconds * 1.55);
    }
  }

  const motif = [392, 440, 493.88, 587.33];
  [0.15, 4.65, 7.55, 14.25].forEach((motifStart, motifIndex) => {
    motif.forEach((frequency, noteIndex) => {
      addBell(
        motifStart + noteIndex * (motifIndex === 2 ? 0.24 : 0.34),
        frequency * (motifIndex === 2 ? 1.08 : 1),
        motifIndex === 3 ? 0.95 : 0.72,
        motifIndex === 3 ? 0.2 : 0.15
      );
    });
  });
  [2.0, 4.6, 7.4, 11.4, 14.0].forEach((time) => addPageSwish(time));
  addBell(16.6, 783.99, 1.1, 0.16);
  addBell(17.05, 987.77, 0.9, 0.14);

  const fadeSamples = Math.round(sampleRate * 0.45);
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    if (index >= samples.length - fadeSamples) {
      samples[index] *= (samples.length - index) / fadeSamples;
    }
    samples[index] = Math.tanh(samples[index] * 1.25);
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  const gain = peak > 0 ? 0.9 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
  return { samples, sampleRate };
};

const encodeMonoWav = ({ samples, sampleRate }) => {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    wav.writeInt16LE(Math.round(clamped * 0x7fff), 44 + index * bytesPerSample);
  });
  return wav;
};

const buildTrailerProject = async () => {
  const images = await Promise.all(sourceImages.map(imageAssetFromSource));
  const fontBytes = await readFile(fontPath);
  const soundtrackBytes = encodeMonoWav(createSoundtrackSamples());
  const pages = sceneSpecs.map((scene, index) => sceneBuilders[index](scene));
  const totalSceneSeconds = pages.reduce((sum, page) => sum + page.duration, 0);
  if (Math.abs(totalSceneSeconds - DURATION_SECONDS) > 0.001) {
    throw new Error(`Scene duration is ${totalSceneSeconds}s, expected ${DURATION_SECONDS}s.`);
  }
  return {
    project: {
      version: 2,
      kind: 'video',
      name: 'Scribbits — From Line to Legend',
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      activePageId: pages[0].id,
      assets: {
        images,
        audio: [
          {
            id: 'scribbits-soundtrack',
            name: 'Scribbits handmade trailer motif',
            type: 'audio/wav',
            role: 'music',
            size: soundtrackBytes.length,
            dataUrl: `data:audio/wav;base64,${soundtrackBytes.toString('base64')}`,
          },
        ],
        fonts: [
          {
            id: 'dynapuff-trailer-font',
            name: 'DynaPuff Bold',
            family: FONT_FAMILY,
            type: 'font/woff2',
            weight: 700,
            style: 'normal',
            dataUrl: `data:font/woff2;base64,${fontBytes.toString('base64')}`,
          },
        ],
      },
      audioTracks: [
        {
          id: 'scribbits-soundtrack-track',
          assetId: 'scribbits-soundtrack',
          kind: 'music',
          name: 'Scribbits handmade trailer motif',
          startFrame: 0,
          durationFrames: TOTAL_FRAMES,
          trimBeforeFrames: 0,
          volume: 0.78,
          muted: false,
          loop: false,
          playbackRate: 1,
        },
      ],
      pages,
      metadata: {
        campaign: {
          platform: '9:16',
          objective: 'Explain the draw-to-life-to-battle hook in 18 seconds.',
          audioPolicy: 'soundtrack',
          typographyPairingId: 'scribbits-dynapuff',
          sourceOfTruth: 'Scribbits shipped assets and current gameplay proof',
        },
      },
    },
    soundtrackBytes,
  };
};

const loadRemotionModules = async () => {
  const requireFromImageForce = createRequire(
    path.join(imageForceFrontendDirectory, 'package.json')
  );
  const bundlerPath = requireFromImageForce.resolve('@remotion/bundler');
  const rendererPath = requireFromImageForce.resolve('@remotion/renderer');
  const bundlerModule = await import(pathToFileURL(bundlerPath).href);
  const rendererModule = await import(pathToFileURL(rendererPath).href);
  const bundle = bundlerModule.bundle || bundlerModule.default?.bundle;
  const selectComposition =
    rendererModule.selectComposition || rendererModule.default?.selectComposition;
  const renderStill = rendererModule.renderStill || rendererModule.default?.renderStill;
  if (!bundle || !selectComposition || !renderStill) {
    throw new Error('ImageForce Remotion modules did not expose the expected render APIs.');
  }
  return { bundle, selectComposition, renderStill };
};

const renderProof = async (project) => {
  await rm(proofFrameDirectory, { force: true, recursive: true });
  await mkdir(proofFrameDirectory, { recursive: true });
  const { bundle, selectComposition, renderStill } = await loadRemotionModules();
  const serveUrl = await bundle({
    entryPoint: imageForceCompositionEntry,
    ignoreRegisterRootWarning: true,
    onProgress: () => {},
  });
  const inputProps = { project };
  const composition = await selectComposition({
    serveUrl,
    id: 'ImageForceComposition',
    inputProps,
    logLevel: 'warn',
  });
  const proofFrames = [45, 120, 200, 315, 410, 520];
  const frameAssets = [];
  for (let index = 0; index < proofFrames.length; index += 1) {
    const frame = proofFrames[index];
    const framePath = path.join(
      proofFrameDirectory,
      `scene-${String(index + 1).padStart(2, '0')}-frame-${frame}.png`
    );
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      frame,
      output: framePath,
      imageFormat: 'png',
      logLevel: 'warn',
      overwrite: true,
    });
    const bytes = await readFile(framePath);
    frameAssets.push({
      id: `proof-scene-${index + 1}`,
      name: `Scene ${index + 1}`,
      type: 'image/png',
      dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
      frame,
      path: framePath,
    });
  }

  const contactElements = [];
  frameAssets.forEach((asset, index) => {
    const x = 50 + index * 313;
    contactElements.push({
      id: `contact-image-${index + 1}`,
      type: 'image',
      assetId: asset.id,
      x,
      y: 180,
      width: 280,
      height: 500,
      fit: 'contain',
      renderMode: 'frame',
      radius: 18,
      stroke: '#261f18',
      strokeWidth: 5,
      startFrame: 0,
      durationFrames: 30,
      animation: 'none',
      animationFrames: 1,
    });
    contactElements.push({
      id: `contact-label-${index + 1}`,
      type: 'text',
      text: `0${index + 1}`,
      x,
      y: 720,
      width: 280,
      height: 80,
      fontFamily: FONT_FAMILY,
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 1,
      color: index % 2 === 0 ? RED : PURPLE,
      align: 'center',
      startFrame: 0,
      durationFrames: 30,
      animation: 'none',
      animationFrames: 1,
    });
  });
  const contactProject = {
    kind: 'video',
    name: 'Scribbits trailer contact sheet',
    width: 1920,
    height: 1080,
    fps: FPS,
    assets: {
      images: frameAssets,
      fonts: project.assets.fonts,
    },
    audioTracks: [],
    pages: [
      {
        id: 'contact-sheet',
        name: 'Contact sheet',
        duration: 1,
        background: PAPER,
        transition: 'none',
        elements: [
          {
            id: 'contact-title',
            type: 'text',
            text: 'SCRIBBITS — FROM LINE TO LEGEND',
            x: 60,
            y: 45,
            width: 1800,
            height: 90,
            fontFamily: FONT_FAMILY,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
            color: INK,
            align: 'center',
            startFrame: 0,
            durationFrames: 30,
            animation: 'none',
            animationFrames: 1,
          },
          ...contactElements,
        ],
      },
    ],
  };
  const contactInputProps = { project: contactProject };
  const contactComposition = await selectComposition({
    serveUrl,
    id: 'ImageForceComposition',
    inputProps: contactInputProps,
    logLevel: 'warn',
  });
  await renderStill({
    serveUrl,
    composition: contactComposition,
    inputProps: contactInputProps,
    frame: 0,
    output: contactSheetPath,
    imageFormat: 'png',
    logLevel: 'warn',
    overwrite: true,
  });
  return frameAssets.map(({ frame, path: framePath }) => ({ frame, file: framePath }));
};

const sha256File = async (filePath) =>
  createHash('sha256').update(await readFile(filePath)).digest('hex');

const main = async () => {
  await access(imageForceRenderScript);
  await access(imageForceCompositionEntry);
  await access(fontPath);
  await mkdir(outputDirectory, { recursive: true });
  const { project, soundtrackBytes } = await buildTrailerProject();
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`);
  await writeFile(soundtrackPath, soundtrackBytes);
  process.stdout.write(`project ${projectPath}\n`);
  process.stdout.write(`soundtrack ${soundtrackPath}\n`);

  if (process.argv.includes('--project-only')) return;

  process.stdout.write('rendering Scribbits trailer with ImageForce Remotion...\n');
  await runFile(
    process.execPath,
    [imageForceRenderScript, projectPath, videoPath, renderResultPath],
    {
      cwd: imageForceFrontendDirectory,
      maxBuffer: 20 * 1024 * 1024,
    }
  );
  process.stdout.write(`video ${videoPath}\n`);
  const proofFrames = await renderProof(project);
  const renderMetadata = JSON.parse(await readFile(renderResultPath, 'utf8'));
  const manifest = {
    kind: 'scribbits-remotion-trailer-proof',
    generatedAt: new Date().toISOString(),
    sourceRepository: repositoryDirectory,
    imageForceRepository: imageForceDirectory,
    project: projectPath,
    video: videoPath,
    soundtrack: soundtrackPath,
    contactSheet: contactSheetPath,
    proofFrames,
    render: renderMetadata,
    checksums: {
      projectSha256: await sha256File(projectPath),
      videoSha256: await sha256File(videoPath),
      soundtrackSha256: await sha256File(soundtrackPath),
      contactSheetSha256: await sha256File(contactSheetPath),
    },
  };
  await writeFile(proofManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`contact sheet ${contactSheetPath}\n`);
  process.stdout.write(`proof ${proofManifestPath}\n`);
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
