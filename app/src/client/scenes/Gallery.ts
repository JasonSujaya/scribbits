import { Scene } from 'phaser';
import {
  equipGear,
  equipTitle as saveEquippedTitle,
  fetchArena,
  fetchInventory,
  fetchLegacyCards,
  fetchLegends,
  mergeGear,
} from '../lib/api';
import {
  getArena,
  getArenaRevision,
  getGalleryTab,
  setArena,
  setGalleryTab,
  takeGalleryCollectionSection,
  type GalleryTab,
} from '../lib/registry';
import type { EquipmentCategory } from '../../shared/equipment';
import {
  loadDrawing,
  fitDrawing,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { prefersReducedMotion, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import { label, paperPagination, stickerCard, errorPanel } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { ErrorPanel } from '../lib/ui';
import type {
  GearRank,
  Inventory,
  LegacyCard,
  LegacyCardsState,
  LegendsState,
  MergeGearResponse,
  Scribbit,
} from '../../shared/arena';
import { navigateToDailyDraw } from '../lib/draweligibility';
import {
  renderCollectionBook,
  type InkKitSection,
} from '../lib/collectionbook';
import { LEGACY_BOOK_PAGE_SIZE, renderLegacyBook } from '../lib/legacycards';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import {
  CanvasActionOverlay,
  CanvasModalOverlay,
  DomOverlay,
} from '../lib/overlay';
import { paperIcon, type PaperIconKey } from '../lib/papericons';
import { SemanticTabController } from '../lib/semantictabs';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import { screenTitle } from '../lib/screentitle';
import { translate } from '../lib/localization';
import { fitText } from '../lib/fittext';
import { planSceneMutationResponse } from '../lib/arenaasynclifecycle';

const LEGEND_PAGE_SIZE = 4;
const LEGEND_CARD_HEIGHT = 272;
const LEGEND_CARD_ROW_GAP = 18;
const LEGEND_CARD_ROW_STEP = LEGEND_CARD_HEIGHT + LEGEND_CARD_ROW_GAP;
const LEGEND_CARD_TOP_GAP = 20;
const BAG_CONTENT_TOP = 168;
const GALLERY_CONTENT_TOP = 330;
const GALLERY_SECTION_PANEL_ID = 'gallery-section-panel';
const GALLERY_SECTION_ACTIONS_ID = 'gallery-section-actions';
const DEBUG_INK_KIT_SECTIONS: readonly InkKitSection[] = [
  'weapon',
  'armor',
  'shoes',
  'accessory',
  'styles',
];
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
]);

