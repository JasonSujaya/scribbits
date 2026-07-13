// The 512x512 drawing surface behind the Draw scene. Wraps a native HTML canvas
// so freehand strokes feel smooth on mobile (pointer events + round line caps).
// Exposes undo/redo snapshots (one per completed stroke), brush controls, and
// readouts for the analyzer (getImageData) and submission PNGs.

import type {
  CosmeticBrushEffect,
  CosmeticPenEffect,
} from '../../shared/cosmetics';
import {
  eraseMatchingColorSegment,
  parseHexColor,
  type RgbColor,
} from './coloreraser';

export const CANVAS_SIZE = 512;

// The cream page color is visual-only. The exported backing store stays
// transparent so the server sees the same pixels as the live analyzer.
const PAPER_COLOR = '#fdf3df';

export type BrushMode = 'draw' | 'erase';
export type DrawCanvasChange = 'draw' | 'erase' | 'clear' | 'undo' | 'redo';

export type DrawCanvasOptions = {
  // Called after every completed stroke (pointer-up) so the scene can re-run the
  // live analyzer and animate the stat preview.
  onStrokeEnd: (change: DrawCanvasChange) => void;
};

export type DrawingSubmissionImages = {
  // The exact undecorated pixels used by the live analyzer.
  baseImageDataUrl: string;
  // The player-facing image, including any cosmetic accessories.
  imageDataUrl: string;
};

export class DrawCanvas {
  readonly element: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onStrokeEnd: (change: DrawCanvasChange) => void;

  private color = '#2b2016';
  private brushSize = 22;
  private mode: BrushMode = 'draw';
  private eraserTargetColor: RgbColor = [43, 32, 22];

  // Active pen effect + its palette. Rainbow advances a hue as the stroke moves;
  // midnight flecks white specks over a near-black base.
  private penEffect: CosmeticPenEffect = 'solid';
  private penColors: string[] = ['#2b2016'];
  private brushEffect: CosmeticBrushEffect | null = null;
  private huePhase = 0; // 0..1, advances along a rainbow stroke

  private drawing = false;
  private strokeChanged = false;
  private lastX = 0;
  private lastY = 0;

  // Canvas snapshots avoid allocating a new 1 MiB JavaScript RGBA array at the
  // start of every stroke. Old snapshots are pooled for the next stroke.
  private history: HTMLCanvasElement[] = [];
  private redoHistory: HTMLCanvasElement[] = [];
  private snapshotPool: HTMLCanvasElement[] = [];
  private readonly maxHistory = 10;
  private activeBounds: DOMRect | null = null;
  private readonly handlePointerDown = (event: PointerEvent): void =>
    this.startStroke(event);
  private readonly handlePointerMove = (event: PointerEvent): void =>
    this.moveStroke(event);
  private readonly handlePointerUp = (): void => this.endStroke();

  constructor(options: DrawCanvasOptions) {
    this.onStrokeEnd = options.onStrokeEnd;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    canvas.style.touchAction = 'none';
    canvas.style.borderRadius = '10px';
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'block';
    // The cream paper shows through CSS so the backing store stays transparent —
    // that way the analyzer (which keys on alpha) only ever sees real strokes.
    canvas.style.background = PAPER_COLOR;
    this.element = canvas;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('2D canvas context unavailable');
    }
    this.ctx = context;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    // Backing store starts fully transparent (an empty page).

