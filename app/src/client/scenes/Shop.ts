import { Scene } from 'phaser';
import { pullCapsule } from '../lib/api';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import { openCapsuleMachine, type CapsuleMachine } from '../lib/capsulemachine';
import { navigateToDailyDraw } from '../lib/draweligibility';
import {
  getArena,
  setArena,
  setGalleryCollectionSection,
  setGalleryTab,
} from '../lib/registry';
import { fadeToScene } from '../lib/ui';
import { preloadShopVisualAssets, shopStage } from '../lib/visualassets';
import { UI } from '../lib/theme';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import type { CapsulePull } from '../../shared/arena';

/** Earned rewards live here; Bag remains the one place that equips them. */
export class Shop extends Scene {
  private capsuleMachine: CapsuleMachine | null = null;
  private menu: AppMenu | null = null;
  private transactionLocked = false;

  constructor() {
    super('Shop');
  }

  preload(): void {
    preloadShopVisualAssets(this);
  }

  init(): void {
    this.capsuleMachine = null;
    this.menu = null;
    this.transactionLocked = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    shopStage(this, -1000);

    appDock(this, 'shop', {
      arena: () => this.navigateWhenSafe(() => fadeToScene(this, 'ArenaHome')),
      bag: () =>
        this.navigateWhenSafe(() => {
          setGalleryTab(this, 'collection');
          fadeToScene(this, 'Gallery');
        }),
      draw: () => this.navigateWhenSafe(() => navigateToDailyDraw(this)),
      battles: () =>
        this.navigateWhenSafe(() => fadeToScene(this, 'MyBattles')),
      shop: () => undefined,
    });
    this.menu = appMenu(this, {
      canNavigate: () => !this.transactionLocked,
    });

    const arena = getArena(this);
    if (!arena) {
      this.navigateWhenSafe(() => fadeToScene(this, 'ArenaHome'));
      return;
    }

    let latestPull: CapsulePull | null = null;

    this.capsuleMachine = openCapsuleMachine(this, {
      ink: arena.myInk,
      nextCost: arena.nextCapsuleCost,
      progress: arena.capsuleProgress,
      embedded: true,
      onTransactionLockChange: (locked) => {
        this.transactionLocked = locked;
      },
      onPull: async (operationId) => {
        const result = await pullCapsule(operationId);
        if (!result.ok) return { error: result.error };
        latestPull = result.data.pull;
        const currentArena = getArena(this);
        if (currentArena) {
          setArena(this, {
            ...currentArena,
            myInk: result.data.ink,
            myPens: [...result.data.inventory.pens],
            nextCapsuleCost: result.data.nextCost,
            capsuleProgress: result.data.progress,
          });
        }
        return result.data;
      },
      onClose: () => undefined,
      onViewCollection: () => {
        const reward = latestPull
          ? COSMETIC_BY_ID.get(latestPull.id)
          : undefined;
        if (reward?.kind === 'accessory') {
          setGalleryCollectionSection(this, reward.category);
        }
        setGalleryTab(this, 'collection');
        fadeToScene(this, 'Gallery');
      },
    });

    this.events.once('shutdown', () => {
      this.capsuleMachine?.destroy();
      this.capsuleMachine = null;
      this.menu?.destroy();
      this.menu = null;
    });
  }

  private navigateWhenSafe(navigate: () => void): void {
    if (this.transactionLocked) return;
    this.capsuleMachine?.destroy();
    this.capsuleMachine = null;
    navigate();
  }
}
