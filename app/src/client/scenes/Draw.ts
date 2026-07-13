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
import { analyze, hasMinimumDrawingInk } from '../lib/analyzer';
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
  planShapeReceipt,
} from '../../shared/combat/shapepowercontent';
import {
  selectDailyDoodleDare,
  selectDailyDoodleDareTwist,
} from '../../shared/content/doodledares';
import type { DoodleDare } from '../../shared/content/doodledares';
import {
  PRACTICE_HEADER_TITLE,
  PRACTICE_SUBMIT_LABEL,
  planPracticeReveal,
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
import { screenTitle } from '../lib/screentitle';
import {
  openDrawConfirmationModal,
  type DrawConfirmationModal,
} from '../lib/drawconfirmationmodal';

const DRAW_HEADER_TITLE = 'DRAW';

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
const SELECTED_SWATCH_RADIUS = 35;
const SWATCH_RADIUS = 21;
type AnalyzerWorkerResponse = Readonly<{
  requestId: number;
  result: AnalyzerResult;
}>;
type SubmissionDraft = Readonly<{
  result: AnalyzerResult;
  accessories: AttachedAccessory[];
  baseImageDataUrl: string;
  imageDataUrl: string;
}>;

export class Draw extends Scene {
  private overlay!: DomOverlay;
  private canvas!: DrawCanvas;
  private headerControlOverlay: CanvasActionOverlay | null = null;
  private toolControlOverlay: CanvasActionOverlay | null = null;
  private submitOverlay: CanvasActionOverlay | null = null;
  private revealControlOverlay: CanvasActionOverlay | null = null;
  private submitControl: HTMLButtonElement | null = null;
  private drawConfirmation: DrawConfirmationModal | null = null;
  private draftName = '';

  private lastResult: AnalyzerResult | null = null;
  private selectedColorIndex = 0;
  private paletteSwatches: Phaser.GameObjects.Arc[] = [];
  private premiumPenIndex = -1;
  private premiumPenBackground: Phaser.GameObjects.Rectangle | null = null;
  private premiumPenSwatch: Phaser.GameObjects.Arc | null = null;
  private lineWidth = DEFAULT_LINE_WIDTH;
  private lineWidthPreviewDot: Phaser.GameObjects.Arc | null = null;
  private decreaseBrushSizeMark: Phaser.GameObjects.Graphics | null = null;
  private increaseBrushSizeMark: Phaser.GameObjects.Graphics | null = null;
  private decreaseBrushSizeControl: HTMLButtonElement | null = null;
  private increaseBrushSizeControl: HTMLButtonElement | null = null;
  private eraserToolButton: Phaser.GameObjects.Container | null = null;
  private clearToolButton: Phaser.GameObjects.Container | null = null;
  private undoToolButton: Phaser.GameObjects.Container | null = null;
  private redoToolButton: Phaser.GameObjects.Container | null = null;
  private eraserToolControl: HTMLButtonElement | null = null;
  private clearToolControl: HTMLButtonElement | null = null;
  private undoToolControl: HTMLButtonElement | null = null;
  private redoToolControl: HTMLButtonElement | null = null;
  private submitButton: Phaser.GameObjects.Container | null = null;
  private creationControlsReady: boolean | null = null;

  private resizeHandler = (): void => {
    this.overlay?.sync();
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
    this.decreaseBrushSizeMark = null;
    this.increaseBrushSizeMark = null;
    this.decreaseBrushSizeControl = null;
    this.increaseBrushSizeControl = null;
    this.eraserToolButton = null;
    this.clearToolButton = null;
    this.undoToolButton = null;
    this.redoToolButton = null;
    this.eraserToolControl = null;
    this.clearToolControl = null;
    this.undoToolControl = null;
    this.redoToolControl = null;
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
    this.drawConfirmation = null;
    this.draftName = '';
    this.headerControlOverlay = null;
    this.toolControlOverlay = null;
    this.submitOverlay = null;
    this.revealControlOverlay = null;
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
      'aria-label': this.practiceMode
        ? 'Practice drawing tools'
        : 'Drawing tools',
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
    this.drawConfirmation?.destroy();
    this.drawConfirmation = null;
    this.headerControlOverlay?.destroy();
    this.headerControlOverlay = null;
    this.toolControlOverlay?.destroy();
    this.toolControlOverlay = null;
    this.submitOverlay?.destroy();
    this.submitOverlay = null;
    this.revealControlOverlay?.destroy();
    this.revealControlOverlay = null;
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
  // Canvas is the hero. Official Draw ends with NEXT; Practice keeps its
  // progress note and direct power check in the lower footer.
  private static readonly CANVAS_CENTER_Y = 410;
  private static readonly CANVAS_SQUARE = 620;
  private static readonly TOOLS_Y = 842;
  private static readonly OFFICIAL_SUBMIT_Y = 1060;
  private static readonly PRACTICE_PROGRESS_Y = 1092;
  private static readonly PRACTICE_SUBMIT_Y = 1200;

  private submitCenterY(): number {
    return this.practiceMode ? Draw.PRACTICE_SUBMIT_Y : Draw.OFFICIAL_SUBMIT_Y;
  }

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
    this.submitOverlay.setRootAttributes({
      'aria-label': 'Drawing submission',
    });
    this.submitControl = this.addNativeControl(
      this.practiceMode ? PRACTICE_SUBMIT_LABEL : 'Next',
      EDGE,
      this.submitCenterY() - 50,
      this.scale.width - EDGE * 2,
      100,
      () => this.continueFromDrawing(),
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
    this.submitOverlay?.moveAfter(afterTools);
  }

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    // Back stays left while the larger title centers over the drawing surface.
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
    screenTitle(
      this,
      width / 2,
      6,
      this.practiceMode ? PRACTICE_HEADER_TITLE : DRAW_HEADER_TITLE,
      { maxWidth: 360, maxHeight: 80 }
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
    this.submitButton = button(
      this,
      width / 2,
      this.submitCenterY(),
      this.practiceMode ? PRACTICE_SUBMIT_LABEL : 'NEXT',
      () => this.continueFromDrawing(),
      width - EDGE * 2,
      this.practiceMode ? UI.tapeAlt : UI.coral,
      UI.ink
    );
    this.submitButton.setAlpha(0.58).setVisible(true);
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
    // Brush sizing owns two slots so its minus and plus actions each keep a
    // full thumb-sized target instead of hiding several widths behind one tap.
    const toolCount = 6 + Number(canUseStickers) + Number(hasPremiumPens);
    const toolSpacing = panelW / toolCount;
    const toolWidth = Math.min(120, toolSpacing - 12);
    const toolSlots = Array.from(
      { length: toolCount },
      (_, index) => EDGE + toolSpacing * (index + 0.5)
    );
    let toolIndex = 0;
    const brushLeftSlot = toolSlots[toolIndex] ?? width / 2 - toolSpacing / 2;
    const brushRightSlot =
      toolSlots[toolIndex + 1] ?? width / 2 + toolSpacing / 2;
    this.buildLineWidthControl(
      (brushLeftSlot + brushRightSlot) / 2,
      toolY,
      toolSpacing * 2 - 12,
      toolSpacing * 2
    );
    toolIndex += 2;
    this.setLineWidth(DEFAULT_LINE_WIDTH);

    if (hasPremiumPens) {
      this.buildPremiumPenControl(
        toolSlots[toolIndex] ?? width / 2,
        toolY,
        toolWidth,
        toolSpacing
      );
      toolIndex += 1;
    }

    if (canUseStickers) {
      const stickerBtn = this.toolIconButton(
        toolSlots[toolIndex] ?? width / 2,
        toolY,
        'sticker',
        () => this.toggleStickerDrawer(),
        toolWidth,
        toolSpacing
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

    this.eraserToolButton = this.toolIconButton(
      toolSlots[toolIndex] ?? width - 260,
      toolY,
      'eraser',
      () => this.selectEraser(),
      toolWidth,
      toolSpacing
    );
    toolIndex += 1;
    this.clearToolButton = this.toolIconButton(
      toolSlots[toolIndex] ?? width - 210,
      toolY,
      'clear',
      () => this.clearDrawing(),
      toolWidth,
      toolSpacing
    );
    toolIndex += 1;
    this.undoToolButton = this.toolIconButton(
      toolSlots[toolIndex] ?? width - 160,
      toolY,
      'undo',
      () => this.undoDrawing(),
      toolWidth,
      toolSpacing
    );
    toolIndex += 1;
    this.redoToolButton = this.toolIconButton(
      toolSlots[toolIndex] ?? width - 90,
      toolY,
      'redo',
      () => this.redoDrawing(),
      toolWidth,
      toolSpacing
    );
    this.updateDrawingToolStates();
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
          colorIndex === this.selectedColorIndex
            ? SELECTED_SWATCH_RADIUS
            : SWATCH_RADIUS,
          Phaser.Display.Color.HexStringToColor(color).color,
          1
        )
        .setStrokeStyle(
          colorIndex === this.selectedColorIndex ? 8 : 3,
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
    this.updateDrawingToolStates();
  }

  private refreshPaletteSelection(): void {
    const erasing = this.canvas?.isErasing() ?? false;
    this.paletteSwatches.forEach((swatch, colorIndex) => {
      const selected = colorIndex === this.selectedColorIndex;
      swatch.setRadius(selected ? SELECTED_SWATCH_RADIUS : SWATCH_RADIUS);
      swatch.setStrokeStyle(
        selected && !erasing ? 8 : 3,
        selected && !erasing ? UI.goldHex : UI.inkHex,
        1
      );
    });
  }

  private unlockedPens(): PenCatalogEntry[] {
    const unlocked = new Set(this.getArenaState()?.myPens ?? []);
    return PEN_CATALOG.filter((pen) => unlocked.has(pen.id));
  }

  private buildPremiumPenControl(
    x: number,
    y: number,
    width: number,
    interactionWidth: number
  ): void {
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
      .rectangle(0, 0, interactionWidth, MIN_TOUCH, 0xffffff, 0.001)
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
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth,
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
    this.updateDrawingToolStates();
  }

  private toolIconButton(
    x: number,
    y: number,
    icon: PaperToolIconKey,
    onClick: () => void,
    width = 88,
    interactionWidth = Math.max(width, MIN_TOUCH)
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, width, 88, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    const glyph = paperToolIcon(this, icon, 0, 0, 46);
    const hit = this.add
      .rectangle(0, 0, interactionWidth, MIN_TOUCH, 0xffffff, 0.001)
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
    bindPressInteractionEvents(
      hit,
      {
        press,
        release,
        activate: onClick,
        pressOnHover: false,
      },
      {
        gameTarget: this.input,
        shutdownTarget: this.events,
      }
    );
    const accessibleLabel =
      icon === 'sticker'
        ? 'Add an accessory sticker'
        : icon === 'eraser'
          ? 'Use eraser across all ink colors'
          : icon === 'clear'
            ? 'Clear drawing'
            : icon === 'undo'
              ? 'Undo last stroke'
              : 'Redo last stroke';
    const nativeControl = this.addNativeControl(
      accessibleLabel,
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth,
      MIN_TOUCH,
      onClick
    );
    if (icon === 'eraser') this.eraserToolControl = nativeControl;
    if (icon === 'clear') this.clearToolControl = nativeControl;
    if (icon === 'undo') this.undoToolControl = nativeControl;
    if (icon === 'redo') this.redoToolControl = nativeControl;
    return container;
  }

  private handleDrawingChanged(): void {
    this.updateDrawingToolStates();
    this.schedulePreview();
  }

  private selectEraser(): void {
    this.canvas?.setEraser();
    this.refreshPaletteSelection();
    this.updateDrawingToolStates();
  }

  private clearDrawing(): void {
    if (!this.lastResult || this.lastResult.inkedPixels <= 0) return;
    this.canvas?.clear();
  }

  private undoDrawing(): void {
    if (!this.canvas?.canUndo()) return;
    this.canvas.undo();
  }

  private redoDrawing(): void {
    if (!this.canvas?.canRedo()) return;
    this.canvas.redo();
  }

  private updateDrawingToolStates(): void {
    const erasing = this.canvas?.isErasing() ?? false;
    const hasInk = (this.lastResult?.inkedPixels ?? 0) > 0;
    const canUndo = this.canvas?.canUndo() ?? false;
    const canRedo = this.canvas?.canRedo() ?? false;
    this.setToolButtonState(this.eraserToolButton, true, erasing);
    this.setToolButtonState(this.clearToolButton, hasInk, false);
    this.setToolButtonState(this.undoToolButton, canUndo, false);
    this.setToolButtonState(this.redoToolButton, canRedo, false);
    this.setNativeToolControlState(this.eraserToolControl, true, erasing);
    this.setNativeToolControlState(this.clearToolControl, hasInk);
    this.setNativeToolControlState(this.undoToolControl, canUndo);
    this.setNativeToolControlState(this.redoToolControl, canRedo);
  }

  private setToolButtonState(
    toolButton: Phaser.GameObjects.Container | null,
    enabled: boolean,
    selected: boolean
  ): void {
    if (!toolButton) return;
    toolButton.setAlpha(enabled ? 1 : 0.32);
    toolButton.list.forEach((child) => {
      if (child.input) child.input.enabled = enabled;
    });
    const background = toolButton.list[0];
    if (!(background instanceof Phaser.GameObjects.Rectangle)) return;
    background.setFillStyle(selected ? UI.tapeAlt : UI.creamHex, 1);
    background.setStrokeStyle(
      selected ? 6 : 4,
      selected ? UI.coralDeep : UI.inkHex,
      1
    );
  }

  private setNativeToolControlState(
    control: HTMLButtonElement | null,
    enabled: boolean,
    selected = false
  ): void {
    if (!control) return;
    control.disabled = !enabled;
    control.tabIndex = enabled ? 0 : -1;
    control.setAttribute('aria-disabled', String(!enabled));
    if (control === this.eraserToolControl) {
      control.setAttribute('aria-pressed', String(selected));
    } else {
      control.removeAttribute('aria-pressed');
    }
  }

  private buildLineWidthControl(
    x: number,
    y: number,
    width: number,
    interactionWidth: number
  ): void {
    const preview = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, width, 88, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    // Stroke samples communicate brush size without relying on typographic
    // minus/plus marks that looked unrelated to the paper tool family.
    this.decreaseBrushSizeMark = this.add.graphics();
    this.decreaseBrushSizeMark.lineStyle(4, UI.inkHex, 1);
    this.decreaseBrushSizeMark.lineBetween(
      -width / 4 - 17,
      0,
      -width / 4 + 17,
      0
    );
    this.increaseBrushSizeMark = this.add.graphics();
    this.increaseBrushSizeMark.lineStyle(12, UI.inkHex, 1);
    this.increaseBrushSizeMark.lineBetween(
      width / 4 - 17,
      0,
      width / 4 + 17,
      0
    );
    this.lineWidthPreviewDot = this.add.circle(
      0,
      0,
      this.lineWidthPreviewRadius(),
      UI.inkHex,
      1
    );
    const ring = this.add
      .circle(0, 0, 24, UI.creamHex, 0)
      .setStrokeStyle(3, UI.inkHex, 0.35);
    const decreaseHit = this.add
      .rectangle(
        -interactionWidth / 4,
        0,
        interactionWidth / 2,
        MIN_TOUCH,
        0xffffff,
        0.001
      )
      .setInteractive({ useHandCursor: true });
    const increaseHit = this.add
      .rectangle(
        interactionWidth / 4,
        0,
        interactionWidth / 2,
        MIN_TOUCH,
        0xffffff,
        0.001
      )
      .setInteractive({ useHandCursor: true });
    preview.add([
      bg,
      this.decreaseBrushSizeMark,
      this.increaseBrushSizeMark,
      ring,
      this.lineWidthPreviewDot,
      decreaseHit,
      increaseHit,
    ]);
    const bindBrushSizeAction = (
      hit: Phaser.GameObjects.Rectangle,
      onActivate: () => void
    ): void => {
      bindPressInteractionEvents(
        hit,
        {
          press: () => preview.setScale(0.96),
          release: () => preview.setScale(1),
          activate: onActivate,
          pressOnHover: false,
        },
        { gameTarget: this.input, shutdownTarget: this.events }
      );
    };
    const decreaseBrushSize = (): void =>
      this.setLineWidth(this.lineWidth - LINE_WIDTH_STEP);
    const increaseBrushSize = (): void =>
      this.setLineWidth(this.lineWidth + LINE_WIDTH_STEP);
    bindBrushSizeAction(decreaseHit, decreaseBrushSize);
    bindBrushSizeAction(increaseHit, increaseBrushSize);
    this.decreaseBrushSizeControl = this.addNativeControl(
      'Decrease brush size',
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth / 2,
      MIN_TOUCH,
      decreaseBrushSize
    );
    this.increaseBrushSizeControl = this.addNativeControl(
      'Increase brush size',
      x,
      y - MIN_TOUCH / 2,
      interactionWidth / 2,
      MIN_TOUCH,
      increaseBrushSize
    );
  }

  private setLineWidth(width: number): void {
    this.lineWidth = Phaser.Math.Clamp(width, MIN_LINE_WIDTH, MAX_LINE_WIDTH);
    this.canvas?.setBrushSize(this.lineWidth);
    this.lineWidthPreviewDot?.setRadius(this.lineWidthPreviewRadius());
    this.updateBrushSizeControlState();
  }

  private updateBrushSizeControlState(): void {
    const atMinimum = this.lineWidth <= MIN_LINE_WIDTH;
    const atMaximum = this.lineWidth >= MAX_LINE_WIDTH;
    this.decreaseBrushSizeMark?.setAlpha(atMinimum ? 0.28 : 1);
    this.increaseBrushSizeMark?.setAlpha(atMaximum ? 0.28 : 1);
    if (this.decreaseBrushSizeControl) {
      this.decreaseBrushSizeControl.disabled = atMinimum;
      this.decreaseBrushSizeControl.setAttribute(
        'aria-disabled',
        String(atMinimum)
      );
    }
    if (this.increaseBrushSizeControl) {
      this.increaseBrushSizeControl.disabled = atMaximum;
      this.increaseBrushSizeControl.setAttribute(
        'aria-disabled',
        String(atMaximum)
      );
    }
  }

  private lineWidthPreviewRadius(): number {
    return Phaser.Math.Clamp(this.lineWidth / 2, 4, 18);
  }

  // The current arena snapshot (myPens/myInk live here).
  private getArenaState(): ArenaState | undefined {
    return getArena(this);
  }

  // --- DOM overlay (live canvas) --------------------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({
      onStrokeEnd: () => this.handleDrawingChanged(),
    });
    this.canvas.setBrushSize(this.lineWidth);
    this.canvas.element.setAttribute(
      'aria-label',
      this.practiceMode
        ? 'Draw a temporary practice fighter. The server reads its shape and returns a reward-free battle replay.'
        : `Draw your Scribbit. Its shape and colors choose how it fights.${this.isFirstScribbit ? ' First run: draw, watch it fight, and earn Ink.' : ''}`
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
      y: Draw.PRACTICE_PROGRESS_Y - 22,
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
    const ready = hasMinimumDrawingInk(result);
    this.setCanvasDareVisible(result.inkedPixels === 0);
    this.setCreationControlsReady(ready);
    this.updateDrawingToolStates();
  }

  private setCreationControlsReady(ready: boolean): void {
    if (this.creationControlsReady === ready) return;
    this.creationControlsReady = ready;

    if (this.submitControl) {
      this.submitControl.disabled = !ready;
      this.submitControl.tabIndex = ready ? 0 : -1;
      this.submitControl.setAttribute('aria-hidden', 'false');
      if (!ready) this.submitControl.blur();
    }

    const submitButton = this.submitButton;
    if (!submitButton) return;
    this.tweens.killTweensOf(submitButton);
    submitButton.list.forEach((child) => {
      if (child.input) child.input.enabled = ready;
    });
    if (!ready) {
      // Both Draw modes keep one visible disabled action so the page always
      // shows where the flow continues once the Scribbit has enough ink.
      submitButton.setVisible(true).setAlpha(0.58);
      return;
    }
    submitButton.setVisible(true);
    if (prefersReducedMotion()) {
      submitButton.setAlpha(1);
      return;
    }
    this.tweens.add({
      targets: submitButton,
      alpha: 1,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  // --- Confirmation, submit + ceremony -------------------------------------
  private continueFromDrawing(): void {
    if (this.submitting || this.drawConfirmation) return;
    // Flush the debounced analyzer so the visible preview and exported base PNG
    // represent the same final stroke set in the confirmation and submission.
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.refreshPreview();
    const result = this.lastResult;
    if (!result || !hasMinimumDrawingInk(result)) {
      showToast('Your scribbit needs a body. Draw a bit more.');
      this.cameras.main.shake(220, 0.006);
      return;
    }
    const draft = this.createSubmissionDraft(result);
    if (this.practiceMode) {
      this.beginSubmission('Practice Shape', draft);
      return;
    }

    // The drawing surface is native DOM and otherwise renders above Phaser's
    // modal card. The frozen preview replaces it until the player returns.
    this.overlay.setVisible(false);
    this.drawConfirmation = openDrawConfirmationModal(this, {
      previewDataUrl: draft.imageDataUrl,
      initialName: this.draftName,
      trigger: this.submitControl,
      onNameChange: (name) => {
        this.draftName = name;
      },
      onClose: (name) => {
        this.draftName = name;
        this.drawConfirmation = null;
        this.overlay.setVisible(true);
      },
      onConfirm: (name) => {
        this.draftName = name;
        this.drawConfirmation = null;
        this.beginSubmission(name, draft);
      },
    });
  }

  private createSubmissionDraft(result: AnalyzerResult): SubmissionDraft {
    const accessories = this.stickers?.toAttachedAccessories() ?? [];
    const { baseImageDataUrl, imageDataUrl } =
      this.canvas.exportSubmissionImages((ctx) => {
        accessories.forEach((accessory) => {
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
    return { result, accessories, baseImageDataUrl, imageDataUrl };
  }

  private beginSubmission(name: string, draft: SubmissionDraft): void {
    if (this.submitting) return;
    this.submitting = true;
    // Hide the draggable stickers + drawer so only the baked PNG shows in the
    // ceremony; the metadata is captured first from their current transforms.
    this.stickers?.hideOverlays();
    this.overlay.setVisible(false);
    if (this.practiceMode) {
      void this.submitPractice(name, draft);
    } else {
      void this.submit(name, draft);
    }
  }

  private async submitPractice(
    name: string,
    draft: SubmissionDraft
  ): Promise<void> {
    const response = await practiceBattle({
      name,
      baseImageDataUrl: draft.baseImageDataUrl,
    });
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
    this.playCeremony(response.data.a, draft.baseImageDataUrl);
  }

  private async submit(name: string, draft: SubmissionDraft): Promise<void> {
    const response = await submitScribbit({
      name,
      baseImageDataUrl: draft.baseImageDataUrl,
      imageDataUrl: draft.imageDataUrl,
      stats: draft.result.stats,
      element: draft.result.element,
      ...(draft.accessories.length > 0
        ? { accessories: draft.accessories }
        : {}),
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
    this.playCeremony(response.data, draft.imageDataUrl);
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
    this.headerControlOverlay?.setVisible(false);
    this.toolControlOverlay?.setVisible(false);
    this.submitOverlay?.setVisible(false);
    this.revealControlOverlay?.destroy();
    this.revealControlOverlay = new CanvasActionOverlay(this);
    this.revealControlOverlay.setRootAttributes({
      'aria-label': this.practiceMode
        ? 'Practice power result'
        : 'Scribbit birth result',
    });
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
          this.practiceMode
            ? 'The practice result could not load. Try the shape again.'
            : 'Your drawing was saved, but its reveal could not load.'
        ),
    });
  }

  private showBirthReveal(
    scribbit: Scribbit,
    textureKey: string,
    awakenedNewborn: LiveSprite | null
  ): void {
    if (this.practiceMode) {
      this.showPracticeReveal(scribbit, textureKey, awakenedNewborn);
      return;
    }
    const { width } = this.scale;

    const title = handLettered(
      this,
      width / 2,
      180,
      "IT'S ALIVE!",
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

  private showPracticeReveal(
    scribbit: Scribbit,
    textureKey: string,
    awakenedNewborn: LiveSprite | null
  ): void {
    const { width, height } = this.scale;
    const shapeReceipt = planShapeReceipt(
      scribbit.element,
      selectPrimaryPower(scribbit.stats)
    );
    const revealPlan = planPracticeReveal(
      getPracticeSession(this),
      shapeReceipt.move
    );
    const elementStyle = ELEMENT_STYLES[scribbit.element];
    const cardY = height / 2 - 20;
    const cardW = width - 120;
    const cardH = 760;
    const card = stickerCard(this, width / 2, cardY, cardW, cardH, {
      tape: false,
    })
      .setScale(0.92)
      .setAlpha(0);
    const eyebrow = label(
      this,
      width / 2,
      cardY - 300,
      revealPlan.headline,
      24,
      UI.coralText,
      true
    )
      .setDepth(10)
      .setAlpha(0);
    const spark = paperIcon(this, 'spark', width / 2 - 170, cardY - 302, {
      size: 34,
      fill: UI.gold,
    })
      .setDepth(10)
      .setAlpha(0);
    const halo = this.add
      .circle(width / 2, cardY - 70, 150, elementStyle.soft, 0.34)
      .setStrokeStyle(7, elementStyle.primary, 0.46)
      .setDepth(5)
      .setAlpha(0);
    const newborn =
      awakenedNewborn ??
      new LiveSprite(this, width / 2, cardY - 70, textureKey, {
        displaySize: 230,
        stats: scribbit.stats,
        depth: 10,
        reduceMotion: prefersReducedMotion(),
      });
    newborn.setPosition(width / 2, cardY - 70).setDepth(10);
    const powerName = handLettered(
      this,
      width / 2,
      cardY + 132,
      revealPlan.powerName,
      52,
      elementStyle.primaryText,
      true
    )
      .setDepth(10)
      .setAlpha(0);
    if (powerName.width > cardW - 70) {
      powerName.setScale((cardW - 70) / powerName.width);
    }
    const progress = label(
      this,
      width / 2,
      cardY + 215,
      `${shapeReceipt.battleLine}\n${revealPlan.progress}`,
      22,
      UI.inkSoft,
      true
    )
      .setDepth(10)
      .setAlpha(0);
    const progressMaxWidth = cardW - 70;
    if (progress.width > progressMaxWidth) {
      progress.setScale(progressMaxWidth / progress.width);
    }
    const replayButton = iconButton(
      this,
      width / 2,
      cardY + 300,
      'replay',
      revealPlan.primaryButton,
      () => this.continueAfterBirth(scribbit),
      430,
      UI.coral,
      UI.ink,
      96,
      UI.creamHex
    )
      .setDepth(10)
      .setAlpha(0);
    this.addNativeControl(
      'Watch practice fight replay',
      width / 2 - 215,
      cardY + 252,
      430,
      96,
      () => this.continueAfterBirth(scribbit),
      true,
      this.revealControlOverlay
    );

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: prefersReducedMotion() ? 1 : 320,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: [eyebrow, spark, halo, powerName, progress, replayButton],
      alpha: 1,
      delay: prefersReducedMotion() ? 0 : 120,
      duration: prefersReducedMotion() ? 1 : 260,
    });
    if (!awakenedNewborn) newborn.awaken();
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
    const shapeReceipt = planShapeReceipt(
      scribbit.element,
      selectPrimaryPower(scribbit.stats)
    );
    const elementStyle = ELEMENT_STYLES[scribbit.element];
    const mainLabel = label(
      this,
      width / 2,
      cardY + 80,
      scribbit.name.toUpperCase(),
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
      cardY + 145,
      `${shapeReceipt.birthLine}\n${shapeReceipt.effect}`,
      20,
      elementStyle.primaryText,
      true
    )
      .setAlpha(0)
      .setDepth(10)
      .setWordWrapWidth(cardW - 70)
      .setLineSpacing(6);

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
      `+${INK_REWARDS.dailyDraw} INK · ENTERED TONIGHT`,
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

    const actionLabel = this.startFightAfterBirth
      ? 'WATCH FIRST FIGHT'
      : 'CONTINUE';
    ghostButton(
      this,
      width / 2,
      height - 80,
      actionLabel,
      () => this.continueAfterBirth(scribbit),
      420
    ).setDepth(10);
    this.addNativeControl(
      actionLabel === 'CONTINUE' ? 'Continue to Arena' : actionLabel,
      width / 2 - 210,
      height - 128,
      420,
      96,
      () => this.continueAfterBirth(scribbit),
      true,
      this.revealControlOverlay
    );
  }

  private continueAfterBirth(scribbit: Scribbit): void {
    if (this.birthContinuationStarted) return;
    this.birthContinuationStarted = true;
    this.revealControlOverlay?.setVisible(false);

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