    this.attachPointerHandlers();
  }

  // --- Public controls ------------------------------------------------------

  setColor(color: string): void {
    this.color = color;
    this.mode = 'draw';
    // A plain color selection resets any special pen effect.
    this.penEffect = 'solid';
    this.penColors = [color];
  }

  // Select an unlocked Mystery Ink pen. `colors` is the pen's palette; for
  // rainbow it's the cycle stops, for midnight it's the base ink. Switches to
  // draw mode. The first color is used as the base stroke color.
  setPen(effect: CosmeticPenEffect, colors: string[]): void {
    this.mode = 'draw';
    this.penEffect = effect;
    this.penColors = colors.length > 0 ? colors : ['#2b2016'];
    this.color = this.penColors[0] ?? '#2b2016';
  }

  setBrushSize(size: number): void {
    this.brushSize = size;
  }

  setBrushEffect(effect: CosmeticBrushEffect | null): void {
    this.brushEffect = effect;
    this.mode = 'draw';
  }

  setEraser(targetColor = this.color): void {
    this.eraserTargetColor =
      parseHexColor(targetColor) ?? this.eraserTargetColor;
    this.mode = 'erase';
  }

  isErasing(): boolean {
    return this.mode === 'erase';
  }

  clear(): void {
    this.pushHistory();
    this.paintPaper();
    this.onStrokeEnd('clear');
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.pushCurrentSnapshot(this.redoHistory);
    this.restoreSnapshot(previous);
    this.snapshotPool.push(previous);
    this.onStrokeEnd('undo');
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  redo(): void {
    const next = this.redoHistory.pop();
    if (!next) return;
    this.pushCurrentSnapshot(this.history);
    this.restoreSnapshot(next);
    this.snapshotPool.push(next);
    this.onStrokeEnd('redo');
  }

  canRedo(): boolean {
    return this.redoHistory.length > 0;
  }

  destroy(): void {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointerleave', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerUp);
    this.history = [];
    this.redoHistory = [];
    this.snapshotPool = [];
    this.activeBounds = null;
    this.drawing = false;
    this.strokeChanged = false;
    this.element.remove();
  }

  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // Export the undecorated analyzer source and the player-facing rendered PNG
  // together. The optional callback only changes the rendered copy, keeping
  // accessories cosmetic and the server analyzer aligned with the live preview.
  exportSubmissionImages(
    decorateRenderedImage?: (ctx: CanvasRenderingContext2D) => void
  ): DrawingSubmissionImages {
    const baseImageDataUrl = this.element.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = CANVAS_SIZE;
    out.height = CANVAS_SIZE;
    const context = out.getContext('2d');
    if (!context) {
      return { baseImageDataUrl, imageDataUrl: baseImageDataUrl };
    }
    context.drawImage(this.element, 0, 0);
    decorateRenderedImage?.(context);
    return {
      baseImageDataUrl,
      imageDataUrl: out.toDataURL('image/png'),
    };
  }

  // --- Internals ------------------------------------------------------------

  // Reset the backing store to a fully transparent (empty) page.
  private paintPaper(): void {
    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  private pushHistory(): void {
    this.releaseSnapshots(this.redoHistory);
    this.pushCurrentSnapshot(this.history);
  }

  private pushCurrentSnapshot(target: HTMLCanvasElement[]): void {
    const snapshot =
      this.snapshotPool.pop() ?? document.createElement('canvas');
    snapshot.width = CANVAS_SIZE;
    snapshot.height = CANVAS_SIZE;
    const context = snapshot.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.drawImage(this.element, 0, 0);
    target.push(snapshot);
    if (target.length > this.maxHistory) {
      const released = target.shift();
      if (released) this.snapshotPool.push(released);
    }
  }

  private restoreSnapshot(snapshot: HTMLCanvasElement): void {
    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Copy semantics restore the exact snapshot regardless of the selected
    // paint, brush texture, or color-eraser target.
    this.ctx.save();
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'copy';
    this.ctx.drawImage(snapshot, 0, 0);
    this.ctx.restore();
  }

  private releaseSnapshots(snapshots: HTMLCanvasElement[]): void {
    while (snapshots.length > 0) {
      const snapshot = snapshots.pop();
      if (snapshot) this.snapshotPool.push(snapshot);
    }
  }

  private attachPointerHandlers(): void {
    const canvas = this.element;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
  }

  // Translate a client pointer position into 512x512 backing-store coordinates.
  private toCanvasCoords(event: PointerEvent): { x: number; y: number } {
    const bounds = this.activeBounds ?? this.element.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / bounds.width;
    const scaleY = CANVAS_SIZE / bounds.height;
    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  }

  private startStroke(event: PointerEvent): void {
    event.preventDefault();
    this.pushHistory();
    this.drawing = true;
    this.strokeChanged = false;
    this.activeBounds = this.element.getBoundingClientRect();
    this.huePhase = 0;
    const { x, y } = this.toCanvasCoords(event);
    this.lastX = x;
    this.lastY = y;
    if (this.mode === 'erase') {
      this.strokeChanged = this.eraseSelectedColorSegment(x, y, x, y) > 0;
    } else {
      // A dot so single taps register as a mark.
      this.applyBrush();
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.activeBrushWidth() / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = this.currentStrokeColor();
      this.ctx.fill();
      this.flingSpecks(x, y);
      this.strokeChanged = true;
    }
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture can throw on some engines — safe to ignore.
    }
  }

  private moveStroke(event: PointerEvent): void {
    if (!this.drawing) return;
    event.preventDefault();
    const { x, y } = this.toCanvasCoords(event);
    if (this.mode === 'erase') {
      this.strokeChanged =
        this.eraseSelectedColorSegment(this.lastX, this.lastY, x, y) > 0 ||
        this.strokeChanged;
      this.lastX = x;
      this.lastY = y;
      return;
    }

    this.applyBrush();
    // Rainbow advances its hue as the stroke travels, so the color is set per
    // segment; solid/midnight keep a stable base color.
    this.huePhase = (this.huePhase + 0.02) % 1;
    this.ctx.strokeStyle = this.currentStrokeColor();
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.flingSpecks(x, y);
    this.lastX = x;
    this.lastY = y;
  }

  // The color for the current stroke segment. Rainbow interpolates through its
  // cycle stops by huePhase; everything else uses the base color.
  private currentStrokeColor(): string {
    if (this.penEffect === 'rainbow' && this.penColors.length > 1) {
      const span = this.penColors.length;
      const scaled = this.huePhase * span;
      const index = Math.floor(scaled) % span;
      return this.penColors[index] ?? this.color;
    }
    return this.color;
  }

  // Ink and brush textures stay cosmetic. The submitted pixels remain the
  // analyzer's source of truth, so every effect still produces honest stats.
  private flingSpecks(x: number, y: number): void {
    const isMidnight = this.penEffect === 'midnight';
    const isChalk = this.brushEffect === 'chalk';
    const isSpray = this.brushEffect === 'spray';
    if (!isMidnight && !isChalk && !isSpray) return;

    const count = isSpray ? 10 : isChalk ? 4 : 2;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = isChalk ? 0.34 : 0.9;
    this.ctx.fillStyle = isMidnight
      ? 'rgba(255,255,255,0.9)'
      : this.currentStrokeColor();
    for (let index = 0; index < count; index += 1) {
      const radius = this.brushSize * (isSpray ? 1.05 : 0.52) * Math.random();
      const angle = Math.random() * Math.PI * 2;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;
      this.ctx.beginPath();
      const speckRadius = isSpray
        ? 0.8 + Math.random() * Math.max(1.4, this.brushSize * 0.09)
        : 0.7 + Math.random() * 1.3;
      this.ctx.arc(sx, sy, speckRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private endStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.activeBounds = null;
    if (!this.strokeChanged) {
      const unusedSnapshot = this.history.pop();
      if (unusedSnapshot) this.snapshotPool.push(unusedSnapshot);
      return;
    }
    this.onStrokeEnd(this.mode === 'erase' ? 'erase' : 'draw');
  }

  private eraseSelectedColorSegment(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): number {
    const radius = this.brushSize / 2;
    const padding = Math.ceil(radius) + 1;
    const left = Math.max(0, Math.floor(Math.min(startX, endX) - padding));
    const top = Math.max(0, Math.floor(Math.min(startY, endY) - padding));
    const right = Math.min(
      CANVAS_SIZE,
      Math.ceil(Math.max(startX, endX) + padding)
    );
    const bottom = Math.min(
      CANVAS_SIZE,
      Math.ceil(Math.max(startY, endY) + padding)
    );
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return 0;

    const imageData = this.ctx.getImageData(left, top, width, height);
    const erasedPixels = eraseMatchingColorSegment(
      imageData.data,
      width,
      height,
      {
        startX: startX - left,
        startY: startY - top,
        endX: endX - left,
        endY: endY - top,
        radius,
      },
      this.eraserTargetColor
    );
    if (erasedPixels > 0) this.ctx.putImageData(imageData, left, top);
    return erasedPixels;
  }

  private applyBrush(): void {
    this.ctx.globalAlpha = 1;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.activeBrushWidth();
    this.ctx.globalCompositeOperation = 'source-over';
    if (this.brushEffect === 'chalk') this.ctx.globalAlpha = 0.58;
    if (this.brushEffect === 'ribbon') {
      this.ctx.globalAlpha = 0.86;
      this.ctx.lineCap = 'butt';
      this.ctx.lineJoin = 'bevel';
    }
    if (this.brushEffect === 'spray') this.ctx.globalAlpha = 0.72;
    this.ctx.strokeStyle = this.currentStrokeColor();
  }

  private activeBrushWidth(): number {
    if (this.mode === 'erase') return this.brushSize;
    if (this.brushEffect === 'chalk') return this.brushSize * 0.72;
    if (this.brushEffect === 'ribbon') return this.brushSize * 1.18;
    if (this.brushEffect === 'spray') return this.brushSize * 0.42;
    return this.brushSize;
  }
}
