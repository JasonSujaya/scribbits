import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt } from '@devvit/web/client';
import { appDock } from '../lib/appdock';
import { appMenu, type AppMenu } from '../lib/appmenu';
import {
  navigateToDailyDraw,
  needsScribbitCreation,
} from '../lib/draweligibility';
import { LiveSprite } from '../lib/livesprite';
import { translate } from '../lib/localization';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import { paperDockIcon, paperIcon, type PaperIconKey } from '../lib/papericons';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import {
  levelOf,
  loadDrawing,
  moodStyleOf,
  releaseRenderedDrawingTextures,
} from '../lib/scribbits';
import { generateDoodleTexture } from '../lib/proceduraldoodleart';
import {
  button,
  daysLeftFor,
  ghostButton,
  iconButton,
  label,
  paperIconButton,
  startScene,
  stickerCard,
} from '../lib/ui';
import { HOME_PROP_TEXTURES, homeStage } from '../lib/visualassets';
import { getArena, setGalleryTab } from '../lib/registry';
import { playHomeSoundtrack, stopSoundtrack } from '../lib/soundtrack';
import { EDGE, NAV_SAFE, TYPE, UI, prefersReducedMotion } from '../lib/theme';
import type { ArenaState, Scribbit } from '../../shared/arena';

const SCRIBBIT_DEPTH = 120;
const HOME_PROP_DEPTH = 10;
const HOME_SCRIBBIT_DISPLAY_SIZE = 380;
const HOME_SCRIBBIT_HIT_SIZE = 400;
const MATURITY_CARD_SUMMARY = 'BATTLE MODIFIERS STOP • MATURE ARENA';
const MATURITY_DESCRIPTION =
  'For its first 3 days, every completed battle gives this Scribbit a random stat modifier, whether it wins or loses. At maturity, battle modifiers stop and its final stats lock forever. Afterward, it competes in the Mature Arena against other fully grown Scribbits.';

const MATURITY_STEPS: readonly Readonly<{
  icon: PaperIconKey;
  title: string;
  body: string;
}>[] = [
  {
    icon: 'clock',
    title: 'DAYS 1–3: BATTLE MODIFIERS',
    body: 'Every completed battle gives it a random stat modifier — win or lose.',
  },
  {
    icon: 'lock',
    title: 'AT MATURITY: STATS LOCK',
    body: 'After 3 days, random stat modifiers stop and its final stats lock forever.',
  },
  {
    icon: 'sword',
    title: 'NEXT: MATURE ARENA',
    body: 'It enters the Mature Arena to compete against other fully grown Scribbits.',
  },
];

type MaturityModal = Readonly<{
  container: Phaser.GameObjects.Container;
  actions: CanvasModalOverlay;
}>;

const maturityHeadlineFor = (
  scribbit: Scribbit,
  currentArenaDay: number
): string => {
  const daysLeft = daysLeftFor(scribbit, currentArenaDay);
  if (daysLeft <= 0) return 'MATURES TODAY';
  if (daysLeft === 1) return 'MATURES IN 1 DAY';
  return `MATURES IN ${daysLeft} DAYS`;
};

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

const HOME_PROPS: readonly HomePropConfig[] = [
  {
    texture: HOME_PROP_TEXTURES.window,
    label: 'Window',
    sourceX: 239,
    sourceY: 274,
    sourceWidth: 360,
    sourceHeight: 388,
    shakeAngle: 4,
    idleAngle: 1,
    idleDriftY: -2.5,
    idleDurationMs: 2400,
    idleDelayMs: 0,
  },
  {
    texture: HOME_PROP_TEXTURES.shelf,
    label: 'Shelf',
    sourceX: 746,
    sourceY: 270,
    sourceWidth: 330,
    sourceHeight: 330,
    shakeAngle: 5,
    idleAngle: 0.8,
    idleDriftY: -1.5,
    idleDurationMs: 2700,
    idleDelayMs: 300,
  },
  {
    texture: HOME_PROP_TEXTURES.bowl,
    label: 'Food bowl',
    sourceX: 145,
    sourceY: 1208,
    sourceWidth: 220,
    sourceHeight: 142,
    shakeAngle: 3,
    idleAngle: 1.2,
    idleDriftY: -2,
    idleDurationMs: 1900,
    idleDelayMs: 600,
  },
  {
    texture: HOME_PROP_TEXTURES.bed,
    label: 'Pet bed',
    sourceX: 732,
    sourceY: 1202,
    sourceWidth: 375,
    sourceHeight: 285,
    shakeAngle: 4,
    idleAngle: 0.7,
    idleDriftY: -2,
    idleDurationMs: 2200,
    idleDelayMs: 450,
  },
];

