// Reusable UI builders. Small, composable factories that return Phaser objects
// or lightweight controllers. Kept framework-thin so scenes stay readable.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  SCRIBBIT_STAT_KEYS,
  type Element,
  type Scribbit,
  type ScribbitStats,
} from '../../shared/arena';
import { CanvasActionOverlay } from './overlay';
import {
  elementPaperIcon,
  paperDockIcon,
  paperIcon,
  paperStatIcon,
  type PaperIconKey,
} from './papericons';
import {
  ELEMENT_STYLES,
  FONT_STACK,
  MIN_TOUCH,
  STAT_STYLES,
  TYPE,
  UI,
} from './theme';
import { UI_BUTTON_TEXTURES } from './visualassets';
import { bindPressInteractionEvents } from './pressinteraction';
import { translate } from './localization';
import { markSfxManaged, playSfx } from './sfx';
import type { SfxCue } from './audiocatalog';
export { startScene } from './scenenavigation';

const TRANSITION_COLOR = { red: 42, green: 33, blue: 24 } as const;
// Some scenes rebuild their entire canvas tree after async data arrives. Keep
// one semantic dock mirror per scene so those rebuilds cannot leave duplicate
// native tab controls above the new canvas dock.
const appDockOverlays = new WeakMap<Scene, CanvasActionOverlay>();

export function fadeSceneOut(scene: Scene, duration: number): void {
  const { red, green, blue } = TRANSITION_COLOR;
  scene.cameras.main.fadeOut(duration, red, green, blue);
}

export type ErrorPanel = {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
};

type StatKey = (typeof SCRIBBIT_STAT_KEYS)[number];

export function label(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string = UI.ink,
  bold = false
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_STACK,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
      align: 'center',
    })
    .setOrigin(0.5);
}

// Display header. The bundled typeface carries the handmade character; keeping
// one stable baseline prevents the per-letter wobble from reading as UI noise.
export function handLettered(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size: number = TYPE.display,
  color: string = UI.cream,
  shadow = true
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const style = {
    fontFamily: FONT_STACK,
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
    align: 'center',
  } as const;
  if (shadow) {
    container.add(
      scene.add
        .text(3, 4, text, { ...style, color: '#0000003d' })
        .setOrigin(0.5)
    );
  }
  container.add(scene.add.text(0, 0, text, style).setOrigin(0.5));
  container.setAngle(-0.6);
  return container;
}

export type PaperWordmarkOptions = Readonly<{
  icon?: PaperIconKey;
  fontSize?: number;
  maxWidth?: number;
  fill?: number;
  accent?: number;
  textColor?: string;
  angle?: number;
}>;

/** A cut-paper display title with live text and an optional semantic icon. */
export function paperWordmark(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  options: PaperWordmarkOptions = {}
): Phaser.GameObjects.Container {
  const fontSize = options.fontSize ?? 46;
  const maxWidth = options.maxWidth ?? 560;
  const fill = options.fill ?? UI.creamHex;
  const accent = options.accent ?? UI.gold;
  const iconSize = options.icon ? Math.min(52, fontSize + 4) : 0;
  const iconGap = options.icon ? 18 : 0;
  const horizontalPadding = 34;
  const verticalPadding = 20;
  const container = scene.add.container(x, y).setAngle(options.angle ?? -0.8);
  const title = scene.add
    .text(0, 0, text, {
      fontFamily: FONT_STACK,
      fontSize: `${fontSize}px`,
      color: options.textColor ?? UI.ink,
      fontStyle: 'bold',
      align: 'center',
    })
    .setOrigin(0.5);
  const availableTextWidth = Math.max(
    80,
    maxWidth - horizontalPadding * 2 - iconSize - iconGap
  );
  if (title.width > availableTextWidth) {
    title.setScale(availableTextWidth / title.width);
  }
  const scaledTitleWidth = title.width * title.scaleX;
  const contentWidth = iconSize + iconGap + scaledTitleWidth;
  const plateWidth = Math.min(
    maxWidth,
    Math.max(220, contentWidth + horizontalPadding * 2)
  );
  const plateHeight = Math.max(82, fontSize + verticalPadding * 2);
  const halfWidth = plateWidth / 2;
  const halfHeight = plateHeight / 2;
  const platePoints = [
    new Phaser.Math.Vector2(-halfWidth + 8, -halfHeight),
    new Phaser.Math.Vector2(halfWidth - 5, -halfHeight + 3),
    new Phaser.Math.Vector2(halfWidth, halfHeight - 8),
    new Phaser.Math.Vector2(halfWidth - 10, halfHeight),
    new Phaser.Math.Vector2(-halfWidth + 4, halfHeight - 2),
    new Phaser.Math.Vector2(-halfWidth, -halfHeight + 9),
  ];
  const shadow = scene.add.graphics().setPosition(7, 8);
  shadow.fillStyle(0x9b754d, 0.92);
  shadow.fillPoints(platePoints, true);
  const face = scene.add.graphics();
  face.fillStyle(fill, 1);
  face.fillPoints(platePoints, true);
  face.lineStyle(5, UI.inkHex, 1);
  face.strokePoints(platePoints, true);
  const contentStartX = -contentWidth / 2;
  title.setX(contentStartX + iconSize + iconGap + scaledTitleWidth / 2);
  container.add([shadow, face]);
  if (options.icon) {
    container.add(
      paperIcon(scene, options.icon, contentStartX + iconSize / 2, 0, {
        size: iconSize,
        fill: accent,
        stroke: UI.inkHex,
      })
    );
  }
  container.add(title);
  return container;
}

export type PaperRoleTagOptions = Readonly<{
  fontSize?: number;
  width?: number;
  fill?: number;
  textColor?: string;
  angle?: number;
}>;

