// Display helpers for rendering a player's drawing (its imageUrl) as a Phaser
// texture, plus small formatters shared across scenes. The drawings ARE the art,
// so most scenes just need: "give me a sprite of this scribbit's drawing".

import { Scene } from 'phaser';
import type { CareAction, Mood, Scribbit } from '../../shared/arena';
import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from '../../shared/arena';
import { MOOD_STYLES } from './theme';

// Texture key for a scribbit's drawing. Stable per id so we load each once.
export function drawingKey(scribbit: Pick<Scribbit, 'id'>): string {
  return `drawing-${scribbit.id}`;
}

// Loads a scribbit's drawing into the texture cache (idempotent) and resolves
// with the texture key once ready. On failure it bakes a friendly placeholder
// under the same key so callers can always add an image without crashing.
export function loadDrawing(scene: Scene, scribbit: Scribbit): Promise<string> {
  const key = drawingKey(scribbit);
  if (scene.textures.exists(key)) return Promise.resolve(key);

  return new Promise((resolve) => {
    let settled = false;
    const onComplete = (): void => finish();
    // loaderror fires for every failed file; only react to our own key.
    const onError = (file: { key?: string }): void => {
      if (file?.key !== key) return;
      if (!scene.textures.exists(key)) bakePlaceholder(scene, key);
      finish();
    };
    const finish = (): void => {
      if (settled) return;
      settled = true;
      scene.load.off(`filecomplete-image-${key}`, onComplete);
      scene.load.off('loaderror', onError);
      resolve(key);
    };

    scene.load.on(`filecomplete-image-${key}`, onComplete);
    scene.load.on('loaderror', onError);
    scene.load.image(key, scribbit.imageUrl);
    scene.load.start();

    // Safety timeout so a stuck load never blocks a ceremony forever.
    scene.time.delayedCall(9000, () => {
      if (!scene.textures.exists(key)) bakePlaceholder(scene, key);
      finish();
    });
  });
}

// A gentle "drawing unavailable" placeholder so the frame never sits empty.
function bakePlaceholder(scene: Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const size = 256;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xfdf3df, 1);
  graphics.fillRect(0, 0, size, size);
  graphics.lineStyle(4, 0xcbb79a, 1);
  graphics.strokeRect(8, 8, size - 16, size - 16);
  graphics.fillStyle(0xcbb79a, 1);
  graphics.fillCircle(size / 2, size / 2 - 10, 26);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
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
