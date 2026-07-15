import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const trailerDirectory = path.join(repoRoot, 'artifacts/trailer');
const assetDirectory = path.join(repoRoot, 'app/src/client/assets');
const gameplayDirectory = path.join(trailerDirectory, 'gameplay');
const outputPath = path.join(trailerDirectory, 'scribbits-trailer.imageforce.json');

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const fileExists = async (filePath) =>
  access(filePath).then(() => true).catch(() => false);

const dataUrl = async (filePath, mediaType) => {
  const contents = await readFile(filePath);
  return `data:${mediaType};base64,${contents.toString('base64')}`;
};

const imageAsset = async (id, name, relativePath, mediaType) => ({
  id,
  name,
  type: mediaType,
  dataUrl: await dataUrl(path.join(repoRoot, relativePath), mediaType),
});

const videoAsset = async (id, name) => ({
  id,
  name,
  type: 'video/mp4',
  dataUrl: await dataUrl(path.join(gameplayDirectory, `${name}.mp4`), 'video/mp4'),
});

const audioAsset = async (id, name, relativePath) => ({
  id,
  name,
  type: 'audio/mpeg',
  dataUrl: await dataUrl(path.join(repoRoot, relativePath), 'audio/mpeg'),
});

const baseElement = (id, type, options = {}) => ({
  id,
  type,
  name: options.name ?? id,
  x: options.x ?? 0,
  y: options.y ?? 0,
  width: options.width ?? WIDTH,
  height: options.height ?? HEIGHT,
  scale: options.scale ?? 1,
  rotation: options.rotation ?? 0,
  opacity: options.opacity ?? 1,
  startFrame: options.startFrame ?? 0,
  durationFrames: options.durationFrames ?? null,
  animationFrames: options.animationFrames ?? 18,
  animation: options.animation ?? 'none',
  keyframes: options.keyframes ?? [],
  hidden: false,
  locked: false,
});

const imageElement = (id, assetId, options = {}) => ({
  ...baseElement(id, 'image', options),
  assetId,
  alt: options.alt ?? id,
  renderMode: options.renderMode ?? 'component',
  fit: options.fit ?? 'contain',
  radius: options.radius ?? 0,
});

const videoElement = (id, assetId, options = {}) => ({
  ...baseElement(id, 'video', options),
  assetId,
  alt: options.alt ?? id,
  fit: options.fit ?? 'cover',
  radius: options.radius ?? 0,
  muted: true,
  playbackRate: options.playbackRate ?? 1,
});

const shapeElement = (id, options = {}) => ({
  ...baseElement(id, 'shape', options),
  shape: options.shape ?? 'squircle',
  radius: options.radius ?? 32,
  fill: options.fill ?? '#ff745d',
  fill2: options.fill2 ?? options.fill ?? '#ff745d',
  fillStyle: options.fillStyle ?? 'solid',
  stroke: options.stroke ?? '#211a17',
  strokeWidth: options.strokeWidth ?? 8,
  shadowColor: options.shadowColor ?? '#211a174d',
  shadowBlur: options.shadowBlur ?? 18,
  shadowOffsetX: options.shadowOffsetX ?? 0,
  shadowOffsetY: options.shadowOffsetY ?? 12,
});

const textElement = (id, text, options = {}) => ({
  ...baseElement(id, 'text', options),
  text,
  fontFamily: options.fontFamily ?? 'DynaPuff Trailer',
  fontSize: options.fontSize ?? 78,
  fontWeight: options.fontWeight ?? 700,
  lineHeight: options.lineHeight ?? 1.02,
  letterSpacing: options.letterSpacing ?? -1,
  baselineOffset: 0,
  color: options.color ?? '#211a17',
  align: options.align ?? 'center',
  textStrokeColor: options.textStrokeColor ?? '#00000000',
  textStrokeWidth: options.textStrokeWidth ?? 0,
});

const captionElements = (prefix, text, options = {}) => {
  const startFrame = options.startFrame ?? 0;
  const durationFrames = options.durationFrames ?? 72;
  const y = options.y ?? 110;
  return [
    shapeElement(`${prefix}-card`, {
      x: 70,
      y,
      width: 940,
      height: options.height ?? 150,
      rotation: options.rotation ?? -1.2,
      startFrame,
      durationFrames,
      animation: 'slam-left',
      animationFrames: 16,
      fill: options.fill ?? '#ff745d',
    }),
    textElement(`${prefix}-text`, text, {
      x: 90,
      y: y + 18,
      width: 900,
      height: (options.height ?? 150) - 24,
      fontSize: options.fontSize ?? 70,
      color: options.color ?? '#211a17',
      startFrame,
      durationFrames,
      animation: 'slam-left',
      animationFrames: 16,
    }),
  ];
};

const page = (id, name, duration, elements, transition = 'fade') => ({
  id,
  name,
  duration,
  background: '#f7eedc',
  transition,
  elements,
});