// One scene hosts two explicit dock destinations without duplicating data
// orchestration: Bag owns inventory/equipment, while Gallery owns community
// Legends and the caller's immutable Legacy Book.
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
  private collectionScrollOffset = 0;
  private collectionSection: InkKitSection = 'weapon';
  private loadingOlderLegends = false;
  private loadingLegends = false;
  private loadingCollection = false;
  private loadingLegacy = false;
  private collectionError: string | null = null;
  private equipmentError: string | null = null;
  private selectedEquipmentScribbitId: string | null = null;
  private savingEquipment = false;
  private legacyError: string | null = null;
  private legendsRequestEpoch = 0;
  private collectionRequestEpoch = 0;
  private legacyRequestEpoch = 0;
  private sceneVisitEpoch = 0;
  private equipmentMutationEpoch = 0;
  private titleMutationEpoch = 0;
  private gearMergeMutationEpoch = 0;
  private arenaReconciliationEpoch = 0;
  private collectionRefreshRequested = false;
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
  private menu: AppMenu | null = null;

  constructor() {
    super('Gallery');
  }

  init(): void {
    this.sceneVisitEpoch += 1;
    this.legendsState = null;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.legendPage = 0;
    this.legacyPage = 0;
    this.legacyPages = [];
    const requestedInkKitSection = new URLSearchParams(
      window.location.search
    ).get('gearSection') as InkKitSection | null;
    this.collectionSection =
      takeGalleryCollectionSection(this) ??
      (window.location.search.includes('debug') &&
      requestedInkKitSection !== null &&
      DEBUG_INK_KIT_SECTIONS.includes(requestedInkKitSection)
        ? requestedInkKitSection
        : 'weapon');
    this.collectionScrollOffset = 0;
    this.loadingOlderLegends = false;
    this.loadingLegends = false;
    this.loadingCollection = false;
    this.loadingLegacy = false;
    this.collectionError = null;
    this.equipmentError = null;
    this.selectedEquipmentScribbitId = null;
    this.savingEquipment = false;
    this.legacyError = null;
    this.inventory = null;
    this.sectionTabsOverlay = null;
    this.contentActionOverlay = null;
    this.sectionSemanticOverlay = null;
    this.sectionPanel = null;
    this.sectionTabControls.clear();
    this.sectionTabController = null;
    this.openingLegendId = null;
    this.menu = null;
    this.collectionRefreshRequested = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.tab = getGalleryTab(this);
    this.loggedIn = getArena(this)?.loggedIn ?? false;
    this.events.once('shutdown', () => {
      this.sceneVisitEpoch += 1;
      this.destroyBuildOverlays();
    });
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
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const requestEpoch = this.legendsRequestEpoch + 1;
    this.legendsRequestEpoch = requestEpoch;
    this.loadingLegends = true;
    this.loadingOlderLegends = false;
    const result = await fetchLegends(null, this.getLegendPageSize());
    if (
      !this.isCurrentSceneVisit(sceneVisitEpoch) ||
      requestEpoch !== this.legendsRequestEpoch
    ) {
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
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const requestEpoch = this.legacyRequestEpoch + 1;
    this.legacyRequestEpoch = requestEpoch;
    this.loadingLegacy = true;
    this.legacyError = null;
    if (this.tab === 'legacy') this.build();

    const result = await fetchLegacyCards(null, LEGACY_BOOK_PAGE_SIZE);
    if (
      !this.isCurrentSceneVisit(sceneVisitEpoch) ||
      requestEpoch !== this.legacyRequestEpoch
    ) {
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

    const sceneVisitEpoch = this.sceneVisitEpoch;
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
      if (
        !this.isCurrentSceneVisit(sceneVisitEpoch) ||
        requestEpoch !== this.legacyRequestEpoch
      ) {
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
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const requestEpoch = this.collectionRequestEpoch + 1;
    this.collectionRequestEpoch = requestEpoch;
    this.loadingCollection = true;
    this.collectionError = null;
    if (this.tab === 'collection') this.build();

    const result = await fetchInventory();
    if (
      !this.isCurrentSceneVisit(sceneVisitEpoch) ||
      requestEpoch !== this.collectionRequestEpoch
    ) {
      return;
    }

    this.loadingCollection = false;
    if (!result.ok) {
      this.collectionError = result.error;
      if (this.tab === 'collection') this.build();
      this.continueRequestedCollectionRefresh();
      return;
    }
    this.inventory = result.data;
    if (this.tab === 'collection') this.build();
    this.continueRequestedCollectionRefresh();
  }

  private async loadOlderLegends(pageSize: number): Promise<void> {
    const startingCursor = this.legendsState?.nextCursor;
    if (!startingCursor || this.loadingLegends || this.loadingOlderLegends) {
      return;
    }

    const sceneVisitEpoch = this.sceneVisitEpoch;
    const requestEpoch = this.legendsRequestEpoch;
    this.loadingOlderLegends = true;
    this.build();
    const existingLegends = this.legendsState?.legends ?? [];
    const existingIds = new Set(existingLegends.map((legend) => legend.id));
    const newLegends: Scribbit[] = [];
    let nextCursor: string | null = startingCursor;

    // Offset cursors can overlap after a new Legend is inserted while this
    // player is browsing. Follow a few duplicate-only pages automatically so
    // Older still makes visible progress without an unbounded request loop.
    for (let attempt = 0; attempt < 4 && nextCursor; attempt += 1) {
      const result = await fetchLegends(nextCursor, pageSize);
      if (
        !this.isCurrentSceneVisit(sceneVisitEpoch) ||
        requestEpoch !== this.legendsRequestEpoch
      ) {
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
    };
    if (newLegends.length > 0) {
      this.legendPage = Math.floor(existingLegends.length / pageSize);
    }
    this.build();
  }

  private build(): void {
    CanvasModalOverlay.destroyAll();
    const focusedSectionTab = [...this.sectionTabControls.values()].includes(
      document.activeElement as HTMLButtonElement
    );
    if (focusedSectionTab) {
      this.contentActionOverlay?.clearPendingFocusLabel();
    }
    const focusedContentActionLabel = focusedSectionTab
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
    const bagActive = this.tab === 'collection';
    screenTitle(
      this,
      width / 2,
      22,
      translate(bagActive ? 'screen.bag' : 'screen.gallery'),
      {
        maxWidth: 340,
        maxHeight: 82,
      }
    );
    if (!bagActive) {
      this.buildTabs(168);
      this.mountSectionPanel();
      if (focusedSectionTab) this.sectionTabControls.get(this.tab)?.focus();
    }
    this.buildAppTabs();

    if (this.tab === 'collection') {
      const myScribbits = getArena(this)?.myScribbits ?? [];
      const selectedScribbit =
        myScribbits.find(
          (scribbit) => scribbit.id === this.selectedEquipmentScribbitId
        ) ?? myScribbits[0];
      if (
        selectedScribbit &&
        this.selectedEquipmentScribbitId !== selectedScribbit.id
      ) {
        this.selectedEquipmentScribbitId = selectedScribbit.id;
      }
      renderCollectionBook({
        scene: this,
        actionOverlay: this.ensureContentActionOverlay(),
        top: BAG_CONTENT_TOP,
        dayNumber: getArena(this)?.dayNumber ?? 1,
        section: this.collectionSection,
        scrollOffset: this.collectionScrollOffset,
        inventory: this.inventory,
        loggedIn: this.loggedIn,
        loading: this.loadingCollection,
        errorMessage: this.collectionError,
        scribbits: myScribbits,
        selectedScribbitId: selectedScribbit?.id ?? null,
        equipmentBusy: this.savingEquipment,
        equipmentError: this.equipmentError,
        onScrollOffsetChange: (offset) => {
          this.collectionScrollOffset = offset;
        },
        onSectionChange: (section) => {
          this.collectionSection = section;
          this.collectionScrollOffset = 0;
          this.equipmentError = null;
          this.build();
        },
        onSelectScribbit: (scribbitId) => {
          this.selectedEquipmentScribbitId = scribbitId;
          this.equipmentError = null;
          this.build();
        },
        onEquipGear: (scribbitId, category, slotIndex, gearId) =>
          this.updateEquipmentSlot(scribbitId, category, slotIndex, gearId),
        onRetry: () => void this.loadCollection(),
        onEquipTitle: (titleId) => this.updateEquippedTitle(titleId),
        onMergeGear: (gearId, operationId) =>
          this.mergeOwnedGear(gearId, operationId),
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
        top: GALLERY_CONTENT_TOP,
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
      const loading = stickerCard(this, width / 2, 470, width - 100, 180, {
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

    this.buildLegends(GALLERY_CONTENT_TOP);
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
        this.contentActionOverlay?.restoreControlFocus(accessibleLabel) ??
        false;
      if (!restored) this.sectionPanel?.focus();
    }, 0);
  }

  private destroyBuildOverlays(): void {
    this.menu?.destroy();
    this.menu = null;
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
        'aria-label':
          this.tab === 'collection'
            ? 'Bag inventory and equipment actions'
            : 'Selected Gallery section actions',
      });
      if (this.sectionSemanticOverlay) {
        this.contentActionOverlay.moveAfter(this.sectionSemanticOverlay);
      }
    }
    return this.contentActionOverlay;
  }

  private buildAppTabs(): void {
    appDock(this, this.tab === 'collection' ? 'bag' : null, {
      bag: () => this.switchTab('collection'),
    });
    this.menu = appMenu(this);
  }

  private buildTabs(y: number): void {
    const { width } = this.scale;
    const controlWidth = width - 60;
    const controlHeight = 84;
    const tabGap = 10;
    const tabWidth =
      (controlWidth - tabGap * (GALLERY_TABS.length - 1)) / GALLERY_TABS.length;
    const tabs = this.add.container(width / 2, y);
    const controlLeft = -controlWidth / 2;
    const activeFillByTab: Readonly<Record<GalleryTab, number>> = {
      legends: UI.goldHex,
      legacy: UI.inkHex,
      collection: UI.coral,
    };
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
      const centerX = controlLeft + tabWidth / 2 + index * (tabWidth + tabGap);
      const activeTab = this.tab === tab;
      const tabFace = this.add.graphics();
      tabFace.fillStyle(activeTab ? activeFillByTab[tab] : UI.creamHex, 1);
      tabFace.fillRoundedRect(
        centerX - tabWidth / 2,
        -controlHeight / 2,
        tabWidth,
        controlHeight,
        16
      );
      tabFace.lineStyle(3, UI.inkHex, activeTab ? 1 : 0.72);
      tabFace.strokeRoundedRect(
        centerX - tabWidth / 2,
        -controlHeight / 2,
        tabWidth,
        controlHeight,
        16
      );
      const activeTextColor = tab === 'legends' ? UI.ink : UI.cream;
      const tabIcon = paperIcon(this, icon, centerX - 60, 0, {
        size: 30,
        fill: activeTab
          ? tab === 'legends'
            ? UI.inkHex
            : UI.creamHex
          : UI.tapeAlt,
      });
      const tabLabel = label(
        this,
        centerX + 18,
        1,
        visibleLabel,
        24,
        activeTab ? activeTextColor : UI.ink,
        true
      );
      const activateTab = (): void => {
        this.sectionTabController?.activate(tab);
      };
      const hit = this.add
        .rectangle(centerX, 0, tabWidth, controlHeight, 0xffffff, 0.001)
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
            x: width / 2 + centerX - tabWidth / 2,
            y: y - controlHeight / 2,
            width: tabWidth,
            height: controlHeight,
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
      return [tabFace, tabIcon, tabLabel, hit];
    });

    tabs.add(tabContent);
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
    else this.collectionScrollOffset = 0;
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
      previousX: width / 2 - 144,
      nextX: width / 2 + 144,
      pointerPassthrough: true,
      previousLabel: 'Previous Legends page',
      nextLabel: 'Next Legends page',
      loadingNextLabel: 'Opening next Legends page',
      onPrevious: goPrevious,
      onNext: goNext,
    });
  }

  private getLegendPageSize(): number {
    return LEGEND_PAGE_SIZE;
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
    const pageSize = this.getLegendPageSize();
    const totalPages = Math.ceil(legends.length / pageSize);
    this.legendPage = Math.min(this.legendPage, totalPages - 1);
    const hasMore = this.legendsState?.nextCursor !== null;
    this.buildPageControls(
      totalPages,
      top + 655,
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
    const cardWidth = 302;
    const cardPaper = stickerCard(this, x, y, cardWidth, LEGEND_CARD_HEIGHT, {
      gold: true,
      tape: false,
    }).setDepth(1);
    const status = planLegendStatus(legend);

    const statusBand = this.add
      .rectangle(
        0,
        -LEGEND_CARD_HEIGHT / 2 + 26,
        cardWidth - 28,
        38,
        UI.goldHex,
        0.22
      )
      .setStrokeStyle(2, UI.goldHex, 0.72);
    const statusIcon = paperIcon(
      this,
      status.icon,
      -102,
      -LEGEND_CARD_HEIGHT / 2 + 26,
      {
        size: 23,
        fill: status.icon === 'trophy' ? UI.gold : UI.coral,
      }
    );
    const statusText = label(
      this,
      12,
      -LEGEND_CARD_HEIGHT / 2 + 26,
      status.label,
      21,
      UI.goldText,
      true
    );
    if (statusText.width > 218) statusText.setScale(218 / statusText.width);
    cardPaper.add([statusBand, statusIcon, statusText]);

    const artY = y - 30;
    const generation = this.buildGeneration;
    void loadDrawing(this, legend).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      fitDrawing(this.add.image(x, artY, key), 124).setDepth(2);
    });

    label(
      this,
      x,
      y + 62,
      fitText(legend.name.toUpperCase(), 18),
      27,
      UI.ink,
      true
    ).setDepth(3);
    label(this, x, y + 101, 'TAP TO OPEN', 18, UI.inkSoft, true).setDepth(3);

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
      label: `Open ${fitText(legend.name, 24)}. ${status.label}.`,
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
  private async updateEquipmentSlot(
    scribbitId: string,
    category: EquipmentCategory,
    slotIndex: 0 | 1,
    gearId: string | null
  ): Promise<Scribbit | { error: string }> {
    if (this.savingEquipment) {
      return { error: 'Finish saving the current loadout first.' };
    }
    this.savingEquipment = true;
    this.equipmentError = null;
    this.build();
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const mutationEpoch = this.equipmentMutationEpoch + 1;
    this.equipmentMutationEpoch = mutationEpoch;

    const result = await equipGear(scribbitId, category, slotIndex, gearId);
    if (
      !this.isCurrentCollectionMutation(
        sceneVisitEpoch,
        mutationEpoch,
        this.equipmentMutationEpoch
      )
    ) {
      if (result.ok) {
        void this.reconcileArenaSnapshot();
      }
      return result.ok ? result.data : { error: result.error };
    }
    this.savingEquipment = false;
    if (!result.ok) {
      this.equipmentError = result.error;
      if (this.scene.isActive() && this.tab === 'collection') this.build();
      return { error: result.error };
    }

    this.applyEquipmentResult(result.data);
    this.selectedEquipmentScribbitId = result.data.id;
    if (this.scene.isActive() && this.tab === 'collection') this.build();
    return result.data;
  }

  private async updateEquippedTitle(
    titleId: string | null
  ): Promise<string | null> {
    if (!this.inventory) return 'Your Bag is still syncing.';
    const previousInventory = this.inventory;
    this.inventory = { ...previousInventory, equippedTitle: titleId };
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const mutationEpoch = this.titleMutationEpoch + 1;
    this.titleMutationEpoch = mutationEpoch;

    const result = await saveEquippedTitle(titleId);
    if (
      !this.isCurrentCollectionMutation(
        sceneVisitEpoch,
        mutationEpoch,
        this.titleMutationEpoch
      )
    ) {
      if (result.ok && this.scene.isActive()) {
        this.requestCollectionRefresh();
      }
      return result.ok ? null : result.error;
    }
    if (!result.ok) {
      this.inventory = previousInventory;
      return result.error;
    }
    this.inventory = result.data;
    return null;
  }

  private async mergeOwnedGear(
    gearId: string,
    operationId: string
  ): Promise<MergeGearResponse | { error: string }> {
    if (!this.inventory) return { error: 'Your Bag is still syncing.' };
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const mutationEpoch = this.gearMergeMutationEpoch + 1;
    this.gearMergeMutationEpoch = mutationEpoch;
    const result = await mergeGear(gearId, operationId);
    if (
      !this.isCurrentCollectionMutation(
        sceneVisitEpoch,
        mutationEpoch,
        this.gearMergeMutationEpoch
      )
    ) {
      if (result.ok && this.scene.isActive()) {
        this.requestCollectionRefresh();
      }
      return result.ok ? result.data : { error: result.error };
    }
    if (!result.ok) return { error: result.error };
    this.inventory = result.data.inventory;
    this.applyForgedGearRank(result.data.gearId, result.data.toRank);
    return result.data;
  }

  private applyForgedGearRank(gearId: string, rank: GearRank): void {
    const arena = getArena(this);
    if (!arena) return;
    let changed = false;
    const myScribbits = arena.myScribbits.map((scribbit) => {
      const wearsGear = Object.values(scribbit.equipmentLoadout).some((slots) =>
        slots.includes(gearId)
      );
      if (!wearsGear || scribbit.gearRanks?.[gearId] === rank) return scribbit;
      changed = true;
      return {
        ...scribbit,
        gearRanks: { ...(scribbit.gearRanks ?? {}), [gearId]: rank },
      };
    });
    if (changed) setArena(this, { ...arena, myScribbits });
  }

  private isCurrentSceneVisit(sceneVisitEpoch: number): boolean {
    return this.scene.isActive() && sceneVisitEpoch === this.sceneVisitEpoch;
  }

  private isCurrentCollectionMutation(
    sceneVisitEpoch: number,
    mutationEpoch: number,
    currentMutationEpoch: number
  ): boolean {
    const action = planSceneMutationResponse({
      active: this.scene.isActive(),
      requestSceneEpoch: sceneVisitEpoch,
      currentSceneEpoch: this.sceneVisitEpoch,
    });
    if (action === 'accept' && mutationEpoch === currentMutationEpoch) {
      return true;
    }
    return false;
  }

  private applyEquipmentResult(updatedScribbit: Scribbit): void {
    const arena = getArena(this);
    if (!arena) return;
    setArena(this, {
      ...arena,
      myScribbits: arena.myScribbits.map((scribbit) =>
        scribbit.id === updatedScribbit.id ? updatedScribbit : scribbit
      ),
    });
  }

  private async reconcileArenaSnapshot(): Promise<void> {
    const reconciliationEpoch = this.arenaReconciliationEpoch + 1;
    this.arenaReconciliationEpoch = reconciliationEpoch;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const arenaRevision = getArenaRevision(this);
      const result = await fetchArena();
      if (reconciliationEpoch !== this.arenaReconciliationEpoch) return;
      if (!result.ok) return;
      if (arenaRevision !== getArenaRevision(this)) continue;
      setArena(this, result.data);
      if (this.scene.isActive() && this.tab === 'collection') this.build();
      return;
    }
  }

  private requestCollectionRefresh(): void {
    if (this.tab !== 'collection') {
      this.inventory = null;
      return;
    }
    if (this.loadingCollection) {
      this.collectionRefreshRequested = true;
      return;
    }
    void this.loadCollection();
  }

  private continueRequestedCollectionRefresh(): void {
    if (!this.collectionRefreshRequested) return;
    this.collectionRefreshRequested = false;
    void this.loadCollection();
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
