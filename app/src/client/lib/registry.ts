// Typed access to the Phaser game registry for cross-scene state. Keeps the
// magic-string keys in one place so scenes read/write the same slots.

import { Scene } from 'phaser';
import type { ArenaState, BattleReport, Scribbit } from '../../shared/arena';

const ARENA_KEY = 'arena';
const REPLAY_KEY = 'replayReport';
const REPLAY_RETURN_KEY = 'replayReturn';
const SKETCHBOOK_TAB_KEY = 'sketchbookTab';

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
  returnScene: 'ArenaHome' = 'ArenaHome'
): void {
  scene.registry.set(REPLAY_KEY, report);
  scene.registry.set(REPLAY_RETURN_KEY, returnScene);
}

export function getReplay(scene: Scene): BattleReport | undefined {
  return scene.registry.get(REPLAY_KEY) as BattleReport | undefined;
}

export function getReplayReturn(scene: Scene): string {
  return (scene.registry.get(REPLAY_RETURN_KEY) as string | undefined) ?? 'ArenaHome';
}

export function setSketchbookTab(scene: Scene, tab: 'legends' | 'sketchbook'): void {
  scene.registry.set(SKETCHBOOK_TAB_KEY, tab);
}

export function getSketchbookTab(scene: Scene): 'legends' | 'sketchbook' {
  return (
    (scene.registry.get(SKETCHBOOK_TAB_KEY) as 'legends' | 'sketchbook' | undefined) ??
    'legends'
  );
}

// Convenience: find one of my scribbits by id in the current arena snapshot.
export function findMyScribbit(scene: Scene, id: string): Scribbit | undefined {
  return getArena(scene)?.myScribbits.find((one) => one.id === id);
}