export class ScribbitHome extends Scene {
  private state!: ArenaState;
  private selectedIndex = 0;
  private liveSprite: LiveSprite | null = null;
  private renderGeneration = 0;
  private menu: AppMenu | null = null;
  private actionOverlay: CanvasActionOverlay | null = null;
  private maturityModal: MaturityModal | null = null;
  private readonly homePropIdleTweens = new Map<
    Phaser.GameObjects.Image,
    Phaser.Tweens.Tween
  >();

  constructor() {
    super('ScribbitHome');
  }

  init(): void {
    this.selectedIndex = 0;
    this.liveSprite = null;
    this.renderGeneration = 0;
    this.menu = null;
    this.actionOverlay = null;
    this.maturityModal = null;
  }

  create(): void {
    const state = getArena(this);
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    if (needsScribbitCreation(state)) {
      this.scene.start('Draw');
      return;
    }
    this.state = state;
    playHomeSoundtrack();
    this.build();
    this.events.once('shutdown', () => this.cleanup());
  }

  private build(): void {
    this.renderGeneration += 1;
    this.closeMaturityInfo();
    this.clearHomePropIdleTweens();
    this.children.removeAll(true);
    this.liveSprite?.destroy();
    this.liveSprite = null;
    this.actionOverlay?.destroy();
    this.actionOverlay = new CanvasActionOverlay(this);

    const stage = homeStage(this);
    this.renderHomeProps(stage);
    this.renderGalleryButton();
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
    this.menu = appMenu(this);
  }

