import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import {
  fetchArena,
  believe,
  bossChallenge,
  careForScribbit,
  spar,
  enterRumble,
  backScribbit,
  fetchRumbleReplay,
  markLegacyCardsSeen,
} from '../lib/api';
import {
  setArena,
  getArena,
  setSavedReplay,
  stageDirectBattle,
  setSketchbookTab,
  takeFounderChronicleBeats,
  takeArenaFocus,
} from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  moodStyleOf,
  levelOf,
  canCare,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import {
  ELEMENT_STYLES,
  allowsAmbientMotion,
  EDGE,
  NAV_SAFE,
  SPACE,
  TYPE,
  UI,
} from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  ghostButton,
  iconButton,
  label,
  handLettered,
  errorPanel,
  stickerCard,
  moodChip,
  levelBadge,
  lifespanPips,
  careButton,
  daysLeftFor,
  floatReward,
  rosette,
  button,
  fadeToScene,
  paperIconButton,
  spinner,
  dominantButton,
} from '../lib/ui';
import type { ErrorPanel, Spinner } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { DetailModalActions } from '../lib/detailmodal';
import { formatCountdown } from '../lib/cloutboard';
import { openCapsuleMachine } from '../lib/capsulemachine';
import { pullCapsule } from '../lib/api';
import type {
  ArenaState,
  CareAction,
  FounderChronicleBeat,
  Scribbit,
} from '../../shared/arena';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';
import { showVsCeremony } from '../lib/battleceremony';
import { openLegacyReturnCeremony } from '../lib/legacycards';
import { selectNextGoal, type NextGoalCard } from '../lib/nextgoal';
import {
  planArenaBackAction,
  selectVisibleArenaEntrants,
} from '../lib/arenabracket';
import type { ArenaBackActionKind } from '../lib/arenabracket';
import { planChampionChallenge } from '../lib/championchallenge';
import {
  formatFounderChronicleEvidenceLine,
  planFounderChronicle,
} from '../lib/founderchronicle';
import { openFounderChronicleMargin } from '../lib/founderchroniclemargin';
import type { FounderChronicleMargin } from '../lib/founderchroniclemargin';
import { planCareMoment } from '../lib/caremoment';
import { openCareMomentOverlay } from '../lib/caremomentoverlay';
import type { CareMomentOverlay } from '../lib/caremomentoverlay';
import { openCarePicker, type CarePicker } from '../lib/carepicker';
import { elementPaperIcon, paperIcon } from '../lib/papericons';
import {
  getDrawEligibility,
  navigateToDailyDraw,
} from '../lib/draweligibility';
import { appDock } from '../lib/appdock';
import { NAV_ICON_TEXTURES } from '../lib/visualassets';
import {
  formatRumbleReturnAccessibleSummary,
  planRumbleReturnPresentation,
} from '../lib/rumblereturnpresentation';
import { CanvasActionOverlay } from '../lib/overlay';

// The landing scene. A tall, drag-scrollable sketchbook page: countdown-topped
// header, weather card, wanted-poster champion, your roster, TONIGHT'S BRACKET
// (tap to inspect + Back), a scout-score chip, and the draw CTA + nav. Every
// scribbit anywhere opens the shared detail modal. Polls /api/arena on wake.
export class ArenaHome extends Scene {
  private state!: ArenaState;
  private errorPanelRef: ErrorPanel | null = null;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private countdownLabel: Phaser.GameObjects.Text | null = null;
  private inkChipLabel: Phaser.GameObjects.Text | null = null;
  private livingPaper: LivingPaper | null = null;
  private busy = false;
  private spinner: Spinner | null = null;
  private founderChronicleMargin: FounderChronicleMargin | null = null;
  private careMomentOverlay: CareMomentOverlay | null = null;
  private carePicker: CarePicker | null = null;
  private rosterActionOverlay: CanvasActionOverlay | null = null;
  private readonly rosterCareControls = new Map<string, HTMLButtonElement>();
  private ambientMotionEnabled = false;

  // Drag-scroll bookkeeping. Scrolling uses velocity + inertia so a flick keeps
  // gliding and a wheel/keyboard nudge eases in, instead of snapping stiffly.
  private contentHeight = 0;
  private scrollY = 0; // eased/displayed scroll
  private targetScrollY = 0; // where we're heading (wheel/lerp target)
  private maxScroll = 0;
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartScroll = 0;
  private lastPointerY = 0;
  private lastMoveTime = 0;
  private scrollVelocity = 0; // px/frame, decays as inertia
  private dragDistance = 0; // total |movement| this gesture, for tap-vs-drag
  private focusEntrantsY: number | null = null;
  private buildGeneration = 0;
  private readonly refreshOnWake = (): void => {
    void this.refresh();
  };

  // A gesture that moves more than this many pixels is a scroll, not a tap — so
  // card taps that ride a drag don't fire, and small jitter during a tap doesn't
  // start a scroll. ~10 design px is comfortably below a deliberate flick.
  private static readonly TAP_SLOP = 10;

  constructor() {
    super('ArenaHome');
  }

  init(): void {
    this.errorPanelRef = null;
    this.countdownTimer = null;
    this.countdownLabel = null;
    this.busy = false;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.maxScroll = 0;
    this.contentHeight = 0;
    this.dragging = false;
    this.scrollVelocity = 0;
    this.dragDistance = 0;
    this.focusEntrantsY = null;
    this.buildGeneration = 0;
    this.founderChronicleMargin = null;
    this.careMomentOverlay = null;
    this.carePicker = null;
    this.rosterActionOverlay = null;
    this.rosterCareControls.clear();
    this.ambientMotionEnabled = allowsAmbientMotion();
  }

  private addAmbientTween(
    config: Phaser.Types.Tweens.TweenBuilderConfig
  ): Phaser.Tweens.Tween | null {
    return this.ambientMotionEnabled ? this.tweens.add(config) : null;
  }

  create(): void {
    const state = getArena(this);
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    this.state = state;
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.build();
    this.showReturnReceiptsIfNeeded();
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('wake', this.refreshOnWake);
  }

  private cleanup(): void {
    this.events.off('wake', this.refreshOnWake);
    this.countdownTimer?.remove();
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.spinner?.destroy();
    this.spinner = null;
    this.founderChronicleMargin?.destroy();
    this.founderChronicleMargin = null;
    this.careMomentOverlay?.destroy();
    this.careMomentOverlay = null;
    this.carePicker?.destroy();
    this.carePicker = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = null;
    this.rosterCareControls.clear();
  }

  // --- Layout: a vertical stack measured top-down so nothing overlaps and the
  // page can scroll. Each builder returns the y it consumed to; a running
  // cursor drives the next section. -----------------------------------------
  private build(): void {
    this.buildGeneration += 1;
    this.careMomentOverlay?.destroy();
    this.careMomentOverlay = null;
    this.carePicker?.destroy();
    this.carePicker = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = new CanvasActionOverlay(this);
    this.rosterCareControls.clear();
    this.children.removeAll(true);
    releaseRenderedDrawingTextures(this);
    this.countdownTimer?.remove();
    this.countdownLabel = null;

    // The living, forecast-reactive sketchbook page under all content. Rebuilt
    // each build() (removeAll cleared its objects); its own destroy() clears the
    // timers/emitters/tweens the previous instance owned.
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this, {
      boostedElement: this.state.forecast.boostedElement,
      rumbleResolvesAt: this.state.rumbleResolvesAt,
    });

