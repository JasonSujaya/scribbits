import type { Game, Scene } from 'phaser';
import {
  PRIMARY_PRELOAD_SCENE_KEYS,
  hasScene,
  isLazySceneKey,
  loadScene,
} from './sceneroutes';
import {
  drawVisualAssetsReady,
  galleryVisualAssetsReady,
  homeVisualAssetsReady,
  replayVisualAssetsReady,
  shopVisualAssetsReady,
} from './visualassets';

type SceneData = Record<string, unknown>;

type TransitionElements = Readonly<{
  root: HTMLElement;
  message: HTMLElement | null;
  retryButton: HTMLButtonElement | null;
}>;

type TransitionState = {
  requestId: number;
  retry: (() => void) | null;
};

const transitionStates = new WeakMap<Game, TransitionState>();

const sceneLabels: Readonly<Record<string, string>> = {
  ScribbitHome: 'Home',
  ArenaHome: 'Arena',
  Draw: 'Drawing desk',
  Replay: 'Battle replay',
  MyBattles: 'Battles',
  BattleHistory: 'Battle history',
  Gallery: 'Bag',
  Shop: 'Shop',
  ScoutNotebook: 'Scout notebook',
  Bestiary: 'Scribbit guide',
  Preloader: 'Scribbits',
};

function getTransitionElements(): TransitionElements | null {
  if (typeof document === 'undefined') return null;
  const root = document.getElementById('scene-transition-status');
  if (!root) return null;
  return {
    root,
    message: document.getElementById('scene-transition-message'),
    retryButton: document.getElementById(
      'scene-transition-retry'
    ) as HTMLButtonElement | null,
  };
}

function showTransition(
  game: Game,
  stage: 'code' | 'assets' | 'error',
  message: string,
  retry: (() => void) | null = null
): void {
  const elements = getTransitionElements();
  if (!elements) return;
  elements.root.hidden = false;
  elements.root.dataset.stage = stage;
  elements.message?.replaceChildren(message);
  if (elements.retryButton) {
    elements.retryButton.hidden = retry === null;
    elements.retryButton.onclick = retry;
  }
  const state = transitionStates.get(game);
  if (state) state.retry = retry;
}

function hideTransition(game: Game, requestId: number): void {
  if (transitionStates.get(game)?.requestId !== requestId) return;
  const elements = getTransitionElements();
  if (!elements) return;
  elements.root.hidden = true;
  elements.root.dataset.stage = 'idle';
  if (elements.retryButton) elements.retryButton.onclick = null;
}

function nextRequest(game: Game): number {
  const requestId = (transitionStates.get(game)?.requestId ?? 0) + 1;
  transitionStates.set(game, { requestId, retry: null });
  return requestId;
}

function sceneLabel(key: string): string {
  return sceneLabels[key] ?? 'next page';
}

function hideAfterFirstRender(
  game: Game,
  destination: Scene,
  requestId: number
): void {
  destination.events.once('create', () => {
    game.events.once('postrender', () => {
      hideTransition(game, requestId);
    });
  });
}

function sceneVisualAssetsReady(game: Game, key: string): boolean {
  const scene = game.scene.keys[key];
  if (!scene) return false;
  if (key === 'ScribbitHome') return homeVisualAssetsReady(scene);
  if (key === 'Draw') return drawVisualAssetsReady(scene);
  if (key === 'Replay') return replayVisualAssetsReady(scene);
  if (key === 'Gallery') return galleryVisualAssetsReady(scene);
  if (key === 'Shop') return shopVisualAssetsReady(scene);
  return true;
}

async function openScene(
  game: Game,
  key: string,
  data: SceneData | undefined,
  requestId: number,
  sourceScene?: Scene
): Promise<boolean> {
  const label = sceneLabel(key);
  let transitionVisible = false;
  try {
    if (!hasScene(game, key)) {
      if (!isLazySceneKey(key)) {
        throw new Error(`Unknown scene: ${key}`);
      }
      showTransition(game, 'code', `Opening ${label}…`);
      transitionVisible = true;
      await prepareScene(game, key);
      if (transitionStates.get(game)?.requestId !== requestId) return false;
    }

    if (transitionStates.get(game)?.requestId !== requestId) return false;
    if (!sceneVisualAssetsReady(game, key)) {
      showTransition(game, 'assets', `Setting up ${label}…`);
      transitionVisible = true;
    }
    const destination = game.scene.keys[key];
    if (!destination) throw new Error(`Scene was not registered: ${key}`);
    if (transitionVisible) hideAfterFirstRender(game, destination, requestId);
    else hideTransition(game, requestId);
    if (sourceScene?.scene.isActive()) {
      sourceScene.scene.start(key, data);
    } else {
      game.scene
        .getScenes(true)
        .filter((activeScene) => activeScene.scene.key !== key)
        .forEach((activeScene) => game.scene.stop(activeScene.scene.key));
      game.scene.start(key, data);
    }
    return true;
  } catch (error) {
    if (transitionStates.get(game)?.requestId !== requestId) return false;
    const retry = (): void => {
      void startGameScene(game, key, data);
    };
    showTransition(
      game,
      'error',
      `We couldn't open ${label}. Check your connection and try again.`,
      retry
    );
    console.error(`Failed to open scene ${key}`, error);
    return false;
  }
}

export async function prepareScene(game: Game, key: string): Promise<void> {
  if (hasScene(game, key)) return;
  if (!isLazySceneKey(key)) throw new Error(`Unknown scene: ${key}`);
  const SceneClass = await loadScene(game, key);
  if (!hasScene(game, key)) game.scene.add(key, SceneClass, false);
}

export async function preparePrimaryScenes(game: Game): Promise<void> {
  await Promise.all(
    PRIMARY_PRELOAD_SCENE_KEYS.map((key) => prepareScene(game, key))
  );
}

export function startGameScene(
  game: Game,
  key: string,
  data?: SceneData
): Promise<boolean> {
  const requestId = nextRequest(game);
  return openScene(game, key, data, requestId);
}

export function startScene(
  scene: Scene,
  key: string,
  data?: SceneData
): void {
  const requestId = nextRequest(scene.sys.game);
  void openScene(scene.sys.game, key, data, requestId, scene);
}
