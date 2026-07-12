// HTML overlay manager for the Draw scene. Phaser's canvas is great for the
// game, but freehand drawing and text input are smoother with native DOM
// elements, and native <input> gives the mobile keyboard for free.
//
// We overlay absolutely-positioned HTML elements on top of the Phaser canvas and
// keep them aligned to design-space (720x1280) coordinates. The Phaser canvas is
// letterboxed by Scale.FIT, so we read its on-screen bounding rect and convert
// design coordinates → screen pixels, re-syncing on resize.

import { Scene } from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FONT_STACK, UI } from './theme';

export type OverlayRect = {
  x: number; // design-space top-left
  y: number;
  width: number; // design-space size
  height: number;
};

type OverlayPlacement = {
  element: HTMLElement;
  rect: OverlayRect;
  followCamera: boolean;
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
  private readonly placements: OverlayPlacement[] = [];
  private readonly canvasObserver: ResizeObserver | null;
  private cameraSyncing = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = document.createElement('div');
    this.root.className = DomOverlay.ROOT_CLASS;
    this.root.style.position = 'absolute';
    this.root.style.left = '0';
    this.root.style.top = '0';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = '20';
    this.root.style.fontFamily = FONT_STACK;
    document.body.appendChild(this.root);
    this.canvasObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.sync());
    this.canvasObserver?.observe(scene.game.canvas);
  }

  // Register a DOM element to be positioned at a design-space rectangle.
  place(element: HTMLElement, rect: OverlayRect, followCamera = false): void {
    element.style.position = 'absolute';
    if (!element.style.pointerEvents) element.style.pointerEvents = 'auto';
    element.style.boxSizing = 'border-box';
    this.root.appendChild(element);
    const placement: OverlayPlacement = { element, rect, followCamera };
    this.placements.push(placement);
    if (followCamera && !this.cameraSyncing) {
      this.cameraSyncing = true;
      this.scene.events.on('postupdate', this.sync, this);
    }
    this.syncOne(placement);
  }

  // Re-align all placements to the current canvas position/scale.
  sync(): void {
    for (const placement of this.placements) this.syncOne(placement);
  }

  private syncOne(placement: OverlayPlacement): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = bounds.width / DESIGN_WIDTH;
    const scaleY = bounds.height / DESIGN_HEIGHT;
    const { element, followCamera, rect } = placement;
    const rectX = followCamera ? rect.x - this.scene.cameras.main.scrollX : rect.x;
    const rectY = followCamera ? rect.y - this.scene.cameras.main.scrollY : rect.y;
    element.style.left = `${bounds.left + rectX * scaleX}px`;
    element.style.top = `${bounds.top + rectY * scaleY}px`;
    // Keep every overlay element in the same 720x1280 design space as Phaser,
    // then scale the complete element. Scaling only its box left CSS text,
    // borders and padding at raw screen pixels, which made the HTML controls
    // look as if they belonged to a different app on narrow phones.
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.transformOrigin = 'top left';
    element.style.transform = `scale(${scaleX}, ${scaleY})`;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }

  setRootAttributes(attributes: Readonly<Record<string, string>>): void {
    Object.entries(attributes).forEach(([name, value]) => {
      this.root.setAttribute(name, value);
    });
  }

  destroy(): void {
    if (this.cameraSyncing) {
      this.scene.events.off('postupdate', this.sync, this);
      this.cameraSyncing = false;
    }
    this.canvasObserver?.disconnect();
    this.root.remove();
    this.placements.length = 0;
  }
}

export type CanvasActionOverlayInput = Readonly<{
  label: string;
  rect: OverlayRect;
  attributes?: Readonly<Record<string, string>>;
  followCamera?: boolean;
  pointerPassthrough?: boolean;
  enabled?: boolean;
  onKeyDown?: (event: KeyboardEvent) => void;
  onActivate: () => void;
}>;

/** Mirrors a canvas action with a native focusable control in the same bounds. */
export class CanvasActionOverlay {
  private readonly scene: Scene;
  private readonly overlay: DomOverlay;
  private destroyed = false;
  private readonly handleSceneShutdown = (): void => this.destroy();

  constructor(scene: Scene) {
    this.scene = scene;
    this.overlay = new DomOverlay(scene);
    scene.events.once('shutdown', this.handleSceneShutdown);
  }

  add(input: CanvasActionOverlayInput): HTMLButtonElement {
    const nativeButton = document.createElement('button');
    nativeButton.type = 'button';
    nativeButton.textContent = input.label;
    nativeButton.setAttribute('aria-label', input.label);
    Object.entries(input.attributes ?? {}).forEach(([name, value]) => {
      nativeButton.setAttribute(name, value);
    });
    nativeButton.disabled = input.enabled === false;
    Object.assign(nativeButton.style, {
      appearance: 'none',
      background: 'transparent',
      border: '0',
      borderRadius: '8px',
      color: 'transparent',
      cursor: nativeButton.disabled ? 'default' : 'pointer',
      fontSize: '1px',
      opacity: '0',
      outline: 'none',
      padding: '0',
      pointerEvents: input.pointerPassthrough ? 'none' : 'auto',
    });
    const focusRing = document.createElement('div');
    focusRing.setAttribute('aria-hidden', 'true');
    focusRing.setAttribute('role', 'presentation');
    Object.assign(focusRing.style, {
      background: 'transparent',
      border: '0',
      borderRadius: '8px',
      boxShadow: `inset 0 0 0 4px ${UI.coralText}`,
      opacity: '0',
      pointerEvents: 'none',
    });
    nativeButton.addEventListener('focus', () => {
      focusRing.style.opacity = '1';
    });
    nativeButton.addEventListener('blur', () => {
      focusRing.style.opacity = '0';
    });
    nativeButton.addEventListener('keydown', (event) => {
      input.onKeyDown?.(event);
      if (event.defaultPrevented) return;
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
    this.overlay.place(nativeButton, input.rect, input.followCamera);
    this.overlay.place(focusRing, input.rect, input.followCamera);
    return nativeButton;
  }

  setVisible(visible: boolean): void {
    if (!this.destroyed) this.overlay.setVisible(visible);
  }

  setRootAttributes(attributes: Readonly<Record<string, string>>): void {
    if (!this.destroyed) this.overlay.setRootAttributes(attributes);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('shutdown', this.handleSceneShutdown);
    this.overlay.destroy();
  }
}
