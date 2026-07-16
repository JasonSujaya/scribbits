// Display helpers for rendering a player's drawing (its imageUrl) as a Phaser
// texture, plus small formatters shared across scenes. The drawings ARE the art,
// so most scenes just need: "give me a sprite of this scribbit's drawing".

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element, Scribbit } from '../../shared/arena';
import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from '../../shared/arena';
import {
  generateBlankDrawingTexture,
  generateDoodleTexture,
} from './proceduraldoodleart';

// Rendering only needs identity + art. Keeping this narrower than Scribbit lets
// immutable LegacyCard DTOs reuse the drawing pipeline without making them
// structurally valid combatants.
type DrawingSource = Pick<Scribbit, 'id' | 'name' | 'element' | 'imageUrl'> &
  Partial<Pick<Scribbit, 'isFounding' | 'stats'>>;

type DrawingLoadOptions = Readonly<{
  waitForRemote?: boolean;
}>;

const CRITICAL_DRAWING_READY_WAIT_MILLISECONDS = 2_000;

// Several surfaces can request the same drawing during one render (for example,
// a battle list containing the same fighter more than once). Phaser's loader
// does not safely queue the same texture key multiple times, so share one
// request per scene/key until it settles.
type PendingDrawingLoad = {
  readiness: Promise<string>;
  settleForSceneRelease: () => void;
  claimForActiveBuild: () => void;
  releaseFromActiveBuild: () => void;
};

type DrawingLoadFailureReason =
  | 'invalid-image'
  | 'load-error'
  | 'upgrade-failed';

export const DRAWING_LOAD_FAILURE_EVENT = 'scribbits-drawing-load-failed';

const pendingDrawingLoads = new WeakMap<
  Scene,
  Map<string, PendingDrawingLoad>
>();

// Display never needs the server's full 512px source. A 256px edge keeps the
// 280-design-pixel battle art crisp at mobile scale while cutting decoded
// CPU/GPU texture memory by roughly 75%.
const MAX_DRAWING_TEXTURE_EDGE = 256;
const MAX_CACHED_DRAWING_TEXTURES = 12;
const drawingTextureLastUse = new Map<string, number>();
const drawingTextureActiveScenes = new Map<string, number>();
const sceneDrawingTextures = new WeakMap<
  Scene,
  { keys: Set<string>; release: () => void }
>();
let drawingTextureUseSequence = 0;
let drawingSourceLoadSequence = 0;
const loadedRemoteDrawingTextures = new WeakMap<
  Phaser.Textures.TextureManager,
  Map<string, string>
>();

// Texture key for a scribbit's drawing. Stable per id so we load each once.
function drawingKey(scribbit: Pick<DrawingSource, 'id'>): string {
  return `drawing-${scribbit.id}`;
}

// A stable sprite key for authored founders: the scribbit's id (or name when id
// is missing) selects its canvas character.
function spriteKeyFor(scribbit: Pick<DrawingSource, 'id' | 'name'>): string {
  return scribbit.id || scribbit.name || 'scribbit';
}

function elementOf(scribbit: Partial<Pick<DrawingSource, 'element'>>): Element {
  return scribbit.element ?? 'ember';
}

