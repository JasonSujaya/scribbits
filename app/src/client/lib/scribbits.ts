// Display helpers for rendering a player's drawing (its imageUrl) as a Phaser
// texture, plus small formatters shared across scenes. The drawings ARE the art,
// so most scenes just need: "give me a sprite of this scribbit's drawing".

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { CareAction, Element, Mood, Scribbit } from '../../shared/arena';
import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from '../../shared/arena';
import { MOOD_STYLES } from './theme';
import { generateDoodleTexture } from './art';

// Several surfaces can request the same drawing during one render (for example,
// a battle list containing the same fighter more than once). Phaser's loader
// does not safely queue the same texture key multiple times, so share one
// request per scene/key until it settles.
type PendingDrawingLoad = {
  promise: Promise<string>;
  settleForSceneRelease: () => void;
};

const pendingDrawingLoads = new WeakMap<
  Scene,
  Map<string, PendingDrawingLoad>
>();

// A 512x512 RGBA drawing is roughly 1 MiB before GPU overhead. Keep inactive
// drawings bounded, while never evicting a texture still displayed by an
// active scene. Large Arena/Gallery pages may temporarily exceed this ceiling;
// their released textures are trimmed as soon as the scene shuts down.
const MAX_CACHED_DRAWING_TEXTURES = 30;
const drawingTextureLastUse = new Map<string, number>();
const drawingTextureActiveScenes = new Map<string, number>();
const sceneDrawingTextures = new WeakMap<
  Scene,
  { keys: Set<string>; release: () => void }
>();
let drawingTextureUseSequence = 0;

// Texture key for a scribbit's drawing. Stable per id so we load each once.
export function drawingKey(scribbit: Pick<Scribbit, 'id'>): string {
  return `drawing-${scribbit.id}`;
}

// A stable sprite key for the procedural doodle fallback: the scribbit's id (or
// name when id is missing) drives the deterministic creature shape.
function spriteKeyFor(scribbit: Pick<Scribbit, 'id' | 'name'>): string {
  return scribbit.id || scribbit.name || 'scribbit';
}

function elementOf(scribbit: Partial<Pick<Scribbit, 'element'>>): Element {
  return scribbit.element ?? 'ember';
}

// THE single art resolver. Every surface (roster, entrants, champion poster,
// modal, replay, legends, sketchbook) calls this. It resolves to a texture key
// that ALWAYS exists and is never empty:
//   1. Try the scribbit's imageUrl (network PNG or /api/drawing/{id}).
//   2. On loaderror / timeout / a degenerate (empty) texture, fall back to a
//      deterministic procedural doodle baked from the spriteKey + element.
// Callers then render the key with fitDrawing() (aspect-preserving contain) so
// non-square art is centered in its frame and never cropped or stretched.
export function loadDrawing(scene: Scene, scribbit: Scribbit): Promise<string> {
  const key = drawingKey(scribbit);
  if (scene.textures.exists(key)) {
    markDrawingTextureUsed(scene, key);
    return Promise.resolve(key);
  }

  // Founding scribbits point at /creatures/*.png that never shipped. Skip the
  // doomed network round-trip and go straight to the doodle so their cards fill
  // instantly instead of flashing an empty frame for 9 seconds.
  if (isKnownMissingArt(scribbit.imageUrl)) {
    const fallbackKey = fallbackDoodle(scene, scribbit);
    markDrawingTextureUsed(scene, fallbackKey);
    return Promise.resolve(fallbackKey);
  }

  let sceneLoads = pendingDrawingLoads.get(scene);
  if (!sceneLoads) {
    sceneLoads = new Map<string, PendingDrawingLoad>();
    pendingDrawingLoads.set(scene, sceneLoads);
  }

  const pendingLoad = sceneLoads.get(key);
  if (pendingLoad) return pendingLoad.promise;

  ensureSceneDrawingTextureLifecycle(scene);

  let settleForSceneRelease = (): void => undefined;
  const drawingLoad = new Promise<string>((resolve) => {
    let settled = false;
    let timeout: Phaser.Time.TimerEvent | null = null;
    const onComplete = (): void => {
      // A load can "succeed" with a degenerate 1x1/transparent texture; if the
      // source is unusably small, treat it as a miss and use the doodle.
      if (isDegenerateTexture(scene, key)) {
        scene.textures.remove(key);
        finish(fallbackDoodle(scene, scribbit));
        return;
      }
      finish(key);
    };
    // loaderror fires for every failed file; only react to our own key.
    const onError = (file: { key?: string }): void => {
      if (file?.key !== key) return;
      finish(fallbackDoodle(scene, scribbit));
    };
    const finish = (resolvedKey: string, trackTexture = true): void => {
      if (settled) return;
      settled = true;
      scene.load.off(`filecomplete-image-${key}`, onComplete);
      scene.load.off('loaderror', onError);
      timeout?.remove(false);
      timeout = null;
      if (trackTexture) markDrawingTextureUsed(scene, resolvedKey);
      resolve(resolvedKey);
    };

    // A shutdown makes the result unusable to this scene, but callers such as
    // Promise.all still need a deterministic settlement. Do not manufacture a
    // fallback texture while Phaser is tearing the scene down.
    settleForSceneRelease = (): void => finish(key, false);

    scene.load.on(`filecomplete-image-${key}`, onComplete);
    scene.load.on('loaderror', onError);
    // Safety timeout so a stuck load never blocks a ceremony forever. Keep the
    // event handle so normal completion and scene release both remove it.
    timeout = scene.time.delayedCall(9000, () => {
      if (settled) return;
      finish(scene.textures.exists(key) ? key : fallbackDoodle(scene, scribbit));
    });
    scene.load.image(key, scribbit.imageUrl);
    scene.load.start();
  });

  const loadRecord: PendingDrawingLoad = {
    promise: drawingLoad,
    settleForSceneRelease,
  };
  sceneLoads.set(key, loadRecord);
  void drawingLoad.then(() => {
    if (sceneLoads?.get(key) === loadRecord) sceneLoads.delete(key);
  });

  return drawingLoad;
}

