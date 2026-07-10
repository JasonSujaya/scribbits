// Reusable UI builders. Small, composable factories that return Phaser objects
// or lightweight controllers. Kept framework-thin so scenes stay readable.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element, Scribbit, ScribbitStats } from '../../shared/arena';
import {
  ELEMENT_STYLES,
  FONT_STACK,
  MIN_TOUCH,
  STAT_STYLES,
  TYPE,
  UI,
} from './theme';

const TRANSITION_MS = 180;

export function fadeToScene(scene: Scene, key: string, data?: Record<string, unknown>): void {
  scene.cameras.main.fadeOut(TRANSITION_MS, 255, 247, 232);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(key, data);
  });
}

export type ErrorPanel = {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
};

const STAT_KEYS = ['chonk', 'spike', 'zip', 'charm'] as const;
type StatKey = (typeof STAT_KEYS)[number];

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

// Hand-lettered display header: each glyph is its own Text with a small random
// rotation + baseline hop, so the word reads as drawn by hand rather than typeset.
// Returns a container centered on (x, y). Deterministic-ish jitter per index.
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
  const glyphs: Phaser.GameObjects.Text[] = [];
  const style = {
    fontFamily: FONT_STACK,
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
  } as const;

  // First lay out at origin (0,0) to measure natural widths.
  let cursor = 0;
  const spacing = size * 0.06;
  text.split('').forEach((char, index) => {
    if (char === ' ') {
      cursor += size * 0.34;
      return;
    }
    // Optional ink drop-shadow glyph behind for depth.
    if (shadow) {
      const sh = scene.add
        .text(cursor + 3, 4, char, { ...style, color: '#00000055' })
        .setOrigin(0, 0.5);
      container.add(sh);
      sh.setData('shadowFor', index);
    }
    const glyph = scene.add.text(cursor, 0, char, style).setOrigin(0, 0.5);
    // Alternating tilt with a touch of noise; even letters lean left, odd right.
    const lean = (index % 2 === 0 ? -1 : 1) * (2 + (index % 3));
    glyph.setAngle(lean);
    glyph.y = index % 2 === 0 ? -2 : 2;
    container.add(glyph);
    glyphs.push(glyph);
    // Sync the matching shadow's transform.
    const sh = container.list.find(
      (o) => (o as Phaser.GameObjects.Text).getData?.('shadowFor') === index
    ) as Phaser.GameObjects.Text | undefined;
    if (sh) {
      sh.setAngle(lean);
      sh.y = glyph.y + 4;
    }
    cursor += glyph.width + spacing;
  });

  // Center the whole word.
  container.list.forEach((o) => {
    (o as Phaser.GameObjects.Text).x -= cursor / 2;
  });
  container.setData('glyphs', glyphs);
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

// A small mood chip: emoji + word, colored by mood.
export function moodChip(
  scene: Scene,
  x: number,
  y: number,
  emoji: string,
  moodLabel: string,
  color: string,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const w = 130 * scale;
  const bg = scene.add
    .rectangle(0, 0, w, 40 * scale, UI.creamHex, 1)
    .setStrokeStyle(3, UI.inkHex, 1);
  const txt = label(scene, 0, 0, `${emoji} ${moodLabel}`, 22 * scale, color, true);
  container.add([bg, txt]);
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

// A compact care button: emoji + label pill, ink border, springy press. Tall
// buttons (height>=80) stack emoji over label; short ones keep them on one line.
export function careButton(
  scene: Scene,
  x: number,
  y: number,
  emoji: string,
  text: string,
  fill: number,
  onClick: () => void,
  width = 130,
  height = MIN_TOUCH
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(4, UI.inkHex, 1);
  bg.setInteractive({ useHandCursor: true });
  const stacked = height >= 80;
  const caption = text ? (emoji ? (stacked ? `${emoji}\n${text}` : `${emoji} ${text}`) : text) : emoji;
  const txt = label(scene, 0, 0, caption, text ? 20 : 26, fill === UI.gold ? UI.ink : '#ffffff', true);
  txt.setLineSpacing(-2);
  txt.setAlign('center');
  txt.setWordWrapWidth(width - 8);
  container.add([bg, txt]);
  const press = (): void => {
    scene.tweens.add({ targets: container, scaleX: 0.92, scaleY: 0.9, duration: 60, ease: 'Quad.easeOut' });
  };
  const release = (): void => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 110, ease: 'Back.easeOut' });
  };
  bg.on('pointerover', press);
  bg.on('pointerout', release);
  bg.on('pointerdown', press);
  bg.on('pointerup', () => {
    release();
    onClick();
  });
  return container;
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
  textColor = '#ffffff'
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, 96);
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(4, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, 0, text, 32, textColor, true);
  txt.setWordWrapWidth(width - 24);
  container.add([bg, txt]);

  const press = (): void => {
    scene.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.92, duration: 70, ease: 'Quad.easeOut' });
  };
  const release = (): void => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
  };
  bg.on('pointerover', press);
  bg.on('pointerout', release);
  bg.on('pointerdown', press);
  bg.on('pointerup', () => {
    release();
    onClick();
  });

  return container;
}

