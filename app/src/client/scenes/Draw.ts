import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { submitScribbit } from '../lib/api';
import { getArena, setArena } from '../lib/registry';
import { analyze, MIN_INK_PIXELS } from '../lib/analyzer';
import type { AnalyzerResult } from '../lib/analyzer';
import { DomOverlay } from '../lib/overlay';
import { DrawCanvas } from '../lib/drawcanvas';
import { ELEMENT_STYLES, FONT_STACK, UI } from '../lib/theme';
import {
  button,
  ghostButton,
  label,
  statBars,
  elementBadge,
  roundedPanel,
  errorPanel,
} from '../lib/ui';
import type { StatBars, ErrorPanel } from '../lib/ui';
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

  private bars!: StatBars;
  private elementBadgeRef: Phaser.GameObjects.Container | null = null;
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

    this.cameras.main.setBackgroundColor('#241b2e');
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

  // --- Phaser chrome (everything except the live canvas + name input) -------
  private buildChrome(): void {
    const { width } = this.scale;
    label(this, width / 2, 56, "DRAW TODAY'S SCRIBBIT", 36, UI.cream, true);
    label(this, width / 2, 96, 'Its shape becomes its stats', 22, '#c9b79a');
    ghostButton(this, 90, 56, '‹ Back', () => this.exitTo('ArenaHome'), 140);

    // Canvas frame — the DOM canvas sits on top of this at the same rect.
    roundedPanel(this, width / 2, 400, width - 60, 540, 0x2b2016, UI.gold);

    this.buildPalette(700);
    this.buildBrushRow(788);
    this.buildStatPreview(870);
    this.buildSubmitRow(1210);
  }

  private buildPalette(y: number): void {
    const { width } = this.scale;
    const count = PALETTE.length;
    const gap = (width - 80) / count;
    PALETTE.forEach((entry, index) => {
      const x = 40 + gap * (index + 0.5);
      const swatch = this.add
        .rectangle(x, y, 62, 62, Phaser.Display.Color.HexStringToColor(entry.color).color, 1)
        .setStrokeStyle(4, 0x2b2016, 1)
        .setInteractive({ useHandCursor: true });
      swatch.on('pointerup', () => this.selectColor(index, entry.color));
      this.colorSwatches.push(swatch);
    });
    // Highlight the ink pen by default.
    this.selectColor(0, PALETTE[0]?.color ?? '#2b2016');
  }

  private selectColor(index: number, color: string): void {
    this.canvas?.setColor(color);
    this.colorSwatches.forEach((swatch, swatchIndex) => {
      swatch.setStrokeStyle(swatchIndex === index ? 6 : 4, swatchIndex === index ? UI.gold : 0x2b2016, 1);
      swatch.setScale(swatchIndex === index ? 1.1 : 1);
    });
  }

  private buildBrushRow(y: number): void {
    const { width } = this.scale;
    // Three brush sizes.
    BRUSH_SIZES.forEach((size, index) => {
      const x = 90 + index * 96;
      const container = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, 84, 84, UI.creamHex, 1)
        .setStrokeStyle(4, 0x2b2016, 1)
        .setInteractive({ useHandCursor: true });
      const dot = this.add.circle(0, 0, size / 2 + 3, 0x2b2016, 1);
      container.add([bg, dot]);
      bg.on('pointerup', () => this.selectBrush(index, size));
      this.brushButtons.push(container);
    });
    this.selectBrush(1, BRUSH_SIZES[1] ?? 24);

    // Eraser, undo, clear.
    ghostButton(this, width - 300, y, '🧽 Erase', () => this.canvas?.setEraser(), 130);
    ghostButton(this, width - 168, y, '↩ Undo', () => this.canvas?.undo(), 130);
    ghostButton(this, width - 36, y, '🗑', () => this.confirmClear(), 100);
  }

  private selectBrush(index: number, size: number): void {
    this.canvas?.setBrushSize(size);
    this.brushButtons.forEach((container, buttonIndex) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(buttonIndex === index ? 6 : 4, buttonIndex === index ? UI.gold : 0x2b2016, 1);
    });
  }

  private confirmClear(): void {
    this.canvas?.clear();
    showToast('Fresh page ✏️');
  }

  private buildStatPreview(y: number): void {
    const { width } = this.scale;
    roundedPanel(this, width / 2, y + 70, width - 60, 240, 0x2b2016, UI.panelStroke);
    this.reactionText = label(this, width / 2, y - 6, 'Start drawing!', 26, UI.cream, true);
    this.elementBadgeRef = elementBadge(this, width / 2, y + 34, this.currentElement, 0.9);
    this.bars = statBars(this, 60, y + 90, width - 120);
  }

  private buildSubmitRow(y: number): void {
    const { width } = this.scale;
    button(this, width / 2, y, "🎉 IT'S ALIVE — Submit", () => this.trySubmit(), width - 80);
  }

  // --- DOM overlay (live canvas + name input) -------------------------------
  private buildOverlay(): void {
    this.overlay = new DomOverlay(this);

    this.canvas = new DrawCanvas({ onStrokeEnd: () => this.refreshPreview() });
    // Canvas frame is centered at (width/2, 400) with size (width-60)x540; the
    // drawing surface fills a square inside it.
    const frameWidth = this.scale.width - 60;
    const square = Math.min(frameWidth - 40, 500);
    this.overlay.place(this.canvas.element, {
      x: this.scale.width / 2 - square / 2,
      y: 400 - square / 2,
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
    this.overlay.place(this.nameInput, {
      x: 40,
      y: 1110,
      width: this.scale.width - 80,
      height: 72,
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
    const y = this.elementBadgeRef?.y ?? 904;
    const x = this.elementBadgeRef?.x ?? this.scale.width / 2;
    this.elementBadgeRef?.destroy();
    this.elementBadgeRef = elementBadge(this, x, y, element, 0.9);
    // Morph pop.
    this.elementBadgeRef.setScale(0.6);
    this.tweens.add({ targets: this.elementBadgeRef, scale: 0.9, duration: 260, ease: 'Back.easeOut' });
  }

  private updateReaction(result: AnalyzerResult): void {
    if (result.inkedPixels < MIN_INK_PIXELS) {
      this.reactionText.setText('Draw something! ✏️');
      this.reactionText.setColor(UI.cream);
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
    this.cameras.main.setBackgroundColor('#241b2e');

    const style = ELEMENT_STYLES[scribbit.element];
    this.add.rectangle(0, 0, width, height, style.primary, 0.14).setOrigin(0);

    const title = label(this, width / 2, 200, "IT'S ALIVE!", 64, UI.goldText, true).setScale(0);
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
    const cardY = height / 2 - 40;
    const card = roundedPanel(this, width / 2, cardY, 360, 400, 0x2b2016, UI.gold);
    card.setScale(0);
    const img = this.add.image(width / 2, cardY - 40, textureKey).setDisplaySize(300, 300).setScale(0);
    const nameLabel = label(this, width / 2, cardY + 150, scribbit.name.toUpperCase(), 34, UI.cream, true).setAlpha(0);
    const badge = elementBadge(this, width / 2, cardY + 200, scribbit.element, 0.9).setAlpha(0);

    this.tweens.add({ targets: [card, img], scale: 1, duration: 500, ease: 'Back.easeOut', onComplete: () => {
      img.setScale(1);
      img.setDisplaySize(300, 300);
    }});
    this.tweens.add({ targets: [nameLabel, badge], alpha: 1, delay: 400, duration: 400 });

    // Tiny idle wobble so the newborn feels alive.
    this.tweens.add({ targets: img, angle: 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const bars = statBars(this, width / 2 - 160, cardY + 260, 320);
    bars.container.setAlpha(0);
    bars.setStats(scribbit.stats, false);
    this.tweens.add({ targets: bars.container, alpha: 1, delay: 700, duration: 400 });

    label(this, width / 2, height - 90, 'Tap anywhere to continue', 22, '#c9b79a', true);
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
