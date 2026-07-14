// HTML overlay manager for the Draw scene. Phaser's canvas is great for the
// game, but freehand drawing and text input are smoother with native DOM
// elements, and native <input> gives the mobile keyboard for free.
//
// We overlay absolutely-positioned HTML elements on top of the Phaser canvas and
// keep them aligned to Phaser design-space coordinates. The width is always 720,
// while the boot-time height can grow for tall phones. We read the canvas bounds
// and current game size, then convert design coordinates → screen pixels.

import type { Scene } from 'phaser';
import { FONT_STACK, UI } from './theme';

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

export type OverlayOrderAnchor = Readonly<{
  rootForOrdering: () => HTMLElement;
}>;

let canvasFocusUsesKeyboard = false;
let canvasFocusModalityTrackingInstalled = false;

function installCanvasFocusModalityTracking(): void {
  if (canvasFocusModalityTrackingInstalled) return;
  canvasFocusModalityTrackingInstalled = true;
  document.addEventListener(
    'keydown',
    (event) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        canvasFocusUsesKeyboard = true;
      }
    },
    true
  );
  document.addEventListener(
    'pointerdown',
    () => {
      canvasFocusUsesKeyboard = false;
    },
    true
  );
}

// Manages a set of DOM elements positioned in design-space over the Phaser
// canvas. Call sync() on resize; call destroy() on scene shutdown.
export class DomOverlay {
  // All roots share a marker class so orphans can be swept if a scene ever
  // tears down without running its cleanup (defensive — should not happen).
  private static readonly ROOT_CLASS = 'scribbits-dom-overlay';
  private static readonly liveOverlays = new Set<DomOverlay>();

  // Remove any overlay roots left in the DOM. Safe to call before creating one.
  static destroyAll(): void {
    for (const overlay of [...DomOverlay.liveOverlays]) overlay.destroy();
    document
      .querySelectorAll(`.${DomOverlay.ROOT_CLASS}`)
      .forEach((el) => el.remove());
  }

  static destroyDialogs(): void {
    for (const overlay of [...DomOverlay.liveOverlays]) {
      if (overlay.root.getAttribute('role') === 'dialog') overlay.destroy();
    }
    document
      .querySelectorAll(`.${DomOverlay.ROOT_CLASS}[role="dialog"]`)
      .forEach((element) => element.remove());
  }

  private readonly scene: Scene;
  private readonly root: HTMLDivElement;
  private readonly placements: OverlayPlacement[] = [];
  private readonly canvasObserver: ResizeObserver | null;
  private cameraSyncing = false;
  private destroyed = false;

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
    DomOverlay.liveOverlays.add(this);
    this.canvasObserver =
      typeof ResizeObserver === 'undefined'
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
    const scaleX = bounds.width / this.scene.scale.width;
    const scaleY = bounds.height / this.scene.scale.height;
    const { element, followCamera, rect } = placement;
    const rectX = followCamera
      ? rect.x - this.scene.cameras.main.scrollX
      : rect.x;
    const rectY = followCamera
      ? rect.y - this.scene.cameras.main.scrollY
      : rect.y;
    element.style.left = `${bounds.left + rectX * scaleX}px`;
    element.style.top = `${bounds.top + rectY * scaleY}px`;
    // Keep every overlay element in the same current design space as Phaser,
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

  rootForOrdering(): HTMLElement {
    return this.root;
  }

