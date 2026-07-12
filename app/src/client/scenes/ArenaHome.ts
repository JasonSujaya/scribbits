import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import {
  fetchArena,
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
  setGalleryTab,
  isRumbleReceiptShown,
  markRumbleReceiptShown,
  isLegacyReturnDismissed,
  markLegacyReturnDismissed,
  takeFounderChronicleBeats,
  takeArenaFocus,
} from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  levelOf,
  canCare,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { ELEMENT_STYLES, EDGE, NAV_SAFE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  ghostButton,
  iconButton,
  label,
  handLettered,
  errorPanel,
  stickerCard,
  floatReward,
  button,
  fadeToScene,
  spinner,
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
import { planFounderChronicle } from '../lib/founderchronicle';
import { openFounderChronicleMargin } from '../lib/founderchroniclemargin';
import type { FounderChronicleMargin } from '../lib/founderchroniclemargin';
import { planCareMoment } from '../lib/caremoment';
import { openCareMomentOverlay } from '../lib/caremomentoverlay';
import type { CareMomentOverlay } from '../lib/caremomentoverlay';
import { openCarePicker, type CarePicker } from '../lib/carepicker';
import { paperDockIcon, paperIcon } from '../lib/papericons';
import {
  getDrawEligibility,
  navigateToDailyDraw,
} from '../lib/draweligibility';
import { appDock } from '../lib/appdock';
import {
  formatRumbleReturnAccessibleSummary,
  planRumbleReturnPresentation,
} from '../lib/rumblereturnpresentation';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import {
  openArenaContenderPicker,
  type ArenaContenderPicker,
} from '../lib/arenacontenderpicker';

// The landing scene: one daily action, one champion fight, one Rumble preview,
// and a compact roster. Deeper choices open focused overlays instead of turning
// the home screen into a dashboard. Polls /api/arena on wake.
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
  private contenderPicker: ArenaContenderPicker | null = null;
  private rosterActionOverlay: CanvasActionOverlay | null = null;
  private homeInteractionSuspended = false;

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
    this.buildGeneration = 0;
    this.founderChronicleMargin = null;
    this.careMomentOverlay = null;
    this.carePicker = null;
    this.contenderPicker = null;
    this.rosterActionOverlay = null;
    this.homeInteractionSuspended = false;
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
    this.contenderPicker?.destroy();
    this.contenderPicker = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = null;
  }

  // --- Layout: a vertical stack measured top-down so nothing overlaps and the
  // page can scroll. Each builder returns the y it consumed to; a running
  // cursor drives the next section. -----------------------------------------
  private build(): void {
    this.buildGeneration += 1;
    this.homeInteractionSuspended = false;
    this.dragging = false;
    this.dragDistance = 0;
    this.scrollVelocity = 0;
    this.careMomentOverlay?.destroy();
    this.careMomentOverlay = null;
    this.carePicker?.destroy();
    this.carePicker = null;
    this.contenderPicker?.destroy();
    this.contenderPicker = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = new CanvasActionOverlay(this);
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
      // The Arena header already carries live status and currency. Random edge
      // creatures can peek through that compact chrome and read like a broken
      // icon, so keep this decision screen visually still and unambiguous.
      edgeCreatures: false,
    });

    const { width } = this.scale;
    let cursor = 30;
    cursor = this.drawTopBar(cursor);
    cursor = this.buildPrimaryAction(width / 2, cursor + 18);
    cursor = this.buildChampionPoster(width / 2, cursor + 18);
    cursor = this.buildRumbleSummary(width / 2, cursor + 18);
    if (this.state.myScribbits.length > 0) {
      cursor = this.buildRoster(cursor + 34);
    }
    cursor += NAV_SAFE;

    this.contentHeight = cursor + 40;
    this.setupScrolling();
    this.buildAppTabs();
    this.spinner?.destroy();
    this.spinner = spinner(this, 1500);

    // Honour a deep-link request (loss card → contender picker).
    if (takeArenaFocus(this) === 'entrants') {
      this.time.delayedCall(0, () => this.openContenderPicker());
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
        if (this.homeInteractionSuspended) return;
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
    if (this.homeInteractionSuspended) return;
    this.dragging = true;
    this.dragStartPointerY = pointer.y;
    this.dragStartScroll = this.scrollY;
    this.lastPointerY = pointer.y;
    this.lastMoveTime = this.time.now;
    this.scrollVelocity = 0; // catch a gliding page on touch
    this.dragDistance = 0;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.homeInteractionSuspended || !this.dragging || !pointer.isDown)
      return;
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
    if (this.homeInteractionSuspended) {
      this.dragging = false;
      return;
    }
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
    handLettered(this, width / 2, y + 28, 'ARENA', 42, UI.ink, true).setDepth(
      2
    );
    const statusY = y + 92;
    label(
      this,
      width / 2 - 54,
      statusY,
      `DAY ${this.state.dayNumber}  •  ${this.state.playStreakDays}D`,
      21,
      UI.inkSoft,
      true
    );
    this.countdownLabel = label(
      this,
      width / 2 + 122,
      statusY,
      this.countdownText(),
      21,
      UI.coralText,
      true
    );
    paperIcon(this, 'clock', width / 2 + 40, statusY, {
      size: 25,
      fill: UI.tapeAlt,
    });
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(this.countdownText()),
    });

    // Ink chip — the Mystery Ink balance, tappable to open the capsule machine.
    // It belongs to the scrolling header; the Daily Ink Trail remains available below.
    this.buildInkChip(width - 58, y + 30);

    return y + 118;
  }

  // The compact Ink chip. Part of the scrolling header and taps into the capsule machine. Its label
  // is stored so ink-earn floats and pull results can update it in place.
  private buildInkChip(x: number, y: number): void {
    const chip = this.add.container(x, y).setDepth(120);
    const activate = (): void => {
      if (!this.didDrag()) this.openCapsuleMachine();
    };
    const t = label(this, 0, 18, `${this.state.myInk ?? 0}`, 18, UI.ink, true);
    const bg = this.add
      .circle(0, 0, 48, UI.creamHex, 1)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', activate);
    chip.add([
      bg,
      paperIcon(this, 'ink', 0, -13, {
        size: 30,
        fill: UI.gold,
      }),
      t,
    ]);
    this.rosterActionOverlay?.add({
      label: `${this.state.myInk ?? 0} Ink. Open capsule machine.`,
      rect: { x: x - 50, y: y - 50, width: 100, height: 100 },
      followCamera: true,
      pointerPassthrough: true,
      onActivate: activate,
    });
    this.inkChipLabel = t;
  }

  // Float a concise Ink reward from a point, and bump the chip. Optimistic; the
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
        setGalleryTab(this, 'collection');
        fadeToScene(this, 'Gallery');
      },
    });
  }

  private buildPrimaryAction(x: number, y: number): number {
    const width = this.scale.width - EDGE * 2;
    const drawEligibility = getDrawEligibility(this.state);
    const goal = this.state.drawnToday ? selectNextGoal(this.state) : null;
    const height = goal ? 164 : 236;
    const centerY = y + height / 2;
    const card = this.add.container(x, centerY);
    const isDrawReady = !goal && this.state.loggedIn && drawEligibility.canDraw;
    const fill = isDrawReady ? UI.coral : goal ? UI.paper : UI.tapeAlt;
    const panel = this.add.graphics();
    panel.fillStyle(0x6f4b32, 0.18);
    panel.fillRoundedRect(-width / 2 + 6, -height / 2 + 8, width, height, 28);
    panel.fillStyle(fill, 1);
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, 28);
    panel.lineStyle(5, UI.inkHex, 1);
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, 28);
    card.add(panel);

    let actionLabel: string;
    let activate: (() => void) | null = null;
    if (!goal) {
      actionLabel = !this.state.loggedIn
        ? 'SIGN IN TO DRAW'
        : drawEligibility.canDraw
          ? 'DRAW'
          : 'ROSTER FULL';
      const icon = drawEligibility.canDraw ? 'draw' : 'arena';
      card.add(paperDockIcon(this, icon, 0, -42, 92, UI.inkHex));
      card.add(label(this, 0, 66, actionLabel, 52, UI.ink, true));
      if (!this.state.loggedIn || drawEligibility.canDraw) {
        activate = () => this.startDraw();
      }
    } else {
      const iconKey =
        goal.actionKind === 'back' || goal.actionKind === 'care'
          ? 'heart'
          : goal.actionKind === 'capsule'
            ? 'ink'
            : goal.actionKind === 'wait'
              ? 'clock'
              : 'sword';
      card.add(
        paperIcon(this, iconKey, -width / 2 + 76, 0, {
          size: 58,
          fill: goal.actionKind === 'wait' ? UI.tapeAlt : UI.coral,
        })
      );
      card.add(
        label(
          this,
          -width / 2 + 130,
          -25,
          'NEXT',
          19,
          UI.inkSoft,
          true
        ).setOrigin(0, 0.5)
      );
      actionLabel =
        goal.actionKind === 'wait'
          ? 'RETURN AFTER RUMBLE'
          : goal.buttonLabel.toUpperCase();
      card.add(
        label(this, -width / 2 + 130, 22, actionLabel, 32, UI.ink, true)
          .setOrigin(0, 0.5)
          .setWordWrapWidth(width - 190)
      );
      if (goal.actionKind !== 'wait') activate = () => this.runNextGoal(goal);
    }

    if (activate) {
      const hit = this.add
        .rectangle(0, 0, width, height, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!this.didDrag()) activate?.();
      });
      card.add(hit);
      this.rosterActionOverlay?.add({
        label: actionLabel,
        rect: { x: x - width / 2, y, width, height },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: activate,
      });
    }
    return centerY + height / 2;
  }

  private runNextGoal(goal: NextGoalCard): void {
    if (goal.actionKind === 'enter') {
      this.doEnter(goal.targetScribbit);
      return;
    }
    if (goal.actionKind === 'back') {
      this.openContenderPicker();
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

  // --- Champion poster (tappable; believe fix) ------------------------------
  private buildChampionPoster(x: number, y: number): number {
    const champ = this.state.champion;
    const width = this.scale.width - EDGE * 2;
    const height = 190;
    const centerY = y + height / 2;
    const card = stickerCard(this, x, centerY, width, height, {
      gold: true,
      tapeColor: UI.tape,
      tapeWidth: 84,
    });
    card.add(
      label(
        this,
        -width / 2 + 28,
        -66,
        'TODAY’S CHAMPION',
        21,
        UI.goldText,
        true
      ).setOrigin(0, 0.5)
    );

    if (!champ) {
      card.add(
        paperIcon(this, 'trophy', -width / 2 + 82, 15, {
          size: 68,
          fill: UI.gold,
        })
      );
      card.add(
        label(
          this,
          -width / 2 + 144,
          14,
          'THRONE EMPTY',
          32,
          UI.ink,
          true
        ).setOrigin(0, 0.5)
      );
      return centerY + height / 2;
    }

    const challengePlan = planChampionChallenge(
      champ,
      this.state.bossChallengedToday
    );
    const artX = -width / 2 + 80;
    const artY = 14;
    const artFrame = 104;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillCircle(artX, artY, artFrame / 2);
    frame.lineStyle(4, UI.inkHex, 1);
    frame.strokeCircle(artX, artY, artFrame / 2);
    card.add(frame);
    const generation = this.buildGeneration;
    void loadDrawing(this, champ).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(
        this.add.image(x + artX, centerY + artY, key),
        88
      ).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => {
        if (!this.didDrag()) this.openDetail(champ);
      });
    });

    const infoX = artX + 72;
    card.add(
      label(this, infoX, artY - 10, champ.name.toUpperCase(), 30, UI.ink, true)
        .setOrigin(0, 0.5)
        .setWordWrapWidth(220)
    );
    const inspect = (): void => this.openDetail(champ);
    card.add(
      paperIcon(this, 'info', infoX + 28, artY + 42, {
        size: 34,
        fill: UI.coral,
      })
    );
    const inspectHit = this.add
      .circle(infoX + 28, artY + 42, 40, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    inspectHit.on('pointerup', () => {
      if (!this.didDrag()) inspect();
    });
    card.add(inspectHit);
    this.rosterActionOverlay?.add({
      label: `View ${champ.name}, today’s champion`,
      rect: { x: x + infoX - 12, y: centerY + artY + 2, width: 80, height: 80 },
      followCamera: true,
      pointerPassthrough: true,
      onActivate: inspect,
    });

    const actionX = width / 2 - 108;
    const actionY = 14;
    if (challengePlan.status === 'open') {
      card.add(
        iconButton(
          this,
          actionX,
          actionY,
          'sword',
          'FIGHT',
          () => this.startBossChallenge(),
          180,
          UI.gold,
          UI.ink,
          100,
          UI.creamHex
        )
      );
      this.rosterActionOverlay?.add({
        label: `Fight today’s champion, ${champ.name}`,
        rect: {
          x: x + actionX - 90,
          y: centerY + actionY - 50,
          width: 180,
          height: 100,
        },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: () => this.startBossChallenge(),
      });
    } else {
      card.add(
        iconButton(
          this,
          actionX,
          actionY,
          'lock',
          'DONE',
          () => undefined,
          180,
          UI.tapeAlt,
          UI.ink,
          100,
          UI.creamHex,
          false
        )
      );
    }

    return centerY + height / 2;
  }

  // Compact roster strip. Care, Spar and Enter remain one tap away in detail.
  private buildRoster(y: number): number {
    const { width } = this.scale;
    const roster = this.state.myScribbits;
    const cardWidth = width - EDGE * 2;
    const height = 190;
    const centerY = y + height / 2;
    const card = stickerCard(this, width / 2, centerY, cardWidth, height, {
      tape: false,
    });
    card.add(
      label(
        this,
        -cardWidth / 2 + 28,
        -66,
        'YOUR SCRIBBITS',
        21,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );
    const generation = this.buildGeneration;
    const count = Math.min(3, roster.length);
    const slotWidth = (cardWidth - 48) / count;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const slotX = -cardWidth / 2 + 24 + slotWidth * (index + 0.5);
      const portraitY = 8;
      const frame = this.add.graphics();
      frame.fillStyle(UI.creamHex, 1);
      frame.fillCircle(slotX, portraitY, 46);
      frame.lineStyle(4, UI.inkHex, 1);
      frame.strokeCircle(slotX, portraitY, 46);
      card.add(frame);
      const open = (): void => this.openDetail(scribbit);
      void loadDrawing(this, scribbit).then((textureKey) => {
        if (!this.isCurrentBuild(generation) || !card.active) return;
        const portrait = fitDrawing(
          this.add.image(slotX, portraitY, textureKey),
          80
        ).setInteractive({ useHandCursor: true });
        portrait.on('pointerup', () => {
          if (!this.didDrag()) open();
        });
        card.add(portrait);
      });
      card.add(
        label(
          this,
          slotX,
          68,
          scribbit.name.toUpperCase(),
          19,
          UI.ink,
          true
        ).setWordWrapWidth(slotWidth - 16)
      );
      this.rosterActionOverlay?.add({
        label: `Open ${scribbit.name}. Care, Spar, or enter the Rumble.`,
        rect: {
          x: width / 2 + slotX - slotWidth / 2,
          y: centerY - 48,
          width: slotWidth,
          height: 142,
        },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: open,
      });
    });
    return centerY + height / 2;
  }

  // The home page only previews the Rumble. The full eight-person choice lives
  // in a focused picker so Arena stays game-like instead of becoming a grid.
  private buildRumbleSummary(x: number, y: number): number {
    const width = this.scale.width - EDGE * 2;
    const height = 190;
    const centerY = y + height / 2;
    const card = stickerCard(this, x, centerY, width, height, {
      tapeColor: UI.tapeAlt,
      tapeWidth: 84,
    });
    card.add(
      label(
        this,
        -width / 2 + 28,
        -66,
        'TONIGHT’S RUMBLE',
        21,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );

    const entrants = selectVisibleArenaEntrants({
      entrantsInSourceOrder: this.state.todayEntrants,
      ownedScribbitIdsInRosterOrder: this.state.myScribbits.map(
        (scribbit) => scribbit.id
      ),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    const generation = this.buildGeneration;
    entrants.slice(0, 3).forEach((entrant, index) => {
      const portraitX = -width / 2 + 74 + index * 96;
      const portraitY = 18;
      const frame = this.add.graphics();
      frame.fillStyle(UI.creamHex, 1);
      frame.fillCircle(portraitX, portraitY, 44);
      frame.lineStyle(4, UI.inkHex, 1);
      frame.strokeCircle(portraitX, portraitY, 44);
      card.add(frame);
      void loadDrawing(this, entrant).then((textureKey) => {
        if (!this.isCurrentBuild(generation) || !card.active) return;
        card.add(
          fitDrawing(this.add.image(portraitX, portraitY, textureKey), 76)
        );
      });
    });

    if (entrants.length === 0) {
      card.add(
        paperIcon(this, 'clock', -width / 2 + 84, 18, {
          size: 64,
          fill: UI.tapeAlt,
        })
      );
      card.add(
        label(
          this,
          -width / 2 + 138,
          18,
          'WAITING',
          30,
          UI.ink,
          true
        ).setOrigin(0, 0.5)
      );
      return centerY + height / 2;
    }

    const backed = entrants.find(
      (entrant) => entrant.id === this.state.myBackedScribbitId
    );
    const actionLabel = backed ? 'PICKED' : 'PICK';
    const activate = (): void => this.openContenderPicker();
    const actionX = width / 2 - 108;
    card.add(
      iconButton(
        this,
        actionX,
        18,
        'heart',
        actionLabel,
        activate,
        180,
        backed ? UI.gold : UI.coral,
        UI.ink,
        100,
        backed ? UI.coralDeep : UI.gold
      )
    );
    this.rosterActionOverlay?.add({
      label: backed
        ? `Your Rumble pick is ${backed.name}. View contenders.`
        : 'Pick a contender for tonight’s Rumble',
      rect: { x: x + actionX - 90, y: centerY - 32, width: 180, height: 100 },
      followCamera: true,
      pointerPassthrough: true,
      onActivate: activate,
    });
    return centerY + height / 2;
  }

  private openContenderPicker(): void {
    if (this.contenderPicker || this.busy) return;
    const entrants = selectVisibleArenaEntrants({
      entrantsInSourceOrder: this.state.todayEntrants,
      ownedScribbitIdsInRosterOrder: this.state.myScribbits.map(
        (scribbit) => scribbit.id
      ),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    this.rosterActionOverlay?.setVisible(false);
    this.homeInteractionSuspended = true;
    const restoreHomeActions = (): void => {
      this.contenderPicker = null;
      this.homeInteractionSuspended = false;
      this.rosterActionOverlay?.setVisible(true);
    };
    this.contenderPicker = openArenaContenderPicker({
      scene: this,
      entrants,
      ownedScribbitIds: this.state.myScribbits.map((scribbit) => scribbit.id),
      backedScribbitId: this.state.myBackedScribbitId,
      onPick: (entrant) => {
        restoreHomeActions();
        this.doBack(entrant);
      },
      onInspect: (entrant) => {
        restoreHomeActions();
        this.openDetail(entrant);
      },
      onClose: restoreHomeActions,
    });
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

  private showRumbleReceiptIfNeeded(afterContinue?: () => void): boolean {
    const receipt = this.state.lastRumbleReceipt;
    if (!receipt) return false;
    if (isRumbleReceiptShown(this, receipt.resolvedDay)) return false;

    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(2200);
    const actionOverlay = new CanvasActionOverlay(this);
    this.events.once('shutdown', () => actionOverlay.destroy());
    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.58)
      .setInteractive();
    layer.add(shade);

    const presentation = planRumbleReturnPresentation(receipt);
    const accessibleSummary = formatRumbleReturnAccessibleSummary(presentation);
    const acknowledgeReceipt = (): void => {
      markRumbleReceiptShown(this, receipt.resolvedDay);
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
        label(this, 0, -100, presentation.detail, 32, UI.inkSoft, true)
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
        this.openContenderPicker();
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
              setGalleryTab(this, 'legacy');
            }
            acknowledgeReceipt();
            actionOverlay.destroy();
            layer.destroy(true);
            setSavedReplay(
              this,
              result.data,
              afterContinue ? 'Gallery' : 'ArenaHome'
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
        ghostButton(this, 0, 265, nextLabel, continueFromReceipt, width - 260)
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
    if (
      !receipt ||
      receipt.cards.length === 0 ||
      isLegacyReturnDismissed(this, receipt.newestArchivedDay)
    ) {
      return false;
    }
    const rumbleReceipt = this.state.lastRumbleReceipt;
    const hasPendingRumbleReceipt =
      rumbleReceipt !== null &&
      !isRumbleReceiptShown(this, rumbleReceipt.resolvedDay);
    const openLegacyBook = (): void => {
      setGalleryTab(this, 'legacy');
      fadeToScene(this, 'Gallery');
    };

    let ceremony: Phaser.GameObjects.Container | null = null;
    ceremony = openLegacyReturnCeremony({
      scene: this,
      receipt,
      continueLabel: hasPendingRumbleReceipt ? 'RUMBLE RESULT' : 'LEGACY BOOK',
      continueIcon: hasPendingRumbleReceipt ? 'sword' : 'book',
      onDismiss: () => {
        ceremony = null;
        markLegacyReturnDismissed(this, receipt.newestArchivedDay);
        if (hasPendingRumbleReceipt) {
          this.showRumbleReceiptIfNeeded(openLegacyBook);
        }
      },
      onContinue: async () => {
        const result = await markLegacyCardsSeen(receipt.newestArchivedDay);
        if (!result.ok) return result.error;
        markLegacyReturnDismissed(this, receipt.newestArchivedDay);

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
    setGalleryTab(this, 'legends');
    fadeToScene(this, 'Gallery');
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
        ? document.activeElement
        : null;
    this.carePicker = openCarePicker(this, {
      scribbit,
      onChoose: (action) => {
        this.carePicker = null;
        this.doCare(scribbit, action, returnFocus !== null);
      },
      onClose: () => {
        this.carePicker = null;
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
      showToast(`${scribbit.name} already had their ${action} today.`);
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
    const action = planArenaBackAction({
      entrantId: scribbit.id,
      ownedScribbitIds: this.state.myScribbits.map((one) => one.id),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    if (action.kind === 'owned') {
      showToast('That is your Scribbit — pick another contender.');
      return;
    }
    if (action.kind !== 'available') {
      this.showBackLockedToast();
      return;
    }
    this.busy = true;
    // Optimistic: mark the pick locally so the compact Rumble tile updates now.
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
      showToast(`${scribbit.name} was pinned in your Scout Notebook.`);
      void this.refresh();
    });
    // Re-render immediately for the optimistic picked state.
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
    this.homeInteractionSuspended = true;
    const closePicker = (): void => {
      if (!overlay.active) return;
      overlay.destroy(true);
    };
    const modalActions = new CanvasModalOverlay(
      this,
      'Choose a Champion challenger',
      closePicker,
      `${champion.name} holds today’s Champion Contract. Choose one of your Scribbits to fight, or close without fighting.`
    );
    overlay.once('destroy', () => {
      this.homeInteractionSuspended = false;
      modalActions.destroy();
    });
    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.creamHex, 0.94)
      .setScrollFactor(0)
      .setInteractive();
    shade.on('pointerup', closePicker);
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
        closePicker();
        void this.resolveBoss(scribbit);
      });
      overlay.add(hitArea);
      modalActions.add({
        label: `Fight ${champion.name} with ${scribbit.name}, level ${levelOf(scribbit)} ${ELEMENT_STYLES[scribbit.element].label}`,
        rect: {
          x: slotX - 92,
          y: slotY - 141,
          width: 184,
          height: 282,
        },
        onActivate: () => {
          closePicker();
          void this.resolveBoss(scribbit);
        },
      });
    });
    const closeButton = ghostButton(
      this,
      width / 2,
      height * 0.76,
      'Not yet',
      closePicker,
      200
    ).setScrollFactor(0);
    overlay.add(closeButton);
    const nativeClose = modalActions.add({
      label: 'Close Champion challenger picker',
      rect: {
        x: width / 2 - 100,
        y: height * 0.76 - 50,
        width: 200,
        height: 100,
      },
      onActivate: closePicker,
    });
    modalActions.focusInitial(nativeClose);
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