// THE single art resolver. Every surface (roster, entrants, champion poster,
// modal, replay, legends, Gallery) calls this. It creates a stable canvas
// texture containing a generic unavailable-art mark before requesting remote
// imageUrl (Reddit-hosted in production; /api/drawing/{id} only in the local mock)
// loads behind that canvas and upgrades it in place when ready. Ordinary callers
// receive the fallback immediately. Critical callers can wait for the bounded
// remote attempt so they never mistake a queued request for ready art. Existing
// Images, meshes, and sliced LiveSprites keep one stable key.
// Callers then render the key with fitDrawing() (aspect-preserving contain) so
// non-square art is centered in its frame and never cropped or stretched.
export function loadDrawing(
  scene: Scene,
  scribbit: DrawingSource,
  options: DrawingLoadOptions = {}
): Promise<string> {
  const key = drawingKey(scribbit);

  // Founding /creatures routes resolve to authored canvas characters. Skip a
  // doomed network round-trip entirely.
  if (isKnownMissingArt(scribbit.imageUrl)) {
    const fallbackKey = fallbackDoodle(scene, scribbit);
    markDrawingTextureUsed(scene, fallbackKey);
    return Promise.resolve(fallbackKey);
  }

  if (!scene.textures.exists(key)) {
    createFallbackDrawingTexture(scene, key);
  }
  markDrawingTextureUsed(scene, key);

  if (remoteDrawingTextureIsCurrent(scene, key, scribbit.imageUrl)) {
    return Promise.resolve(key);
  }

  let sceneLoads = pendingDrawingLoads.get(scene);
  if (!sceneLoads) {
    sceneLoads = new Map<string, PendingDrawingLoad>();
    pendingDrawingLoads.set(scene, sceneLoads);
  }

  const pendingLoad = sceneLoads.get(key);
  if (pendingLoad) {
    pendingLoad.claimForActiveBuild();
    return options.waitForRemote
      ? waitForBoundedDrawingReadiness(pendingLoad.readiness, key)
      : Promise.resolve(key);
  }

  ensureSceneDrawingTextureLifecycle(scene);

  let settleForSceneRelease: () => void;
  let claimedByActiveBuild = true;
  let resolveDrawingLoad = (_key: string): void => undefined;
  const drawingLoad = new Promise<string>((resolve) => {
    resolveDrawingLoad = resolve;
  });
  const sourceKey = `${key}-source-${++drawingSourceLoadSequence}`;

  {
    let settled = false;
    const onComplete = (): void => {
      let failureReason: DrawingLoadFailureReason | undefined;
      try {
        // A load can "succeed" with a degenerate 1x1 texture. Keep the fallback
        // visible and leave the key retryable when that happens.
        if (isDegenerateTexture(scene, sourceKey)) {
          failureReason = 'invalid-image';
        } else if (upgradeDrawingTexture(scene, key, sourceKey)) {
          markRemoteDrawingTextureCurrent(scene, key, scribbit.imageUrl);
        } else {
          failureReason = 'upgrade-failed';
        }
      } catch (error) {
        failureReason = 'upgrade-failed';
        console.warn('Scribbits could not prepare remote drawing art.', error);
      }
      finish(failureReason);
    };
    // loaderror fires for every failed file; only react to our own key.
    const onError = (file: { key?: string }): void => {
      if (file?.key !== sourceKey) return;
      finish('load-error');
    };
    const finish = (
      failureReason?: DrawingLoadFailureReason,
      trackTexture = true
    ): void => {
      if (settled) return;
      settled = true;
      scene.load.off(`filecomplete-image-${sourceKey}`, onComplete);
      scene.load.off('loaderror', onError);
      if (scene.textures.exists(sourceKey)) scene.textures.remove(sourceKey);
      if (trackTexture) {
        if (claimedByActiveBuild) markDrawingTextureUsed(scene, key);
        else markDrawingTextureInactive(scene, key);
      }
      if (failureReason && scene.scene.isActive()) {
        reportDrawingLoadFailure(scene, key, scribbit.imageUrl, failureReason);
      }
      resolveDrawingLoad(key);
    };

    // The caller already owns the stable fallback key. Scene release only needs
    // to stop this background upgrade and clean its temporary source texture.
    settleForSceneRelease = (): void => finish(undefined, false);

    scene.load.on(`filecomplete-image-${sourceKey}`, onComplete);
    scene.load.on('loaderror', onError);
    scene.load.image(sourceKey, scribbit.imageUrl);
    scene.load.start();
  }

  const loadRecord: PendingDrawingLoad = {
    readiness: drawingLoad,
    settleForSceneRelease,
    claimForActiveBuild: () => {
      claimedByActiveBuild = true;
    },
    releaseFromActiveBuild: () => {
      claimedByActiveBuild = false;
    },
  };
  sceneLoads.set(key, loadRecord);
  void drawingLoad.then(() => {
    if (sceneLoads?.get(key) === loadRecord) sceneLoads.delete(key);
  });

  return options.waitForRemote
    ? waitForBoundedDrawingReadiness(drawingLoad, key)
    : Promise.resolve(key);
}