/** A compact live-text label for roles such as Your Pick and Champion. */
export function paperRoleTag(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  options: PaperRoleTagOptions = {}
): Phaser.GameObjects.Container {
  const fontSize = options.fontSize ?? 22;
  const container = scene.add.container(x, y).setAngle(options.angle ?? -0.5);
  const role = label(
    scene,
    0,
    0,
    text,
    fontSize,
    options.textColor ?? UI.ink,
    true
  );
  const width = Math.max(116, options.width ?? role.width + 44);
  const height = Math.max(42, fontSize + 22);
  if (role.width > width - 28) role.setScale((width - 28) / role.width);
  const shadow = scene.add
    .rectangle(5, 6, width, height, 0x9b754d, 0.78)
    .setStrokeStyle(2, UI.inkHex, 0.18);
  const face = scene.add
    .rectangle(0, 0, width, height, options.fill ?? UI.tape, 0.98)
    .setStrokeStyle(3, UI.inkHex, 0.88);
  container.add([shadow, face, role]);
  return container;
}

export type VersusBadgeOptions = Readonly<{
  size?: number;
  fill?: number;
  iconFill?: number;
  textColor?: string;
}>;

/** One shared paper VS mark for matchup cards, intros, and result receipts. */
export function versusBadge(
  scene: Scene,
  x: number,
  y: number,
  options: VersusBadgeOptions = {}
): Phaser.GameObjects.Container {
  const size = Math.max(64, options.size ?? 108);
  const radius = size / 2;
  const container = scene.add.container(x, y);
  const shadow = scene.add
    .circle(5, 7, radius, 0x9b754d, 0.88)
    .setStrokeStyle(3, UI.inkHex, 0.24);
  const face = scene.add
    .circle(0, 0, radius, options.fill ?? UI.coral, 1)
    .setStrokeStyle(Math.max(4, Math.round(size * 0.055)), UI.inkHex, 1);
  const sword = paperIcon(scene, 'sword', 0, -size * 0.1, {
    size: size * 0.4,
    fill: options.iconFill ?? UI.gold,
    stroke: UI.inkHex,
  });
  const versus = label(
    scene,
    0,
    size * 0.27,
    'VS',
    Math.max(16, Math.round(size * 0.2)),
    options.textColor ?? UI.ink,
    true
  );
  container.add([shadow, face, sword, versus]);
  return container;
}

// A translucent washi-tape strip, rotated, for sticking cards to the page.
export function tape(
  scene: Scene,
  x: number,
  y: number,
  angle: number,
  width = 90,
  color: number = UI.tape
): Phaser.GameObjects.Rectangle {
  const strip = scene.add
    .rectangle(x, y, width, 34, color, 0.72)
    .setStrokeStyle(1, 0x000000, 0.08)
    .setAngle(angle)
    .setDepth(4);
  return strip;
}

// A sticker card: cream page with a soft drop-shadow + wobbly ink border and two
// tape corners. The signature container for anything that sits ON the page.
export function stickerCard(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: {
    gold?: boolean;
    tapeColor?: number;
    tapeWidth?: number;
    tape?: boolean;
    tilt?: number;
  } = {}
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const left = -width / 2;
  const top = -height / 2;

  // Soft drop shadow beneath the card.
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.22);
  shadow.fillRoundedRect(left + 6, top + 10, width, height, 20);
  container.add(shadow);

  // The paper + wobbly border via the existing paperCard drawing, drawn locally.
  const graphics = scene.add.graphics();
  const stroke = opts.gold ? UI.gold : UI.panelStroke;
  graphics.fillStyle(UI.paper, 1);
  graphics.fillRoundedRect(left, top, width, height, 18);
  graphics.lineStyle(opts.gold ? 6 : 5, stroke, 1);
  drawWobblyRect(graphics, left + 6, top + 6, width - 12, height - 12);
  container.add(graphics);

  // Two tape corners for the handmade, stuck-to-the-page look.
  const tc = opts.tapeColor ?? UI.tape;
  if (opts.tape !== false) {
    const tapeWidth = opts.tapeWidth ?? 74;
    container.add(tape(scene, left + 26, top + 4, -24, tapeWidth, tc));
    container.add(tape(scene, -left - 26, top + 4, 22, tapeWidth, tc));
  }

  if (opts.tilt) container.setAngle(opts.tilt);
  return container;
}

// A round level badge "Lv3" — gold coin with ink outline. The coin runs a touch
// bigger and the numeral heavier so it stays readable at the small scales the
// roster/champion/modal callers use (~0.55x design → tiny once letterboxed).
export function levelBadge(
  scene: Scene,
  x: number,
  y: number,
  level: number,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const r = 28 * scale;
  const outer = scene.add.circle(0, 0, r, UI.inkHex, 1);
  const inner = scene.add.circle(0, 0, r - 4, UI.goldHex, 1);
  const txt = label(scene, 0, 0, `Lv${level}`, 23 * scale, UI.ink, true);
  container.add([outer, inner, txt]);
  return container;
}

// Lifespan pips: N dots, filled = days left, hollow = spent. 3 total by default.
export function lifespanPips(
  scene: Scene,
  x: number,
  y: number,
  daysLeft: number,
  total = 3,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const gap = 22 * scale;
  const start = -((total - 1) * gap) / 2;
  const urgent = daysLeft <= 1;
  for (let index = 0; index < total; index += 1) {
    const filled = index < daysLeft;
    const dot = scene.add.circle(
      start + index * gap,
      0,
      8 * scale,
      filled ? (urgent ? 0xe8555c : UI.coral) : UI.creamHex,
      1
    );
    dot.setStrokeStyle(3, UI.inkHex, 1);
    container.add(dot);
  }
  return container;
}