    const { width } = this.scale;
    let cursor = 40;
    cursor = this.drawTopBar(cursor);
    cursor = this.buildForecastCard(width / 2, cursor + 20);
    if (this.state.drawnToday) {
      cursor = this.buildNextGoalCard(width / 2, cursor + 20);
    } else {
      cursor = this.buildActionRow(width / 2, cursor + 20);
    }
    cursor = this.buildChampionPoster(width / 2, cursor + 20);
    this.focusEntrantsY = cursor + 44;
    cursor = this.buildEntrantsBracket(cursor + 44);
    cursor = this.buildRoster(cursor + 30);
    cursor += NAV_SAFE;

    this.contentHeight = cursor + 40;
    this.setupScrolling();
    this.buildAppTabs();
    this.spinner?.destroy();
    this.spinner = spinner(this, 1500);

    // Honour a deep-link request (loss card → "Back a contender tonight").
    if (takeArenaFocus(this) === 'entrants' && this.focusEntrantsY !== null) {
      this.scrollTo(this.focusEntrantsY - 120);
    }
  }

  // --- Scrolling -------------------------------------------------------------
  private setupScrolling(): void {
    this.maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.targetScrollY = this.scrollY;
    this.scrollVelocity = 0;
    this.cameras.main.setScroll(0, this.scrollY);

    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
    this.input.off('wheel');

    if (this.maxScroll <= 0) return;

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        // Wheel nudges the TARGET; update() eases the camera toward it.
        this.scrollVelocity = 0;
        this.targetScrollY = Phaser.Math.Clamp(
          this.targetScrollY + dy * 0.5,
          0,
          this.maxScroll
        );
      }
    );
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.dragStartPointerY = pointer.y;
    this.dragStartScroll = this.scrollY;
    this.lastPointerY = pointer.y;
    this.lastMoveTime = this.time.now;
    this.scrollVelocity = 0; // catch a gliding page on touch
    this.dragDistance = 0;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !pointer.isDown) return;
    const delta = this.dragStartPointerY - pointer.y;
    this.dragDistance = Math.max(this.dragDistance, Math.abs(delta));
    // Track instantaneous velocity so release can fling with inertia.
    const now = this.time.now;
    const dt = Math.max(1, now - this.lastMoveTime);
    this.scrollVelocity = ((this.lastPointerY - pointer.y) / dt) * 16; // ~px/frame
    this.lastPointerY = pointer.y;
    this.lastMoveTime = now;
    // Direct 1:1 tracking while dragging, with elastic resistance at edges.
    const rawScroll = this.dragStartScroll + delta;
    if (rawScroll < 0) {
      // Elastic overscroll at top: rubber-band resistance.
      this.scrollY = rawScroll * 0.35;
    } else if (rawScroll > this.maxScroll) {
      // Elastic overscroll at bottom.
      const overscroll = rawScroll - this.maxScroll;
      this.scrollY = this.maxScroll + overscroll * 0.35;
    } else {
      this.scrollY = rawScroll;
    }
    this.targetScrollY = this.scrollY;
    this.cameras.main.setScroll(0, this.scrollY);
  }

  private onPointerUp(): void {
    this.dragging = false;
    // If the finger was still (a tap), don't fling.
    if (this.dragDistance < ArenaHome.TAP_SLOP) this.scrollVelocity = 0;
    // If we're in overscroll, spring back to the edge.
    if (this.scrollY < 0) {
      this.targetScrollY = 0;
      this.scrollVelocity = 0;
    } else if (this.scrollY > this.maxScroll) {
      this.targetScrollY = this.maxScroll;
      this.scrollVelocity = 0;
    }
  }

  // True when the pointer moved far enough this gesture to count as a scroll, so
  // card tap handlers can ignore the up that ends a drag.
  private didDrag(): boolean {
    return this.dragDistance >= ArenaHome.TAP_SLOP;
  }

  // Per-frame inertia + lerp toward the target. A flick keeps gliding then eases
  // to rest; a wheel nudge glides smoothly instead of snapping.
  override update(): void {
    if (this.maxScroll <= 0 || this.dragging) return;

    // Inertial fling: apply decaying velocity.
    if (Math.abs(this.scrollVelocity) > 0.1) {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY + this.scrollVelocity,
        0,
        this.maxScroll
      );
      this.targetScrollY = this.scrollY;
      this.scrollVelocity *= 0.92; // friction
      if (this.scrollY <= 0 || this.scrollY >= this.maxScroll)
        this.scrollVelocity = 0;
      this.cameras.main.setScroll(0, this.scrollY);
      return;
    }
    this.scrollVelocity = 0;

    // Ease the displayed scroll toward the target (wheel / programmatic scrollTo / spring-back).
    const diff = this.targetScrollY - this.scrollY;
    if (Math.abs(diff) > 0.5) {
      // Faster spring-back when overscrolled for a snappy rubber-band feel.
      const isOverscrolled = this.scrollY < 0 || this.scrollY > this.maxScroll;
      const lerpFactor = isOverscrolled ? 0.28 : 0.2;
      this.scrollY += diff * lerpFactor;
      this.cameras.main.setScroll(0, this.scrollY);
    }
  }

  // Smoothly scroll to a target (used by the entrants deep-link).
  private scrollTo(y: number): void {
    this.maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.targetScrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.scrollVelocity = 0;
  }

  private isCurrentBuild(generation: number): boolean {
    return this.scene.isActive() && generation === this.buildGeneration;
  }

  // --- Top bar + live countdown ---------------------------------------------
  private drawTopBar(y: number): number {
    const { width } = this.scale;
    handLettered(this, width / 2, y + 22, 'ARENA', 34, UI.ink, true).setDepth(
      2
    );
    const dayLine = label(
      this,
      EDGE + 4,
      y + 58,
      `DAY ${this.state.dayNumber}  ·  ${this.state.playStreakDays}D STREAK`,
      20,
      UI.inkSoft,
      true
    ).setOrigin(0, 0.5);
    dayLine.setWordWrapWidth(width - EDGE * 2 - 96);

    // Live countdown chip.
    const chipY = y + 94;
    const chip = this.add.container(width / 2, chipY);
    const bg = this.add
      .rectangle(0, 0, width - EDGE * 2, 38, UI.creamHex, 1)
      .setStrokeStyle(3, UI.inkHex, 1);
    this.countdownLabel = label(
      this,
      14,
      0,
      this.countdownText(),
      21,
      UI.coralText,
      true
    );
    chip.add([
      bg,
      paperIcon(this, 'clock', -68, 0, {
        size: 25,
        fill: UI.tapeAlt,
      }),
      this.countdownLabel,
    ]);
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(this.countdownText()),
    });

    // Ink chip — the Mystery Ink balance, tappable to open the capsule machine.
    // It belongs to the scrolling header; the Daily Ink Trail remains available below.
    this.buildInkChip(width - EDGE - 6, y + 58);

    return y + 120;
  }

  // The compact Ink chip. Part of the scrolling header and taps into the capsule machine. Its label
  // is stored so ink-earn floats and pull results can update it in place.
  private buildInkChip(x: number, y: number): void {
    const chip = this.add.container(x, y).setDepth(120);
    const t = label(
      this,
      0,
      0,
      `${this.state.myInk ?? 0}`,
      TYPE.caption,
      UI.ink,
      true
    ).setOrigin(1, 0.5);
    const bg = this.add
      .rectangle(10, 0, t.width + 62, 44, UI.creamHex, 1)
      .setOrigin(1, 0.5)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => {
      if (!this.didDrag()) this.openCapsuleMachine();
    });
    chip.add([
      bg,
      paperIcon(this, 'ink', -t.width - 18, 0, {
        size: 24,
        fill: UI.gold,
      }),
      t,
    ]);
    this.inkChipLabel = t;
  }

  // Float a "+N 🫙" ink reward from a point, and bump the chip. Optimistic; the
  // caller supplies the amount. Pinned so it reads over any scroll.
  private floatInk(amount: number, x: number, y: number): void {
    if (amount <= 0) return;
    const next = (this.state.myInk ?? 0) + amount;
    this.state = { ...this.state, myInk: next };
    setArena(this, this.state);
    this.inkChipLabel?.setText(`${next}`);
    floatReward(this, x, y, `+${amount} INK`, UI.goldText, 3000, true);
    if (this.inkChipLabel)
      this.tweens.add({
        targets: this.inkChipLabel,
        scale: 1.25,
        duration: 140,
        yoyo: true,
      });
  }

  private openCapsuleMachine(): void {
    if (!this.requireLogin()) return;
    openCapsuleMachine(this, {
      ink: this.state.myInk ?? 0,
      nextCost: this.state.nextCapsuleCost,
      progress: this.state.capsuleProgress,
      onPull: async (operationId) => {
        const result = await pullCapsule(operationId);
        if (!result.ok) return { error: result.error };
        this.state = {
          ...this.state,
          myInk: result.data.ink,
          myPens: [...result.data.inventory.pens],
          nextCapsuleCost: result.data.nextCost,
          capsuleProgress: result.data.progress,
        };
        setArena(this, this.state);
        this.inkChipLabel?.setText(`${result.data.ink}`);
        return result.data;
      },
      // On close, re-fetch so the roster/ink/palette reflect the server truth.
      onClose: () => void this.refresh(),
      onViewCollection: () => {
        setSketchbookTab(this, 'collection');
        fadeToScene(this, 'Sketchbook');
      },
    });
  }

  private buildNextGoalCard(x: number, y: number): number {
    const goal = selectNextGoal(this.state);
    const width = this.scale.width - EDGE * 2;
    const height = 198;
    const centerY = y + height / 2;
    const card = stickerCard(this, x, centerY, width, height, {
      tapeColor: goal.actionKind === 'wait' ? UI.tapeAlt : UI.tape,
      tilt: -0.25,
      gold:
        goal.actionKind === 'capsule' ||
        goal.actionKind === 'challenge' ||
        goal.actionKind === 'rivalry',
    });
    card.add(
      label(this, 0, -62, goal.title.toUpperCase(), TYPE.title, UI.ink, true)
        .setWordWrapWidth(width - 48)
        .setLineSpacing(-4)
    );
    const evidenceLine = this.nextGoalEvidenceLine(goal);
    const evidenceLabel = label(
      this,
      0,
      -16,
      evidenceLine,
      TYPE.caption,
      UI.ink,
      true
    )
      .setWordWrapWidth(width - 54)
      .setLineSpacing(2);
    card.add(evidenceLabel);
    if (
      this.state.founderChronicle.activeRivalry ||
      this.state.founderChronicle.resolvedRivalries.length > 0
    ) {
      evidenceLabel
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (!this.didDrag()) this.openFounderMargin();
        });
    }

    if (goal.actionKind === 'wait') {
      const readyStamp = this.add
        .rectangle(0, 56, width - 120, 54, UI.creamHex, 1)
        .setStrokeStyle(3, UI.goldHex, 1);
      card.add(readyStamp);
      card.add(
        label(
          this,
          0,
          56,
          'RETURN AFTER RUMBLE',
          TYPE.caption,
          UI.goldText,
          true
        )
      );
    } else {
      card.add(
        button(
          this,
          0,
          56,
          goal.buttonLabel.toUpperCase(),
          () => this.runNextGoal(goal, y),
          width - 64,
          goal.actionKind === 'capsule' ||
            goal.actionKind === 'challenge' ||
            goal.actionKind === 'rivalry'
            ? UI.gold
            : UI.coral,
          UI.ink
        )
      );
    }
    return centerY + height / 2;
  }

  private nextGoalEvidenceLine(goal: NextGoalCard): string {
    const rivalryPlan = planFounderChronicle(
      this.state.founderChronicle,
      this.state.dayNumber
    );
    const marginEvidence = formatFounderChronicleEvidenceLine(rivalryPlan);
    if (rivalryPlan.activeRivalry && marginEvidence) return marginEvidence;
    const scribbit = goal.evidence.featuredScribbit;
    let line: string;
    if (scribbit) {
      const levelCopy =
        scribbit.nextLevelExperienceThreshold === null
          ? `Lv${scribbit.level} MAX`
          : `Lv${scribbit.level} · ${Math.max(
              0,
              scribbit.nextLevelExperienceThreshold -
                scribbit.currentExperiencePoints
            )} XP to Lv${scribbit.level + 1}`;
      const lifeCopy =
        scribbit.daysLeft <= 0 ? 'last day' : `${scribbit.daysLeft}d left`;
      line = `${levelCopy} · BELIEF ${scribbit.currentBelief}/${scribbit.legendBeliefThreshold} · ${lifeCopy}`;
    } else {
      const capsule = goal.evidence.capsule;
      const capsuleCopy =
        capsule.currentInk >= capsule.nextCapsuleCost
          ? 'Capsule ready'
          : `${Math.max(0, capsule.nextCapsuleCost - capsule.currentInk)} Ink to capsule`;
      line = `${capsuleCopy} · ${capsule.discoveredItems}/${capsule.totalCollectibleItems} found`;
    }
    return marginEvidence ? `${line} · ${marginEvidence}` : line;
  }

  private runNextGoal(goal: NextGoalCard, y: number): void {
    if (goal.actionKind === 'enter') {
      this.doEnter(goal.targetScribbit);
      return;
    }
    if (goal.actionKind === 'back') {
      this.scrollTo((this.focusEntrantsY ?? y) - 120);
      return;
    }
    if (goal.actionKind === 'challenge') {
      this.startBossChallenge();
      return;
    }
    if (goal.actionKind === 'rivalry') {
      this.doSpar(goal.targetScribbit, goal.rivalFounderId ?? undefined);
      return;
    }
    if (goal.actionKind === 'capsule') {
      this.openCapsuleMachine();
      return;
    }
    if (goal.actionKind === 'care') {
      this.doCare(goal.targetScribbit, goal.careAction);
    }
  }

  private countdownText(): string {
    const remaining = this.state.rumbleResolvesAt - Date.now();
    return formatCountdown(remaining);
  }

  // --- Forecast card ---------------------------------------------------------
  private buildForecastCard(x: number, y: number): number {
    const style = ELEMENT_STYLES[this.state.forecast.boostedElement];
    const nerf = ELEMENT_STYLES[this.state.forecast.nerfedElement];
    const width = this.scale.width - EDGE * 2;
    const height = 90;
    const centerY = y + height / 2;

    const card = stickerCard(this, x, centerY, width, height, {
      tapeColor: UI.tapeAlt,
      tilt: -0.6,
    });

    const glyphX = -width / 2 + 42;
    const glyph = elementPaperIcon(
      this,
      this.state.forecast.boostedElement,
      glyphX,
      0,
      38
    );
    card.add(glyph);

    const textX = glyphX + 48;
    card.add(this.miniChip(textX, 0, `↑ ${style.label} +15%`, style.primary));
    card.add(
      this.miniChip(textX + 250, 0, `↓ ${nerf.label} −10%`, UI.inkSoftHex)
    );

    return centerY + height / 2;
  }

  private miniChip(
    x: number,
    y: number,
    text: string,
    color: number
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const t = label(this, 0, 0, text, TYPE.caption, '#ffffff', true).setOrigin(
      0,
      0.5
    );
    const bg = this.add
      .rectangle(-8, 0, t.width + 24, 42, color, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, UI.inkHex, 1);
    c.add([bg, t]);
    return c;
  }

  // --- Champion poster (tappable; believe fix) ------------------------------
  private buildChampionPoster(x: number, y: number): number {
    const champ = this.state.champion;
    const width = this.scale.width - EDGE * 2;
    const height = champ ? 220 : 274;
    const centerY = y + height / 2;

    if (!champ) {
      const card = stickerCard(this, x, centerY, width, height, {
        gold: true,
        tapeColor: UI.tape,
      });
      const crown = paperIcon(this, 'spark', 0, -56, {
        size: 54,
        fill: UI.gold,
      });
      card.add(crown);
      // Pulsing crown to draw attention.
      this.addAmbientTween({
        targets: crown,
        scale: 1.15,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      card.add(
        label(
          this,
          0,
          28,
          'The throne is empty.\nDraw a champion tonight!',
          TYPE.title,
          UI.ink,
          true
        ).setLineSpacing(6)
      );
      return centerY + height / 2;
    }

    const challengePlan = planChampionChallenge(
      champ,
      this.state.bossChallengedToday
    );
    const card = stickerCard(this, x, centerY, width, height, {
      gold: true,
      tapeColor: UI.tape,
    });
    const top = -height / 2;
    card.add(
      label(
        this,
        0,
        top + 25,
        '☆  DAILY CHAMPION  ☆',
        TYPE.caption,
        UI.goldText,
        true
      )
    );

    // Spotlight glow behind the champion art for dramatic effect.
    const artX = -width / 2 + 56;
    const artY = top + 75;
    const artFrame = 78;
    const spotlight = this.add.graphics();
    spotlight.fillStyle(UI.gold, 0.15);
    spotlight.fillCircle(artX, artY, artFrame * 0.85);
    card.add(spotlight);
    // Pulsing spotlight for a living "wanted poster" feel.
    this.addAmbientTween({
      targets: spotlight,
      alpha: { from: 0.5, to: 0.8 },
      scale: { from: 0.95, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(
      artX - artFrame / 2,
      artY - artFrame / 2,
      artFrame,
      artFrame
    );
    frame.lineStyle(4, UI.inkHex, 1);
    frame.strokeRect(
      artX - artFrame / 2,
      artY - artFrame / 2,
      artFrame,
      artFrame
    );
    card.add(frame);
    const generation = this.buildGeneration;
    void loadDrawing(this, champ).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(
        this.add.image(x + artX, centerY + artY, key),
        70
      ).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => {
        if (!this.didDrag()) this.openDetail(champ);
      });
      this.addAmbientTween({
        targets: img,
        angle: 2,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const infoX = artX + 66;
    card.add(
      label(
        this,
        infoX,
        artY - 16,
        champ.name.toUpperCase(),
        TYPE.title,
        UI.ink,
        true
      )
        .setOrigin(0, 0.5)
        .setWordWrapWidth(width / 2 - 18)
    );
    card.add(
      label(
        this,
        infoX,
        artY + 18,
        `${ELEMENT_STYLES[champ.element].label.toUpperCase()}  ·  Lv${levelOf(champ)}`,
        17,
        ELEMENT_STYLES[champ.element].primaryText,
        true
      )
        .setOrigin(0, 0.5)
        .setWordWrapWidth(width / 2 - 18)
    );

    const actionY = height / 2 - 40;
    const belW = 96;
    if (challengePlan.status === 'open') {
      const challengeButton = careButton(
        this,
        -belW / 2 - 6,
        actionY,
        '',
        challengePlan.ctaLabel,
        UI.gold,
        () => this.startBossChallenge(),
        width - belW - 36,
        72
      );
      challengeButton.setDepth(3);
      card.add(challengeButton);
    } else {
      const completeStamp = this.add.container(-belW / 2 - 6, actionY);
      completeStamp.add([
        this.add
          .rectangle(0, 0, width - belW - 36, 72, UI.creamHex, 1)
          .setStrokeStyle(4, UI.goldHex, 1),
        label(
          this,
          0,
          0,
          `✓ ${challengePlan.ctaLabel}`,
          20,
          UI.goldText,
          true
        ).setWordWrapWidth(width - belW - 60),
      ]);
      completeStamp.setDepth(3);
      card.add(completeStamp);
    }
    // Believe on the champion — optimistic float + count bump handled centrally.
    const believeX = width / 2 - belW / 2 - 14;
    const bel = careButton(
      this,
      believeX,
      actionY,
      '',
      '',
      UI.coral,
      () => this.believeOn(champ, x, centerY + actionY),
      belW,
      72
    );
    bel.setDepth(3);
    card.add([
      bel,
      paperIcon(this, 'heart', believeX - 36, actionY, {
        size: 28,
        fill: UI.gold,
      }).setDepth(4),
      label(this, believeX + 22, actionY, 'BELIEVE', 18, UI.ink, true).setDepth(
        4
      ),
    ]);

    return centerY + height / 2;
  }

  // --- Roster (each card tappable → detail modal) ---------------------------
  private buildRoster(y: number): number {
    const { width } = this.scale;
    label(this, EDGE + 6, y, 'YOUR ROSTER', TYPE.title, UI.ink, true).setOrigin(
      0,
      0.5
    );

    const roster = this.state.myScribbits;
    if (roster.length === 0) {
      const cardY = y + 130;
      const card = stickerCard(this, width / 2, cardY, width - EDGE * 2, 200, {
        tilt: 0.5,
      });
      const pencil = this.add
        .image(0, -34, NAV_ICON_TEXTURES.draw)
        .setDisplaySize(56, 56);
      card.add(pencil);
      // Bouncing pencil to invite action.
      this.addAmbientTween({
        targets: pencil,
        y: pencil.y - 8,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      card.add(
        label(
          this,
          0,
          40,
          'Your arena is empty!\nTap DRAW below to create your first.',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(6)
      );
      return cardY + 100;
    }

    const count = Math.min(3, roster.length);
    const totalW = width - EDGE * 2;
    const rowH = 170;
    const topY = y + 46 + rowH / 2;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const rowY = topY + index * (rowH + SPACE.sm);
      this.buildRosterColumn(scribbit, width / 2, rowY, totalW, rowH);
    });
    return topY + (count - 1) * (rowH + SPACE.sm) + rowH / 2;
  }

  private buildRosterColumn(
    scribbit: Scribbit,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const card = stickerCard(this, x, y, width, height, { tape: false });

    const artSize = 88;
    const artX = -width / 2 + 60;
    const artY = -14;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    card.add(
      levelBadge(
        this,
        artX + artSize / 2 - 12,
        artY - artSize / 2 + 12,
        levelOf(scribbit),
        0.56
      )
    );
    const generation = this.buildGeneration;
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(
        this.add.image(x + artX, y + artY, key),
        artSize - 12
      ).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      // Gentle idle breathing so the creature feels alive on the roster.
      this.addAmbientTween({
        targets: img,
        scaleY: img.scaleY * 1.03,
        duration: 1300 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Pet wiggle on pointerdown for immediate tactile feedback.
      img.on('pointerdown', () => {
        this.tweens.add({
          targets: img,
          scaleX: img.scaleX * 1.15,
          scaleY: img.scaleY * 0.88,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      });
      img.on('pointerup', () => {
        if (!this.didDrag()) this.openDetail(scribbit);
      });
    });

    const infoX = artX + 64;
    const nameLabel = label(
      this,
      infoX,
      -52,
      scribbit.name,
      TYPE.body,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    nameLabel.setWordWrapWidth(210);
    card.add(nameLabel);

    const mood = moodStyleOf(scribbit);
    card.add(
      moodChip(this, infoX + 54, -20, mood.emoji, mood.label, mood.color, 0.76)
    );
    card.add(
      lifespanPips(
        this,
        infoX + 54,
        14,
        daysLeftFor(scribbit, this.state.dayNumber),
        3,
        0.68
      )
    );

    const rosterActions: CareAction[] = ['feed', 'pat', 'train'];
    const hasCareAvailable = rosterActions.some((action) =>
      canCare(scribbit, action)
    );
    const actionY = 42;
    const actionWidth = 144;
    const sparX = width / 2 - actionWidth / 2 - 10;
    const careX = sparX - actionWidth - 16;
    const openCare = (): void => this.openCarePickerFor(scribbit);
    const startSpar = (): void => this.doSpar(scribbit);
    const openCareFromPointer = (): void => {
      if (!this.didDrag()) openCare();
    };
    const startSparFromPointer = (): void => {
      if (!this.didDrag()) startSpar();
    };
    const care = iconButton(
      this,
      careX,
      actionY,
      'heart',
      'CARE',
      openCareFromPointer,
      actionWidth,
      hasCareAvailable ? UI.gold : 0xb7aa92,
      UI.ink,
      72,
      UI.creamHex,
      hasCareAvailable
    );
    if (!hasCareAvailable) care.setAlpha(0.72);
    card.add(care);
    const nativeCareControl = this.rosterActionOverlay?.add({
      label: hasCareAvailable
        ? `Care for ${scribbit.name}`
        : `Care complete for ${scribbit.name}`,
      rect: {
        x: x + careX - actionWidth / 2,
        y: y + actionY - 50,
        width: actionWidth,
        height: 100,
      },
      followCamera: true,
      pointerPassthrough: true,
      enabled: hasCareAvailable,
      onActivate: openCare,
    });
    if (nativeCareControl) {
      this.rosterCareControls.set(scribbit.id, nativeCareControl);
    }

    // Entry is promoted into the post-draw Next Goal card; roster keeps Spar.
    card.add(
      iconButton(
        this,
        sparX,
        actionY,
        'sword',
        'SPAR',
        startSparFromPointer,
        actionWidth,
        UI.coralDeep,
        UI.ink,
        72
      )
    );
    this.rosterActionOverlay?.add({
      label: `Spar with ${scribbit.name}`,
      rect: {
        x: x + sparX - actionWidth / 2,
        y: y + actionY - 50,
        width: actionWidth,
        height: 100,
      },
      followCamera: true,
      pointerPassthrough: true,
      onActivate: startSpar,
    });
  }

  // --- Tonight's pick gallery (entrant art + one icon-led action) ------------
  private buildEntrantsBracket(y: number): number {
    const { width } = this.scale;
    label(
      this,
      EDGE + 6,
      y,
      this.state.myBackedScribbitId ? "TONIGHT'S PICKS" : 'PICK A WINNER',
      TYPE.title,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    // Scout-score chip on the right of the header.
    this.buildCloutChip(width - EDGE - 6, y);

    const entrants = this.state.todayEntrants ?? [];
    if (entrants.length === 0) {
      const cardY = y + 110;
      const card = stickerCard(this, width / 2, cardY, width - EDGE * 2, 150, {
        tapeColor: UI.tapeAlt,
        tilt: 0.4,
      });
      const stadium = this.add
        .image(0, -22, NAV_ICON_TEXTURES.arena)
        .setDisplaySize(58, 58);
      card.add(stadium);
      this.addAmbientTween({
        targets: stadium,
        scale: 1.1,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      card.add(
        label(
          this,
          0,
          32,
          'The arena awaits...\nEnter the rumble to fill the bracket!',
          TYPE.body,
          UI.inkSoft,
          true
        ).setWordWrapWidth(width - 120)
      );
      return cardY + 75;
    }

    const visibleEntrants = selectVisibleArenaEntrants({
      entrantsInSourceOrder: entrants,
      ownedScribbitIdsInRosterOrder: this.state.myScribbits.map(
        (scribbit) => scribbit.id
      ),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    const perRow = 2;
    const cellGap = SPACE.md;
    const cellW = (width - EDGE * 2 - cellGap) / perRow;
    const cellH = 160;
    const rows = Math.ceil(visibleEntrants.length / perRow);
    const topY = y + 46;
    visibleEntrants.forEach((entrant, index) => {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const cx = EDGE + cellW / 2 + col * (cellW + cellGap);
      const cy = topY + cellH / 2 + row * (cellH + SPACE.sm);
      this.buildEntrantMini(entrant, cx, cy, cellW, cellH);
    });
    return topY + rows * (cellH + SPACE.sm);
  }

  private buildEntrantMini(
    entrant: Scribbit,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const backed = this.state.myBackedScribbitId === entrant.id;
    const card = stickerCard(this, x, y, width, height, {
      gold: backed,
      tape: false,
      tapeColor: backed ? UI.tape : UI.tapeAlt,
    });
    const top = -height / 2;

    const artSize = 82;
    const artX = -width / 2 + 58;
    const artY = top + 18 + artSize / 2;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    const generation = this.buildGeneration;
    void loadDrawing(this, entrant).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(
        this.add.image(x + artX, y + artY, key),
        artSize - 10
      ).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => {
        if (!this.didDrag()) this.openDetail(entrant);
      });
    });

    // "Your pick" rosette on backed entrants.
    if (backed)
      card.add(
        rosette(this, artX + artSize / 2 - 4, artY - artSize / 2 - 2, 0.72)
      );

    const infoX = artX + artSize / 2 + 16;
    let cursor = top + 38;
    const nameLabel = label(
      this,
      infoX,
      cursor,
      entrant.name,
      TYPE.body,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    nameLabel.setWordWrapWidth(width - 142);
    card.add(nameLabel);

    cursor += 46;
    card.add(elementPaperIcon(this, entrant.element, infoX + 18, cursor, 34));

    // One heart-sized action replaces the repeated full-width Back labels.
    const actionX = width / 2 - 62;
    const actionY = height / 2 - 40;
    const { backKind, backEnabled, backFill } =
      this.backButtonPresentation(entrant);
    const actionIcon = backKind === 'locked' ? 'lock' : 'heart';
    const iconFill =
      backKind === 'available'
        ? UI.gold
        : backKind === 'picked'
          ? UI.coralDeep
          : UI.creamHex;
    const activateBack = (): void => {
      if (this.didDrag()) return;
      if (backEnabled) this.doBack(entrant);
      else if (backKind === 'owned') {
        showToast('That is your Scribbit — pick another contender.');
      } else {
        this.showBackLockedToast();
      }
    };
    const backBtn =
      backKind === 'owned'
        ? careButton(
            this,
            actionX,
            actionY,
            '',
            'YOURS',
            backFill,
            activateBack,
            104,
            64
          )
        : paperIconButton(
            this,
            actionX,
            actionY,
            actionIcon,
            activateBack,
            104,
            backFill,
            iconFill,
            64
          );
    if (!backEnabled && !backed) backBtn.setAlpha(0.78);
    card.add(backBtn);
  }

  private backButtonPresentation(entrant: Scribbit): {
    backKind: ArenaBackActionKind;
    backLabel: string;
    backEnabled: boolean;
    backFill: number;
  } {
    const action = planArenaBackAction({
      entrantId: entrant.id,
      ownedScribbitIds: this.state.myScribbits.map((scribbit) => scribbit.id),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    const backFill =
      action.kind === 'picked'
        ? UI.gold
        : action.kind === 'available'
          ? UI.coral
          : 0xb7aa92;
    return {
      backKind: action.kind,
      backLabel: action.label,
      backEnabled: action.enabled,
      backFill,
    };
  }

  private showBackLockedToast(): void {
    const pick = this.state.todayEntrants.find(
      (one) => one.id === this.state.myBackedScribbitId
    );
    showToast(
      pick
        ? `You already backed ${pick.name} tonight — one pick per day!`
        : 'You already used your Back tonight.'
    );
  }

  // --- Scout-score clout chip -----------------------------------------------
  private buildCloutChip(x: number, y: number): void {
    const chip = this.add.container(x, y);
    const t = label(
      this,
      0,
      0,
      `SCOUT ${this.state.myClout}`,
      TYPE.caption,
      UI.ink,
      true
    ).setOrigin(1, 0.5);
    const bg = this.add
      .rectangle(8, 0, t.width + 28, 40, UI.gold, 1)
      .setOrigin(1, 0.5)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => fadeToScene(this, 'ScoutNotebook'));
    chip.add([bg, t]);
  }

  // --- Draw CTA / rumble status ---------------------------------------------
  private buildActionRow(x: number, y: number): number {
    const width = this.scale.width - EDGE * 2;
    if (!this.state.drawnToday) {
      const drawEligibility = getDrawEligibility(this.state);
      const btnY = y + 70;
      if (!this.state.loggedIn) {
        dominantButton(
          this,
          x,
          btnY,
          'SIGN IN TO DRAW',
          () => this.startDraw(),
          width,
          true
        );
        return btnY + 70;
      }
      if (!drawEligibility.canDraw) {
        const card = stickerCard(this, x, btnY, width, 112, {
          tapeColor: UI.tape,
          tilt: -0.4,
        });
        card.add(
          label(
            this,
            0,
            0,
            'ROSTER FULL\nRemove one Scribbit or wait for one to fade.',
            TYPE.title,
            UI.ink,
            true
          ).setWordWrapWidth(width - 60)
        );
        return btnY + 70;
      }
      dominantButton(
        this,
        x,
        btnY,
        'DRAW TODAY',
        () => this.startDraw(),
        width,
        true
      );
      return btnY + 70;
    }

    if (this.state.enteredToday && !this.state.myBackedScribbitId) {
      const btnY = y + 70;
      dominantButton(
        this,
        x,
        btnY,
        "PICK TONIGHT'S WINNER",
        () => this.scrollTo((this.focusEntrantsY ?? y) - 120),
        width,
        true
      );
      return btnY + 70;
    }

    const cardY = y + 46;
    const card = stickerCard(this, x, cardY, width, 92, {
      tapeColor: this.state.enteredToday ? UI.tapeAlt : UI.tape,
      tilt: -0.4,
    });
    const text = this.state.enteredToday
      ? '✓ Pick locked — return after the Rumble for Clout'
      : '✓ Scribbit drawn — enter it from your roster';
    card.add(
      label(this, 0, 0, text, TYPE.title, UI.ink, true).setWordWrapWidth(
        width - 60
      )
    );
    return cardY + 46;
  }

  private showRumbleReceiptIfNeeded(afterContinue?: () => void): boolean {
    const receipt = this.state.lastRumbleReceipt;
    if (!receipt) return false;
    const shownKey = 'lastRumbleReceiptShownDay';
    if (this.registry.get(shownKey) === receipt.resolvedDay) return false;

    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(2200);
    const actionOverlay = new CanvasActionOverlay(this);
    this.events.once('shutdown', () => actionOverlay.destroy());
    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.58)
      .setInteractive();
    layer.add(shade);

    const presentation = planRumbleReturnPresentation(receipt);
    const accessibleSummary =
      formatRumbleReturnAccessibleSummary(presentation);
    const acknowledgeReceipt = (): void => {
      this.registry.set(shownKey, receipt.resolvedDay);
    };
    const card = stickerCard(this, width / 2, height / 2, width - 100, 610, {
      gold: presentation.highlight,
      tapeColor: UI.tapeAlt,
    });
    layer.add(card);

    const hasOwnedPortrait = receipt.kind === 'owned';
    card.add(
      label(this, 0, -220, presentation.title, 44, UI.ink, true)
        .setWordWrapWidth(width - 180)
        .setLineSpacing(-4)
    );
    if (hasOwnedPortrait) {
      void loadDrawing(this, receipt.entrant).then((textureKey) => {
        if (!this.scene.isActive() || !layer.active || !card.active) return;
        const portrait = fitDrawing(
          this.add.image(0, -92, textureKey, '__BASE'),
          176
        );
        card.add(portrait);
      });
    }

    if (presentation.detail) {
      card.add(
        label(
          this,
          0,
          -100,
          presentation.detail,
          32,
          UI.inkSoft,
          true
        )
          .setWordWrapWidth(width - 190)
          .setLineSpacing(3)
      );
    }
    card.add(
      label(
        this,
        0,
        hasOwnedPortrait ? 25 : 5,
        presentation.reward,
        32,
        receipt.inkAwarded > 0 ? UI.goldText : UI.inkSoft,
        true
      ).setWordWrapWidth(width - 190)
    );

    const drawEligibility = getDrawEligibility(this.state);
    const nextLabel = afterContinue
      ? 'LEGACY BOOK'
      : this.state.drawnToday
        ? 'CONTENDERS'
        : drawEligibility.canDraw
          ? `DRAW DAY ${this.state.dayNumber}`
          : 'CONTINUE';
    const continueFromReceipt = (): void => {
      acknowledgeReceipt();
      actionOverlay.destroy();
      layer.destroy(true);
      if (afterContinue) {
        afterContinue();
        return;
      }
      if (this.state.drawnToday) {
        this.scrollTo((this.focusEntrantsY ?? 0) - 120);
      } else if (drawEligibility.canDraw) {
        this.startDraw();
      } else {
        showToast(drawEligibility.message);
      }
    };

    if (receipt.replayAvailable) {
      let loadingReplay = false;
      const watchReplay = (): void => {
        if (loadingReplay) return;
        loadingReplay = true;
        void fetchRumbleReplay(receipt.resolvedDay)
          .then((result) => {
            if (!this.scene.isActive() || !layer.active) return;
            if (!result.ok) {
              loadingReplay = false;
              showToast(result.error);
              return;
            }
            if (afterContinue) {
              setSketchbookTab(this, 'sketchbook');
            }
            acknowledgeReceipt();
            actionOverlay.destroy();
            layer.destroy(true);
            setSavedReplay(
              this,
              result.data,
              afterContinue ? 'Sketchbook' : 'ArenaHome'
            );
            this.scene.start('Replay');
          })
          .catch(() => {
            if (!this.scene.isActive() || !layer.active) return;
            loadingReplay = false;
            showToast('The Rumble film reel slipped. Try again.');
          });
      };
      const watchLabel =
        receipt.kind === 'owned' ? 'WATCH LAST BOUT' : 'WATCH BOUT';
      card.add(
        button(
          this,
          0,
          165,
          watchLabel,
          watchReplay,
          width - 220,
          UI.gold,
          UI.ink
        )
      );
      actionOverlay.add({
        label: `${receipt.kind === 'owned' ? 'Watch last bout' : 'Watch bout'}. ${accessibleSummary}`,
        rect: {
          x: 110,
          y: height / 2 + 115,
          width: width - 220,
          height: 100,
        },
        onActivate: watchReplay,
      });
      card.add(
        ghostButton(
          this,
          0,
          265,
          nextLabel,
          continueFromReceipt,
          width - 260
        )
      );
      actionOverlay.add({
        label: `${nextLabel}. ${accessibleSummary}`,
        rect: {
          x: 130,
          y: height / 2 + 215,
          width: width - 260,
          height: 100,
        },
        onActivate: continueFromReceipt,
      });
      return true;
    }

    card.add(
      button(
        this,
        0,
        145,
        nextLabel,
        continueFromReceipt,
        width - 220,
        UI.coral,
        UI.ink
      )
    );
    actionOverlay.add({
      label: `${nextLabel}. ${accessibleSummary}`,
      rect: {
        x: 110,
        y: height / 2 + 95,
        width: width - 220,
        height: 100,
      },
      onActivate: continueFromReceipt,
    });
    return true;
  }

  private showReturnReceiptsIfNeeded(): void {
    if (
      this.showFounderChronicleBeatIfNeeded(() => {
        if (this.showLegacyReturnIfNeeded()) return;
        this.showRumbleReceiptIfNeeded();
      })
    ) {
      return;
    }
    if (this.showLegacyReturnIfNeeded()) return;
    this.showRumbleReceiptIfNeeded();
  }

  private openFounderMargin(
    newestBeat: FounderChronicleBeat | null = null,
    afterClose?: () => void
  ): void {
    if (this.founderChronicleMargin) return;
    const plan = planFounderChronicle(
      this.state.founderChronicle,
      this.state.dayNumber
    );
    const challenger = this.state.myScribbits[0];
    this.founderChronicleMargin = openFounderChronicleMargin(this, {
      chronicle: this.state.founderChronicle,
      currentDay: this.state.dayNumber,
      newestBeat,
      ...(plan.activeRivalry?.readyToday && challenger
        ? {
            onContinue: () =>
              this.doSpar(challenger, plan.activeRivalry?.founderId),
          }
        : {}),
      onClose: () => {
        this.founderChronicleMargin = null;
        afterClose?.();
      },
    });
  }

  private showFounderChronicleBeatIfNeeded(afterClose: () => void): boolean {
    const beats = takeFounderChronicleBeats(this);
    const newestBeat = beats.at(-1);
    if (!newestBeat) return false;
    this.openFounderMargin(newestBeat, afterClose);
    return true;
  }

  private showLegacyReturnIfNeeded(): boolean {
    const receipt = this.state.legacyReturnReceipt;
    if (!receipt || receipt.cards.length === 0) return false;
    const rumbleReceipt = this.state.lastRumbleReceipt;
    const hasPendingRumbleReceipt =
      rumbleReceipt !== null &&
      this.registry.get('lastRumbleReceiptShownDay') !==
        rumbleReceipt.resolvedDay;
    const openLegacyBook = (): void => {
      setSketchbookTab(this, 'sketchbook');
      fadeToScene(this, 'Sketchbook');
    };

    let ceremony: Phaser.GameObjects.Container | null = null;
    ceremony = openLegacyReturnCeremony({
      scene: this,
      receipt,
      continueLabel: hasPendingRumbleReceipt
        ? 'RUMBLE RESULT'
        : 'LEGACY BOOK',
      continueIcon: hasPendingRumbleReceipt ? 'sword' : 'book',
      onDismiss: () => {
        ceremony = null;
        if (hasPendingRumbleReceipt) {
          this.showRumbleReceiptIfNeeded(openLegacyBook);
        }
      },
      onContinue: async () => {
        const result = await markLegacyCardsSeen(receipt.newestArchivedDay);
        if (!result.ok) return result.error;

        const nextState = { ...this.state, legacyReturnReceipt: null };
        this.state = nextState;
        setArena(this, nextState);
        ceremony?.destroy(true);
        if (!this.showRumbleReceiptIfNeeded(openLegacyBook)) {
          openLegacyBook();
        }
        return null;
      },
    });
    return ceremony !== null;
  }

  private openLegends(): void {
    this.registry.set('sketchbookTab', 'legends');
    fadeToScene(this, 'Sketchbook');
  }

  private buildAppTabs(): void {
    appDock(this, 'arena', {
      arena: () => this.scrollTo(0),
      gallery: () => this.openLegends(),
    });
  }

  // --- Detail modal (the one component, wired for context) ------------------
  private openDetail(scribbit: Scribbit): void {
    const mine = this.state.myScribbits.some((one) => one.id === scribbit.id);
    const isEntrant = this.state.todayEntrants.some(
      (one) => one.id === scribbit.id
    );
    const actions: DetailModalActions = {};
    if (mine) {
      actions.onSpar = (s) => this.doSpar(s);
      actions.onCare = () => this.openCarePickerFor(scribbit);
      // Enter is only meaningful for a drawn-but-not-yet-entered scribbit.
      if (this.state.drawnToday && !this.state.enteredToday) {
        actions.onEnter = (s) => this.doEnter(s);
        actions.enterLabel = 'Enter Rumble';
        actions.enterEnabled = true;
      }
    } else {
      actions.canBelieve = scribbit.status === 'alive';
      if (isEntrant) {
        const { backLabel, backEnabled } =
          this.backButtonPresentation(scribbit);
        actions.onBack = (s) => this.doBack(s);
        actions.backLabel = backLabel;
        actions.backEnabled = backEnabled;
      }
    }
    openDetailModal(this, scribbit, {
      currentDay: this.state.dayNumber,
      mine,
      onBelieved: (id, belief) => this.applyBelief(id, belief),
      onRemoved: () => void this.refresh(),
      onReported: () => void this.refresh(),
      actions,
    });
  }

  private openCarePickerFor(scribbit: Scribbit): void {
    if (this.busy || this.carePicker) return;
    const returnFocus =
      document.activeElement instanceof HTMLButtonElement
        ? this.rosterCareControls.get(scribbit.id)
        : null;
    this.rosterActionOverlay?.setVisible(false);
    const restoreRosterControls = (): void => {
      this.rosterActionOverlay?.setVisible(true);
      returnFocus?.focus();
    };
    this.carePicker = openCarePicker(this, {
      scribbit,
      onChoose: (action) => {
        this.carePicker?.destroy();
        this.carePicker = null;
        restoreRosterControls();
        this.doCare(scribbit, action, returnFocus !== null);
      },
      onClose: () => {
        this.carePicker?.destroy();
        this.carePicker = null;
        restoreRosterControls();
      },
    });
  }

  // --- Actions ---------------------------------------------------------------
  private startDraw(): void {
    navigateToDailyDraw(this);
  }

  private doCare(
    scribbit: Scribbit,
    action: CareAction,
    focusReceipt = false
  ): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (!canCare(scribbit, action)) {
      showToast(`${scribbit.name} already had their ${action} today 💤`);
      return;
    }
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    void careForScribbit(scribbit.id, action).then((result) => {
      this.busy = false;
      this.spinner?.hide();
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      const updatedScribbit = result.data.scribbit;
      const careMoment = planCareMoment(
        scribbit,
        updatedScribbit,
        action,
        this.state.dayNumber,
        result.data.inkAwarded
      );
      // Render only the exact Ink amount confirmed by the server response.
      this.floatInk(result.data.inkAwarded, this.scale.width - EDGE - 40, 120);
      this.applyScribbitUpdate(updatedScribbit);
      this.careMomentOverlay = openCareMomentOverlay(
        this,
        updatedScribbit,
        careMoment,
        focusReceipt
      );
    });
  }

  private doSpar(scribbit: Scribbit, opponentId?: string): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const opponent = opponentId
      ? getFoundingScribbitDefinition(opponentId)
      : null;
    showToast(
      opponent
        ? `${scribbit.name} returns to ${opponent.name}'s blue-tape margin…`
        : `${scribbit.name} steps up for a friendly spar…`
    );
    void spar(scribbit.id, opponentId).then((result) => {
      this.busy = false;
      this.spinner?.hide();
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      const stagedBattle = stageDirectBattle(
        this,
        this.state,
        result.data,
        scribbit.id
      );
      if (stagedBattle.arena) this.state = stagedBattle.arena;
      // Show dramatic VS ceremony before the battle replay
      showVsCeremony(this, {
        fighterA: result.data.report.a,
        fighterB: result.data.report.b,
        battleKind: result.data.report.kind,
        rivalryStakes: stagedBattle.rivalryStakes,
        onComplete: () => this.scene.start('Replay'),
      });
    });
  }

  private doEnter(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    this.busy = true;
    void enterRumble(scribbit.id).then((result) => {
      this.busy = false;
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      showToast(`${scribbit.name} is in tonight's Rumble!`);
      void this.refresh();
    });
  }

  private doBack(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (this.state.myBackedScribbitId) {
      this.showBackLockedToast();
      return;
    }
    this.busy = true;
    // Optimistic: mark the pick locally so the rosette + locks appear at once.
    const optimistic = { ...this.state, myBackedScribbitId: scribbit.id };
    this.state = optimistic;
    setArena(this, optimistic);
    void backScribbit(scribbit.id).then((result) => {
      this.busy = false;
      if (!result.ok) {
        // Roll back and surface the error.
        const rolledBack = { ...this.state, myBackedScribbitId: null };
        this.state = rolledBack;
        setArena(this, rolledBack);
        this.build();
        this.showError(result.error);
        return;
      }
      showToast(`🎯 ${scribbit.name} was pinned in your Scout Notebook.`);
      void this.refresh();
    });
    // Re-render immediately for the optimistic rosette.
    this.build();
  }

  private applyScribbitUpdate(updated: Scribbit): void {
    const nextRoster = this.state.myScribbits.map((one) =>
      one.id === updated.id ? updated : one
    );
    const nextState = { ...this.state, myScribbits: nextRoster };
    this.state = nextState;
    setArena(this, nextState);
    this.build();
  }

  // Believe on the champion (from its poster button). Optimistic float + count,
  // server reconciles, errors surfaced.
  private believeOn(scribbit: Scribbit, floatX: number, floatY: number): void {
    if (!this.requireLogin()) return;
    floatReward(this, floatX, floatY, '+1 BELIEF');
    void believe(scribbit.id).then((result) => {
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      this.applyBelief(scribbit.id, result.data.belief);
      showToast(`You believe in ${scribbit.name}! (${result.data.belief})`);
    });
  }

  // Reconcile a belief count into the snapshot wherever the scribbit appears.
  private applyBelief(id: string, belief: number): void {
    const patch = (s: Scribbit): Scribbit =>
      s.id === id ? { ...s, belief } : s;
    const next: ArenaState = {
      ...this.state,
      champion: this.state.champion ? patch(this.state.champion) : null,
      myScribbits: this.state.myScribbits.map(patch),
      todayEntrants: this.state.todayEntrants.map(patch),
    };
    this.state = next;
    setArena(this, next);
    this.build();
  }

  private startBossChallenge(): void {
    if (!this.requireLogin()) return;
    if (this.state.bossChallengedToday) {
      showToast("Today's Champion Challenge is already complete.");
      return;
    }
    const alive = this.state.myScribbits;
    if (alive.length === 0) {
      showToast('Draw a scribbit first, then challenge the champion!');
      return;
    }
    if (alive.length === 1) {
      const only = alive[0];
      if (only) void this.resolveBoss(only);
      return;
    }
    this.showChallengerPicker(alive);
  }

  private showChallengerPicker(alive: Scribbit[]): void {
    const { width, height } = this.scale;
    const champion = this.state.champion;
    if (!champion) {
      showToast('No Champion is holding the contract today.');
      return;
    }
    const challengePlan = planChampionChallenge(champion, false);
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.creamHex, 0.94)
      .setScrollFactor(0)
      .setInteractive();
    overlay.add(shade);
    const panel = stickerCard(this, width / 2, height * 0.51, width - 64, 780, {
      gold: true,
      tapeColor: UI.tapeAlt,
      tilt: -0.2,
    })
      .setScrollFactor(0)
      .setDepth(500);
    overlay.add(panel);
    overlay.add(
      label(
        this,
        width / 2,
        height * 0.25,
        'CHAMPION CONTRACT',
        TYPE.title,
        UI.goldText,
        true
      ).setScrollFactor(0)
    );
    overlay.add(
      label(
        this,
        width / 2,
        height * 0.29,
        `${champion.name.toUpperCase()}  •  ${challengePlan.epithet.toUpperCase()}`,
        TYPE.body,
        UI.ink,
        true
      )
        .setScrollFactor(0)
        .setWordWrapWidth(width - 130)
    );
    overlay.add(
      label(
        this,
        width / 2,
        height * 0.335,
        `“${challengePlan.challengeLine}”`,
        19,
        UI.inkSoft,
        true
      )
        .setScrollFactor(0)
        .setWordWrapWidth(width - 130)
        .setLineSpacing(-2)
    );
    overlay.add(
      label(
        this,
        width / 2,
        height * 0.39,
        challengePlan.statusCopy,
        TYPE.caption,
        UI.coralText,
        true
      ).setScrollFactor(0)
    );

    alive.slice(0, 3).forEach((scribbit, index) => {
      const slotX = width / 2 + (index - (alive.length - 1) / 2) * 200;
      const slotY = height * 0.53;
      const card = stickerCard(this, slotX, slotY, 184, 282, {
        tape: false,
        tilt: index % 2 === 0 ? -0.7 : 0.7,
      });
      card.setScrollFactor(0).setDepth(500);
      overlay.add(card);
      const generation = this.buildGeneration;
      void loadDrawing(this, scribbit).then((key) => {
        if (!this.isCurrentBuild(generation) || !overlay.active) return;
        const img = fitDrawing(this.add.image(slotX, slotY - 44, key), 112)
          .setScrollFactor(0)
          .setDepth(501);
        overlay.add(img);
      });
      const power = selectPrimaryPower(scribbit.stats);
      overlay.add(
        label(
          this,
          slotX,
          slotY + 42,
          scribbit.name,
          TYPE.body,
          UI.ink,
          true
        ).setScrollFactor(0)
      );
      overlay.add(
        label(
          this,
          slotX,
          slotY + 78,
          getShapePowerSignatureName(scribbit.element, power).toUpperCase(),
          16,
          ELEMENT_STYLES[scribbit.element].primaryText,
          true
        )
          .setScrollFactor(0)
          .setWordWrapWidth(160)
      );
      overlay.add(
        label(
          this,
          slotX,
          slotY + 112,
          `Lv${levelOf(scribbit)}  •  ${ELEMENT_STYLES[scribbit.element].label}`,
          TYPE.caption,
          UI.inkSoft,
          true
        ).setScrollFactor(0)
      );
      const hitArea = this.add
        .rectangle(slotX, slotY, 184, 282, 0xffffff, 0.001)
        .setScrollFactor(0)
        .setDepth(502)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        overlay.destroy(true);
        void this.resolveBoss(scribbit);
      });
      overlay.add(hitArea);
    });
    overlay.add(
      ghostButton(
        this,
        width / 2,
        height * 0.76,
        'Not yet',
        () => overlay.destroy(true),
        200
      ).setScrollFactor(0)
    );
  }

  private async resolveBoss(scribbit: Scribbit): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const champion = this.state.champion;
    showToast(
      champion
        ? `${champion.name}: “${planChampionChallenge(champion, false).challengeLine}”`
        : `${scribbit.name} steps into the arena…`
    );
    const result = await bossChallenge(scribbit.id);
    this.busy = false;
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    const stagedBattle = stageDirectBattle(
      this,
      this.state,
      result.data,
      scribbit.id
    );
    if (stagedBattle.arena) this.state = stagedBattle.arena;
    // Show dramatic VS ceremony before the boss battle replay
    showVsCeremony(this, {
      fighterA: result.data.report.a,
      fighterB: result.data.report.b,
      battleKind: result.data.report.kind,
      rivalryStakes: stagedBattle.rivalryStakes,
      onComplete: () => this.scene.start('Replay'),
    });
  }

  private requireLogin(): boolean {
    if (this.state.loggedIn) return true;
    showToast('Sign in to Reddit to play!');
    showLoginPrompt();
    return false;
  }

  private async refresh(): Promise<void> {
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const result = await fetchArena();
    this.spinner?.hide();
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    this.state = result.data;
    setArena(this, result.data);
    this.build();
    this.showReturnReceiptsIfNeeded();
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
        void this.refresh();
      }
    );
    this.errorPanelRef.container.setScrollFactor(0);
  }
}