  moveAfter(anchor: OverlayOrderAnchor): void {
    anchor.rootForOrdering().after(this.root);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    DomOverlay.liveOverlays.delete(this);
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
  private static readonly pendingFocusLabels = new WeakMap<
    Scene,
    Map<string, string>
  >();
  private readonly scene: Scene;
  private readonly overlay: DomOverlay;
  private destroyed = false;
  private readonly handleSceneShutdown = (): void => this.destroy();

  constructor(
    scene: Scene,
    private readonly focusScope: string | null = null
  ) {
    installCanvasFocusModalityTracking();
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
      focusRing.style.opacity = canvasFocusUsesKeyboard ? '1' : '0';
      this.clearPendingFocusLabel();
    });
    nativeButton.addEventListener('blur', () => {
      focusRing.style.opacity = '0';
    });
    const activate = (): void => {
      if (this.focusScope) {
        const sceneLabels =
          CanvasActionOverlay.pendingFocusLabels.get(this.scene) ?? new Map();
        sceneLabels.set(this.focusScope, input.label);
        CanvasActionOverlay.pendingFocusLabels.set(this.scene, sceneLabels);
      }
      input.onActivate();
    };
    nativeButton.addEventListener('keydown', (event) => {
      input.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) {
        return;
      }
      // Prevent the browser's follow-up synthetic click so keyboard input and
      // pointer input each activate the action exactly once.
      event.preventDefault();
      activate();
    });
    nativeButton.addEventListener('click', activate);
    this.overlay.place(nativeButton, input.rect, input.followCamera);
    this.overlay.place(focusRing, input.rect, input.followCamera);
    return nativeButton;
  }

  placeElement(
    element: HTMLElement,
    rect: OverlayRect,
    followCamera = false
  ): HTMLElement {
    this.overlay.place(element, rect, followCamera);
    return element;
  }

  focusedControlLabel(): string | null {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLButtonElement)) return null;
    if (!this.overlay.rootForOrdering().contains(activeElement)) return null;
    return activeElement.getAttribute('aria-label');
  }

  pendingFocusLabel(): string | null {
    if (!this.focusScope) return null;
    return (
      CanvasActionOverlay.pendingFocusLabels
        .get(this.scene)
        ?.get(this.focusScope) ?? null
    );
  }

  clearPendingFocusLabel(): void {
    if (!this.focusScope) return;
    const sceneLabels = CanvasActionOverlay.pendingFocusLabels.get(this.scene);
    sceneLabels?.delete(this.focusScope);
    if (sceneLabels?.size === 0) {
      CanvasActionOverlay.pendingFocusLabels.delete(this.scene);
    }
  }

  restoreControlFocus(accessibleLabel: string): boolean {
    const controls = [
      ...this.overlay.rootForOrdering().querySelectorAll('button'),
    ].filter(
      (control): control is HTMLButtonElement =>
        control instanceof HTMLButtonElement && !control.disabled
    );
    const exactControl = controls.find(
      (control) => control.getAttribute('aria-label') === accessibleLabel
    );
    const fallbackControl = /\b(?:page|older|newer)\b/i.test(accessibleLabel)
      ? controls.find((control) =>
          /\b(?:page|older|newer)\b/i.test(
            control.getAttribute('aria-label') ?? ''
          )
        )
      : undefined;
    const control = exactControl ?? fallbackControl;
    control?.focus();
    if (control && this.focusScope) {
      this.clearPendingFocusLabel();
    }
    return control !== undefined;
  }

  addDescription(id: string, description: string): HTMLElement {
    const semanticDescription = document.createElement('p');
    semanticDescription.id = id;
    semanticDescription.textContent = description;
    Object.assign(semanticDescription.style, {
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '0',
      opacity: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      width: '1px',
    });
    this.overlay.place(semanticDescription, {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    return semanticDescription;
  }

  addStatus(initialMessage = ''): HTMLElement {
    const status = this.addDescription('', initialMessage);
    status.removeAttribute('id');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    return status;
  }

  setVisible(visible: boolean): void {
    if (!this.destroyed) this.overlay.setVisible(visible);
  }

  setRootAttributes(attributes: Readonly<Record<string, string>>): void {
    if (!this.destroyed) this.overlay.setRootAttributes(attributes);
  }

  rootForOrdering(): HTMLElement {
    return this.overlay.rootForOrdering();
  }

  moveAfter(anchor: OverlayOrderAnchor): void {
    this.overlay.moveAfter(anchor);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('shutdown', this.handleSceneShutdown);
    this.overlay.destroy();
  }
}

type BackgroundOverlayState = Readonly<{
  root: HTMLElement;
  ariaHidden: string | null;
  hadInertAttribute: boolean;
}>;

/**
 * Native keyboard layer for a canvas modal.
 *
 * It temporarily removes every existing canvas overlay (including the app
 * dock) from the accessibility tree, traps focus inside the modal actions,
 * handles Escape, and restores focus to the control that opened the modal.
 */
export class CanvasModalOverlay {
  private static nextDescriptionId = 1;
  private static readonly activeStack: CanvasModalOverlay[] = [];
  private readonly scene: Scene;
  private readonly actionOverlay: CanvasActionOverlay;
  private readonly backgroundOverlays: BackgroundOverlayState[];
  private readonly controls: HTMLElement[] = [];
  private readonly trigger: HTMLElement | null;
  private destroyed = false;
  private readonly handleSceneShutdown = (): void => this.destroy();

  static destroyAll(): void {
    for (const modal of [...CanvasModalOverlay.activeStack].reverse()) {
      modal.destroy();
    }
    DomOverlay.destroyDialogs();
  }

  constructor(
    scene: Scene,
    label: string,
    private readonly onDismiss: () => void,
    description?: string,
    trigger?: HTMLElement | null
  ) {
    this.scene = scene;
    this.trigger =
      trigger === undefined
        ? document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
        : trigger;
    this.backgroundOverlays = Array.from(
      document.querySelectorAll<HTMLElement>('.scribbits-dom-overlay')
    ).map((root) => ({
      root,
      ariaHidden: root.getAttribute('aria-hidden'),
      hadInertAttribute: root.hasAttribute('inert'),
    }));
    this.backgroundOverlays.forEach(({ root }) => {
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
    });

    this.actionOverlay = new CanvasActionOverlay(scene);
    const rootAttributes: Record<string, string> = {
      role: 'dialog',
      'aria-label': label,
      'aria-modal': 'true',
    };
    if (description) {
      const descriptionId = `scribbits-modal-description-${CanvasModalOverlay.nextDescriptionId}`;
      CanvasModalOverlay.nextDescriptionId += 1;
      this.actionOverlay.addDescription(descriptionId, description);
      rootAttributes['aria-describedby'] = descriptionId;
    }
    this.actionOverlay.setRootAttributes(rootAttributes);
    CanvasModalOverlay.activeStack.push(this);
    document.addEventListener('keydown', this.handleDocumentKeyDown, true);
    scene.events.once('shutdown', this.handleSceneShutdown);
  }

  add(input: CanvasActionOverlayInput): HTMLButtonElement {
    const control = this.actionOverlay.add(input);
    this.controls.push(control);
    return control;
  }

  placeElement(
    element: HTMLElement,
    rect: OverlayRect,
    options: Readonly<{ focusable?: boolean; followCamera?: boolean }> = {}
  ): HTMLElement {
    this.actionOverlay.placeElement(
      element,
      rect,
      options.followCamera ?? false
    );
    if (options.focusable) this.controls.push(element);
    return element;
  }

  addStatus(initialMessage = ''): HTMLElement {
    return this.actionOverlay.addStatus(initialMessage);
  }

  focusInitial(control = this.controls[0]): void {
    requestAnimationFrame(() => {
      if (
        !this.destroyed &&
        control?.isConnected &&
        !control.hidden &&
        !control.matches(':disabled')
      ) {
        control.focus();
      }
    });
  }

  setVisible(visible: boolean): void {
    this.actionOverlay.setVisible(visible);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const stackIndex = CanvasModalOverlay.activeStack.lastIndexOf(this);
    if (stackIndex >= 0) CanvasModalOverlay.activeStack.splice(stackIndex, 1);
    this.scene.events.off('shutdown', this.handleSceneShutdown);
    document.removeEventListener('keydown', this.handleDocumentKeyDown, true);
    const modalRoot = this.actionOverlay.rootForOrdering();
    this.actionOverlay.destroy();
    // A modal can close from the same native button event that immediately
    // rebuilds its Phaser scene. Remove the root defensively so that rapid
    // rebuild cannot leave an invisible, focusable dialog in the document.
    modalRoot.remove();
    this.backgroundOverlays.forEach(
      ({ root, ariaHidden, hadInertAttribute }) => {
        if (!root.isConnected) return;
        if (!hadInertAttribute) root.removeAttribute('inert');
        if (ariaHidden === null) root.removeAttribute('aria-hidden');
        else root.setAttribute('aria-hidden', ariaHidden);
      }
    );
    if (this.trigger?.isConnected) this.trigger.focus();
  }

  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (this.destroyed) return;
    if (CanvasModalOverlay.activeStack.at(-1) !== this) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.onDismiss();
      return;
    }
    if (event.key !== 'Tab') return;

    const availableControls = this.controls.filter(
      (control) =>
        control.isConnected &&
        !control.hidden &&
        !control.matches(':disabled') &&
        control.getAttribute('aria-disabled') !== 'true'
    );
    if (availableControls.length === 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const activeIndex = availableControls.indexOf(
      document.activeElement as HTMLElement
    );
    const nextIndex = event.shiftKey
      ? activeIndex <= 0
        ? availableControls.length - 1
        : activeIndex - 1
      : activeIndex < 0 || activeIndex === availableControls.length - 1
        ? 0
        : activeIndex + 1;
    event.preventDefault();
    event.stopImmediatePropagation();
    availableControls[nextIndex]?.focus();
  };
}