// A compact action button using the shared paper icon family.
export function paperActionButton(
  scene: Scene,
  x: number,
  y: number,
  iconKey: PaperIconKey,
  text: string,
  fill: number,
  onClick: () => void,
  width = 130,
  height = MIN_TOUCH,
  layout: 'stacked' | 'inline' = 'stacked'
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = paperButtonPlate(scene, 'secondary', width, height, fill);
  const hit = scene.add
    .rectangle(0, 0, width, Math.max(MIN_TOUCH, height), 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  const inline = layout === 'inline' && Boolean(text);
  const actionIcon = paperIcon(
    scene,
    iconKey,
    inline ? -54 : 0,
    inline ? 0 : text ? -16 : 0,
    {
      size: text ? 30 : 38,
      fill: UI.creamHex,
    }
  );
  const txt = label(
    scene,
    inline ? 18 : 0,
    inline ? 0 : text ? 21 : 0,
    text,
    inline ? TYPE.caption : 20,
    UI.ink,
    true
  );
  txt.setAlign('center');
  txt.setWordWrapWidth(width - 8);
  container.add([bg, actionIcon, txt, hit]);
  wireButtonPress(
    scene,
    hit,
    container,
    onClick,
    {
      scaleX: 0.92,
      scaleY: 0.9,
      duration: 60,
    },
    'ui.tap'
  );
  return container;
}

type PaperButtonPlateKind = 'primary' | 'secondary';

const PAPER_BUTTON_SLICE_CONFIG = {
  primary: {
    texture: UI_BUTTON_TEXTURES.primary,
    sourceWidth: 420,
    sourceHeight: 139,
    left: 40,
    right: 40,
    top: 40,
    bottom: 40,
  },
  secondary: {
    texture: UI_BUTTON_TEXTURES.secondary,
    sourceWidth: 420,
    sourceHeight: 118,
    left: 40,
    right: 40,
    top: 34,
    bottom: 34,
  },
} as const;

/** Canvas-safe nine-piece renderer for the generated paper button plates. */
export function paperButtonPlate(
  scene: Scene,
  kind: PaperButtonPlateKind,
  width: number,
  height: number,
  tint?: number
): Phaser.GameObjects.Container {
  const config = PAPER_BUTTON_SLICE_CONFIG[kind];
  const texture = scene.textures.get(config.texture);
  const sourceXs = [
    0,
    config.left,
    config.sourceWidth - config.right,
    config.sourceWidth,
  ];
  const sourceYs = [
    0,
    config.top,
    config.sourceHeight - config.bottom,
    config.sourceHeight,
  ];
  const horizontalMarginScale = Math.min(
    1,
    width / (config.left + config.right)
  );
  const verticalMarginScale = Math.min(
    1,
    height / (config.top + config.bottom)
  );
  const targetLeft = config.left * horizontalMarginScale;
  const targetRight = config.right * horizontalMarginScale;
  const targetTop = config.top * verticalMarginScale;
  const targetBottom = config.bottom * verticalMarginScale;
  const targetXs = [
    -width / 2,
    -width / 2 + targetLeft,
    width / 2 - targetRight,
    width / 2,
  ];
  const targetYs = [
    -height / 2,
    -height / 2 + targetTop,
    height / 2 - targetBottom,
    height / 2,
  ];
  const plate = scene.add.container(0, 0);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const frameName = `${kind}-button-slice-${row}-${column}`;
      const sourceX = sourceXs[column] ?? 0;
      const sourceY = sourceYs[row] ?? 0;
      const sourceWidth = (sourceXs[column + 1] ?? sourceX) - sourceX;
      const sourceHeight = (sourceYs[row + 1] ?? sourceY) - sourceY;
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, sourceX, sourceY, sourceWidth, sourceHeight);
      }
      const targetLeft = targetXs[column] ?? 0;
      const targetTop = targetYs[row] ?? 0;
      const targetWidth = (targetXs[column + 1] ?? targetLeft) - targetLeft;
      const targetHeight = (targetYs[row + 1] ?? targetTop) - targetTop;
      if (targetWidth <= 0 || targetHeight <= 0) continue;
      const slice = scene.add
        .image(
          targetLeft + targetWidth / 2,
          targetTop + targetHeight / 2,
          config.texture,
          frameName
        )
        .setDisplaySize(targetWidth, targetHeight);
      if (tint !== undefined) slice.setTint(tint);
      plate.add(slice);
    }
  }
  return plate;
}

function wireButtonPress(
  scene: Scene,
  hit: Phaser.GameObjects.GameObject,
  container: Phaser.GameObjects.Container,
  onClick: () => void,
  pressed: Readonly<{
    scaleX: number;
    scaleY: number;
    duration: number;
    ease?: string;
    pressOnHover?: boolean;
  }>,
  cue: SfxCue = 'ui.tap'
): void {
  const press = (): void => {
    scene.tweens.add({
      targets: container,
      scaleX: pressed.scaleX,
      scaleY: pressed.scaleY,
      duration: pressed.duration,
      ease: pressed.ease ?? 'Quad.easeOut',
    });
  };
  const release = (): void => {
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 110,
      ease: 'Back.easeOut',
    });
  };
  markSfxManaged(hit);
  bindPressInteractionEvents(
    hit,
    {
      press,
      release,
      activate: () => {
        playSfx(cue);
        onClick();
      },
      ...(pressed.pressOnHover === undefined
        ? {}
        : { pressOnHover: pressed.pressOnHover }),
    },
    {
      gameTarget: scene.input,
      shutdownTarget: scene.events,
    }
  );
}

type CardPressInteractionOptions = Readonly<{
  scene: Scene;
  card: Phaser.GameObjects.Container;
  width: number;
  height: number;
  onActivate: () => void;
  pressedScaleX?: number;
  pressedScaleY?: number;
}>;

/** Adds the shared, no-hover paper-card press behavior and transparent hit area. */
export function addCardPressInteraction(
  options: CardPressInteractionOptions
): Phaser.GameObjects.Rectangle {
  const hitArea = options.scene.add
    .rectangle(0, 0, options.width, options.height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  options.card.add(hitArea);
  wireButtonPress(
    options.scene,
    hitArea,
    options.card,
    options.onActivate,
    {
      scaleX: options.pressedScaleX ?? 0.97,
      scaleY: options.pressedScaleY ?? 0.97,
      duration: 70,
      ease: 'Linear',
      pressOnHover: false,
    },
    'ui.open'
  );
  return hitArea;
}

// A tappable pill button. onClick fires on pointerup. Includes a press tween.
export function button(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width = 240,
  fill: number = UI.coral,
  textColor = UI.ink,
  requestedHeight = 96
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, requestedHeight);
  const container = scene.add.container(x, y);
  const usesCoralPlate = fill === UI.coral;
  const bg = paperButtonPlate(
    scene,
    usesCoralPlate ? 'primary' : 'secondary',
    width,
    height,
    !usesCoralPlate && fill !== UI.creamHex ? fill : undefined
  );
  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, -3, text, 32, textColor, true);
  txt.setWordWrapWidth(width - 24);
  container.add([bg, txt, hit]);

  wireButtonPress(
    scene,
    hit,
    container,
    onClick,
    {
      scaleX: 0.94,
      scaleY: 0.92,
      duration: 70,
    },
    'ui.primary'
  );

  return container;
}

