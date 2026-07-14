import { Scene } from 'phaser';
import { fitDrawing } from './scribbits';
import {
  createStickerModalShell,
  type StickerModalShell,
} from './stickermodalshell';
import { DOM_TYPE, prefersReducedMotion, TYPE, UI } from './theme';
import { button, ghostButton, label } from './ui';

const MODAL_DEPTH = 2_500;
const CARD_WIDTH = 620;
const CARD_HEIGHT = 920;
const CARD_CENTER_Y = 640;
const CLOSE_TARGET_SIZE = 100;
const PREVIEW_SIZE = 360;
const INPUT_RECT = { x: 100, y: 730, width: 520, height: 88 } as const;
const CONFIRM_RECT = { x: 100, y: 900, width: 520, height: 100 } as const;
const OPENING_DURATION_MILLISECONDS = 220;

let nextPreviewTextureId = 1;

export type DrawConfirmationModal = Readonly<{
  destroy: () => void;
}>;

export type DrawConfirmationModalOptions = Readonly<{
  mode?: 'scribbit' | 'free-draw';
  previewDataUrl: string;
  initialName: string;
  trigger?: HTMLElement | null;
  description?: string;
  closeLabel?: string;
  onNameChange: (name: string) => void;
  onConfirm: (name: string) => void;
  onClose: (name: string) => void;
}>;

