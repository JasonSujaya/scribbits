// HTML overlay manager for the Draw scene. Phaser's canvas is great for the
// game, but freehand drawing and text input are smoother with native DOM
// elements, and native <input> gives the mobile keyboard for free.
//
// We overlay absolutely-positioned HTML elements on top of the Phaser canvas and
// keep them aligned to design-space (720x1280) coordinates. The Phaser canvas is
// letterboxed by Scale.FIT, so we read its on-screen bounding rect and convert
// design coordinates → screen pixels, re-syncing on resize.

import { Scene } from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from './theme';

export type OverlayRect = {
  x: number; // design-space top-left
  y: number;
  width: number; // design-space size
  height: number;
};

type Placement = {
  element: HTMLElement;
  rect: OverlayRect;
};

// Manages a set of DOM elements positioned in design-space over the Phaser
// canvas. Call sync() on resize; call destroy() on scene shutdown.
export class DomOverlay {
  // All roots share a marker class so orphans can be swept if a scene ever
  // tears down without running its cleanup (defensive — should not happen).
  private static readonly ROOT_CLASS = 'scribbits-dom-overlay';

  // Remove any overlay roots left in the DOM. Safe to call before creating one.
  static destroyAll(): void {
    document.querySelectorAll(`.${DomOverlay.ROOT_CLASS}`).forEach((el) => el.remove());
  }

  private readonly scene: Scene;
  private readonly root: HTMLDivElement;
  private readonly placements: Placement[] = [];
  private readonly canvasObserver: ResizeObserver | null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = document.createElement('div');
    this.root.className = DomOverlay.ROOT_CLASS;
    this.root.style.position = 'absolute';
    this.root.style.left = '0';
    this.root.style.top = '0';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = '20';
    document.body.appendChild(this.root);
    this.canvasObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.sync());
    this.canvasObserver?.observe(scene.game.canvas);
  }

  // Register a DOM element to be positioned at a design-space rectangle.
  place(element: HTMLElement, rect: OverlayRect): void {
    element.style.position = 'absolute';
    element.style.pointerEvents = 'auto';
    element.style.boxSizing = 'border-box';
    this.root.appendChild(element);
    this.placements.push({ element, rect });
    this.syncOne({ element, rect });
  }

  // Re-align all placements to the current canvas position/scale.
  sync(): void {
    for (const placement of this.placements) this.syncOne(placement);
  }

  private syncOne(placement: Placement): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = bounds.width / DESIGN_WIDTH;
    const scaleY = bounds.height / DESIGN_HEIGHT;
    const { element, rect } = placement;
    element.style.left = `${bounds.left + rect.x * scaleX}px`;
    element.style.top = `${bounds.top + rect.y * scaleY}px`;
    element.style.width = `${rect.width * scaleX}px`;
    element.style.height = `${rect.height * scaleY}px`;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }

  destroy(): void {
    this.canvasObserver?.disconnect();
    this.root.remove();
    this.placements.length = 0;
  }
}

export type CanvasActionOverlayInput = Readonly<{
  label: string;
  rect: OverlayRect;
  enabled?: boolean;
  onActivate: () => void;
}>;

/** Mirrors a canvas action with a native focusable control in the same bounds. */
export class CanvasActionOverlay {
  private readonly overlay: DomOverlay;
  private destroyed = false;

  constructor(scene: Scene) {
    this.overlay = new DomOverlay(scene);
    scene.events.once('shutdown', () => this.destroy());
  }

  add(input: CanvasActionOverlayInput): HTMLButtonElement {
    const nativeButton = document.createElement('button');
    nativeButton.type = 'button';
    nativeButton.textContent = input.label;
    nativeButton.setAttribute('aria-label', input.label);
    nativeButton.disabled = input.enabled === false;
    Object.assign(nativeButton.style, {
      appearance: 'none',
      background: 'transparent',
      border: '0',
      borderRadius: '8px',
      color: 'transparent',
      cursor: nativeButton.disabled ? 'default' : 'pointer',
      fontSize: '1px',
      outline: 'none',
      padding: '0',
    });
    nativeButton.addEventListener('focus', () => {
      nativeButton.style.outline = `4px solid ${UI.coralText}`;
      nativeButton.style.outlineOffset = '-4px';
    });
    nativeButton.addEventListener('blur', () => {
      nativeButton.style.outline = 'none';
    });
    nativeButton.addEventListener('keydown', (event) => {
      if (
        (event.key !== 'Enter' && event.key !== ' ') ||
        event.repeat
      ) {
        return;
      }
      // Prevent the browser's follow-up synthetic click so keyboard input and
      // pointer input each activate the action exactly once.
      event.preventDefault();
      input.onActivate();
    });
    nativeButton.addEventListener('click', input.onActivate);
    this.overlay.place(nativeButton, input.rect);
    return nativeButton;
  }

  setVisible(visible: boolean): void {
    if (!this.destroyed) this.overlay.setVisible(visible);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.overlay.destroy();
  }
}