type IconButtonLayout = Readonly<{
  icon: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  iconSize: number;
  iconGap: number;
  maximumTextWidth: number;
}>;

const iconButtonLayouts = new WeakMap<
  Phaser.GameObjects.Container,
  IconButtonLayout
>();

function layoutIconButtonContent(layout: IconButtonLayout): void {
  const {
    icon,
    label: textLabel,
    iconSize,
    iconGap,
    maximumTextWidth,
  } = layout;
  textLabel.setWordWrapWidth(maximumTextWidth);
  const textWidth = Math.min(maximumTextWidth, textLabel.width);
  const contentWidth = iconSize + iconGap + textWidth;
  const iconX = -contentWidth / 2 + iconSize / 2;
  icon.setX(iconX);
  textLabel.setX(iconX + iconSize / 2 + iconGap + textWidth / 2);
}

/** Change an icon button's label and keep its icon/text row centered. */
export function setIconButtonLabel(
  iconButton: Phaser.GameObjects.Container,
  text: string
): void {
  const layout = iconButtonLayouts.get(iconButton);
  if (!layout) return;
  layout.label.setText(text);
  layoutIconButtonContent(layout);
}

/** A primary paper button with a semantic icon and a short action label. */
export function iconButton(
  scene: Scene,
  x: number,
  y: number,
  iconKey: PaperIconKey,
  text: string,
  onClick: () => void,
  width = 240,
  fill: number = UI.coral,
  textColor = UI.ink,
  requestedHeight = 96,
  iconFill: number = UI.creamHex,
  enabled = true
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, requestedHeight);
  const container = scene.add.container(x, y);
  const usesCoralPlate = fill === UI.coral;
  const background = paperButtonPlate(
    scene,
    usesCoralPlate ? 'primary' : 'secondary',
    width,
    height,
    !usesCoralPlate && fill !== UI.creamHex ? fill : undefined
  );
  const hitTarget = scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001);
  if (enabled) hitTarget.setInteractive({ useHandCursor: true });
  const textLabel = label(scene, 0, -3, text, 30, textColor, true);
  const iconSize = 38;
  const iconGap = 12;
  const horizontalPadding = 18;
  const maximumTextWidth = Math.max(
    1,
    width - iconSize - iconGap - horizontalPadding * 2
  );
  const actionIcon = paperIcon(scene, iconKey, 0, -2, {
    size: iconSize,
    fill: iconFill,
    stroke: UI.inkHex,
  });
  const layout = {
    icon: actionIcon,
    label: textLabel,
    iconSize,
    iconGap,
    maximumTextWidth,
  } satisfies IconButtonLayout;
  // Wrap before measuring. Narrow utility buttons such as SHARE CLIP use two
  // lines; measuring the unwrapped label pushed the icon into the left border.
  layoutIconButtonContent(layout);
  iconButtonLayouts.set(container, layout);
  container.add([background, actionIcon, textLabel, hitTarget]);

  if (enabled) {
    wireButtonPress(
      scene,
      hitTarget,
      container,
      onClick,
      {
        scaleX: 0.94,
        scaleY: 0.92,
        duration: 70,
      },
      'ui.primary'
    );
  }
  return container;
}

/** A compact secondary paper button centered on a semantic icon. */
type PaperIconButtonOptions = Readonly<{
  iconOffsetX?: number;
  iconOffsetY?: number;
}>;

const PAPER_ICON_OPTICAL_OFFSET_X = -4;
const PAPER_ICON_OPTICAL_OFFSET_Y = -5;

export function paperIconButton(
  scene: Scene,
  x: number,
  y: number,
  iconKey: PaperIconKey,
  onClick: () => void,
  width = 100,
  fill: number = UI.coral,
  iconFill: number = UI.gold,
  requestedHeight = 68,
  options: PaperIconButtonOptions = {}
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const background = paperButtonPlate(
    scene,
    'secondary',
    width,
    requestedHeight,
    fill
  );
  const actionIcon = paperIcon(
    scene,
    iconKey,
    options.iconOffsetX ?? PAPER_ICON_OPTICAL_OFFSET_X,
    options.iconOffsetY ?? PAPER_ICON_OPTICAL_OFFSET_Y,
    {
      size: 40,
      fill: iconFill,
      stroke: UI.inkHex,
    }
  );
  const hitTarget = scene.add
    .rectangle(
      0,
      0,
      width,
      Math.max(MIN_TOUCH, requestedHeight),
      0xffffff,
      0.001
    )
    .setInteractive({ useHandCursor: true });
  container.add([background, actionIcon, hitTarget]);

  wireButtonPress(
    scene,
    hitTarget,
    container,
    onClick,
    {
      scaleX: 0.92,
      scaleY: 0.9,
      duration: 60,
    },
    'ui.tap'
  );
  return container;
}

