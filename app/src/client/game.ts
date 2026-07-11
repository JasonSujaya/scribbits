import * as Phaser from 'phaser';
import { AUTO, CANVAS, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { ArenaHome } from './scenes/ArenaHome';
import { Draw } from './scenes/Draw';
import { Replay } from './scenes/Replay';
import { MyBattles } from './scenes/MyBattles';
import { Sketchbook } from './scenes/Sketchbook';
import { Bestiary } from './scenes/Bestiary';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './lib/theme';
import { isShapePowerId } from '../shared/combat';
import type { PrimaryPower } from '../shared/combat';

// Scribbits Arena — Devvit Web + Phaser 4. Draw a creature; its shape is its
// stat sheet; it fights async auto-battles and lives 3 days. Portrait-first:
// a fixed 720x1280 design resolution scaled with FIT to fill any mobile screen.
const debugBrowserMode =
  typeof window !== 'undefined' && window.location.search.includes('debug');
const debugForcesCanvas =
  debugBrowserMode && window.location.search.includes('canvas');
const debugUsesArchivedReport =
  debugBrowserMode && window.location.search.includes('archived');
type DebugShapePower = PrimaryPower;
type DebugCombatElement = 'ember' | 'tide' | 'moss' | 'storm';
const isDebugShapePower = (value: string | null): value is DebugShapePower => {
  return isShapePowerId(value);
};
const isDebugCombatElement = (
  value: string | null
): value is DebugCombatElement => {
  return (
    value === 'ember' ||
    value === 'tide' ||
    value === 'moss' ||
    value === 'storm'
  );
};

const config: Phaser.Types.Core.GameConfig = {
  type: debugForcesCanvas ? CANVAS : AUTO,
  parent: 'game-container',
  backgroundColor: '#2a2118',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  scene: [
    Boot,
    Preloader,
    ArenaHome,
    Draw,
    Replay,
    MyBattles,
    Sketchbook,
    Bestiary,
  ],
};

const StartGame = (parent: string): Phaser.Game => {
  const game = new Game({ ...config, parent });
  game.canvas.dataset.renderer =
    game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas';
  // Reddit's compact landscape WebView only shows the rotate prompt. Suspend
  // Phaser while hidden so particles and mesh updates do not burn battery in
  // the background, then resume without resetting scene state in portrait.
  const syncOrientationPower = (): void => {
    const compactLandscape = window.matchMedia(
      '(orientation: landscape) and (max-height: 500px)'
    ).matches;
    if (compactLandscape && game.loop.running) game.loop.sleep();
    if (!compactLandscape && !game.loop.running) game.loop.wake(true);
  };
  window.addEventListener('resize', syncOrientationPower);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', syncOrientationPower);
  });
  window.setTimeout(syncOrientationPower, 0);
  // Dev-only hook: with ?debug in the URL, expose the game so a preview harness
  // can jump straight to a scene. No effect in production (Devvit has no query).
  if (debugBrowserMode) {
    const win = window as unknown as {
      game?: Phaser.Game;
      debugSpar?: (
        power?: DebugShapePower,
        element?: DebugCombatElement,
        seed?: number
      ) => Promise<string>;
      debugScene?: (key: string) => string;
    };
    win.game = game;
    let debugRuntimeErrorCount = 0;
    const recordDebugRuntimeError = (message: string): void => {
      debugRuntimeErrorCount += 1;
      game.canvas.dataset.runtimeErrors = String(debugRuntimeErrorCount);
      game.canvas.dataset.lastRuntimeError = message.slice(0, 240);
    };
    const onDebugWindowError = (event: ErrorEvent): void => {
      recordDebugRuntimeError(event.message || 'window error');
    };
    const onDebugUnhandledRejection = (event: PromiseRejectionEvent): void => {
      recordDebugRuntimeError(String(event.reason ?? 'unhandled rejection'));
    };
    game.canvas.dataset.runtimeErrors = '0';
    window.addEventListener('error', onDebugWindowError);
    window.addEventListener('unhandledrejection', onDebugUnhandledRejection);
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('error', onDebugWindowError);
      window.removeEventListener(
        'unhandledrejection',
        onDebugUnhandledRejection
      );
    });
    // Jump straight to any scene (Draw, Sketchbook, MyBattles...) for screenshots.
    win.debugScene = (key: string): string => {
      game.scene
        .getScenes(true)
        .forEach((scene) => game.scene.stop(scene.scene.key));
      game.scene.start(key);
      return `started ${key}`;
    };
    // Synthesize a Phaser pointer tap at design-space (x, y). Phaser's input
    // manager reads native pointer events; a bare canvas dispatch can miss, so
    // this feeds move→down→up through the game's own input so hit-tests fire.
    (win as { debugTap?: (x: number, y: number) => string }).debugTap = (
      x: number,
      y: number
    ): string => {
      const canvas = game.canvas;
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (x / game.scale.width) * rect.width;
      const clientY = rect.top + (y / game.scale.height) * rect.height;
      (['pointermove', 'pointerdown', 'pointerup'] as const).forEach((type) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            clientX,
            clientY,
            pointerId: 1,
            bubbles: true,
            cancelable: true,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
          })
        );
      });
      return `tap ${x},${y}`;
    };
    // Harness helper: kick off a spar for the caller's first scribbit and jump
    // straight into the Replay theater, so screenshots of a live battle frame
    // don't depend on tapping the right pixel on the canvas.
    win.debugSpar = async (
      power?: DebugShapePower,
      element?: DebugCombatElement,
      seed?: number
    ): Promise<string> => {
      const home = game.scene.getScene('ArenaHome') as Phaser.Scene | null;
      const arena = home?.registry.get('arena') as
        | { myScribbits?: Array<{ id: string }> }
        | undefined;
      if (!arena) return 'no scribbit';
      if (power) {
        const elementQuery = element
          ? `&element=${encodeURIComponent(element)}`
          : '';
        const seedQuery = Number.isSafeInteger(seed) ? `&seed=${seed}` : '';
        const res = await fetch(
          `/api/debug/battle?power=${encodeURIComponent(power)}${elementQuery}${seedQuery}`
        );
        if (!res.ok) return `debug battle failed ${res.status}`;
        const report = (await res.json()) as {
          simulation?: {
            timeline?: unknown[];
            result?: { completedTick?: number };
          };
          winner?: string;
        };
        if (debugUsesArchivedReport) delete report.simulation;
        game.registry.set('replayReport', report);
        game.registry.set('replayReturn', 'ArenaHome');
        game.scene.stop('ArenaHome');
        game.scene.start('Replay');
        return `spar power=${power} timeline=${report.simulation?.timeline?.length ?? 0} ticks=${report.simulation?.result?.completedTick ?? '?'} archived=${debugUsesArchivedReport} winner=${report.winner ?? '?'}`;
      }
      const id = arena?.myScribbits?.[0]?.id;
      if (!id) return 'no scribbit';
      const res = await fetch('/api/spar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scribbitId: id }),
      });
      const report = (await res.json()) as {
        simulation?: {
          timeline?: unknown[];
          result?: { completedTick?: number };
        };
        winner?: string;
      };
      game.registry.set('replayReport', report);
      game.registry.set('replayReturn', 'ArenaHome');
      game.scene.stop('ArenaHome');
      game.scene.start('Replay');
      return `spar id=${id} timeline=${report.simulation?.timeline?.length ?? 0} ticks=${report.simulation?.result?.completedTick ?? '?'} winner=${report.winner ?? '?'}`;
    };

    // Repeatable browser-proof route. Arena state arrives asynchronously, so
    // retry only the harmless "no scribbit yet" state for a short bounded
    // window. Devvit production never receives debug query parameters.
    if (window.location.search.includes('spar')) {
      const powerParameter = new URLSearchParams(window.location.search).get(
        'power'
      );
      const elementParameter = new URLSearchParams(window.location.search).get(
        'element'
      );
      const seedParameter = new URLSearchParams(window.location.search).get(
        'seed'
      );
      const parsedSeed = Number(seedParameter);
      const requestedPower = isDebugShapePower(powerParameter)
        ? powerParameter
        : undefined;
      const requestedElement = isDebugCombatElement(elementParameter)
        ? elementParameter
        : undefined;
      const requestedSeed =
        seedParameter !== null && Number.isSafeInteger(parsedSeed)
          ? parsedSeed
          : undefined;
      const startDebugSparWhenReady = async (attempt = 0): Promise<void> => {
        const result = await win.debugSpar?.(
          requestedPower,
          requestedElement,
          requestedSeed
        );
        if (result === 'no scribbit' && attempt < 12) {
          window.setTimeout(() => {
            void startDebugSparWhenReady(attempt + 1);
          }, 200);
        }
      };
      window.setTimeout(() => {
        void startDebugSparWhenReady();
      }, 300);
    } else if (window.location.search.includes('collection')) {
      const startDebugCollectionWhenReady = (attempt = 0): void => {
        if (!game.registry.get('arena') && attempt < 12) {
          window.setTimeout(
            () => startDebugCollectionWhenReady(attempt + 1),
            200
          );
          return;
        }
        game.registry.set('sketchbookTab', 'collection');
        win.debugScene?.('Sketchbook');
      };
      window.setTimeout(() => startDebugCollectionWhenReady(), 300);
    }
  }
  return game;
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