const hasManualDrawing = await fileExists(path.join(gameplayDirectory, 'draw-manual.mp4'));
const hasManualHome = await fileExists(path.join(gameplayDirectory, 'home-manual.mp4'));
const drawClipName = hasManualDrawing ? 'draw-manual' : 'draw-paper-spark';
const homeClipName = hasManualHome ? 'home-manual' : 'home-paper-spark';

const [
  splashBackground,
  logo,
  humanHero,
  drawVideo,
  homeVideo,
  battleVideo,
  galleryVideo,
  music,
  paperOpen,
  scratch,
  whistle,
  impactHeavy,
  impactBell,
  confirm,
] = await Promise.all([
  imageAsset('splash-background', 'Scribbits paper stage', 'app/src/client/assets/scribbits-splash-stage.webp', 'image/webp'),
  imageAsset('scribbits-logo', 'Scribbits logo', 'app/src/client/assets/scribbits-logo.png', 'image/png'),
  imageAsset('human-drawn-hero', 'Human-drawn Scribbit hero', 'artifacts/trailer/assets/human-drawn-hero.png', 'image/png'),
  videoAsset('gameplay-draw', drawClipName),
  videoAsset('gameplay-home', homeClipName),
  videoAsset('gameplay-battle', 'battle-paper-spark'),
  videoAsset('gameplay-gallery', 'gallery-roster'),
  audioAsset('music-battle', 'Scribbits Battle', 'app/src/client/assets/scribbits-battle.mp3'),
  audioAsset('sfx-paper-open', 'Paper Open', 'app/src/client/assets/sfx/paper-open.mp3'),
  audioAsset('sfx-scratch', 'Pencil Scratch', 'app/src/client/assets/sfx/ui-scratch.mp3'),
  audioAsset('sfx-whistle', 'Draw Whistle', 'app/src/client/assets/sfx/draw-start-whistle.mp3'),
  audioAsset('sfx-impact-heavy', 'Heavy Impact', 'app/src/client/assets/sfx/impact-heavy.mp3'),
  audioAsset('sfx-impact-bell', 'Impact Bell', 'app/src/client/assets/sfx/impact-bell.mp3'),
  audioAsset('sfx-confirm', 'Confirm', 'app/src/client/assets/sfx/ui-confirm-2.mp3'),
]);

const fontPath = path.join(
  repoRoot,
  'app/node_modules/@fontsource/dynapuff/files/dynapuff-latin-700-normal.woff2'
);