// A smaller secondary button (outline style), for nav rows.
export function ghostButton(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width = 200,
  requestedHeight = MIN_TOUCH
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, requestedHeight);
  const container = scene.add.container(x, y);
  const isBackIcon = text === '‹';
  const isCloseIcon = text === '✕' || text === '×';
  const bg =
    isBackIcon || isCloseIcon
      ? scene.add
          .image(
            0,
            0,
            isBackIcon ? UI_BUTTON_TEXTURES.back : UI_BUTTON_TEXTURES.close
          )
          .setDisplaySize(Math.min(width, height), Math.min(width, height))
      : paperButtonPlate(scene, 'secondary', width, height);
  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  const txt =
    isBackIcon || isCloseIcon
      ? null
      : label(scene, 0, -3, text, 26, UI.ink, true);
  txt?.setWordWrapWidth(width - 20);
  container.add(txt ? [bg, txt, hit] : [bg, hit]);

  wireButtonPress(
    scene,
    hit,
    container,
    onClick,
    {
      scaleX: 0.94,
      scaleY: 0.92,
      duration: 70,
    },
    isBackIcon ? 'ui.back' : isCloseIcon ? 'ui.close' : 'ui.tap'
  );
  return container;
}

/** Shared circular paper arrow for pagination and short directional moves. */
export function paperArrowButton(
  scene: Scene,
  x: number,
  y: number,
  direction: 'previous' | 'next',
  onClick: () => void,
  diameter = MIN_TOUCH
): Phaser.GameObjects.Container {
  const size = Math.max(MIN_TOUCH, diameter);
  const container = scene.add.container(x, y);
  const face = scene.add
    .image(0, 0, UI_BUTTON_TEXTURES[direction])
    .setDisplaySize(size, size);
  const hit = scene.add
    .circle(0, 0, size / 2, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add([face, hit]);

  wireButtonPress(
    scene,
    hit,
    container,
    onClick,
    {
      scaleX: 0.84,
      scaleY: 0.84,
      duration: 80,
      pressOnHover: false,
    },
    'ui.page'
  );
  return container;
}

type PaperPaginationOptions = Readonly<{
  scene: Scene;
  actionOverlay: CanvasActionOverlay | null;
  y: number;
  page: number;
  pageCount: number;
  pageLabel?: string;
  fontSize?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  isNextLoading?: boolean;
  showUnavailable?: boolean;
  previousX?: number;
  nextX?: number;
  backgroundWidth?: number;
  pointerPassthrough?: boolean;
  previousLabel: string;
  nextLabel: string;
  loadingNextLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
}>;

/** One paper/DOM pagination owner for Gallery, Legacy, Collection, and Battles. */
export function paperPagination(options: PaperPaginationOptions): void {
  const {
    scene,
    actionOverlay,
    y,
    page,
    pageCount,
    isNextLoading = false,
    showUnavailable = false,
    pointerPassthrough = true,
  } = options;
  const previousX = options.previousX ?? 104;
  const nextX = options.nextX ?? scene.scale.width - 104;
  const hasPrevious = options.hasPrevious ?? page > 0;
  const hasNext = options.hasNext ?? page < pageCount - 1;

  if (options.backgroundWidth) {
    scene.add
      .rectangle(
        scene.scale.width / 2,
        y,
        options.backgroundWidth,
        100,
        UI.creamHex,
        0.94
      )
      .setStrokeStyle(3, UI.inkHex, 0.32);
  }
  label(
    scene,
    scene.scale.width / 2,
    y,
    options.pageLabel ?? `${page + 1} / ${pageCount}`,
    options.fontSize ?? TYPE.caption,
    UI.inkSoft,
    true
  );

  const addControl = (
    direction: 'previous' | 'next',
    x: number,
    enabled: boolean,
    accessibleLabel: string,
    onActivate: () => void,
    isLoading = false
  ): void => {
    if (!enabled && !showUnavailable && !isLoading) return;
    const arrow = paperArrowButton(
      scene,
      x,
      y,
      direction,
      enabled && !isLoading ? onActivate : () => {}
    );
    if (!enabled || isLoading) {
      arrow.setAlpha(isLoading ? 0.38 : 0.22);
      arrow.list.forEach((child) => child.disableInteractive?.());
    }
    const control = actionOverlay?.add({
      label: accessibleLabel,
      rect: { x: x - 50, y: y - 50, width: 100, height: 100 },
      attributes: { 'data-sfx-cue': 'ui.page' },
      pointerPassthrough: enabled ? pointerPassthrough : false,
      enabled: enabled && !isLoading,
      onActivate: enabled && !isLoading ? onActivate : () => {},
    });
    if (isLoading) control?.setAttribute('aria-busy', 'true');
  };

  addControl(
    'previous',
    previousX,
    hasPrevious,
    hasPrevious
      ? options.previousLabel
      : `${options.previousLabel} unavailable`,
    options.onPrevious
  );
  addControl(
    'next',
    nextX,
    hasNext,
    isNextLoading
      ? (options.loadingNextLabel ?? `Opening ${options.nextLabel}`)
      : hasNext
        ? options.nextLabel
        : `${options.nextLabel} unavailable`,
    options.onNext,
    isNextLoading
  );
}

export type AppTabKey = 'home' | 'arena' | 'bag' | 'battles' | 'shop';

export type AppTabItem = {
  key: AppTabKey;
  /** Visible copy may stay stable while the accessible label reports state. */
  visibleLabel?: string;
  label: string;
  locked?: boolean;
  onClick: () => void;
};

function wireTab(
  hit: Phaser.GameObjects.GameObject,
  target: Phaser.GameObjects.Container,
  onClick: () => void,
  scene: Scene
): void {
  const press = (): void => {
    scene.tweens.add({
      targets: target,
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 60,
      ease: 'Quad.easeOut',
    });
  };
  const release = (): void => {
    scene.tweens.add({
      targets: target,
      scaleX: 1,
      scaleY: 1,
      duration: 90,
      ease: 'Quad.easeOut',
    });
  };
  markSfxManaged(hit);
  bindPressInteractionEvents(
    hit,
    {
      press,
      release,
      activate: () => {
        playSfx('ui.tab');
        onClick();
      },
      pressOnHover: false,
    },
    {
      gameTarget: scene.input,
      shutdownTarget: scene.events,
    }
  );
}

function tornDockPoints(width: number, height: number): Phaser.Math.Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const topOffsets = [2, -2, 1, -3, 2, 0, -2, 3, -1, 1, -3, 2, 0];
  const points: Phaser.Math.Vector2[] = [];
  const segments = topOffsets.length - 1;
  for (let index = 0; index <= segments; index += 1) {
    const topOffset = topOffsets[index] ?? 0;
    points.push(
      new Phaser.Math.Vector2(
        -halfWidth + (width * index) / segments,
        -halfHeight + topOffset
      )
    );
  }
  points.push(
    new Phaser.Math.Vector2(halfWidth - 2, halfHeight - 1),
    new Phaser.Math.Vector2(halfWidth - 48, halfHeight + 2),
    new Phaser.Math.Vector2(0, halfHeight - 1),
    new Phaser.Math.Vector2(-halfWidth + 54, halfHeight + 2),
    new Phaser.Math.Vector2(-halfWidth + 1, halfHeight - 2)
  );
  return points;
}

