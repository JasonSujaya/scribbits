import { Scene } from 'phaser';
import {
  equipTitle as saveEquippedTitle,
  fetchInventory,
  fetchLegacyCards,
  fetchLegends,
} from '../lib/api';
import {
  getArena,
  getSketchbookTab,
  setSketchbookTab,
  type SketchbookTab,
} from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  levelOf,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { NAV_SAFE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  label,
  ghostButton,
  handLettered,
  paperCard,
  stickerCard,
  levelBadge,
  errorPanel,
  appTabBar,
  fadeToScene,
} from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { ErrorPanel } from '../lib/ui';
import type {
  Inventory,
  LegacyCard,
  LegacyCardsState,
  LegendsState,
  Scribbit,
} from '../../shared/arena';
import { dailyDrawTabLabel, navigateToDailyDraw } from '../lib/draweligibility';
import { renderCollectionBook } from '../lib/collectionbook';
import { LEGACY_BOOK_PAGE_SIZE, renderLegacyBook } from '../lib/legacycards';

// Three-tab gallery: community Legends, the caller's immutable Legacy Book,
// and a permanent cosmetic Collection. This scene orchestrates data only;
// archival/card presentation lives in legacycards.ts.
export class Sketchbook extends Scene {
  private tab: SketchbookTab = 'legends';
  private galleryData: LegendsState | null = null;
  private inventory: Inventory | null = null;
  private errorPanelRef: ErrorPanel | null = null;
  private loggedIn = false;
  private livingPaper: LivingPaper | null = null;
  private buildGeneration = 0;
  private legendPage = 0;
  private legacyPage = 0;
  private legacyPages: LegacyCardsState[] = [];
  private collectionPage = 0;
  private loadingOlderLegends = false;
  private loadingGallery = false;
  private loadingCollection = false;
  private loadingLegacy = false;
  private collectionError: string | null = null;
  private legacyError: string | null = null;
  private galleryRequestEpoch = 0;
  private collectionRequestEpoch = 0;
  private legacyRequestEpoch = 0;

  constructor() {
    super('Sketchbook');
  }

  init(): void {
    this.galleryData = null;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.buildGeneration = 0;
    this.legendPage = 0;
    this.legacyPage = 0;
    this.legacyPages = [];
    const debugCollectionPage = new URLSearchParams(window.location.search).get(
      'collectionPage'
    );
    const requestedCollectionPage = Number.parseInt(
      debugCollectionPage ?? '',
      10
    );
    this.collectionPage =
      window.location.search.includes('debug') &&
      Number.isFinite(requestedCollectionPage)
        ? Math.max(0, requestedCollectionPage - 1)
        : 0;
    this.loadingOlderLegends = false;
    this.loadingGallery = false;
    this.loadingCollection = false;
    this.loadingLegacy = false;
    this.collectionError = null;
    this.legacyError = null;
    this.inventory = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.tab = getSketchbookTab(this);
    this.loggedIn = getArena(this)?.loggedIn ?? false;
    this.build();
    if (this.tab === 'collection') {
      if (this.loggedIn) void this.loadCollection();
    } else if (this.tab === 'sketchbook') {
      if (this.loggedIn) void this.loadLegacyBook();
    } else {
      void this.loadGallery();
    }
  }

  private async loadGallery(): Promise<void> {
    const requestEpoch = this.galleryRequestEpoch + 1;
    this.galleryRequestEpoch = requestEpoch;
    this.loadingGallery = true;
    this.loadingOlderLegends = false;
    const result = await fetchLegends(null, this.getLegendPageSize());
    if (!this.scene.isActive() || requestEpoch !== this.galleryRequestEpoch) {
      return;
    }
    this.loadingGallery = false;
    if (!result.ok) {
      if (this.tab === 'legends') this.showError(result.error);
      return;
    }
    this.galleryData = result.data;
    this.legendPage = 0;
    if (this.tab === 'legends') this.build();
  }

  private async loadLegacyBook(): Promise<void> {
    if (!this.loggedIn || this.loadingLegacy) return;
    const requestEpoch = this.legacyRequestEpoch + 1;
    this.legacyRequestEpoch = requestEpoch;
    this.loadingLegacy = true;
    this.legacyError = null;
    if (this.tab === 'sketchbook') this.build();

    const result = await fetchLegacyCards(null, LEGACY_BOOK_PAGE_SIZE);
    if (!this.scene.isActive() || requestEpoch !== this.legacyRequestEpoch) {
      return;
    }

    this.loadingLegacy = false;
    if (!result.ok) {
      this.legacyError = result.error;
      if (this.tab === 'sketchbook') this.build();
      return;
    }
    this.legacyPages = [result.data];
    this.legacyPage = 0;
    if (this.tab === 'sketchbook') this.build();
  }

