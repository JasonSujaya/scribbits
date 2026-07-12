import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { CareAction, Scribbit } from '../../shared/arena';
import { CanvasActionOverlay } from './overlay';
import type { PaperIconKey } from './papericons';
import { canCare } from './scribbits';
import { CARE_STYLES, TYPE, UI } from './theme';
import { ghostButton, iconButton, label, stickerCard } from './ui';

const CARE_PICKER_DEPTH = 2_500;
const CARD_WIDTH = 620;
const CARD_HEIGHT = 430;
const ACTION_WIDTH = 170;
const ACTION_HEIGHT = 108;
const CLOSE_TARGET_SIZE = 100;
const OPENING_DURATION_MILLISECONDS = 220;

const CARE_ACTIONS: readonly CareAction[] = ['feed', 'pat', 'train'];
const CARE_ICONS: Readonly<Record<CareAction, PaperIconKey>> = {
  feed: 'berry',
  pat: 'paw',
  train: 'train',
};

export type CarePicker = Readonly<{
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}>;

export type CarePickerOptions = Readonly<{
  scribbit: Scribbit;
  onChoose: (action: CareAction) => void;
  onClose: () => void;
}>;

export function openCarePicker(
  scene: Scene,
  options: CarePickerOptions
): CarePicker {
  const { width, height } = scene.scale;
  const cardCenterX = width / 2;
  const cardCenterY = height / 2;
  const shouldMoveKeyboardFocus =
    document.activeElement instanceof HTMLButtonElement;
  const accessibleActions = new CanvasActionOverlay(scene);
  accessibleActions.setVisible(false);

  let destroyed = false;
  let inputReady = false;
  let openingTween: Phaser.Tweens.Tween | null = null;
  let firstAvailableAction: HTMLButtonElement | null = null;

  const container = scene.add
    .container(0, 0)
    .setDepth(CARE_PICKER_DEPTH)
    .setScrollFactor(0);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.66)
    .setScrollFactor(0)
    .setInteractive();
  container.add(shade);

  const card = stickerCard(
    scene,
    cardCenterX,
    cardCenterY,
    CARD_WIDTH,
    CARD_HEIGHT,
    { tapeColor: UI.tapeAlt, tapeWidth: 82 }
  )
    .setScrollFactor(0)
    .setAlpha(0)
    .setScale(0.84);
  container.add(card);

  const destroyInternal = (): void => {
    if (destroyed) return;
    destroyed = true;
    inputReady = false;
    openingTween?.stop();
    openingTween = null;
    accessibleActions.destroy();
    scene.events.off('shutdown', handleSceneShutdown);
    container.destroy(true);
  };

  const close = (): void => {
    if (!inputReady || destroyed) return;
    destroyInternal();
    options.onClose();
  };

  const choose = (action: CareAction): void => {
    if (!inputReady || destroyed || !canCare(options.scribbit, action)) return;
    destroyInternal();
    options.onChoose(action);
  };

  function handleSceneShutdown(): void {
    destroyInternal();
  }

  card.add(label(scene, 0, -158, 'CARE', TYPE.title, UI.ink, true));

  const name = boundedName(options.scribbit.name);
  const nameLabel = label(scene, 0, -100, name, TYPE.body, UI.inkSoft, true);
  if (nameLabel.width > 400) nameLabel.setScale(400 / nameLabel.width);
  card.add(nameLabel);

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
  const closeControl = accessibleActions.add({
    label: 'Close care picker',
    rect: {
      x: cardCenterX + closeX - CLOSE_TARGET_SIZE / 2,
      y: cardCenterY + closeY - CLOSE_TARGET_SIZE / 2,
      width: CLOSE_TARGET_SIZE,
      height: CLOSE_TARGET_SIZE,
    },
    onActivate: close,
  });

  const actionY = 42;
  CARE_ACTIONS.forEach((action, index) => {
    const actionX = (index - 1) * 190;
    const available = canCare(options.scribbit, action);
    const style = CARE_STYLES[action];
    const actionButton = iconButton(
      scene,
      actionX,
      actionY,
      CARE_ICONS[action],
      action.toUpperCase(),
      () => choose(action),
      ACTION_WIDTH,
      style.color,
      UI.ink,
      ACTION_HEIGHT,
      UI.creamHex,
      available
    );
    if (!available) actionButton.setAlpha(0.42);
    card.add(actionButton);

    if (!available) {
      card.add(
        label(scene, actionX, actionY + 72, 'DONE', 18, UI.inkSoft, true)
      );
    }

    const nativeAction = accessibleActions.add({
      label: `${style.label}${available ? '' : ', done'}`,
      rect: {
        x: cardCenterX + actionX - ACTION_WIDTH / 2,
        y: cardCenterY + actionY - ACTION_HEIGHT / 2,
        width: ACTION_WIDTH,
        height: ACTION_HEIGHT,
      },
      enabled: available,
      onActivate: () => choose(action),
    });
    if (available && firstAvailableAction === null) {
      firstAvailableAction = nativeAction;
    }
  });

  scene.events.once('shutdown', handleSceneShutdown);
  openingTween = scene.tweens.add({
    targets: card,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: OPENING_DURATION_MILLISECONDS,
    ease: 'Back.easeOut',
    onComplete: () => {
      openingTween = null;
      if (destroyed) return;
      inputReady = true;
      accessibleActions.setVisible(true);
      if (shouldMoveKeyboardFocus) {
        (firstAvailableAction ?? closeControl).focus();
      }
    },
  });

  return Object.freeze({ container, destroy: destroyInternal });
}

function boundedName(value: string): string {
  const normalizedName = value.replace(/\s+/g, ' ').trim() || 'SCRIBBIT';
  return normalizedName.length <= 32
    ? normalizedName
    : `${normalizedName.slice(0, 31)}…`;
}
