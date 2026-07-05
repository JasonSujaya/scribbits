import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { ArenaHome } from './scenes/ArenaHome';
import { Draw } from './scenes/Draw';
import { Replay } from './scenes/Replay';
import { MyBattles } from './scenes/MyBattles';
import { Sketchbook } from './scenes/Sketchbook';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './lib/theme';

// Scribbits Arena — Devvit Web + Phaser 4. Draw a creature; its shape is its
// stat sheet; it fights async auto-battles and lives 3 days. Portrait-first:
// a fixed 720x1280 design resolution scaled with FIT to fill any mobile screen.
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#2a2118',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  scene: [Boot, Preloader, ArenaHome, Draw, Replay, MyBattles, Sketchbook],
};

const StartGame = (parent: string): Phaser.Game => {
  const game = new Game({ ...config, parent });
  // Dev-only hook: with ?debug in the URL, expose the game so a preview harness
  // can jump straight to a scene. No effect in production (Devvit has no query).
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    const win = window as unknown as {
      game?: Phaser.Game;
      debugSpar?: () => Promise<string>;
      debugScene?: (key: string) => string;
    };
    win.game = game;
    // Jump straight to any scene (Draw, Sketchbook, MyBattles...) for screenshots.
    win.debugScene = (key: string): string => {
      game.scene.getScenes(true).forEach((scene) => game.scene.stop(scene.scene.key));
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
    win.debugSpar = async (): Promise<string> => {
      const home = game.scene.getScene('ArenaHome') as Phaser.Scene | null;
      const arena = home?.registry.get('arena') as
        | { myScribbits?: Array<{ id: string }> }
        | undefined;
      const id = arena?.myScribbits?.[0]?.id;
      if (!id) return 'no scribbit';
      const res = await fetch('/api/spar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scribbitId: id }),
      });
      const report = (await res.json()) as { events?: unknown[]; winner?: string };
      game.registry.set('replayReport', report);
      game.registry.set('replayReturn', 'ArenaHome');
      game.scene.stop('ArenaHome');
      game.scene.start('Replay');
      return `spar id=${id} events=${report.events?.length ?? 0} winner=${report.winner ?? '?'}`;
    };
  }
  return game;
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
