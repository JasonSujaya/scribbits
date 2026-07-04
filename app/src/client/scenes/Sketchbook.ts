import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import { fetchLegends, believe } from '../lib/api';
import { getArena, getSketchbookTab, setSketchbookTab } from '../lib/registry';
import { loadDrawing, recordText } from '../lib/scribbits';
import { UI } from '../lib/theme';
import { label, ghostButton, paperCard, elementBadge, errorPanel } from '../lib/ui';
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

  constructor() {
    super('Sketchbook');
  }

  init(): void {
    this.galleryData = null;
    this.errorPanelRef = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#241b2e');
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
    this.children.removeAll(true);
    const { width } = this.scale;
    label(this, width / 2, 60, 'GALLERY', 40, UI.cream, true);
    ghostButton(this, 90, 60, '‹ Back', () => this.scene.start('ArenaHome'), 140);
    this.buildTabs(150);

    if (this.tab === 'legends') this.buildLegends(230);
    else this.buildSketchbook(230);
  }

  private buildTabs(y: number): void {
    const { width } = this.scale;
    const legendsTab = ghostButton(this, width / 2 - 160, y, '🏆 Legends', () => this.switchTab('legends'), 300);
    const sketchTab = ghostButton(this, width / 2 + 160, y, '📖 Sketchbook', () => this.switchTab('sketchbook'), 300);
    // Highlight the active tab.
    const active = this.tab === 'legends' ? legendsTab : sketchTab;
    const bg = active.list[0] as Phaser.GameObjects.Rectangle;
    bg.setFillStyle(UI.gold, 1);
  }

  private switchTab(tab: Tab): void {
    this.tab = tab;
    setSketchbookTab(this, tab);
    this.build();
  }

  // --- Legends hall ---------------------------------------------------------
  private buildLegends(top: number): void {
    const { width } = this.scale;
    const legends = this.galleryData?.legends ?? [];
    if (legends.length === 0) {
      label(this, width / 2, 600, 'No legends yet.\nWin a crown or reach 25 belief to be enshrined!', 26, '#c9b79a', true)
        .setLineSpacing(8);
      return;
    }
    const columns = 2;
    const cellWidth = (width - 60) / columns;
    legends.slice(0, 50).forEach((legend, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 30 + cellWidth * (col + 0.5);
      const y = top + 150 + row * 380;
      this.buildLegendCard(legend, x, y);
    });
  }

  private buildLegendCard(legend: Scribbit, x: number, y: number): void {
    const cardHeight = 340;
    paperCard(this, x, y, 300, cardHeight, true);
    void loadDrawing(this, legend).then((key) => {
      if (this.scene.isActive()) this.add.image(x, y - 60, key).setDisplaySize(180, 180).setDepth(2);
    });
    label(this, x, y + 52, legend.name.toUpperCase(), 26, UI.ink, true).setDepth(3);
    if (legend.legendTitle) {
      label(this, x, y + 82, legend.legendTitle, 17, UI.goldText, true).setDepth(3).setWordWrapWidth(270);
    }
    label(this, x, y + 108, `by u/${legend.artist} · 💛 ${legend.belief}`, 16, UI.inkSoft, true).setDepth(3);
    ghostButton(this, x, y + 156, '💛 Believe', () => this.believeOn(legend), 180).setDepth(3);
  }

  // --- Sketchbook (faded) ---------------------------------------------------
  private buildSketchbook(top: number): void {
    const { width } = this.scale;
    const faded = this.galleryData?.myFaded ?? [];
    if (faded.length === 0) {
      label(this, width / 2, 600, "Your sketchbook is empty.\nEvery scribbit that fades rests here.", 26, '#c9b79a', true)
        .setLineSpacing(8);
      return;
    }
    faded.slice(0, 30).forEach((scribbit, index) => {
      const y = top + 80 + index * 200;
      this.buildFadedRow(scribbit, y);
    });
  }

  private buildFadedRow(scribbit: Scribbit, y: number): void {
    const { width } = this.scale;
    // Faded drawing on the left, eulogy on the right.
    paperCard(this, 130, y, 160, 160);
    void loadDrawing(this, scribbit).then((key) => {
      if (this.scene.isActive()) {
        this.add.image(130, y, key).setDisplaySize(130, 130).setAlpha(0.65).setDepth(2);
      }
    });
    label(this, 240, y - 50, scribbit.name, 28, UI.cream, true).setOrigin(0, 0.5);
    elementBadge(this, 300, y - 8, scribbit.element, 0.7).setPosition(300, y - 8);
    const eulogy = label(
      this,
      240,
      y + 44,
      `Fought bravely. ${recordText(scribbit)}. Faded Day ${scribbit.expiresDay}.`,
      20,
      '#c9b79a',
      false
    ).setOrigin(0, 0.5);
    eulogy.setWordWrapWidth(width - 280);
  }

  // --- Actions --------------------------------------------------------------
  private believeOn(scribbit: Scribbit): void {
    if (!this.loggedIn) {
      showToast('Sign in to Reddit to believe!');
      showLoginPrompt();
      return;
    }
    void believe(scribbit.id).then((result) => {
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      showToast(`💛 You believe in ${scribbit.name}! (${result.data.belief})`);
      void this.loadGallery();
    });
  }

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
