import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import {
  practiceBattle,
  spar,
  submitFreeDrawing,
  submitScribbit,
  fetchArena,
} from '../lib/api';
import {
  beginPracticeSession,
  getArena,
  getArenaRevision,
  endPracticeSession,
  getPracticeSession,
  recordPracticeRole,
  setArena,
  setReplay,
  skipArenaReceiptsOnce,
  stageDirectBattle,
} from '../lib/registry';
import { analyze, hasMinimumDrawingInk } from '../lib/analyzer';
import type { AnalyzerResult } from '../lib/analyzer';
import { CanvasActionOverlay, DomOverlay } from '../lib/overlay';
import { DrawCanvas, type DrawCanvasChange } from '../lib/drawcanvas';
import {
  ELEMENT_STYLES,
  EDGE,
  DOM_TYPE,
  FONT_STACK,
  MIN_TOUCH,
  NAV_SAFE,
  prefersReducedMotion,
  STAT_STYLES,
  UI,
} from '../lib/theme';
import { paperIcon, paperToolIcon } from '../lib/papericons';
import type { PaperToolIconKey } from '../lib/papericons';
import { paperBackdrop } from '../lib/art';
import { LivingPaper } from '../lib/livingpaper';
import { StickerAttach } from '../lib/stickerdrawer';
import { fetchInventory } from '../lib/api';
import { drawAccessoryCanvas } from '../lib/accessories';
import { SCRIBBIT_STAT_KEYS, type AttachedAccessory } from '../../shared/arena';
import { selectCombatRole } from '../../shared/combat/selection';
import { getCombatRoleContent } from '../../shared/combat/roles';
import { getShapePowerDrawingCue } from '../../shared/combat/shapepowercontent';
import {
  COMMUNITY_DRAW_THEME_DAYS,
  selectCommunityDoodleDare,
} from '../../shared/content/communitydrawthemes';
import type { CommunityDrawTheme } from '../../shared/content/communitydrawthemes';
import { selectDailyDoodleDareTwist } from '../../shared/content/doodledares';
import type { DoodleDare } from '../../shared/content/doodledares';
import {
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
  startScene,
  iconButton,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { PEN_CATALOG, penSwatchColor } from '../lib/pens';
import type { PenCatalogEntry } from '../lib/pens';
import { ACCESSORY_BASE_SIZE, INK_REWARDS } from '../../shared/arena';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import type {
  ArenaState,
  BattleReport,
  FreeDrawing,
  Scribbit,
} from '../../shared/arena';
import type { CombatRole } from '../../shared/combat/types';
import {
  getCommunityThemeEligibility,
  getDrawEligibility,
  getTodayFreeDrawing,
  mergeTodayFreeDrawing,
} from '../lib/draweligibility';
import { fitDrawing, loadDrawing } from '../lib/scribbits';
import { showVsCeremony } from '../lib/battleceremony';
import { LiveSprite } from '../lib/livesprite';
import { playBirthCeremony, playBirthFinishVfx } from '../lib/birthceremony';
import { screenTitle } from '../lib/screentitle';
import {
  openDrawConfirmationModal,
  type DrawConfirmationModal,
} from '../lib/drawconfirmationmodal';
import {
  BRUSH_CATALOG_ENTRIES,
  DRAWING_INK_CATALOG_ENTRIES,
  type CosmeticBrushCatalogEntry,
  type CosmeticBrushEffect,
  type CosmeticDrawingInkCatalogEntry,
} from '../../shared/cosmetics';
import {
  createDrawRoundClock,
  expireDrawRoundClock,
  getDrawRoundUrgencyMotion,
  pauseDrawRoundClock,
  readDrawRoundClock,
  startDrawRoundClock,
  type DrawRoundClock,
} from '../lib/drawroundclock';
import {
  isLocalDrawAutomationMode,
  type DrawAutomationStroke,
} from '../lib/drawautomation';
import { planSceneMutationResponse } from '../lib/arenaasynclifecycle';
import { translate } from '../lib/localization';
import {
  pauseDrawingSoundtrack,
  resumeDrawingSoundtrack,
  startDrawingSoundtrack,
  stopSoundtrack,
} from '../lib/soundtrack';
import { markSfxManaged, playSfx } from '../lib/sfx';
import AnalyzerWorker from '../workers/analyzer.worker?worker&inline';
import {
  createDrawSubmissionLoadingOverlay,
  type DrawSubmissionLoadingOverlay,
} from '../lib/drawsubmissionloading';

const DRAW_START_CARD_ART_URL = new URL(
  '../assets/draw-start-challenge-card.jpg',
  import.meta.url
).href;
const DRAW_CLOSE_BUTTON_ART_URL = new URL(
  '../assets/ui-button-close.png',
  import.meta.url
).href;

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
  '#ffffff',
  '#ff7fb0',
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
  'white',
  'pink',
] as const;

const MIN_LINE_WIDTH = 8;
const MAX_LINE_WIDTH = 56;
const LINE_WIDTH_STEP = 4;
const DEFAULT_LINE_WIDTH = MIN_LINE_WIDTH;
const SELECTED_SWATCH_RADIUS = 30;
const SWATCH_RADIUS = 21;
type AnalyzerWorkerResponse = Readonly<{
  requestId: number;
  result: AnalyzerResult;
}>;
const isPracticeDoodleDare = (
  dare: DoodleDare | CommunityDrawTheme
): dare is DoodleDare => 'suggestedPower' in dare;
const formatThemePrompt = (prompt: string): string => {
  const naturalPrompt = prompt
    .replace(/^draw\s+(?:a|an)\s+/i, '')
    .replace(/^(?:a|an)\s+/i, '')
    .trim();
  return naturalPrompt
    ? `${naturalPrompt.charAt(0).toUpperCase()}${naturalPrompt.slice(1)}`
    : prompt;
};
type SubmissionDraft = Readonly<{
  result: AnalyzerResult;
  accessories: AttachedAccessory[];
  baseImageDataUrl: string;
  imageDataUrl: string;
  drawingSupplies: {
    drawingInkId: string | null;
    brushId: string | null;
  };
}>;
type SupplyUsage = Readonly<{
  drawingInkId: string | null;
  brushId: string | null;
}>;
type PlayerDrawMode = 'unselected' | 'community' | 'free';
type PaintChoice =
  | Readonly<{ kind: 'pen'; entry: PenCatalogEntry }>
  | Readonly<{
      kind: 'drawing-ink';
      entry: CosmeticDrawingInkCatalogEntry;
      charges: number;
    }>;

type LocalDrawAutomationApi = Readonly<{
  reset: () => boolean;
  draw: (strokes: readonly DrawAutomationStroke[]) => number;
  exportPng: () => string;
}>;

type LocalDrawAutomationWindow = Window &
  typeof globalThis & {
    __scribbitsMockDrawAutomation?: boolean;
    scribbitsDrawAutomation?: LocalDrawAutomationApi;
  };

export class Draw extends Scene {
  private overlay!: DomOverlay;
  private canvas!: DrawCanvas;
  private headerControlOverlay: CanvasActionOverlay | null = null;
  private toolControlOverlay: CanvasActionOverlay | null = null;
  private submitOverlay: CanvasActionOverlay | null = null;
  private revealControlOverlay: CanvasActionOverlay | null = null;
  private submitControl: HTMLButtonElement | null = null;
  private drawConfirmation: DrawConfirmationModal | null = null;
  private submissionLoading: DrawSubmissionLoadingOverlay | null = null;
  private draftName = '';

  private lastResult: AnalyzerResult | null = null;
  private selectedColorIndex = 0;
  private paletteSwatches: Phaser.GameObjects.Arc[] = [];
  private paletteControls: Phaser.GameObjects.Container[] = [];
  private premiumPenIndex = -1;
  private premiumPenControl: Phaser.GameObjects.Container | null = null;
  private premiumPenBackground: Phaser.GameObjects.Arc | null = null;
  private premiumPenSwatch: Phaser.GameObjects.Arc | null = null;
  private paintSupplyCount: Phaser.GameObjects.Text | null = null;
  private selectedDrawingInkId: string | null = null;
  private selectedBrushId: string | null = null;
  private selectedBrushEffect: CosmeticBrushEffect | null = null;
  private brushSupplyIndex = -1;
  private brushSupplyControl: Phaser.GameObjects.Container | null = null;
  private brushSupplyBackground: Phaser.GameObjects.Arc | null = null;
  private brushSupplyPreview: Phaser.GameObjects.Graphics | null = null;
  private brushSupplyCount: Phaser.GameObjects.Text | null = null;
  private usedDrawingInkId: string | null = null;
  private usedBrushId: string | null = null;
  private supplyHistory: SupplyUsage[] = [];
  private supplyRedoHistory: SupplyUsage[] = [];
  private activeStrokeColor: string = PALETTE_COLORS[0];
  private lineWidth = DEFAULT_LINE_WIDTH;
  private lineWidthPreviewStroke: Phaser.GameObjects.Graphics | null = null;
  private decreaseBrushSizeMark: Phaser.GameObjects.Graphics | null = null;
  private increaseBrushSizeMark: Phaser.GameObjects.Graphics | null = null;
  private decreaseBrushSizeControl: HTMLButtonElement | null = null;
  private increaseBrushSizeControl: HTMLButtonElement | null = null;
  private fillToolButton: Phaser.GameObjects.Container | null = null;
  private fillTargetSwatch: Phaser.GameObjects.Arc | null = null;
  private eraserToolButton: Phaser.GameObjects.Container | null = null;
  private eraserTargetSwatch: Phaser.GameObjects.Arc | null = null;
  private clearToolButton: Phaser.GameObjects.Container | null = null;
  private undoToolButton: Phaser.GameObjects.Container | null = null;
  private redoToolButton: Phaser.GameObjects.Container | null = null;
  private fillToolControl: HTMLButtonElement | null = null;
  private eraserToolControl: HTMLButtonElement | null = null;
  private clearToolControl: HTMLButtonElement | null = null;
  private undoToolControl: HTMLButtonElement | null = null;
  private redoToolControl: HTMLButtonElement | null = null;
  private liveRoleLabel: Phaser.GameObjects.Text | null = null;
  private liveRoleDetail: Phaser.GameObjects.Text | null = null;
  private submitButton: Phaser.GameObjects.Container | null = null;
  private creationControlsReady: boolean | null = null;
  private drawingControlContainers: Phaser.GameObjects.Container[] = [];
  private drawingNativeControls: HTMLButtonElement[] = [];
  private basicToolContainers: Phaser.GameObjects.Container[] = [];
  private advancedToolContainers: Phaser.GameObjects.Container[] = [];
  private basicToolNativeControls: HTMLButtonElement[] = [];
  private advancedToolNativeControls: HTMLButtonElement[] = [];
  private moreToolsButton: Phaser.GameObjects.Container | null = null;
  private moreToolsControl: HTMLButtonElement | null = null;
  private advancedToolBadge: Phaser.GameObjects.Arc | null = null;
  private advancedToolsOpen = false;
  private drawingLocked = false;
  private drawRoundClock: DrawRoundClock = createDrawRoundClock();
  private drawRoundTimerEvent: Phaser.Time.TimerEvent | null = null;
  private drawTimerContainer: HTMLDivElement | null = null;
  private drawTimerFace: HTMLDivElement | null = null;
  private drawTimerValue: HTMLSpanElement | null = null;
  private drawTimerStatus: HTMLElement | null = null;
  private displayedDrawSeconds: number | null = null;
  private lastDrawTimerShakeMilliseconds = 0;
  private drawTimerShakeDirection = 1;
  private drawStartControl: HTMLButtonElement | null = null;
  private freeDrawControl: HTMLButtonElement | null = null;
  private playerDrawMode: PlayerDrawMode = 'unselected';
  private communityThemeAvailable = true;
  private communityThemeUnavailableMessage = '';
  private freeSubmissionId: string | null = null;

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
  private stickerInventoryRequestEpoch = 0;
  private birthContinuationStarted = false;
  private firstFightButton: Phaser.GameObjects.Container | null = null;
  private firstFightButtonLabel: Phaser.GameObjects.Text | null = null;
  private firstFightControl: HTMLButtonElement | null = null;
  private firstFightPromise: Phaser.GameObjects.Container | null = null;
  private firstFightPromiseCopy: Phaser.GameObjects.Text | null = null;
  private firstFightStatus: HTMLElement | null = null;
  private firstFightLoadingTween: Phaser.Tweens.Tween | null = null;
  private canvasDareOverlay: HTMLDivElement | null = null;
  private dailyDare: DoodleDare | CommunityDrawTheme | null = null;
  private dailyDareTwist: string | null = null;
  private isFirstScribbit = false;
  private practiceMode = false;
  private automationMode = false;
  private practiceRoles: CombatRole[] = [];
  private practiceAttemptCount = 0;
  private pendingPracticeReport: BattleReport | null = null;
  private localAutomationBridge: HTMLDivElement | null = null;
  private sceneVisitEpoch = 0;
  private arenaReconciliationEpoch = 0;

  constructor() {
    super('Draw');
  }

