import { Scene } from 'phaser';
import { fetchArena } from '../lib/api';
import { generateAllElementBadges, generateCoreArt } from '../lib/art';
import { setArena } from '../lib/registry';
import {
  preloadPrimaryNavigationVisualAssets,
  primaryNavigationVisualAssetsReady,
} from '../lib/visualassets';
import type { ArenaState } from '../../shared/arena';
import { translate } from '../lib/localization';
import { preparePrimaryScenes, startScene } from '../lib/scenenavigation';
import { PRIMARY_PRELOAD_SCENE_KEYS } from '../lib/sceneroutes';
import {
  markGameBootPhase,
  setGameBootProgress,
  setGameBootRetry,
  setGameBootStart,
} from '../lib/gameboot';
import {
  isHomeSoundtrackPlaying,
  playHomeSoundtrack,
} from '../lib/soundtrack';

// Fetch the arena snapshot while the complete primary play loop and its artwork
// load in parallel. Home is revealed only when normal navigation is ready.
// Player drawings and optional reference pages still load on demand.
export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  create(): void {
    // Expanded mode is opened by the player's explicit splash/challenge tap.
    // Request music immediately while that launch gesture is still fresh;
    // strict WebViews retry silently on the player's first in-game interaction.
    playHomeSoundtrack();
    generateCoreArt(this);
    generateAllElementBadges(this);
    void this.loadArena();
  }

  private async loadArena(): Promise<void> {
    setGameBootRetry(null);
    markGameBootPhase('loading', translate('preloader.preparing'));
    const arenaRequest = fetchArena().then((result) => {
      setGameBootProgress('arena', 1);
      return result;
    });
    const [result, gamePreparation] = await Promise.all([
      arenaRequest,
      this.preparePrimaryGame(),
    ]);
    if (!result.ok) {
      this.showRetry(result.error);
      return;
    }
    if (!gamePreparation.ok) {
      this.showRetry(gamePreparation.error);
      return;
    }
    this.startArena(result.data);
  }

  private async preparePrimaryGame(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    try {
      const primarySceneCode = preparePrimaryScenes(
        this.sys.game,
        (progress) => setGameBootProgress('code', progress)
      );
      const primaryArtwork = this.loadPrimaryArtwork();
      await Promise.all([primarySceneCode, primaryArtwork]);
      return { ok: true };
    } catch (error) {
      console.error('Failed to prepare the primary game', error);
      return {
        ok: false,
        error: translate('preloader.error.load'),
      };
    }
  }

  private loadPrimaryArtwork(): Promise<void> {
    if (primaryNavigationVisualAssetsReady(this)) {
      setGameBootProgress('artwork', 1);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const reportProgress = (progress: number): void => {
        setGameBootProgress('artwork', progress);
      };
      this.load.on('progress', reportProgress);
      this.load.once('complete', () => {
        this.load.off('progress', reportProgress);
        if (primaryNavigationVisualAssetsReady(this)) {
          setGameBootProgress('artwork', 1);
          resolve();
          return;
        }
        reject(new Error(translate('preloader.error.artwork')));
      });
      preloadPrimaryNavigationVisualAssets(this);
      this.load.start();
    });
  }

  private startArena(state: ArenaState): void {
    if (!isHomeSoundtrackPlaying()) {
      setGameBootStart(() => {
        // Calling play() from this loader button preserves the trusted gesture
        // that strict iframe and WebView autoplay policies require.
        playHomeSoundtrack();
        this.openHome(state);
      });
      markGameBootPhase('awaiting-start', translate('preloader.ready'));
      return;
    }
    this.openHome(state);
  }

  private openHome(state: ArenaState): void {
    this.game.canvas.dataset.primaryPreload = 'ready';
    this.game.canvas.dataset.preloadedSceneKeys =
      PRIMARY_PRELOAD_SCENE_KEYS.join(',');
    setArena(this, state);
    startScene(this, 'ScribbitHome');
  }

  private showRetry(message: string): void {
    setGameBootRetry(() => void this.loadArena());
    markGameBootPhase('error', message);
  }
}