export function openDrawConfirmationModal(
  scene: Scene,
  options: DrawConfirmationModalOptions
): DrawConfirmationModal {
  const { width } = scene.scale;
  const isFreeDraw = options.mode === 'free-draw';
  const title = isFreeDraw ? 'Name your Free Draw' : 'Name your Scribbit';
  const confirmLabel = isFreeDraw ? 'SAVE DRAWING' : 'BRING TO LIFE';
  const confirmAccessibleLabel = isFreeDraw
    ? 'Save Free Draw'
    : 'Bring Scribbit to life';
  const cardCenterX = width / 2;
  const shouldMoveKeyboardFocus =
    document.activeElement instanceof HTMLButtonElement;
  let previewTextureLoaded = false;
  const previewTextureKey = `draw-confirmation-${nextPreviewTextureId}`;
  nextPreviewTextureId += 1;

  const currentName = (): string => nameInput.value.replace(/\s+/g, ' ').trim();

  const close = (): void => {
    const name = nameInput.value;
    shell.finish(() => options.onClose(name));
  };

  const shell: StickerModalShell = createStickerModalShell({
    scene,
    title,
    description:
      options.description ??
      'Preview your drawing, name it, then bring it to life.',
    onRequestClose: close,
    trigger: options.trigger,
    depth: MODAL_DEPTH,
    cardCenterY: CARD_CENTER_Y,
    cardWidth: CARD_WIDTH,
    cardHeight: CARD_HEIGHT,
    shadeAlpha: 0.68,
    tapeWidth: 90,
    openingDurationMilliseconds: prefersReducedMotion()
      ? 1
      : OPENING_DURATION_MILLISECONDS,
    blockCard: true,
    onDestroy: () => {
      if (previewTextureLoaded && scene.textures.exists(previewTextureKey)) {
        scene.textures.remove(previewTextureKey);
      }
    },
  });
  const { actions: modalActions, card, shade } = shell;

  card.add(
    label(scene, 0, -390, title.toUpperCase(), TYPE.title, UI.ink, true)
  );

  const closeX = CARD_WIDTH / 2 - CLOSE_TARGET_SIZE / 2 - 8;
  const closeY = -CARD_HEIGHT / 2 + CLOSE_TARGET_SIZE / 2 + 8;
  card.add(
    ghostButton(
      scene,
      closeX,
      closeY,
      '×',
      close,
      CLOSE_TARGET_SIZE,
      CLOSE_TARGET_SIZE
    )
  );
  modalActions.add({
    label: options.closeLabel ?? 'Close and keep drawing',
    rect: {
      x: cardCenterX + closeX - CLOSE_TARGET_SIZE / 2,
      y: CARD_CENTER_Y + closeY - CLOSE_TARGET_SIZE / 2,
      width: CLOSE_TARGET_SIZE,
      height: CLOSE_TARGET_SIZE,
    },
    onActivate: close,
  });

  const previewFrame = scene.add.graphics();
  previewFrame.fillStyle(UI.creamHex, 1);
  previewFrame.fillRoundedRect(
    -PREVIEW_SIZE / 2,
    -320,
    PREVIEW_SIZE,
    PREVIEW_SIZE,
    18
  );
  previewFrame.lineStyle(4, UI.inkHex, 1);
  previewFrame.strokeRoundedRect(
    -PREVIEW_SIZE / 2,
    -320,
    PREVIEW_SIZE,
    PREVIEW_SIZE,
    18
  );
  card.add(previewFrame);

  const previewSource = new Image();
  previewSource.onload = () => {
    if (shell.isDestroyed() || !scene.scene.isActive() || !card.active) return;
    scene.textures.addImage(previewTextureKey, previewSource);
    previewTextureLoaded = true;
    const preview = fitDrawing(
      scene.add.image(0, -140, previewTextureKey),
      PREVIEW_SIZE - 20
    );
    card.add(preview);
  };
  previewSource.onerror = () => {
    if (shell.isDestroyed() || !card.active) return;
    card.add(
      label(scene, 0, -140, 'PREVIEW UNAVAILABLE', TYPE.body, UI.inkSoft, true)
    );
  };
  previewSource.src = options.previewDataUrl;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'scribbits-name-input';
  nameInput.maxLength = 24;
  nameInput.value = options.initialName;
  nameInput.placeholder = isFreeDraw
    ? 'Name your drawing…'
    : 'Name your scribbit…';
  nameInput.autocomplete = 'off';
  nameInput.autocapitalize = 'words';
  nameInput.enterKeyHint = 'done';
  nameInput.setAttribute('aria-label', title);
  Object.assign(nameInput.style, {
    ...DOM_TYPE.title,
    textAlign: 'center',
    color: UI.ink,
    background: UI.cream,
    border: `4px solid ${UI.ink}`,
    borderRadius: '14px',
    outline: 'none',
    padding: '0 18px',
  });
  modalActions.placeElement(nameInput, INPUT_RECT, { focusable: true });

  const confirmButton = button(
    scene,
    0,
    310,
    confirmLabel,
    () => confirm(),
    CONFIRM_RECT.width,
    UI.coral,
    UI.ink,
    CONFIRM_RECT.height
  );
  card.add(confirmButton);
  const confirmControl = modalActions.add({
    label: confirmAccessibleLabel,
    rect: CONFIRM_RECT,
    enabled: false,
    onActivate: () => confirm(),
  });

  const setConfirmEnabled = (enabled: boolean): void => {
    confirmControl.disabled = !enabled;
    confirmControl.setAttribute('aria-disabled', String(!enabled));
    confirmButton.setAlpha(enabled ? 1 : 0.58);
    confirmButton.list.forEach((child) => {
      if (child.input) child.input.enabled = enabled;
    });
  };

  const updateName = (): void => {
    options.onNameChange(nameInput.value);
    setConfirmEnabled(currentName().length >= 2);
  };

  const confirm = (): void => {
    if (!shell.isInputReady()) return;
    const name = currentName();
    if (name.length < 2) {
      nameInput.focus();
      return;
    }
    options.onNameChange(name);
    shell.finish(() => options.onConfirm(name));
  };

  nameInput.addEventListener('input', updateName);
  nameInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    confirm();
  });
  setConfirmEnabled(currentName().length >= 2);

  shade.on('pointerup', close);
  shell.open(() => {
    if (shouldMoveKeyboardFocus) modalActions.focusInitial(nameInput);
  });

  return Object.freeze({ destroy: shell.destroy });
}