  private renderGalleryButton(): void {
    const openGallery = (): void => {
      setGalleryTab(this, 'legends');
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

  private cleanup(): void {
    stopSoundtrack();
    this.clearHomePropIdleTweens();
    this.liveSprite?.destroy();
    this.liveSprite = null;
    this.closeMaturityInfo();
    this.actionOverlay?.destroy();
    this.actionOverlay = null;
    this.menu?.destroy();
    this.menu = null;
    releaseRenderedDrawingTextures(this);
  }

  private renderEmptyHome(): void {
    const { width, height } = this.scale;
    const centerY = Math.min(height - NAV_SAFE - 330, 720);
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
    this.tweens.add({
      targets: prop,
      x: reduceMotion ? rest.x : rest.x + 4,
      y: reduceMotion ? rest.y : rest.y - 3,
      angle: reduceMotion ? 0 : config.shakeAngle,
      scaleX: rest.scaleX * (reduceMotion ? 1.03 : 1.04),
      scaleY: rest.scaleY * (reduceMotion ? 1.03 : 0.96),
      duration: reduceMotion ? 90 : 60,
      yoyo: true,
      repeat: reduceMotion ? 0 : 2,
      ease: 'Sine.easeInOut',
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
    const mood = moodStyleOf(scribbit);

    const name = label(
      this,
      centerX,
      116,
      scribbit.name.toUpperCase(),
      TYPE.title,
      UI.ink,
      true
    ).setDepth(80);
    if (name.width > width - 90) name.setScale((width - 90) / name.width);
    label(
      this,
      centerX,
      158,
      'YOUR SCRIBBIT',
      TYPE.caption,
      UI.inkSoft,
      true
    ).setDepth(80);

    const maturityCard = this.add
      .container(centerX, creatureY - 262)
      .setDepth(82);
    const maturityPaper = this.add
      .rectangle(0, 0, width - 120, 124, UI.paper, 0.9)
      .setStrokeStyle(3, UI.inkHex, 0.35)
      .setAngle(-0.25);
    maturityCard.add(maturityPaper);

    const maturity = label(
      this,
      -24,
      -23,
      maturityHeadlineFor(scribbit, this.state.dayNumber),
      TYPE.body,
      UI.coralText,
      true
    );
    if (maturity.width > width - 260)
      maturity.setScale((width - 260) / maturity.width);

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

    const summary = label(
      this,
      centerX,
      creatureY + 210,
      `LV ${levelOf(scribbit)}  •  ${mood.label.toUpperCase()}`,
      TYPE.caption,
      UI.ink,
      true
    ).setDepth(80);
    if (summary.width > width - 80)
      summary.setScale((width - 80) / summary.width);

    this.renderCreature(scribbit, centerX, creatureY);
    this.renderRosterControls(scribbit, creatureY);
    this.renderDrawButton(centerX, buttonY, 520, 124);

    this.actionOverlay?.add({
      label: `${scribbit.name}, tap to pet`,
      rect: {
        x: centerX - HOME_SCRIBBIT_HIT_SIZE / 2,
        y: creatureY - HOME_SCRIBBIT_HIT_SIZE / 2,
        width: HOME_SCRIBBIT_HIT_SIZE,
        height: HOME_SCRIBBIT_HIT_SIZE,
      },
      onActivate: () => this.liveSprite?.jiggle(),
    });
  }

  private openMaturityInfo(trigger: HTMLElement | null = null): void {
    this.closeMaturityInfo();
    const { width, height } = this.scale;
    const cardWidth = width - 80;
    const cardHeight = Math.min(720, height - 120);
    const cardCenterY = height / 2;
    const cardTop = cardCenterY - cardHeight / 2;
    const cardBottom = cardCenterY + cardHeight / 2;
    const container = this.add
      .container(0, 0)
      .setDepth(2400)
      .setScrollFactor(0);
    const closeMaturityInfo = (): void => this.closeMaturityInfo();
    const actions = new CanvasModalOverlay(
      this,
      'How Scribbit maturity works',
      closeMaturityInfo,
      MATURITY_DESCRIPTION,
      trigger
    );
    container.once('destroy', () => actions.destroy());

    const shade = this.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.72)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
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
        'HOW MATURITY WORKS',
        34,
        UI.ink,
        true
      ).setScrollFactor(0),
      label(
        this,
        width / 2,
        cardTop + 181,
        'EVERY BATTLE ADDS A RANDOM STAT MODIFIER',
        20,
        UI.coralText,
        true
      ).setScrollFactor(0),
    ]);

    const rowStartY = cardTop + 255;
    MATURITY_STEPS.forEach((step, index) => {
      const rowY = rowStartY + index * 125;
      container.add(
        paperIcon(this, step.icon, 120, rowY + 8, {
          size: 46,
          fill: index === 1 ? UI.gold : UI.coral,
        }).setScrollFactor(0)
      );
      container.add(
        label(this, 172, rowY - 12, step.title, 23, UI.ink, true)
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
      );
      container.add(
        label(this, 172, rowY + 27, step.body, 19, UI.inkSoft)
          .setOrigin(0, 0.5)
          .setAlign('left')
          .setWordWrapWidth(width - 260)
          .setLineSpacing(3)
          .setScrollFactor(0)
      );
    });

    const gotItY = cardBottom - 70;
    container.add(
      button(
        this,
        width / 2,
        gotItY,
        'GOT IT',
        closeMaturityInfo,
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
      label: 'Got it, close maturity information',
      rect: { x: width / 2 - 140, y: gotItY - 42, width: 280, height: 84 },
      onActivate: closeMaturityInfo,
    });

    this.maturityModal = { container, actions };
    actions.focusInitial(closeControl);
  }

  private closeMaturityInfo(): void {
    const modal = this.maturityModal;
    if (!modal) return;
    this.maturityModal = null;
    modal.actions.destroy();
    modal.container.destroy(true);
  }

  private renderDrawButton(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const labelText = this.state.loggedIn ? 'DRAW!' : 'SIGN IN';
    iconButton(
      this,
      x,
      y,
      this.state.loggedIn ? 'pencil' : 'lock',
      labelText,
      () => {
        if (!this.state.loggedIn) showLoginPrompt();
        else navigateToDailyDraw(this);
      },
      width,
      UI.gold,
      UI.ink,
      height,
      UI.coral
    ).setDepth(90);
    this.addDrawButtonFlair(x, y, width);

    this.actionOverlay?.add({
      label: this.state.loggedIn ? 'Draw a Scribbit' : 'Sign in',
      rect: { x: x - width / 2, y: y - height / 2, width, height },
      onActivate: () => {
        if (!this.state.loggedIn) showLoginPrompt();
        else navigateToDailyDraw(this);
      },
    });
  }