function waitForBoundedDrawingReadiness(
  readiness: Promise<string>,
  fallbackKey: string
): Promise<string> {
  if (typeof window === 'undefined') return readiness;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (textureKey: string): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(textureKey);
    };
    const timeoutId = window.setTimeout(
      () => finish(fallbackKey),
      CRITICAL_DRAWING_READY_WAIT_MILLISECONDS
    );
    void readiness.then(finish);
  });
}

function reportDrawingLoadFailure(
  scene: Scene,
  textureKey: string,
  imageUrl: string,
  reason: DrawingLoadFailureReason
): void {
  const canvas = scene.game.canvas;
  const failureCount = Number(canvas.dataset.drawingLoadFailures ?? '0');
  canvas.dataset.drawingLoadFailures = String(
    Number.isFinite(failureCount) ? failureCount + 1 : 1
  );
  canvas.dataset.lastDrawingLoadFailure = reason;
  scene.events.emit(
    DRAWING_LOAD_FAILURE_EVENT,
    Object.freeze({ textureKey, imageUrl, reason })
  );
}

function createFallbackDrawingTexture(scene: Scene, key: string): void {
  const fallbackKey = generateBlankDrawingTexture(scene, 'shared');
  const fallbackSource = scene.textures
    .get(fallbackKey)
    .getSourceImage() as CanvasImageSource & {
    width?: number;
    height?: number;
  };
  const canvas = document.createElement('canvas');
  canvas.width = MAX_DRAWING_TEXTURE_EDGE;
  canvas.height = MAX_DRAWING_TEXTURE_EDGE;
  drawContainedSource(canvas, fallbackSource);
  scene.textures.addCanvas(key, canvas);
  if (
    (drawingTextureActiveScenes.get(fallbackKey) ?? 0) === 0 &&
    scene.textures.exists(fallbackKey)
  ) {
    scene.textures.remove(fallbackKey);
    drawingTextureLastUse.delete(fallbackKey);
  }
  clearRemoteDrawingTextureRecord(scene, key);
}

function remoteDrawingTextureIsCurrent(
  scene: Scene,
  key: string,
  imageUrl: string
): boolean {
  return loadedRemoteDrawingTextures.get(scene.textures)?.get(key) === imageUrl;
}

function markRemoteDrawingTextureCurrent(
  scene: Scene,
  key: string,
  imageUrl: string
): void {
  let textureUrls = loadedRemoteDrawingTextures.get(scene.textures);
  if (!textureUrls) {
    textureUrls = new Map<string, string>();
    loadedRemoteDrawingTextures.set(scene.textures, textureUrls);
  }
  textureUrls.set(key, imageUrl);
}

function clearRemoteDrawingTextureRecord(scene: Scene, key: string): void {
  const textureUrls = loadedRemoteDrawingTextures.get(scene.textures);
  textureUrls?.delete(key);
  if (textureUrls?.size === 0)
    loadedRemoteDrawingTextures.delete(scene.textures);
}

function upgradeDrawingTexture(
  scene: Scene,
  key: string,
  sourceKey: string
): boolean {
  if (!scene.textures.exists(key) || !scene.textures.exists(sourceKey)) {
    return false;
  }
  const texture = scene.textures.get(key);
  if (!(texture instanceof Phaser.Textures.CanvasTexture)) return false;
  const source = scene.textures
    .get(sourceKey)
    .getSourceImage() as CanvasImageSource & {
    width?: number;
    height?: number;
  };
  const canvas = texture.getSourceImage() as HTMLCanvasElement;
  if (!drawContainedSource(canvas, source)) return false;
  texture.refresh();
  return true;
}