  private async loadOlderLegacyCards(): Promise<void> {
    if (this.loadingLegacy) return;
    const currentPage = this.legacyPages[this.legacyPage];
    let nextCursor = currentPage?.nextCursor ?? null;
    if (!nextCursor) return;

    const requestEpoch = this.legacyRequestEpoch;
    this.loadingLegacy = true;
    this.legacyError = null;
    this.build();
    const knownIds = new Set(
      this.legacyPages.flatMap((page) => page.cards.map((card) => card.id))
    );
    let nextPage: LegacyCardsState | null = null;

    // Offset cursors can overlap when a new card is archived mid-browse. Follow
    // a few duplicate-only pages so Older still advances without an open loop.
    for (let attempt = 0; attempt < 4 && nextCursor; attempt += 1) {
      const result = await fetchLegacyCards(nextCursor, LEGACY_BOOK_PAGE_SIZE);
      if (!this.scene.isActive() || requestEpoch !== this.legacyRequestEpoch) {
        return;
      }
      if (!result.ok) {
        this.loadingLegacy = false;
        this.legacyError = result.error;
        if (this.tab === 'sketchbook') this.build();
        return;
      }

      const uniqueCards = result.data.cards.filter((card) => {
        if (knownIds.has(card.id)) return false;
        knownIds.add(card.id);
        return true;
      });
      nextCursor = result.data.nextCursor;
      if (uniqueCards.length > 0 || !nextCursor) {
        nextPage = { cards: uniqueCards, nextCursor };
        break;
      }
    }

    this.loadingLegacy = false;
    if (nextPage?.cards.length) {
      this.legacyPages.push(nextPage);
      this.legacyPage = this.legacyPages.length - 1;
    } else if (currentPage) {
      this.legacyPages[this.legacyPage] = {
        ...currentPage,
        // If the bounded scan saw only duplicate rows, keep its advanced
        // cursor so another Older tap can continue instead of stranding data.
        nextCursor: nextPage?.nextCursor ?? nextCursor,
      };
    }
    if (this.tab === 'sketchbook') this.build();
  }

  private async loadCollection(): Promise<void> {
    if (!this.loggedIn || this.loadingCollection) return;
    const requestEpoch = this.collectionRequestEpoch + 1;
    this.collectionRequestEpoch = requestEpoch;
    this.loadingCollection = true;
    this.collectionError = null;
    if (this.tab === 'collection') this.build();

    const result = await fetchInventory();
    if (
      !this.scene.isActive() ||
      requestEpoch !== this.collectionRequestEpoch
    ) {
      return;
    }

    this.loadingCollection = false;
    if (!result.ok) {
      this.collectionError = result.error;
      if (this.tab === 'collection') this.build();
      return;
    }
    this.inventory = result.data;
    if (this.tab === 'collection') this.build();
  }

  private async loadOlderLegends(pageSize: number): Promise<void> {
    const startingCursor = this.galleryData?.nextCursor;
    if (!startingCursor || this.loadingGallery || this.loadingOlderLegends) {
      return;
    }

    const requestEpoch = this.galleryRequestEpoch;
    this.loadingOlderLegends = true;
    this.build();
    const existingLegends = this.galleryData?.legends ?? [];
    const existingIds = new Set(existingLegends.map((legend) => legend.id));
    const newLegends: Scribbit[] = [];
    let nextCursor: string | null = startingCursor;
    let fadedSnapshot = this.galleryData?.myFaded ?? [];

    // Offset cursors can overlap after a new Legend is inserted while this
    // player is browsing. Follow a few duplicate-only pages automatically so
    // Older still makes visible progress without an unbounded request loop.
    for (let attempt = 0; attempt < 4 && nextCursor; attempt += 1) {
      const result = await fetchLegends(nextCursor, pageSize);
      if (!this.scene.isActive() || requestEpoch !== this.galleryRequestEpoch) {
        return;
      }
      if (!result.ok) {
        this.loadingOlderLegends = false;
        this.build();
        if (this.tab === 'legends') {
          this.showError(
            result.error,
            () => void this.loadOlderLegends(pageSize)
          );
        }
        return;
      }

      fadedSnapshot = result.data.myFaded;
      nextCursor = result.data.nextCursor;
      for (const legend of result.data.legends) {
        if (existingIds.has(legend.id)) continue;
        existingIds.add(legend.id);
        newLegends.push(legend);
      }
      if (newLegends.length > 0) break;
    }

    this.loadingOlderLegends = false;
    this.galleryData = {
      legends: [...existingLegends, ...newLegends],
      nextCursor,
      myFaded: this.galleryData?.myFaded ?? fadedSnapshot,
    };
    if (newLegends.length > 0) {
      this.legendPage = Math.floor(existingLegends.length / pageSize);
    }
    this.build();
  }