  init(data?: unknown): void {
    this.sceneVisitEpoch += 1;
    this.practiceMode =
      typeof data === 'object' &&
      data !== null &&
      'mode' in data &&
      data.mode === 'practice';
    const automationWindow = window as LocalDrawAutomationWindow;
    const requestedAutomationMode =
      typeof data === 'object' &&
      data !== null &&
      'mode' in data &&
      data.mode === 'automation';
    this.automationMode =
      requestedAutomationMode &&
      isLocalDrawAutomationMode(
        window.location,
        automationWindow.__scribbitsMockDrawAutomation === true
      );
    this.playerDrawMode = 'unselected';
    this.communityThemeAvailable = true;
    this.communityThemeUnavailableMessage = '';
    this.freeSubmissionId = null;
    this.lastResult = null;
    this.selectedColorIndex = 0;
    this.paletteSwatches = [];
    this.paletteControls = [];
    this.premiumPenIndex = -1;
    this.premiumPenControl = null;
    this.premiumPenBackground = null;
    this.premiumPenSwatch = null;
    this.paintSupplyCount = null;
    this.selectedDrawingInkId = null;
    this.selectedBrushId = null;
    this.selectedBrushEffect = null;
    this.brushSupplyIndex = -1;
    this.brushSupplyControl = null;
    this.brushSupplyBackground = null;
    this.brushSupplyPreview = null;
    this.brushSupplyCount = null;
    this.usedDrawingInkId = null;
    this.usedBrushId = null;
    this.supplyHistory = [];
    this.supplyRedoHistory = [];
    this.activeStrokeColor = PALETTE_COLORS[0];
    this.lineWidth = DEFAULT_LINE_WIDTH;
    this.lineWidthPreviewStroke = null;
    this.decreaseBrushSizeMark = null;
    this.increaseBrushSizeMark = null;
    this.decreaseBrushSizeControl = null;
    this.increaseBrushSizeControl = null;
    this.fillToolButton = null;
    this.fillTargetSwatch = null;
    this.eraserToolButton = null;
    this.eraserTargetSwatch = null;
    this.clearToolButton = null;
    this.undoToolButton = null;
    this.redoToolButton = null;
    this.fillToolControl = null;
    this.eraserToolControl = null;
    this.clearToolControl = null;
    this.undoToolControl = null;
    this.redoToolControl = null;
    this.liveRoleLabel = null;
    this.liveRoleDetail = null;
    this.submitButton = null;
    this.creationControlsReady = null;
    this.drawingControlContainers = [];
    this.drawingNativeControls = [];
    this.basicToolContainers = [];
    this.advancedToolContainers = [];
    this.basicToolNativeControls = [];
    this.advancedToolNativeControls = [];
    this.moreToolsButton = null;
    this.moreToolsControl = null;
    this.advancedToolBadge = null;
    this.advancedToolsOpen = false;
    this.drawingLocked = false;
    this.drawRoundClock = createDrawRoundClock();
    this.drawRoundTimerEvent = null;
    this.drawTimerContainer = null;
    this.drawTimerFace = null;
    this.drawTimerValue = null;
    this.drawTimerStatus = null;
    this.displayedDrawSeconds = null;
    this.lastDrawTimerShakeMilliseconds = 0;
    this.drawTimerShakeDirection = 1;
    this.drawStartControl = null;
    this.freeDrawControl = null;
    this.playerDrawMode = 'unselected';
    this.communityThemeAvailable = true;
    this.communityThemeUnavailableMessage = '';
    this.freeSubmissionId = null;
    this.submitting = false;
    this.errorPanelRef = null;
    this.livingPaper = null;
    this.stickers = null;
    this.stickerButtonLabel = null;
    this.drawerOpen = false;
    this.previewTimer = null;
    this.analysisWorker = null;
    this.analysisRequestId = 0;
    this.birthContinuationStarted = false;
    this.firstFightButton = null;
    this.firstFightButtonLabel = null;
    this.firstFightControl = null;
    this.firstFightPromise = null;
    this.firstFightPromiseCopy = null;
    this.firstFightStatus = null;
    this.firstFightLoadingTween = null;
    this.canvasDareOverlay = null;
    this.dailyDare = null;
    this.dailyDareTwist = null;
    this.isFirstScribbit = false;
    this.practiceRoles = [];
    this.practiceAttemptCount = 0;
    this.pendingPracticeReport = null;
    this.localAutomationBridge = null;
    this.drawConfirmation = null;
    this.submissionLoading = null;
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
    stopSoundtrack();

    const arena = getArena(this);
    if (!arena) {
      this.scene.start('Preloader');
      return;
    }
    const todayFreeDrawing = this.practiceMode
      ? null
      : getTodayFreeDrawing(arena);
    if (todayFreeDrawing) {
      this.buildFreeDrawingViewer(todayFreeDrawing);
      this.events.once('shutdown', () => this.cleanup());
      this.events.once('destroy', () => this.cleanup());
      return;
    }
    if (this.practiceMode) {
      if (!arena.loggedIn) {
        showToast('Log in to open the server-checked Practice Lab.');
        this.scene.start('ScribbitHome');
        return;
      }
    } else {
      const eligibility = getDrawEligibility(arena);
      if (!eligibility.canDraw) {
        showToast(eligibility.message);
        this.scene.start('ScribbitHome');
        return;
      }
      const communityEligibility = getCommunityThemeEligibility(arena);
      this.communityThemeAvailable = communityEligibility.canJoin;
      this.communityThemeUnavailableMessage = communityEligibility.message;
    }
    this.isFirstScribbit = !this.practiceMode && arena.myScribbits.length === 0;
    const practiceSession = this.practiceMode ? getPracticeSession(this) : null;
    this.practiceRoles = practiceSession ? [...practiceSession.triedRoles] : [];
    this.practiceAttemptCount = practiceSession?.attemptCount ?? 0;
    this.dailyDare = this.practiceMode
      ? selectPracticeDoodleDare(
          this.practiceRoles,
          arena.dayNumber,
          arena.myUsername,
          this.practiceAttemptCount
        )
      : selectCommunityDoodleDare(arena.dayNumber);
    this.dailyDareTwist = selectDailyDoodleDareTwist(
      arena.dayNumber + (this.practiceMode ? this.practiceAttemptCount : 0),
      arena.myUsername
    );
    this.cameras.main.setBackgroundColor(UI.desk);
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
    this.installLocalDrawAutomationApi();
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
    this.sceneVisitEpoch += 1;
    stopSoundtrack();
    this.removeLocalDrawAutomationApi();
    window.removeEventListener('resize', this.resizeHandler);
    window.visualViewport?.removeEventListener(
      'resize',
      this.visualViewportResizeHandler
    );
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.drawRoundTimerEvent?.remove();
    this.drawRoundTimerEvent = null;
    this.analysisWorker?.terminate();
    this.analysisWorker = null;
    this.canvas?.destroy();
    this.overlay?.destroy();
    this.drawConfirmation?.destroy();
    this.drawConfirmation = null;
    this.hideSubmissionLoading();
    this.headerControlOverlay?.destroy();
    this.headerControlOverlay = null;
    this.toolControlOverlay?.destroy();
    this.toolControlOverlay = null;
    this.submitOverlay?.destroy();
    this.submitOverlay = null;
    this.revealControlOverlay?.destroy();
    this.revealControlOverlay = null;
    this.firstFightLoadingTween?.stop();
    this.firstFightLoadingTween = null;
    this.firstFightButton = null;
    this.firstFightButtonLabel = null;
    this.firstFightControl = null;
    this.firstFightPromise = null;
    this.firstFightPromiseCopy = null;
    this.firstFightStatus = null;
    this.submitControl = null;
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.stickers?.destroy();
    this.stickers = null;
  }