function drawContainedSource(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource & { width?: number; height?: number }
): boolean {
  const sourceWidth = source?.width ?? 0;
  const sourceHeight = source?.height ?? 0;
  const context = canvas.getContext('2d');
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return false;

  const scale = Math.min(
    canvas.width / sourceWidth,
    canvas.height / sourceHeight
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    source,
    (canvas.width - width) / 2,
    (canvas.height - height) / 2,
    width,
    height
  );
  return true;
}

function ensureSceneDrawingTextureLifecycle(scene: Scene): {
  keys: Set<string>;
  release: () => void;
} {
  const existingLifecycle = sceneDrawingTextures.get(scene);
  if (existingLifecycle) return existingLifecycle;

  const lifecycle = {
    keys: new Set<string>(),
    release: (): void => releaseSceneDrawingTextures(scene),
  };
  sceneDrawingTextures.set(scene, lifecycle);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, lifecycle.release);
  scene.events.once(Phaser.Scenes.Events.DESTROY, lifecycle.release);
  return lifecycle;
}

const releaseTrackedDrawingTextures = (
  scene: Scene,
  lifecycle: { keys: Set<string> }
): void => {
  lifecycle.keys.forEach((textureKey) => {
    const nextCount = Math.max(
      0,
      (drawingTextureActiveScenes.get(textureKey) ?? 1) - 1
    );
    if (nextCount === 0) drawingTextureActiveScenes.delete(textureKey);
    else drawingTextureActiveScenes.set(textureKey, nextCount);
  });
  lifecycle.keys.clear();
  trimInactiveDrawingTextures(scene);
};

// In-place scene rebuilds remove their old Images but stay active. Release only
// completed texture leases here and preserve any in-flight request so the new
// build can reuse the same Promise. Full scene teardown uses the helper below.
export function releaseRenderedDrawingTextures(scene: Scene): void {
  pendingDrawingLoads.get(scene)?.forEach((pendingLoad) => {
    pendingLoad.releaseFromActiveBuild();
  });
  const lifecycle = sceneDrawingTextures.get(scene);
  if (!lifecycle) {
    trimInactiveDrawingTextures(scene);
    return;
  }
  releaseTrackedDrawingTextures(scene, lifecycle);
}

// Settle any in-flight drawing requests and release this scene's claims on
// cached textures. Exported for explicit lifecycle ownership, while the helper
// also registers itself automatically for Phaser shutdown/destroy events.
export function releaseSceneDrawingTextures(scene: Scene): void {
  const pendingLoads = pendingDrawingLoads.get(scene);
  pendingDrawingLoads.delete(scene);
  pendingLoads?.forEach((pendingLoad) => {
    pendingLoad.settleForSceneRelease();
  });
  pendingLoads?.clear();

  const lifecycle = sceneDrawingTextures.get(scene);
  if (!lifecycle) {
    trimInactiveDrawingTextures(scene);
    return;
  }

  releaseTrackedDrawingTextures(scene, lifecycle);
  scene.events.off(Phaser.Scenes.Events.SHUTDOWN, lifecycle.release);
  scene.events.off(Phaser.Scenes.Events.DESTROY, lifecycle.release);
  sceneDrawingTextures.delete(scene);
}

function markDrawingTextureUsed(scene: Scene, textureKey: string): void {
  touchDrawingTexture(textureKey);

  if (scene.scene.isActive()) {
    const lifecycle = ensureSceneDrawingTextureLifecycle(scene);

    if (!lifecycle.keys.has(textureKey)) {
      lifecycle.keys.add(textureKey);
      drawingTextureActiveScenes.set(
        textureKey,
        (drawingTextureActiveScenes.get(textureKey) ?? 0) + 1
      );
    }
  }

  trimInactiveDrawingTextures(scene);
}

function markDrawingTextureInactive(scene: Scene, textureKey: string): void {
  touchDrawingTexture(textureKey);
  trimInactiveDrawingTextures(scene);
}