  private build(): void {
    this.buildGeneration += 1;
    this.children.removeAll(true);
    releaseRenderedDrawingTextures(this);
    // Calm living page (no forecast field, no countdown) rebuilt each build.
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this);
    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'GALLERY', 40, UI.ink, true);
    this.buildTabs(150);
    this.buildAppTabs();

    if (this.tab === 'collection') {
      renderCollectionBook({
        scene: this,
        top: 320,
        page: this.collectionPage,
        inventory: this.inventory,
        loggedIn: this.loggedIn,
        loading: this.loadingCollection,
        errorMessage: this.collectionError,
        onPageChange: (page) => {
          this.collectionPage = page;
          this.build();
        },
        onRetry: () => void this.loadCollection(),
        onEquipTitle: (titleId) => this.updateEquippedTitle(titleId),
        onInventoryChanged: () => this.build(),
      });
      return;
    }

    if (this.tab === 'sketchbook') {
      const currentPage = this.legacyPages[this.legacyPage];
      renderLegacyBook({
        scene: this,
        top: 320,
        cards: currentPage?.cards ?? [],
        page: this.legacyPage,
        loadedPageCount: this.legacyPages.length,
        hasOlder: currentPage?.nextCursor !== null && currentPage !== undefined,
        loggedIn: this.loggedIn,
        loading: this.loadingLegacy,
        errorMessage: this.legacyError,
        onNewer: () => {
          this.legacyPage = Math.max(0, this.legacyPage - 1);
          this.build();
        },
        onOlder: () => {
          if (this.loadingLegacy) return;
          if (this.legacyPage < this.legacyPages.length - 1) {
            this.legacyPage += 1;
            this.build();
            return;
          }
          void this.loadOlderLegacyCards();
        },
        onRetry: () => {
          if (this.legacyPages.length === 0) void this.loadLegacyBook();
          else void this.loadOlderLegacyCards();
        },
        onPrimaryAction: (card) => this.handleLegacyPrimaryAction(card),
      });
      return;
    }

    if (!this.galleryData) {
      const loading = stickerCard(this, width / 2, 440, width - 100, 180, {
        tapeColor: UI.tapeAlt,
      });
      loading.add(
        label(
          this,
          0,
          0,
          'Opening the community gallery…',
          TYPE.body,
          UI.inkSoft,
          true
        )
      );
      return;
    }

    this.buildLegends(320);
  }

  private buildAppTabs(): void {
    appTabBar(this, 'gallery', [
      {
        key: 'arena',
        icon: '🏟️',
        label: 'Arena',
        onClick: () => fadeToScene(this, 'ArenaHome'),
      },
      {
        key: 'gallery',
        icon: '🏆',
        label: 'Gallery',
        onClick: () => this.switchTab('legends'),
      },
      {
        key: 'draw',
        icon: '✏️',
        label: dailyDrawTabLabel(this),
        onClick: () => navigateToDailyDraw(this),
      },
      {
        key: 'battles',
        icon: '⚔️',
        label: 'Battles',
        onClick: () => fadeToScene(this, 'MyBattles'),
      },
      {
        key: 'scout',
        icon: '📖',
        label: 'Guide',
        onClick: () => fadeToScene(this, 'Bestiary'),
      },
    ]);
  }

  private buildTabs(y: number): void {
    const { width } = this.scale;
    const controlW = width - 140;
    const controlH = 62;
    const tabs = this.add.container(width / 2, y);

    const bg = this.add.graphics();
    bg.fillStyle(UI.creamHex, 1);
    bg.fillRoundedRect(-controlW / 2, -controlH / 2, controlW, controlH, 18);
    bg.lineStyle(4, UI.inkHex, 1);
    bg.strokeRoundedRect(-controlW / 2, -controlH / 2, controlW, controlH, 18);

    const tabDefinitions: Array<{ tab: SketchbookTab; text: string }> = [
      { tab: 'legends', text: 'Legends' },
      { tab: 'sketchbook', text: 'Legacy Book' },
      { tab: 'collection', text: 'Collection' },
    ];
    const segmentWidth = controlW / tabDefinitions.length;
    const controlLeft = -controlW / 2;
    const activeIndex = tabDefinitions.findIndex(({ tab }) => tab === this.tab);
    const activeX = controlLeft + segmentWidth * (activeIndex + 0.5);
    const active = this.add.graphics();
    active.fillStyle(UI.inkHex, 1);
    active.fillRoundedRect(
      activeX - segmentWidth / 2 + 6,
      -controlH / 2 + 6,
      segmentWidth - 12,
      controlH - 12,
      14
    );

    const dividers = [1, 2].map((dividerIndex) =>
      this.add.rectangle(
        controlLeft + segmentWidth * dividerIndex,
        0,
        3,
        controlH - 18,
        UI.inkHex,
        0.18
      )
    );
    const tabLabels = tabDefinitions.map(({ tab, text }, index) =>
      label(
        this,
        controlLeft + segmentWidth * (index + 0.5),
        0,
        text,
        20,
        this.tab === tab ? UI.cream : UI.ink,
        true
      )
    );
    const tabHits = tabDefinitions.map(({ tab }, index) => {
      const hit = this.add
        .rectangle(
          controlLeft + segmentWidth * (index + 0.5),
          0,
          segmentWidth,
          controlH,
          0xffffff,
          0.001
        )
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.switchTab(tab));
      return hit;
    });

    tabs.add([bg, active, ...dividers, ...tabLabels, ...tabHits]);
  }

  private switchTab(tab: SketchbookTab): void {
    this.tab = tab;
    if (tab === 'legends') this.legendPage = 0;
    else if (tab === 'sketchbook') this.legacyPage = 0;
    else this.collectionPage = 0;
    setSketchbookTab(this, tab);
    this.build();
    if (tab === 'collection') {
      if (this.loggedIn && !this.inventory) void this.loadCollection();
    } else if (tab === 'sketchbook') {
      if (
        this.loggedIn &&
        this.legacyPages.length === 0 &&
        !this.loadingLegacy
      ) {
        void this.loadLegacyBook();
      }
    } else if (!this.galleryData && !this.loadingGallery) {
      void this.loadGallery();
    }
  }

  private buildPageControls(
    totalPages: number,
    y: number,
    page: number,
    changePage: (page: number) => void,
    hasMore = false,
    loadMore?: () => void
  ): void {
    if (totalPages <= 1 && !hasMore) return;
    const { width } = this.scale;
    label(
      this,
      width / 2,
      y,
      `${page + 1} / ${totalPages}${hasMore ? '+' : ''}`,
      TYPE.caption,
      UI.inkSoft,
      true
    );
    if (page > 0) {
      ghostButton(
        this,
        width / 2 - 210,
        y,
        '← Newer',
        () => {
          changePage(page - 1);
          this.build();
        },
        150
      );
    }
    if (page < totalPages - 1 || hasMore) {
      ghostButton(
        this,
        width / 2 + 210,
        y,
        this.loadingOlderLegends && page === totalPages - 1
          ? 'Opening…'
          : 'Older →',
        () => {
          if (page < totalPages - 1) {
            changePage(page + 1);
            this.build();
            return;
          }
          loadMore?.();
        },
        150
      );
    }
  }

  private getLegendPageSize(top = 320): number {
    const columns = 2;
    const cardHeight = 380;
    const visibleRows = Math.max(
      1,
      Math.floor(
        (this.scale.height - NAV_SAFE - cardHeight / 2 - top - 210) / 410
      ) + 1
    );
    return columns * visibleRows;
  }

  private isCurrentBuild(generation: number): boolean {
    return this.scene.isActive() && generation === this.buildGeneration;
  }

  // --- Legends hall ---------------------------------------------------------
  private buildLegends(top: number): void {
    const { width } = this.scale;
    const legends = this.galleryData?.legends ?? [];
    if (legends.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, {
        gold: true,
        tilt: -0.6,
      });
      const trophy = label(this, 0, -40, '🏆', 48, UI.ink);
      card.add(trophy);
      this.tweens.add({
        targets: trophy,
        y: trophy.y - 6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      card.add(
        label(
          this,
          0,
          30,
          'No legends yet!\nWin the rumble or reach 25 belief to be immortalized!',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(8)
      );
      return;
    }
    const columns = 2;
    const cellWidth = (width - 60) / columns;
    const pageSize = this.getLegendPageSize(top);
    const totalPages = Math.ceil(legends.length / pageSize);
    this.legendPage = Math.min(this.legendPage, totalPages - 1);
    const hasMore = this.galleryData?.nextCursor !== null;
    this.buildPageControls(
      totalPages,
      top - 80,
      this.legendPage,
      (page) => {
        this.legendPage = page;
      },
      hasMore && this.legendPage === totalPages - 1,
      () => void this.loadOlderLegends(pageSize)
    );
    const start = this.legendPage * pageSize;
    legends.slice(start, start + pageSize).forEach((legend, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 30 + cellWidth * (col + 0.5);
      const y = top + 210 + row * 410;
      this.buildLegendCard(legend, x, y);
    });
  }

  private buildLegendCard(legend: Scribbit, x: number, y: number): void {
    const cardHeight = 380;
    const cardWidth = 300;
    paperCard(this, x, y, cardWidth, cardHeight, true);
    const top = y - cardHeight / 2;

    // Framed art up top with a level coin in the corner. Tap → detail modal.
    const artY = top + 84;
    const generation = this.buildGeneration;
    void loadDrawing(this, legend).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(this.add.image(x, artY, key), 128).setDepth(2);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.openDetail(legend));
    });
    levelBadge(
      this,
      x + cardWidth / 2 - 34,
      top + 34,
      levelOf(legend),
      0.56
    ).setDepth(4);

    // Text block — tight rows, comfortably above the button.
    label(this, x, artY + 78, legend.name.toUpperCase(), 32, UI.ink, true)
      .setDepth(3)
      .setWordWrapWidth(cardWidth - 42);
    if (legend.legendTitle) {
      label(this, x, artY + 104, legend.legendTitle, 22, UI.goldText, true)
        .setDepth(3)
        .setOrigin(0.5, 0)
        .setWordWrapWidth(cardWidth - 40);
    }
    label(
      this,
      x,
      artY + 176,
      `by u/${legend.artist} · 💛 ${legend.belief}`,
      20,
      UI.inkSoft,
      true
    ).setDepth(3);

    // "View + Believe" opens the shared modal (believe lives inside it).
    ghostButton(
      this,
      x,
      y + cardHeight / 2 - 44,
      '💛 View',
      () => this.openDetail(legend),
      200
    ).setDepth(3);
  }

  // Community terminal records are inspectable, but Belief freezes when a
  // Scribbit leaves the active roster. Only a future alive gallery surface may
  // opt into Believe here.
  private openDetail(scribbit: Scribbit): void {
    const arena = getArena(this);
    const mine = arena?.myUsername === scribbit.artist;
    openDetailModal(this, scribbit, {
      currentDay: arena?.dayNumber ?? scribbit.expiresDay,
      mine,
      actions:
        mine || scribbit.status !== 'alive'
          ? {}
          : { canBelieve: this.loggedIn },
      onRemoved: () => void this.loadGallery(),
      onReported: () => void this.loadGallery(),
    });
  }

  // --- Actions --------------------------------------------------------------
  private async updateEquippedTitle(
    titleId: string | null
  ): Promise<string | null> {
    if (!this.inventory) return 'Your title collection is still syncing.';
    const previousInventory = this.inventory;
    this.inventory = { ...previousInventory, equippedTitle: titleId };

    const result = await saveEquippedTitle(titleId);
    if (!result.ok) {
      this.inventory = previousInventory;
      return result.error;
    }
    this.inventory = result.data;
    return null;
  }

  private handleLegacyPrimaryAction(card: LegacyCard): void {
    if (card.legacy.finish === 'faded') {
      navigateToDailyDraw(this);
      return;
    }
    this.switchTab('legends');
  }

  private showError(
    message: string,
    retry = (): void => {
      void this.loadGallery();
    }
  ): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(
      this,
      width / 2,
      height / 2,
      message,
      () => {
        this.errorPanelRef?.destroy();
        this.errorPanelRef = null;
        retry();
      }
    );
  }
}