function ensureSceneDrawingTextureLifecycle(
  scene: Scene
): { keys: Set<string>; release: () => void } {
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
  drawingTextureUseSequence += 1;
  drawingTextureLastUse.delete(textureKey);
  drawingTextureLastUse.set(textureKey, drawingTextureUseSequence);

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

function trimInactiveDrawingTextures(scene: Scene): void {
  if (drawingTextureLastUse.size <= MAX_CACHED_DRAWING_TEXTURES) return;
  for (const textureKey of drawingTextureLastUse.keys()) {
    if (drawingTextureLastUse.size <= MAX_CACHED_DRAWING_TEXTURES) break;
    if ((drawingTextureActiveScenes.get(textureKey) ?? 0) > 0) continue;
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    drawingTextureLastUse.delete(textureKey);
  }
}

// URLs we know will 404 (founding art job was cancelled). Cheap prefix check so
// we never even attempt the request.
function isKnownMissingArt(imageUrl: string): boolean {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/creatures/');
}

// A texture is degenerate when its source is missing or effectively 1px — this
// is what a stubbed/transparent server response produces, and it must not be
// rendered as if it were real art.
function isDegenerateTexture(scene: Scene, key: string): boolean {
  const source = scene.textures.get(key).getSourceImage() as { width?: number; height?: number };
  const width = source?.width ?? 0;
  const height = source?.height ?? 0;
  return width <= 2 || height <= 2;
}

// Bake (once) the procedural doodle for this scribbit. Used as the fallback.
function fallbackDoodle(scene: Scene, scribbit: Scribbit): string {
  return generateDoodleTexture(scene, spriteKeyFor(scribbit), elementOf(scribbit));
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
  const source = image.texture.getSourceImage() as { width?: number; height?: number };
  const srcW = source?.width && source.width > 0 ? source.width : boxSize;
  const srcH = source?.height && source.height > 0 ? source.height : boxSize;
  const scale = boxSize / Math.max(srcW, srcH);
  image.setDisplaySize(srcW * scale, srcH * scale);
  return image;
}

// Convenience: load a scribbit's drawing and add it as an image fitted+centered
// inside a `boxSize` frame at (x, y). The one call every static surface uses so
// art is always resolved (never empty) AND always fitted (never cropped).
export function addFittedDrawing(
  scene: Scene,
  scribbit: Scribbit,
  x: number,
  y: number,
  boxSize: number
): Promise<Phaser.GameObjects.Image | null> {
  return loadDrawing(scene, scribbit).then((key) => {
    if (!scene.scene.isActive()) return null;
    const image = scene.add.image(x, y, key);
    return fitDrawing(image, boxSize);
  });
}

// Load several drawings in parallel; resolves when all have settled.
export function loadDrawings(
  scene: Scene,
  scribbits: Scribbit[]
): Promise<void> {
  return Promise.all(scribbits.map((one) => loadDrawing(scene, one))).then(
    () => undefined
  );
}

// "2W · 1L" record chip text.
export function recordText(scribbit: Pick<Scribbit, 'wins' | 'losses'>): string {
  return `${scribbit.wins}W · ${scribbit.losses}L`;
}

// --- Tamagotchi field access (defensive) ------------------------------------
// The server owns level/xp/mood/careDoneToday, but founding NPCs and older
// cached snapshots may predate them. These readers give safe defaults so the UI
// never crashes on a partial scribbit.

export function moodOf(scribbit: Partial<Pick<Scribbit, 'mood'>>): Mood {
  return scribbit.mood ?? 'happy';
}

export function moodStyleOf(scribbit: Partial<Pick<Scribbit, 'mood'>>): {
  emoji: string;
  label: string;
  color: string;
} {
  return MOOD_STYLES[moodOf(scribbit)];
}

export function levelOf(scribbit: Partial<Pick<Scribbit, 'level'>>): number {
  return Math.max(1, scribbit.level ?? 1);
}

export function careDoneToday(
  scribbit: Partial<Pick<Scribbit, 'careDoneToday'>>
): CareAction[] {
  return scribbit.careDoneToday ?? [];
}

// True when this care action is still available today for this scribbit.
export function canCare(
  scribbit: Partial<Pick<Scribbit, 'careDoneToday'>>,
  action: CareAction
): boolean {
  return !careDoneToday(scribbit).includes(action);
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