function activeDockTabChip(
  scene: Scene,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const chip = scene.add.graphics();
  const left = -width / 2;
  const top = -height / 2;
  chip.fillStyle(UI.inkHex, 0.18);
  chip.fillRoundedRect(left + 3, top + 5, width, height, 20);
  chip.fillStyle(UI.coral, 1);
  chip.fillRoundedRect(left, top, width, height, 20);
  chip.lineStyle(3, UI.inkHex, 1);
  chip.strokeRoundedRect(left, top, width, height, 20);
  return chip;
}

export function appTabBar(
  scene: Scene,
  active: AppTabKey | null,
  tabs: AppTabItem[]
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const slotCount = tabs.length;
  const barWidth = width - 28;
  const barHeight = 124;
  const bottomInset = 8;
  const y = height - bottomInset - barHeight / 2;
  const viewportX = width / 2;
  const viewportY = y;
  const container = scene.add.container(viewportX, viewportY).setDepth(1800);
  appDockOverlays.get(scene)?.destroy();
  const actionOverlay = new CanvasActionOverlay(scene);
  appDockOverlays.set(scene, actionOverlay);
  container.once('destroy', () => {
    if (appDockOverlays.get(scene) !== actionOverlay) return;
    appDockOverlays.delete(scene);
    actionOverlay.destroy();
  });
  const followCamera = (): void => {
    if (!container.active) return;
    const camera = scene.cameras.main;
    // Keep the dock at a stable viewport position using ordinary world
    // coordinates. Phaser then uses the same transform for rendering and input
    // hit testing, unlike nested scroll-factor-zero children. Scene rebuilds can
    // briefly run before the replacement camera becomes active, so the dock
    // stays at its viewport anchor for that frame.
    container.setPosition(
      viewportX + (camera?.scrollX ?? 0),
      viewportY + (camera?.scrollY ?? 0)
    );
  };
  let listenerRemoved = false;
  const removeCameraFollower = (): void => {
    if (listenerRemoved) return;
    listenerRemoved = true;
    scene.events.off('postupdate', followCamera);
    scene.events.off('shutdown', removeCameraFollower);
  };
  scene.events.on('postupdate', followCamera);
  scene.events.once('shutdown', removeCameraFollower);
  container.once('destroy', removeCameraFollower);
  followCamera();

  const paperPoints = tornDockPoints(barWidth, barHeight);
  const shadow = scene.add.graphics().setPosition(5, 7);
  shadow.fillStyle(0x5f4027, 0.34);
  shadow.fillPoints(paperPoints, true);

  const paperStrip = scene.add.graphics();
  paperStrip.fillStyle(UI.paper, 1);
  paperStrip.fillPoints(paperPoints, true);
  paperStrip.lineStyle(2.5, UI.panelStroke, 0.76);
  paperStrip.strokePoints(paperPoints, true);
  const leftTape = scene.add
    .rectangle(-barWidth / 2 + 48, -barHeight / 2 + 5, 72, 22, UI.tape, 0.68)
    .setAngle(-5);
  const rightTape = scene.add
    .rectangle(barWidth / 2 - 48, -barHeight / 2 + 5, 72, 22, UI.tapeAlt, 0.52)
    .setAngle(5);
  container.add([shadow, paperStrip, leftTape, rightTape]);

  const slotWidth = barWidth / slotCount;
  const compactDock = slotCount > 5;
  const dockIconSize = compactDock ? 39 : 46;
  const dockLabelSize = compactDock ? 19 : 23;
  tabs.forEach((tab, index) => {
    const x = -barWidth / 2 + slotWidth * (index + 0.5);
    const isActive = tab.key === active;
    const isLocked = tab.locked === true;
    const slot = scene.add.container(x, 0);
    if (isActive) {
      slot.add(activeDockTabChip(scene, slotWidth - 14, barHeight - 26));
    }

    const iconY = compactDock ? -26 : -24;
    const icon = isLocked
      ? paperIcon(scene, 'lock', 0, iconY, {
          size: dockIconSize * 0.76,
          fill: UI.inkSoftHex,
        })
      : paperDockIcon(
          scene,
          tab.key,
          0,
          iconY,
          dockIconSize,
          isActive ? UI.creamHex : UI.inkHex,
          !isActive
        );
    const text = label(
      scene,
      0,
      compactDock ? 27 : 32,
      tab.visibleLabel ?? tab.label,
      dockLabelSize,
      isActive ? UI.cream : isLocked ? UI.inkSoft : UI.ink,
      true
    );
    const maximumLabelWidth = slotWidth - 8;
    if (text.width > maximumLabelWidth) {
      text.setScale(maximumLabelWidth / text.width);
    }
    if (isLocked) {
      icon.setAlpha(0.62);
      text.setAlpha(0.72);
    }
    slot.add([icon, text]);

    const hit = scene.add.rectangle(
      x,
      0,
      slotWidth,
      barHeight,
      0xffffff,
      0.001
    );
    if (!isLocked) hit.setInteractive({ useHandCursor: !isActive });
    container.add([slot, hit]);
    if (!isActive && !isLocked) wireTab(hit, slot, tab.onClick, scene);
    const nativeTab = actionOverlay.add({
      label: tab.label,
      rect: {
        x: (width - barWidth) / 2 + slotWidth * index,
        y: y - barHeight / 2,
        width: slotWidth,
        height: barHeight,
      },
      attributes: {
        'data-app-tab': tab.key,
        'data-app-tab-locked': String(isLocked),
      },
      pointerPassthrough: true,
      enabled: !isLocked,
      onActivate: isActive ? () => undefined : tab.onClick,
    });
    if (isActive) nativeTab.setAttribute('aria-current', 'page');
  });

  return container;
}

