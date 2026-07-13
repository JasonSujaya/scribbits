export type PressEventTarget = Readonly<{
  on: (event: string, listener: (pointer?: PressPointer) => void) => unknown;
  once?: (event: string, listener: () => void) => unknown;
  off?: (event: string, listener: (pointer?: PressPointer) => void) => unknown;
}>;

export type PressPointer = Readonly<{ id?: number }>;

export type PressInteractionCallbacks = Readonly<{
  press: () => void;
  release: () => void;
  activate: () => void;
  pressOnHover?: boolean;
}>;

export type PressInteractionLifecycle = Readonly<{
  gameTarget?: PressEventTarget;
  shutdownTarget?: PressEventTarget;
}>;

export type PressInteractionBinding = Readonly<{
  cancel: () => void;
  destroy: () => void;
}>;

/** Dependency-free event ordering for paper buttons and cards. */
export function bindPressInteractionEvents(
  target: PressEventTarget,
  callbacks: PressInteractionCallbacks,
  lifecycle: PressInteractionLifecycle = {}
): PressInteractionBinding {
  let armedPointerId: number | null = null;
  let visuallyPressed = false;
  let destroyed = false;
  const pointerId = (pointer?: PressPointer): number => pointer?.id ?? 0;
  const showPressed = (): void => {
    if (visuallyPressed) return;
    visuallyPressed = true;
    callbacks.press();
  };
  const press = (pointer?: PressPointer): void => {
    if (destroyed || armedPointerId !== null) return;
    armedPointerId = pointerId(pointer);
    showPressed();
  };
  const release = (): void => {
    armedPointerId = null;
    if (!visuallyPressed) return;
    visuallyPressed = false;
    callbacks.release();
  };
  const cancel = (pointer?: PressPointer): void => {
    if (destroyed) return;
    if (
      pointer !== undefined &&
      armedPointerId !== null &&
      pointerId(pointer) !== armedPointerId
    ) {
      return;
    }
    release();
  };
  const activate = (pointer?: PressPointer): void => {
    if (
      destroyed ||
      armedPointerId === null ||
      pointerId(pointer) !== armedPointerId
    ) {
      return;
    }
    release();
    callbacks.activate();
  };
  const hover = (): void => {
    if (!destroyed && armedPointerId === null) showPressed();
  };
  const destroyInternal = (restoreVisualState: boolean): void => {
    if (destroyed) return;
    if (restoreVisualState) release();
    else {
      armedPointerId = null;
      visuallyPressed = false;
    }
    destroyed = true;
    if (callbacks.pressOnHover ?? true) {
      target.off?.('pointerover', hover);
    }
    target.off?.('pointerout', cancel);
    target.off?.('pointerdown', press);
    target.off?.('pointerup', activate);
    target.off?.('pointerupoutside', cancel);
    target.off?.('destroy', destroyFromLifecycle);
    lifecycle.gameTarget?.off?.('gameout', cancel);
    lifecycle.shutdownTarget?.off?.('shutdown', destroyFromLifecycle);
  };
  const destroy = (): void => destroyInternal(true);
  const destroyFromLifecycle = (): void => destroyInternal(false);

  if (callbacks.pressOnHover ?? true) {
    target.on('pointerover', hover);
  }
  target.on('pointerout', cancel);
  target.on('pointerdown', press);
  target.on('pointerup', activate);
  target.on('pointerupoutside', cancel);
  target.once?.('destroy', destroyFromLifecycle);
  lifecycle.gameTarget?.on('gameout', cancel);
  lifecycle.shutdownTarget?.once?.('shutdown', destroyFromLifecycle);
  return { cancel: () => cancel(), destroy };
}
