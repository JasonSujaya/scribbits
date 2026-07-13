import { Scene } from 'phaser';
import {
  equipTitle as saveEquippedTitle,
  fetchInventory,
  fetchLegacyCards,
  fetchLegends,
} from '../lib/api';
import {
  getArena,
  getGalleryTab,
  setGalleryTab,
  type GalleryTab,
} from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { NAV_SAFE, prefersReducedMotion, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  label,
  handLettered,
  paperCard,
  paperPagination,
  stickerCard,
  errorPanel,
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
import { navigateToDailyDraw } from '../lib/draweligibility';
import { renderCollectionBook } from '../lib/collectionbook';
import { LEGACY_BOOK_PAGE_SIZE, renderLegacyBook } from '../lib/legacycards';
import { appDock } from '../lib/appdock';
import { CanvasActionOverlay, DomOverlay } from '../lib/overlay';
import { paperIcon, type PaperIconKey } from '../lib/papericons';
import { SemanticTabController } from '../lib/semantictabs';
import { bindPressInteractionEvents } from '../lib/pressinteraction';

const LEGEND_CARD_HEIGHT = 250;
const LEGEND_CARD_ROW_GAP = 14;
const LEGEND_CARD_ROW_STEP = LEGEND_CARD_HEIGHT + LEGEND_CARD_ROW_GAP;
const LEGEND_CARD_TOP_GAP = 16;
const GALLERY_SECTION_PANEL_ID = 'gallery-section-panel';
const GALLERY_SECTION_ACTIONS_ID = 'gallery-section-actions';
const galleryTabId = (tab: GalleryTab): string => `gallery-tab-${tab}`;
const GALLERY_TABS: ReadonlyArray<{
  tab: GalleryTab;
  label: string;
  visibleLabel: string;
  icon: PaperIconKey;
  panelSummary: string;
}> = Object.freeze([
  {
    tab: 'legends',
    label: 'Legends',
    visibleLabel: 'LEGENDS',
    icon: 'trophy',
    panelSummary: 'Community Legends. Open a saved Legend for details.',
  },
  {
    tab: 'legacy',
    label: 'Legacy Book',
    visibleLabel: 'LEGACY',
    icon: 'book',
    panelSummary:
      'Legacy Book. Your completed Scribbits and their saved stories.',
  },
  {
    tab: 'collection',
    label: 'Collection',
    visibleLabel: 'COLLECT',
    icon: 'spark',
    panelSummary: 'Collection. Permanent cosmetic discoveries and titles.',
  },
]);

// Three-tab gallery: community Legends, the caller's immutable Legacy Book,
// and a permanent cosmetic Collection. This scene orchestrates data only;
// archival/card presentation lives in legacycards.ts.
export class Gallery extends Scene {
  private tab: GalleryTab = 'legends';
  private legendsState: LegendsState | null = null;
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
  private loadingLegends = false;
  private loadingCollection = false;
  private loadingLegacy = false;
  private collectionError: string | null = null;
  private legacyError: string | null = null;
  private legendsRequestEpoch = 0;
  private collectionRequestEpoch = 0;
  private legacyRequestEpoch = 0;
  private sectionTabsOverlay: CanvasActionOverlay | null = null;
  private contentActionOverlay: CanvasActionOverlay | null = null;
  private sectionSemanticOverlay: DomOverlay | null = null;
  private sectionPanel: HTMLElement | null = null;
  private readonly sectionTabControls = new Map<
    GalleryTab,
    HTMLButtonElement
  >();
  private sectionTabController: SemanticTabController<GalleryTab> | null = null;
  private openingLegendId: string | null = null;

  constructor() {
    super('Gallery');
  }

  init(): void {
    this.legendsState = null;
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
    this.loadingLegends = false;
    this.loadingCollection = false;
    this.loadingLegacy = false;
    this.collectionError = null;
    this.legacyError = null;
    this.inventory = null;
    this.sectionTabsOverlay = null;
    this.contentActionOverlay = null;
    this.sectionSemanticOverlay = null;
    this.sectionPanel = null;
    this.sectionTabControls.clear();
    this.sectionTabController = null;
    this.openingLegendId = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.tab = getGalleryTab(this);
    this.loggedIn = getArena(this)?.loggedIn ?? false;
    this.events.once('shutdown', () => this.destroyBuildOverlays());
    this.build();
    if (this.tab === 'collection') {
      if (this.loggedIn) void this.loadCollection();
    } else if (this.tab === 'legacy') {
      if (this.loggedIn) void this.loadLegacyBook();
    } else {
      void this.loadLegends();
    }
  }

  private async loadLegends(): Promise<void> {
    const requestEpoch = this.legendsRequestEpoch + 1;
    this.legendsRequestEpoch = requestEpoch;
    this.loadingLegends = true;
    this.loadingOlderLegends = false;
    const result = await fetchLegends(null, this.getLegendPageSize());
    if (!this.scene.isActive() || requestEpoch !== this.legendsRequestEpoch) {
      return;
    }
    this.loadingLegends = false;
    if (!result.ok) {
      if (this.tab === 'legends') this.showError(result.error);
      return;
    }
    this.legendsState = result.data;
    this.legendPage = 0;
    if (this.tab === 'legends') this.build();
  }

  private async loadLegacyBook(): Promise<void> {
    if (!this.loggedIn || this.loadingLegacy) return;
    const requestEpoch = this.legacyRequestEpoch + 1;
    this.legacyRequestEpoch = requestEpoch;
    this.loadingLegacy = true;
    this.legacyError = null;
    if (this.tab === 'legacy') this.build();

    const result = await fetchLegacyCards(null, LEGACY_BOOK_PAGE_SIZE);
    if (!this.scene.isActive() || requestEpoch !== this.legacyRequestEpoch) {
      return;
    }

    this.loadingLegacy = false;
    if (!result.ok) {
      this.legacyError = result.error;
      if (this.tab === 'legacy') this.build();
      return;
    }
    this.legacyPages = [result.data];
    this.legacyPage = 0;
    if (this.tab === 'legacy') this.build();
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
        if (this.tab === 'legacy') this.build();
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
    if (this.tab === 'legacy') this.build();
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
    const startingCursor = this.legendsState?.nextCursor;
    if (!startingCursor || this.loadingLegends || this.loadingOlderLegends) {
      return;
    }

    const requestEpoch = this.legendsRequestEpoch;
    this.loadingOlderLegends = true;
    this.build();
    const existingLegends = this.legendsState?.legends ?? [];
    const existingIds = new Set(existingLegends.map((legend) => legend.id));
    const newLegends: Scribbit[] = [];
    let nextCursor: string | null = startingCursor;
    let fadedSnapshot = this.legendsState?.myFaded ?? [];

    // Offset cursors can overlap after a new Legend is inserted while this
    // player is browsing. Follow a few duplicate-only pages automatically so
    // Older still makes visible progress without an unbounded request loop.
    for (let attempt = 0; attempt < 4 && nextCursor; attempt += 1) {
      const result = await fetchLegends(nextCursor, pageSize);
      if (!this.scene.isActive() || requestEpoch !== this.legendsRequestEpoch) {
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
    this.legendsState = {
      legends: [...existingLegends, ...newLegends],
      nextCursor,
      myFaded: this.legendsState?.myFaded ?? fadedSnapshot,
    };
    if (newLegends.length > 0) {
      this.legendPage = Math.floor(existingLegends.length / pageSize);
    }
    this.build();
  }

  private build(): void {
    const focusedSectionTab = [...this.sectionTabControls.values()].includes(
      document.activeElement as HTMLButtonElement
    );
    if (focusedSectionTab) {
      this.contentActionOverlay?.clearPendingFocusLabel();
    }
    const focusedContentActionLabel =
      focusedSectionTab
        ? null
        : (this.contentActionOverlay?.focusedControlLabel() ??
          this.contentActionOverlay?.pendingFocusLabel() ??
          null);
    this.buildGeneration += 1;
    this.destroyBuildOverlays();
    this.children.removeAll(true);
    this.errorPanelRef = null;
    this.openingLegendId = null;
    releaseRenderedDrawingTextures(this);
    // Calm living page (no forecast field, no countdown) rebuilt each build.
    this.livingPaper?.destroy();
    // Gallery cards use the full safe width. Edge peekers can intrude behind
    // the outer column and look like clipped card art, so keep this page calm.
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'GALLERY', 40, UI.ink, true);
    this.buildTabs(150);
    this.mountSectionPanel();
    if (focusedSectionTab) this.sectionTabControls.get(this.tab)?.focus();
    this.buildAppTabs();

    if (this.tab === 'collection') {
      renderCollectionBook({
        scene: this,
        actionOverlay: this.ensureContentActionOverlay(),
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
      this.restoreContentActionFocus(focusedContentActionLabel);
      return;
    }

    if (this.tab === 'legacy') {
      const currentPage = this.legacyPages[this.legacyPage];
      renderLegacyBook({
        scene: this,
        actionOverlay: this.ensureContentActionOverlay(),
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
      this.restoreContentActionFocus(focusedContentActionLabel);
      return;
    }

    if (!this.legendsState) {
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
      this.restoreContentActionFocus(focusedContentActionLabel);
      return;
    }

    this.buildLegends(320);
    this.restoreContentActionFocus(focusedContentActionLabel);
  }

  private restoreContentActionFocus(accessibleLabel: string | null): void {
    if (!accessibleLabel) return;
    const buildGeneration = this.buildGeneration;
    window.setTimeout(() => {
      if (!this.scene.isActive() || buildGeneration !== this.buildGeneration) {
        return;
      }
      const restored =
        this.contentActionOverlay?.restoreControlFocus(accessibleLabel) ?? false;
      if (!restored) this.sectionPanel?.focus();
    }, 0);
  }

  private destroyBuildOverlays(): void {
    this.sectionTabsOverlay?.destroy();
    this.sectionTabsOverlay = null;
    this.contentActionOverlay?.destroy();
    this.contentActionOverlay = null;
    this.sectionSemanticOverlay?.destroy();
    this.sectionSemanticOverlay = null;
    this.sectionPanel = null;
    this.sectionTabControls.clear();
    this.sectionTabController = null;
  }

  private ensureContentActionOverlay(): CanvasActionOverlay {
    if (!this.contentActionOverlay) {
      this.contentActionOverlay = new CanvasActionOverlay(
        this,
        'gallery-content'
      );
      this.contentActionOverlay.setRootAttributes({
        id: GALLERY_SECTION_ACTIONS_ID,
        'aria-label': 'Selected Gallery section actions',
      });
      if (this.sectionSemanticOverlay) {
        this.contentActionOverlay.moveAfter(this.sectionSemanticOverlay);
      }
    }
    return this.contentActionOverlay;
  }

  private buildAppTabs(): void {
    appDock(this, 'gallery', {
      gallery: () => this.switchTab('legends'),
    });
  }

  private buildTabs(y: number): void {
    const { width } = this.scale;
    const controlW = width - 60;
    const controlH = 100;
    const tabs = this.add.container(width / 2, y);

    const bg = this.add.graphics();
    bg.fillStyle(UI.creamHex, 1);
    bg.fillRoundedRect(-controlW / 2, -controlH / 2, controlW, controlH, 18);
    bg.lineStyle(4, UI.inkHex, 1);
    bg.strokeRoundedRect(-controlW / 2, -controlH / 2, controlW, controlH, 18);

    const segmentWidth = controlW / GALLERY_TABS.length;
    const controlLeft = -controlW / 2;
    const activeIndex = GALLERY_TABS.findIndex(({ tab }) => tab === this.tab);
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
    this.sectionTabsOverlay = new CanvasActionOverlay(this);
    const sectionTabController = new SemanticTabController({
      keys: GALLERY_TABS.map(({ tab }) => tab),
      selectedKey: this.tab,
      listLabel: 'Gallery sections',
      panelId: GALLERY_SECTION_PANEL_ID,
      tabId: galleryTabId,
      onSelect: (tab) => this.switchTab(tab),
      resolveControl: (tab) => this.sectionTabControls.get(tab),
    });
    this.sectionTabController = sectionTabController;
    this.sectionTabsOverlay.setRootAttributes(
      sectionTabController.listAttributes
    );
    const tabContent = GALLERY_TABS.flatMap((definition, index) => {
      const { tab, label: accessibleLabel, visibleLabel, icon } = definition;
      const centerX = controlLeft + segmentWidth * (index + 0.5);
      const activeTab = this.tab === tab;
      const tabIcon = paperIcon(this, icon, centerX, -20, {
        size: 32,
        fill: activeTab ? UI.gold : UI.tapeAlt,
      });
      const tabLabel = label(
        this,
        centerX,
        25,
        visibleLabel,
        28,
        activeTab ? UI.cream : UI.ink,
        true
      );
      const activateTab = (): void => {
        this.sectionTabController?.activate(tab);
      };
      const hit = this.add
        .rectangle(centerX, 0, segmentWidth, controlH, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      bindPressInteractionEvents(
        hit,
        {
          press: () => {
            tabIcon.setAlpha(0.68);
            tabLabel.setAlpha(0.68);
          },
          release: () => {
            tabIcon.setAlpha(1);
            tabLabel.setAlpha(1);
          },
          activate: activateTab,
          pressOnHover: false,
        },
        { gameTarget: this.input, shutdownTarget: this.events }
      );
      const nativeTab =
        this.sectionTabsOverlay?.add({
          label: accessibleLabel,
          rect: {
            x: width / 2 + centerX - segmentWidth / 2,
            y: y - controlH / 2,
            width: segmentWidth,
            height: controlH,
          },
          attributes: sectionTabController.attributesFor(tab),
          pointerPassthrough: true,
          onKeyDown: (event) =>
            this.sectionTabController?.handleKey(event, tab),
          onActivate: activateTab,
        }) ?? null;
      if (nativeTab) {
        this.sectionTabControls.set(tab, nativeTab);
        sectionTabController.register(tab, nativeTab);
      }
      return [tabIcon, tabLabel, hit];
    });

    tabs.add([bg, active, ...dividers, ...tabContent]);
  }

  private mountSectionPanel(): void {
    const definition = GALLERY_TABS.find(({ tab }) => tab === this.tab);
    if (!definition || !this.sectionTabController) return;
    const panel = document.createElement('div');
    this.sectionPanel = panel;
    this.sectionTabController.configurePanel(
      panel,
      this.tab,
      definition.panelSummary,
      { live: 'polite', ownedControlRootId: GALLERY_SECTION_ACTIONS_ID }
    );
    Object.assign(panel.style, {
      clipPath: 'inset(50%)',
      opacity: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    });
    this.sectionSemanticOverlay = new DomOverlay(this);
    this.sectionSemanticOverlay.place(panel, {
      x: 30,
      y: 210,
      width: 1,
      height: 1,
    });
    if (this.contentActionOverlay) {
      this.contentActionOverlay.moveAfter(this.sectionSemanticOverlay);
    }
  }

  private switchTab(tab: GalleryTab): void {
    if (tab === this.tab) {
      return;
    }
    this.tab = tab;
    if (tab === 'legends') this.legendPage = 0;
    else if (tab === 'legacy') this.legacyPage = 0;
    else this.collectionPage = 0;
    setGalleryTab(this, tab);
    this.build();
    if (tab === 'collection') {
      if (this.loggedIn && !this.inventory) void this.loadCollection();
    } else if (tab === 'legacy') {
      if (
        this.loggedIn &&
        this.legacyPages.length === 0 &&
        !this.loadingLegacy
      ) {
        void this.loadLegacyBook();
      }
    } else if (!this.legendsState && !this.loadingLegends) {
      void this.loadLegends();
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
    const opening =
      this.loadingOlderLegends && page === totalPages - 1 && hasMore;
    const goPrevious = (): void => {
      changePage(page - 1);
      this.build();
    };
    const goNext = (): void => {
      if (page < totalPages - 1) {
        changePage(page + 1);
        this.build();
        return;
      }
      loadMore?.();
    };
    paperPagination({
      scene: this,
      actionOverlay: this.ensureContentActionOverlay(),
      y,
      page,
      pageCount: totalPages,
      pageLabel: opening
        ? 'OPENING…'
        : `PAGE ${page + 1} / ${totalPages}${hasMore ? '+' : ''}`,
      fontSize: 22,
      hasPrevious: page > 0,
      hasNext: page < totalPages - 1 || hasMore,
      isNextLoading: opening,
      showUnavailable: true,
      previousX: width / 2 - 144,
      nextX: width / 2 + 144,
      backgroundWidth: 398,
      pointerPassthrough: true,
      previousLabel: 'Previous Legends page',
      nextLabel: 'Next Legends page',
      loadingNextLabel: 'Opening next Legends page',
      onPrevious: goPrevious,
      onNext: goNext,
    });
  }

  private getLegendPageSize(top = 320): number {
    const columns = 2;
    const contentTop = top + LEGEND_CARD_TOP_GAP;
    const contentBottom = this.scale.height - NAV_SAFE - 18;
    const availableHeight = Math.max(
      LEGEND_CARD_HEIGHT,
      contentBottom - contentTop
    );
    const visibleRows = Math.max(
      1,
      Math.floor((availableHeight + LEGEND_CARD_ROW_GAP) / LEGEND_CARD_ROW_STEP)
    );
    return columns * visibleRows;
  }

  private isCurrentBuild(generation: number): boolean {
    return this.scene.isActive() && generation === this.buildGeneration;
  }

  // --- Legends hall ---------------------------------------------------------
  private buildLegends(top: number): void {
    const { width } = this.scale;
    const legends = this.legendsState?.legends ?? [];
    if (legends.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, {
        gold: true,
        tilt: -0.6,
      });
      const trophy = paperIcon(this, 'trophy', 0, -40, {
        size: 54,
        fill: UI.gold,
      });
      card.add(trophy);
      if (!prefersReducedMotion()) {
        this.tweens.add({
          targets: trophy,
          y: trophy.y - 6,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
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
    const hasMore = this.legendsState?.nextCursor !== null;
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
      const y =
        top +
        LEGEND_CARD_TOP_GAP +
        LEGEND_CARD_HEIGHT / 2 +
        row * LEGEND_CARD_ROW_STEP;
      this.buildLegendCard(legend, x, y);
    });
  }

  private buildLegendCard(legend: Scribbit, x: number, y: number): void {
    const cardWidth = 300;
    const cardPaper = paperCard(
      this,
      x,
      y,
      cardWidth,
      LEGEND_CARD_HEIGHT,
      true
    ).setDepth(1);
    const top = y - LEGEND_CARD_HEIGHT / 2;
    const status = planLegendStatus(legend);

    const artY = top + 61;
    const generation = this.buildGeneration;
    void loadDrawing(this, legend).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      fitDrawing(this.add.image(x, artY, key), 108).setDepth(2);
    });

    label(
      this,
      x,
      top + 132,
      fitCardText(legend.name.toUpperCase(), 18),
      28,
      UI.ink,
      true
    ).setDepth(3);
    this.add
      .rectangle(x, top + 169, 226, 42, UI.creamHex, 0.92)
      .setStrokeStyle(2, UI.inkHex, 0.25)
      .setDepth(2);
    paperIcon(this, status.icon, x - 84, top + 169, {
      size: 24,
      fill: status.icon === 'trophy' ? UI.gold : UI.coral,
    }).setDepth(3);
    const statusText = label(
      this,
      x + 12,
      top + 169,
      status.label,
      26,
      UI.goldText,
      true
    ).setDepth(3);
    if (statusText.width > 180) statusText.setScale(180 / statusText.width);
    const actionY = top + 218;
    this.add
      .rectangle(x, actionY, 132, 42, UI.creamHex, 0.96)
      .setStrokeStyle(2, UI.inkHex, 0.6)
      .setDepth(2);
    paperIcon(this, 'info', x - 42, actionY, {
      size: 25,
      fill: UI.tapeAlt,
    }).setDepth(3);
    label(this, x + 20, actionY, 'VIEW', 22, UI.ink, true).setDepth(3);

    const openLegend = (): void => {
      if (this.openingLegendId) return;
      this.openingLegendId = legend.id;
      this.sectionTabsOverlay?.setVisible(false);
      this.contentActionOverlay?.setVisible(false);
      this.openDetail(legend);
    };

    // One full-card target keeps the compact presentation easy to tap. Every
    // contextual action remains in the existing server-backed detail modal.
    const hit = this.add
      .rectangle(x, y, cardWidth, LEGEND_CARD_HEIGHT, 0xffffff, 0.001)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });
    bindPressInteractionEvents(
      hit,
      {
        press: () => cardPaper.setAlpha(0.78),
        release: () => cardPaper.setAlpha(1),
        activate: openLegend,
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    this.ensureContentActionOverlay().add({
      label: `Open ${fitCardText(legend.name, 24)}. ${status.label}.`,
      rect: { x: x - 110, y: y + 20, width: 220, height: 100 },
      pointerPassthrough: true,
      onActivate: openLegend,
    });
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
          ? { canBelieve: false }
          : { canBelieve: this.loggedIn },
      onRemoved: () => void this.loadLegends(),
      onReported: () => void this.loadLegends(),
      onClose: () => {
        this.openingLegendId = null;
        this.sectionTabsOverlay?.setVisible(true);
        this.contentActionOverlay?.setVisible(true);
      },
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
      void this.loadLegends();
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

function fitCardText(value: string, maxCharacters: number): string {
  const compactValue = value.trim();
  if (compactValue.length <= maxCharacters) return compactValue;
  return `${compactValue.slice(0, maxCharacters - 1).trimEnd()}…`;
}

function planLegendStatus(legend: Scribbit): Readonly<{
  icon: 'trophy' | 'heart';
  label: string;
}> {
  const championPrefix = 'Champion of Day ';
  if (legend.legendTitle?.startsWith(championPrefix)) {
    const championDay = legend.legendTitle.slice(championPrefix.length).trim();
    return Object.freeze({
      icon: 'trophy',
      label: championDay ? `CHAMPION • D${championDay}` : 'CHAMPION',
    });
  }
  return Object.freeze({
    icon: 'heart',
    label: `BELOVED • ${legend.belief} BELIEF`,
  });
}
