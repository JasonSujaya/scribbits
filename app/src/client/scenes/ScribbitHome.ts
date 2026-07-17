import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt } from '@devvit/web/client';
import { acknowledgeMaturity, claimDailyLogin, fetchArena } from '../lib/api';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import {
  growingRosterFullMessage,
  isGrowingRosterFull,
  navigateToDailyDraw,
} from '../lib/draweligibility';
import {
  collectDiscoveredPowerUpIds,
  openDetailModal,
  type DetailModal,
} from '../lib/detailmodal';
import { LiveSprite } from '../lib/livesprite';
import { translate } from '../lib/localization';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import { paperDockIcon, paperIcon, type PaperIconKey } from '../lib/papericons';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import { trackProgressionEvent } from '../lib/progressionanalytics';
import {
  levelOf,
  loadDrawing,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { generateBlankDrawingTexture } from '../lib/proceduraldoodleart';
import { maturityCountdownHeadline } from '../lib/maturitycountdown';
import {
  button,
  errorPanel,
  ghostButton,
  iconButton,
  label,
  paperArrowButton,
  paperIconButton,
  startScene,
  stickerCard,
  type ErrorPanel,
} from '../lib/ui';
import {
  HOME_PROP_TEXTURES,
  HOME_TITLE_TEXTURE,
  MATURITY_GEAR_TEXTURE,
  homeStage,
  homeVisualAssetsReady,
  preloadHomeVisualAssets,
} from '../lib/visualassets';
import { getArena, setArena, setGalleryTab } from '../lib/registry';
import {
  openDailyLoginModal,
  type DailyLoginModal,
} from '../lib/dailyloginmodal';
import { playGameSoundtrack } from '../lib/soundtrack';
import { markGameBootPhase } from '../lib/gameboot';
import { EDGE, NAV_SAFE, TYPE, UI, prefersReducedMotion } from '../lib/theme';
import { setSfxCue } from '../lib/sfx';
import { openPowerUpDraft, type PowerUpDraftHandle } from '../lib/powerupdraft';
import { openFeedbackPopup, type FeedbackPopup } from '../lib/feedbackpopup';
import {
  drawChargeCountLabel,
  drawChargeRefreshLabel,
} from '../lib/drawcharges';
import {
  createStickerShine,
  type StickerShineHandle,
} from '../lib/stickerfxshader';
import {
  getScribbitLifecycleStage,
  MAX_GROWING_PER_USER,
  type ArenaState,
  type Scribbit,
} from '../../shared/arena';
import {
  FEEDBACK_FIRST_REWARD_INK,
  type SubmitFeedbackResponse,
} from '../../shared/feedback';

const SCRIBBIT_DEPTH = 120;
const HOME_PROP_DEPTH = 10;
const HOME_SCRIBBIT_DISPLAY_SIZE = 380;
const EMPTY_HOME_CARD_MAX_Y = 670;
const MATURITY_CARD_SUMMARY = 'STATS LOCK • GEAR UP FOR MATURE ARENA';
const MATURITY_DESCRIPTION =
  'Right after birth, this Scribbit chooses its first Power-Up. Each new level unlocks one more slot, and an XP-paying win can earn one choice per Arena day. At maturity, its base stats lock forever. Afterward, upgrade Gear to add bonuses and increase its battle stats in the Mature Arena.';

const MATURITY_STEPS: readonly Readonly<{
  icon: PaperIconKey;
  title: string;
  body: string;
}>[] = [
  {
    icon: 'clock',
    title: 'BIRTH: CHOOSE A POWER-UP',
    body: 'Choose the first Power-Up. Each new level unlocks one more slot.',
  },
  {
    icon: 'lock',
    title: 'AT MATURITY: STATS LOCK',
    body: 'After 3 days, its final base stats lock forever.',
  },
  {
    icon: 'spark',
    title: 'MATURE ARENA: UPGRADE GEAR',
    body: 'Base stats stay locked. Upgrade Gear to add bonuses and increase its battle stats.',
  },
];

const MATURITY_GEAR_ICONS: readonly Readonly<{
  frame: number;
  centerOffsetX: number;
}>[] = [
  {
    frame: 0,
    centerOffsetX: -180,
  },
  {
    frame: 1,
    centerOffsetX: -60,
  },
  {
    frame: 2,
    centerOffsetX: 60,
  },
  {
    frame: 3,
    centerOffsetX: 180,
  },
];
const MATURITY_GEAR_ICON_SIZE = 120;

type MaturityModal = Readonly<{
  container: Phaser.GameObjects.Container;
  actions: CanvasModalOverlay;
}>;

type RosterFullModal = Readonly<{
  container: Phaser.GameObjects.Container;
  actions: CanvasModalOverlay;
}>;

type HomePropConfig = Readonly<{
  texture: string;
  label: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  shakeAngle: number;
  idleAngle: number;
  idleDriftY: number;
  idleDurationMs: number;
  idleDelayMs: number;
}>;

type HomePropRest = Readonly<{
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}>;

type DrawFlairTarget = Phaser.GameObjects.Container | Phaser.GameObjects.Arc;

const HOME_PROPS: readonly HomePropConfig[] = [
  {
    texture: HOME_PROP_TEXTURES.window,
    label: 'Window',
    sourceX: 239,
    sourceY: 274,
    sourceWidth: 360,
    sourceHeight: 388,
    shakeAngle: 6,
    idleAngle: 1.5,
    idleDriftY: -4,
    idleDurationMs: 2900,
    idleDelayMs: 0,
  },
  {
    texture: HOME_PROP_TEXTURES.shelf,
    label: 'Shelf',
    sourceX: 746,
    sourceY: 270,
    sourceWidth: 330,
    sourceHeight: 330,
    shakeAngle: 7,
    idleAngle: 1.3,
    idleDriftY: -3.5,
    idleDurationMs: 3300,
    idleDelayMs: 180,
  },
];

export class ScribbitHome extends Scene {
  private state!: ArenaState;
  private selectedIndex = 0;
  private liveSprite: LiveSprite | null = null;
  private scribbitDetailModal: DetailModal | null = null;
  private renderGeneration = 0;
  private menu: AppMenu | null = null;
  private actionOverlay: CanvasActionOverlay | null = null;
  private maturityModal: MaturityModal | null = null;
  private rosterFullModal: RosterFullModal | null = null;
  private dailyLoginModal: DailyLoginModal | null = null;
  private feedbackPopup: FeedbackPopup | null = null;
  private readonly homePropIdleTweens = new Map<
    Phaser.GameObjects.Image,
    Phaser.Tweens.Tween
  >();
  private readonly drawButtonTweens: Phaser.Tweens.Tween[] = [];
  private readonly drawButtonTimers: Phaser.Time.TimerEvent[] = [];
  private maturityCountdownTimer: Phaser.Time.TimerEvent | null = null;
  private drawButtonShine: StickerShineHandle | null = null;
  private powerUpDraft: PowerUpDraftHandle | null = null;
  private assetErrorPanel: ErrorPanel | null = null;

  constructor() {
    super('ScribbitHome');
  }

  preload(): void {
    preloadHomeVisualAssets(this);
  }

  init(): void {
    this.selectedIndex = 0;
    this.liveSprite = null;
    this.scribbitDetailModal = null;
    this.renderGeneration = 0;
    this.menu = null;
    this.actionOverlay = null;
    this.maturityModal = null;
    this.rosterFullModal = null;
    this.dailyLoginModal = null;
    this.feedbackPopup = null;
    this.maturityCountdownTimer = null;
    this.powerUpDraft = null;
    this.assetErrorPanel = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    if (!homeVisualAssetsReady(this)) {
      this.retryHomeVisualAssets();
      return;
    }
    this.createLoadedHome();
  }

  private createLoadedHome(): void {
    const state = getArena(this);
    if (!state) {
      startScene(this, 'Preloader');
      return;
    }
    this.state = state;
    this.build();
    playGameSoundtrack();
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      if (this.scene.isActive()) markGameBootPhase('ready');
    });
    this.events.once('shutdown', () => this.cleanup());
  }

  private retryHomeVisualAssets(): void {
    this.assetErrorPanel?.destroy();
    this.assetErrorPanel = null;
    const { width, height } = this.scale;
    const loadingText = label(
      this,
      width / 2,
      height / 2,
      'OPENING HOME...',
      30,
      UI.cream,
      true
    );
    const onLoadComplete = (): void => {
      loadingText.destroy();
      if (!this.scene.isActive()) return;
      if (homeVisualAssetsReady(this)) {
        this.createLoadedHome();
        return;
      }
      this.assetErrorPanel = errorPanel(
        this,
        width / 2,
        height / 2,
        'The Home artwork did not load.',
        () => this.retryHomeVisualAssets()
      );
    };
    this.load.once('complete', onLoadComplete);
    preloadHomeVisualAssets(this);
    this.load.start();
    this.events.once('shutdown', () => {
      this.load.off('complete', onLoadComplete);
      loadingText.destroy();
      this.assetErrorPanel?.destroy();
      this.assetErrorPanel = null;
    });
  }

  private build(): void {
    this.renderGeneration += 1;
    this.scribbitDetailModal?.destroy();
    this.scribbitDetailModal = null;
    this.dailyLoginModal?.destroy();
    this.dailyLoginModal = null;
    this.closeMaturityInfo();
    this.closeRosterFullModal();
    this.clearMaturityCountdown();
    this.clearHomePropIdleTweens();
    this.clearDrawButtonEffects();
    this.children.removeAll(true);
    this.liveSprite?.destroy();
    this.liveSprite = null;
    this.actionOverlay?.destroy();
    this.actionOverlay = new CanvasActionOverlay(this);

    const stage = homeStage(this);
    this.renderHomeTitle();
    this.renderHomeProps(stage);
    if (this.state.myScribbits.length > 0) this.renderGalleryButton();
    this.renderFeedbackButton();
    this.renderDailyLoginButton();
    if (this.state.myScribbits.length === 0) {
      this.renderEmptyHome();
    } else {
      this.selectedIndex = Phaser.Math.Clamp(
        this.selectedIndex,
        0,
        this.state.myScribbits.length - 1
      );
      const selectedScribbit = this.state.myScribbits[this.selectedIndex];
      if (selectedScribbit) this.renderLivingHome(selectedScribbit);
    }

    appDock(this, 'home', { home: () => undefined });
    this.menu?.destroy();
    this.menu = appMenu(this, {
      onFeedbackSubmitted: (response) => this.handleFeedbackSubmitted(response),
    });
    this.time.delayedCall(0, () => this.openPendingProgressionMoment());
  }

  private openPendingProgressionMoment(): void {
    if ((this.state.pendingPowerUpOffers?.length ?? 0) > 0) {
      this.openPendingPowerUpOffer();
      return;
    }
    const scribbitId = this.state.pendingMaturityScribbitIds?.[0];
    const scribbit = this.state.myScribbits.find(
      (candidate) => candidate.id === scribbitId
    );
    if (!scribbit || this.maturityModal) return;
    this.openMaturityInfo(null, scribbit);
    trackProgressionEvent('maturity_shown', { scribbitId: scribbit.id });
    void acknowledgeMaturity(scribbit.id).then((result) => {
      if (!result.ok || !this.scene.isActive()) return;
      this.state = {
        ...this.state,
        pendingMaturityScribbitIds: (
          this.state.pendingMaturityScribbitIds ?? []
        ).filter((pendingId) => pendingId !== scribbit.id),
      };
      setArena(this, this.state);
      trackProgressionEvent('maturity_acknowledged', {
        scribbitId: scribbit.id,
      });
    });
  }

  private openPendingPowerUpOffer(): void {
    if (this.powerUpDraft || !this.scene.isActive()) return;
    const pendingOffer =
      this.state.pendingPowerUpOffers?.find(
        (offer) => offer.source === 'birth'
      ) ?? this.state.pendingPowerUpOffers?.[0];
    if (!pendingOffer) return;
    const scribbit = this.state.myScribbits.find(
      (candidate) => candidate.id === pendingOffer.scribbitId
    );
    if (!scribbit) return;
    trackProgressionEvent('power_up_offer_shown', {
      scribbitId: scribbit.id,
      source: pendingOffer.source,
    });
    this.powerUpDraft = openPowerUpDraft(
      this,
      pendingOffer,
      scribbit.powerUpIds?.length ?? 0,
      (selectedId) => {
        trackProgressionEvent('power_up_chosen', {
          scribbitId: scribbit.id,
          source: pendingOffer.source,
        });
        const nextPowerUpIds = [...(scribbit.powerUpIds ?? []), selectedId];
        this.state = {
          ...this.state,
          discoveredPowerUpIds: [
            ...new Set([
              ...(this.state.discoveredPowerUpIds ?? []),
              selectedId,
            ]),
          ],
          pendingPowerUpOffers: (this.state.pendingPowerUpOffers ?? []).filter(
            (offer) => offer.id !== pendingOffer.id
          ),
          myScribbits: this.state.myScribbits.map((ownedScribbit) =>
            ownedScribbit.id === scribbit.id
              ? { ...ownedScribbit, powerUpIds: [...nextPowerUpIds] }
              : ownedScribbit
          ),
        };
        setArena(this, this.state);
        this.powerUpDraft = null;
        this.time.delayedCall(0, () => this.openPendingProgressionMoment());
      }
    );
  }

  private renderGalleryButton(): void {
    const openGallery = (): void => {
      setGalleryTab(this, 'growing');
      startScene(this, 'Gallery');
    };
    const galleryButton = paperIconButton(
      this,
      60,
      58,
      'book',
      openGallery,
      92,
      UI.creamHex,
      UI.gold,
      92
    ).setDepth(2200);
    galleryButton.add(
      label(this, 0, 62, translate('home.gallery'), 20, UI.ink, true)
    );
    this.actionOverlay?.add({
      label: translate('home.openGallery'),
      rect: { x: 14, y: 12, width: 92, height: 124 },
      pointerPassthrough: true,
      onActivate: openGallery,
    });
  }

  private renderFeedbackButton(): void {
    const buttonX = this.state.myScribbits.length > 0 ? 150 : 60;
    let trigger: HTMLButtonElement | null = null;
    const openFeedback = (): void => {
      if (!this.state.loggedIn) {
        showLoginPrompt();
        return;
      }
      if (!trigger || this.feedbackPopup) return;
      this.feedbackPopup = openFeedbackPopup(
        this,
        () => {
          this.feedbackPopup = null;
        },
        trigger,
        (response) => this.handleFeedbackSubmitted(response)
      );
    };
    const feedbackButton = paperIconButton(
      this,
      buttonX,
      58,
      'pencil',
      openFeedback,
      80,
      UI.creamHex,
      UI.tapeAlt,
      80
    ).setDepth(2200);
    feedbackButton.add(label(this, 0, 57, 'FEEDBACK', 17, UI.ink, true));
    trigger =
      this.actionOverlay?.add({
        label: this.state.loggedIn
          ? `Send player feedback. Earn ${FEEDBACK_FIRST_REWARD_INK} Mystery Ink for your first note.`
          : 'Sign in to send player feedback',
        rect: { x: buttonX - 40, y: 18, width: 80, height: 116 },
        pointerPassthrough: true,
        onActivate: openFeedback,
      }) ?? null;
  }

  private handleFeedbackSubmitted(response: SubmitFeedbackResponse): void {
    this.state = { ...this.state, myInk: response.ink };
    setArena(this, this.state);
  }

  private renderDailyLoginButton(): void {
    const { width } = this.scale;
    let trigger: HTMLButtonElement | null = null;
    let claimedDuringVisit = false;
    const openRewards = (): void => {
      if (!trigger || this.dailyLoginModal) return;
      this.dailyLoginModal = openDailyLoginModal(
        this,
        trigger,
        this.state.dailyLogin,
        claimDailyLogin,
        (response) => {
          claimedDuringVisit = true;
          this.state = {
            ...this.state,
            dailyLogin: response.dailyLogin,
            myInk: response.ink,
          };
          setArena(this, this.state);
        },
        () => {
          this.dailyLoginModal = null;
          if (claimedDuringVisit && this.scene.isActive()) this.build();
        }
      );
    };
    const buttonX = width - 150;
    const loginButton = paperIconButton(
      this,
      buttonX,
      58,
      'gift',
      openRewards,
      80,
      UI.creamHex,
      this.state.dailyLogin.claimedToday ? UI.gold : UI.coral,
      80
    ).setDepth(2200);
    const nextDay =
      this.state.dailyLogin.nextReward.trackDay ??
      this.state.dailyLogin.nextReward.cycleDay;
    loginButton.add(
      label(
        this,
        0,
        57,
        this.state.dailyLogin.claimedToday ? 'LOGIN ✓' : `DAY ${nextDay ?? 1}`,
        17,
        UI.ink,
        true
      )
    );
    trigger =
      this.actionOverlay?.add({
        label: this.state.dailyLogin.claimedToday
          ? 'Open claimed daily login rewards'
          : 'Claim daily login reward',
        rect: { x: buttonX - 40, y: 18, width: 80, height: 116 },
        pointerPassthrough: true,
        onActivate: openRewards,
      }) ?? null;
  }

  private renderHomeTitle(): void {
    const { width } = this.scale;
    this.add
      .image(width / 2, 120, HOME_TITLE_TEXTURE)
      .setOrigin(0.5, 0)
      .setDisplaySize(320, 107)
      .setDepth(80);
  }

  private cleanup(): void {
    this.clearMaturityCountdown();
    this.clearHomePropIdleTweens();
    this.clearDrawButtonEffects();
    this.liveSprite?.destroy();
    this.liveSprite = null;
    this.scribbitDetailModal?.destroy();
    this.scribbitDetailModal = null;
    this.closeMaturityInfo();
    this.dailyLoginModal?.destroy();
    this.dailyLoginModal = null;
    this.feedbackPopup?.destroy();
    this.feedbackPopup = null;
    this.actionOverlay?.destroy();
    this.actionOverlay = null;
    this.powerUpDraft?.destroy();
    this.powerUpDraft = null;
    this.assetErrorPanel?.destroy();
    this.assetErrorPanel = null;
    this.menu?.destroy();
    this.menu = null;
    releaseRenderedDrawingTextures(this);
  }

  private renderEmptyHome(): void {
    const { width, height } = this.scale;
    const centerY = Math.min(height - NAV_SAFE - 330, EMPTY_HOME_CARD_MAX_Y);
    const card = this.add.container(width / 2, centerY).setDepth(50);
    const paper = this.add
      .rectangle(0, 0, width - EDGE * 2, 290, UI.paper, 0.94)
      .setStrokeStyle(4, UI.inkHex, 0.9)
      .setAngle(-0.35);
    const icon = paperDockIcon(this, 'home', 0, -86, 72, UI.inkHex, true);
    const title = label(
      this,
      0,
      -18,
      'NO SCRIBBIT HOME YET',
      TYPE.title,
      UI.ink,
      true
    );
    const body = label(
      this,
      0,
      40,
      this.state.loggedIn
        ? 'DRAW ONE TO MOVE IN'
        : 'SIGN IN TO BRING YOUR SCRIBBIT HOME',
      TYPE.caption,
      UI.inkSoft,
      true
    );
    card.add([paper, icon, title, body]);

    this.renderDrawButton(width / 2, centerY + 238, 430, 116);
  }

  private renderHomeProps(stage: Phaser.GameObjects.Image): void {
    const stageLeft = stage.x - stage.displayWidth / 2;
    const stageTop = stage.y - stage.displayHeight / 2;
    const stageScale = stage.displayWidth / stage.width;

    HOME_PROPS.forEach((config) => {
      const prop = this.add
        .image(
          stageLeft + config.sourceX * stageScale,
          stageTop + config.sourceY * stageScale,
          config.texture
        )
        .setDisplaySize(
          config.sourceWidth * stageScale,
          config.sourceHeight * stageScale
        )
        .setDepth(HOME_PROP_DEPTH)
        .setInteractive({ useHandCursor: true });
      const rest: HomePropRest = {
        x: prop.x,
        y: prop.y,
        scaleX: prop.scaleX,
        scaleY: prop.scaleY,
      };
      const shake = (): void => this.shakeHomeProp(prop, rest, config);

      bindPressInteractionEvents(
        prop,
        {
          press: () => {
            this.stopHomePropIdle(prop);
            this.resetHomeProp(prop, rest);
            prop.setScale(rest.scaleX * 0.96, rest.scaleY * 0.96);
          },
          release: () => {
            this.resetHomeProp(prop, rest);
            this.startHomePropIdle(prop, rest, config);
          },
          activate: shake,
          pressOnHover: false,
        },
        { gameTarget: this.input, shutdownTarget: this.events }
      );

      this.actionOverlay?.add({
        label: `Shake ${config.label.toLowerCase()}`,
        rect: {
          x: prop.x - prop.displayWidth / 2,
          y: prop.y - prop.displayHeight / 2,
          width: prop.displayWidth,
          height: prop.displayHeight,
        },
        onActivate: shake,
      });

      this.startHomePropIdle(prop, rest, config);
    });
  }

  private startHomePropIdle(
    prop: Phaser.GameObjects.Image,
    rest: HomePropRest,
    config: HomePropConfig
  ): void {
    this.stopHomePropIdle(prop);
    if (prefersReducedMotion() || !this.scene.isActive() || !prop.active)
      return;
    const idleTween = this.tweens.add({
      targets: prop,
      y: rest.y + config.idleDriftY,
      angle: {
        from: -config.idleAngle,
        to: config.idleAngle,
      },
      duration: config.idleDurationMs,
      delay: config.idleDelayMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.homePropIdleTweens.set(prop, idleTween);
  }

  private stopHomePropIdle(prop: Phaser.GameObjects.Image): void {
    this.homePropIdleTweens.get(prop)?.remove();
    this.homePropIdleTweens.delete(prop);
  }

  private clearHomePropIdleTweens(): void {
    this.homePropIdleTweens.forEach((tween) => tween.remove());
    this.homePropIdleTweens.clear();
  }

  private shakeHomeProp(
    prop: Phaser.GameObjects.Image,
    rest: HomePropRest,
    config: HomePropConfig
  ): void {
    this.stopHomePropIdle(prop);
    this.resetHomeProp(prop, rest);
    const reduceMotion = prefersReducedMotion();
    if (!reduceMotion) {
      this.burstPaperSparks(
        prop.x,
        prop.y - prop.displayHeight * 0.22,
        UI.gold,
        4,
        HOME_PROP_DEPTH + 2
      );
    }
    this.tweens.chain({
      targets: prop,
      tweens: [
        {
          x: reduceMotion ? rest.x : rest.x + 6,
          y: reduceMotion ? rest.y : rest.y - 4,
          angle: reduceMotion ? 0 : config.shakeAngle,
          scaleX: rest.scaleX * (reduceMotion ? 1.03 : 1.06),
          scaleY: rest.scaleY * (reduceMotion ? 1.03 : 0.94),
          duration: 90,
          ease: 'Quad.easeOut',
        },
        {
          x: rest.x,
          y: rest.y,
          angle: 0,
          scaleX: rest.scaleX,
          scaleY: rest.scaleY,
          duration: reduceMotion ? 1 : 480,
          ease: 'Back.easeOut',
        },
      ],
      onComplete: () => {
        this.resetHomeProp(prop, rest);
        this.startHomePropIdle(prop, rest, config);
      },
    });
  }

  private resetHomeProp(
    prop: Phaser.GameObjects.Image,
    rest: HomePropRest
  ): void {
    this.tweens.killTweensOf(prop);
    prop
      .setPosition(rest.x, rest.y)
      .setScale(rest.scaleX, rest.scaleY)
      .setAngle(0);
  }

  private renderLivingHome(scribbit: Scribbit): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const creatureY = Math.min(height - NAV_SAFE - 380, 680);
    const buttonY = Math.min(height - NAV_SAFE - 96, creatureY + 360);

    const maturityCard = this.add
      .container(centerX, creatureY - 262)
      .setDepth(82);
    const maturityPaper = this.add
      .rectangle(0, 0, width - 120, 124, UI.paper, 0.9)
      .setStrokeStyle(3, UI.inkHex, 0.35)
      .setAngle(-0.25);
    maturityCard.add(maturityPaper);

    const maturity = label(this, -24, -23, '', TYPE.body, UI.coralText, true);
    const refreshMaturityCountdown = (): void => {
      if (!maturity.active) return;
      maturity
        .setScale(1)
        .setText(
          maturityCountdownHeadline(
            scribbit,
            this.state.dayNumber,
            this.state.rumbleResolvesAt
          )
        );
      if (maturity.width > width - 260)
        maturity.setScale((width - 260) / maturity.width);
    };
    refreshMaturityCountdown();
    if (scribbit.expiresDay > this.state.dayNumber) {
      this.maturityCountdownTimer = this.time.addEvent({
        delay: 1_000,
        loop: true,
        callback: refreshMaturityCountdown,
      });
    }

    const maturityMeaning = label(
      this,
      -24,
      25,
      MATURITY_CARD_SUMMARY,
      TYPE.caption,
      UI.ink,
      true
    );
    if (maturityMeaning.width > width - 260)
      maturityMeaning.setScale((width - 260) / maturityMeaning.width);

    let maturityInfoControl: HTMLButtonElement | null = null;
    const openMaturityInfo = (): void =>
      this.openMaturityInfo(maturityInfoControl);
    const maturityInfoButton = paperIconButton(
      this,
      width / 2 - 116,
      0,
      'info',
      openMaturityInfo,
      72,
      UI.creamHex,
      UI.coral,
      72
    );
    maturityCard.add([maturity, maturityMeaning, maturityInfoButton]);
    maturityInfoControl =
      this.actionOverlay?.add({
        label: 'How Scribbit maturity works',
        rect: {
          x: width - 160,
          y: creatureY - 306,
          width: 88,
          height: 88,
        },
        onActivate: openMaturityInfo,
      }) ?? null;

    const name = label(
      this,
      centerX,
      creatureY + 198,
      scribbit.name.toUpperCase(),
      TYPE.title,
      UI.ink,
      true
    ).setDepth(80);
    if (name.width > width - 100) name.setScale((width - 100) / name.width);

    const summary = label(
      this,
      centerX,
      creatureY + 234,
      `LV ${levelOf(scribbit)}  •  TAP TO MEET`,
      TYPE.caption,
      UI.ink,
      true
    ).setDepth(80);
    if (summary.width > width - 80)
      summary.setScale((width - 80) / summary.width);

    this.renderCreature(scribbit, centerX, creatureY);
    this.renderCreatureInteraction(scribbit, centerX, creatureY);
    this.renderRosterControls(scribbit, creatureY);
    this.renderDrawButton(centerX, buttonY, 520, 124);
  }

  private clearMaturityCountdown(): void {
    this.maturityCountdownTimer?.remove(false);
    this.maturityCountdownTimer = null;
  }

  private openMaturityInfo(
    trigger: HTMLElement | null = null,
    graduatedScribbit: Scribbit | null = null
  ): void {
    this.closeMaturityInfo();
    const { width, height } = this.scale;
    const cardWidth = width - 80;
    const cardTop = Math.max(60, height / 2 - 360);
    const cardHeight = Math.min(820, height - cardTop - 80);
    const cardCenterY = cardTop + cardHeight / 2;
    const cardBottom = cardTop + cardHeight;
    const container = this.add
      .container(0, 0)
      .setDepth(2400)
      .setScrollFactor(0);
    const closeMaturityInfo = (): void => this.closeMaturityInfo();
    const enterTour = (): void => {
      this.closeMaturityInfo();
      startScene(this, 'ArenaHome');
    };
    const modalTitle = graduatedScribbit
      ? `${graduatedScribbit.name} matured`
      : 'How Scribbit maturity works';
    const actions = new CanvasModalOverlay(
      this,
      modalTitle,
      closeMaturityInfo,
      graduatedScribbit
        ? 'Base stats are locked, the Scribbit remains usable, Gear remains reusable, and the permanent Arena Tour is now open.'
        : MATURITY_DESCRIPTION,
      trigger
    );
    container.once('destroy', () => actions.destroy());

    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.72)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    setSfxCue(shade, 'ui.close');
    shade.on('pointerup', closeMaturityInfo);
    container.add(shade);

    const card = stickerCard(
      this,
      width / 2,
      cardCenterY,
      cardWidth,
      cardHeight,
      { tapeColor: UI.tapeAlt, tapeWidth: 92 }
    ).setScrollFactor(0);
    const cardInputBlocker = this.add
      .rectangle(width / 2, cardCenterY, cardWidth, cardHeight, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setInteractive();
    cardInputBlocker.on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Phaser.Types.Input.EventData
      ) => event.stopPropagation?.()
    );
    container.add([card, cardInputBlocker]);

    container.add([
      paperIcon(this, 'info', width / 2, cardTop + 82, {
        size: 58,
        fill: UI.coral,
      }).setScrollFactor(0),
      label(
        this,
        width / 2,
        cardTop + 142,
        graduatedScribbit
          ? `${graduatedScribbit.name.toUpperCase()} GRADUATED`
          : 'HOW MATURITY WORKS',
        34,
        UI.ink,
        true
      ).setScrollFactor(0),
      label(
        this,
        width / 2,
        cardTop + 181,
        graduatedScribbit
          ? 'STATS LOCKED • ARENA TOUR UNLOCKED'
          : 'EVERY BATTLE ADDS A RANDOM STAT MODIFIER',
        20,
        UI.coralText,
        true
      ).setScrollFactor(0),
    ]);

    const rowStartY = cardTop + 255;
    const maturitySteps = graduatedScribbit
      ? [
          {
            icon: 'lock' as const,
            title: 'BASE STATS LOCKED',
            body: 'This Scribbit remains usable. Its drawing stats and earned Power-Ups are preserved.',
          },
          {
            icon: 'spark' as const,
            title: 'GEAR STAYS REUSABLE',
            body: 'Equip and Forge reusable Gear to keep building battle strength.',
          },
          {
            icon: 'trophy' as const,
            title: 'ARENA TOUR OPEN',
            body: 'Clear rotating fields to stamp a permanent 10-field journey.',
          },
        ]
      : MATURITY_STEPS;
    maturitySteps.forEach((step, index) => {
      const rowY = rowStartY + index * 125;
      const contentY = rowY - (index === 2 ? 20 : 0);
      const textX = 172;
      container.add(
        paperIcon(this, step.icon, 120, contentY + 8, {
          size: index === 2 ? 70 : 46,
          fill: index >= 1 ? UI.gold : UI.coral,
        }).setScrollFactor(0)
      );
      container.add(
        label(this, textX, contentY - 12, step.title, 23, UI.ink, true)
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
      );
      container.add(
        label(this, textX, contentY + 27, step.body, 19, UI.inkSoft)
          .setOrigin(0, 0.5)
          .setAlign('left')
          .setWordWrapWidth(width - textX - 88)
          .setLineSpacing(3)
          .setScrollFactor(0)
      );

      if (index === 2) {
        this.renderMaturityGearCluster(container, width / 2, rowY + 117);
      }
    });

    const gotItY = cardBottom - 70;
    container.add(
      button(
        this,
        width / 2,
        gotItY,
        graduatedScribbit ? 'ENTER TOUR' : 'GOT IT',
        graduatedScribbit ? enterTour : closeMaturityInfo,
        280,
        UI.coral,
        UI.ink,
        84
      ).setScrollFactor(0)
    );
    container.add(
      ghostButton(
        this,
        width - 94,
        cardTop + 62,
        '×',
        closeMaturityInfo,
        76,
        76
      ).setScrollFactor(0)
    );

    const closeControl = actions.add({
      label: 'Close maturity information',
      rect: { x: width - 132, y: cardTop + 24, width: 76, height: 76 },
      onActivate: closeMaturityInfo,
    });
    actions.add({
      label: graduatedScribbit
        ? 'Enter the Arena Tour'
        : 'Got it, close maturity information',
      rect: { x: width / 2 - 140, y: gotItY - 42, width: 280, height: 84 },
      onActivate: graduatedScribbit ? enterTour : closeMaturityInfo,
    });

    this.maturityModal = { container, actions };
    actions.focusInitial(closeControl);
  }

  private renderMaturityGearCluster(
    parent: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number
  ): void {
    MATURITY_GEAR_ICONS.forEach((gear, index) => {
      const preview = this.add
        .image(
          centerX + gear.centerOffsetX,
          centerY,
          MATURITY_GEAR_TEXTURE,
          gear.frame
        )
        .setDisplaySize(MATURITY_GEAR_ICON_SIZE, MATURITY_GEAR_ICON_SIZE)
        .setScrollFactor(0);
      parent.add(preview);

      if (!prefersReducedMotion()) {
        this.tweens.add({
          targets: preview,
          angle: { from: -5, to: 5 },
          duration: 180,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: -1,
          repeatDelay: 650,
          delay: index * 140,
        });
      }
    });
  }

  private closeMaturityInfo(): void {
    const modal = this.maturityModal;
    if (!modal) return;
    this.maturityModal = null;
    modal.actions.destroy();
    this.tweens.killTweensOf(modal.container.list);
    modal.container.destroy(true);
  }

  private closeRosterFullModal(): void {
    const modal = this.rosterFullModal;
    if (!modal) return;
    this.rosterFullModal = null;
    modal.actions.destroy();
    modal.container.destroy(true);
  }

  private growingScribbits(): Scribbit[] {
    return this.state.myScribbits.filter(
      (scribbit) =>
        getScribbitLifecycleStage(scribbit, this.state.dayNumber) === 'growing'
    );
  }

  private async refreshArenaAfterRosterChange(): Promise<void> {
    const result = await fetchArena();
    if (!result.ok) {
      this.state = {
        ...this.state,
        myScribbits: this.state.myScribbits.filter(
          (scribbit) =>
            getScribbitLifecycleStage(scribbit, this.state.dayNumber) !==
              'archived' && scribbit.status === 'alive'
        ),
      };
      setArena(this, this.state);
      this.build();
      return;
    }
    this.state = result.data;
    setArena(this, result.data);
    this.selectedIndex = Math.min(
      this.selectedIndex,
      Math.max(0, result.data.myScribbits.length - 1)
    );
    this.build();
  }

  private openRosterFullModal(trigger: HTMLElement | null = null): void {
    this.closeRosterFullModal();
    const { width, height } = this.scale;
    const growing = this.growingScribbits().slice(0, MAX_GROWING_PER_USER);
    const cardWidth = width - 72;
    const cardHeight = 480;
    const cardX = width / 2;
    const cardY = Math.min(height - 300, Math.max(310, height / 2));
    const container = this.add
      .container(0, 0)
      .setDepth(2500)
      .setScrollFactor(0);
    const close = (): void => this.closeRosterFullModal();
    const actions = new CanvasModalOverlay(
      this,
      'Growing roster full',
      close,
      growingRosterFullMessage(),
      trigger
    );
    container.once('destroy', () => actions.destroy());
    this.rosterFullModal = { container, actions };

    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.66)
      .setInteractive();
    const card = stickerCard(this, cardX, cardY, cardWidth, cardHeight, {
      tilt: -0.4,
    });
    container.add([shade, card]);

    card.add(
      label(
        this,
        0,
        -cardHeight / 2 + 54,
        'GROWING SLOTS FULL',
        28,
        UI.ink,
        true
      )
    );
    const message = label(
      this,
      0,
      -cardHeight / 2 + 92,
      `You can keep ${MAX_GROWING_PER_USER} growing Scribbits. Retire one to Retired before drawing.`,
      18,
      UI.inkSoft,
      true
    );
    message.setWordWrapWidth(cardWidth - 82);
    card.add(message);

    growing.forEach((scribbit, index) => {
      const rowY = -cardHeight / 2 + 162 + index * 76;
      const row = button(
        this,
        0,
        rowY,
        `${scribbit.name.toUpperCase()}  •  RETIRE`,
        () => {
          this.closeRosterFullModal();
          this.openScribbitDetail(scribbit);
        },
        cardWidth - 96,
        UI.creamHex,
        UI.ink,
        60
      );
      row.setScale(0.96);
      card.add(row);
      actions.add({
        label: `Retire ${scribbit.name} to make room`,
        rect: {
          x: cardX - (cardWidth - 96) / 2,
          y: cardY + rowY - 30,
          width: cardWidth - 96,
          height: 60,
        },
        onActivate: () => {
          this.closeRosterFullModal();
          this.openScribbitDetail(scribbit);
        },
      });
    });

    const closeButton = ghostButton(
      this,
      0,
      cardHeight / 2 - 58,
      'Not now',
      close,
      220
    );
    card.add(closeButton);
    actions.add({
      label: 'Close growing roster full popup',
      rect: {
        x: cardX - 110,
        y: cardY + cardHeight / 2 - 100,
        width: 220,
        height: 84,
      },
      onActivate: close,
    });
    shade.on('pointerup', close);
    actions.focusInitial();
  }

  private openScribbitDetail(scribbit: Scribbit): void {
    this.scribbitDetailModal?.destroy();
    this.scribbitDetailModal = openDetailModal(this, scribbit, {
      currentDay: this.state.dayNumber,
      discoveredPowerUpIds:
        this.state.discoveredPowerUpIds ??
        collectDiscoveredPowerUpIds(this.state.myScribbits),
      ...(this.state.rumbleResolvesAt === undefined
        ? {}
        : { nextArenaDayStartsAt: this.state.rumbleResolvesAt }),
      mine: true,
      actions: { canRetire: scribbit.status === 'alive' },
      onRetired: () => void this.refreshArenaAfterRosterChange(),
      onRemoved: () => void this.refreshArenaAfterRosterChange(),
      onClose: () => {
        this.scribbitDetailModal = null;
      },
    });
  }

  private renderDrawButton(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const drawCharges = this.state.drawCharges;
    const rosterFull = isGrowingRosterFull(this.state);
    const canDraw =
      this.state.loggedIn && drawCharges.available > 0 && !rosterFull;
    const labelText = this.state.loggedIn
      ? rosterFull
        ? 'ROSTER FULL'
        : `DRAW!  ${drawChargeCountLabel(drawCharges)}`
      : 'SIGN IN';
    let drawControl: HTMLButtonElement | null = null;
    const activateDraw = (): void => {
      if (!this.state.loggedIn) showLoginPrompt();
      else if (rosterFull) this.openRosterFullModal(drawControl);
      else navigateToDailyDraw(this);
    };
    const drawButton = iconButton(
      this,
      x,
      y,
      this.state.loggedIn ? 'pencil' : 'lock',
      labelText,
      activateDraw,
      width,
      UI.gold,
      UI.ink,
      height,
      UI.coral,
      canDraw || !this.state.loggedIn || rosterFull
    ).setDepth(90);
    if (rosterFull) drawButton.setAlpha(0.58);
    if (this.state.loggedIn) {
      drawButton.add(
        label(
          this,
          0,
          24,
          drawChargeRefreshLabel(drawCharges),
          17,
          UI.ink,
          true
        )
      );
    }
    if (canDraw) {
      const flairTargets = this.addDrawButtonFlair(x, y, width);
      this.startDrawButtonEffects(
        drawButton,
        flairTargets,
        x,
        y,
        width,
        height
      );
    }

    drawControl =
      this.actionOverlay?.add({
        label: this.state.loggedIn
          ? rosterFull
            ? `${growingRosterFullMessage()} Tap to choose one to retire.`
            : `Draw a Scribbit. ${drawChargeCountLabel(drawCharges)} Draw Charges. ${drawChargeRefreshLabel(drawCharges)}.`
          : 'Sign in',
        rect: { x: x - width / 2, y: y - height / 2, width, height },
        onActivate: activateDraw,
        enabled: canDraw || !this.state.loggedIn || rosterFull,
      }) ?? null;
  }

  private addDrawButtonFlair(
    x: number,
    y: number,
    width: number
  ): readonly DrawFlairTarget[] {
    const burst = this.add.container(x, y).setDepth(92).setAlpha(0.95);
    const half = width / 2;
    const leftSpark = paperIcon(this, 'spark', -half + 32, -44, {
      size: 25,
      fill: UI.coral,
    });
    const rightSpark = paperIcon(this, 'spark', half - 34, -42, {
      size: 22,
      fill: UI.creamHex,
    });
    const leftDot = this.add
      .circle(-half + 45, 43, 6, UI.coral, 0.92)
      .setStrokeStyle(2, UI.inkHex, 0.5);
    const rightDot = this.add
      .circle(half - 48, 40, 5, UI.creamHex, 0.92)
      .setStrokeStyle(2, UI.inkHex, 0.5);
    const flairTargets: DrawFlairTarget[] = [
      leftSpark,
      rightSpark,
      leftDot,
      rightDot,
    ];
    burst.add(flairTargets);
    return flairTargets;
  }

  private startDrawButtonEffects(
    drawButton: Phaser.GameObjects.Container,
    flairTargets: readonly DrawFlairTarget[],
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const reduceMotion = prefersReducedMotion();
    const glow = this.add
      .ellipse(x, y + 2, width + 26, height + 30, UI.gold, 0.12)
      .setDepth(89);

    if (!reduceMotion) {
      drawButton.setY(y + 24).setAlpha(0);
      this.drawButtonTweens.push(
        this.tweens.add({
          targets: drawButton,
          y,
          alpha: 1,
          duration: 340,
          ease: 'Back.easeOut',
        }),
        this.tweens.add({
          targets: glow,
          scaleX: 1.04,
          scaleY: 1.14,
          alpha: 0.25,
          duration: 1200,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        })
      );

      flairTargets.forEach((target, index) => {
        target.setScale(index < 2 ? 0.78 : 0.86).setAlpha(0.62);
        this.drawButtonTweens.push(
          this.tweens.add({
            targets: target,
            scale: index < 2 ? 1.18 : 1.08,
            alpha: 1,
            angle: index % 2 === 0 ? 8 : -8,
            duration: 720 + index * 90,
            delay: index * 170,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          })
        );
      });
    }

    this.drawButtonShine = createStickerShine({
      scene: this,
      x,
      y,
      width: width - 24,
      height: height - 18,
      depth: 91,
      reduceMotion,
      tint: [1, 0.76, 0.24],
      intensity: 0.88,
    });
    if (!this.drawButtonShine) return;

    if (reduceMotion) {
      this.drawButtonShine.hide();
      return;
    }
    this.drawButtonTimers.push(
      this.time.delayedCall(560, () => this.drawButtonShine?.play(820)),
      this.time.addEvent({
        delay: 4800,
        loop: true,
        callback: () => this.drawButtonShine?.play(820),
      })
    );
  }

  private clearDrawButtonEffects(): void {
    this.drawButtonTweens.forEach((tween) => tween.remove());
    this.drawButtonTweens.length = 0;
    this.drawButtonTimers.forEach((timer) => timer.remove(false));
    this.drawButtonTimers.length = 0;
    this.drawButtonShine?.destroy();
    this.drawButtonShine = null;
  }

  private burstPaperSparks(
    x: number,
    y: number,
    color: number,
    count: number,
    depth: number
  ): void {
    if (prefersReducedMotion() || !this.scene.isActive()) return;
    const colors = [color, UI.gold, UI.creamHex] as const;
    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0.5 : index / (count - 1);
      const angle = Phaser.Math.DegToRad(-165 + progress * 150);
      const distance = 42 + (index % 3) * 12;
      const size = 18 + (index % 2) * 8;
      const spark = this.add
        .image(x, y, 'spark')
        .setDisplaySize(size, size)
        .setTint(colors[index % colors.length] ?? color)
        .setDepth(depth)
        .setScale(0.4)
        .setAlpha(0.95);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 1.08,
        alpha: 0,
        angle: index % 2 === 0 ? 55 : -55,
        duration: 420 + index * 30,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private renderCreature(scribbit: Scribbit, x: number, y: number): void {
    const generation = this.renderGeneration;
    const reduceMotion = prefersReducedMotion();
    const fallbackTexture = generateBlankDrawingTexture(this, scribbit.id);
    this.setLiveSprite(scribbit, fallbackTexture, x, y, reduceMotion);
    void loadDrawing(this, scribbit).then((textureKey) => {
      if (!this.scene.isActive() || generation !== this.renderGeneration)
        return;
      if (textureKey !== fallbackTexture) {
        this.setLiveSprite(scribbit, textureKey, x, y, reduceMotion);
      }
    });
  }

  private renderCreatureInteraction(
    scribbit: Scribbit,
    x: number,
    y: number
  ): void {
    const hitTarget = this.add
      .rectangle(
        x,
        y,
        HOME_SCRIBBIT_DISPLAY_SIZE,
        HOME_SCRIBBIT_DISPLAY_SIZE,
        0xffffff,
        0.001
      )
      .setDepth(SCRIBBIT_DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    const openScribbit = (): void => this.openScribbitDetail(scribbit);
    bindPressInteractionEvents(
      hitTarget,
      {
        press: () => this.liveSprite?.jiggle(),
        release: () => undefined,
        activate: openScribbit,
        pressOnHover: false,
      },
      { gameTarget: this.input, shutdownTarget: this.events }
    );
    setSfxCue(hitTarget, 'ui.open');
    this.actionOverlay?.add({
      label: `Meet ${scribbit.name}. Open animated character details.`,
      rect: {
        x: x - HOME_SCRIBBIT_DISPLAY_SIZE / 2,
        y: y - HOME_SCRIBBIT_DISPLAY_SIZE / 2,
        width: HOME_SCRIBBIT_DISPLAY_SIZE,
        height: HOME_SCRIBBIT_DISPLAY_SIZE,
      },
      attributes: { 'data-sfx-cue': 'ui.open' },
      pointerPassthrough: true,
      onActivate: openScribbit,
    });
  }

  private setLiveSprite(
    scribbit: Scribbit,
    textureKey: string,
    x: number,
    y: number,
    reduceMotion: boolean
  ): void {
    this.liveSprite?.destroy();
    this.liveSprite = new LiveSprite(this, x, y, textureKey, {
      displaySize: HOME_SCRIBBIT_DISPLAY_SIZE,
      depth: SCRIBBIT_DEPTH,
      stats: scribbit.stats,
      reduceMotion,
    });
    this.liveSprite.breathe();
  }

  private renderRosterControls(scribbit: Scribbit, creatureY: number): void {
    if (this.state.myScribbits.length <= 1) return;
    const { width } = this.scale;
    paperArrowButton(
      this,
      74,
      creatureY,
      'previous',
      () => this.shiftSelected(-1),
      104
    ).setDepth(120);
    paperArrowButton(
      this,
      width - 74,
      creatureY,
      'next',
      () => this.shiftSelected(1),
      104
    ).setDepth(120);

    const rosterBadge = this.add
      .container(width / 2, creatureY + 274)
      .setDepth(140);
    const rosterBadgePaper = this.add
      .rectangle(0, 0, 154, 42, UI.paper, 0.96)
      .setStrokeStyle(3, UI.inkHex, 0.65)
      .setAngle(-0.5);
    const rosterBadgeText = label(
      this,
      0,
      0,
      `${this.selectedIndex + 1} OF ${this.state.myScribbits.length}`,
      TYPE.caption,
      UI.ink,
      true
    );
    rosterBadge.add([rosterBadgePaper, rosterBadgeText]);

    this.actionOverlay?.add({
      label: `Previous Scribbit from ${scribbit.name}`,
      rect: { x: 22, y: creatureY - 52, width: 104, height: 104 },
      attributes: { 'data-sfx-cue': 'ui.page' },
      pointerPassthrough: true,
      onActivate: () => this.shiftSelected(-1),
    });
    this.actionOverlay?.add({
      label: `Next Scribbit from ${scribbit.name}`,
      rect: { x: width - 126, y: creatureY - 52, width: 104, height: 104 },
      attributes: { 'data-sfx-cue': 'ui.page' },
      pointerPassthrough: true,
      onActivate: () => this.shiftSelected(1),
    });
  }

  private shiftSelected(direction: -1 | 1): void {
    const count = this.state.myScribbits.length;
    if (count <= 1) return;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
    this.build();
  }
}