  private addDrawButtonFlair(x: number, y: number, width: number): void {
    const burst = this.add.container(x, y).setDepth(92).setAlpha(0.95);
    const half = width / 2;
    burst.add([
      paperIcon(this, 'spark', -half + 32, -44, { size: 25, fill: UI.coral }),
      paperIcon(this, 'spark', half - 34, -42, { size: 22, fill: UI.creamHex }),
      this.add
        .circle(-half + 45, 43, 6, UI.coral, 0.92)
        .setStrokeStyle(2, UI.inkHex, 0.5),
      this.add
        .circle(half - 48, 40, 5, UI.creamHex, 0.92)
        .setStrokeStyle(2, UI.inkHex, 0.5),
    ]);
  }

  private renderCreature(scribbit: Scribbit, x: number, y: number): void {
    const generation = this.renderGeneration;
    const reduceMotion = prefersReducedMotion();
    const fallbackTexture = generateDoodleTexture(
      this,
      scribbit.id,
      scribbit.element,
      scribbit.stats
    );
    this.setLiveSprite(scribbit, fallbackTexture, x, y, reduceMotion);
    void loadDrawing(this, scribbit).then((textureKey) => {
      if (!this.scene.isActive() || generation !== this.renderGeneration)
        return;
      if (textureKey !== fallbackTexture) {
        this.setLiveSprite(scribbit, textureKey, x, y, reduceMotion);
      }
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
    this.liveSprite.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -HOME_SCRIBBIT_HIT_SIZE / 2,
        -HOME_SCRIBBIT_HIT_SIZE / 2,
        HOME_SCRIBBIT_HIT_SIZE,
        HOME_SCRIBBIT_HIT_SIZE
      ),
      Phaser.Geom.Rectangle.Contains
    );
    this.liveSprite.container.on('pointerup', () => {
      this.liveSprite?.jiggle();
    });
    this.liveSprite.breathe();
  }

  private renderRosterControls(scribbit: Scribbit, creatureY: number): void {
    if (this.state.myScribbits.length <= 1) return;
    const { width } = this.scale;
    const previous = this.add
      .container(74, creatureY)
      .setDepth(120)
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, 52),
        Phaser.Geom.Circle.Contains
      );
    const previousPlate = this.add
      .circle(0, 0, 52, UI.creamHex, 0.95)
      .setStrokeStyle(4, UI.inkHex);
    previous.add([
      previousPlate,
      paperIcon(this, 'back', 0, 0, { size: 44, fill: UI.inkHex }),
    ]);
    previous.on('pointerup', () => this.shiftSelected(-1));

    const next = this.add
      .container(width - 74, creatureY)
      .setDepth(120)
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, 52),
        Phaser.Geom.Circle.Contains
      );
    const nextPlate = this.add
      .circle(0, 0, 52, UI.creamHex, 0.95)
      .setStrokeStyle(4, UI.inkHex);
    const nextIcon = paperIcon(this, 'back', 0, 0, {
      size: 44,
      fill: UI.inkHex,
    });
    nextIcon.setScale(-1, 1);
    next.add([nextPlate, nextIcon]);
    next.on('pointerup', () => this.shiftSelected(1));

    const ordinal = label(
      this,
      width / 2,
      creatureY + 250,
      `${this.selectedIndex + 1}/${this.state.myScribbits.length}`,
      20,
      UI.inkSoft,
      true
    ).setDepth(90);
    ordinal.setAlpha(0.82);

    this.actionOverlay?.add({
      label: `Previous Scribbit from ${scribbit.name}`,
      rect: { x: 22, y: creatureY - 52, width: 104, height: 104 },
      onActivate: () => this.shiftSelected(-1),
    });
    this.actionOverlay?.add({
      label: `Next Scribbit from ${scribbit.name}`,
      rect: { x: width - 126, y: creatureY - 52, width: 104, height: 104 },
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