// A smaller secondary button (outline style), for nav rows.
export function ghostButton(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width = 200
): Phaser.GameObjects.Container {
  const height = MIN_TOUCH;
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, UI.creamHex, 1)
    .setStrokeStyle(4, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, 0, text, 26, UI.ink, true);
  txt.setWordWrapWidth(width - 20);
  container.add([bg, txt]);

  const press = (): void => {
    scene.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.92, duration: 70, ease: 'Quad.easeOut' });
  };
  const release = (): void => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
  };
  bg.on('pointerover', press);
  bg.on('pointerout', release);
  bg.on('pointerdown', press);
  bg.on('pointerup', () => {
    release();
    onClick();
  });
  return container;
}

export type AppTabKey = 'arena' | 'gallery' | 'draw' | 'battles' | 'scout';

export type AppTabItem = {
  key: AppTabKey;
  icon: string;
  label: string;
  onClick: () => void;
};

function tabIcon(scene: Scene, key: AppTabKey, x: number, y: number, color: number, scale = 1): Phaser.GameObjects.Container {
  const icon = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;
  const stroke = 3.2 * s;
  g.lineStyle(stroke, color, 1);

  if (key === 'arena') {
    g.strokeCircle(0, -3 * s, 13 * s);
    g.lineBetween(-18 * s, 12 * s, 18 * s, 12 * s);
    g.lineBetween(-10 * s, 4 * s, -10 * s, 12 * s);
    g.lineBetween(10 * s, 4 * s, 10 * s, 12 * s);
    g.lineBetween(-7 * s, -12 * s, 7 * s, -12 * s);
  } else if (key === 'gallery') {
    g.strokeRoundedRect(-11 * s, -13 * s, 22 * s, 17 * s, 4 * s);
    g.lineBetween(-16 * s, -8 * s, -11 * s, -2 * s);
    g.lineBetween(16 * s, -8 * s, 11 * s, -2 * s);
    g.lineBetween(0, 4 * s, 0, 14 * s);
    g.lineBetween(-10 * s, 14 * s, 10 * s, 14 * s);
  } else if (key === 'draw') {
    g.lineStyle(5 * s, color, 1);
    g.lineBetween(-14 * s, 13 * s, 10 * s, -11 * s);
    g.lineStyle(3 * s, color, 1);
    g.lineBetween(7 * s, -14 * s, 14 * s, -7 * s);
    g.lineBetween(-17 * s, 16 * s, -11 * s, 18 * s);
  } else if (key === 'battles') {
    g.lineBetween(-15 * s, -14 * s, 15 * s, 16 * s);
    g.lineBetween(15 * s, -14 * s, -15 * s, 16 * s);
    g.lineBetween(-3 * s, 2 * s, -10 * s, 9 * s);
    g.lineBetween(3 * s, 2 * s, 10 * s, 9 * s);
  } else {
    g.lineBetween(-7 * s, -18 * s, -12 * s, -6 * s);
    g.lineBetween(7 * s, -18 * s, 12 * s, -6 * s);
    g.fillStyle(color, 0.18);
    g.fillCircle(0, 3 * s, 12 * s);
    g.strokeCircle(0, 3 * s, 12 * s);
    g.lineBetween(-5 * s, 3 * s, 5 * s, 3 * s);
    g.lineBetween(0, -2 * s, 0, 8 * s);
  }

  icon.add(g);
  return icon;
}

function wireTab(
  hit: Phaser.GameObjects.GameObject,
  target: Phaser.GameObjects.Container,
  onClick: () => void,
  scene: Scene
): void {
  hit.on('pointerdown', () => {
    scene.tweens.add({ targets: target, scaleX: 0.88, scaleY: 0.86, duration: 60, ease: 'Quad.easeOut' });
  });
  hit.on('pointerout', () => {
    scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration: 110, ease: 'Back.easeOut' });
  });
  hit.on('pointerup', () => {
    scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration: 110, ease: 'Back.easeOut' });
    onClick();
  });
}

