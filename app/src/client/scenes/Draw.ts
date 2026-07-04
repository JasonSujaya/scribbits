import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { submitScribbit } from '../lib/api';
import { getArena, setArena } from '../lib/registry';
import { analyze, MIN_INK_PIXELS } from '../lib/analyzer';
import type { AnalyzerResult } from '../lib/analyzer';
import { DomOverlay } from '../lib/overlay';
import { DrawCanvas } from '../lib/drawcanvas';
import { ELEMENT_STYLES, EDGE, FONT_STACK, TYPE, UI } from '../lib/theme';
import { paperBackdrop } from '../lib/art';
import {
  button,
  ghostButton,
  label,
  handLettered,
  statGrid,
  elementBadge,
  stickerCard,
  errorPanel,
} from '../lib/ui';
import type { StatGrid, ErrorPanel } from '../lib/ui';
import type { Element, Scribbit } from '../../shared/arena';

// The 8-color element palette + black outline pen. Grouped by element hue so
// the color a player reaches for nudges the creature's element.
const PALETTE: { color: string; label: string }[] = [
  { color: '#2b2016', label: 'ink' }, // black outline pen
  { color: '#ff5a3d', label: 'ember' }, // ember red
  { color: '#ff9a3d', label: 'ember' }, // ember orange
  { color: '#3ba0e0', label: 'tide' }, // tide blue
  { color: '#7fd8e6', label: 'tide' }, // tide cyan
  { color: '#4faa4f', label: 'moss' }, // moss green
  { color: '#8a5cd8', label: 'storm' }, // storm purple
  { color: '#f2cf3d', label: 'storm' }, // storm yellow
];

const BRUSH_SIZES = [12, 24, 40];

// Playful reactive copy keyed by the currently-dominant stat.
const REACTIONS: Record<string, string[]> = {
  chonk: ['An absolute UNIT 🫓', 'Big beefy boy 🍞', 'Chonky and proud 🫧'],
  spike: ['Getting SPIKY 🌵', 'Absolutely stabby 🗡️', 'Ouch, pointy! 📌'],
  zip: ['Zoomy little guy 💨', 'Gotta go fast 🏃', 'Blink and miss it ⚡'],
  charm: ['So charming ✨', 'Dazzling colors 🌈', 'Crit machine 💥'],
};

export class Draw extends Scene {
  private overlay!: DomOverlay;
  private canvas!: DrawCanvas;
  private nameInput!: HTMLInputElement;

  private bars!: StatGrid;
  private elementBadgeRef: Phaser.GameObjects.Container | null = null;
  private statCard: Phaser.GameObjects.Container | null = null;
  private badgeLocalY = 0;
  private reactionText!: Phaser.GameObjects.Text;
  private currentElement: Element = 'ember';
  private lastResult: AnalyzerResult | null = null;
  private colorSwatches: Phaser.GameObjects.Rectangle[] = [];
  private brushButtons: Phaser.GameObjects.Container[] = [];

  private resizeHandler = (): void => this.overlay?.sync();
  private submitting = false;
  private errorPanelRef: ErrorPanel | null = null;

  constructor() {
    super('Draw');
  }

  init(): void {
    this.elementBadgeRef = null;
    this.lastResult = null;
    this.colorSwatches = [];
    this.brushButtons = [];
    this.submitting = false;
    this.errorPanelRef = null;
    this.currentElement = 'ember';
  }

  create(): void {
    // Defensive: clear any overlay a previous Draw visit might have left behind.
    DomOverlay.destroyAll();

    this.cameras.main.setBackgroundColor(UI.desk);
    paperBackdrop(this);
    this.buildChrome();
    this.buildOverlay();
    this.refreshPreview();

    window.addEventListener('resize', this.resizeHandler);
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
  }

  private cleanup(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.overlay?.destroy();
  }

  // Every exit from Draw routes through here so the DOM overlay is torn down
  // synchronously — we never depend on shutdown-event timing to remove it.
  private exitTo(sceneKey: string): void {
    this.cleanup();
    DomOverlay.destroyAll();
    this.scene.start(sceneKey);
  }

