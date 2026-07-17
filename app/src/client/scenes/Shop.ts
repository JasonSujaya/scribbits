import { Scene } from 'phaser';
import { pullCapsule } from '../lib/api';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import { openCapsuleMachine, type CapsuleMachine } from '../lib/capsulemachine';
import {
  getArena,
  setArena,
  setGalleryCollectionSection,
  setGalleryTab,
} from '../lib/registry';
import { errorPanel, label, startScene, type ErrorPanel } from '../lib/ui';
import {
  preloadShopVisualAssets,
  shopStage,
  shopVisualAssetsReady,
} from '../lib/visualassets';
import { UI } from '../lib/theme';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import type { CapsulePull } from '../../shared/arena';
import { playHomeSoundtrack, releaseHomeSoundtrack } from '../lib/soundtrack';

/** Earned rewards live here; Bag remains the one place that equips them. */
export class Shop extends Scene {
  private dock: ReturnType<typeof appDock> | null = null;
  private capsuleMachine: CapsuleMachine | null = null;
  private menu: AppMenu | null = null;
  private assetErrorPanel: ErrorPanel | null = null;
  private transactionLocked = false;

  constructor() {
    super('Shop');
  }

  preload(): void {
    preloadShopVisualAssets(this);
  }

  init(): void {
    this.dock = null;
    this.capsuleMachine = null;
    this.menu = null;
    this.assetErrorPanel = null;
    this.transactionLocked = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    if (!shopVisualAssetsReady(this)) {
      this.retryShopVisualAssets();
      return;
    }
    this.createLoadedShop();
  }

  private createLoadedShop(): void {
    playHomeSoundtrack();
    shopStage(this, -1000);

    this.rebuildDock();
    this.menu = appMenu(this, {
      canNavigate: () => !this.transactionLocked,
    });

    const arena = getArena(this);
    if (!arena) {
      this.navigateWhenSafe(() => startScene(this, 'ArenaHome'));
      return;
    }

    let latestPull: CapsulePull | null = null;

    this.capsuleMachine = openCapsuleMachine(this, {
      ink: arena.myInk,
      nextCost: arena.nextCapsuleCost,
      progress: arena.capsuleProgress,
      seasonName:
        arena.season.current?.name ?? arena.season.latestFinalized?.name,
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
          this.rebuildDock();
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
        startScene(this, 'Gallery');
      },
    });

    this.events.once('shutdown', () => {
      releaseHomeSoundtrack();
      this.dock?.destroy(true);
      this.dock = null;
      this.capsuleMachine?.destroy();
      this.capsuleMachine = null;
      this.menu?.destroy();
      this.menu = null;
      this.assetErrorPanel?.destroy();
      this.assetErrorPanel = null;
    });
  }

  private rebuildDock(): void {
    this.dock?.destroy(true);
    this.dock = appDock(this, 'shop', {
      arena: () => this.navigateWhenSafe(() => startScene(this, 'ArenaHome')),
      bag: () =>
        this.navigateWhenSafe(() => {
          setGalleryTab(this, 'collection');
          startScene(this, 'Gallery');
        }),
      battles: () => this.navigateWhenSafe(() => startScene(this, 'MyBattles')),
      shop: () => undefined,
    });
  }

  private retryShopVisualAssets(): void {
    this.assetErrorPanel?.destroy();
    this.assetErrorPanel = null;
    const { width, height } = this.scale;
    const loadingText = label(
      this,
      width / 2,
      height / 2,
      'OPENING SHOP...',
      30,
      UI.cream,
      true
    );
    const onLoadComplete = (): void => {
      loadingText.destroy();
      if (shopVisualAssetsReady(this)) {
        this.createLoadedShop();
        return;
      }
      this.assetErrorPanel = errorPanel(
        this,
        width / 2,
        height / 2,
        'The Shop artwork did not load.',
        () => this.retryShopVisualAssets()
      );
    };
    this.load.once('complete', onLoadComplete);
    preloadShopVisualAssets(this);
    this.load.start();
    this.events.once('shutdown', () => {
      this.load.off('complete', onLoadComplete);
      loadingText.destroy();
      this.assetErrorPanel?.destroy();
      this.assetErrorPanel = null;
    });
  }

  private navigateWhenSafe(navigate: () => void): void {
    if (this.transactionLocked) return;
    this.capsuleMachine?.destroy();
    this.capsuleMachine = null;
    navigate();
  }
}