export function appTabBar(
  scene: Scene,
  active: AppTabKey,
  tabs: AppTabItem[]
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const barWidth = width;
  const barHeight = 88;
  const y = height - barHeight / 2;
  const container = scene.add.container(width / 2, y).setScrollFactor(0).setDepth(1800);

  const panel = scene.add.graphics();
  panel.fillStyle(UI.creamHex, 0.98);
  panel.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight + 30, {
    tl: 30,
    tr: 30,
    bl: 0,
    br: 0,
  });
  panel.lineStyle(4, UI.inkHex, 1);
  panel.beginPath();
  panel.moveTo(-barWidth / 2, -barHeight / 2 + 2);
  panel.lineTo(barWidth / 2, -barHeight / 2 + 2);
  panel.strokePath();
  container.add(panel);

  const slotWidth = barWidth / tabs.length;
  tabs.forEach((tab, index) => {
    const x = -barWidth / 2 + slotWidth * (index + 0.5);
    const isActive = tab.key === active;
    const isPrimary = tab.key === 'draw';

    if (isPrimary) {
      const sealY = 2;
      const sealRadius = 26;
      const seal = scene.add.container(x, sealY);
      const bg = scene.add.graphics();
      bg.fillStyle(0x000000, 0.14);
      bg.fillCircle(3, 4, sealRadius);
      bg.fillStyle(UI.coral, 1);
      bg.fillCircle(0, 0, sealRadius);
      bg.lineStyle(4, UI.inkHex, 1);
      bg.strokeCircle(0, 0, sealRadius);
      bg.lineStyle(3, UI.creamHex, 0.45);
      bg.strokeCircle(0, 0, 18);
      const icon = tabIcon(scene, tab.key, 0, -2, UI.creamHex, 0.72);
      const text = label(scene, 0, 29, tab.label, 17, UI.ink, true);
      seal.add([bg, icon, text]);
      const hit = scene.add.circle(x, sealY, 34, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      container.add([seal, hit]);
      wireTab(hit, seal, tab.onClick, scene);
      return;
    }

    const tint = isActive ? UI.coral : UI.inkSoftHex;
    const textColor = isActive ? UI.ink : UI.inkSoft;
    const slot = scene.add.container(x, 0);
    const icon = tabIcon(scene, tab.key, 0, -10, tint, 0.9);
    const text = label(scene, 0, 25, tab.label, 18, textColor, true);
    slot.add([icon, text]);
    if (isActive) slot.add(scene.add.rectangle(0, 42, 34, 5, UI.coral, 1));

    const hit = scene.add
      .rectangle(x, 0, slotWidth - 8, barHeight, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add([slot, hit]);
    wireTab(hit, slot, tab.onClick, scene);
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
  const width = 560;
  const height = 320;
  const container = scene.add.container(x, y).setDepth(1000);
  const shade = scene.add
    .rectangle(0, 0, 2000, 2000, 0x1a1320, 0.55)
    .setInteractive();
  const card = roundedPanel(scene, 0, 0, width, height);
  const text = label(scene, 0, -60, message, 30, UI.ink, true);
  text.setWordWrapWidth(width - 80);
  const retry = button(scene, 0, 70, '↻ Retry', onRetry, width - 120);
  container.add([shade, card, text, retry]);

  const destroy = (): void => container.destroy(true);
  return { container, destroy };
}

// Rounded-rectangle helper for arbitrary panels drawn directly.
export function roundedPanel(
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

// A small rounded element badge with emoji + label.
export function elementBadge(
  scene: Scene,
  x: number,
  y: number,
  element: Element,
  scale = 1
): Phaser.GameObjects.Container {
  const style = ELEMENT_STYLES[element];
  const width = 150 * scale;
  const height = 56 * scale;
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, style.primary, 1)
    .setStrokeStyle(3, 0x2b2016, 1);
  const text = label(
    scene,
    0,
    0,
    `${style.emoji} ${style.label}`,
    24 * scale,
    '#ffffff',
    true
  );
  container.add([bg, text]);
  return container;
}

// A compact 2x2 stat grid — four labeled meters that NEVER clip. Sized to fit
// inside a given width; each cell has an icon+label, a short bar, and a value.
// Returns a controller whose setStats animates the fills. Centered on (x, y).
export type StatGrid = {
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
  const colWidth = width / 2;
  const rowHeight = height / 2;
  const bars = new Map<StatKey, Phaser.GameObjects.Rectangle>();
  const values = new Map<StatKey, Phaser.GameObjects.Text>();
  const barMax = colWidth - 150;

  STAT_KEYS.forEach((key, index) => {
    const style = STAT_STYLES[key];
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cellX = -width / 2 + colWidth * col + 12;
    const cellY = -height / 2 + rowHeight * (row + 0.5);

    const name = label(scene, cellX, cellY - 16, `${style.emoji} ${style.label}`, 22, style.colorText, true).setOrigin(0, 0.5);
    const track = scene.add
      .rectangle(cellX, cellY + 12, barMax, 16, UI.progressTrack, 0.16)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, UI.progressTrack, 0.3);
    const fill = scene.add.rectangle(cellX + 2, cellY + 12, 1, 11, style.color, 1).setOrigin(0, 0.5);
    const valueText = label(scene, cellX + barMax + 30, cellY + 12, '0', 22, UI.ink, true).setOrigin(0.5);
    container.add([name, track, fill, valueText]);
    bars.set(key, fill);
    values.set(key, valueText);
  });

  const setStats = (stats: ScribbitStats, animate: boolean): void => {
    STAT_KEYS.forEach((key) => {
      const fill = bars.get(key);
      const valueText = values.get(key);
      if (!fill || !valueText) return;
      const value = stats[key];
      const target = Math.max(2, (barMax - 4) * Math.min(1, value / 55));
      if (animate) {
        scene.tweens.add({ targets: fill, width: target, duration: 260, ease: 'Cubic.easeOut' });
      } else {
        fill.width = target;
      }
      valueText.setText(String(value));
    });
  };

  return { container, setStats };
}

// Days-left helper shared by scenes.
export function daysLeftFor(scribbit: Scribbit, currentDay: number): number {
  return Math.max(0, scribbit.expiresDay - currentDay);
}

// A "+1 💛" that floats up and fades from (x, y) — the visible reward for a
// Believe tap. Purely cosmetic; caller triggers it optimistically. `depth`
// keeps it above modals. Text is configurable so we can reuse for other floats.
export function floatReward(
  scene: Scene,
  x: number,
  y: number,
  text = '+1 💛',
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
export type ProgressBar = {
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
      scene.tweens.add({ targets: fill, width: target, duration: 320, ease: 'Cubic.easeOut' });
    } else {
      fill.width = target;
    }
  };
  return { container, set };
}

// A rosette ribbon badge marking "your pick" on a backed entrant.
export function rosette(
  scene: Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(6);
  const disc = scene.add.circle(0, 0, 20 * scale, UI.gold, 1).setStrokeStyle(3, UI.inkHex, 1);
  const star = label(scene, 0, 0, '🎯', 20 * scale);
  // Two ribbon tails below the disc.
  const tailL = scene.add.triangle(-8 * scale, 22 * scale, 0, 0, 14 * scale, 0, 7 * scale, 20 * scale, UI.coral, 1).setStrokeStyle(2, UI.inkHex, 1);
  const tailR = scene.add.triangle(8 * scale, 22 * scale, 0, 0, 14 * scale, 0, 7 * scale, 20 * scale, UI.coralDeep, 1).setStrokeStyle(2, UI.inkHex, 1);
  container.add([tailL, tailR, disc, star]);
  return container;
}

// A small spinning loader indicator. Returns a controller with show/hide.
// The spinner is a rotating arc that fades in/out smoothly.
export type Spinner = {
  show: (x?: number, y?: number) => void;
  hide: () => void;
  destroy: () => void;
};

export function spinner(scene: Scene, depth = 900): Spinner {
  const container = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0).setVisible(false);
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

// A dominant, pulsing CTA button for primary actions (like DRAW TODAY'S SCRIBBIT).
// Much larger than regular buttons with a breathing animation to draw attention.
export function dominantButton(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width: number,
  pulsing = true
): Phaser.GameObjects.Container {
  const height = 140;
  const container = scene.add.container(x, y);

  // Outer glow ring
  const glow = scene.add.graphics();
  glow.fillStyle(UI.coral, 0.3);
  glow.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, 24);
  container.add(glow);

  // Main button background
  const bg = scene.add
    .rectangle(0, 0, width, height, UI.coral, 1)
    .setStrokeStyle(6, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });

  // Text with larger size
  const txt = label(scene, 0, 0, text, 38, '#ffffff', true);
  txt.setWordWrapWidth(width - 40);

  container.add([bg, txt]);

  // Pulsing animation for the glow
  if (pulsing) {
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 0.2 },
      scale: { from: 1, to: 1.05 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Button press feedback
  const press = (): void => {
    scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.94, duration: 80, ease: 'Quad.easeOut' });
  };
  const release = (): void => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
  };

  bg.on('pointerover', press);
  bg.on('pointerout', release);
  bg.on('pointerdown', press);
  bg.on('pointerup', () => {
    release();
    onClick();
  });

  return container;
}
