// The 512x512 drawing surface behind the Draw scene. Wraps a native HTML canvas
// so freehand strokes feel smooth on mobile (pointer events + round line caps).
// Exposes an undo stack (one snapshot per completed stroke), brush controls, and
// readouts for the analyzer (getImageData) and submission (toDataURL).

export const CANVAS_SIZE = 512;

// The cream page color. Shown behind a transparent backing store while drawing,
// and composited under the strokes at export time so the PNG is self-framed.
const PAPER_COLOR = '#fdf3df';

export type BrushMode = 'draw' | 'erase';

// Special pen effects unlocked via Mystery Ink capsules. 'solid' is the normal
// single-color pen; 'rainbow' cycles hue along the stroke; 'midnight' is a
// near-black ink with tiny white specks flecked over the line.
export type PenEffect = 'solid' | 'rainbow' | 'midnight';

export type DrawCanvasOptions = {
  // Called after every completed stroke (pointer-up) so the scene can re-run the
  // live analyzer and animate the stat preview.
  onStrokeEnd: () => void;
};

export class DrawCanvas {
  readonly element: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onStrokeEnd: () => void;

  private color = '#2b2016';
  private brushSize = 22;
  private mode: BrushMode = 'draw';

  // Active pen effect + its palette. Rainbow advances a hue as the stroke moves;
  // midnight flecks white specks over a near-black base.
  private penEffect: PenEffect = 'solid';
  private penColors: string[] = ['#2b2016'];
  private huePhase = 0; // 0..1, advances along a rainbow stroke

  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  // Undo stack of ImageData snapshots taken BEFORE each stroke starts.
  private history: ImageData[] = [];
  private readonly maxHistory = 24;

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
  setPen(effect: PenEffect, colors: string[]): void {
    this.mode = 'draw';
    this.penEffect = effect;
    this.penColors = colors.length > 0 ? colors : ['#2b2016'];
    this.color = this.penColors[0] ?? '#2b2016';
  }

  setBrushSize(size: number): void {
    this.brushSize = size;
  }

  setEraser(): void {
    this.mode = 'erase';
  }

  isErasing(): boolean {
    return this.mode === 'erase';
  }

  clear(): void {
    this.pushHistory();
    this.paintPaper();
    this.onStrokeEnd();
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.ctx.putImageData(previous, 0, 0);
    this.onStrokeEnd();
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // PNG data URL for submission: composite the strokes over cream paper on a
  // throwaway canvas so the exported image is self-framed (opaque cream page).
  // An optional `bake` callback runs after the strokes are drawn but before the
  // export, receiving the 512x512 context so attached accessories can be welded
  // permanently into the PNG (the server never sees a separate sticker layer).
  toDataUrl(bake?: (ctx: CanvasRenderingContext2D) => void): string {
    const out = document.createElement('canvas');
    out.width = CANVAS_SIZE;
    out.height = CANVAS_SIZE;
    const context = out.getContext('2d');
    if (!context) return this.element.toDataURL('image/png');
    context.fillStyle = PAPER_COLOR;
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.drawImage(this.element, 0, 0);
    if (bake) bake(context);
    return out.toDataURL('image/png');
  }

  // --- Internals ------------------------------------------------------------

  // Reset the backing store to a fully transparent (empty) page.
  private paintPaper(): void {
    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  private pushHistory(): void {
    this.history.push(this.getImageData());
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  private attachPointerHandlers(): void {
    const canvas = this.element;
    canvas.addEventListener('pointerdown', (event) => this.startStroke(event));
    canvas.addEventListener('pointermove', (event) => this.moveStroke(event));
    canvas.addEventListener('pointerup', () => this.endStroke());
    canvas.addEventListener('pointerleave', () => this.endStroke());
    canvas.addEventListener('pointercancel', () => this.endStroke());
  }

  // Translate a client pointer position into 512x512 backing-store coordinates.
  private toCanvasCoords(event: PointerEvent): { x: number; y: number } {
    const bounds = this.element.getBoundingClientRect();
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
    this.huePhase = 0;
    const { x, y } = this.toCanvasCoords(event);
    this.lastX = x;
    this.lastY = y;
    // A dot so single taps register as a mark.
    this.applyBrush();
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.mode === 'erase' ? 'rgba(0,0,0,1)' : this.currentStrokeColor();
    this.ctx.fill();
    if (this.mode !== 'erase') this.flingSpecks(x, y);
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
    this.applyBrush();
    // Rainbow advances its hue as the stroke travels, so the color is set per
    // segment; solid/midnight keep a stable base color.
    if (this.mode !== 'erase') {
      this.huePhase = (this.huePhase + 0.02) % 1;
      this.ctx.strokeStyle = this.currentStrokeColor();
    }
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    if (this.mode !== 'erase') this.flingSpecks(x, y);
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

  // Midnight ink: fleck a few tiny white specks around the brush point so the
  // near-black stroke reads as a starry night ink. No-op for other pens.
  private flingSpecks(x: number, y: number): void {
    if (this.penEffect !== 'midnight') return;
    const count = 2;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let index = 0; index < count; index += 1) {
      const radius = this.brushSize * 0.5 * Math.random();
      const angle = Math.random() * Math.PI * 2;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 0.8 + Math.random() * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private endStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.onStrokeEnd();
  }

  private applyBrush(): void {
    this.ctx.lineWidth = this.brushSize;
    if (this.mode === 'erase') {
      // Erase to transparency so the analyzer stops counting those pixels.
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.currentStrokeColor();
    }
  }
}
