// HTML overlay manager for the Draw scene. Phaser's canvas is great for the
// game, but freehand drawing and text input are smoother with native DOM
// elements, and native <input> gives the mobile keyboard for free.
//
// We overlay absolutely-positioned HTML elements on top of the Phaser canvas and
// keep them aligned to design-space (720x1280) coordinates. The Phaser canvas is
// letterboxed by Scale.FIT, so we read its on-screen bounding rect and convert
// design coordinates → screen pixels, re-syncing on resize.

import { Scene } from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './theme';

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
    this.root.remove();
    this.placements.length = 0;
  }
}
