import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { submitScribbit, fetchArena, spar } from '../lib/api';
import { getArena, setArena, setReplay } from '../lib/registry';
import { analyze, MIN_INK_PIXELS } from '../lib/analyzer';
import type { AnalyzerResult } from '../lib/analyzer';
import { DomOverlay } from '../lib/overlay';
import { DrawCanvas } from '../lib/drawcanvas';
import {
  ELEMENT_STYLES,
  EDGE,
  FONT_STACK,
  prefersReducedMotion,
  TYPE,
  UI,
} from '../lib/theme';
import { paperBackdrop } from '../lib/art';
import { LivingPaper } from '../lib/livingpaper';
import { StickerAttach } from '../lib/stickerdrawer';
import { fetchInventory } from '../lib/api';
import { drawAccessoryCanvas } from '../lib/accessories';
import type { AttachedAccessory } from '../../shared/arena';
import {
  button,
  ghostButton,
  label,
  handLettered,
  statGrid,
  elementBadge,
  stickerCard,
  errorPanel,
  floatReward,
  fadeToScene,
} from '../lib/ui';
import type { StatGrid, ErrorPanel } from '../lib/ui';
import { openCapsuleMachine } from '../lib/capsulemachine';
import { pullCapsule } from '../lib/api';
import { PEN_CATALOG, PEN_BY_ID, penSwatchColor, RARITY_STYLE } from '../lib/pens';
import type { PenCatalogEntry } from '../lib/pens';
import {
  CAPSULE_FIRST_DAILY_COST,
  INK_REWARDS,
} from '../../shared/arena';
import type { ArenaState, Element, Scribbit } from '../../shared/arena';
import { getDrawEligibility } from '../lib/draweligibility';
import { showVsCeremony } from '../lib/battleceremony';
import { LiveSprite } from '../lib/livesprite';

// Five large, thumb-friendly color groups. Re-tapping a two-tone group cycles
// its shade, preserving the full eight-color palette without eight tiny hits.
const PALETTE_GROUPS: { label: string; colors: string[] }[] = [
  { label: 'ink', colors: ['#2b2016'] },
  { label: 'ember', colors: ['#ff5a3d', '#ff9a3d'] },
  { label: 'tide', colors: ['#3ba0e0', '#7fd8e6'] },
  { label: 'moss', colors: ['#4faa4f'] },
  { label: 'storm', colors: ['#8a5cd8', '#f2cf3d'] },
];

const MIN_LINE_WIDTH = 8;
const MAX_LINE_WIDTH = 56;
const LINE_WIDTH_STEP = 4;
const DEFAULT_LINE_WIDTH = 24;
const PEN_SHORT_LABEL: Record<string, string> = {
  'warm-greys': 'Greys',
  'pastel-set': 'Pastel',
  'autumn-set': 'Autumn',
  'ocean-set': 'Ocean',
  'gold-pen': 'Gold',
  'neon-set': 'Neon',
  'midnight-ink': 'Night',
  'rainbow-crayon': 'Rainbow',
};

// Playful reactive copy keyed by the currently-dominant stat.
const REACTIONS: Record<string, string[]> = {
  chonk: ['An absolute UNIT 🫓', 'Big beefy boy 🍞', 'Chonky and proud 🫧'],
  spike: ['Getting SPIKY 🌵', 'Absolutely stabby 🗡️', 'Ouch, pointy! 📌'],
  zip: ['Zoomy little guy 💨', 'Gotta go fast 🏃', 'Blink and miss it ⚡'],
  charm: ['So charming ✨', 'Dazzling colors 🌈', 'Crit machine 💥'],
};

export class Draw extends Scene {
  private overlay!: DomOverlay;
  private canvas!: DrawCanvas;
  private nameInput!: HTMLInputElement;

  private bars!: StatGrid;
  private elementBadgeRef: Phaser.GameObjects.Container | null = null;
  private statCard: Phaser.GameObjects.Container | null = null;
  private badgeLocalY = 0;
  private reactionText!: Phaser.GameObjects.Text;
  private currentElement: Element = 'ember';
  private lastResult: AnalyzerResult | null = null;
  private colorSwatches: Phaser.GameObjects.Rectangle[] = [];
  private penSwatches: { rect: Phaser.GameObjects.Rectangle; penId: string }[] = [];
  private pensRow: Phaser.GameObjects.Container | null = null;
  private pensRowY = 0;
  private lineWidth = DEFAULT_LINE_WIDTH;
  private lineWidthPreviewDot: Phaser.GameObjects.Arc | null = null;

  private resizeHandler = (): void => this.overlay?.sync();
  private visualViewportResizeHandler = (): void => this.overlay?.sync();
  private submitting = false;
  private errorPanelRef: ErrorPanel | null = null;
  private livingPaper: LivingPaper | null = null;
  private stickers: StickerAttach | null = null;
  private stickerButtonLabel: Phaser.GameObjects.Text | null = null;
  private drawerOpen = false;
  private previewTimer: Phaser.Time.TimerEvent | null = null;
  private startFightAfterBirth = false;
  private birthContinuationStarted = false;