  // --- Layout budget (720x1280 design space) --------------------------------
  // Canvas is the hero. Everything below stacks on a strict grid so nothing
  // overlaps or clips: canvas → tools → stat panel → name → submit.
  private static readonly CANVAS_CENTER_Y = 408;
  private static readonly CANVAS_SQUARE = 548; // big hero canvas
  private static readonly TOOLS_Y = 736; // colors + brush + edit band
  private static readonly STAT_Y = 926; // stat panel center
  private static readonly NAME_Y = 1112;
  private static readonly SUBMIT_Y = 1220;

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    // Top bar: Back on the left, title centered in the remaining space so the
    // two never collide (the mission's header-clip bug).
    ghostButton(this, 90, 60, '‹', () => this.exitTo('ArenaHome'), 96);
    handLettered(this, width / 2 + 30, 56, "TODAY'S SCRIBBIT", 34, UI.ink, true);
    label(this, width / 2 + 30, 96, 'Its shape becomes its stats', TYPE.caption, UI.inkSoft);

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
    this.buildStatPanel(Draw.STAT_Y);
    button(this, width / 2, Draw.SUBMIT_Y, "🎉 IT'S ALIVE — Submit", () => this.trySubmit(), width - EDGE * 2);
  }

  // One clean band: 8 color swatches on the top line, brush sizes + edit tools
  // on the second line — grouped, evenly spaced, no crowding.
  private buildToolsBand(centerY: number): void {
    const { width } = this.scale;
    const colorY = centerY - 32;
    const toolY = centerY + 38;

    // Color swatches, evenly distributed across the full width.
    const count = PALETTE.length;
    const gap = (width - EDGE * 2) / count;
    PALETTE.forEach((entry, index) => {
      const x = EDGE + gap * (index + 0.5);
      const swatch = this.add
        .rectangle(x, colorY, 56, 56, Phaser.Display.Color.HexStringToColor(entry.color).color, 1)
        .setStrokeStyle(4, UI.inkHex, 1)
        .setInteractive({ useHandCursor: true });
      swatch.on('pointerup', () => this.selectColor(index, entry.color));
      this.colorSwatches.push(swatch);
    });
    this.selectColor(0, PALETTE[0]?.color ?? '#2b2016');

    // Brush sizes (left group).
    BRUSH_SIZES.forEach((size, index) => {
      const x = EDGE + 40 + index * 76;
      const container = this.add.container(x, toolY);
      const bg = this.add
        .rectangle(0, 0, 64, 64, UI.creamHex, 1)
        .setStrokeStyle(4, UI.inkHex, 1)
        .setInteractive({ useHandCursor: true });
      const dot = this.add.circle(0, 0, size / 2 + 2, UI.inkHex, 1);
      container.add([bg, dot]);
      bg.on('pointerup', () => this.selectBrush(index, size));
      this.brushButtons.push(container);
    });
    this.selectBrush(1, BRUSH_SIZES[1] ?? 24);

    // Edit tools (right group): erase / undo / clear.
    ghostButton(this, width - 274, toolY, '🧽', () => this.canvas?.setEraser(), 82);
    ghostButton(this, width - 182, toolY, '↩', () => this.canvas?.undo(), 82);
    ghostButton(this, width - 74, toolY, '🗑', () => this.confirmClear(), 92);
  }

  private selectColor(index: number, color: string): void {
    this.canvas?.setColor(color);
    this.colorSwatches.forEach((swatch, swatchIndex) => {
      swatch.setStrokeStyle(swatchIndex === index ? 6 : 4, swatchIndex === index ? UI.goldHex : UI.inkHex, 1);
      swatch.setScale(swatchIndex === index ? 1.12 : 1);
    });
  }

  private selectBrush(index: number, size: number): void {
    this.canvas?.setBrushSize(size);
    this.brushButtons.forEach((container, buttonIndex) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(buttonIndex === index ? 6 : 4, buttonIndex === index ? UI.goldHex : UI.inkHex, 1);
    });
  }

  private confirmClear(): void {
    this.canvas?.clear();
    showToast('Fresh page ✏️');
  }

  // Compact stat card: reaction + element badge on the top row, a 2x2 stat grid
  // below. Sized so the grid can NEVER clip the panel edge.
  private buildStatPanel(centerY: number): void {
    const { width } = this.scale;
    const panelW = width - EDGE * 2;
    const panelH = 236;
    const card = stickerCard(this, width / 2, centerY, panelW, panelH, { tapeColor: UI.tapeAlt, tilt: -0.3 });

    this.statCard = card;
    this.badgeLocalY = -panelH / 2 + 76;
    this.reactionText = label(this, 0, -panelH / 2 + 34, 'Start drawing!', TYPE.body, UI.ink, true);
    card.add(this.reactionText);
    this.elementBadgeRef = elementBadge(this, 0, this.badgeLocalY, this.currentElement, 0.82);
    card.add(this.elementBadgeRef);

    this.bars = statGrid(this, width / 2, centerY + 44, panelW - 48, 130);
  }

  // --- DOM overlay (live canvas + name input) -------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({ onStrokeEnd: () => this.refreshPreview() });
    const square = Draw.CANVAS_SQUARE;
    this.overlay.place(this.canvas.element, {
      x: this.scale.width / 2 - square / 2,
      y: Draw.CANVAS_CENTER_Y - square / 2,
      width: square,
      height: square,
    });

    // Name input overlaid near the submit row.
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = 24;
    this.nameInput.placeholder = 'Name your scribbit…';
    this.nameInput.autocomplete = 'off';
    Object.assign(this.nameInput.style, {
      fontFamily: FONT_STACK,
      fontSize: '26px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#2b2016',
      background: '#fff7e8',
      border: '4px solid #2b2016',
      borderRadius: '14px',
      outline: 'none',
    });
    // Distinct row above the submit button — NAME_Y is its center; a 68px-tall
    // field spans 1076..1144, well clear of the 96px submit button (1170..1266).
    const nameH = 68;
    this.overlay.place(this.nameInput, {
      x: EDGE,
      y: Draw.NAME_Y - nameH / 2,
      width: this.scale.width - EDGE * 2,
      height: nameH,
    });
  }

  // --- Live analyzer preview ------------------------------------------------
  private refreshPreview(): void {
    if (!this.canvas) return;
    const imageData = this.canvas.getImageData();
    const result = analyze({
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    });
    this.lastResult = result;
    this.bars.setStats(result.stats, true);
    this.updateElementBadge(result.element);
    this.updateReaction(result);
  }

  private updateElementBadge(element: Element): void {
    if (element === this.currentElement && this.elementBadgeRef) return;
    this.currentElement = element;
    this.elementBadgeRef?.destroy();
    // Re-add inside the stat card at the same local slot so it stays framed.
    this.elementBadgeRef = elementBadge(this, 0, this.badgeLocalY, element, 0.82);
    this.statCard?.add(this.elementBadgeRef);
    // Morph pop.
    this.elementBadgeRef.setScale(0.55);
    this.tweens.add({ targets: this.elementBadgeRef, scale: 0.82, duration: 260, ease: 'Back.easeOut' });
  }

  private updateReaction(result: AnalyzerResult): void {
    if (result.inkedPixels < MIN_INK_PIXELS) {
      this.reactionText.setText('Draw something! ✏️');
      this.reactionText.setColor(UI.inkSoft);
      return;
    }
    const dominant = (['chonk', 'spike', 'zip', 'charm'] as const).reduce((best, key) =>
      result.stats[key] > result.stats[best] ? key : best
    );
    const options = REACTIONS[dominant] ?? ['Looking good!'];
    // Deterministic pick by inked pixel count so it doesn't flicker every stroke.
    const pick = options[result.inkedPixels % options.length] ?? options[0] ?? '';
    if (this.reactionText.text !== pick) {
      this.reactionText.setText(pick);
      this.reactionText.setColor(ELEMENT_STYLES[result.element].primaryText);
      this.tweens.add({ targets: this.reactionText, scale: 1.12, duration: 160, yoyo: true });
    }
  }

  // --- Submit + ceremony ----------------------------------------------------
  private trySubmit(): void {
    if (this.submitting) return;
    const result = this.lastResult;
    if (!result || result.inkedPixels < MIN_INK_PIXELS) {
      showToast('Your scribbit needs a body! Draw a bit more ✏️');
      this.cameras.main.shake(220, 0.006);
      return;
    }
    const name = this.nameInput.value.trim();
    if (name.length < 2) {
      showToast('Give your scribbit a name (2+ letters) 🏷️');
      this.nameInput.focus();
      return;
    }

    this.submitting = true;
    this.overlay.setVisible(false);
    void this.submit(name, result);
  }

  private async submit(name: string, result: AnalyzerResult): Promise<void> {
    const dataUrl = this.canvas.toDataUrl();
    const response = await submitScribbit({
      name,
      imageDataUrl: dataUrl,
      stats: result.stats,
      element: result.element,
    });
    if (!response.ok) {
      this.submitting = false;
      this.overlay.setVisible(true);
      this.showError(response.error);
      return;
    }
    // Optimistically refresh arena's drawnToday via a light re-fetch on wake;
    // for now update local snapshot so ArenaHome reflects the new roster.
    const arena = getArena(this);
    if (arena) {
      setArena(this, {
        ...arena,
        drawnToday: true,
        myScribbits: [response.data, ...arena.myScribbits].slice(0, 3),
      });
    }
    this.playCeremony(response.data, dataUrl);
  }

  // "IT'S ALIVE" ceremony: the drawing rises with its final card, then home.
  private playCeremony(scribbit: Scribbit, dataUrl: string): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(UI.desk);
    paperBackdrop(this);

    const style = ELEMENT_STYLES[scribbit.element];
    this.add.rectangle(0, 0, width, height, style.primary, 0.1).setOrigin(0).setDepth(-90);

    const title = handLettered(this, width / 2, 180, "IT'S ALIVE!", 62, UI.goldText, true).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });

    // Load the just-drawn PNG straight from the data URL for an instant reveal.
    const key = `ceremony-${scribbit.id}`;
    const image = new Image();
    image.onload = () => {
      if (!this.scene.isActive()) return;
      if (!this.textures.exists(key)) this.textures.addImage(key, image);
      this.revealCard(scribbit, key);
    };
    image.src = dataUrl;

    // Confetti-ish sparkle burst.
    const emitter = this.add.particles(width / 2, height / 2, 'spark', {
      speed: { min: 120, max: 340 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1200,
      quantity: 30,
      tint: [style.particle, UI.gold],
      emitting: false,
    });
    emitter.explode(40);

    this.time.delayedCall(3400, () => {
      if (this.scene.isActive()) this.exitTo('ArenaHome');
    });
  }

  private revealCard(scribbit: Scribbit, textureKey: string): void {
    const { width, height } = this.scale;
    const cardW = 420;
    const cardH = 560;
    const cardY = height / 2 + 20;
    const card = stickerCard(this, width / 2, cardY, cardW, cardH, { gold: true, tapeColor: UI.tape });
    card.setScale(0);

    const artY = cardY - cardH / 2 + 170;
    const img = this.add.image(width / 2, artY, textureKey).setDisplaySize(280, 280).setScale(0).setDepth(10);
    const nameLabel = label(this, width / 2, cardY + 60, scribbit.name.toUpperCase(), TYPE.display * 0.66, UI.ink, true)
      .setAlpha(0)
      .setDepth(10);
    const badge = elementBadge(this, width / 2, cardY + 110, scribbit.element, 0.85).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: card,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: img,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => img.setDisplaySize(280, 280),
    });
    this.tweens.add({ targets: [nameLabel, badge], alpha: 1, delay: 400, duration: 400 });

    // Tiny idle wobble so the newborn feels alive.
    this.tweens.add({ targets: img, angle: 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const grid = statGrid(this, width / 2, cardY + cardH / 2 - 120, cardW - 60, 130);
    grid.container.setAlpha(0).setDepth(10);
    grid.setStats(scribbit.stats, false);
    this.tweens.add({ targets: grid.container, alpha: 1, delay: 700, duration: 400 });

    label(this, width / 2, height - 60, 'Tap anywhere to continue', TYPE.caption, UI.inkSoft, true).setDepth(10);
    this.input.once('pointerdown', () => {
      if (this.scene.isActive()) this.exitTo('ArenaHome');
    });
  }

  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
    });
  }
}
