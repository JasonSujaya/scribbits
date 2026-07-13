import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { practiceBattle, submitScribbit, fetchArena, spar } from '../lib/api';
import {
  getArena,
  endPracticeSession,
  getPracticeSession,
  recordPracticePower,
  setArena,
  setReplay,
  stageDirectBattle,
} from '../lib/registry';
import { analyze, hasMinimumDrawingInk, MIN_INK_PIXELS } from '../lib/analyzer';
import type { AnalyzerResult } from '../lib/analyzer';
import { CanvasActionOverlay, DomOverlay } from '../lib/overlay';
import { DrawCanvas } from '../lib/drawcanvas';
import {
  ELEMENT_STYLES,
  EDGE,
  DOM_TYPE,
  FONT_STACK,
  MIN_TOUCH,
  prefersReducedMotion,
  TYPE,
  UI,
} from '../lib/theme';
import { paperIcon, paperToolIcon } from '../lib/papericons';
import type { PaperToolIconKey } from '../lib/papericons';
import { paperBackdrop } from '../lib/art';
import { LivingPaper } from '../lib/livingpaper';
import { StickerAttach } from '../lib/stickerdrawer';
import { fetchInventory } from '../lib/api';
import { drawAccessoryCanvas } from '../lib/accessories';
import type { AttachedAccessory } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  getShapePowerDrawingCue,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';
import {
  DRAW_HEADER_TITLE,
  DRAW_RULES_COPY,
  planDrawFeedback,
} from '../lib/drawonboarding';
import {
  selectDailyDoodleDare,
  selectDailyDoodleDareTwist,
} from '../../shared/content/doodledares';
import type { DoodleDare } from '../../shared/content/doodledares';
import {
  PRACTICE_HEADER_TITLE,
  PRACTICE_SUBMIT_LABEL,
  practiceProgressCopy,
  selectPracticeDoodleDare,
} from '../lib/practicelab';
import {
  button,
  ghostButton,
  label,
  handLettered,
  stickerCard,
  errorPanel,
  fadeToScene,
  iconButton,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { PEN_CATALOG, penSwatchColor } from '../lib/pens';
import type { PenCatalogEntry } from '../lib/pens';
import { ACCESSORY_BASE_SIZE, INK_REWARDS } from '../../shared/arena';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import type { ArenaState, BattleReport, Scribbit } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import { getDrawEligibility } from '../lib/draweligibility';
import { showVsCeremony } from '../lib/battleceremony';
import { LiveSprite } from '../lib/livesprite';
import { playBirthCeremony } from '../lib/birthceremony';

// Every base color is visible at once; premium pens remain a separate unlock.
const PALETTE_COLORS = [
  '#2b2016',
  '#ff5a3d',
  '#ff9a3d',
  '#3ba0e0',
  '#7fd8e6',
  '#4faa4f',
  '#8a5cd8',
  '#f2cf3d',
] as const;
const PALETTE_COLOR_NAMES = [
  'black',
  'coral',
  'orange',
  'blue',
  'aqua',
  'green',
  'purple',
  'gold',
] as const;

const MIN_LINE_WIDTH = 8;
const MAX_LINE_WIDTH = 56;
const LINE_WIDTH_STEP = 4;
const DEFAULT_LINE_WIDTH = 24;
type AnalyzerWorkerResponse = Readonly<{
  requestId: number;
  result: AnalyzerResult;
}>;

export class Draw extends Scene {
  private overlay!: DomOverlay;
  private nameOverlay: DomOverlay | null = null;
  private canvas!: DrawCanvas;
  private nameInput: HTMLInputElement | null = null;
  private headerControlOverlay: CanvasActionOverlay | null = null;
  private toolControlOverlay: CanvasActionOverlay | null = null;
  private submitOverlay: CanvasActionOverlay | null = null;
  private submitControl: HTMLButtonElement | null = null;

  private reactionText!: Phaser.GameObjects.Text;
  private lastResult: AnalyzerResult | null = null;
  private selectedColorIndex = 0;
  private paletteSwatches: Phaser.GameObjects.Arc[] = [];
  private premiumPenIndex = -1;
  private premiumPenBackground: Phaser.GameObjects.Rectangle | null = null;
  private premiumPenSwatch: Phaser.GameObjects.Arc | null = null;
  private lineWidth = DEFAULT_LINE_WIDTH;
  private lineWidthPreviewDot: Phaser.GameObjects.Arc | null = null;
  private submitButton: Phaser.GameObjects.Container | null = null;
  private creationControlsReady: boolean | null = null;

  private resizeHandler = (): void => {
    this.overlay?.sync();
    this.nameOverlay?.sync();
  };
  private visualViewportResizeHandler = (): void => this.resizeHandler();
  private submitting = false;
  private errorPanelRef: ErrorPanel | null = null;
  private livingPaper: LivingPaper | null = null;
  private stickers: StickerAttach | null = null;
  private stickerButtonLabel: Phaser.GameObjects.Text | null = null;
  private drawerOpen = false;
  private previewTimer: Phaser.Time.TimerEvent | null = null;
  private analysisWorker: Worker | null = null;
  private analysisRequestId = 0;
  private startFightAfterBirth = false;
  private birthContinuationStarted = false;
  private canvasDareOverlay: HTMLDivElement | null = null;
  private dailyDare: DoodleDare | null = null;
  private dailyDareTwist: string | null = null;
  private isFirstScribbit = false;
  private practiceMode = false;
  private practicePowers: PrimaryPower[] = [];
  private practiceAttemptCount = 0;
  private pendingPracticeReport: BattleReport | null = null;

  constructor() {
    super('Draw');
  }

  init(data?: unknown): void {
    this.practiceMode =
      typeof data === 'object' &&
      data !== null &&
      'mode' in data &&
      data.mode === 'practice';
    this.lastResult = null;
    this.selectedColorIndex = 0;
    this.paletteSwatches = [];
    this.premiumPenIndex = -1;
    this.premiumPenBackground = null;
    this.premiumPenSwatch = null;
    this.lineWidth = DEFAULT_LINE_WIDTH;
    this.lineWidthPreviewDot = null;
    this.submitButton = null;
    this.creationControlsReady = null;
    this.submitting = false;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.stickers = null;
    this.stickerButtonLabel = null;
    this.drawerOpen = false;
    this.previewTimer = null;
    this.analysisWorker = null;
    this.analysisRequestId = 0;
    this.startFightAfterBirth = false;
    this.birthContinuationStarted = false;
    this.canvasDareOverlay = null;
    this.dailyDare = null;
    this.dailyDareTwist = null;
    this.isFirstScribbit = false;
    this.practicePowers = [];
    this.practiceAttemptCount = 0;
    this.pendingPracticeReport = null;
    this.nameInput = null;
    this.nameOverlay = null;
    this.headerControlOverlay = null;
    this.toolControlOverlay = null;
    this.submitOverlay = null;
    this.submitControl = null;
  }

  create(): void {
    // Defensive: clear any overlay a previous Draw visit might have left behind.
    DomOverlay.destroyAll();

    const arena = getArena(this);
    if (!arena) {
      this.scene.start('Preloader');
      return;
    }
    if (this.practiceMode) {
      if (!arena.loggedIn) {
        showToast('Log in to open the server-checked Practice Lab.');
        this.scene.start('ArenaHome');
        return;
      }
    } else {
      const eligibility = getDrawEligibility(arena);
      if (!eligibility.canDraw) {
        showToast(eligibility.message);
        this.scene.start('ArenaHome');
        return;
      }
    }
    this.isFirstScribbit = !this.practiceMode && arena.myScribbits.length === 0;
    const practiceSession = this.practiceMode ? getPracticeSession(this) : null;
    this.practicePowers = practiceSession
      ? [...practiceSession.triedPowers]
      : [];
    this.practiceAttemptCount = practiceSession?.attemptCount ?? 0;
    this.dailyDare = this.practiceMode
      ? selectPracticeDoodleDare(
          this.practicePowers,
          arena.dayNumber,
          arena.myUsername,
          this.practiceAttemptCount
        )
      : selectDailyDoodleDare(arena.dayNumber, arena.myUsername);
    this.dailyDareTwist = selectDailyDoodleDareTwist(
      arena.dayNumber + (this.practiceMode ? this.practiceAttemptCount : 0),
      arena.myUsername
    );
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    // Calm living page (no forecast field / edge creatures) so it moves gently
    // without distracting from the drawing surface.
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    this.headerControlOverlay = new CanvasActionOverlay(this);
    this.headerControlOverlay.setRootAttributes({
      'aria-label': 'Drawing navigation',
    });
    this.toolControlOverlay = new CanvasActionOverlay(this);
    this.toolControlOverlay.setRootAttributes({
      'aria-label': this.practiceMode ? 'Practice drawing tools' : 'Drawing tools',
    });
    this.buildChrome();
    this.buildOverlay();
    this.buildSubmitControl();
    this.orderDrawingOverlays();
    this.startAnalyzerWorker();
    if (!this.practiceMode) this.setupStickers();
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
    this.analysisWorker?.terminate();
    this.analysisWorker = null;
    this.canvas?.destroy();
    this.overlay?.destroy();
    this.nameOverlay?.destroy();
    this.nameOverlay = null;
    this.headerControlOverlay?.destroy();
    this.headerControlOverlay = null;
    this.toolControlOverlay?.destroy();
    this.toolControlOverlay = null;
    this.submitOverlay?.destroy();
    this.submitOverlay = null;
    this.submitControl = null;
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.stickers?.destroy();
    this.stickers = null;
  }

  private startAnalyzerWorker(): void {
    try {
      const worker = new Worker(
        new URL('../workers/analyzer.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = (event: MessageEvent<AnalyzerWorkerResponse>) => {
        if (
          !this.scene.isActive() ||
          event.data.requestId !== this.analysisRequestId
        ) {
          return;
        }
        this.lastResult = event.data.result;
        this.updateReaction(event.data.result);
      };
      worker.onerror = () => {
        worker.terminate();
        if (this.analysisWorker === worker) this.analysisWorker = null;
      };
      this.analysisWorker = worker;
    } catch {
      this.analysisWorker = null;
    }
  }

  // The live 512-canvas rect in design space (the DOM canvas sits here). Stickers
  // are placed in this rect and mapped into 512-canvas coords at submit.
  private canvasRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const square = Draw.CANVAS_SQUARE;
    return {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    };
  }

  // Load the owned-accessory inventory, then wire the sticker drawer. Fetched
  // async so the drawing UI never blocks; the sticker badge reflects owned copies.
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
    this.stickerButtonLabel?.setText(count > 0 ? `${count}/2` : '');
  }

  private toggleStickerDrawer(): void {
    if (!this.stickers) return;
    if (!this.stickers.hasAnyOwned()) {
      showToast(
        'Win accessories from the capsule machine to sticker your scribbit!'
      );
      return;
    }
    this.drawerOpen = !this.drawerOpen;
    if (this.drawerOpen)
      this.stickers.openDrawer(
        Draw.CANVAS_CENTER_Y + Draw.CANVAS_SQUARE / 2 + 96
      );
    else this.stickers.closeDrawer();
  }

  // Every exit from Draw routes through here so the DOM overlay is torn down
  // synchronously — we never depend on shutdown-event timing to remove it.
  private exitTo(sceneKey: string): void {
    this.cleanup();
    DomOverlay.destroyAll();
    fadeToScene(this, sceneKey);
  }

  private exitDraw(): void {
    if (this.practiceMode) endPracticeSession(this);
    this.exitTo('ArenaHome');
  }

  // --- Layout budget (720x1280 design space) --------------------------------
  // Canvas is the hero. Everything below stacks on a strict grid so nothing
  // overlaps or clips: canvas → tools → stat panel → name → submit.
  private static readonly CANVAS_CENTER_Y = 410;
  private static readonly CANVAS_SQUARE = 620;
  private static readonly TOOLS_Y = 842;
  private static readonly STATUS_Y = 1000;
  private static readonly NAME_Y = 1092;
  private static readonly SUBMIT_Y = 1200;

  private addNativeControl(
    accessibleLabel: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onActivate: () => void,
    enabled = true,
    overlay: CanvasActionOverlay | null = this.toolControlOverlay
  ): HTMLButtonElement | null {
    return (
      overlay?.add({
        label: accessibleLabel,
        rect: { x, y, width, height },
        pointerPassthrough: true,
        enabled,
        onActivate,
      }) ?? null
    );
  }

  private buildSubmitControl(): void {
    this.submitOverlay = new CanvasActionOverlay(this);
    this.submitOverlay.setRootAttributes({ 'aria-label': 'Drawing submission' });
    this.submitControl = this.addNativeControl(
      this.practiceMode ? PRACTICE_SUBMIT_LABEL : 'Bring drawing to life',
      EDGE,
      Draw.SUBMIT_Y - 48,
      this.scale.width - EDGE * 2,
      96,
      () => this.trySubmit(),
      false,
      this.submitOverlay
    );
  }

  private orderDrawingOverlays(): void {
    if (this.headerControlOverlay) {
      this.overlay.moveAfter(this.headerControlOverlay);
    }
    if (this.toolControlOverlay) {
      this.toolControlOverlay.moveAfter(this.overlay);
    }
    const afterTools = this.toolControlOverlay ?? this.overlay;
    if (this.nameOverlay) this.nameOverlay.moveAfter(afterTools);
    const beforeSubmit = this.nameOverlay ?? afterTools;
    this.submitOverlay?.moveAfter(beforeSubmit);
  }

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    // Top bar: Back on the left, title centered in the remaining space so the
    // two never collide (the mission's header-clip bug).
    ghostButton(this, 90, 60, '‹', () => this.exitDraw(), 96);
    this.addNativeControl(
      'Back to Arena',
      42,
      12,
      96,
      96,
      () => this.exitDraw(),
      true,
      this.headerControlOverlay
    );
    handLettered(
      this,
      width / 2 + 30,
      56,
      this.practiceMode ? PRACTICE_HEADER_TITLE : DRAW_HEADER_TITLE,
      30,
      UI.ink,
      true
    );

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
    this.buildStatusStrip(Draw.STATUS_Y);
    this.submitButton = button(
      this,
      width / 2,
      Draw.SUBMIT_Y,
      this.practiceMode ? PRACTICE_SUBMIT_LABEL : 'BRING TO LIFE',
      () => this.trySubmit(),
      width - EDGE * 2,
      this.practiceMode ? UI.tapeAlt : UI.coral,
      UI.ink
    );
    this.submitButton.setAlpha(0).setVisible(false);
  }

  // Two compact rows: every base color remains visible, while editing tools and
  // unlocked premium pens stay thumb-sized below it.
  private buildToolsBand(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 220;
    const panelTop = centerY - panelH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(UI.creamHex, 0.94);
    panel.fillRoundedRect(EDGE, panelTop, panelW, panelH, 16);
    panel.lineStyle(3, UI.inkHex, 0.72);
    panel.strokeRoundedRect(EDGE, panelTop, panelW, panelH, 16);

    const paletteY = centerY - 52;
    const toolY = centerY + 52;
    this.buildPaletteRow(paletteY, panelW);

    const canUseStickers =
      !this.practiceMode && (this.getArenaState()?.myScribbits.length ?? 0) > 0;
    const hasPremiumPens = this.unlockedPens().length > 0;
    const toolCount = 3 + Number(canUseStickers) + Number(hasPremiumPens);
    const toolSpacing = panelW / toolCount;
    const toolWidth = Math.min(120, toolSpacing - 12);
    const toolSlots = Array.from(
      { length: toolCount },
      (_, index) => EDGE + toolSpacing * (index + 0.5)
    );
    let toolIndex = 0;
    this.buildLineWidthControl(
      toolSlots[toolIndex] ?? width / 2,
      toolY,
      toolWidth
    );
    toolIndex += 1;
    this.setLineWidth(DEFAULT_LINE_WIDTH);

    if (hasPremiumPens) {
      this.buildPremiumPenControl(
        toolSlots[toolIndex] ?? width / 2,
        toolY,
        toolWidth
      );
      toolIndex += 1;
    }

    if (canUseStickers) {
      const stickerBtn = this.toolIconButton(
        toolSlots[toolIndex] ?? width / 2,
        toolY,
        'sticker',
        () => this.toggleStickerDrawer(),
        toolWidth
      );
      toolIndex += 1;
      this.stickerButtonLabel = label(
        this,
        24,
        -27,
        '',
        15,
        UI.coralText,
        true
      );
      stickerBtn.add(this.stickerButtonLabel);
    }

    this.toolIconButton(
      toolSlots[toolIndex] ?? width - 260,
      toolY,
      'eraser',
      () => this.canvas?.setEraser(),
      toolWidth
    );
    toolIndex += 1;
    this.toolIconButton(
      toolSlots[toolIndex] ?? width - 160,
      toolY,
      'undo',
      () => this.canvas?.undo(),
      toolWidth
    );
  }

  private buildPaletteRow(y: number, panelWidth: number): void {
    const spacing = panelWidth / PALETTE_COLORS.length;
    PALETTE_COLORS.forEach((color, colorIndex) => {
      const x = EDGE + spacing * (colorIndex + 0.5);
      const container = this.add.container(x, y);
      const swatch = this.add
        .circle(
          0,
          0,
          colorIndex === this.selectedColorIndex ? 29 : 23,
          Phaser.Display.Color.HexStringToColor(color).color,
          1
        )
        .setStrokeStyle(
          colorIndex === this.selectedColorIndex ? 6 : 3,
          colorIndex === this.selectedColorIndex ? UI.goldHex : UI.inkHex,
          1
        );
      const hit = this.add
        .rectangle(0, 0, spacing, 84, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      container.add([swatch, hit]);
      const press = (): void => {
        container.setScale(0.9);
      };
      const release = (): void => {
        container.setScale(1);
      };
      bindPressInteractionEvents(
        hit,
        {
          press,
          release,
          activate: () => this.selectBaseColor(colorIndex),
          pressOnHover: false,
        },
        { gameTarget: this.input, shutdownTarget: this.events }
      );
      this.addNativeControl(
        `Use ${PALETTE_COLOR_NAMES[colorIndex] ?? color} ink`,
        x - spacing / 2,
        y - 42,
        spacing,
        84,
        () => this.selectBaseColor(colorIndex)
      );
      this.paletteSwatches.push(swatch);
    });
  }

  private selectBaseColor(colorIndex: number): void {
    const color = PALETTE_COLORS[colorIndex];
    if (!color) return;
    this.selectedColorIndex = colorIndex;
    this.canvas?.setColor(color);
    this.premiumPenBackground?.setStrokeStyle(4, UI.inkHex, 1);
    this.refreshPaletteSelection();
  }

  private refreshPaletteSelection(): void {
    this.paletteSwatches.forEach((swatch, colorIndex) => {
      const selected = colorIndex === this.selectedColorIndex;
      swatch.setRadius(selected ? 29 : 23);
      swatch.setStrokeStyle(
        selected ? 6 : 3,
        selected ? UI.goldHex : UI.inkHex,
        1
      );
    });
  }

  private unlockedPens(): PenCatalogEntry[] {
    const unlocked = new Set(this.getArenaState()?.myPens ?? []);
    return PEN_CATALOG.filter((pen) => unlocked.has(pen.id));
  }

  private buildPremiumPenControl(x: number, y: number, width: number): void {
    const pens = this.unlockedPens();
    const firstPen = pens[0];
    if (!firstPen) return;
    const container = this.add.container(x, y);
    this.premiumPenBackground = this.add
      .rectangle(0, 0, width, 88, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    this.premiumPenSwatch = this.add
      .circle(
        0,
        0,
        28,
        Phaser.Display.Color.HexStringToColor(penSwatchColor(firstPen)).color,
        1
      )
      .setStrokeStyle(4, UI.inkHex, 1);
    const premiumMark = this.add
      .circle(31, -27, 9, UI.gold, 1)
      .setStrokeStyle(3, UI.inkHex, 1);
    const cycleMarks = this.add.graphics();
    cycleMarks.fillStyle(UI.inkHex, 0.55);
    [-10, 0, 10].forEach((offset) => cycleMarks.fillCircle(offset, 34, 2));
    const hit = this.add
      .rectangle(0, 0, Math.max(width, MIN_TOUCH), MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add([
      this.premiumPenBackground,
      this.premiumPenSwatch,
      premiumMark,
      cycleMarks,
      hit,
    ]);
    bindPressInteractionEvents(
      hit,
      {
        press: () => container.setScale(0.9),
        release: () => container.setScale(1),
        activate: () => this.cyclePremiumPen(),
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    this.addNativeControl(
      'Cycle unlocked premium pen',
      x - Math.max(width, MIN_TOUCH) / 2,
      y - MIN_TOUCH / 2,
      Math.max(width, MIN_TOUCH),
      MIN_TOUCH,
      () => this.cyclePremiumPen()
    );
  }

  private cyclePremiumPen(): void {
    const pens = this.unlockedPens();
    if (pens.length === 0) return;
    this.premiumPenIndex = (this.premiumPenIndex + 1) % pens.length;
    const pen = pens[this.premiumPenIndex];
    if (!pen) return;
    this.canvas?.setPen(pen.effect, pen.colors);
    this.premiumPenSwatch?.setFillStyle(
      Phaser.Display.Color.HexStringToColor(penSwatchColor(pen)).color,
      1
    );
    this.selectedColorIndex = -1;
    this.refreshPaletteSelection();
    this.premiumPenBackground?.setStrokeStyle(6, UI.goldHex, 1);
  }

  private toolIconButton(
    x: number,
    y: number,
    icon: PaperToolIconKey,
    onClick: () => void,
    width = 88
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, width, 88, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    const glyph = paperToolIcon(this, icon, 0, 0, 36);
    const hit = this.add
      .rectangle(0, 0, Math.max(width, MIN_TOUCH), MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add([bg, glyph, hit]);
    const press = (): void => {
      this.tweens.add({
        targets: container,
        scaleX: 0.9,
        scaleY: 0.88,
        duration: 60,
        ease: 'Quad.easeOut',
      });
    };
    const release = (): void => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut',
      });
    };
    bindPressInteractionEvents(hit, {
      press,
      release,
      activate: onClick,
      pressOnHover: false,
    }, {
      gameTarget: this.input,
      shutdownTarget: this.events,
    });
    const accessibleLabel =
      icon === 'sticker'
        ? 'Add an accessory sticker'
        : icon === 'eraser'
          ? 'Use eraser'
          : 'Undo last stroke';
    this.addNativeControl(
      accessibleLabel,
      x - Math.max(width, MIN_TOUCH) / 2,
      y - MIN_TOUCH / 2,
      Math.max(width, MIN_TOUCH),
      MIN_TOUCH,
      onClick
    );
    return container;
  }

  private buildLineWidthControl(x: number, y: number, width: number): void {
    const preview = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, width, 88, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    this.lineWidthPreviewDot = this.add.circle(
      0,
      0,
      this.lineWidthPreviewRadius(),
      UI.inkHex,
      1
    );
    const ring = this.add
      .circle(0, 0, 31, UI.creamHex, 0)
      .setStrokeStyle(3, UI.inkHex, 0.35);
    const hit = this.add
      .rectangle(0, 0, width, MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    preview.add([bg, ring, this.lineWidthPreviewDot, hit]);
    const cycleLineWidth = (): void => {
      const next = this.lineWidth + LINE_WIDTH_STEP * 2;
      this.setLineWidth(next > MAX_LINE_WIDTH ? MIN_LINE_WIDTH : next);
    };
    bindPressInteractionEvents(
      hit,
      {
        press: () => preview.setScale(0.92),
        release: () => preview.setScale(1),
        activate: cycleLineWidth,
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    this.addNativeControl(
      'Change brush size',
      x - width / 2,
      y - MIN_TOUCH / 2,
      width,
      MIN_TOUCH,
      cycleLineWidth
    );
  }

  private setLineWidth(width: number): void {
    this.lineWidth = Phaser.Math.Clamp(width, MIN_LINE_WIDTH, MAX_LINE_WIDTH);
    this.canvas?.setBrushSize(this.lineWidth);
    this.lineWidthPreviewDot?.setRadius(this.lineWidthPreviewRadius());
  }

  private lineWidthPreviewRadius(): number {
    return Phaser.Math.Clamp(this.lineWidth / 2, 5, 23);
  }

  // The current arena snapshot (myPens/myInk live here).
  private getArenaState(): ArenaState | undefined {
    return getArena(this);
  }

  private buildStatusStrip(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 96;
    const card = stickerCard(this, width / 2, centerY, panelW, panelH, {
      tape: false,
    });
    this.reactionText = label(
      this,
      0,
      0,
      'DRAW A BODY',
      TYPE.body,
      UI.ink,
      true
    );
    card.add(this.reactionText);
  }

  // --- DOM overlay (live canvas + name input) -------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({ onStrokeEnd: () => this.schedulePreview() });
    this.canvas.setBrushSize(this.lineWidth);
    this.canvas.element.setAttribute(
      'aria-label',
      this.practiceMode
        ? 'Draw a temporary practice fighter. The server reads its shape and returns a reward-free battle replay.'
        : `Draw your Scribbit. Its shape and colors choose how it fights. Shape cues: ${DRAW_RULES_COPY.replace(/\n/g, '; ')}.${this.isFirstScribbit ? ' First run: draw, watch it fight, and earn Ink.' : ''}`
    );
    const square = Draw.CANVAS_SQUARE;
    this.overlay.place(this.canvas.element, {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    });
    this.buildCanvasDareOverlay(square);

    if (this.practiceMode) {
      this.buildPracticeProgressOverlay();
      this.setCreationControlsReady(false);
      return;
    }

    // Official births get a name. Practice deliberately does not: it is a
    // throwaway shape test, not another roster object in disguise.
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.className = 'scribbits-name-input';
    this.nameInput.maxLength = 24;
    this.nameInput.placeholder = 'Name your scribbit…';
    this.nameInput.autocomplete = 'off';
    this.nameInput.autocapitalize = 'words';
    this.nameInput.enterKeyHint = 'done';
    this.nameInput.setAttribute('aria-label', 'Name your Scribbit');
    this.nameInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      this.nameInput?.blur();
      this.trySubmit();
    });
    Object.assign(this.nameInput.style, {
      ...DOM_TYPE.title,
      textAlign: 'center',
      color: '#2b2016',
      background: '#fff7e8',
      border: '4px solid #2b2016',
      borderRadius: '14px',
      outline: 'none',
      opacity: '0',
      transition: prefersReducedMotion() ? 'none' : 'opacity 180ms ease-out',
    });
    // Distinct row above the submit button — NAME_Y is its center; a 68px-tall
    // field spans 1076..1144, well clear of the 96px submit button (1170..1266).
    const nameH = 68;
    this.nameOverlay = new DomOverlay(this);
    this.nameOverlay.setRootAttributes({ 'aria-label': 'Scribbit identity' });
    this.nameOverlay.place(this.nameInput, {
      x: EDGE,
      y: Draw.NAME_Y - nameH / 2,
      width: this.scale.width - EDGE * 2,
      height: nameH,
    });
    this.setCreationControlsReady(false);
  }

  private buildPracticeProgressOverlay(): void {
    const progress = document.createElement('div');
    progress.setAttribute(
      'aria-label',
      practiceProgressCopy(this.practicePowers)
    );
    progress.textContent = practiceProgressCopy(this.practicePowers);
    Object.assign(progress.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 12px',
      boxSizing: 'border-box',
      ...DOM_TYPE.caption,
      whiteSpace: 'nowrap',
      textAlign: 'center',
      color: UI.coralText,
      background: 'transparent',
    });
    this.overlay.place(progress, {
      x: EDGE,
      y: Draw.NAME_Y - 22,
      width: this.scale.width - EDGE * 2,
      height: 44,
    });
  }

  private buildCanvasDareOverlay(square: number): void {
    const dare =
      this.dailyDare ??
      selectDailyDoodleDare(0, this.getArenaState()?.myUsername ?? null);
    const twist =
      this.dailyDareTwist ??
      selectDailyDoodleDareTwist(
        this.getArenaState()?.dayNumber ?? 1,
        this.getArenaState()?.myUsername ?? null
      );
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'note');
    overlay.setAttribute(
      'aria-label',
      `Optional Dare: ${dare.prompt}. ${getShapePowerDrawingCue(dare.suggestedPower)} Twist: ${twist}. You may draw anything.`
    );
    Object.assign(overlay.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: UI.ink,
      transition: prefersReducedMotion() ? 'none' : 'opacity 180ms ease-out',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: '68%',
      padding: '10px 14px',
      background: 'rgba(255, 247, 232, 0.9)',
      border: `2px solid ${UI.coralText}`,
      borderRadius: '14px',
      boxShadow: '0 5px 0 rgba(43, 32, 22, 0.12)',
      fontFamily: FONT_STACK,
    });
    const prompt = document.createElement('div');
    prompt.textContent = dare.prompt.toUpperCase();
    Object.assign(prompt.style, {
      ...DOM_TYPE.title,
    });
    card.append(prompt);
    overlay.append(card);
    this.overlay.place(overlay, {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    });
    overlay.style.pointerEvents = 'none';
    this.canvasDareOverlay = overlay;
  }

  private setCanvasDareVisible(visible: boolean): void {
    if (!this.canvasDareOverlay) return;
    this.canvasDareOverlay.style.opacity = visible ? '1' : '0';
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
      this.requestPreviewAnalysis();
    });
  }

  private requestPreviewAnalysis(): void {
    if (!this.canvas) return;
    const imageData = this.canvas.getImageData();
    const worker = this.analysisWorker;
    if (!worker) {
      this.applyAnalysisResult(
        analyze({
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        })
      );
      return;
    }
    this.analysisRequestId += 1;
    worker.postMessage(
      {
        requestId: this.analysisRequestId,
        data: imageData.data.buffer,
        width: imageData.width,
        height: imageData.height,
      },
      [imageData.data.buffer]
    );
  }

  private refreshPreview(): void {
    if (!this.canvas) return;
    this.analysisRequestId += 1;
    const imageData = this.canvas.getImageData();
    const result = analyze({
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    });
    this.applyAnalysisResult(result);
  }

  private applyAnalysisResult(result: AnalyzerResult): void {
    this.lastResult = result;
    this.updateReaction(result);
  }

  private updateReaction(result: AnalyzerResult): void {
    const feedback = planDrawFeedback({
      inkedPixels: result.inkedPixels,
      minimumInkedPixels: MIN_INK_PIXELS,
      stats: result.stats,
      element: result.element,
    });
    const ready = feedback.phase === 'ready';
    this.setCanvasDareVisible(feedback.phase === 'blank');
    this.setCreationControlsReady(ready);

    if (this.reactionText.text !== feedback.message) {
      this.reactionText.setText(feedback.message);
      this.reactionText.setColor(
        ready ? ELEMENT_STYLES[result.element].primaryText : UI.inkSoft
      );
      this.tweens.add({
        targets: this.reactionText,
        scale: 1.12,
        duration: 160,
        yoyo: true,
      });
    }
  }

  private setCreationControlsReady(ready: boolean): void {
    if (this.creationControlsReady === ready) return;
    this.creationControlsReady = ready;

    if (this.nameInput) {
      this.nameInput.style.opacity = ready ? '1' : '0';
      this.nameInput.style.pointerEvents = ready ? 'auto' : 'none';
      this.nameInput.disabled = !ready;
      this.nameInput.tabIndex = ready ? 0 : -1;
      this.nameInput.setAttribute('aria-hidden', ready ? 'false' : 'true');
      if (!ready) this.nameInput.blur();
    }

    if (this.submitControl) {
      this.submitControl.disabled = !ready;
      this.submitControl.tabIndex = ready ? 0 : -1;
      this.submitControl.setAttribute('aria-hidden', ready ? 'false' : 'true');
      if (!ready) this.submitControl.blur();
    }

    const submitButton = this.submitButton;
    if (!submitButton) return;
    this.tweens.killTweensOf(submitButton);
    if (!ready) {
      submitButton.setAlpha(0).setVisible(false);
      return;
    }
    submitButton.setVisible(true);
    if (prefersReducedMotion()) {
      submitButton.setAlpha(1);
      return;
    }
    submitButton.setAlpha(0);
    this.tweens.add({
      targets: submitButton,
      alpha: 1,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  // --- Submit + ceremony ----------------------------------------------------
  private trySubmit(): void {
    if (this.submitting) return;
    // Flush the debounced analyzer so the visible preview and exported base PNG
    // represent the same final stroke set at the moment of submission.
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.refreshPreview();
    const result = this.lastResult;
    if (!result || !hasMinimumDrawingInk(result)) {
      showToast('Your scribbit needs a body. Draw a bit more.');
      this.cameras.main.shake(220, 0.006);
      return;
    }
    const name = this.practiceMode
      ? 'Practice Shape'
      : (this.nameInput?.value.trim() ?? '');
    if (!this.practiceMode && name.length < 2) {
      showToast('Give your scribbit a name (2+ letters).');
      this.nameInput?.focus();
      return;
    }

    this.submitting = true;
    // Hide the draggable stickers + drawer so only the baked PNG shows in the
    // ceremony; the metadata is captured first from their current transforms.
    const accessories = this.practiceMode
      ? []
      : (this.stickers?.toAttachedAccessories() ?? []);
    this.stickers?.hideOverlays();
    this.overlay.setVisible(false);
    if (this.practiceMode) {
      void this.submitPractice(name);
    } else {
      void this.submit(name, result, accessories);
    }
  }

  private async submitPractice(name: string): Promise<void> {
    const { baseImageDataUrl } = this.canvas.exportSubmissionImages();
    const response = await practiceBattle({ name, baseImageDataUrl });
    if (!response.ok) {
      this.submitting = false;
      this.showError(response.error);
      return;
    }
    if (response.data.kind !== 'practice' || !response.data.simulation) {
      this.submitting = false;
      this.showError('The Practice Lab returned an invalid replay. Try again.');
      return;
    }

    this.pendingPracticeReport = response.data;
    this.practicePowers = [
      ...recordPracticePower(this, selectPrimaryPower(response.data.a.stats))
        .triedPowers,
    ];
    this.playCeremony(response.data.a, baseImageDataUrl);
  }

  private async submit(
    name: string,
    result: AnalyzerResult,
    accessories: AttachedAccessory[]
  ): Promise<void> {
    // Export the untouched analyzer source plus a rendered copy with accessories
    // baked at their canvas-space transforms. Metadata lets the server consume
    // the owned copies without allowing cosmetics to affect combat stats.
    const { baseImageDataUrl, imageDataUrl } =
      this.canvas.exportSubmissionImages((ctx) => {
        accessories.forEach((accessory) => {
          // The AttachedAccessory scale is canvas-px-per-unit-box relative to the
          // shared sticker box; convert back to a canvas-px box edge for the bake.
          const bakeSize = ACCESSORY_BASE_SIZE * accessory.scale;
          drawAccessoryCanvas(
            ctx,
            accessory.id,
            accessory.x,
            accessory.y,
            bakeSize,
            accessory.rotation
          );
        });
      });
    const response = await submitScribbit({
      name,
      baseImageDataUrl,
      imageDataUrl,
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
        showToast(
          'Your Scribbit made it into the Rumble — the reply arrived late.'
        );
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
    this.playCeremony(response.data, imageDataUrl);
  }

  // Daily birth and ephemeral practice share one high-juice reveal. Practice
  // changes the promise and reward layer so it never looks like a saved birth.
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
    this.add
      .rectangle(0, 0, width, height, style.primary, 0.1)
      .setOrigin(0)
      .setDepth(-90);

    playBirthCeremony(this, {
      scribbit,
      dataUrl,
      // Practice diagnoses a temporary shape; it must never imitate a saved
      // daily birth. It still uses the same loaded texture in the result card.
      animate: !this.practiceMode,
      onComplete: ({ textureKey, newborn }) =>
        this.showBirthReveal(scribbit, textureKey, newborn),
      onError: () =>
        this.showError(
          'Your drawing was saved, but its reveal could not load.'
        ),
    });
  }

  private showBirthReveal(
    scribbit: Scribbit,
    textureKey: string,
    awakenedNewborn: LiveSprite | null
  ): void {
    const { width } = this.scale;

    const title = handLettered(
      this,
      width / 2,
      180,
      this.practiceMode ? 'POWER FOUND!' : "IT'S ALIVE!",
      62,
      UI.goldText,
      true
    ).setScale(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
    this.cameras.main.shake(200, 0.008);

    this.revealCard(scribbit, textureKey, awakenedNewborn);
  }

  private revealCard(
    scribbit: Scribbit,
    textureKey: string,
    awakenedNewborn: LiveSprite | null
  ): void {
    const { width, height } = this.scale;
    const cardW = 500;
    const cardH = 440;
    const cardY = height / 2 + 10;
    const card = stickerCard(this, width / 2, cardY, cardW, cardH, {
      gold: true,
      tapeColor: UI.tape,
    });
    card.setScale(0);

    const artY = cardY - cardH / 2 + 130;
    const newborn =
      awakenedNewborn ??
      new LiveSprite(this, width / 2, artY, textureKey, {
        displaySize: 230,
        stats: scribbit.stats,
        depth: 10,
        reduceMotion: prefersReducedMotion(),
      });
    newborn.setPosition(width / 2, artY).setDepth(10);
    const shapePowerName = getShapePowerSignatureName(
      scribbit.element,
      selectPrimaryPower(scribbit.stats)
    ).toUpperCase();
    const elementStyle = ELEMENT_STYLES[scribbit.element];
    const mainLabel = label(
      this,
      width / 2,
      cardY + 80,
      this.practiceMode ? shapePowerName : scribbit.name.toUpperCase(),
      34,
      UI.ink,
      true
    )
      .setAlpha(0)
      .setDepth(10)
      .setWordWrapWidth(cardW - 70);
    if (mainLabel.width > cardW - 70) {
      mainLabel.setScale((cardW - 70) / mainLabel.width);
    }
    const detailLabel = label(
      this,
      width / 2,
      cardY + 132,
      this.practiceMode
        ? `${elementStyle.label.toUpperCase()} · SERVER CHECKED`
        : `${elementStyle.label.toUpperCase()} · ${shapePowerName}`,
      20,
      elementStyle.primaryText,
      true
    )
      .setAlpha(0)
      .setDepth(10)
      .setWordWrapWidth(cardW - 70);

    this.tweens.add({
      targets: card,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
    if (!awakenedNewborn) newborn.awaken();
    this.tweens.add({
      targets: [mainLabel, detailLabel],
      alpha: 1,
      delay: 400,
      duration: 400,
    });

    const returnPromise = stickerCard(
      this,
      width / 2,
      height - 245,
      width - 120,
      76,
      { tape: false, tilt: -1 }
    )
      .setAlpha(0)
      .setDepth(10);
    const returnPromiseCopy = label(
      this,
      0,
      0,
      this.practiceMode
        ? `${this.practicePowers.length}/4 POWERS · NO REWARDS`
        : `+${INK_REWARDS.dailyDraw} INK · ENTERED TONIGHT`,
      20,
      UI.coralText,
      true
    );
    returnPromise.add(returnPromiseCopy);
    this.tweens.add({
      targets: returnPromise,
      alpha: 1,
      delay: 850,
      duration: 350,
    });

    ghostButton(
      this,
      width / 2,
      height - 80,
      this.practiceMode
        ? 'WATCH REPLAY'
        : this.startFightAfterBirth
          ? 'WATCH FIRST FIGHT'
          : 'CONTINUE',
      () => this.continueAfterBirth(scribbit),
      420
    ).setDepth(10);
  }

  private continueAfterBirth(scribbit: Scribbit): void {
    if (this.birthContinuationStarted) return;
    this.birthContinuationStarted = true;

    if (this.practiceMode) {
      const report = this.pendingPracticeReport;
      if (!report || report.kind !== 'practice') {
        this.birthContinuationStarted = false;
        showToast('The practice replay went missing. Try the drawing again.');
        this.exitTo('ArenaHome');
        return;
      }
      setReplay(this, report, 'ArenaHome');
      showVsCeremony(this, {
        fighterA: report.a,
        fighterB: report.b,
        battleKind: report.kind,
        onComplete: () => this.scene.start('Replay'),
      });
      return;
    }

    if (!this.startFightAfterBirth) {
      this.exitTo('ArenaHome');
      return;
    }

    this.requestFirstFight(scribbit);
  }

  private requestFirstFight(scribbit: Scribbit): void {
    const { width, height } = this.scale;
    const statusCard = stickerCard(
      this,
      width / 2,
      height / 2,
      width - 160,
      170,
      {
        tapeColor: UI.tapeAlt,
      }
    ).setDepth(200);
    statusCard.add(
      paperIcon(this, 'sword', -210, -24, {
        size: 40,
        fill: UI.coral,
      })
    );
    statusCard.add(
      label(this, 18, -24, 'Finding an opponent…', TYPE.title, UI.ink, true)
    );
    statusCard.add(
      label(
        this,
        0,
        30,
        'Your Scribbit is safe in tonight’s Rumble.',
        TYPE.caption,
        UI.inkSoft,
        true
      )
    );

    void spar(scribbit.id).then((result) => {
      if (!this.scene.isActive()) return;
      statusCard.destroy(true);
      if (!result.ok) {
        this.showFirstFightRetry(scribbit, result.error);
        return;
      }
      const currentArena = getArena(this);
      const stagedBattle = stageDirectBattle(
        this,
        currentArena,
        result.data,
        scribbit.id
      );
      showVsCeremony(this, {
        fighterA: result.data.report.a,
        fighterB: result.data.report.b,
        battleKind: result.data.report.kind,
        rivalryStakes: stagedBattle.rivalryStakes,
        onComplete: () => this.scene.start('Replay'),
      });
    });
  }

  private showFirstFightRetry(scribbit: Scribbit, message: string): void {
    const { width, height } = this.scale;
    const panel = stickerCard(this, width / 2, height / 2, width - 120, 300, {
      tapeColor: UI.tapeAlt,
    }).setDepth(210);
    panel.add(
      label(this, 0, -92, 'The opponent ran away', TYPE.title, UI.ink, true)
    );
    const copy = label(this, 0, -35, message, TYPE.body, UI.inkSoft, true);
    copy.setWordWrapWidth(width - 220);
    panel.add(copy);

    const retry = iconButton(
      this,
      width / 2,
      height / 2 + 54,
      'sword',
      'Retry fight',
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
    this.errorPanelRef = errorPanel(
      this,
      width / 2,
      height / 2,
      message,
      () => {
        this.errorPanelRef?.destroy();
        this.errorPanelRef = null;
        this.overlay.setVisible(true);
        this.stickers?.showOverlays();
      }
    );
  }
}
