import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import {
  fetchArena,
  bossChallenge,
  careForScribbit,
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
  takeFirstChestTrail,
  takeSkipArenaReceiptsOnce,
} from '../lib/registry';
import {
  loadDrawing,
  fitDrawing,
  canCare,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { EDGE, NAV_SAFE, TYPE, UI, prefersReducedMotion } from '../lib/theme';
import {
  iconButton,
  label,
  errorPanel,
  stickerCard,
  floatReward,
  startScene,
  spinner,
  paperRoleTag,
  paperCard,
  versusBadge,
} from '../lib/ui';
import type { ErrorPanel, Spinner } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { DetailModalActions } from '../lib/detailmodal';
import { formatCountdown } from '../lib/cloutboard';
import { openSeasonBoard, type SeasonBoardModal } from '../lib/seasonboard';
import type {
  ArenaState,
  CareAction,
  FounderChronicleBeat,
  Scribbit,
} from '../../shared/arena';
import { showVsCeremony } from '../lib/battleceremony';
import { openLegacyReturnCeremony } from '../lib/legacycards';
import {
  planArenaBackAction,
  selectVisibleArenaEntrants,
} from '../lib/arenabracket';
import { planChampionChallenge } from '../lib/championchallenge';
import { planFounderChronicle } from '../lib/founderchronicle';
import { openFounderChronicleMargin } from '../lib/founderchroniclemargin';
import type { FounderChronicleMargin } from '../lib/founderchroniclemargin';
import { planCareMoment } from '../lib/caremoment';
import { openCareMomentOverlay } from '../lib/caremomentoverlay';
import type { CareMomentOverlay } from '../lib/caremomentoverlay';
import { openCarePicker, type CarePicker } from '../lib/carepicker';
import { paperDockIcon, paperIcon } from '../lib/papericons';
import { arenaStage, UI_BUTTON_TEXTURES } from '../lib/visualassets';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import {
  formatRumbleReturnAccessibleSummary,
  planRumbleReturnPresentation,
} from '../lib/rumblereturnpresentation';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import { playSfx } from '../lib/sfx';
import {
  planArenaMutationResponse,
  planArenaRefreshResponse,
} from '../lib/arenaasynclifecycle';
import {
  openArenaContenderPicker,
  type ArenaContenderPicker,
} from '../lib/arenacontenderpicker';
import { getBattleArenaForDay } from '../../shared/battlearena';
import { selectCommunityDoodleDare } from '../../shared/content/communitydrawthemes';
import { navigateToDailyDraw } from '../lib/draweligibility';
import { openRivalRun, type RivalRunFlow } from '../lib/rivalrunflow';
import {
  planFirstChestTrailStep,
  type FirstChestTrailStep,
} from '../lib/firstchesttrail';
import { fitText } from '../lib/fittext';

// One focused battle hub: choose an owned fighter, choose Champion or Spar,
// then fight. The compact Rumble Pick action remains here so removing Scout
// from the primary dock never hides a daily progression choice.
export class ArenaHome extends Scene {
  private static readonly BATTLE_SETUP_HEIGHT = 780;
  private state!: ArenaState;
  private errorPanelRef: ErrorPanel | null = null;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private countdownLabel: Phaser.GameObjects.Text | null = null;
  private busy = false;
  private spinner: Spinner | null = null;
  private founderChronicleMargin: FounderChronicleMargin | null = null;
  private careMomentOverlay: CareMomentOverlay | null = null;
  private carePicker: CarePicker | null = null;
  private contenderPicker: ArenaContenderPicker | null = null;
  private rivalRunFlow: RivalRunFlow | null = null;
  private menu: AppMenu | null = null;
  private rosterActionOverlay: CanvasActionOverlay | null = null;
  private seasonBoardModal: SeasonBoardModal | null = null;
  private homeInteractionSuspended = false;
  private selectedArenaFighterId: string | null = null;
  private selectedBattleMode: 'champion' | 'spar' = 'champion';
  private fighterCarouselSlot: Phaser.GameObjects.Container | null = null;
  private fighterCarouselCurrentView: Phaser.GameObjects.Container | null =
    null;
  private fighterCarouselViews = new Map<
    string,
    Phaser.GameObjects.Container
  >();
  private fighterCarouselRenderGeneration = 0;
  private battleOpponentSlot: Phaser.GameObjects.Container | null = null;
  private battleOpponentRenderGeneration = 0;
  private battleModeSlot: Phaser.GameObjects.Container | null = null;
  private championModeAction: HTMLButtonElement | null = null;
  private sparModeAction: HTMLButtonElement | null = null;
  private fightAction: HTMLButtonElement | null = null;

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
  private sceneEpoch = 0;
  private refreshRequestEpoch = 0;
  private refreshOnNextActivation = false;
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
    this.sceneEpoch += 1;
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
    this.rivalRunFlow = null;
    this.rosterActionOverlay = null;
    this.seasonBoardModal = null;
    this.homeInteractionSuspended = false;
    this.selectedArenaFighterId = null;
    this.selectedBattleMode = 'champion';
    this.fighterCarouselSlot = null;
    this.fighterCarouselCurrentView = null;
    this.fighterCarouselViews.clear();
    this.fighterCarouselRenderGeneration = 0;
    this.battleOpponentSlot = null;
    this.battleOpponentRenderGeneration = 0;
    this.battleModeSlot = null;
    this.championModeAction = null;
    this.sparModeAction = null;
    this.fightAction = null;
  }

  create(): void {
    const shouldRefreshOnCreate = this.refreshOnNextActivation;
    this.refreshOnNextActivation = false;
    const state = getArena(this);
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    this.state = state;
    this.build();
    const firstChestTrail = takeFirstChestTrail(this);
    if (firstChestTrail) {
      this.continueFirstChestTrail(firstChestTrail.scribbitId);
    } else if (!takeSkipArenaReceiptsOnce(this)) {
      this.showReturnReceiptsIfNeeded();
    }
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('wake', this.refreshOnWake);
    if (shouldRefreshOnCreate) void this.refresh();
  }

  private cleanup(): void {
    this.refreshRequestEpoch += 1;
    this.events.off('wake', this.refreshOnWake);
    this.countdownTimer?.remove();
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
    this.rivalRunFlow?.destroy();
    this.rivalRunFlow = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = null;
    this.seasonBoardModal?.destroy();
    this.seasonBoardModal = null;
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
    this.rivalRunFlow?.destroy();
    this.rivalRunFlow = null;
    this.seasonBoardModal?.destroy();
    this.seasonBoardModal = null;
    this.rosterActionOverlay?.destroy();
    this.rosterActionOverlay = new CanvasActionOverlay(this);
    this.children.removeAll(true);
    this.fighterCarouselSlot = null;
    this.fighterCarouselCurrentView = null;
    this.fighterCarouselViews.clear();
    this.battleOpponentSlot = null;
    this.battleModeSlot = null;
    this.championModeAction = null;
    this.sparModeAction = null;
    this.fightAction = null;
    releaseRenderedDrawingTextures(this);
    this.countdownTimer?.remove();
    this.countdownLabel = null;

    arenaStage(this, -1000);

    const { width, height } = this.scale;
    let cursor = 30;
    cursor = this.drawTopBar(cursor);
    const battleSetupTop = Math.max(
      cursor + 18,
      (height - NAV_SAFE - ArenaHome.BATTLE_SETUP_HEIGHT) / 2
    );
    cursor = this.buildBattleSetup(width / 2, battleSetupTop);
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

  private acceptMutationResponse(sceneEpoch: number): boolean {
    const action = planArenaMutationResponse({
      active: this.scene.isActive(),
      requestSceneEpoch: sceneEpoch,
      currentSceneEpoch: this.sceneEpoch,
    });
    if (action === 'accept') return true;
    if (action === 'refresh-current') void this.refresh();
    if (action === 'refresh-next') this.refreshOnNextActivation = true;
    return false;
  }

  // --- Top bar + live countdown ---------------------------------------------
  private drawTopBar(y: number): number {
    const { width } = this.scale;
    const season =
      this.state.season.current ??
      this.state.season.next ??
      this.state.season.latestFinalized;
    if (season) {
      const cardWidth = Math.min(width - 140, 500);
      const cardHeight = 168;
      const cardY = y + 190;
      const cardLeft = width / 2 - cardWidth / 2;
      const cardTop = cardY - cardHeight / 2;
      const seasonCard = this.add.container(width / 2, cardY);
      const cardShadow = this.add.graphics().setPosition(7, 9);
      cardShadow.fillStyle(0x4f321f, 0.28);
      cardShadow.fillRoundedRect(
        -cardWidth / 2,
        -cardHeight / 2,
        cardWidth,
        cardHeight,
        18
      );
      const cardFace = paperCard(this, 0, 0, cardWidth, cardHeight);
      const seasonTape = this.add
        .rectangle(
          -cardWidth / 2 + 92,
          -cardHeight / 2 + 4,
          138,
          31,
          UI.tape,
          0.82
        )
        .setAngle(-3);
      const seasonName = label(
        this,
        -cardWidth / 2 + 34,
        -45,
        season.name.toUpperCase(),
        20,
        UI.coralText,
        true
      ).setOrigin(0, 0.5);
      const campaignName = label(
        this,
        -cardWidth / 2 + 34,
        -8,
        fitText(season.campaignName.toUpperCase(), 18),
        TYPE.title,
        UI.ink,
        true
      ).setOrigin(0, 0.5);
      const divider = this.add.graphics();
      divider.lineStyle(3, UI.inkHex, 0.22);
      divider.lineBetween(-cardWidth / 2 + 30, 24, cardWidth / 2 - 30, 24);
      const standing = label(
        this,
        0,
        55,
        this.seasonStandingText(),
        TYPE.caption,
        UI.inkSoft,
        true
      ).setWordWrapWidth(cardWidth - 86);
      const trophy = paperIcon(this, 'trophy', cardWidth / 2 - 48, -24, {
        size: 42,
        fill: UI.gold,
      });
      seasonCard.add([
        cardShadow,
        cardFace,
        seasonTape,
        seasonName,
        campaignName,
        divider,
        standing,
        trophy,
      ]);
      this.add
        .rectangle(width / 2, cardY, cardWidth, cardHeight, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (!this.didDrag()) this.openSeasonRanking();
        });
      this.rosterActionOverlay?.add({
        label: `Open ${season.name} ranking. ${this.seasonStandingText()}`,
        rect: {
          x: cardLeft,
          y: cardTop,
          width: cardWidth,
          height: cardHeight,
        },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: () => this.openSeasonRanking(),
      });
    }
    const statusY = season ? y + 310 : y + 120;
    this.countdownLabel = label(
      this,
      width / 2 + 20,
      statusY,
      this.countdownText(),
      20,
      '#ffd447',
      true
    )
      .setStroke(UI.ink, 5)
      .setWordWrapWidth(width - 120)
      .setDepth(2);
    paperIcon(this, 'clock', 64, statusY, {
      size: 25,
      fill: UI.tapeAlt,
    });
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(this.countdownText()),
    });

    return statusY + 43;
  }

  private seasonStandingText(): string {
    const season =
      this.state.season.current ??
      this.state.season.next ??
      this.state.season.latestFinalized;
    if (!season) return 'SEASON STARTING SOON';
    if (season.status === 'upcoming') {
      return `${season.daysRemaining}D TO START`;
    }
    if (season.status === 'paused') return 'RANKING PAUSED';
    if (season.status === 'finalized') return 'FINAL STANDINGS';
    const standing = season.me;
    const rank =
      standing && standing.rank > 0 ? `#${standing.rank}` : 'UNRANKED';
    return `${season.daysRemaining} DAYS LEFT  •  ${rank} RANK  •  ${standing?.score ?? 0} PTS`;
  }

  private openSeasonRanking(): void {
    if (this.seasonBoardModal || this.busy) return;
    this.homeInteractionSuspended = true;
    this.rosterActionOverlay?.setVisible(false);
    this.seasonBoardModal = openSeasonBoard(this, {
      onClose: () => {
        this.seasonBoardModal = null;
        this.homeInteractionSuspended = false;
        this.rosterActionOverlay?.setVisible(true);
      },
    });
  }

  // Float a concise Ink reward from a point, and bump the chip. Optimistic; the
  // caller supplies the amount. Pinned so it reads over any scroll.
  private floatInk(amount: number, x: number, y: number): void {
    if (amount <= 0) return;
    const next = (this.state.myInk ?? 0) + amount;
    this.state = { ...this.state, myInk: next };
    setArena(this, this.state);
    floatReward(this, x, y, `+${amount} INK`, UI.goldText, 3000, true);
  }

  private countdownText(): string {
    const remaining = this.state.rumbleResolvesAt - Date.now();
    const rumble = `RUMBLE ${formatCountdown(remaining).toUpperCase()}`;
    const event = this.state.season.current?.activeEvent;
    return event
      ? `${event.name.toUpperCase()} · ${event.scoreMultiplier}× · ${event.daysRemaining}D · ${rumble}`
      : rumble;
  }

  // --- One battle setup: fighter -> mode -> fight ---------------------------
  private buildBattleSetup(x: number, y: number): number {
    const height = ArenaHome.BATTLE_SETUP_HEIGHT;
    const centerY = y + height / 2;
    const hero = this.add.container(x, centerY);
    const battleArena = getBattleArenaForDay(this.state.dayNumber);
    const fighters = this.state.myScribbits;
    if (fighters.length > 0) {
      const venueInfo = `${battleArena.name}. ${battleArena.shortRule}. Arena goal: ${battleArena.challengeLabel}.`;
      hero.add([
        label(
          this,
          0,
          -362,
          battleArena.name.toUpperCase(),
          27,
          UI.ink,
          true
        ).setWordWrapWidth(390),
        paperIcon(this, 'info', 226, -362, {
          size: 38,
          fill: UI.tapeAlt,
        }),
        paperIcon(this, 'target', -132, -322, {
          size: 30,
          fill: UI.gold,
        }),
        label(
          this,
          18,
          -322,
          battleArena.challengeLabel.toUpperCase(),
          22,
          UI.inkSoft,
          true
        ).setWordWrapWidth(300),
      ]);
      this.rosterActionOverlay?.add({
        label: venueInfo,
        rect: { x: x + 180, y: centerY - 407, width: 92, height: 92 },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: () => {
          showToast(
            `${battleArena.name} • ${battleArena.shortRule} • ${battleArena.challengeLabel}`
          );
        },
      });
    }

    this.selectedArenaFighter(fighters);
    this.fighterCarouselSlot = this.add.container(0, 0);
    hero.add(this.fighterCarouselSlot);

    this.battleOpponentSlot = this.add.container(0, 0);
    hero.add(this.battleOpponentSlot);

    if (fighters.length > 1) {
      const previous = this.arenaArrowButton(-208, -260, 'previous', () =>
        this.cycleArenaFighter(-1)
      );
      const next = this.arenaArrowButton(-82, -260, 'next', () =>
        this.cycleArenaFighter(1)
      );
      hero.add([previous, next]);
      this.rosterActionOverlay?.add({
        label: 'Previous Arena fighter',
        rect: { x: x - 258, y: centerY - 310, width: 100, height: 100 },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: () => this.cycleArenaFighter(-1),
      });
      this.rosterActionOverlay?.add({
        label: 'Next Arena fighter',
        rect: { x: x - 132, y: centerY - 310, width: 100, height: 100 },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: () => this.cycleArenaFighter(1),
      });
    }

    this.battleModeSlot = this.add.container(0, 0);
    hero.add(this.battleModeSlot);
    if (fighters.length > 0) {
      const championAvailable =
        this.state.champion !== null && !this.state.bossChallengedToday;
      this.championModeAction =
        this.rosterActionOverlay?.add({
          label: 'Choose today’s Champion as rival',
          rect: { x: x - 275, y: centerY - 5, width: 250, height: 110 },
          attributes: {
            'aria-pressed': String(this.selectedBattleMode === 'champion'),
          },
          followCamera: true,
          pointerPassthrough: true,
          enabled: championAvailable,
          onActivate: () => this.selectBattleMode('champion'),
        }) ?? null;
      this.sparModeAction =
        this.rosterActionOverlay?.add({
          label: 'Choose a Spar rival',
          rect: { x: x + 25, y: centerY - 5, width: 250, height: 110 },
          attributes: {
            'aria-pressed': String(this.selectedBattleMode === 'spar'),
          },
          followCamera: true,
          pointerPassthrough: true,
          onActivate: () => this.selectBattleMode('spar'),
        }) ?? null;
      const rumblePickLocked = this.state.myBackedScribbitId !== null;
      const activateRumblePick = (): void => {
        if (rumblePickLocked) {
          this.showPickLockedToast();
          return;
        }
        this.openContenderPicker();
      };
      this.rosterActionOverlay?.add({
        label: rumblePickLocked
          ? "Tonight's Rumble prediction is locked"
          : "Choose tonight's Rumble prediction",
        rect: { x: x - 155, y: centerY + 260, width: 310, height: 100 },
        followCamera: true,
        pointerPassthrough: true,
        onActivate: activateRumblePick,
      });
    }
    this.fightAction =
      this.rosterActionOverlay?.add({
        label: 'Fight with selected Scribbit',
        rect: { x: x - 200, y: centerY + 132, width: 400, height: 116 },
        followCamera: true,
        pointerPassthrough: true,
        enabled: false,
        onActivate: () => this.activatePrimaryArenaAction(),
      }) ?? null;
    this.renderArenaFighter();
    this.renderBattleModeControls();

    return centerY + height / 2;
  }

  private selectedArenaFighter(fighters: Scribbit[]): Scribbit | null {
    if (fighters.length === 0) {
      this.selectedArenaFighterId = null;
      return null;
    }
    const selected = fighters.find(
      (fighter) => fighter.id === this.selectedArenaFighterId
    );
    const fallback = selected ?? fighters[0] ?? null;
    this.selectedArenaFighterId = fallback?.id ?? null;
    return fallback;
  }

  private cycleArenaFighter(direction: -1 | 1): void {
    if (this.busy || this.rivalRunFlow) return;
    const fighters = this.state.myScribbits;
    if (fighters.length < 2) return;
    const current = this.selectedArenaFighter(fighters);
    const currentIndex = Math.max(
      0,
      fighters.findIndex((fighter) => fighter.id === current?.id)
    );
    const nextIndex =
      (currentIndex + direction + fighters.length) % fighters.length;
    this.selectedArenaFighterId = fighters[nextIndex]?.id ?? null;
    this.renderArenaFighter();
    this.renderBattleModeControls();
  }

  private renderArenaFighter(): void {
    const slot = this.fighterCarouselSlot;
    if (!slot?.active) return;
    const fighter = this.selectedArenaFighter(this.state.myScribbits);
    const renderGeneration = ++this.fighterCarouselRenderGeneration;

    if (!fighter) {
      slot.removeAll(true);
      this.fighterCarouselCurrentView = null;
      this.fighterCarouselViews.clear();
      slot.add(
        paperIcon(this, 'pencil', 0, -105, { size: 156, fill: UI.gold })
      );
      return;
    }

    const viewKey = fighter.id;
    const cachedView = this.fighterCarouselViews.get(viewKey);
    if (cachedView?.active) {
      this.showArenaFighterView(cachedView);
      return;
    }
    const nextView = this.add.container(0, 0).setVisible(false);
    nextView.add(
      label(this, -145, -42, fighter.name.toUpperCase(), 25, UI.ink, true)
        .setWordWrapWidth(220)
        .setLineSpacing(-3)
    );
    void loadDrawing(this, fighter).then((key) => {
      if (
        !slot.active ||
        renderGeneration !== this.fighterCarouselRenderGeneration
      ) {
        nextView.destroy(true);
        return;
      }
      const portrait = fitDrawing(this.add.image(-145, -150, key), 178);
      portrait.setInteractive({ useHandCursor: true });
      portrait.on('pointerup', () => {
        if (!this.didDrag()) this.openDetail(fighter);
      });
      nextView.add(portrait);
      this.fighterCarouselViews.set(viewKey, nextView);
      slot.add(nextView);
      this.showArenaFighterView(nextView);
    });
  }

  private renderBattleOpponent(): void {
    const slot = this.battleOpponentSlot;
    if (!slot?.active) return;
    const fighter = this.selectedArenaFighter(this.state.myScribbits);
    const renderGeneration = ++this.battleOpponentRenderGeneration;
    slot.removeAll(true);
    if (!fighter) return;

    slot.add(versusBadge(this, 0, -150, { size: 72 }));
    const rivalX = 145;
    const rivalY = -150;
    if (this.selectedBattleMode === 'champion' && this.state.champion) {
      const champion = this.state.champion;
      slot.add(
        label(this, rivalX, -42, champion.name.toUpperCase(), 25, UI.ink, true)
          .setWordWrapWidth(220)
          .setLineSpacing(-3)
      );
      void loadDrawing(this, champion).then((key) => {
        if (
          !slot.active ||
          renderGeneration !== this.battleOpponentRenderGeneration
        ) {
          return;
        }
        slot.add(fitDrawing(this.add.image(rivalX, rivalY, key), 178));
      });
      return;
    }

    const rivalBadge = this.add
      .circle(rivalX, rivalY, 82, UI.creamHex, 0.96)
      .setStrokeStyle(4, UI.inkHex, 0.9);
    slot.add([
      rivalBadge,
      paperDockIcon(this, 'battles', rivalX, rivalY, 92, UI.inkHex, true),
      label(this, rivalX, -42, 'RIVAL', 25, UI.ink, true),
    ]);
  }

  private showArenaFighterView(nextView: Phaser.GameObjects.Container): void {
    const previousView = this.fighterCarouselCurrentView;
    if (previousView === nextView) {
      nextView.setVisible(true).setAlpha(1);
      return;
    }
    this.fighterCarouselCurrentView = nextView;
    nextView.setVisible(true);
    if (!previousView?.active) {
      nextView.setAlpha(1);
      return;
    }
    nextView.setAlpha(0);
    this.tweens.add({
      targets: nextView,
      alpha: 1,
      duration: 160,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: previousView,
      alpha: 0,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => previousView.setVisible(false).setAlpha(1),
    });
  }

  private renderBattleModeControls(): void {
    const slot = this.battleModeSlot;
    if (!slot?.active) return;
    const fighter = this.selectedArenaFighter(this.state.myScribbits);
    const championAvailable =
      this.state.champion !== null && !this.state.bossChallengedToday;
    if (!championAvailable && this.selectedBattleMode === 'champion') {
      this.selectedBattleMode = 'spar';
    }
    this.championModeAction?.setAttribute(
      'aria-pressed',
      String(this.selectedBattleMode === 'champion')
    );
    this.sparModeAction?.setAttribute(
      'aria-pressed',
      String(this.selectedBattleMode === 'spar')
    );
    slot.removeAll(true);
    this.renderBattleOpponent();
    if (!fighter) {
      slot.add(
        iconButton(
          this,
          0,
          120,
          'pencil',
          'DRAW',
          () => {
            if (!this.didDrag()) navigateToDailyDraw(this);
          },
          350,
          UI.coral,
          UI.ink,
          112,
          UI.gold,
          true
        )
      );
      this.updateFightAction('Draw your first Scribbit', true);
      return;
    }
    const championButton = iconButton(
      this,
      -145,
      50,
      championAvailable ? 'trophy' : 'lock',
      'CHAMPION',
      () => {
        if (!this.didDrag()) this.selectBattleMode('champion');
      },
      250,
      this.selectedBattleMode === 'champion' ? UI.gold : UI.creamHex,
      UI.ink,
      100,
      championAvailable ? UI.gold : UI.inkSoftHex,
      championAvailable
    ).setAlpha(championAvailable ? 1 : 0.48);
    const sparButton = iconButton(
      this,
      145,
      50,
      'sword',
      'SPAR',
      () => {
        if (!this.didDrag()) this.selectBattleMode('spar');
      },
      250,
      this.selectedBattleMode === 'spar' ? UI.tapeAlt : UI.creamHex,
      UI.ink,
      100,
      UI.gold,
      true
    );
    slot.add([championButton, sparButton]);
    const canFight =
      fighter !== null &&
      (this.selectedBattleMode === 'spar' || championAvailable);
    const rivalName =
      this.selectedBattleMode === 'champion'
        ? (this.state.champion?.name ?? 'Champion')
        : 'a rival';
    const fightLabel =
      this.selectedBattleMode === 'spar'
        ? 'CHOOSE A RIVAL'
        : `FIGHT ${rivalName.toUpperCase()}`;
    const fightButton = iconButton(
      this,
      0,
      190,
      canFight ? 'sword' : 'lock',
      fightLabel,
      () => {
        if (!this.didDrag()) this.activatePrimaryArenaAction();
      },
      390,
      canFight ? UI.coral : UI.tapeAlt,
      UI.ink,
      116,
      canFight ? UI.gold : UI.creamHex,
      canFight
    ).setAlpha(canFight ? 1 : 0.55);
    const rumblePickLocked = this.state.myBackedScribbitId !== null;
    const rumbleButton = iconButton(
      this,
      0,
      308,
      rumblePickLocked ? 'lock' : 'target',
      rumblePickLocked ? 'PICKED' : 'RUMBLE PICK',
      () => {
        if (this.didDrag()) return;
        if (rumblePickLocked) {
          this.showPickLockedToast();
          return;
        }
        this.openContenderPicker();
      },
      280,
      UI.creamHex,
      UI.ink,
      100,
      rumblePickLocked ? UI.inkSoftHex : UI.gold,
      true
    ).setAlpha(rumblePickLocked ? 0.65 : 0.9);
    slot.add([fightButton, rumbleButton]);
    const battleArena = getBattleArenaForDay(this.state.dayNumber);
    this.updateFightAction(
      fighter
        ? this.selectedBattleMode === 'spar'
          ? `Choose a Spar rival for ${fighter.name}. Arena goal: ${battleArena.challengeLabel}.`
          : `Fight ${rivalName} with ${fighter.name} in ${battleArena.name}. Arena goal: ${battleArena.challengeLabel}.`
        : 'Draw a fighter first',
      canFight
    );
  }

  private selectBattleMode(mode: 'champion' | 'spar'): void {
    if (this.busy || this.rivalRunFlow) return;
    if (
      mode === 'champion' &&
      (this.state.champion === null || this.state.bossChallengedToday)
    ) {
      showToast("Today's Champion fight is already complete.");
      return;
    }
    this.selectedBattleMode = mode;
    this.renderBattleModeControls();
  }

  private startSelectedBattle(): void {
    const fighter = this.selectedArenaFighter(this.state.myScribbits);
    if (!fighter) {
      showToast('Draw a Scribbit first.');
      return;
    }
    if (this.selectedBattleMode === 'champion') {
      this.startBossChallenge(fighter);
      return;
    }
    this.doSpar(fighter);
  }

  private activatePrimaryArenaAction(): void {
    if (!this.selectedArenaFighter(this.state.myScribbits)) {
      navigateToDailyDraw(this);
      return;
    }
    this.startSelectedBattle();
  }

  private updateFightAction(accessibleLabel: string, enabled: boolean): void {
    const action = this.fightAction;
    if (!action) return;
    action.disabled = !enabled;
    action.textContent = accessibleLabel;
    action.setAttribute('aria-label', accessibleLabel);
    action.style.cursor = enabled ? 'pointer' : 'default';
  }

  private arenaArrowButton(
    x: number,
    y: number,
    direction: 'previous' | 'next',
    onActivate: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const face = this.add
      .image(0, 0, UI_BUTTON_TEXTURES[direction])
      .setDisplaySize(76, 76);
    const hitArea = this.add
      .circle(0, 0, 50, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => {
      if (!this.didDrag()) onActivate();
    });
    button.add([face, hitArea]);
    return button;
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
      themePrompt: selectCommunityDoodleDare(this.state.dayNumber).prompt,
      ownedScribbitIds: this.state.myScribbits.map((scribbit) => scribbit.id),
      backedScribbitId: this.state.myBackedScribbitId,
      onPick: (entrant) => {
        restoreHomeActions();
        this.doPick(entrant);
      },
      onInspect: (entrant) => {
        restoreHomeActions();
        this.openDetail(entrant);
      },
      onClose: restoreHomeActions,
    });
  }

  private pickButtonPresentation(entrant: Scribbit): {
    pickLabel: string;
    pickEnabled: boolean;
  } {
    const action = planArenaBackAction({
      entrantId: entrant.id,
      ownedScribbitIds: this.state.myScribbits.map((scribbit) => scribbit.id),
      backedScribbitId: this.state.myBackedScribbitId,
    });
    return {
      pickLabel: action.label,
      pickEnabled: action.enabled,
    };
  }

  private showPickLockedToast(): void {
    const pick = this.state.todayEntrants.find(
      (one) => one.id === this.state.myBackedScribbitId
    );
    showToast(
      pick
        ? `${pick.name} is already your locked pick tonight.`
        : 'Your pick is already locked tonight.'
    );
  }

  private showRumbleReceiptIfNeeded(afterContinue?: () => void): boolean {
    const receipt = this.state.lastRumbleReceipt;
    if (!receipt) return false;
    if (isRumbleReceiptShown(this, receipt.resolvedDay)) return false;

    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(2200);
    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.58)
      .setInteractive();
    layer.add(shade);

    const presentation = planRumbleReturnPresentation(receipt);
    playSfx(presentation.outcome === 'victory' ? 'battle.win' : 'battle.loss');
    if (receipt.inkAwarded > 0) {
      this.time.delayedCall(220, () => playSfx('reward.ink'));
    }
    const accessibleSummary = formatRumbleReturnAccessibleSummary(presentation);
    let dismissReceipt = (): void => {};
    const modalActions = new CanvasModalOverlay(
      this,
      'Rumble result',
      () => dismissReceipt(),
      accessibleSummary
    );
    layer.once('destroy', () => modalActions.destroy());
    const acknowledgeReceipt = (): void => {
      markRumbleReceiptShown(this, receipt.resolvedDay);
    };
    const hasOwnedPortrait = receipt.kind === 'owned';
    const hasBackedMatchup =
      receipt.kind === 'backed' &&
      receipt.pick !== null &&
      receipt.opponent !== null;
    const cardHeight = hasOwnedPortrait || hasBackedMatchup ? 780 : 700;
    const outcomeLabelY = hasOwnedPortrait || hasBackedMatchup ? -300 : -270;
    const outcomeIconY = hasOwnedPortrait || hasBackedMatchup ? -225 : -185;
    const titleY = hasOwnedPortrait ? -140 : -100;
    const portraitY = -40;
    const detailY = hasOwnedPortrait ? 45 : -40;
    const rewardY = hasOwnedPortrait || hasBackedMatchup ? 105 : 15;
    const replayButtonY = hasBackedMatchup ? 190 : hasOwnedPortrait ? 210 : 135;
    const continueButtonY = hasBackedMatchup
      ? 295
      : hasOwnedPortrait
        ? 315
        : 245;
    const actionWidth = width - 220;
    const cardCenterY =
      height / 2 - (hasOwnedPortrait || hasBackedMatchup ? 20 : 45);
    const card = stickerCard(
      this,
      width / 2,
      cardCenterY,
      width - 100,
      cardHeight,
      {
        gold: presentation.highlight,
        tapeColor: UI.tapeAlt,
      }
    );
    layer.add(card);

    const outcomeFill = presentation.outcome === 'victory' ? UI.gold : UI.coral;
    const outcomeText =
      presentation.outcome === 'victory' ? UI.goldText : UI.coralText;
    card.add([
      label(
        this,
        0,
        outcomeLabelY,
        presentation.outcomeLabel,
        58,
        outcomeText,
        true
      ),
      paperIcon(
        this,
        presentation.outcome === 'victory' ? 'trophy' : 'defeat',
        0,
        outcomeIconY,
        {
          size: 104,
          fill: outcomeFill,
          stroke: UI.inkHex,
        }
      ),
    ]);
    if (!hasBackedMatchup) {
      card.add(
        label(this, 0, titleY, presentation.title, 36, UI.ink, true)
          .setWordWrapWidth(width - 180)
          .setLineSpacing(-3)
      );
    }
    if (
      receipt.kind === 'backed' &&
      receipt.pick !== null &&
      receipt.opponent !== null
    ) {
      const pick = receipt.pick;
      const opponent = receipt.opponent;
      const matchupY = -55;
      const pickX = -145;
      const opponentX = 145;
      const portraitSize = 168;
      const pickWon = presentation.outcome === 'victory';
      card.add([
        paperRoleTag(this, pickX, -145, 'YOUR PICK', {
          width: 170,
          fill: UI.tapeAlt,
        }),
        paperRoleTag(
          this,
          opponentX,
          -145,
          receipt.opponentIsChampion ? 'CHAMPION' : 'FINAL RIVAL',
          { width: 190, fill: UI.tape }
        ),
        versusBadge(this, 0, matchupY, { size: 72 }),
        label(this, pickX, 47, pick.name.toUpperCase(), 25, UI.ink, true)
          .setWordWrapWidth(210)
          .setLineSpacing(-3),
        label(
          this,
          opponentX,
          47,
          opponent.name.toUpperCase(),
          25,
          UI.ink,
          true
        )
          .setWordWrapWidth(210)
          .setLineSpacing(-3),
      ]);
      void Promise.all([
        loadDrawing(this, pick),
        loadDrawing(this, opponent),
      ]).then(([pickTexture, opponentTexture]) => {
        if (!this.scene.isActive() || !layer.active || !card.active) return;
        const pickPortrait = fitDrawing(
          this.add.image(pickX, matchupY, pickTexture, '__BASE'),
          portraitSize
        );
        const opponentPortrait = fitDrawing(
          this.add.image(opponentX, matchupY, opponentTexture, '__BASE'),
          portraitSize
        );
        const losingPortrait = pickWon ? opponentPortrait : pickPortrait;
        const winnerPortrait = pickWon ? pickPortrait : opponentPortrait;
        const winnerX = pickWon ? pickX : opponentX;
        const winnerSparks = [
          [-66, -62],
          [64, -48],
          [-70, 38],
          [68, 46],
        ].map(([offsetX, offsetY], index) => {
          const spark = paperIcon(
            this,
            'spark',
            winnerX + (offsetX ?? 0),
            matchupY + (offsetY ?? 0),
            {
              size: index % 2 === 0 ? 28 : 22,
              fill: UI.gold,
              stroke: UI.inkHex,
            }
          );
          spark.setAngle(index % 2 === 0 ? -12 : 14);
          return spark;
        });
        losingPortrait.setTint(0x403832).setAlpha(0.58);
        card.add([...winnerSparks, pickPortrait, opponentPortrait]);
        if (!prefersReducedMotion()) {
          this.tweens.add({
            targets: winnerPortrait,
            angle: { from: -5, to: 5 },
            duration: 85,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => winnerPortrait.setAngle(0),
          });
          winnerSparks.forEach((spark, index) => {
            spark.setAlpha(0.35).setScale(0.72);
            this.tweens.add({
              targets: spark,
              alpha: 1,
              scaleX: 1.08,
              scaleY: 1.08,
              duration: 210 + index * 30,
              yoyo: true,
              repeat: 1,
              ease: 'Sine.easeInOut',
            });
          });
        }
      });
    }
    if (hasOwnedPortrait) {
      void loadDrawing(this, receipt.entrant).then((textureKey) => {
        if (!this.scene.isActive() || !layer.active || !card.active) return;
        const portrait = fitDrawing(
          this.add.image(0, portraitY, textureKey, '__BASE'),
          126
        );
        card.add(portrait);
      });
    }

    if (presentation.detail && !hasBackedMatchup) {
      card.add(
        label(this, 0, detailY, presentation.detail, 32, UI.inkSoft, true)
          .setWordWrapWidth(width - 190)
          .setLineSpacing(3)
      );
    }
    if (
      receipt.kind === 'owned' ||
      receipt.cloutEarned > 0 ||
      receipt.inkAwarded > 0
    ) {
      card.add(
        label(
          this,
          0,
          rewardY,
          presentation.reward,
          32,
          receipt.inkAwarded > 0 ? UI.goldText : UI.inkSoft,
          true
        ).setWordWrapWidth(width - 190)
      );
    }

    const nextLabel = 'GO BACK';
    const continueIcon = 'back';
    const continueFromReceipt = (): void => {
      acknowledgeReceipt();
      modalActions.destroy();
      layer.destroy(true);
      afterContinue?.();
    };
    dismissReceipt = continueFromReceipt;

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
              setGalleryTab(this, 'archived');
            }
            acknowledgeReceipt();
            modalActions.destroy();
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
        iconButton(
          this,
          0,
          replayButtonY,
          'sword',
          watchLabel,
          watchReplay,
          actionWidth,
          UI.gold,
          UI.ink,
          100,
          UI.creamHex
        )
      );
      const watchControl = modalActions.add({
        label: `${receipt.kind === 'owned' ? 'Watch last bout' : 'Watch bout'}. ${accessibleSummary}`,
        rect: {
          x: 110,
          y: cardCenterY + replayButtonY - 50,
          width: actionWidth,
          height: 100,
        },
        onActivate: watchReplay,
      });
      card.add(
        iconButton(
          this,
          0,
          continueButtonY,
          continueIcon,
          nextLabel,
          continueFromReceipt,
          actionWidth,
          UI.creamHex,
          UI.ink,
          100,
          UI.coral
        )
      );
      modalActions.add({
        label: `${nextLabel}. ${accessibleSummary}`,
        rect: {
          x: 110,
          y: cardCenterY + continueButtonY - 50,
          width: actionWidth,
          height: 100,
        },
        onActivate: continueFromReceipt,
      });
      modalActions.focusInitial(watchControl);
      return true;
    }

    card.add(
      iconButton(
        this,
        0,
        continueButtonY,
        continueIcon,
        nextLabel,
        continueFromReceipt,
        actionWidth,
        UI.coral,
        UI.ink,
        100,
        UI.creamHex
      )
    );
    const continueControl = modalActions.add({
      label: `${nextLabel}. ${accessibleSummary}`,
      rect: {
        x: 110,
        y: cardCenterY + continueButtonY - 50,
        width: actionWidth,
        height: 100,
      },
      onActivate: continueFromReceipt,
    });
    modalActions.focusInitial(continueControl);
    return true;
  }

  private showReturnReceiptsIfNeeded(afterReceipts?: () => void): void {
    const continueAfterFounder = (): void => {
      if (this.showLegacyReturnIfNeeded()) return;
      if (this.showRumbleReceiptIfNeeded(afterReceipts)) return;
      afterReceipts?.();
    };
    if (this.showFounderChronicleBeatIfNeeded(continueAfterFounder)) return;
    if (this.showLegacyReturnIfNeeded()) return;
    if (this.showRumbleReceiptIfNeeded(afterReceipts)) return;
    afterReceipts?.();
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
            onContinue: () => this.doSpar(challenger),
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
      setGalleryTab(this, 'archived');
      startScene(this, 'Gallery');
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
        const sceneEpoch = this.sceneEpoch;
        const result = await markLegacyCardsSeen(receipt.newestArchivedDay);
        if (!this.acceptMutationResponse(sceneEpoch)) return null;
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

  private buildAppTabs(): void {
    this.menu?.destroy();
    appDock(this, 'arena', {
      arena: () => this.scrollTo(0),
    });
    this.menu = appMenu(this);
  }

  // --- Detail modal (the one component, wired for context) ------------------
  private openDetail(scribbit: Scribbit): void {
    const sceneEpoch = this.sceneEpoch;
    const mine = this.state.myScribbits.some((one) => one.id === scribbit.id);
    const isEntrant = this.state.todayEntrants.some(
      (one) => one.id === scribbit.id
    );
    const actions: DetailModalActions = {};
    if (mine) {
      actions.onCare = () => this.openCarePickerFor(scribbit);
    } else {
      if (isEntrant) {
        const { pickLabel, pickEnabled } =
          this.pickButtonPresentation(scribbit);
        actions.onPick = (s) => this.doPick(s);
        actions.pickLabel = pickLabel;
        actions.pickEnabled = pickEnabled;
      }
    }
    openDetailModal(this, scribbit, {
      currentDay: this.state.dayNumber,
      nextArenaDayStartsAt: this.state.rumbleResolvesAt,
      mine,
      onRemoved: () => {
        if (this.acceptMutationResponse(sceneEpoch)) void this.refresh();
      },
      onReported: () => {
        if (this.acceptMutationResponse(sceneEpoch)) void this.refresh();
      },
      actions,
    });
  }

  private openCarePickerFor(
    scribbit: Scribbit,
    firstChestStep: FirstChestTrailStep | null = null
  ): void {
    if (this.busy || this.carePicker) return;
    const returnFocus =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement
        : null;
    this.carePicker = openCarePicker(this, {
      scribbit,
      ...(firstChestStep ? { goalLabel: firstChestStep.statusLabel } : {}),
      onChoose: (action) => {
        this.carePicker = null;
        this.doCare(
          scribbit,
          action,
          returnFocus !== null,
          firstChestStep !== null
        );
      },
      onClose: () => {
        this.carePicker = null;
      },
    });
  }

  // --- Actions ---------------------------------------------------------------
  private doCare(
    scribbit: Scribbit,
    action: CareAction,
    focusReceipt = false,
    continuesFirstChestTrail = false
  ): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (!canCare(scribbit, action)) {
      showToast(`${scribbit.name} already had their ${action} today.`);
      return;
    }
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const sceneEpoch = this.sceneEpoch;
    void careForScribbit(scribbit.id, action).then((result) => {
      if (!this.acceptMutationResponse(sceneEpoch)) return;
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
      const firstChestStep = continuesFirstChestTrail
        ? this.firstChestTrailStep(updatedScribbit)
        : null;
      this.careMomentOverlay = openCareMomentOverlay(
        this,
        updatedScribbit,
        careMoment,
        {
          focusOnOpen: focusReceipt,
          ...(continuesFirstChestTrail
            ? {
                progressLabel:
                  firstChestStep?.statusLabel ?? 'FIRST CHEST • EARN MORE INK',
                onDismiss: () => {
                  this.careMomentOverlay = null;
                  if (firstChestStep) {
                    this.continueFirstChestTrail(updatedScribbit.id);
                  }
                },
              }
            : {}),
        }
      );
    });
  }

  private firstChestTrailStep(scribbit: Scribbit): FirstChestTrailStep | null {
    return planFirstChestTrailStep({
      scribbit,
      ink: this.state.myInk,
      chestCost: this.state.nextCapsuleCost,
      capsulePullCount: this.state.capsuleProgress.pullCount,
    });
  }

  private continueFirstChestTrail(scribbitId: string): void {
    if (this.busy || this.carePicker || this.careMomentOverlay) return;
    const scribbit = this.state.myScribbits.find(
      (candidate) => candidate.id === scribbitId
    );
    if (!scribbit) return;
    const step = this.firstChestTrailStep(scribbit);
    if (!step) {
      showToast('Keep earning Ink — your first chest is waiting in Shop.');
      return;
    }
    if (step.kind === 'shop') {
      startScene(this, 'Shop');
      return;
    }
    this.openCarePickerFor(scribbit, step);
  }

  private doSpar(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy || this.rivalRunFlow) return;
    this.selectedArenaFighterId = scribbit.id;
    this.selectedBattleMode = 'spar';
    this.renderArenaFighter();
    this.renderBattleModeControls();

    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : this.fightAction;
    const restoreArena = (): void => {
      this.rivalRunFlow = null;
      this.homeInteractionSuspended = false;
      this.rosterActionOverlay?.setVisible(true);
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
    this.homeInteractionSuspended = true;
    this.rosterActionOverlay?.setVisible(false);
    this.rivalRunFlow = openRivalRun(this, {
      challenger: scribbit,
      trigger,
      closeLabel: 'Back to Arena',
      returnScene: 'ArenaHome',
      onBusyChange: (busy) => {
        this.busy = busy;
        if (busy) {
          this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
          this.fightAction?.setAttribute('aria-busy', 'true');
        } else {
          this.spinner?.hide();
          this.fightAction?.removeAttribute('aria-busy');
        }
      },
      onDismissed: restoreArena,
      onResolved: () => {
        this.rivalRunFlow = null;
      },
      onCeremonyComplete: () => this.scene.start('Replay'),
    });
  }

  private doPick(scribbit: Scribbit): void {
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
      this.showPickLockedToast();
      return;
    }
    this.busy = true;
    // Optimistic: mark the pick locally so the compact Rumble tile updates now.
    const optimistic = { ...this.state, myBackedScribbitId: scribbit.id };
    this.state = optimistic;
    setArena(this, optimistic);
    const sceneEpoch = this.sceneEpoch;
    void backScribbit(scribbit.id).then((result) => {
      if (!this.acceptMutationResponse(sceneEpoch)) return;
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

  private startBossChallenge(challenger: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.state.bossChallengedToday) {
      showToast("Today's Champion Challenge is already complete.");
      return;
    }
    const ownedChallenger = this.state.myScribbits.find(
      (scribbit) => scribbit.id === challenger.id
    );
    if (!ownedChallenger) {
      showToast('Draw a scribbit first, then challenge the champion!');
      return;
    }
    if (!this.state.champion) {
      showToast('No Champion is holding the contract today.');
      return;
    }
    void this.launchChampionBattle(ownedChallenger);
  }

  private async launchChampionBattle(scribbit: Scribbit): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const champion = this.state.champion;
    showToast(
      champion
        ? `${champion.name}: “${planChampionChallenge(champion, false).challengeLine}”`
        : `${scribbit.name} steps into the arena…`
    );
    const sceneEpoch = this.sceneEpoch;
    try {
      const result = await bossChallenge(scribbit.id);
      if (!this.acceptMutationResponse(sceneEpoch)) return;
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
      if (!stagedBattle) {
        this.showError('The Champion battle returned the wrong Scribbit.');
        return;
      }
      if (stagedBattle.arena) this.state = stagedBattle.arena;
      showVsCeremony(this, {
        fighterA: result.data.report.a,
        fighterB: result.data.report.b,
        battleKind: result.data.report.kind,
        rivalryStakes: stagedBattle.rivalryStakes,
        onComplete: () => this.scene.start('Replay'),
      });
    } catch {
      if (this.acceptMutationResponse(sceneEpoch)) {
        this.showError('The battle could not start. Try again.');
      }
    } finally {
      if (sceneEpoch === this.sceneEpoch) {
        this.busy = false;
        this.spinner?.hide();
      }
    }
  }

  private requireLogin(): boolean {
    if (this.state.loggedIn) return true;
    showToast('Sign in to Reddit to play!');
    showLoginPrompt();
    return false;
  }

  private async refresh(): Promise<void> {
    const sceneEpoch = this.sceneEpoch;
    const requestEpoch = ++this.refreshRequestEpoch;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const result = await fetchArena();
    const action = planArenaRefreshResponse({
      active: this.scene.isActive(),
      requestSceneEpoch: sceneEpoch,
      currentSceneEpoch: this.sceneEpoch,
      requestEpoch,
      currentRequestEpoch: this.refreshRequestEpoch,
    });
    if (action === 'refresh-current') void this.refresh();
    if (action === 'refresh-next') this.refreshOnNextActivation = true;
    if (action !== 'accept') return;
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
