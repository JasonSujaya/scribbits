import { Scene } from 'phaser';
import { fetchLegends } from '../lib/api';
import { getArena, getSketchbookTab, setSketchbookTab } from '../lib/registry';
import { loadDrawing, fitDrawing, recordText, levelOf } from '../lib/scribbits';
import { NAV_SAFE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import { label, ghostButton, handLettered, paperCard, stickerCard, elementBadge, levelBadge, errorPanel, appTabBar, fadeToScene } from '../lib/ui';
import { openCloutBoard } from '../lib/cloutboard';
import { openDetailModal } from '../lib/detailmodal';
import type { ErrorPanel } from '../lib/ui';
import type { LegendsState, Scribbit } from '../../shared/arena';

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

  constructor() {
    super('Sketchbook');
  }

  init(): void {
    this.galleryData = null;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.buildGeneration = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.tab = getSketchbookTab(this);
    this.loggedIn = getArena(this)?.loggedIn ?? false;
    void this.loadGallery();
  }

  private async loadGallery(): Promise<void> {
    const result = await fetchLegends();
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    this.galleryData = result.data;
    this.build();
  }

  private build(): void {
    this.buildGeneration += 1;
    this.children.removeAll(true);
    // Calm living page (no forecast field, no countdown) rebuilt each build.
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this);
    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'GALLERY', 40, UI.ink, true);
    this.buildTabs(150);
    this.buildAppTabs();

    if (this.tab === 'legends') this.buildLegends(230);
    else this.buildSketchbook(230);
  }

  private buildAppTabs(): void {
    appTabBar(this, 'gallery', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => fadeToScene(this, 'ArenaHome') },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => this.switchTab('legends') },
      { key: 'draw', icon: '✏️', label: 'Draw', onClick: () => fadeToScene(this, 'Draw') },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => fadeToScene(this, 'MyBattles') },
      { key: 'scout', icon: '🏅', label: 'Scout', onClick: () => openCloutBoard(this) },
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
    setSketchbookTab(this, tab);
    this.build();
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
      card.add(label(this, 0, -40, '🏆', 48, UI.ink));
      card.add(
        label(this, 0, 30, 'No legends yet.\nWin a crown or reach 25 belief to be enshrined!', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
      );
      return;
    }
    const columns = 2;
    const cellWidth = (width - 60) / columns;
    const cardHeight = 380;
    const visibleRows = Math.max(1, Math.floor((this.scale.height - NAV_SAFE - cardHeight / 2 - top - 210) / 410) + 1);
    legends.slice(0, columns * visibleRows).forEach((legend, index) => {
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
    const mine = arena?.myScribbits.some((one) => one.id === scribbit.id) ?? false;
    openDetailModal(this, scribbit, {
      currentDay: arena?.dayNumber ?? scribbit.expiresDay,
      mine,
      actions: mine ? {} : { canBelieve: this.loggedIn },
    });
  }

  // --- Sketchbook (faded) ---------------------------------------------------
  private buildSketchbook(top: number): void {
    const { width } = this.scale;
    const faded = this.galleryData?.myFaded ?? [];
    if (faded.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, { tilt: 0.5 });
      card.add(label(this, 0, -40, '📖', 48, UI.ink));
      card.add(
        label(this, 0, 30, 'Your sketchbook is empty.\nEvery scribbit that fades rests here.', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
      );
      return;
    }
    const visibleRows = Math.max(1, Math.floor((this.scale.height - NAV_SAFE - top - 160) / 200) + 1);
    faded.slice(0, visibleRows).forEach((scribbit, index) => {
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
  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      void this.loadGallery();
    });
  }
}
