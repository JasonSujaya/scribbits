// Typed access to the Phaser game registry for cross-scene state. Keeps the
// magic-string keys in one place so scenes read/write the same slots.

import { Scene } from 'phaser';
import type { ArenaState, BattleReport, Scribbit } from '../../shared/arena';

const ARENA_KEY = 'arena';
const REPLAY_KEY = 'replayReport';
const REPLAY_RETURN_KEY = 'replayReturn';
const SKETCHBOOK_TAB_KEY = 'sketchbookTab';

export type SketchbookTab = 'legends' | 'sketchbook' | 'collection';
export type ReplayReturnScene = 'ArenaHome' | 'Sketchbook';

export function setArena(scene: Scene, state: ArenaState): void {
  scene.registry.set(ARENA_KEY, state);
}

export function getArena(scene: Scene): ArenaState | undefined {
  return scene.registry.get(ARENA_KEY) as ArenaState | undefined;
}

// Hand a battle report to the Replay scene, plus where to return afterward.
export function setReplay(
  scene: Scene,
  report: BattleReport,
  returnScene: ReplayReturnScene = 'ArenaHome'
): void {
  scene.registry.set(REPLAY_KEY, report);
  scene.registry.set(REPLAY_RETURN_KEY, returnScene);
}

export function getReplay(scene: Scene): BattleReport | undefined {
  return scene.registry.get(REPLAY_KEY) as BattleReport | undefined;
}

export function getReplayReturn(scene: Scene): ReplayReturnScene {
  return (
    (scene.registry.get(REPLAY_RETURN_KEY) as ReplayReturnScene | undefined) ??
    'ArenaHome'
  );
}

// Deep-link focus for ArenaHome (e.g. the loss card asks to scroll to the
// entrants bracket). Read-once so it doesn't persist across visits.
export function setArenaFocus(scene: Scene, focus: 'entrants'): void {
  scene.registry.set('arenaFocus', focus);
}

export function takeArenaFocus(scene: Scene): string | null {
  const value =
    (scene.registry.get('arenaFocus') as string | undefined) ?? null;
  if (value) scene.registry.remove('arenaFocus');
  return value;
}

export function setSketchbookTab(scene: Scene, tab: SketchbookTab): void {
  scene.registry.set(SKETCHBOOK_TAB_KEY, tab);
}

export function getSketchbookTab(scene: Scene): SketchbookTab {
  return (
    (scene.registry.get(SKETCHBOOK_TAB_KEY) as SketchbookTab | undefined) ??
    'legends'
  );
}

// Convenience: find one of my scribbits by id in the current arena snapshot.
export function findMyScribbit(scene: Scene, id: string): Scribbit | undefined {
  return getArena(scene)?.myScribbits.find((one) => one.id === id);
}

// Find any scribbit visible in the current snapshot — roster, champion, or
// tonight's entrants — by id. Used so the detail modal can refresh from state.
export function findAnyScribbit(
  scene: Scene,
  id: string
): Scribbit | undefined {
  const arena = getArena(scene);
  if (!arena) return undefined;
  if (arena.champion?.id === id) return arena.champion;
  return (
    arena.myScribbits.find((one) => one.id === id) ??
    arena.todayEntrants.find((one) => one.id === id)
  );
}

// True when a scribbit belongs to the caller's roster (drives modal actions).
export function isMyScribbit(scene: Scene, id: string): boolean {
  return getArena(scene)?.myScribbits.some((one) => one.id === id) ?? false;
}
