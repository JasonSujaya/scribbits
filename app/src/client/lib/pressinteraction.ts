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
  if (callbacks.pressOnHover ?? true) {
    target.on('pointerover', hover);
  }
  target.on('pointerout', cancel);
  target.on('pointerdown', press);
  target.on('pointerup', activate);
  target.on('pointerupoutside', cancel);

  lifecycle.gameTarget?.on('gameout', cancel);
  const destroy = (): void => {
    if (destroyed) return;
    cancel();
    destroyed = true;
    lifecycle.gameTarget?.off?.('gameout', cancel);
    lifecycle.shutdownTarget?.off?.('shutdown', destroy);
  };
  lifecycle.shutdownTarget?.once?.('shutdown', destroy);
  return { cancel: () => cancel(), destroy };
}