  constructor() {
    super('Draw');
  }

  init(): void {
    this.elementBadgeRef = null;
    this.lastResult = null;
    this.colorSwatches = [];
    this.penSwatches = [];
    this.lineWidth = DEFAULT_LINE_WIDTH;
    this.lineWidthPreviewDot = null;
    this.submitting = false;
    this.errorPanelRef = null;
    this.currentElement = 'ember';
    this.livingPaper = null;
    this.stickers = null;
    this.stickerButtonLabel = null;
    this.drawerOpen = false;
    this.previewTimer = null;
    this.startFightAfterBirth = false;
    this.birthContinuationStarted = false;
  }

  create(): void {
    // Defensive: clear any overlay a previous Draw visit might have left behind.
    DomOverlay.destroyAll();

    const arena = getArena(this);
    const eligibility = getDrawEligibility(arena);
    if (!arena) {
      this.scene.start('Preloader');
      return;
    }
    if (!eligibility.canDraw) {
      showToast(eligibility.message);
      this.scene.start('ArenaHome');
      return;
    }

    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    // Calm living page (no forecast field / edge creatures) so it moves gently
    // without distracting from the drawing surface.
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    this.buildChrome();
    this.buildOverlay();
    this.setupStickers();
    this.refreshPreview();

    window.addEventListener('resize', this.resizeHandler);
    window.visualViewport?.addEventListener(
      'resize',
      this.visualViewportResizeHandler
    );
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
  }

  private cleanup(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.visualViewport?.removeEventListener(
      'resize',
      this.visualViewportResizeHandler
    );
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.canvas?.destroy();
    this.overlay?.destroy();
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.stickers?.destroy();
    this.stickers = null;
  }

  // The live 512-canvas rect in design space (the DOM canvas sits here). Stickers
  // are placed in this rect and mapped into 512-canvas coords at submit.
  private canvasRect(): { x: number; y: number; width: number; height: number } {
    const square = Draw.CANVAS_SQUARE;
    return {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    };
  }

  // Load the owned-accessory inventory, then wire the sticker drawer. Fetched
  // async so the drawing UI never blocks; the ✨ button reflects owned copies.
  private setupStickers(): void {
    void this.refreshStickerInventory();
  }

  private async refreshStickerInventory(): Promise<void> {
    const result = await fetchInventory();
    if (!this.scene.isActive() || this.submitting) return;

    const items = result.ok ? result.data.items : {};

    if (this.stickers) {
      this.stickers.updateInventory(items);
      this.updateStickerButton();
      return;
    }

    this.stickers = new StickerAttach(this, {
      items,
      canvasRect: this.canvasRect(),
      onChange: () => this.updateStickerButton(),
    });
    this.updateStickerButton();
  }
  private updateStickerButton(): void {
    const count = this.stickers?.count ?? 0;
    this.stickerButtonLabel?.setText(count > 0 ? `✨ ${count}/2` : '✨');
  }

  private toggleStickerDrawer(): void {
    if (!this.stickers) return;
    if (!this.stickers.hasAnyOwned()) {
      showToast('Win accessories from the capsule machine to sticker your scribbit! 🎰');
      return;
    }
    this.drawerOpen = !this.drawerOpen;
    if (this.drawerOpen) this.stickers.openDrawer(Draw.CANVAS_CENTER_Y + Draw.CANVAS_SQUARE / 2 + 96);
    else this.stickers.closeDrawer();
  }

  // Every exit from Draw routes through here so the DOM overlay is torn down
  // synchronously — we never depend on shutdown-event timing to remove it.
  private exitTo(sceneKey: string): void {
    this.cleanup();
    DomOverlay.destroyAll();
    fadeToScene(this, sceneKey);
  }

  // --- Layout budget (720x1280 design space) --------------------------------
  // Canvas is the hero. Everything below stacks on a strict grid so nothing
  // overlaps or clips: canvas → tools → stat panel → name → submit.
  private static readonly CANVAS_CENTER_Y = 372;
  private static readonly CANVAS_SQUARE = 480; // big hero canvas
  private static readonly TOOLS_Y = 720; // colors + pens + brush/edit band
  private static readonly STAT_Y = 936; // stat panel center
  private static readonly NAME_Y = 1104;
  private static readonly SUBMIT_Y = 1212;

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    // Top bar: Back on the left, title centered in the remaining space so the
    // two never collide (the mission's header-clip bug).
    ghostButton(this, 90, 60, '‹', () => this.exitTo('ArenaHome'), 96);
    handLettered(this, width / 2 + 30, 56, "TODAY'S SCRIBBIT", 34, UI.ink, true);
    label(
      this,
      width / 2 + 30,
      92,
      'FILLED→HP · JAGGED→ATK\nCOMPACT→SPD · MORE COLORS→CRIT',
      20,
      UI.inkSoft,
      true
    ).setLineSpacing(2);