  private startAnalyzerWorker(): void {
    try {
      const worker = new AnalyzerWorker();
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
      y: this.canvasCenterY() - square / 2,
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
    const sceneVisitEpoch = this.sceneVisitEpoch;
    const requestEpoch = this.stickerInventoryRequestEpoch + 1;
    this.stickerInventoryRequestEpoch = requestEpoch;
    const result = await fetchInventory();
    if (
      !this.isCurrentSceneVisit(sceneVisitEpoch) ||
      requestEpoch !== this.stickerInventoryRequestEpoch ||
      this.submitting
    ) {
      return;
    }

    const items = result.ok ? result.data.items : {};

    if (this.stickers) {
      this.stickers.updateInventory(items);
      this.updateStickerButton();
      return;
    }

    this.stickers = new StickerAttach(this, {
      items,
      canvasRect: this.canvasRect(),
      onChange: () => {
        this.updateStickerButton();
      },
    });
    this.stickers.setEnabled(this.isDrawingInputActive());
    this.updateStickerButton();
  }
  private updateStickerButton(): void {
    const count = this.stickers?.count ?? 0;
    this.stickerButtonLabel?.setText(count > 0 ? `${count}/2` : '');
  }

  private toggleStickerDrawer(): void {
    if (!this.isDrawingInputActive() || !this.stickers) return;
    if (!this.stickers.hasAnyOwned()) {
      showToast(
        'Win accessories from the capsule machine to sticker your scribbit!'
      );
      return;
    }
    this.drawerOpen = !this.drawerOpen;
    if (this.drawerOpen)
      this.stickers.openDrawer(
        this.canvasCenterY() + Draw.CANVAS_SQUARE / 2 + 96
      );
    else this.stickers.closeDrawer();
  }

  // Every exit from Draw routes through here so the DOM overlay is torn down
  // synchronously — we never depend on shutdown-event timing to remove it.
  private exitTo(sceneKey: string): void {
    this.cleanup();
    DomOverlay.destroyAll();
    startScene(this, sceneKey);
  }

  private exitDraw(): void {
    if (this.isFirstScribbit && !this.practiceMode) {
      showToast('Draw your first Scribbit to unlock Home.');
      return;
    }
    if (this.practiceMode) endPracticeSession(this);
    this.exitTo('ScribbitHome');
  }

  private closeDrawStartPopup(): void {
    if (this.practiceMode) endPracticeSession(this);
    this.exitTo(this.isFirstScribbit ? 'ArenaHome' : 'ScribbitHome');
  }

  // --- Layout budget (720x1280 design space) --------------------------------
  // Canvas is the hero. Official Draw ends with NEXT; Practice keeps its
  // progress note and direct power check in the lower footer.
  private static readonly CANVAS_CENTER_Y = 426;
  private static readonly CANVAS_SQUARE = 620;
  private static readonly LIVE_STATS_Y = 792;
  private static readonly TOOLS_Y = 986;
  private static readonly SUBMIT_Y = 1222;

  private verticalLayoutSlack(): number {
    return Math.max(0, this.scale.height - 1280);
  }

  private canvasCenterY(): number {
    return Math.round(Draw.CANVAS_CENTER_Y + this.verticalLayoutSlack() * 0.15);
  }

  private liveStatsY(): number {
    return Math.round(Draw.LIVE_STATS_Y + this.verticalLayoutSlack() * 0.36);
  }

  private toolsY(): number {
    return Math.round(Draw.TOOLS_Y + this.verticalLayoutSlack() * 0.58);
  }

  private submitCenterY(): number {
    return Math.max(Draw.SUBMIT_Y, this.scale.height - NAV_SAFE - 70);
  }

  private practiceProgressY(): number {
    return this.submitCenterY() - 70;
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

  private buildFreeDrawingViewer(drawing: FreeDrawing): void {
    const { width, height } = this.scale;
    const actionY = height - NAV_SAFE - 70;
    const cardTop = 130;
    const cardBottom = actionY - 80;
    const cardHeight = cardBottom - cardTop;
    const cardWidth = width - 100;
    const card = stickerCard(
      this,
      width / 2,
      (cardTop + cardBottom) / 2,
      cardWidth,
      cardHeight,
      { tape: false }
    );

    this.cameras.main.setBackgroundColor(UI.desk);
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    card.setDepth(2);

    this.headerControlOverlay = new CanvasActionOverlay(this);
    this.headerControlOverlay.setRootAttributes({
      'aria-label': 'Drawing navigation',
    });
    ghostButton(this, 72, 54, '‹', () => this.exitDraw(), 88).setDepth(3);
    this.addNativeControl(
      'Back to Arena',
      22,
      4,
      100,
      100,
      () => this.exitDraw(),
      true,
      this.headerControlOverlay
    );
    screenTitle(this, width / 2, 6, translate('screen.draw'), {
      maxWidth: 320,
      maxHeight: 76,
    }).setDepth(3);

    const status = label(
      this,
      0,
      -cardHeight / 2 + 58,
      translate('freeDraw.savedToday'),
      26,
      UI.coralText,
      true
    );
    const imageSize = Math.min(cardWidth - 72, cardHeight - 220);
    const imageFrame = this.add.graphics();
    imageFrame.fillStyle(UI.creamHex, 1);
    imageFrame.fillRoundedRect(
      -imageSize / 2 - 8,
      -imageSize / 2 - 8,
      imageSize + 16,
      imageSize + 16,
      16
    );
    imageFrame.lineStyle(4, UI.inkHex, 0.82);
    imageFrame.strokeRoundedRect(
      -imageSize / 2 - 8,
      -imageSize / 2 - 8,
      imageSize + 16,
      imageSize + 16,
      16
    );
    const name = label(
      this,
      0,
      cardHeight / 2 - 66,
      drawing.name,
      40,
      UI.ink,
      true
    );
    name.setWordWrapWidth(cardWidth - 72);
    card.add([status, imageFrame, name]);

    void loadDrawing(this, { ...drawing, element: 'ember' }).then(
      (textureKey) => {
        if (
          !this.scene.isActive() ||
          !card.active ||
          getTodayFreeDrawing(getArena(this))?.id !== drawing.id
        ) {
          return;
        }
        card.add(fitDrawing(this.add.image(0, 0, textureKey), imageSize - 20));
      }
    );

    iconButton(
      this,
      width / 2,
      actionY,
      'pencil',
      translate('freeDraw.practice'),
      () => this.startPracticeFromFreeDrawing(),
      width - EDGE * 2,
      UI.coral,
      UI.ink
    ).setDepth(3);
    this.submitOverlay = new CanvasActionOverlay(this);
    this.submitOverlay.setRootAttributes({
      'aria-label': `Saved today: ${drawing.name}`,
    });
    this.addNativeControl(
      'Practice with a temporary fighter',
      EDGE,
      actionY - 50,
      width - EDGE * 2,
      100,
      () => this.startPracticeFromFreeDrawing(),
      true,
      this.submitOverlay
    );
  }

  private startPracticeFromFreeDrawing(): void {
    beginPracticeSession(this);
    this.cleanup();
    DomOverlay.destroyAll();
    startScene(this, 'Draw', { mode: 'practice' });
  }

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    // Back stays left while the larger title centers over the drawing surface.
    if (!this.isFirstScribbit) {
      ghostButton(this, 72, 54, '‹', () => this.exitDraw(), 88);
      this.addNativeControl(
        'Back to Home',
        22,
        4,
        100,
        100,
        () => this.exitDraw(),
        true,
        this.headerControlOverlay
      );
    }
    screenTitle(
      this,
      width / 2,
      6,
      translate(this.practiceMode ? 'screen.practice' : 'screen.draw'),
      { maxWidth: 320, maxHeight: 76 }
    );
    this.buildDrawTimer();

    // Hero canvas frame — the DOM canvas sits on top of this at the same rect.
    const square = Draw.CANVAS_SQUARE;
    const frame = this.add.graphics();
    const left = width / 2 - square / 2 - 8;
    const top = this.canvasCenterY() - square / 2 - 8;
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRoundedRect(left, top, square + 16, square + 16, 16);
    frame.lineStyle(6, UI.goldHex, 1);
    frame.strokeRoundedRect(left, top, square + 16, square + 16, 16);
    frame.lineStyle(3, UI.inkHex, 0.7);
    frame.strokeRoundedRect(left + 6, top + 6, square + 4, square + 4, 12);

    this.buildLiveStatsStrip(this.liveStatsY());
    this.buildToolsBand(this.toolsY());
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

  private isUntimedDrawingMode(): boolean {
    return (
      this.practiceMode || this.automationMode || this.playerDrawMode === 'free'
    );
  }

  private createDrawClockIcon(size: number): HTMLSpanElement {
    const icon = document.createElement('span');
    Object.assign(icon.style, {
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      flex: `0 0 ${size}px`,
      border: `${Math.max(3, Math.round(size * 0.1))}px solid ${UI.ink}`,
      borderRadius: '50%',
      background: '#ffd447',
      boxSizing: 'border-box',
    });
    const hourHand = document.createElement('span');
    Object.assign(hourHand.style, {
      position: 'absolute',
      left: 'calc(50% - 2px)',
      top: '17%',
      width: '4px',
      height: '33%',
      borderRadius: '2px',
      background: UI.ink,
    });
    const minuteHand = document.createElement('span');
    minuteHand.className = 'draw-clock-minute-hand';
    Object.assign(minuteHand.style, {
      position: 'absolute',
      left: 'calc(50% - 2px)',
      top: 'calc(50% - 2px)',
      width: '29%',
      height: '4px',
      borderRadius: '2px',
      background: UI.ink,
      transform: 'rotate(24deg)',
      transformOrigin: '2px 2px',
    });
    icon.append(hourHand, minuteHand);
    return icon;
  }

  private buildDrawTimer(): void {
    if (this.isUntimedDrawingMode()) return;
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    Object.assign(container.style, {
      pointerEvents: 'none',
      zIndex: '6',
    });
    const face = document.createElement('div');
    Object.assign(face.style, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '18px',
      boxSizing: 'border-box',
      borderRadius: '28px',
      boxShadow: '0 5px 0 rgba(43, 32, 22, 0.2)',
      transformOrigin: 'center',
    });
    const clockIcon = this.createDrawClockIcon(38);
    const timerValue = document.createElement('span');
    Object.assign(timerValue.style, {
      minWidth: '82px',
      color: UI.ink,
      fontFamily: FONT_STACK,
      fontSize: '38px',
      fontWeight: '800',
      lineHeight: '1',
      textAlign: 'center',
    });
    timerValue.textContent = '60s';
    face.append(clockIcon, timerValue);
    container.append(face);
    this.drawTimerContainer = container;
    this.drawTimerFace = face;
    this.drawTimerValue = timerValue;
    this.drawTimerStatus =
      this.headerControlOverlay?.addStatus(
        'Choose the 60 second Community Theme or an untimed Free Draw.'
      ) ?? null;
    this.renderDrawTimer();
  }

  private isWaitingToStart(): boolean {
    return (
      !this.isUntimedDrawingMode() &&
      !this.drawRoundClock.started &&
      !this.drawingLocked
    );
  }

  private isDrawingInputActive(): boolean {
    return !this.drawingLocked && !this.isWaitingToStart();
  }

  private beginDrawingRound(): void {
    if (!this.isWaitingToStart() || this.submitting || this.drawConfirmation) {
      return;
    }
    if (!this.communityThemeAvailable) {
      showToast(this.communityThemeUnavailableMessage);
      return;
    }
    this.playerDrawMode = 'community';
    this.canvas.element.setAttribute(
      'aria-label',
      `Draw your Scribbit. The 60 second round is running. Its shape and colors choose how it fights.${this.isFirstScribbit ? ' First run: draw, watch it fight, and earn Ink.' : ''}`
    );
    this.setCanvasDareVisible(false);
    this.startDrawingRound();
  }

  private beginFreeDrawing(): void {
    if (!this.isWaitingToStart() || this.submitting || this.drawConfirmation) {
      return;
    }
    if (this.isFirstScribbit) {
      showToast('Draw your first Scribbit to unlock Free Draw.');
      return;
    }
    this.playerDrawMode = 'free';
    this.canvas.element.setAttribute(
      'aria-label',
      'Untimed Free Draw. This drawing is saved separately and does not enter the Community Rumble.'
    );
    this.setCanvasDareVisible(false);
    this.syncDrawingInteractionState();
    this.drawTimerStatus?.replaceChildren(
      document.createTextNode(
        'Free Draw selected. There is no timer and no Rumble entry.'
      )
    );
    requestAnimationFrame(() => this.canvas.element.focus());
  }

  private startDrawingRound(): void {
    if (
      this.isUntimedDrawingMode() ||
      this.drawingLocked ||
      this.submitting ||
      this.drawConfirmation
    ) {
      return;
    }
    const wasStarted = this.drawRoundClock.started;
    this.drawRoundClock = startDrawRoundClock(this.drawRoundClock, Date.now());
    if (this.drawRoundClock.deadlineMilliseconds === null) return;
    if (wasStarted) resumeDrawingSoundtrack();
    else startDrawingSoundtrack();
    this.drawRoundTimerEvent ??= this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this.tickDrawingRound(),
    });
    this.syncDrawingInteractionState();
    this.renderDrawTimer();
    if (wasStarted || !this.drawTimerFace || prefersReducedMotion()) return;
    this.drawTimerStatus?.replaceChildren(
      document.createTextNode('Drawing timer started. 60 seconds remaining.')
    );
    this.drawTimerFace.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.08, 0.94)' },
        { transform: 'scale(1)' },
      ],
      { duration: 180, easing: 'ease-out' }
    );
  }

  private pauseDrawingRound(): void {
    if (this.isUntimedDrawingMode()) return;
    pauseDrawingSoundtrack();
    this.drawRoundClock = pauseDrawRoundClock(this.drawRoundClock, Date.now());
    this.drawRoundTimerEvent?.remove();
    this.drawRoundTimerEvent = null;
    this.renderDrawTimer();
  }

  private tickDrawingRound(): void {
    const nowMilliseconds = Date.now();
    const snapshot = readDrawRoundClock(this.drawRoundClock, nowMilliseconds);
    if (snapshot.expired) {
      this.finishDrawingRound();
      return;
    }
    this.renderDrawTimer();
  }

  private renderDrawTimer(): void {
    if (
      this.isUntimedDrawingMode() ||
      !this.drawTimerContainer ||
      !this.drawTimerFace ||
      !this.drawTimerValue
    ) {
      return;
    }
    const nowMilliseconds = Date.now();
    const snapshot = readDrawRoundClock(this.drawRoundClock, nowMilliseconds);
    const secondChanged =
      this.displayedDrawSeconds !== snapshot.remainingSeconds;
    this.displayedDrawSeconds = snapshot.remainingSeconds;

    const critical =
      snapshot.expired || (snapshot.urgent && snapshot.remainingSeconds <= 3);
    this.drawTimerFace.style.background = critical
      ? '#e0512f'
      : snapshot.urgent
        ? '#ff6b4a'
        : UI.cream;
    this.drawTimerFace.style.border = `${snapshot.urgent || snapshot.expired ? 3 : 2}px solid ${snapshot.urgent && !critical ? '#e0512f' : UI.ink}`;
    this.drawTimerFace.style.opacity = snapshot.started ? '1' : '0.88';
    this.drawTimerValue.textContent = snapshot.expired
      ? 'TIME'
      : `${snapshot.remainingSeconds}s`;
    this.drawTimerValue.style.color =
      snapshot.urgent || snapshot.expired ? UI.cream : UI.ink;
    this.drawTimerValue.style.opacity = snapshot.started ? '1' : '0.76';

    if (snapshot.running && secondChanged) {
      if (snapshot.remainingSeconds <= 10) playSfx('draw.tick');
      if (snapshot.remainingSeconds === 10 || snapshot.remainingSeconds === 5) {
        this.drawTimerStatus?.replaceChildren(
          document.createTextNode(
            `${snapshot.remainingSeconds} seconds remaining.`
          )
        );
      }
    }
    this.animateDrawTimerUrgency(snapshot.remainingSeconds, nowMilliseconds);
  }

  private animateDrawTimerUrgency(
    remainingSeconds: number,
    nowMilliseconds: number
  ): void {
    if (!this.drawTimerFace || prefersReducedMotion()) return;
    const motion = getDrawRoundUrgencyMotion(remainingSeconds);
    if (
      !motion ||
      nowMilliseconds - this.lastDrawTimerShakeMilliseconds <
        motion.intervalMilliseconds
    ) {
      return;
    }
    this.lastDrawTimerShakeMilliseconds = nowMilliseconds;
    this.drawTimerShakeDirection *= -1;
    const critical = remainingSeconds <= 3;
    this.drawTimerFace
      .getAnimations()
      .forEach((animation) => animation.cancel());
    const angle = this.drawTimerShakeDirection * motion.angleDegrees;
    const peakTransform = `rotate(${angle}deg) scale(${motion.scale}, ${2 - motion.scale})`;
    const cycles = critical ? 2 : 1;
    this.drawTimerFace.animate(
      [
        { transform: `rotate(${-angle * 0.45}deg) scale(1)` },
        { transform: peakTransform },
        { transform: 'rotate(0deg) scale(1)' },
      ],
      {
        duration: (critical ? 90 : remainingSeconds <= 6 ? 110 : 140) * cycles,
        easing: 'ease-in-out',
      }
    );
  }

  private finishDrawingRound(): void {
    if (this.isUntimedDrawingMode() || this.drawingLocked) return;
    pauseDrawingSoundtrack();
    this.drawRoundClock = expireDrawRoundClock(this.drawRoundClock);
    this.drawRoundTimerEvent?.remove();
    this.drawRoundTimerEvent = null;
    this.setDrawingLocked(true);
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.refreshPreview();
    this.renderDrawTimer();

    const result = this.lastResult;
    if (!result || !hasMinimumDrawingInk(result)) {
      this.drawTimerStatus?.replaceChildren(
        document.createTextNode(
          'Time is up. The drawing needs more ink, so a fresh round will begin.'
        )
      );
      showToast('Too little ink — fresh 60-second round.');
      this.time.delayedCall(500, () => this.resetExpiredDrawingRound());
      return;
    }

    this.drawTimerStatus?.replaceChildren(
      document.createTextNode('Time is up. Opening the naming preview.')
    );
    showToast('Time! Name your Scribbit.');
    this.time.delayedCall(320, () => {
      if (!this.scene.isActive() || this.submitting || this.drawConfirmation) {
        return;
      }
      this.continueFromDrawing();
    });
  }

  private resetExpiredDrawingRound(): void {
    if (!this.scene.isActive() || this.submitting) return;
    this.drawRoundClock = createDrawRoundClock();
    this.displayedDrawSeconds = null;
    this.setDrawingLocked(false);
    this.canvas.reset();
    this.previewTimer?.remove();
    this.previewTimer = null;
    this.refreshPreview();
    this.renderDrawTimer();
    this.canvas.element.setAttribute(
      'aria-label',
      `Press Start for a 60 second Scribbit drawing round. Its shape and colors choose how it fights.${this.isFirstScribbit ? ' First run: draw, watch it fight, and earn Ink.' : ''}`
    );
    this.setCanvasDareVisible(true);
    this.drawTimerStatus?.replaceChildren(
      document.createTextNode(
        'Fresh 60 second drawing round. Press Start when you are ready.'
      )
    );
    requestAnimationFrame(() => this.drawStartControl?.focus());
  }

  private setDrawingLocked(locked: boolean): void {
    this.drawingLocked = locked;
    this.syncDrawingInteractionState();
  }

  private syncDrawingInteractionState(): void {
    const inputEnabled = this.isDrawingInputActive();
    const waitingToStart = this.isWaitingToStart();
    const controlAlpha = inputEnabled ? 1 : this.drawingLocked ? 0.32 : 0.42;
    this.canvas?.setEnabled(inputEnabled);
    if (this.canvas?.element) {
      this.canvas.element.style.opacity = waitingToStart ? '0.72' : '1';
      this.canvas.element.style.filter = waitingToStart
        ? 'brightness(0.68) saturate(0.58)'
        : 'none';
      this.canvas.element.setAttribute('aria-disabled', String(!inputEnabled));
    }
    this.stickers?.setEnabled(inputEnabled);
    if (!inputEnabled) this.drawerOpen = false;
    this.drawingControlContainers.forEach((control) => {
      control.setAlpha(controlAlpha);
      control.list.forEach((child) => {
        if (child.input) child.input.enabled = inputEnabled;
      });
    });
    this.drawingNativeControls.forEach((control) => {
      control.disabled = !inputEnabled;
      control.tabIndex = inputEnabled ? 0 : -1;
      control.setAttribute('aria-disabled', String(!inputEnabled));
    });
    if (this.drawTimerContainer) {
      this.drawTimerContainer.style.visibility =
        this.playerDrawMode === 'community' && !waitingToStart
          ? 'visible'
          : 'hidden';
      this.drawTimerContainer.style.opacity = '1';
    }
    this.updateBrushSizeControlState();
    this.updateDrawingToolStates();
    this.syncToolPageVisibility();
  }

  // The role is the primary live read. Exact analyzer stats remain in the
  // accessible canvas description and final detail sheet.
  private buildLiveStatsStrip(centerY: number): void {
    const panelWidth = this.scale.width - EDGE * 2;
    const card = this.add.graphics();
    card.fillStyle(UI.inkHex, 0.24);
    card.fillRoundedRect(EDGE + 4, centerY - 34, panelWidth, 72, 16);
    card.fillStyle(UI.creamHex, 1);
    card.fillRoundedRect(EDGE, centerY - 38, panelWidth, 72, 16);
    card.lineStyle(4, UI.goldHex, 1);
    card.strokeRoundedRect(EDGE, centerY - 38, panelWidth, 72, 16);
    this.liveRoleLabel = label(
      this,
      this.scale.width / 2,
      centerY - 13,
      'DRAW TO REVEAL YOUR ROLE',
      24,
      UI.ink,
      true
    );
    this.liveRoleDetail = label(
      this,
      this.scale.width / 2,
      centerY + 18,
      'BIG BODY · SHARP EDGES · SMALL SIZE · MANY COLORS',
      14,
      UI.inkSoft,
      true
    );
  }

  // Color and stroke history stay visible. Collectible and destructive tools
  // live one tap away so the everyday rail remains quick to scan.
  private buildToolsBand(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 300;
    const panelTop = centerY - panelH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(UI.creamHex, 0.84);
    panel.fillRoundedRect(EDGE, panelTop, panelW, panelH, 22);
    panel.lineStyle(2, UI.inkHex, 0.32);
    panel.strokeRoundedRect(EDGE, panelTop, panelW, panelH, 22);

    const paletteY = centerY - 50;
    const toolY = centerY + 100;
    this.buildPaletteRow(paletteY, panelW);

    const canUseStickers =
      !this.practiceMode && (this.getArenaState()?.myScribbits.length ?? 0) > 0;
    const roundControlWidth = 72;
    const roundInteractionWidth = 88;
    this.captureToolPage('basic', () => {
      this.buildLineWidthControl(110, toolY, 160, 168);
      this.setLineWidth(DEFAULT_LINE_WIDTH);
      this.fillToolButton = this.toolIconButton(
        248,
        toolY,
        'bucket',
        () => this.selectFill(),
        roundControlWidth,
        roundInteractionWidth
      );
      this.fillTargetSwatch = this.add
        .circle(
          23,
          -23,
          9,
          Phaser.Display.Color.HexStringToColor(this.activeStrokeColor).color,
          1
        )
        .setStrokeStyle(2, UI.inkHex, 1);
      this.fillToolButton.add(this.fillTargetSwatch);
      this.eraserToolButton = this.toolIconButton(
        346,
        toolY,
        'eraser',
        () => this.selectEraser(),
        roundControlWidth,
        roundInteractionWidth
      );
      this.eraserTargetSwatch = this.add
        .circle(
          25,
          -24,
          10,
          Phaser.Display.Color.HexStringToColor(this.activeStrokeColor).color,
          1
        )
        .setStrokeStyle(2, UI.inkHex, 1);
      this.eraserToolButton.add(this.eraserTargetSwatch);
      this.undoToolButton = this.toolIconButton(
        444,
        toolY,
        'undo',
        () => this.undoDrawing(),
        roundControlWidth,
        roundInteractionWidth
      );
      this.redoToolButton = this.toolIconButton(
        542,
        toolY,
        'redo',
        () => this.redoDrawing(),
        roundControlWidth,
        roundInteractionWidth
      );
      this.moreToolsButton = this.toolIconButton(
        640,
        toolY,
        'tools',
        () => this.setAdvancedToolsOpen(true),
        roundControlWidth,
        roundInteractionWidth,
        'More drawing tools'
      );
      this.moreToolsControl =
        this.drawingNativeControls[this.drawingNativeControls.length - 1] ??
        null;
      this.advancedToolBadge = this.add
        .circle(25, -25, 11, UI.gold, 1)
        .setStrokeStyle(3, UI.inkHex, 1)
        .setVisible(false);
      this.moreToolsButton.add(this.advancedToolBadge);
    });

    const advancedX = canUseStickers
      ? [100, 204, 308, 412, 516, 620]
      : [120, 240, 360, 480, 600];
    this.captureToolPage('advanced', () => {
      this.buildPremiumPenControl(
        advancedX[0] ?? 120,
        toolY,
        roundControlWidth,
        roundInteractionWidth
      );
      this.buildBrushSupplyControl(
        advancedX[1] ?? 240,
        toolY,
        roundControlWidth,
        roundInteractionWidth
      );
      let nextAction = 2;
      if (canUseStickers) {
        const stickerBtn = this.toolIconButton(
          advancedX[nextAction] ?? 308,
          toolY,
          'sticker',
          () => this.toggleStickerDrawer(),
          roundControlWidth,
          roundInteractionWidth
        );
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
        nextAction += 1;
      }
      this.clearToolButton = this.toolIconButton(
        advancedX[nextAction] ?? 360,
        toolY,
        'clear',
        () => this.clearDrawing(),
        roundControlWidth,
        roundInteractionWidth
      );
      nextAction += 1;
      this.toolIconButton(
        advancedX[nextAction] ?? 600,
        toolY,
        'tools',
        () => this.setAdvancedToolsOpen(false),
        roundControlWidth,
        roundInteractionWidth,
        'Back to basic drawing tools'
      );
    });
    this.setAdvancedToolsOpen(false);
  }

  private captureToolPage(
    page: 'basic' | 'advanced',
    buildControls: () => void
  ): void {
    const containerStart = this.drawingControlContainers.length;
    const nativeStart = this.drawingNativeControls.length;
    buildControls();
    const pageContainers = this.drawingControlContainers.slice(containerStart);
    const pageNativeControls = this.drawingNativeControls.slice(nativeStart);
    if (page === 'basic') {
      this.basicToolContainers.push(...pageContainers);
      this.basicToolNativeControls.push(...pageNativeControls);
      return;
    }
    this.advancedToolContainers.push(...pageContainers);
    this.advancedToolNativeControls.push(...pageNativeControls);
  }

  private setAdvancedToolsOpen(open: boolean): void {
    if (open && !this.isDrawingInputActive()) return;
    const shouldMoveFocus =
      document.activeElement instanceof HTMLButtonElement &&
      this.drawingNativeControls.includes(document.activeElement);
    this.advancedToolsOpen = open;
    if (!open && this.drawerOpen) this.toggleStickerDrawer();
    this.syncToolPageVisibility();
    if (!shouldMoveFocus) return;
    const focusTarget = open
      ? this.advancedToolNativeControls.find((control) => !control.disabled)
      : this.moreToolsControl;
    requestAnimationFrame(() => focusTarget?.focus());
  }

  private syncToolPageVisibility(): void {
    this.setToolPageVisible(
      this.basicToolContainers,
      this.basicToolNativeControls,
      !this.advancedToolsOpen
    );
    this.setToolPageVisible(
      this.advancedToolContainers,
      this.advancedToolNativeControls,
      this.advancedToolsOpen
    );
    this.updateBrushSizeControlState();
    this.updateDrawingToolStates();
    this.hideInactiveToolPage();
  }

  private setToolPageVisible(
    containers: Phaser.GameObjects.Container[],
    nativeControls: HTMLButtonElement[],
    visible: boolean
  ): void {
    const inputEnabled = this.isDrawingInputActive();
    const controlAlpha = inputEnabled ? 1 : this.drawingLocked ? 0.32 : 0.42;
    containers.forEach((container) => {
      container.setVisible(visible).setAlpha(controlAlpha);
      container.list.forEach((child) => {
        if (child.input) child.input.enabled = visible && inputEnabled;
      });
    });
    nativeControls.forEach((control) => {
      control.hidden = !visible;
      control.setAttribute('aria-hidden', String(!visible));
      control.disabled = !visible || !inputEnabled;
      control.tabIndex = visible && inputEnabled ? 0 : -1;
      control.setAttribute('aria-disabled', String(!visible || !inputEnabled));
    });
  }

  private hideInactiveToolPage(): void {
    const containers = this.advancedToolsOpen
      ? this.basicToolContainers
      : this.advancedToolContainers;
    const nativeControls = this.advancedToolsOpen
      ? this.basicToolNativeControls
      : this.advancedToolNativeControls;
    containers.forEach((container) => {
      container.setVisible(false);
      container.list.forEach((child) => {
        if (child.input) child.input.enabled = false;
      });
    });
    nativeControls.forEach((control) => {
      control.hidden = true;
      control.disabled = true;
      control.tabIndex = -1;
      control.setAttribute('aria-hidden', 'true');
      control.setAttribute('aria-disabled', 'true');
    });
  }

  private playControlFeedback(
    control: Phaser.GameObjects.Container,
    style: 'pop' | 'shake' = 'pop',
    playSound = true
  ): void {
    if (playSound) playSfx('draw.tool');
    this.tweens.killTweensOf(control);
    control.setScale(1).setAngle(0);
    if (prefersReducedMotion()) return;

    const accentColor = style === 'shake' ? UI.coralDeep : UI.goldHex;
    const accent = this.add
      .circle(control.x, control.y, 23, 0xffffff, 0)
      .setStrokeStyle(4, accentColor, 0.9)
      .setDepth(control.depth + 2);
    this.tweens.add({
      targets: accent,
      scale: 1.85,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => accent.destroy(),
    });

    if (style === 'shake') {
      control.setAngle(-7);
      this.tweens.add({
        targets: control,
        angle: 7,
        scaleX: 1.06,
        scaleY: 0.95,
        duration: 55,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 1,
        onComplete: () => control.setScale(1).setAngle(0),
      });
      return;
    }

    this.tweens.add({
      targets: control,
      scaleX: 1.08,
      scaleY: 0.94,
      angle: -2,
      duration: 70,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => control.setScale(1).setAngle(0),
    });
  }

  private buildPaletteRow(y: number, panelWidth: number): void {
    const columns = 5;
    const rowHeight = MIN_TOUCH;
    const spacing = panelWidth / columns;
    PALETTE_COLORS.forEach((color, colorIndex) => {
      const column = colorIndex % columns;
      const row = Math.floor(colorIndex / columns);
      const colorsInRow = Math.min(
        columns,
        PALETTE_COLORS.length - row * columns
      );
      const rowLeft = EDGE + (panelWidth - colorsInRow * spacing) / 2;
      const x = rowLeft + spacing * (column + 0.5);
      const swatchY = y + (row - 0.5) * rowHeight;
      const container = this.add.container(x, swatchY);
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
          colorIndex === this.selectedColorIndex ? 6 : 2,
          colorIndex === this.selectedColorIndex ? UI.goldHex : UI.inkHex,
          colorIndex === this.selectedColorIndex ? 1 : 0.82
        );
      const hit = this.add
        .rectangle(0, 0, spacing, rowHeight, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      markSfxManaged(hit);
      container.add([swatch, hit]);
      const press = (): void => {
        container.setScale(0.9);
      };
      const release = (): void => {
        container.setScale(1);
      };
      const activate = (): void => {
        this.playControlFeedback(container);
        this.selectBaseColor(colorIndex);
      };
      bindPressInteractionEvents(
        hit,
        {
          press,
          release,
          activate,
          pressOnHover: false,
        },
        { gameTarget: this.input, shutdownTarget: this.events }
      );
      const nativeControl = this.addNativeControl(
        `Use ${PALETTE_COLOR_NAMES[colorIndex] ?? color} ink`,
        x - spacing / 2,
        swatchY - rowHeight / 2,
        spacing,
        rowHeight,
        activate
      );
      if (nativeControl) this.drawingNativeControls.push(nativeControl);
      this.paletteSwatches.push(swatch);
      this.paletteControls.push(container);
      this.drawingControlContainers.push(container);
    });
  }

  private selectBaseColor(colorIndex: number): void {
    if (!this.isDrawingInputActive()) return;
    const color = PALETTE_COLORS[colorIndex];
    if (!color) return;
    this.selectedColorIndex = colorIndex;
    this.selectedDrawingInkId = null;
    this.premiumPenIndex = -1;
    this.activeStrokeColor = color;
    const keepFillSelected = this.canvas?.isFilling() ?? false;
    this.canvas?.setColor(color);
    if (keepFillSelected) this.canvas?.setFill(color);
    this.premiumPenBackground?.setStrokeStyle(2, UI.inkHex, 0.72);
    this.paintSupplyCount?.setText('∞');
    this.refreshPaletteSelection();
    this.renderBrushSizePreview();
    this.renderBrushSupplyPreview();
    this.updatePaintTargetIndicators();
    this.updateDrawingToolStates();
  }

  private refreshPaletteSelection(): void {
    const erasing = this.canvas?.isErasing() ?? false;
    this.paletteSwatches.forEach((swatch, colorIndex) => {
      const selected = colorIndex === this.selectedColorIndex;
      swatch.setRadius(selected ? SELECTED_SWATCH_RADIUS : SWATCH_RADIUS);
      swatch.setStrokeStyle(
        selected ? 6 : 2,
        selected ? (erasing ? UI.coralDeep : UI.goldHex) : UI.inkHex,
        selected ? 1 : 0.82
      );
    });
  }

  private updatePaintTargetIndicators(): void {
    const color = Phaser.Display.Color.HexStringToColor(
      this.activeStrokeColor
    ).color;
    this.fillTargetSwatch?.setFillStyle(color, 1);
    this.eraserTargetSwatch?.setFillStyle(color, 1);
    this.fillToolControl?.setAttribute(
      'aria-label',
      'Fill a line-bounded area with the selected ink color'
    );
    this.eraserToolControl?.setAttribute(
      'aria-label',
      'Erase only the selected ink color'
    );
  }

  private unlockedPens(): PenCatalogEntry[] {
    const unlocked = new Set(this.getArenaState()?.myPens ?? []);
    return PEN_CATALOG.filter((pen) => unlocked.has(pen.id));
  }

  private paintChoices(): PaintChoice[] {
    const charges = this.getArenaState()?.myDrawingSupplies ?? {};
    return [
      ...this.unlockedPens().map(
        (entry): PaintChoice => ({ kind: 'pen', entry })
      ),
      ...DRAWING_INK_CATALOG_ENTRIES.filter(
        (entry) => (charges[entry.id] ?? 0) > 0
      ).map(
        (entry): PaintChoice => ({
          kind: 'drawing-ink',
          entry,
          charges: charges[entry.id] ?? 0,
        })
      ),
    ];
  }

  private paintChoiceColor(choice: PaintChoice | undefined): string {
    if (!choice) return this.activeStrokeColor;
    if (choice.kind === 'pen') return penSwatchColor(choice.entry);
    return choice.entry.colors[0] ?? this.activeStrokeColor;
  }

  private buildPremiumPenControl(
    x: number,
    y: number,
    width: number,
    interactionWidth: number
  ): void {
    const firstChoice = this.paintChoices()[0];
    const container = this.add.container(x, y);
    this.premiumPenControl = container;
    this.drawingControlContainers.push(container);
    this.premiumPenBackground = this.add
      .circle(0, 0, width / 2, UI.creamHex, 1)
      .setStrokeStyle(2, UI.inkHex, 0.72);
    this.premiumPenSwatch = this.add
      .circle(
        0,
        0,
        24,
        Phaser.Display.Color.HexStringToColor(
          this.paintChoiceColor(firstChoice)
        ).color,
        1
      )
      .setStrokeStyle(3, UI.inkHex, 1);
    const premiumMark = this.add
      .circle(23, -25, 13, UI.gold, 1)
      .setStrokeStyle(2, UI.inkHex, 1);
    this.paintSupplyCount = label(
      this,
      23,
      -26,
      firstChoice?.kind === 'drawing-ink'
        ? `×${firstChoice.charges}`
        : firstChoice
          ? '∞'
          : '0',
      14,
      UI.ink,
      true
    );
    const cycleMarks = this.add.graphics();
    cycleMarks.fillStyle(UI.inkHex, 0.55);
    [-8, 0, 8].forEach((offset) => cycleMarks.fillCircle(offset, 31, 1.7));
    const hit = this.add
      .rectangle(0, 0, interactionWidth, MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    markSfxManaged(hit);
    container.add([
      this.premiumPenBackground,
      this.premiumPenSwatch,
      premiumMark,
      this.paintSupplyCount,
      cycleMarks,
      hit,
    ]);
    const activate = (): void => {
      this.playControlFeedback(container, 'shake');
      this.cyclePremiumPen();
    };
    bindPressInteractionEvents(
      hit,
      {
        press: () => container.setScale(0.9),
        release: () => container.setScale(1),
        activate,
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    const nativeControl = this.addNativeControl(
      'Cycle permanent pens and collectible paint charges',
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth,
      MIN_TOUCH,
      activate
    );
    if (nativeControl) this.drawingNativeControls.push(nativeControl);
  }

  private cyclePremiumPen(): void {
    if (!this.isDrawingInputActive()) return;
    const choices = this.paintChoices();
    if (choices.length === 0) {
      showToast('Find collectible paints in Mystery Ink.');
      return;
    }
    const nextIndex = (this.premiumPenIndex + 1) % choices.length;
    const choice = choices[nextIndex];
    if (!choice) return;
    if (
      choice.kind === 'drawing-ink' &&
      this.usedDrawingInkId !== null &&
      this.usedDrawingInkId !== choice.entry.id
    ) {
      showToast('One collectible paint charge per Scribbit.');
      return;
    }
    this.premiumPenIndex = nextIndex;
    this.selectedDrawingInkId =
      choice.kind === 'drawing-ink' ? choice.entry.id : null;
    const keepFillSelected = this.canvas?.isFilling() ?? false;
    this.canvas?.setPen(choice.entry.effect, [...choice.entry.colors]);
    this.activeStrokeColor = this.paintChoiceColor(choice);
    if (keepFillSelected) this.canvas?.setFill(this.activeStrokeColor);
    this.premiumPenSwatch?.setFillStyle(
      Phaser.Display.Color.HexStringToColor(this.activeStrokeColor).color,
      1
    );
    this.paintSupplyCount?.setText(
      choice.kind === 'drawing-ink' ? `×${choice.charges}` : '∞'
    );
    this.selectedColorIndex = -1;
    this.refreshPaletteSelection();
    this.premiumPenBackground?.setStrokeStyle(4, UI.goldHex, 1);
    this.renderBrushSizePreview();
    this.renderBrushSupplyPreview();
    this.updatePaintTargetIndicators();
    this.updateDrawingToolStates();
  }

  private ownedBrushes(): CosmeticBrushCatalogEntry[] {
    const charges = this.getArenaState()?.myDrawingSupplies ?? {};
    return BRUSH_CATALOG_ENTRIES.filter(
      (entry) => (charges[entry.id] ?? 0) > 0
    );
  }

  private buildBrushSupplyControl(
    x: number,
    y: number,
    width: number,
    interactionWidth: number
  ): void {
    const container = this.add.container(x, y);
    this.brushSupplyControl = container;
    this.drawingControlContainers.push(container);
    this.brushSupplyBackground = this.add
      .circle(0, 0, width / 2, UI.creamHex, 1)
      .setStrokeStyle(2, UI.inkHex, 0.72);
    this.brushSupplyPreview = this.add.graphics();
    const countBadge = this.add
      .circle(23, -25, 13, UI.gold, 1)
      .setStrokeStyle(2, UI.inkHex, 1);
    this.brushSupplyCount = label(this, 23, -26, '∞', 14, UI.ink, true);
    const hit = this.add
      .rectangle(0, 0, interactionWidth, MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    markSfxManaged(hit);
    container.add([
      this.brushSupplyBackground,
      this.brushSupplyPreview,
      countBadge,
      this.brushSupplyCount,
      hit,
    ]);
    this.renderBrushSupplyPreview();
    const activate = (): void => {
      this.playControlFeedback(container, 'shake');
      this.cycleBrushSupply();
    };
    bindPressInteractionEvents(
      hit,
      {
        press: () => container.setScale(0.9),
        release: () => container.setScale(1),
        activate,
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    const nativeControl = this.addNativeControl(
      'Cycle brush style. Round brush is unlimited',
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth,
      MIN_TOUCH,
      activate
    );
    if (nativeControl) this.drawingNativeControls.push(nativeControl);
  }

  private cycleBrushSupply(): void {
    if (!this.isDrawingInputActive()) return;
    const brushes = this.ownedBrushes();
    if (brushes.length === 0) {
      showToast('Round brush is unlimited. Find brush charges in Mystery Ink.');
      return;
    }
    const nextIndex =
      this.brushSupplyIndex + 1 >= brushes.length
        ? -1
        : this.brushSupplyIndex + 1;
    const brush = nextIndex >= 0 ? brushes[nextIndex] : undefined;
    if (brush && this.usedBrushId !== null && this.usedBrushId !== brush.id) {
      showToast('One collectible brush charge per Scribbit.');
      return;
    }
    this.brushSupplyIndex = nextIndex;
    this.selectedBrushId = brush?.id ?? null;
    this.selectedBrushEffect = brush?.effect ?? null;
    this.canvas?.setBrushEffect(this.selectedBrushEffect);
    this.brushSupplyCount?.setText(
      brush
        ? `×${this.getArenaState()?.myDrawingSupplies?.[brush.id] ?? 0}`
        : '∞'
    );
    this.brushSupplyBackground?.setStrokeStyle(
      brush ? 4 : 2,
      brush ? UI.goldHex : UI.inkHex,
      brush ? 1 : 0.72
    );
    this.refreshPaletteSelection();
    this.renderBrushSizePreview();
    this.renderBrushSupplyPreview();
    this.updateDrawingToolStates();
  }

  private renderBrushSupplyPreview(): void {
    const preview = this.brushSupplyPreview;
    if (!preview) return;
    preview.clear();
    const color = Phaser.Display.Color.HexStringToColor(
      this.activeStrokeColor
    ).color;
    const drawSegment = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      width: number,
      alpha = 1
    ): void => {
      preview.lineStyle(width, color, alpha);
      preview.lineBetween(fromX, fromY, toX, toY);
      preview.fillStyle(color, alpha);
      preview.fillCircle(fromX, fromY, width / 2);
      preview.fillCircle(toX, toY, width / 2);
    };

    if (this.selectedBrushEffect === 'chalk') {
      drawSegment(-27, 7, -7, 1, 8, 0.62);
      drawSegment(-2, -1, 18, -7, 8, 0.46);
      drawSegment(22, -8, 27, -10, 5, 0.35);
      return;
    }
    if (this.selectedBrushEffect === 'ribbon') {
      drawSegment(-28, 9, 28, -8, 13, 0.84);
      preview.lineStyle(3, UI.creamHex, 0.75);
      preview.lineBetween(-25, 5, 25, -5);
      return;
    }
    if (this.selectedBrushEffect === 'spray') {
      const dots = [
        [-25, 7, 4],
        [-16, -7, 6],
        [-5, 4, 5],
        [7, -5, 7],
        [18, 6, 4],
        [27, -8, 5],
      ] as const;
      preview.fillStyle(color, 0.88);
      dots.forEach(([dotX, dotY, radius]) =>
        preview.fillCircle(dotX, dotY, radius)
      );
      return;
    }
    drawSegment(-28, 8, 28, -8, 12);
  }

  private toolIconButton(
    x: number,
    y: number,
    icon: PaperToolIconKey,
    onClick: () => void,
    width = 88,
    interactionWidth = Math.max(width, MIN_TOUCH),
    accessibleLabelOverride?: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    this.drawingControlContainers.push(container);
    const bg = this.add
      .circle(0, 0, width / 2, UI.creamHex, 1)
      .setStrokeStyle(2, UI.inkHex, 0.72);
    const glyph = paperToolIcon(this, icon, 0, 0, Math.min(40, width * 0.55));
    const hit = this.add
      .rectangle(0, 0, interactionWidth, MIN_TOUCH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    markSfxManaged(hit);
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
    const activate = (): void => {
      this.playControlFeedback(container, icon === 'eraser' ? 'shake' : 'pop');
      onClick();
    };
    bindPressInteractionEvents(
      hit,
      {
        press,
        release,
        activate,
        pressOnHover: false,
      },
      {
        gameTarget: this.input,
        shutdownTarget: this.events,
      }
    );
    const accessibleLabel =
      accessibleLabelOverride ??
      (icon === 'sticker'
        ? 'Add an accessory sticker'
        : icon === 'bucket'
          ? 'Fill a line-bounded area with the selected ink color'
          : icon === 'eraser'
            ? 'Erase only the selected ink color'
            : icon === 'clear'
              ? 'Clear drawing'
              : icon === 'undo'
                ? 'Undo last stroke'
                : icon === 'redo'
                  ? 'Redo last stroke'
                  : 'More drawing tools');
    const nativeControl = this.addNativeControl(
      accessibleLabel,
      x - interactionWidth / 2,
      y - MIN_TOUCH / 2,
      interactionWidth,
      MIN_TOUCH,
      activate
    );
    if (nativeControl) this.drawingNativeControls.push(nativeControl);
    if (icon === 'bucket') this.fillToolControl = nativeControl;
    if (icon === 'eraser') this.eraserToolControl = nativeControl;
    if (icon === 'clear') this.clearToolControl = nativeControl;
    if (icon === 'undo') this.undoToolControl = nativeControl;
    if (icon === 'redo') this.redoToolControl = nativeControl;
    return container;
  }

  private currentSupplyUsage(): SupplyUsage {
    return {
      drawingInkId: this.usedDrawingInkId,
      brushId: this.usedBrushId,
    };
  }

  private restoreSupplyUsage(usage: SupplyUsage): void {
    this.usedDrawingInkId = usage.drawingInkId;
    this.usedBrushId = usage.brushId;
  }

  private pushSupplyUsageHistory(): void {
    this.supplyRedoHistory = [];
    this.supplyHistory.push(this.currentSupplyUsage());
    if (this.supplyHistory.length > 10) this.supplyHistory.shift();
  }

  private playActiveDrawingToolFeedback(change: DrawCanvasChange): void {
    if (change === 'erase') {
      if (this.eraserToolButton) {
        this.playControlFeedback(this.eraserToolButton, 'shake', false);
      }
      return;
    }
    if (change === 'fill') {
      if (this.fillToolButton) {
        this.playControlFeedback(this.fillToolButton, 'pop', false);
      }
    } else if (change !== 'draw') {
      return;
    }

    const paintControl =
      this.selectedColorIndex >= 0
        ? this.paletteControls[this.selectedColorIndex]
        : this.premiumPenControl;
    if (paintControl) this.playControlFeedback(paintControl, 'shake', false);
    if (
      change === 'draw' &&
      this.selectedBrushEffect &&
      this.brushSupplyControl
    ) {
      this.playControlFeedback(this.brushSupplyControl, 'shake', false);
    }
  }

  private handleDrawingChanged(change: DrawCanvasChange): void {
    if (change === 'draw' || change === 'erase' || change === 'fill') {
      playSfx('draw.ink');
    }
    if (change === 'undo') {
      const previous = this.supplyHistory.pop();
      if (previous) {
        this.supplyRedoHistory.push(this.currentSupplyUsage());
        this.restoreSupplyUsage(previous);
      }
    } else if (change === 'redo') {
      const next = this.supplyRedoHistory.pop();
      if (next) {
        this.supplyHistory.push(this.currentSupplyUsage());
        this.restoreSupplyUsage(next);
      }
    } else {
      this.pushSupplyUsageHistory();
      if (change === 'clear') {
        this.usedDrawingInkId = null;
        this.usedBrushId = null;
      } else if (change === 'draw') {
        this.usedDrawingInkId ??= this.selectedDrawingInkId;
        this.usedBrushId ??= this.selectedBrushId;
      } else if (change === 'fill') {
        this.usedDrawingInkId ??= this.selectedDrawingInkId;
      }
    }
    this.playActiveDrawingToolFeedback(change);
    this.updateDrawingToolStates();
    this.schedulePreview();
  }

  private selectEraser(): void {
    if (!this.isDrawingInputActive()) return;
    this.canvas?.setEraser(this.activeStrokeColor);
    this.updatePaintTargetIndicators();
    this.refreshPaletteSelection();
    this.renderBrushSizePreview();
    this.updateDrawingToolStates();
  }

  private selectFill(): void {
    if (!this.isDrawingInputActive()) return;
    this.canvas?.setFill(this.activeStrokeColor);
    this.updatePaintTargetIndicators();
    this.refreshPaletteSelection();
    this.renderBrushSizePreview();
    this.updateDrawingToolStates();
  }

  private clearDrawing(): void {
    if (!this.isDrawingInputActive()) return;
    if (!this.lastResult || this.lastResult.inkedPixels <= 0) return;
    this.canvas?.clear();
  }

  private undoDrawing(): void {
    if (!this.isDrawingInputActive()) return;
    if (!this.canvas?.canUndo()) return;
    this.canvas.undo();
  }

  private redoDrawing(): void {
    if (!this.isDrawingInputActive()) return;
    if (!this.canvas?.canRedo()) return;
    this.canvas.redo();
  }

  private updateDrawingToolStates(): void {
    const editable = this.isDrawingInputActive();
    const filling = this.canvas?.isFilling() ?? false;
    const erasing = this.canvas?.isErasing() ?? false;
    const hasInk = (this.lastResult?.inkedPixels ?? 0) > 0;
    const canUndo = this.canvas?.canUndo() ?? false;
    const canRedo = this.canvas?.canRedo() ?? false;
    this.setToolButtonState(this.fillToolButton, editable, filling);
    this.setToolButtonState(this.eraserToolButton, editable, erasing);
    this.setToolButtonState(this.clearToolButton, editable && hasInk, false);
    this.setToolButtonState(this.undoToolButton, editable && canUndo, false);
    this.setToolButtonState(this.redoToolButton, editable && canRedo, false);
    this.setNativeToolControlState(this.fillToolControl, editable, filling);
    this.setNativeToolControlState(this.eraserToolControl, editable, erasing);
    this.setNativeToolControlState(this.clearToolControl, editable && hasInk);
    this.setNativeToolControlState(this.undoToolControl, editable && canUndo);
    this.setNativeToolControlState(this.redoToolControl, editable && canRedo);
    this.refreshAdvancedToolIndicator();
  }

  private refreshAdvancedToolIndicator(): void {
    const specialPaintActive = this.premiumPenIndex >= 0;
    const specialBrushActive = this.selectedBrushId !== null;
    const active = specialPaintActive || specialBrushActive;
    this.advancedToolBadge
      ?.setVisible(active)
      .setFillStyle(
        specialPaintActive
          ? Phaser.Display.Color.HexStringToColor(this.activeStrokeColor).color
          : UI.gold,
        1
      )
      .setStrokeStyle(
        specialBrushActive ? 4 : 3,
        specialBrushActive ? UI.goldHex : UI.inkHex,
        1
      );
    const activeParts = [
      specialPaintActive ? 'special paint' : null,
      specialBrushActive ? 'collectible brush' : null,
    ].filter((part): part is string => part !== null);
    this.moreToolsControl?.setAttribute(
      'aria-label',
      activeParts.length > 0
        ? `More drawing tools. ${activeParts.join(' and ')} active`
        : 'More drawing tools'
    );
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
    if (
      !(background instanceof Phaser.GameObjects.Rectangle) &&
      !(background instanceof Phaser.GameObjects.Arc)
    ) {
      return;
    }
    background.setFillStyle(selected ? UI.tapeAlt : UI.creamHex, 1);
    background.setStrokeStyle(
      selected ? 4 : 2,
      selected ? UI.coralDeep : UI.inkHex,
      selected ? 1 : 0.72
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
    if (
      control === this.fillToolControl ||
      control === this.eraserToolControl
    ) {
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
    this.drawingControlContainers.push(preview);
    const bg = this.add.graphics();
    bg.fillStyle(UI.creamHex, 1);
    bg.fillRoundedRect(-width / 2, -38, width, 76, 24);
    bg.lineStyle(2, UI.inkHex, 0.72);
    bg.strokeRoundedRect(-width / 2, -38, width, 76, 24);
    // A single live swash makes the current width obvious; the hand-drawn
    // minus/plus marks own the two actions without looking like radio buttons.
    this.decreaseBrushSizeMark = this.add.graphics();
    this.decreaseBrushSizeMark.lineStyle(4, UI.inkHex, 1);
    this.decreaseBrushSizeMark.lineBetween(
      -interactionWidth / 4 - 13,
      0,
      -interactionWidth / 4 + 13,
      0
    );
    this.increaseBrushSizeMark = this.add.graphics();
    this.increaseBrushSizeMark.lineStyle(4, UI.inkHex, 1);
    this.increaseBrushSizeMark.lineBetween(
      interactionWidth / 4 - 13,
      0,
      interactionWidth / 4 + 13,
      0
    );
    this.increaseBrushSizeMark.lineBetween(
      interactionWidth / 4,
      -13,
      interactionWidth / 4,
      13
    );
    this.lineWidthPreviewStroke = this.add.graphics();
    this.renderBrushSizePreview();
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
    markSfxManaged(decreaseHit);
    markSfxManaged(increaseHit);
    preview.add([
      bg,
      this.decreaseBrushSizeMark,
      this.increaseBrushSizeMark,
      this.lineWidthPreviewStroke,
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
    const decreaseBrushSize = (): void => {
      if (!this.isDrawingInputActive()) return;
      this.playControlFeedback(preview);
      this.setLineWidth(this.lineWidth - LINE_WIDTH_STEP);
    };
    const increaseBrushSize = (): void => {
      if (!this.isDrawingInputActive()) return;
      this.playControlFeedback(preview);
      this.setLineWidth(this.lineWidth + LINE_WIDTH_STEP);
    };
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
    if (this.decreaseBrushSizeControl) {
      this.drawingNativeControls.push(this.decreaseBrushSizeControl);
    }
    if (this.increaseBrushSizeControl) {
      this.drawingNativeControls.push(this.increaseBrushSizeControl);
    }
  }

  private setLineWidth(width: number): void {
    this.lineWidth = Phaser.Math.Clamp(width, MIN_LINE_WIDTH, MAX_LINE_WIDTH);
    this.canvas?.setBrushSize(this.lineWidth);
    this.renderBrushSizePreview();
    this.updateBrushSizeControlState();
  }

  private updateBrushSizeControlState(): void {
    const atMinimum = this.lineWidth <= MIN_LINE_WIDTH;
    const atMaximum = this.lineWidth >= MAX_LINE_WIDTH;
    const inputEnabled = this.isDrawingInputActive();
    this.decreaseBrushSizeMark?.setAlpha(atMinimum ? 0.28 : 1);
    this.increaseBrushSizeMark?.setAlpha(atMaximum ? 0.28 : 1);
    if (this.decreaseBrushSizeControl) {
      this.decreaseBrushSizeControl.disabled = !inputEnabled || atMinimum;
      this.decreaseBrushSizeControl.setAttribute(
        'aria-disabled',
        String(!inputEnabled || atMinimum)
      );
    }
    if (this.increaseBrushSizeControl) {
      this.increaseBrushSizeControl.disabled = !inputEnabled || atMaximum;
      this.increaseBrushSizeControl.setAttribute(
        'aria-disabled',
        String(!inputEnabled || atMaximum)
      );
    }
  }

  private renderBrushSizePreview(): void {
    const preview = this.lineWidthPreviewStroke;
    if (!preview) return;
    preview.clear();
    const thickness = Phaser.Math.Clamp(this.lineWidth * 0.28, 5, 14);
    if (this.canvas?.isErasing()) {
      preview.lineStyle(thickness + 5, UI.inkHex, 1);
      preview.lineBetween(-28, 10, 28, -10);
      preview.lineStyle(thickness, UI.creamHex, 1);
      preview.lineBetween(-28, 10, 28, -10);
      return;
    }
    const color = Phaser.Display.Color.HexStringToColor(
      this.activeStrokeColor
    ).color;
    preview.lineStyle(thickness, color, 1);
    preview.lineBetween(-28, 10, 28, -10);
  }

  // The current arena snapshot (myPens/myInk live here).
  private getArenaState(): ArenaState | undefined {
    return getArena(this);
  }

  // --- DOM overlay (live canvas) --------------------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({
      onStrokeEnd: (change) => this.handleDrawingChanged(change),
    });
    this.canvas.setBrushSize(this.lineWidth);
    this.canvas.element.setAttribute(
      'aria-label',
      this.practiceMode
        ? 'Draw a temporary practice fighter. The server reads its shape and returns a reward-free battle replay.'
        : this.automationMode
          ? 'Untimed local asset drawing. This uses the same Scribbits canvas, analyzer, and PNG export as the player drawing tool.'
          : 'Choose the timed Community Theme or an untimed Free Draw.'
    );
    this.canvas.element.style.transition = prefersReducedMotion()
      ? 'none'
      : 'opacity 160ms ease-out, filter 160ms ease-out';
    const square = Draw.CANVAS_SQUARE;
    this.overlay.place(this.canvas.element, {
      x: this.scale.width / 2 - square / 2,
      y: this.canvasCenterY() - square / 2,
      width: square,
      height: square,
    });
    this.buildCanvasDareOverlay(square);
    if (this.drawTimerContainer) {
      // This timer must share the DOM layer with the live drawing surface.
      // Phaser depth cannot render above an HTML canvas overlay.
      this.overlay.place(this.drawTimerContainer, {
        x: this.scale.width - 224,
        y: 40,
        width: 208,
        height: 80,
      });
    }
    this.syncDrawingInteractionState();

    if (this.practiceMode) {
      this.buildPracticeProgressOverlay();
      this.setCreationControlsReady(false);
      return;
    }
    this.setCreationControlsReady(false);
  }

  private installLocalDrawAutomationApi(): void {
    if (!this.automationMode) return;
    const automationWindow = window as LocalDrawAutomationWindow;
    this.canvas.element.dataset.automationMode = 'untimed';
    automationWindow.scribbitsDrawAutomation = {
      reset: () => {
        if (!this.scene.isActive() || this.submitting) return false;
        this.canvas.reset();
        return true;
      },
      draw: (strokes) => {
        if (!this.scene.isActive() || this.submitting) return 0;
        return this.canvas.drawAutomationStrokes(strokes);
      },
      exportPng: () => this.canvas.exportSubmissionImages().baseImageDataUrl,
    };

    const bridge = document.createElement('div');
    Object.assign(bridge.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
    });
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.setAttribute('aria-label', 'Export local Scribbits drawing');
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.setAttribute('aria-label', 'Reset local Scribbits drawing');
    const output = document.createElement('output');
    output.setAttribute('aria-label', 'Local Scribbits drawing PNG');
    exportButton.addEventListener('click', () => {
      output.textContent =
        this.canvas.exportSubmissionImages().baseImageDataUrl;
    });
    resetButton.addEventListener('click', () => this.canvas.reset());
    bridge.append(exportButton, resetButton, output);
    document.body.append(bridge);
    this.localAutomationBridge = bridge;
  }

  private removeLocalDrawAutomationApi(): void {
    const automationWindow = window as LocalDrawAutomationWindow;
    delete automationWindow.scribbitsDrawAutomation;
    this.localAutomationBridge?.remove();
    this.localAutomationBridge = null;
  }

  private buildPracticeProgressOverlay(): void {
    const progress = document.createElement('div');
    progress.setAttribute(
      'aria-label',
      practiceProgressCopy(this.practiceRoles)
    );
    progress.textContent = practiceProgressCopy(this.practiceRoles);
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
      y: this.practiceProgressY() - 16,
      width: this.scale.width - EDGE * 2,
      height: 32,
    });
  }

  private buildCanvasDareOverlay(square: number): void {
    const dare =
      this.dailyDare ??
      selectCommunityDoodleDare(this.getArenaState()?.dayNumber ?? 1);
    const twist =
      this.dailyDareTwist ??
      selectDailyDoodleDareTwist(
        this.getArenaState()?.dayNumber ?? 1,
        this.getArenaState()?.myUsername ?? null
      );
    const practicePower =
      this.practiceMode && isPracticeDoodleDare(dare)
        ? dare.suggestedPower
        : null;
    const timedStart = !this.isUntimedDrawingMode();
    const reducedThemeMotion = timedStart && prefersReducedMotion();
    const overlay = document.createElement('div');
    if (timedStart) {
      overlay.className = reducedThemeMotion
        ? 'draw-theme-overlay draw-theme-reduced-motion'
        : 'draw-theme-overlay';
    }
    overlay.setAttribute('role', timedStart ? 'group' : 'note');
    overlay.setAttribute(
      'aria-label',
      practicePower
        ? `Practice idea: Draw ${dare.prompt}. ${getShapePowerDrawingCue(practicePower)} Twist: ${twist}.`
        : this.isFirstScribbit
          ? `Draw your first Scribbit: ${dare.prompt}. Start Theme gives you 60 seconds.`
          : `Three-day community theme: Draw ${dare.prompt}. Draw, name, then enter the Rumble. Start Theme gives you 60 seconds. Free Draw has no timer and is saved separately.`
    );
    Object.assign(overlay.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: UI.ink,
      transition: prefersReducedMotion() ? 'none' : 'opacity 180ms ease-out',
      ...(timedStart
        ? {
            flexDirection: 'column',
            gap: '12px',
            padding: '24px 20px',
            background: 'rgba(31, 24, 18, 0.82)',
            backdropFilter: 'blur(4px) saturate(0.65)',
            WebkitBackdropFilter: 'blur(4px) saturate(0.65)',
          }
        : {}),
    });

    const card = document.createElement('div');
    if (timedStart) card.className = 'draw-theme-card';
    Object.assign(
      card.style,
      timedStart
        ? {
            position: 'relative',
            width: 'min(88%, 635px)',
            maxHeight: 'calc(100% - 190px)',
            aspectRatio: '719 / 1200',
            backgroundImage: `url(${DRAW_START_CARD_ART_URL})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            borderRadius: '28px',
            boxShadow: '0 24px 54px rgba(13, 9, 6, 0.52)',
            filter: 'drop-shadow(0 4px 0 rgba(43, 32, 22, 0.38))',
            fontFamily: FONT_STACK,
            overflow: 'hidden',
          }
        : {
            width: '74%',
            padding: '12px 14px',
            background: 'rgba(255, 247, 232, 0.9)',
            border: `2px solid ${UI.coralText}`,
            borderRadius: '14px',
            boxShadow: '0 5px 0 rgba(43, 32, 22, 0.12)',
            fontFamily: FONT_STACK,
          }
    );
    const copy = document.createElement('div');
    if (timedStart) copy.className = 'draw-theme-copy';
    Object.assign(
      copy.style,
      timedStart
        ? {
            position: 'absolute',
            top: '40%',
            right: '9%',
            bottom: '24%',
            left: '9%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }
        : {}
    );
    if (timedStart) {
      if (!reducedThemeMotion) {
        card.append(
          this.createThemeArtMotionLayer(
            'draw-theme-art-crayon',
            'polygon(10% 34%, 9% 30%, 13% 27%, 29% 21%, 34% 22%, 35% 25%, 29% 29%, 15% 34%)',
            '22% 27%'
          ),
          this.createThemeArtMotionLayer(
            'draw-theme-art-star-top',
            'polygon(82% 30%, 84% 26%, 87% 25%, 89% 21%, 92% 25%, 96% 27%, 93% 30%, 91% 33%, 87% 31%)',
            '89% 28%'
          ),
          this.createThemeArtMotionLayer(
            'draw-theme-art-star-bottom',
            'polygon(2% 93%, 4% 89%, 7% 88%, 9% 85%, 12% 89%, 15% 91%, 12% 94%, 9% 96%, 6% 94%)',
            '8% 92%'
          )
        );
      }

      const tapeLabel = document.createElement('div');
      tapeLabel.className = 'draw-theme-tape-label';
      tapeLabel.setAttribute('aria-hidden', 'true');
      tapeLabel.textContent = this.practiceMode
        ? 'PRACTICE TIME!'
        : 'DRAWING TIME!';
      Object.assign(tapeLabel.style, {
        position: 'absolute',
        top: '2.1%',
        right: '30%',
        left: '30%',
        height: '5.8%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: UI.ink,
        ...DOM_TYPE.caption,
        fontSize: '24px',
        letterSpacing: '0.8px',
        textAlign: 'center',
        textShadow: '0 2px 0 rgba(255, 247, 232, 0.32)',
        transform: 'rotate(-0.5deg)',
        pointerEvents: 'none',
        zIndex: '2',
      });
      card.append(tapeLabel);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Close drawing theme');
      Object.assign(closeButton.style, {
        position: 'absolute',
        top: '1.8%',
        right: '2.8%',
        zIndex: '2',
        width: '58px',
        height: '58px',
        padding: '0',
        border: '0',
        background: `transparent url(${DRAW_CLOSE_BUTTON_ART_URL}) center / 100% 100% no-repeat`,
        cursor: 'pointer',
        filter: 'drop-shadow(0 3px 0 rgba(43, 32, 22, 0.28))',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      });
      closeButton.addEventListener('pointerdown', () => {
        closeButton.style.transform = 'translateY(2px) scale(0.94)';
      });
      const releaseCloseButton = (): void => {
        closeButton.style.transform = 'translateY(0) scale(1)';
      };
      closeButton.addEventListener('pointerup', releaseCloseButton);
      closeButton.addEventListener('pointercancel', releaseCloseButton);
      closeButton.addEventListener('pointerleave', releaseCloseButton);
      closeButton.addEventListener('click', () => this.closeDrawStartPopup());
      card.append(closeButton);
    }
    const context = document.createElement('div');
    if (timedStart) context.className = 'draw-theme-context';
    context.textContent = this.practiceMode
      ? 'PRACTICE IDEA'
      : `${COMMUNITY_DRAW_THEME_DAYS}-DAY COMMUNITY THEME`;
    Object.assign(context.style, {
      ...DOM_TYPE.caption,
      color: UI.coralText,
      marginBottom: timedStart ? '8px' : '5px',
      ...(timedStart
        ? {
            padding: '7px 16px',
            border: `2px solid ${UI.coralText}`,
            borderRadius: '999px',
            background: 'rgba(255, 107, 74, 0.09)',
            fontSize: '22px',
          }
        : {}),
    });
    const prompt = document.createElement('div');
    if (timedStart) prompt.className = 'draw-theme-prompt';
    prompt.textContent = formatThemePrompt(dare.prompt);
    Object.assign(prompt.style, {
      ...DOM_TYPE.title,
      ...(timedStart
        ? {
            maxWidth: '100%',
            fontSize: '40px',
            lineHeight: '1.05',
            textWrap: 'balance',
            textShadow: '0 3px 0 rgba(255, 247, 232, 0.82)',
          }
        : {}),
    });
    copy.append(context, prompt);
    if (timedStart) copy.append(this.createThemeJourneyStrip());
    card.append(copy);
    if (timedStart) {
      const startButton = document.createElement('button');
      startButton.className = 'draw-theme-start-button';
      startButton.type = 'button';
      startButton.textContent = 'START THEME';
      startButton.setAttribute(
        'aria-label',
        this.communityThemeAvailable
          ? 'Start the 60 second Community Theme drawing round'
          : this.communityThemeUnavailableMessage
      );
      Object.assign(startButton.style, {
        position: 'absolute',
        right: '8%',
        bottom: '6.5%',
        left: '8%',
        height: '15%',
        padding: '0 18px',
        border: '0',
        borderRadius: '18px',
        background: 'rgba(255, 255, 255, 0.01)',
        color: UI.ink,
        cursor: 'pointer',
        ...DOM_TYPE.title,
        fontSize: '36px',
        letterSpacing: '1px',
        textShadow: '0 2px 0 rgba(255, 247, 232, 0.34)',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        zIndex: '2',
      });
      const releaseButton = (): void => {
        startButton.classList.remove('is-pressed');
      };
      startButton.addEventListener('pointerdown', () => {
        startButton.classList.add('is-pressed');
      });
      startButton.addEventListener('pointerup', releaseButton);
      startButton.addEventListener('pointercancel', releaseButton);
      startButton.addEventListener('pointerleave', releaseButton);
      startButton.addEventListener('click', () => this.beginDrawingRound());
      if (!this.communityThemeAvailable) {
        startButton.style.opacity = '0.48';
        startButton.style.cursor = 'not-allowed';
      }
      card.append(startButton);
      this.drawStartControl = startButton;
    }
    overlay.append(card);
    if (timedStart) {
      const timerNotice = document.createElement('div');
      timerNotice.className = 'draw-theme-timer-notice';
      timerNotice.setAttribute('aria-hidden', 'true');
      Object.assign(timerNotice.style, {
        width: 'min(88%, 635px)',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        flex: '0 0 auto',
        fontFamily: FONT_STACK,
      });
      const timerIcon = this.createDrawClockIcon(48);
      timerIcon.classList.add('draw-theme-timer-icon');
      const timerLabel = document.createElement('span');
      timerLabel.className = 'draw-theme-timer-label';
      timerLabel.textContent = '60 SEC TO DRAW';
      Object.assign(timerLabel.style, {
        color: UI.cream,
        ...DOM_TYPE.title,
        fontSize: '30px',
        letterSpacing: '0.5px',
        textShadow: '0 3px 0 rgba(43, 32, 22, 0.7)',
      });
      timerNotice.append(timerIcon, timerLabel);
      overlay.append(timerNotice);

      if (!this.isFirstScribbit) {
        const freeDrawButton = document.createElement('button');
        freeDrawButton.type = 'button';
        freeDrawButton.setAttribute(
          'aria-label',
          'Start an untimed Free Draw saved outside the Community Rumble'
        );
        Object.assign(freeDrawButton.style, {
          width: 'min(88%, 635px)',
          minHeight: '58px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '10px 18px',
          border: `3px solid ${UI.cream}`,
          borderRadius: '18px',
          background: 'rgba(43, 32, 22, 0.72)',
          color: UI.cream,
          boxShadow: '0 5px 0 rgba(13, 9, 6, 0.42)',
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          touchAction: 'manipulation',
          pointerEvents: 'auto',
        });
        const freeDrawLabel = document.createElement('span');
        freeDrawLabel.textContent = 'FREE DRAW';
        Object.assign(freeDrawLabel.style, {
          ...DOM_TYPE.title,
          fontSize: '28px',
        });
        const noTimerLabel = document.createElement('span');
        noTimerLabel.textContent = 'NO TIMER';
        Object.assign(noTimerLabel.style, {
          ...DOM_TYPE.caption,
          padding: '5px 9px',
          borderRadius: '999px',
          background: UI.cream,
          color: UI.ink,
        });
        freeDrawButton.append(freeDrawLabel, noTimerLabel);
        freeDrawButton.addEventListener('click', () => this.beginFreeDrawing());
        overlay.append(freeDrawButton);
        this.freeDrawControl = freeDrawButton;
      }
    }
    this.overlay.place(
      overlay,
      timedStart
        ? {
            x: 0,
            y: 0,
            width: this.scale.width,
            height: this.scale.height,
          }
        : {
            x: this.scale.width / 2 - square / 2,
            y: this.canvasCenterY() - square / 2,
            width: square,
            height: square,
          }
    );
    this.canvasDareOverlay = overlay;
    this.setCanvasDareVisible(true);
  }

  private createThemeArtMotionLayer(
    motionClassName: string,
    clipPath: string,
    transformOrigin: string
  ): HTMLDivElement {
    const artLayer = document.createElement('div');
    artLayer.className = `draw-theme-art-piece ${motionClassName}`;
    artLayer.setAttribute('aria-hidden', 'true');
    Object.assign(artLayer.style, {
      backgroundImage: `url(${DRAW_START_CARD_ART_URL})`,
      clipPath,
      transformOrigin,
    });
    return artLayer;
  }

  private createThemeJourneyStrip(): HTMLDivElement {
    const journey = document.createElement('div');
    journey.className = 'draw-theme-journey';
    journey.setAttribute('aria-hidden', 'true');
    Object.assign(journey.style, {
      width: '94%',
      marginTop: '14px',
      padding: '12px 10px 10px',
      display: 'grid',
      gridTemplateColumns: '1fr 34px 1fr 34px 1fr',
      alignItems: 'start',
      boxSizing: 'border-box',
      borderTop: `2px dashed ${UI.coralText}`,
      borderBottom: `2px dashed ${UI.coralText}`,
      background: 'rgba(255, 247, 232, 0.34)',
      transform: 'rotate(-0.35deg)',
    });

    const steps = ['DRAW', 'NAME', 'RUMBLE'] as const;
    steps.forEach((step, index) => {
      const stepContainer = document.createElement('div');
      stepContainer.className = 'draw-theme-journey-step';
      stepContainer.style.setProperty(
        '--draw-theme-step-delay',
        `${index * 0.58}s`
      );
      Object.assign(stepContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '0',
      });

      const number = document.createElement('span');
      number.className = 'draw-theme-journey-number';
      number.textContent = String(index + 1);
      number.style.setProperty(
        '--draw-theme-step-rotation',
        index === 1 ? '2deg' : '-2deg'
      );
      Object.assign(number.style, {
        width: '38px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `3px solid ${UI.coralText}`,
        borderRadius: index === 1 ? '46% 54% 48% 52%' : '50%',
        background: 'rgba(255, 247, 232, 0.88)',
        color: UI.coralText,
        boxShadow: '1px 2px 0 rgba(43, 32, 22, 0.2)',
        ...DOM_TYPE.caption,
        fontSize: '20px',
      });

      const stepLabel = document.createElement('span');
      stepLabel.className = 'draw-theme-journey-label';
      stepLabel.textContent = step;
      Object.assign(stepLabel.style, {
        marginTop: '5px',
        color: UI.ink,
        ...DOM_TYPE.caption,
        fontSize: '18px',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      });
      stepContainer.append(number, stepLabel);
      journey.append(stepContainer);

      if (index < steps.length - 1) {
        const connector = document.createElement('span');
        connector.className = 'draw-theme-journey-connector';
        connector.style.setProperty(
          '--draw-theme-connector-rotation',
          index === 0 ? '-3deg' : '3deg'
        );
        connector.style.setProperty(
          '--draw-theme-connector-delay',
          `${0.34 + index * 0.58}s`
        );
        Object.assign(connector.style, {
          width: '100%',
          marginTop: '20px',
          height: '3px',
          backgroundImage: `repeating-linear-gradient(90deg, ${UI.ink} 0 8px, transparent 8px 14px)`,
          backgroundSize: '28px 3px',
          opacity: '0.52',
        });
        journey.append(connector);
      }
    });
    return journey;
  }

  private setCanvasDareVisible(visible: boolean): void {
    if (!this.canvasDareOverlay) return;
    this.canvasDareOverlay.style.opacity = visible ? '1' : '0';
    this.canvasDareOverlay.style.visibility = visible ? 'visible' : 'hidden';
    this.canvasDareOverlay.setAttribute('aria-hidden', String(!visible));
    const startIsAvailable =
      visible && this.drawStartControl !== null && this.communityThemeAvailable;
    const freeDrawIsAvailable = visible && this.freeDrawControl !== null;
    this.canvasDareOverlay.style.pointerEvents = 'none';
    if (this.drawStartControl) {
      this.drawStartControl.disabled = !startIsAvailable;
      this.drawStartControl.tabIndex = startIsAvailable ? 0 : -1;
      this.drawStartControl.style.pointerEvents = startIsAvailable
        ? 'auto'
        : 'none';
    }
    if (this.freeDrawControl) {
      this.freeDrawControl.disabled = !freeDrawIsAvailable;
      this.freeDrawControl.tabIndex = freeDrawIsAvailable ? 0 : -1;
      this.freeDrawControl.style.pointerEvents = freeDrawIsAvailable
        ? 'auto'
        : 'none';
    }
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
    if (result.inkedPixels === 0) {
      this.usedDrawingInkId = null;
      this.usedBrushId = null;
    }
    this.setCanvasDareVisible(
      result.inkedPixels === 0 &&
        this.playerDrawMode !== 'free' &&
        (this.practiceMode || this.automationMode || this.isWaitingToStart())
    );
    this.updateLiveStats(result, ready);
    this.setCreationControlsReady(ready);
    this.updateDrawingToolStates();
  }

  private updateLiveStats(result: AnalyzerResult, ready: boolean): void {
    if (ready) {
      const role = getCombatRoleContent(selectCombatRole(result.stats));
      this.liveRoleLabel?.setText(
        `BECOMING A ${role.displayName.toUpperCase()}`
      );
      this.liveRoleDetail?.setText(
        `${role.drawingCue.toUpperCase()} · ${role.weaponName.toUpperCase()} · ${role.rangeLabel}`
      );
    } else {
      this.liveRoleLabel?.setText('DRAW TO REVEAL YOUR ROLE');
      this.liveRoleDetail?.setText(
        'BIG BODY · SHARP EDGES · SMALL SIZE · MANY COLORS'
      );
    }

    if (this.canvas?.element) {
      this.canvas.element.setAttribute(
        'aria-description',
        ready
          ? `${getCombatRoleContent(selectCombatRole(result.stats)).displayName} role. ${getCombatRoleContent(selectCombatRole(result.stats)).behavior} Live build, 100 total: ${SCRIBBIT_STAT_KEYS.map(
              (statName) =>
                `${STAT_STYLES[statName].label} ${result.stats[statName]}`
            ).join(', ')}`
          : 'Draw a little more to reveal the live 100-point build.'
      );
    }
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
    playSfx('draw.finish');
    const draft = this.createSubmissionDraft(result);
    if (this.practiceMode) {
      this.beginSubmission('Practice Shape', draft);
      return;
    }
    this.pauseDrawingRound();

    // The drawing surface is native DOM and otherwise renders above Phaser's
    // modal card. The frozen preview replaces it until the player returns.
    this.overlay.setVisible(false);
    this.drawConfirmation = openDrawConfirmationModal(this, {
      previewDataUrl: draft.imageDataUrl,
      initialName: this.draftName,
      trigger: this.submitControl,
      ...(this.drawingLocked
        ? {
            description:
              'Time is up. Preview your drawing, name it, then bring it to life.',
            closeLabel: 'Close timed drawing preview',
          }
        : this.playerDrawMode === 'free'
          ? {
              mode: 'free-draw' as const,
              description:
                'Save this untimed Free Draw separately without entering the Community Rumble.',
              closeLabel: 'Close Free Draw preview',
            }
          : {}),
      onNameChange: (name) => {
        this.draftName = name;
      },
      onClose: (name) => {
        this.draftName = name;
        this.drawConfirmation = null;
        this.overlay.setVisible(true);
        if (!this.drawingLocked && this.playerDrawMode === 'community') {
          this.startDrawingRound();
        }
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
    return {
      result,
      accessories,
      baseImageDataUrl,
      imageDataUrl,
      drawingSupplies: {
        drawingInkId: this.usedDrawingInkId,
        brushId: this.usedBrushId,
      },
    };
  }

  private beginSubmission(name: string, draft: SubmissionDraft): void {
    if (this.submitting) return;
    this.submitting = true;
    playSfx('draw.submit');
    this.drawRoundTimerEvent?.remove();
    this.drawRoundTimerEvent = null;
    // Hide the draggable stickers + drawer so only the baked PNG shows in the
    // ceremony; the metadata is captured first from their current transforms.
    this.stickers?.hideOverlays();
    this.overlay.setVisible(false);
    this.setSubmissionControlsVisible(false);
    this.submissionLoading = createDrawSubmissionLoadingOverlay(this, {
      mode: this.practiceMode
        ? 'practice'
        : this.playerDrawMode === 'free'
          ? 'free-draw'
          : 'scribbit',
      name,
      previewDataUrl: draft.imageDataUrl,
    });
    const sceneVisitEpoch = this.sceneVisitEpoch;
    if (this.practiceMode) {
      void this.submitPractice(name, draft, sceneVisitEpoch);
    } else if (this.playerDrawMode === 'free') {
      void this.submitFree(name, draft, sceneVisitEpoch);
    } else {
      void this.submit(name, draft, sceneVisitEpoch);
    }
  }

  private createFreeSubmissionId(): string {
    return (
      globalThis.crypto?.randomUUID?.() ??
      `free_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`
    ).replaceAll('-', '_');
  }

  private async submitFree(
    name: string,
    draft: SubmissionDraft,
    sceneVisitEpoch: number
  ): Promise<void> {
    this.freeSubmissionId ??= this.createFreeSubmissionId();
    const response = await submitFreeDrawing({
      submissionId: this.freeSubmissionId,
      name,
      baseImageDataUrl: draft.baseImageDataUrl,
      imageDataUrl: draft.imageDataUrl,
      ...(draft.accessories.length > 0
        ? { accessories: draft.accessories }
        : {}),
      ...(draft.drawingSupplies.drawingInkId || draft.drawingSupplies.brushId
        ? { drawingSupplies: draft.drawingSupplies }
        : {}),
    });
    if (!this.acceptSubmissionResponse(sceneVisitEpoch)) {
      void this.reconcileArenaSnapshot();
      return;
    }
    if (!response.ok) {
      this.submissionLoading?.showReconciliationStatus();
      const reconciledArena = await this.reconcileArenaSnapshot();
      if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
      if (getTodayFreeDrawing(reconciledArena ?? undefined)) {
        this.restartIntoFreeDrawingViewer();
        return;
      }
      this.submitting = false;
      this.overlay.setVisible(true);
      this.showError(response.error);
      return;
    }
    const arena = getArena(this);
    const nextArena = arena
      ? mergeTodayFreeDrawing(arena, response.data)
      : null;
    if (!nextArena) {
      this.submissionLoading?.showReconciliationStatus();
      const reconciledArena = await this.reconcileArenaSnapshot();
      if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
      if (getTodayFreeDrawing(reconciledArena ?? undefined)) {
        this.restartIntoFreeDrawingViewer();
        return;
      }
      this.submitting = false;
      this.overlay.setVisible(true);
      this.showError('The Arena day changed while your Free Draw was saving.');
      return;
    }
    setArena(this, nextArena);
    this.restartIntoFreeDrawingViewer();
  }

  private restartIntoFreeDrawingViewer(): void {
    this.cleanup();
    DomOverlay.destroyAll();
    this.scene.restart();
  }

  private async submitPractice(
    name: string,
    draft: SubmissionDraft,
    sceneVisitEpoch: number
  ): Promise<void> {
    const response = await practiceBattle({
      name,
      baseImageDataUrl: draft.baseImageDataUrl,
    });
    if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
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
    this.practiceRoles = [
      ...recordPracticeRole(this, selectCombatRole(response.data.a.stats))
        .triedRoles,
    ];
    this.playCeremony(response.data.a, draft.baseImageDataUrl);
  }

  private async submit(
    name: string,
    draft: SubmissionDraft,
    sceneVisitEpoch: number
  ): Promise<void> {
    const response = await submitScribbit({
      name,
      baseImageDataUrl: draft.baseImageDataUrl,
      imageDataUrl: draft.imageDataUrl,
      stats: draft.result.stats,
      element: draft.result.element,
      ...(draft.accessories.length > 0
        ? { accessories: draft.accessories }
        : {}),
      ...(draft.drawingSupplies.drawingInkId || draft.drawingSupplies.brushId
        ? { drawingSupplies: draft.drawingSupplies }
        : {}),
    });
    if (!this.acceptSubmissionResponse(sceneVisitEpoch)) {
      if (!response.ok) {
        void this.reconcileArenaSnapshot();
        return;
      }
      if (!this.applySubmittedScribbit(response.data, draft)) {
        void this.reconcileArenaSnapshot();
        return;
      }
      // The prior visit committed this daily birth. A newer daily Draw visit
      // is now invalid, so do not let the player finish a doomed second entry.
      if (this.scene.isActive() && !this.practiceMode) {
        this.submitting = true;
        showToast('Your Scribbit made it into today’s Rumble.');
        this.exitTo('ScribbitHome');
      }
      return;
    }
    if (!response.ok) {
      // A client timeout does not prove the server failed. Reconcile before
      // inviting a second submit, which could otherwise look like a lost
      // drawing after the first request actually committed.
      this.submissionLoading?.showReconciliationStatus();
      const reconciledArena = await this.reconcileArenaSnapshot();
      if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
      if (reconciledArena?.drawnToday) {
        showToast(
          'Your Scribbit made it into the Rumble — the reply arrived late.'
        );
        this.exitTo('ScribbitHome');
        return;
      }
      this.submitting = false;
      this.showError(response.error);
      return;
    }
    // Merge only this committed birth into the latest registry snapshot so an
    // older Draw visit cannot overwrite unrelated Arena activity.
    if (!this.applySubmittedScribbit(response.data, draft)) {
      this.submissionLoading?.showReconciliationStatus();
      await this.reconcileArenaSnapshot();
      if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
      showToast('The Arena day changed while your Scribbit was saving.');
      this.exitTo('ScribbitHome');
      return;
    }
    this.playCeremony(response.data, draft.imageDataUrl);
  }

  private applySubmittedScribbit(
    scribbit: Scribbit,
    draft: SubmissionDraft
  ): boolean {
    const arena = getArena(this);
    if (!arena || scribbit.bornDay !== arena.dayNumber) return false;
    const alreadyTracked =
      arena.todayEntrants.some((entrant) => entrant.id === scribbit.id) ||
      arena.myScribbits.some(
        (ownedScribbit) => ownedScribbit.id === scribbit.id
      );
    const myDrawingSupplies = { ...(arena.myDrawingSupplies ?? {}) };
    if (!alreadyTracked) {
      [
        draft.drawingSupplies.drawingInkId,
        draft.drawingSupplies.brushId,
      ].forEach((supplyId) => {
        if (!supplyId) return;
        const nextCount = Math.max(0, (myDrawingSupplies[supplyId] ?? 0) - 1);
        if (nextCount > 0) myDrawingSupplies[supplyId] = nextCount;
        else delete myDrawingSupplies[supplyId];
      });
    }
    const todayEntrants = arena.todayEntrants.some(
      (entrant) => entrant.id === scribbit.id
    )
      ? arena.todayEntrants
      : [scribbit, ...arena.todayEntrants];
    const myScribbits = arena.myScribbits.some(
      (ownedScribbit) => ownedScribbit.id === scribbit.id
    )
      ? arena.myScribbits
      : [scribbit, ...arena.myScribbits].slice(0, 3);
    setArena(this, {
      ...arena,
      hasCreatedScribbit: true,
      drawnToday: true,
      enteredToday: true,
      rumbleEntrants: todayEntrants.length,
      todayEntrants,
      myInk: (arena.myInk ?? 0) + (alreadyTracked ? 0 : INK_REWARDS.dailyDraw),
      myDrawingSupplies,
      myScribbits,
    });
    return true;
  }

  private isCurrentSceneVisit(sceneVisitEpoch: number): boolean {
    return this.scene.isActive() && sceneVisitEpoch === this.sceneVisitEpoch;
  }

  private acceptSubmissionResponse(sceneVisitEpoch: number): boolean {
    const action = planSceneMutationResponse({
      active: this.scene.isActive(),
      requestSceneEpoch: sceneVisitEpoch,
      currentSceneEpoch: this.sceneVisitEpoch,
    });
    return action === 'accept';
  }

  private async reconcileArenaSnapshot(): Promise<ArenaState | null> {
    const reconciliationEpoch = this.arenaReconciliationEpoch + 1;
    this.arenaReconciliationEpoch = reconciliationEpoch;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const arenaRevision = getArenaRevision(this);
      const result = await fetchArena();
      if (reconciliationEpoch !== this.arenaReconciliationEpoch) return null;
      if (!result.ok) return null;
      if (arenaRevision !== getArenaRevision(this)) {
        continue;
      }
      setArena(this, result.data);
      return result.data;
    }
    return getArena(this) ?? null;
  }

  // Daily birth and ephemeral practice share one high-juice reveal. Practice
  // changes the promise and reward layer so it never looks like a saved birth.
  private playCeremony(scribbit: Scribbit, dataUrl: string): void {
    this.hideSubmissionLoading();
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
    playSfx('scribbit.birth');
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
    const revealPlan = planPracticeReveal(getPracticeSession(this));
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
    const roleName = handLettered(
      this,
      width / 2,
      cardY + 132,
      revealPlan.roleName,
      52,
      elementStyle.primaryText,
      true
    )
      .setDepth(10)
      .setAlpha(0);
    if (roleName.width > cardW - 70) {
      roleName.setScale((cardW - 70) / roleName.width);
    }
    const progress = label(
      this,
      width / 2,
      cardY + 215,
      `${revealPlan.roleDetail}\n${revealPlan.progress}`,
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
      targets: [eyebrow, spark, halo, roleName, progress, replayButton],
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
    const combatRole = getCombatRoleContent(selectCombatRole(scribbit.stats));
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
      `${combatRole.displayName.toUpperCase()} · ${combatRole.rangeLabel}\n${combatRole.basicAttackName} · ${combatRole.signatureName}`,
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
    playBirthFinishVfx(this, {
      centerX: width / 2,
      centerY: cardY,
      cardWidth: cardW,
      tint: elementStyle.primary,
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
      `+${INK_REWARDS.dailyDraw} INK · ENTERED TONIGHT’S RUMBLE`,
      20,
      UI.coralText,
      true
    );
    returnPromise.add(returnPromiseCopy);
    this.firstFightPromise = returnPromise;
    this.firstFightPromiseCopy = returnPromiseCopy;
    this.tweens.add({
      targets: returnPromise,
      alpha: 1,
      delay: 850,
      duration: 350,
    });

    const actionLabel = 'START FIRST FIGHT';
    const actionButton = iconButton(
      this,
      width / 2,
      height - 80,
      'sword',
      actionLabel,
      () => this.continueAfterBirth(scribbit),
      420,
      UI.coral,
      UI.ink,
      104,
      UI.gold
    );
    actionButton.setDepth(10);
    this.firstFightButton = actionButton;
    this.firstFightButtonLabel =
      actionButton.list.find(
        (child): child is Phaser.GameObjects.Text =>
          child instanceof Phaser.GameObjects.Text
      ) ?? null;
    this.firstFightControl = this.addNativeControl(
      actionLabel,
      width / 2 - 210,
      height - 128,
      420,
      96,
      () => this.continueAfterBirth(scribbit),
      true,
      this.revealControlOverlay
    );
    this.firstFightStatus = this.revealControlOverlay?.addStatus() ?? null;
  }

  private continueAfterBirth(scribbit: Scribbit): void {
    if (this.birthContinuationStarted) return;
    this.birthContinuationStarted = true;

    if (this.practiceMode) {
      this.revealControlOverlay?.setVisible(false);
      const report = this.pendingPracticeReport;
      if (!report || report.kind !== 'practice') {
        this.birthContinuationStarted = false;
        showToast('The practice replay went missing. Try the drawing again.');
        this.exitTo('ScribbitHome');
        return;
      }
      setReplay(this, report, 'ScribbitHome');
      showVsCeremony(this, {
        fighterA: report.a,
        fighterB: report.b,
        battleKind: report.kind,
        onComplete: () => this.scene.start('Replay'),
      });
      return;
    }

    void this.startFirstBattle(scribbit);
  }

  private async startFirstBattle(scribbit: Scribbit): Promise<void> {
    const sceneVisitEpoch = this.sceneVisitEpoch;
    this.setFirstFightBusy(scribbit, true);
    const result = await spar(scribbit.id);
    if (!this.isCurrentSceneVisit(sceneVisitEpoch)) return;
    if (!result.ok) {
      console.error('First fight failed:', result.error);
      this.birthContinuationStarted = false;
      this.setFirstFightBusy(scribbit, false);
      this.showFirstFightRetry();
      return;
    }
    const stagedBattle = stageDirectBattle(
      this,
      getArena(this),
      result.data,
      scribbit.id,
      'ScribbitHome',
      'birth'
    );
    if (!stagedBattle) {
      this.birthContinuationStarted = false;
      this.setFirstFightBusy(scribbit, false);
      this.showFirstFightRetry();
      return;
    }
    this.setFirstFightBusy(scribbit, false);
    this.revealControlOverlay?.setVisible(false);
    skipArenaReceiptsOnce(this);
    showVsCeremony(this, {
      fighterA: result.data.report.a,
      fighterB: result.data.report.b,
      battleKind: result.data.report.kind,
      rivalryStakes: stagedBattle.rivalryStakes,
      onComplete: () => this.scene.start('Replay'),
    });
  }

  private setFirstFightBusy(scribbit: Scribbit, busy: boolean): void {
    const buttonLabel = busy ? 'FINDING A RIVAL…' : 'START FIRST FIGHT';
    this.firstFightButtonLabel?.setText(buttonLabel);
    if (this.firstFightControl) {
      this.firstFightControl.disabled = busy;
      const accessibleLabel = busy
        ? `Finding ${scribbit.name}'s first rival`
        : 'Start first fight';
      this.firstFightControl.textContent = accessibleLabel;
      this.firstFightControl.setAttribute('aria-label', accessibleLabel);
    }

    this.firstFightLoadingTween?.stop();
    this.firstFightLoadingTween = null;
    this.firstFightButton?.setAlpha(1);
    if (busy && this.firstFightButton && !prefersReducedMotion()) {
      this.firstFightLoadingTween = this.tweens.add({
        targets: this.firstFightButton,
        alpha: 0.72,
        duration: 520,
        yoyo: true,
        repeat: -1,
      });
    }

    if (busy) {
      this.firstFightPromise?.setAlpha(1);
      this.firstFightPromiseCopy
        ?.setText(`+${INK_REWARDS.dailyDraw} INK · ENTERED TONIGHT’S RUMBLE`)
        .setFontSize(20)
        .setColor(UI.coralText);
      if (this.firstFightStatus) {
        this.firstFightStatus.setAttribute('role', 'status');
        this.firstFightStatus.setAttribute('aria-live', 'polite');
        this.firstFightStatus.textContent = `${scribbit.name} is finding a first rival.`;
      }
    }
  }

  private showFirstFightRetry(): void {
    this.firstFightPromise?.setAlpha(1);
    this.firstFightPromiseCopy
      ?.setText('FIRST FIGHT PAUSED\nTAP BELOW TO TRY AGAIN')
      .setFontSize(19)
      .setLineSpacing(2)
      .setColor(UI.coralText);
    if (this.firstFightStatus) {
      this.firstFightStatus.setAttribute('role', 'alert');
      this.firstFightStatus.setAttribute('aria-live', 'assertive');
      this.firstFightStatus.textContent =
        "The first fight couldn't start. Use Start first fight to try again.";
    }
  }

  private showError(message: string): void {
    this.hideSubmissionLoading();
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
        this.setSubmissionControlsVisible(true);
        this.stickers?.showOverlays();
        if (!this.drawingLocked) this.startDrawingRound();
      }
    );
  }

  private hideSubmissionLoading(): void {
    this.submissionLoading?.destroy();
    this.submissionLoading = null;
  }

  private setSubmissionControlsVisible(visible: boolean): void {
    this.headerControlOverlay?.setVisible(visible);
    this.toolControlOverlay?.setVisible(visible);
    this.submitOverlay?.setVisible(visible);
  }
}