// An in-game error panel: a rounded card with a friendly message and a
// tappable Retry button. Used for background/load failures where a spontaneous
// toast would violate the "client effects must be user-initiated" rule.
export function errorPanel(
  scene: Scene,
  x: number,
  y: number,
  message: string,
  onRetry: () => void
): ErrorPanel {
  playSfx('ui.error');
  const width = 560;
  const height = 320;
  const container = scene.add.container(x, y).setDepth(1000);
  const shade = scene.add
    .rectangle(0, 0, 2000, 2000, 0x1a1320, 0.55)
    .setInteractive();
  const card = roundedPanel(scene, 0, 0, width, height);
  const text = label(scene, 0, -60, message, 30, UI.ink, true);
  text.setWordWrapWidth(width - 80);
  const retry = iconButton(
    scene,
    0,
    70,
    'replay',
    translate('common.retry'),
    onRetry,
    width - 120
  );
  container.add([shade, card, text, retry]);

  const destroy = (): void => container.destroy(true);
  return { container, destroy };
}

// Rounded-rectangle helper for arbitrary panels drawn directly.
function roundedPanel(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = UI.panel,
  stroke: number = UI.panelStroke
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  graphics.lineStyle(4, stroke, 1);
  graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  return graphics;
}

// A cream "paper card" with a hand-drawn wobbly border — the frame for drawings.
// Returns a graphics object centered on (x, y). `gold` swaps the border to the
// legend gold used in the Hall of Legends.
export function paperCard(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  gold = false
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const left = x - width / 2;
  const top = y - height / 2;

  // Cream page.
  graphics.fillStyle(UI.paper, 1);
  graphics.fillRoundedRect(left, top, width, height, 18);

  // Hand-drawn wobbly border: a rounded rect traced with small jitter so it
  // reads as ink drawn by hand rather than a crisp vector.
  const stroke = gold ? UI.gold : UI.panelStroke;
  graphics.lineStyle(gold ? 6 : 5, stroke, 1);
  drawWobblyRect(graphics, left + 6, top + 6, width - 12, height - 12);
  if (gold) {
    // Inner thin line for a framed-poster look.
    graphics.lineStyle(2, UI.panelStroke, 0.6);
    drawWobblyRect(graphics, left + 14, top + 14, width - 28, height - 28);
  }
  return graphics;
}

// Trace a rounded rectangle path with per-segment jitter for a hand-drawn feel.
// Uses a seeded random based on position+size so the same card always has the
// same wobble (consistent look, no re-randomization on every redraw).
function drawWobblyRect(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const wobble = 2.2;
  const steps = 14; // per edge
  let seed = (x * 73 + y * 137 + width * 251 + height * 397) | 0;
  const jitter = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5) * wobble * 2;
  };
  graphics.beginPath();
  graphics.moveTo(x, y);
  const edge = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void => {
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      graphics.lineTo(
        fromX + (toX - fromX) * t + jitter(),
        fromY + (toY - fromY) * t + jitter()
      );
    }
  };
  edge(x, y, x + width, y);
  edge(x + width, y, x + width, y + height);
  edge(x + width, y + height, x, y + height);
  edge(x, y + height, x, y);
  graphics.closePath();
  graphics.strokePath();
}

// A labeled element card using the canonical element mark. Category + value
// keeps the combat role readable anywhere the badge is shown.
export function elementBadge(
  scene: Scene,
  x: number,
  y: number,
  element: Element,
  scale = 1
): Phaser.GameObjects.Container {
  const style = ELEMENT_STYLES[element];
  const width = 180 * scale;
  const height = 62 * scale;
  const container = scene.add.container(x, y);
  const shadow = scene.add.rectangle(
    3 * scale,
    4 * scale,
    width,
    height,
    UI.inkHex,
    0.15
  );
  const face = scene.add
    .rectangle(0, 0, width, height, UI.creamHex, 1)
    .setStrokeStyle(3 * scale, style.primary, 0.9);
  const accentStrip = scene.add.rectangle(
    -width / 2 + 8 * scale,
    0,
    8 * scale,
    height - 14 * scale,
    style.primary,
    1
  );
  const icon = elementPaperIcon(
    scene,
    element,
    -width / 2 + 34 * scale,
    0,
    30 * scale
  );
  const category = label(
    scene,
    -width / 2 + 58 * scale,
    -12 * scale,
    'ELEMENT',
    13 * scale,
    UI.inkSoft,
    true
  ).setOrigin(0, 0.5);
  const value = label(
    scene,
    -width / 2 + 58 * scale,
    10 * scale,
    style.label.toUpperCase(),
    22 * scale,
    style.primaryText,
    true
  ).setOrigin(0, 0.5);
  container.add([shadow, face, accentStrip, icon, category, value]);
  return container;
}

// Four readable paper stat cards for phone-sized detail views. Two columns keep
// the canonical marks and exact numbers large enough to survive canvas scaling.
type StatGrid = {
  container: Phaser.GameObjects.Container;
  setStats: (stats: ScribbitStats, animate: boolean) => void;
};

