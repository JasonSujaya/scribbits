import type { Game, Scene } from 'phaser';

type SceneConstructor = new () => Scene;
type SceneModule = Promise<SceneConstructor>;

export const LAZY_SCENE_KEYS = [
  'ScribbitHome',
  'ArenaHome',
  'Draw',
  'Replay',
  'MyBattles',
  'BattleHistory',
  'Gallery',
  'Shop',
  'ScoutNotebook',
  'Bestiary',
] as const;

// These are the complete play loop, not optional reference pages. Their code
// is split into chunks for cacheability, then fetched before Home is revealed
// so ordinary navigation never waits on a dynamic import.
export const PRIMARY_PRELOAD_SCENE_KEYS = LAZY_SCENE_KEYS;

export type LazySceneKey = (typeof LAZY_SCENE_KEYS)[number];

const sceneImports: Record<LazySceneKey, () => SceneModule> = {
  ScribbitHome: () =>
    import('../scenes/ScribbitHome').then(({ ScribbitHome }) => ScribbitHome),
  ArenaHome: () =>
    import('../scenes/ArenaHome').then(({ ArenaHome }) => ArenaHome),
  Draw: () => import('../scenes/Draw').then(({ Draw }) => Draw),
  Replay: () => import('../scenes/Replay').then(({ Replay }) => Replay),
  MyBattles: () =>
    import('../scenes/MyBattles').then(({ MyBattles }) => MyBattles),
  BattleHistory: () =>
    import('../scenes/BattleHistory').then(
      ({ BattleHistory }) => BattleHistory
    ),
  Gallery: () => import('../scenes/Gallery').then(({ Gallery }) => Gallery),
  Shop: () => import('../scenes/Shop').then(({ Shop }) => Shop),
  ScoutNotebook: () =>
    import('../scenes/ScoutNotebook').then(
      ({ ScoutNotebook }) => ScoutNotebook
    ),
  Bestiary: () =>
    import('../scenes/Bestiary').then(({ Bestiary }) => Bestiary),
};

const pendingSceneImports = new WeakMap<
  Game,
  Map<LazySceneKey, SceneModule>
>();

export function isLazySceneKey(key: string): key is LazySceneKey {
  return LAZY_SCENE_KEYS.some((sceneKey) => sceneKey === key);
}

export function hasScene(game: Game, key: string): boolean {
  return game.scene.keys[key] !== undefined;
}

export function loadScene(
  game: Game,
  key: LazySceneKey
): Promise<SceneConstructor> {
  let gameImports = pendingSceneImports.get(game);
  if (!gameImports) {
    gameImports = new Map();
    pendingSceneImports.set(game, gameImports);
  }

  const pendingImport = gameImports.get(key);
  if (pendingImport) return pendingImport;

  const sceneImport = sceneImports[key]().catch((error: unknown) => {
    gameImports?.delete(key);
    throw error;
  });
  gameImports.set(key, sceneImport);
  return sceneImport;
}
