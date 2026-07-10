import { Scene } from 'phaser';
import { fetchLegends } from '../lib/api';
import { getArena, getSketchbookTab, setSketchbookTab } from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  recordText,
  levelOf,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { NAV_SAFE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import { label, ghostButton, handLettered, paperCard, stickerCard, elementBadge, levelBadge, errorPanel, appTabBar, fadeToScene } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { ErrorPanel } from '../lib/ui';
import type { LegendsState, Scribbit } from '../../shared/arena';
import { dailyDrawTabLabel, navigateToDailyDraw } from '../lib/draweligibility';

type Tab = 'legends' | 'sketchbook';

// Two-tab gallery. Legends = the community Hall of gold-framed immortals with a
// Believe button. Sketchbook = the caller's faded scribbits with a eulogy line.
export class Sketchbook extends Scene {
  private tab: Tab = 'legends';
  private galleryData: LegendsState | null = null;
  private errorPanelRef: ErrorPanel | null = null;
  private loggedIn = false;
  private livingPaper: LivingPaper | null = null;
  private buildGeneration = 0;
  private legendPage = 0;
  private fadedPage = 0;
  private loadingOlderLegends = false;
  private galleryRequestEpoch = 0;

  constructor() {
    super('Sketchbook');
  }

  init(): void {
    this.galleryData = null;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.buildGeneration = 0;
    this.legendPage = 0;
    this.fadedPage = 0;
    this.loadingOlderLegends = false;
    this.galleryRequestEpoch = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.tab = getSketchbookTab(this);
    this.loggedIn = getArena(this)?.loggedIn ?? false;
    this.build();
    void this.loadGallery();
  }

  private async loadGallery(): Promise<void> {
    const requestEpoch = this.galleryRequestEpoch + 1;
    this.galleryRequestEpoch = requestEpoch;
    this.loadingOlderLegends = false;
    const result = await fetchLegends(null, this.getLegendPageSize());
    if (
      !this.scene.isActive() ||
      requestEpoch !== this.galleryRequestEpoch
    ) {
      return;
    }
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    this.galleryData = result.data;
    this.legendPage = 0;
    this.build();
  }

  private async loadOlderLegends(pageSize: number): Promise<void> {
    const startingCursor = this.galleryData?.nextCursor;
    if (!startingCursor || this.loadingOlderLegends) return;

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
      if (
        !this.scene.isActive() ||
        requestEpoch !== this.galleryRequestEpoch
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

    if (!this.galleryData) {
      const loading = stickerCard(this, width / 2, 440, width - 100, 180, {
        tapeColor: UI.tapeAlt,
      });
      loading.add(
        label(this, 0, 0, 'Opening the community gallery…', TYPE.body, UI.inkSoft, true)
      );
      return;
    }

    if (this.tab === 'legends') this.buildLegends(320);
    else this.buildSketchbook(320);
  }

  private buildAppTabs(): void {
    appTabBar(this, 'gallery', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => fadeToScene(this, 'ArenaHome') },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => this.switchTab('legends') },
      { key: 'draw', icon: '✏️', label: dailyDrawTabLabel(this), onClick: () => navigateToDailyDraw(this) },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => fadeToScene(this, 'MyBattles') },
      { key: 'scout', icon: '📖', label: 'Guide', onClick: () => fadeToScene(this, 'Bestiary') },
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

    const activeX = this.tab === 'legends' ? -controlW / 4 : controlW / 4;
    const active = this.add.graphics();
    active.fillStyle(UI.inkHex, 1);
    active.fillRoundedRect(activeX - controlW / 4 + 6, -controlH / 2 + 6, controlW / 2 - 12, controlH - 12, 14);

    const divider = this.add.rectangle(0, 0, 3, controlH - 18, UI.inkHex, 0.18);
    const legendsColor = this.tab === 'legends' ? UI.cream : UI.ink;
    const sketchColor = this.tab === 'sketchbook' ? UI.cream : UI.ink;
    const legends = label(this, -controlW / 4, 0, 'Legends', 23, legendsColor, true);
    const sketchbook = label(this, controlW / 4, 0, 'Sketchbook', 23, sketchColor, true);

    const legendsHit = this.add
      .rectangle(-controlW / 4, 0, controlW / 2, controlH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    const sketchHit = this.add
      .rectangle(controlW / 4, 0, controlW / 2, controlH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    legendsHit.on('pointerup', () => this.switchTab('legends'));
    sketchHit.on('pointerup', () => this.switchTab('sketchbook'));

    tabs.add([bg, active, divider, legends, sketchbook, legendsHit, sketchHit]);
  }

  private switchTab(tab: Tab): void {
    this.tab = tab;
    if (tab === 'legends') this.legendPage = 0;
    else this.fadedPage = 0;
    setSketchbookTab(this, tab);
    this.build();
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
      ghostButton(this, width / 2 - 210, y, '← Newer', () => {
        changePage(page - 1);
        this.build();
      }, 150);
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
      const card = stickerCard(this, width / 2, 560, width - 80, 220, { gold: true, tilt: -0.6 });
      const trophy = label(this, 0, -40, '🏆', 48, UI.ink);
      card.add(trophy);
      this.tweens.add({ targets: trophy, y: trophy.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      card.add(
        label(this, 0, 30, 'No legends yet!\nWin the rumble or reach 25 belief to be immortalized!', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
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
    levelBadge(this, x + cardWidth / 2 - 34, top + 34, levelOf(legend), 0.56).setDepth(4);

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
    label(this, x, artY + 176, `by u/${legend.artist} · 💛 ${legend.belief}`, 20, UI.inkSoft, true).setDepth(3);

    // "View + Believe" opens the shared modal (believe lives inside it).
    ghostButton(this, x, y + cardHeight / 2 - 44, '💛 View', () => this.openDetail(legend), 200).setDepth(3);
  }

  // Open the reusable detail modal for a scribbit. Legends/faded are never the
  // caller's live roster, so mine=false → Believe is offered inside the modal.
  private openDetail(scribbit: Scribbit): void {
    const arena = getArena(this);
    const mine = arena?.myUsername === scribbit.artist;
    openDetailModal(this, scribbit, {
      currentDay: arena?.dayNumber ?? scribbit.expiresDay,
      mine,
      actions: mine ? {} : { canBelieve: this.loggedIn },
      onRemoved: () => void this.loadGallery(),
      onReported: () => void this.loadGallery(),
    });
  }

  // --- Sketchbook (faded) ---------------------------------------------------
  private buildSketchbook(top: number): void {
    const { width } = this.scale;
    const faded = this.galleryData?.myFaded ?? [];
    if (faded.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, { tilt: 0.5 });
      const book = label(this, 0, -40, '📖', 48, UI.ink);
      card.add(book);
      this.tweens.add({ targets: book, angle: { from: -3, to: 3 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      card.add(
        label(this, 0, 30, 'Your sketchbook awaits...\nScribbits that fade will rest here as memories.', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
      );
      return;
    }
    const visibleRows = Math.max(1, Math.floor((this.scale.height - NAV_SAFE - top - 160) / 200) + 1);
    const totalPages = Math.ceil(faded.length / visibleRows);
    this.fadedPage = Math.min(this.fadedPage, totalPages - 1);
    this.buildPageControls(
      totalPages,
      top - 80,
      this.fadedPage,
      (page) => {
        this.fadedPage = page;
      }
    );
    const start = this.fadedPage * visibleRows;
    faded.slice(start, start + visibleRows).forEach((scribbit, index) => {
      const y = top + 80 + index * 200;
      this.buildFadedRow(scribbit, y);
    });
  }

  private buildFadedRow(scribbit: Scribbit, y: number): void {
    const { width } = this.scale;
    // Faded drawing on the left, eulogy on the right.
    paperCard(this, 130, y, 160, 160);
    const generation = this.buildGeneration;
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(this.add.image(130, y, key), 130).setAlpha(0.65).setDepth(2);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.openDetail(scribbit));
    });
    label(this, 240, y - 50, scribbit.name, TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    elementBadge(this, 300, y - 8, scribbit.element, 0.7).setPosition(300, y - 8);
    const eulogy = label(
      this,
      240,
      y + 44,
      `Fought bravely. ${recordText(scribbit)}. Faded Day ${scribbit.expiresDay}.`,
      TYPE.body,
      UI.inkSoft,
      false
    ).setOrigin(0, 0.5);
    eulogy.setWordWrapWidth(width - 280);
  }

  // --- Actions --------------------------------------------------------------
  private showError(message: string, retry = (): void => {
    void this.loadGallery();
  }): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      retry();
    });
  }
}