export function statGrid(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number
): StatGrid {
  const container = scene.add.container(x, y);
  const gap = 12;
  const cardWidth = (width - gap) / 2;
  const cardHeight = (height - gap) / 2;
  const cards = new Map<StatKey, Phaser.GameObjects.Graphics>();
  const values = new Map<StatKey, Phaser.GameObjects.Text>();

  SCRIBBIT_STAT_KEYS.forEach((key, index) => {
    const style = STAT_STYLES[key];
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardX = -width / 2 + cardWidth / 2 + column * (cardWidth + gap);
    const cardY = -height / 2 + cardHeight / 2 + row * (cardHeight + gap);
    const textX = cardX - cardWidth / 2 + 68;
    const face = scene.add.graphics();

    const valueText = label(
      scene,
      textX,
      cardY + 18,
      '0',
      TYPE.body,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    const name = label(
      scene,
      textX,
      cardY - 17,
      style.label,
      TYPE.caption * 0.92,
      style.colorText,
      true
    ).setOrigin(0, 0.5);
    container.add([
      face,
      paperStatIcon(
        scene,
        key,
        cardX - cardWidth / 2 + 36,
        cardY,
        42,
        style.color,
        false
      ),
      valueText,
      name,
    ]);
    cards.set(key, face);
    values.set(key, valueText);
  });

  const setStats = (stats: ScribbitStats, animate: boolean): void => {
    const dominantStat = SCRIBBIT_STAT_KEYS.reduce((current, key) =>
      stats[key] > stats[current] ? key : current
    );
    SCRIBBIT_STAT_KEYS.forEach((key) => {
      const card = cards.get(key);
      const valueText = values.get(key);
      if (!card || !valueText) return;
      const value = stats[key];
      const index = SCRIBBIT_STAT_KEYS.indexOf(key);
      const column = index % 2;
      const row = Math.floor(index / 2);
      const cardX = -width / 2 + cardWidth / 2 + column * (cardWidth + gap);
      const cardY = -height / 2 + cardHeight / 2 + row * (cardHeight + gap);
      card.clear();
      card.fillStyle(UI.creamHex, 1);
      card.fillRoundedRect(
        cardX - cardWidth / 2,
        cardY - cardHeight / 2,
        cardWidth,
        cardHeight,
        14
      );
      card.fillStyle(STAT_STYLES[key].color, 1);
      card.fillRoundedRect(
        cardX - cardWidth / 2 + 8,
        cardY - cardHeight / 2 + 10,
        8,
        cardHeight - 20,
        4
      );
      const dominant = key === dominantStat;
      card.lineStyle(
        dominant ? 5 : 3,
        dominant ? UI.goldHex : STAT_STYLES[key].color,
        1
      );
      card.strokeRoundedRect(
        cardX - cardWidth / 2,
        cardY - cardHeight / 2,
        cardWidth,
        cardHeight,
        14
      );
      valueText.setText(String(value));
      if (animate) {
        scene.tweens.add({
          targets: valueText,
          scale: { from: 0.78, to: 1 },
          duration: 220,
          ease: 'Back.easeOut',
        });
      }
    });
  };

  return { container, setStats };
}

// Days-left helper shared by scenes.
export function daysLeftFor(scribbit: Scribbit, currentDay: number): number {
  return Math.max(0, scribbit.expiresDay - currentDay);
}

// A concise reward label that floats up and fades from (x, y). Purely cosmetic;
// caller triggers it optimistically. `depth`
// keeps it above modals. Text is configurable so we can reuse for other floats.
export function floatReward(
  scene: Scene,
  x: number,
  y: number,
  text = '+1 BELIEF',
  color: string = UI.coralText,
  depth = 3000,
  pinned = false
): void {
  const float = label(scene, x, y, text, 34, color, true).setDepth(depth);
  if (pinned) float.setScrollFactor(0);
  float.setStroke('#2b2016', 5);
  scene.tweens.add({
    targets: float,
    y: y - 90,
    scale: 1.25,
    duration: 260,
    ease: 'Back.easeOut',
    yoyo: false,
    onComplete: () => {
      scene.tweens.add({
        targets: float,
        y: y - 150,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeIn',
        onComplete: () => float.destroy(),
      });
    },
  });
}

// A simple labeled progress bar (used for the XP meter in the detail modal).
// Returns the container plus a setter that animates the fill to a 0..1 ratio.
type ProgressBar = {
  container: Phaser.GameObjects.Container;
  set: (ratio: number, animate: boolean) => void;
};

export function progressBar(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  fillColor: number,
  height = 18
): ProgressBar {
  const container = scene.add.container(x, y);
  const track = scene.add
    .rectangle(0, 0, width, height, UI.inkHex, 0.14)
    .setStrokeStyle(2, UI.inkHex, 0.5);
  const fill = scene.add
    .rectangle(-width / 2 + 2, 0, 2, height - 6, fillColor, 1)
    .setOrigin(0, 0.5);
  container.add([track, fill]);
  const set = (ratio: number, animate: boolean): void => {
    const target = Math.max(2, (width - 4) * Math.max(0, Math.min(1, ratio)));
    if (animate) {
      scene.tweens.add({
        targets: fill,
        width: target,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
    } else {
      fill.width = target;
    }
  };
  return { container, set };
}

// A small spinning loader indicator. Returns a controller with show/hide.
// The spinner is a rotating arc that fades in/out smoothly.
export type Spinner = {
  show: (x?: number, y?: number) => void;
  hide: () => void;
  destroy: () => void;
};

export function spinner(scene: Scene, depth = 900): Spinner {
  const container = scene.add
    .container(0, 0)
    .setDepth(depth)
    .setScrollFactor(0)
    .setVisible(false);
  const arc = scene.add.graphics();
  arc.lineStyle(6, UI.coral, 1);
  arc.beginPath();
  arc.arc(0, 0, 24, 0, Math.PI * 1.4, false);
  arc.strokePath();
  container.add(arc);

  const tween = scene.tweens.add({
    targets: arc,
    angle: 360,
    duration: 800,
    repeat: -1,
    ease: 'Linear',
  });
  tween.pause();

  const show = (x?: number, y?: number): void => {
    if (x !== undefined) container.x = x;
    if (y !== undefined) container.y = y;
    container.setVisible(true);
    tween.resume();
  };

  const hide = (): void => {
    container.setVisible(false);
    tween.pause();
  };

  const destroy = (): void => {
    tween.remove();
    container.destroy(true);
  };

  return { show, hide, destroy };
}