const project = {
  version: 2,
  kind: 'video',
  name: 'Scribbits Arena Trailer',
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  background: '#f7eedc',
  assets: {
    images: [splashBackground, logo, humanHero],
    videos: [drawVideo, homeVideo, battleVideo, galleryVideo],
    audio: [music, paperOpen, scratch, whistle, impactHeavy, impactBell, confirm],
    fonts: [
      {
        id: 'font-dynapuff-trailer',
        family: 'DynaPuff Trailer',
        name: 'DynaPuff Bold',
        weight: 700,
        style: 'normal',
        dataUrl: await dataUrl(fontPath, 'font/woff2'),
      },
    ],
  },
  audioTracks: [
    { id: 'music', assetId: 'music-battle', kind: 'music', name: 'Scribbits Battle', startFrame: 0, durationFrames: 900, trimBeforeFrames: 0, volume: 0.34, muted: false, loop: true, playbackRate: 1 },
    { id: 'paper-open', assetId: 'sfx-paper-open', kind: 'sfx', name: 'Paper Open', startFrame: 0, durationFrames: 36, trimBeforeFrames: 0, volume: 0.82, muted: false, loop: false, playbackRate: 1 },
    { id: 'scratch-one', assetId: 'sfx-scratch', kind: 'sfx', name: 'Pencil Scratch 1', startFrame: 68, durationFrames: 12, trimBeforeFrames: 0, volume: 0.9, muted: false, loop: false, playbackRate: 1 },
    { id: 'scratch-two', assetId: 'sfx-scratch', kind: 'sfx', name: 'Pencil Scratch 2', startFrame: 105, durationFrames: 12, trimBeforeFrames: 0, volume: 0.82, muted: false, loop: false, playbackRate: 0.9 },
    { id: 'whistle', assetId: 'sfx-whistle', kind: 'sfx', name: 'Draw Whistle', startFrame: 198, durationFrames: 48, trimBeforeFrames: 0, volume: 0.82, muted: false, loop: false, playbackRate: 1 },
    { id: 'impact-one', assetId: 'sfx-impact-heavy', kind: 'sfx', name: 'Heavy Impact 1', startFrame: 450, durationFrames: 30, trimBeforeFrames: 0, volume: 0.9, muted: false, loop: false, playbackRate: 1 },
    { id: 'impact-two', assetId: 'sfx-impact-heavy', kind: 'sfx', name: 'Heavy Impact 2', startFrame: 540, durationFrames: 30, trimBeforeFrames: 0, volume: 0.95, muted: false, loop: false, playbackRate: 0.92 },
    { id: 'battle-bell', assetId: 'sfx-impact-bell', kind: 'sfx', name: 'Battle Bell', startFrame: 585, durationFrames: 36, trimBeforeFrames: 0, volume: 0.8, muted: false, loop: false, playbackRate: 1 },
    { id: 'gallery-page', assetId: 'sfx-paper-open', kind: 'sfx', name: 'Gallery Page', startFrame: 690, durationFrames: 36, trimBeforeFrames: 0, volume: 0.75, muted: false, loop: false, playbackRate: 1 },
    { id: 'confirm', assetId: 'sfx-confirm', kind: 'sfx', name: 'Logo Confirm', startFrame: 780, durationFrames: 30, trimBeforeFrames: 0, volume: 0.9, muted: false, loop: false, playbackRate: 1 },
  ],
  pages: [
    page('hook', 'Hook', 2, [
      imageElement('hook-background', 'splash-background', { fit: 'cover' }),
      imageElement('hook-hero', 'human-drawn-hero', { x: 290, y: 1_195, width: 500, height: 500, rotation: -3, animation: 'orbit-in', animationFrames: 38 }),
      imageElement('hook-logo', 'scribbits-logo', { x: 105, y: 210, width: 870, height: 420, animation: 'pop', animationFrames: 24 }),
      textElement('hook-copy', 'YOUR DOODLE IS\nREADY TO FIGHT.', { x: 70, y: 760, width: 940, height: 300, fontSize: 91, lineHeight: 1.03, animation: 'slam-left', animationFrames: 18 }),
    ]),
    page('draw', 'Draw it', 5, [
      videoElement('draw-gameplay', 'gameplay-draw'),
      shapeElement('draw-hero-canvas', { x: 72, y: 215, width: 936, height: 895, radius: 20, fill: '#fbf4df', stroke: '#00000000', strokeWidth: 0, shadowColor: '#00000000', shadowBlur: 0, shadowOffsetY: 0, durationFrames: 150 }),
      imageElement('draw-hero', 'human-drawn-hero', { x: 250, y: 330, width: 580, height: 650, durationFrames: 150, animation: 'pop', animationFrames: 20 }),
      ...captionElements('draw-caption-one', 'DRAW IT.', { durationFrames: 72, y: 95 }),
      ...captionElements('draw-caption-two', 'COLOR PICKS THE ROLE.', { startFrame: 84, durationFrames: 66, y: 95, fontSize: 58, fill: '#ffd447' }),
    ], 'zoom'),
    page('home', 'Bring it home', 3, [
      videoElement('home-gameplay', 'gameplay-home'),
      ...captionElements('home-caption', 'BRING IT HOME.', { durationFrames: 66, y: 105, fill: '#ffd447' }),
    ], 'slide'),
    page('battle', 'Watch it fight', 10, [
      videoElement('battle-gameplay', 'gameplay-battle'),
      ...captionElements('battle-caption', 'WATCH IT FIGHT.', { durationFrames: 72, y: 1_470 }),
    ], 'zoom'),
    page('gallery', 'Every draw leaves a legacy', 5, [
      videoElement('gallery-gameplay', 'gameplay-gallery'),
      ...captionElements('gallery-caption', 'EVERY DRAW LEAVES A LEGACY.', { durationFrames: 92, y: 110, fontSize: 48, fill: '#ffd447' }),
    ], 'slide'),
    page('cta', 'Play on Reddit', 5, [
      imageElement('cta-background', 'splash-background', { fit: 'cover' }),
      imageElement('cta-hero', 'human-drawn-hero', { x: 325, y: 1_175, width: 430, height: 430, rotation: 3, animation: 'drift', animationFrames: 28 }),
      imageElement('cta-logo', 'scribbits-logo', { x: 90, y: 180, width: 900, height: 430, animation: 'pop', animationFrames: 26 }),
      textElement('cta-headline', 'DRAW YOUR CHAMPION.', { x: 60, y: 760, width: 960, height: 160, fontSize: 82, animation: 'slam-left', animationFrames: 18 }),
      shapeElement('cta-button', { x: 130, y: 1_005, width: 820, height: 190, fill: '#ff745d', radius: 42, animation: 'elastic', animationFrames: 32 }),
      textElement('cta-button-copy', 'PLAY ON REDDIT', { x: 150, y: 1_052, width: 780, height: 110, fontSize: 66, color: '#211a17', animation: 'elastic', animationFrames: 32 }),
      textElement('cta-tagline', 'DRAW • RAISE • BATTLE', { x: 150, y: 1_650, width: 780, height: 80, fontSize: 39, letterSpacing: 2, color: '#69442f', animation: 'fade-up', animationFrames: 24 }),
    ]),
  ],
  metadata: {
    generatedBy: 'ImageForce Remotion',
    source: 'Scribbits live local game capture',
    durationSeconds: 30,
    drawingCapture: hasManualDrawing ? 'manual' : 'automated fallback',
  },
};

await mkdir(trailerDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify(project), 'utf8');

console.log(`Built ImageForce trailer project: ${outputPath}`);