function touchDrawingTexture(textureKey: string): void {
  drawingTextureUseSequence += 1;
  drawingTextureLastUse.delete(textureKey);
  drawingTextureLastUse.set(textureKey, drawingTextureUseSequence);
}

function trimInactiveDrawingTextures(scene: Scene): void {
  if (drawingTextureLastUse.size <= MAX_CACHED_DRAWING_TEXTURES) return;
  for (const textureKey of drawingTextureLastUse.keys()) {
    if (drawingTextureLastUse.size <= MAX_CACHED_DRAWING_TEXTURES) break;
    if ((drawingTextureActiveScenes.get(textureKey) ?? 0) > 0) continue;
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    clearRemoteDrawingTextureRecord(scene, textureKey);
    drawingTextureLastUse.delete(textureKey);
  }
}

// Founding image routes are semantic handles for the authored canvas cast.
// Cheap prefix check means they never make a pointless network request.
function isKnownMissingArt(imageUrl: string): boolean {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/creatures/');
}

// A texture is degenerate when its source is missing or effectively 1px — this
// is what a stubbed/transparent server response produces, and it must not be
// rendered as if it were real art.
function isDegenerateTexture(scene: Scene, key: string): boolean {
  const source = scene.textures.get(key).getSourceImage() as {
    width?: number;
    height?: number;
  };
  const width = source?.width ?? 0;
  const height = source?.height ?? 0;
  return width <= 2 || height <= 2;
}

// Bake (once) the authored founder or neutral deterministic fallback for this
// Scribbit. Player stats never shape missing community art.
function fallbackDoodle(scene: Scene, scribbit: DrawingSource): string {
  const founderStats =
    scribbit.isFounding || isKnownMissingArt(scribbit.imageUrl)
      ? scribbit.stats
      : undefined;
  return generateDoodleTexture(
    scene,
    spriteKeyFor(scribbit),
    elementOf(scribbit),
    founderStats
  );
}

// Fit a drawing image inside a square box of `boxSize`, aspect-preserving
// (CONTAIN): the longest edge fills the box and the shorter edge is centered,
// so a tall or wide drawing is scaled down uniformly and NEVER cropped or
// stretched out of shape. This is the fix for "art escaping its frame corner":
// the old code forced setDisplaySize(box, box), distorting non-square art.
// Returns the same image for chaining. Center the image on the frame center.
export function fitDrawing(
  image: Phaser.GameObjects.Image,
  boxSize: number
): Phaser.GameObjects.Image {
  const source = image.texture.getSourceImage() as {
    width?: number;
    height?: number;
  };
  const srcW = source?.width && source.width > 0 ? source.width : boxSize;
  const srcH = source?.height && source.height > 0 ? source.height : boxSize;
  const scale = boxSize / Math.max(srcW, srcH);
  image.setDisplaySize(srcW * scale, srcH * scale);
  return image;
}

// "2W · 1L" record chip text.
export function recordText(
  scribbit: Pick<Scribbit, 'wins' | 'losses'>
): string {
  return `${scribbit.wins}W · ${scribbit.losses}L`;
}

export function levelOf(scribbit: Partial<Pick<Scribbit, 'level'>>): number {
  return Math.max(1, scribbit.level ?? 1);
}

// XP progress toward the NEXT level as a 0..1 ratio, for the detail modal's
// level bar. At MAX_LEVEL the bar reads full. Defensive against missing xp.
export function xpProgress(
  scribbit: Partial<Pick<Scribbit, 'level' | 'xp'>>
): number {
  const level = levelOf(scribbit);
  if (level >= MAX_LEVEL) return 1;
  const xp = Math.max(0, scribbit.xp ?? 0);
  const floor = LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  const ceil = LEVEL_XP_THRESHOLDS[level] ?? floor + 1;
  const span = Math.max(1, ceil - floor);
  return Math.max(0, Math.min(1, (xp - floor) / span));
}