    // Hero canvas frame — the DOM canvas sits on top of this at the same rect.
    const square = Draw.CANVAS_SQUARE;
    const frame = this.add.graphics();
    const left = width / 2 - square / 2 - 8;
    const top = Draw.CANVAS_CENTER_Y - square / 2 - 8;
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRoundedRect(left, top, square + 16, square + 16, 16);
    frame.lineStyle(6, UI.goldHex, 1);
    frame.strokeRoundedRect(left, top, square + 16, square + 16, 16);
    frame.lineStyle(3, UI.inkHex, 0.7);
    frame.strokeRoundedRect(left + 6, top + 6, square + 4, square + 4, 12);

    this.buildToolsBand(Draw.TOOLS_Y);
    this.buildStatPanel(Draw.STAT_Y);
    button(this, width / 2, Draw.SUBMIT_Y, "🎉 IT'S ALIVE — Submit", () => this.trySubmit(), width - EDGE * 2);
  }

  // Three clean lines: base color swatches, Mystery Ink pens (unlocked +
  // ghosted locked slots), then line width + edit tools.
  private buildToolsBand(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 196;
    const panelTop = centerY - panelH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(UI.creamHex, 0.94);
    panel.fillRoundedRect(EDGE, panelTop, panelW, panelH, 16);
    panel.lineStyle(3, UI.inkHex, 0.72);
    panel.strokeRoundedRect(EDGE, panelTop, panelW, panelH, 16);

    const colorY = centerY - 64;
    const penY = centerY - 2;
    const toolY = centerY + 60;

    // Large grouped swatches, evenly distributed across the full width.
    const count = PALETTE_GROUPS.length;
    const labelW = 74;
    label(this, EDGE + labelW / 2, colorY, 'Color', TYPE.caption, UI.inkSoft, true);
    const startX = EDGE + labelW + 8;
    const gap = (width - startX - EDGE) / count;
    PALETTE_GROUPS.forEach((entry, index) => {
      const x = startX + gap * (index + 0.5);
      const swatch = this.add
        .rectangle(x, colorY, Math.min(100, gap - 10), 72, UI.creamHex, 1)
        .setStrokeStyle(4, UI.inkHex, 1);
      const visualWidth = entry.colors.length === 1 ? 54 : 38;
      entry.colors.forEach((color, colorIndex) => {
        const colorX = entry.colors.length === 1
          ? x
          : x + (colorIndex === 0 ? -20 : 20);
        this.add
          .rectangle(
            colorX,
            colorY,
            visualWidth,
            42,
            Phaser.Display.Color.HexStringToColor(color).color,
            1
          )
          .setStrokeStyle(2, UI.inkHex, 0.8);
      });
      const hit = this.add
        .rectangle(x, colorY, Math.min(104, gap - 6), 88, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      let nextShadeIndex = 0;
      hit.on('pointerup', () => {
        const color = entry.colors[nextShadeIndex % entry.colors.length];
        nextShadeIndex += 1;
        this.selectColor(index, color ?? '#2b2016');
      });
      this.colorSwatches.push(swatch);
    });
    this.selectColor(0, PALETTE_GROUPS[0]?.colors[0] ?? '#2b2016');

    this.buildPensRow(penY);

    this.buildLineWidthControls(toolY);
    this.setLineWidth(DEFAULT_LINE_WIDTH);

    // Stickers toggle (center): opens the accessory drawer. Its label shows the
    // placed count (e.g. "✨ 1/2") once accessories are attached.
    const hasExistingScribbit = (this.getArenaState()?.myScribbits.length ?? 0) > 0;
    if (hasExistingScribbit) {
      const stickerBtn = this.toolIconButton(
        width / 2 + 6,
        toolY,
        '✨',
        () => this.toggleStickerDrawer(),
        70
      );
      this.stickerButtonLabel = stickerBtn.list[1] as Phaser.GameObjects.Text;
    }

    // Edit tools (right group): erase / undo / clear.
    this.toolIconButton(width - 255, toolY, '🧽', () => this.canvas?.setEraser());
    this.toolIconButton(width - 160, toolY, '↩', () => this.canvas?.undo());
    this.toolIconButton(width - 65, toolY, '🗑', () => this.confirmClear());
  }

  private toolIconButton(
    x: number,
    y: number,
    icon: string,
    onClick: () => void,
    width = 70
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, width, 70, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    const glyph = label(this, 0, 0, icon, 26, UI.ink, true);
    const hit = this.add
      .rectangle(0, 0, Math.max(width, 88), 88, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add([bg, glyph, hit]);
    const press = (): void => {
      this.tweens.add({ targets: container, scaleX: 0.9, scaleY: 0.88, duration: 60, ease: 'Quad.easeOut' });
    };
    const release = (): void => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Back.easeOut' });
    };
    hit.on('pointerdown', press);
    hit.on('pointerout', release);
    hit.on('pointerup', () => {
      release();
      onClick();
    });
    return container;
  }

  private buildLineWidthControls(y: number): void {
    this.toolIconButton(EDGE + 35, y, '−', () => this.adjustLineWidth(-LINE_WIDTH_STEP));

    const preview = this.add.container(EDGE + 125, y);
    const bg = this.add.rectangle(0, 0, 70, 70, UI.creamHex, 1).setStrokeStyle(4, UI.inkHex, 1);
    this.lineWidthPreviewDot = this.add.circle(0, 0, this.lineWidthPreviewRadius(), UI.inkHex, 1);
    preview.add([bg, this.lineWidthPreviewDot]);

    this.toolIconButton(EDGE + 215, y, '+', () => this.adjustLineWidth(LINE_WIDTH_STEP));
  }

  private adjustLineWidth(delta: number): void {
    this.setLineWidth(this.lineWidth + delta);
  }

  private setLineWidth(width: number): void {
    this.lineWidth = Phaser.Math.Clamp(width, MIN_LINE_WIDTH, MAX_LINE_WIDTH);
    this.canvas?.setBrushSize(this.lineWidth);
    this.lineWidthPreviewDot?.setRadius(this.lineWidthPreviewRadius());
  }

  private lineWidthPreviewRadius(): number {
    return Phaser.Math.Clamp(this.lineWidth / 2, 5, 23);
  }

  // Mystery Ink pens: every catalog pen shows as a swatch. Unlocked pens are
  // tappable (rainbow/midnight get special rendering in the canvas); locked pens
  // are ghosted with a 🔒 and deep-link to the capsule machine — visible
  // aspiration that drives the gacha loop.
  private buildPensRow(y: number): void {
    this.pensRowY = y;
    this.pensRow?.destroy(true);
    this.penSwatches = [];
    const container = this.add.container(0, 0);
    this.pensRow = container;

    const { width } = this.scale;
    const arena = this.getArenaState();
    const unlocked = new Set(arena?.myPens ?? []);
    const labelW = 74;
    container.add(label(this, EDGE + labelW / 2, y, 'Pens', TYPE.caption, UI.inkSoft, true));

    if ((arena?.myScribbits.length ?? 0) === 0) {
      container.add(
        label(
          this,
          width / 2 + 38,
          y,
          'Bonus pens unlock after your first fight',
          22,
          UI.inkSoft,
          true
        )
      );
      return;
    }

    const startX = EDGE + labelW + 8;
    const unlockedPens = PEN_CATALOG.filter((pen) => unlocked.has(pen.id));
    const machineW = 100;
    const cellCount = Math.max(1, unlockedPens.length);
    const avail = width - startX - EDGE - machineW - 12;
    const gap = avail / cellCount;
    unlockedPens.forEach((pen, index) => {
      const x = startX + gap * (index + 0.5);
      const rarityColor = RARITY_STYLE[pen.rarity].color;
      const chipW = Math.min(104, Math.max(82, gap - 10));
      const chip = this.add
        .rectangle(x, y, chipW, 44, UI.creamHex, 1)
        .setStrokeStyle(3, rarityColor, 1)
        .setInteractive({ useHandCursor: true });
      container.add(chip);

      // Rainbow gets a multi-hue swatch backing so it reads as special.
      if (pen.effect === 'rainbow') {
        this.rainbowHint(container, x - chipW / 2 + 26, y);
      }
      const swatchX = x - chipW / 2 + 24;
      const swatch = this.add
        .rectangle(swatchX, y, 26, 26, Phaser.Display.Color.HexStringToColor(penSwatchColor(pen)).color, 1)
        .setStrokeStyle(2, UI.inkHex, 1);
      const penName = label(this, swatchX + 22, y, this.shortPenLabel(pen), 15, UI.ink, true).setOrigin(0, 0.5);
      penName.setWordWrapWidth(chipW - 52);
      container.add([swatch, penName]);

      chip.on('pointerup', () => this.selectPen(index, pen));
      swatch.setInteractive({ useHandCursor: true }).on('pointerup', () => this.selectPen(index, pen));
      penName.setInteractive({ useHandCursor: true }).on('pointerup', () => this.selectPen(index, pen));
      this.penSwatches.push({ rect: chip, penId: pen.id });
    });

    const machineX = width - EDGE - machineW / 2;
    const machine = this.add
      .rectangle(machineX, y, machineW, 48, UI.gold, 1)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    const machineLabel = label(this, machineX, y, 'Capsule', 22, UI.ink, true);
    container.add([machine, machineLabel]);
    machine.on('pointerup', () => this.openCapsuleFromDraw());
  }

  private shortPenLabel(pen: PenCatalogEntry): string {
    return PEN_SHORT_LABEL[pen.id] ?? pen.name.split(/\s+/)[0] ?? pen.name;
  }

  // A small rainbow flourish behind the rainbow pen swatch.
  private rainbowHint(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const hues = [0xff5a3d, 0xf2cf3d, 0x4faa4f, 0x3ba0e0, 0x8a5cd8];
    hues.forEach((hue, index) => {
      container.add(this.add.rectangle(x - 20 + index * 10, y, 8, 44, hue, 0.9));
    });
  }

  // The current arena snapshot (myPens/myInk live here).
  private getArenaState(): ArenaState | undefined {
    return getArena(this);
  }

  // After a capsule pull closes, re-fetch arena so a freshly-unlocked pen shows
  // up as a live swatch (no scene restart, canvas drawing preserved).
  private async refreshDrawingToolsAfterPull(): Promise<void> {
    const [arenaResult] = await Promise.all([
      fetchArena(),
      this.refreshStickerInventory(),
    ]);
    if (arenaResult.ok) setArena(this, arenaResult.data);
    if (this.scene.isActive()) this.buildPensRow(this.pensRowY);
  }

  private selectPen(index: number, pen: PenCatalogEntry): void {
    this.canvas?.setPen(pen.effect, pen.colors);
    // Deselect base swatches with smooth tween.
    this.colorSwatches.forEach((swatch) => {
      swatch.setStrokeStyle(4, UI.inkHex, 1);
      this.tweens.add({ targets: swatch, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
    });
    // Highlight the chosen pen with smooth tween.
    this.penSwatches.forEach(({ rect, penId }) => {
      const chosen = penId === pen.id;
      const entry = PEN_BY_ID.get(penId);
      const rarityColor = entry ? RARITY_STYLE[entry.rarity].color : UI.inkHex;
      rect.setStrokeStyle(chosen ? 6 : 3, chosen ? UI.goldHex : rarityColor, 1);
      this.tweens.add({
        targets: rect,
        scaleX: chosen ? 1.18 : 1,
        scaleY: chosen ? 1.18 : 1,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });
    void index;
  }

  private openCapsuleFromDraw(): void {
    this.drawerOpen = false;
    this.stickers?.closeDrawer();
    this.stickers?.hideOverlays();
    this.overlay.setVisible(false);
    openCapsuleMachine(this, {
      ink: this.getArenaState()?.myInk ?? 0,
      nextCost:
        this.getArenaState()?.nextCapsuleCost ?? CAPSULE_FIRST_DAILY_COST,
      onPull: async (operationId) => {
        const result = await pullCapsule(operationId);
        if (!result.ok) return { error: result.error };
        return result.data;
      },
      // Rebuild the pens row so a freshly unlocked pen appears immediately.
      onClose: () => {
        if (!this.scene.isActive() || this.submitting) return;
        this.overlay.setVisible(true);
        this.stickers?.showOverlays();
        void this.refreshDrawingToolsAfterPull();
      },
    });
  }

  private selectColor(index: number, color: string): void {
    this.canvas?.setColor(color);
    this.colorSwatches.forEach((swatch, swatchIndex) => {
      const selected = swatchIndex === index;
      swatch.setStrokeStyle(selected ? 6 : 4, selected ? UI.goldHex : UI.inkHex, 1);
      // Smooth tween to the selected/unselected scale for a polished feel.
      this.tweens.add({
        targets: swatch,
        scaleX: selected ? 1.18 : 1,
        scaleY: selected ? 1.18 : 1,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });
    // Deselect any active pen highlight.
    this.penSwatches.forEach(({ rect, penId }) => {
      const pen = PEN_BY_ID.get(penId);
      rect.setStrokeStyle(3, pen ? RARITY_STYLE[pen.rarity].color : UI.inkHex, 1);
      this.tweens.add({ targets: rect, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
    });
  }

  private confirmClear(): void {
    this.canvas?.clear();
    showToast('Fresh page ✏️');
  }

  // Compact stat card: reaction + element badge on the top row, a 2x2 stat grid
  // below. Sized so the grid can NEVER clip the panel edge.
  private buildStatPanel(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 210;
    const card = stickerCard(this, width / 2, centerY, panelW, panelH, { tape: false });

    this.statCard = card;
    this.badgeLocalY = -panelH / 2 + 70;
    this.reactionText = label(this, 0, -panelH / 2 + 30, 'Start drawing!', TYPE.body, UI.ink, true);
    card.add(this.reactionText);
    this.elementBadgeRef = elementBadge(this, 0, this.badgeLocalY, this.currentElement, 0.74);
    card.add(this.elementBadgeRef);

    this.bars = statGrid(this, width / 2, centerY + 44, panelW - 48, 116);
  }

  // --- DOM overlay (live canvas + name input) -------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({ onStrokeEnd: () => this.schedulePreview() });
    this.canvas.setBrushSize(this.lineWidth);
    const square = Draw.CANVAS_SQUARE;
    this.overlay.place(this.canvas.element, {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    });

    // Name input overlaid near the submit row.
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = 24;
    this.nameInput.placeholder = 'Name your scribbit…';
    this.nameInput.autocomplete = 'off';
    this.nameInput.autocapitalize = 'words';
    this.nameInput.enterKeyHint = 'done';
    this.nameInput.setAttribute('aria-label', 'Name your Scribbit');
    this.nameInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      this.nameInput.blur();
      this.trySubmit();
    });
    Object.assign(this.nameInput.style, {
      fontFamily: FONT_STACK,
      fontSize: '26px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#2b2016',
      background: '#fff7e8',
      border: '4px solid #2b2016',
      borderRadius: '14px',
      outline: 'none',
    });
    // Distinct row above the submit button — NAME_Y is its center; a 68px-tall
    // field spans 1076..1144, well clear of the 96px submit button (1170..1266).
    const nameH = 68;
    this.overlay.place(this.nameInput, {
      x: EDGE,
      y: Draw.NAME_Y - nameH / 2,
      width: this.scale.width - EDGE * 2,
      height: nameH,
    });
  }

  // --- Live analyzer preview ------------------------------------------------
  // Debounced: waits 80ms after the last stroke before running the analyzer,
  // so rapid drawing doesn't thrash the pixel scanner on every stroke end.
  private schedulePreview(): void {
    if (this.previewTimer) {
      this.previewTimer.remove();
    }
    this.previewTimer = this.time.delayedCall(80, () => {
      this.previewTimer = null;
      this.refreshPreview();
    });
  }

  private refreshPreview(): void {
    if (!this.canvas) return;
    const imageData = this.canvas.getImageData();
    const result = analyze({
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    });
    this.lastResult = result;
    this.bars.setStats(result.stats, true);
    this.updateElementBadge(result.element);
    this.updateReaction(result);
  }

  private updateElementBadge(element: Element): void {
    if (element === this.currentElement && this.elementBadgeRef) return;
    this.currentElement = element;
    this.elementBadgeRef?.destroy();
    // Re-add inside the stat card at the same local slot so it stays framed.
    this.elementBadgeRef = elementBadge(this, 0, this.badgeLocalY, element, 0.74);
    this.statCard?.add(this.elementBadgeRef);
    // Morph pop.
    this.elementBadgeRef.setScale(0.55);
    this.tweens.add({ targets: this.elementBadgeRef, scale: 0.74, duration: 260, ease: 'Back.easeOut' });
  }

  private updateReaction(result: AnalyzerResult): void {
    if (result.inkedPixels < MIN_INK_PIXELS) {
      this.reactionText.setText('Draw something! ✏️');
      this.reactionText.setColor(UI.inkSoft);
      return;
    }
    const dominant = (['chonk', 'spike', 'zip', 'charm'] as const).reduce((best, key) =>
      result.stats[key] > result.stats[best] ? key : best
    );
    const options = REACTIONS[dominant] ?? ['Looking good!'];
    // Deterministic pick by inked pixel count so it doesn't flicker every stroke.
    const pick = options[result.inkedPixels % options.length] ?? options[0] ?? '';
    if (this.reactionText.text !== pick) {
      this.reactionText.setText(pick);
      this.reactionText.setColor(ELEMENT_STYLES[result.element].primaryText);
      this.tweens.add({ targets: this.reactionText, scale: 1.12, duration: 160, yoyo: true });
    }
  }

  // --- Submit + ceremony ----------------------------------------------------
  private trySubmit(): void {
    if (this.submitting) return;
    const result = this.lastResult;
    if (!result || result.inkedPixels < MIN_INK_PIXELS) {
      showToast('Your scribbit needs a body! Draw a bit more ✏️');
      this.cameras.main.shake(220, 0.006);
      return;
    }
    const name = this.nameInput.value.trim();
    if (name.length < 2) {
      showToast('Give your scribbit a name (2+ letters) 🏷️');
      this.nameInput.focus();
      return;
    }

    this.submitting = true;
    // Hide the draggable stickers + drawer so only the baked PNG shows in the
    // ceremony; the metadata is captured first from their current transforms.
    const accessories = this.stickers?.toAttachedAccessories() ?? [];
    this.stickers?.hideOverlays();
    this.overlay.setVisible(false);
    void this.submit(name, result, accessories);
  }

  private async submit(
    name: string,
    result: AnalyzerResult,
    accessories: AttachedAccessory[]
  ): Promise<void> {
    // Bake each attached accessory into the 512 PNG at its canvas-space
    // transform, then send the metadata so the server consumes the copies.
    const dataUrl = this.canvas.toDataUrl((ctx) => {
      accessories.forEach((accessory) => {
        // The AttachedAccessory scale is canvas-px-per-unit-box relative to the
        // on-screen 120px box; convert back to a canvas-px box edge for the bake.
        const bakeSize = 120 * accessory.scale;
        drawAccessoryCanvas(ctx, accessory.id, accessory.x, accessory.y, bakeSize, accessory.rotation);
      });
    });
    const response = await submitScribbit({
      name,
      imageDataUrl: dataUrl,
      stats: result.stats,
      element: result.element,
      ...(accessories.length > 0 ? { accessories } : {}),
    });
    if (!response.ok) {
      this.submitting = false;
      // A client timeout does not prove the server failed. Reconcile before
      // inviting a second submit, which could otherwise look like a lost
      // drawing after the first request actually committed.
      const reconciledArena = await fetchArena();
      if (reconciledArena.ok && reconciledArena.data.drawnToday) {
        setArena(this, reconciledArena.data);
        showToast('Your Scribbit made it into the Rumble — the reply arrived late.');
        this.exitTo('ArenaHome');
        return;
      }
      this.showError(response.error);
      return;
    }
    // Optimistically refresh arena's drawnToday via a light re-fetch on wake;
    // for now update local snapshot so ArenaHome reflects the new roster.
    const arena = getArena(this);
    if (arena) {
      this.startFightAfterBirth = arena.myScribbits.length === 0;
      const todayEntrants = arena.todayEntrants.some(
        (entrant) => entrant.id === response.data.id
      )
        ? arena.todayEntrants
        : [response.data, ...arena.todayEntrants];
      setArena(this, {
        ...arena,
        drawnToday: true,
        enteredToday: true,
        rumbleEntrants: todayEntrants.length,
        todayEntrants,
        myInk: (arena.myInk ?? 0) + INK_REWARDS.dailyDraw,
        myScribbits: [response.data, ...arena.myScribbits].slice(0, 3),
      });
    }
    this.playCeremony(response.data, dataUrl);
  }

  // "IT'S ALIVE" ceremony: the drawing rises with its final card, then home.
  // Enhanced with egg-hatching effect for dramatic birth moment.
  private playCeremony(scribbit: Scribbit, dataUrl: string): void {
    const { width, height } = this.scale;
    // The living page owned timers/emitters; tear it down before the ceremony
    // takes over the screen so nothing keeps ticking behind the reveal.
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.stickers?.destroy();
    this.stickers = null;
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(UI.desk);
    paperBackdrop(this);

    const style = ELEMENT_STYLES[scribbit.element];
    this.add.rectangle(0, 0, width, height, style.primary, 0.1).setOrigin(0).setDepth(-90);

    // Egg hatching effect - an ink blob that cracks and bursts
    const egg = this.add.graphics().setDepth(50);
    const eggX = width / 2;
    const eggY = height / 2;
    const eggSize = 180;

    // Draw the egg (ink blob)
    egg.fillStyle(0x2b2016, 1);
    egg.fillEllipse(eggX, eggY, eggSize, eggSize * 1.2);
    egg.lineStyle(8, UI.inkHex, 1);
    egg.strokeEllipse(eggX, eggY, eggSize, eggSize * 1.2);

    // Egg wobble animation
    this.tweens.add({
      targets: egg,
      angle: { from: -5, to: 5 },
      duration: 200,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Egg cracks and bursts
        this.cameras.main.shake(300, 0.015);

        // Crack lines
        const cracks = this.add.graphics().setDepth(51);
        cracks.lineStyle(6, UI.creamHex, 1);
        cracks.beginPath();
        cracks.moveTo(eggX - 30, eggY - 40);
        cracks.lineTo(eggX, eggY);
        cracks.lineTo(eggX + 20, eggY + 30);
        cracks.strokePath();
        cracks.beginPath();
        cracks.moveTo(eggX + 40, eggY - 20);
        cracks.lineTo(eggX + 10, eggY + 10);
        cracks.lineTo(eggX - 10, eggY + 50);
        cracks.strokePath();

        // Burst particles
        const burstEmitter = this.add.particles(eggX, eggY, 'dot', {
          speed: { min: 200, max: 500 },
          scale: { start: 0.8, end: 0 },
          lifespan: 800,
          quantity: 1,
          tint: 0x2b2016,
          emitting: false,
        });
        burstEmitter.explode(30);
        this.time.delayedCall(900, () => burstEmitter.destroy());

        // Fade out egg
        this.tweens.add({
          targets: egg,
          alpha: 0,
          scale: 1.5,
          duration: 300,
          onComplete: () => {
            egg.destroy();
            cracks.destroy();
            // Now show the actual ceremony
            this.showBirthReveal(scribbit, dataUrl);
          },
        });
      },
    });
  }

  private showBirthReveal(scribbit: Scribbit, dataUrl: string): void {
    const { width, height } = this.scale;
    const style = ELEMENT_STYLES[scribbit.element];

    const title = handLettered(this, width / 2, 180, "IT'S ALIVE!", 62, UI.goldText, true).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });
    this.cameras.main.shake(200, 0.008);

    // Drawing today's scribbit earns Mystery Ink — float the reward.
    floatReward(this, width - 120, 360, `+${INK_REWARDS.dailyDraw} 🫙`, UI.goldText, 60);

    // Load the just-drawn PNG straight from the data URL for an instant reveal.
    const key = `ceremony-${scribbit.id}`;
    const image = new Image();
    image.onload = () => {
      if (!this.scene.isActive()) return;
      if (!this.textures.exists(key)) this.textures.addImage(key, image);
      this.revealCard(scribbit, key);
    };
    image.src = dataUrl;

    // Confetti-ish sparkle burst.
    const emitter = this.add.particles(width / 2, height / 2, 'spark', {
      speed: { min: 120, max: 340 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1200,
      quantity: 30,
      tint: [style.particle, UI.gold],
      emitting: false,
    });
    emitter.explode(40);
    this.time.delayedCall(1300, () => emitter.destroy());

  }

  private revealCard(scribbit: Scribbit, textureKey: string): void {
    const { width, height } = this.scale;
    const cardW = 420;
    const cardH = 560;
    const cardY = height / 2 + 20;
    const card = stickerCard(this, width / 2, cardY, cardW, cardH, { gold: true, tapeColor: UI.tape });
    card.setScale(0);

    const artY = cardY - cardH / 2 + 165;
    const newborn = new LiveSprite(this, width / 2, artY, textureKey, {
      displaySize: 270,
      stats: scribbit.stats,
      depth: 10,
      reduceMotion: prefersReducedMotion(),
    });
    const powerLabel = label(
      this,
      width / 2,
      cardY + 32,
      `SHAPE POWER: ${newborn.shapePower}`,
      TYPE.caption,
      UI.coralText,
      true
    ).setAlpha(0).setDepth(10);
    const nameLabel = label(this, width / 2, cardY + 78, scribbit.name.toUpperCase(), TYPE.display * 0.66, UI.ink, true)
      .setAlpha(0)
      .setDepth(10);
    if (nameLabel.width > cardW - 70) nameLabel.setScale((cardW - 70) / nameLabel.width);
    const badge = elementBadge(this, width / 2, cardY + 126, scribbit.element, 0.85).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: card,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
    newborn.awaken();
    this.tweens.add({ targets: [powerLabel, nameLabel, badge], alpha: 1, delay: 400, duration: 400 });

    const grid = statGrid(this, width / 2, cardY + cardH / 2 - 62, cardW - 60, 118);
    grid.container.setAlpha(0).setDepth(10);
    grid.setStats(scribbit.stats, false);
    this.tweens.add({ targets: grid.container, alpha: 1, delay: 700, duration: 400 });

    ghostButton(
      this,
      width / 2,
      height - 80,
      this.startFightAfterBirth
        ? 'Watch safe exhibition spar →'
        : 'Continue →',
      () => this.continueAfterBirth(scribbit),
      420
    ).setDepth(10);
  }

  private continueAfterBirth(scribbit: Scribbit): void {
    if (this.birthContinuationStarted) return;
    this.birthContinuationStarted = true;

    if (!this.startFightAfterBirth) {
      this.exitTo('ArenaHome');
      return;
    }

    this.requestFirstFight(scribbit);
  }

  private requestFirstFight(scribbit: Scribbit): void {
    const { width, height } = this.scale;
    const statusCard = stickerCard(this, width / 2, height / 2, width - 160, 170, {
      tapeColor: UI.tapeAlt,
    }).setDepth(200);
    statusCard.add(
      label(this, 0, -24, '⚔️ Finding an exhibition opponent…', TYPE.title, UI.ink, true)
    );
    statusCard.add(
      label(this, 0, 30, 'Your Scribbit is safe in tonight’s Rumble.', TYPE.caption, UI.inkSoft, true)
    );

    void spar(scribbit.id).then((result) => {
      if (!this.scene.isActive()) return;
      statusCard.destroy(true);
      if (!result.ok) {
        this.showFirstFightRetry(scribbit, result.error);
        return;
      }
      setReplay(this, result.data, 'ArenaHome');
      showVsCeremony(this, result.data.a, result.data.b, () => {
        this.scene.start('Replay');
      });
    });
  }

  private showFirstFightRetry(scribbit: Scribbit, message: string): void {
    const { width, height } = this.scale;
    const panel = stickerCard(this, width / 2, height / 2, width - 120, 300, {
      tapeColor: UI.tapeAlt,
    }).setDepth(210);
    panel.add(label(this, 0, -92, 'The opponent ran away', TYPE.title, UI.ink, true));
    const copy = label(this, 0, -35, message, TYPE.body, UI.inkSoft, true);
    copy.setWordWrapWidth(width - 220);
    panel.add(copy);

    const retry = button(
      this,
      width / 2,
      height / 2 + 54,
      '⚔️ Retry first fight',
      () => {
        panel.destroy(true);
        retry.destroy(true);
        continueButton.destroy(true);
        this.requestFirstFight(scribbit);
      },
      width - 220
    ).setDepth(220);
    const continueButton = ghostButton(
      this,
      width / 2,
      height / 2 + 135,
      'Continue to Arena',
      () => this.exitTo('ArenaHome'),
      width - 220
    ).setDepth(220);
  }

  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      this.overlay.setVisible(true);
      this.stickers?.showOverlays();
    });
  }
}
