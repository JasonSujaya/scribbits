import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { planArenaBackAction } from './arenabracket';
import { CanvasModalOverlay } from './overlay';
import { elementPaperIcon, paperIcon } from './papericons';
import { fitDrawing, loadDrawing } from './scribbits';
import { TYPE, UI } from './theme';
import { ghostButton, label, paperIconButton, stickerCard } from './ui';

export type ArenaContenderPicker = Readonly<{ destroy: () => void }>;

export type ArenaContenderPickerOptions = Readonly<{
  scene: Scene;
  entrants: readonly Scribbit[];
  ownedScribbitIds: readonly string[];
  backedScribbitId: string | null;
  onPick: (entrant: Scribbit) => void;
  onInspect: (entrant: Scribbit) => void;
  onClose: () => void;
}>;

export function openArenaContenderPicker(
  options: ArenaContenderPickerOptions
): ArenaContenderPicker {
  const {
    scene,
    entrants,
    ownedScribbitIds,
    backedScribbitId,
    onPick,
    onInspect,
    onClose,
  } = options;
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
  const destroyPicker = (): void => {
    if (!layer.active) return;
    layer.destroy(true);
  };
  const closePicker = (): void => {
    if (!layer.active) return;
    destroyPicker();
    onClose();
  };
  const inspectEntrant = (entrant: Scribbit): void => {
    if (!layer.active) return;
    layer.destroy(true);
    onInspect(entrant);
  };
  const semanticSummary = backedScribbitId
    ? 'Tonight’s Rumble contenders. Your one daily pick is already locked.'
    : 'Tonight’s Rumble contenders. Choose one Scribbit to back tonight.';
  const modalActions = new CanvasModalOverlay(
    scene,
    'Tonight’s Rumble contenders',
    closePicker,
    semanticSummary
  );
  layer.once('destroy', () => modalActions.destroy());

  const shade = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.66)
    .setInteractive();
  let shadePointerDown: { x: number; y: number } | null = null;
  shade.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    shadePointerDown = { x: pointer.x, y: pointer.y };
  });
  shade.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    const start = shadePointerDown;
    shadePointerDown = null;
    if (
      start &&
      Phaser.Math.Distance.Between(start.x, start.y, pointer.x, pointer.y) <= 12
    ) {
      closePicker();
    }
  });
  layer.add(shade);

  const panelWidth = width - 48;
  const panelHeight = 1_090;
  const panelBlocker = scene.add
    .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0xffffff, 0.001)
    .setInteractive();
  layer.add(panelBlocker);
  const panel = stickerCard(
    scene,
    width / 2,
    height / 2,
    panelWidth,
    panelHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: 96 }
  );
  layer.add(panel);
  panel.add(label(scene, 0, -480, 'TONIGHT’S RUMBLE', 40, UI.ink, true));
  panel.add(
    label(
      scene,
      0,
      -435,
      backedScribbitId ? 'PICK LOCKED' : 'ONE HEART • ONE PICK',
      22,
      backedScribbitId ? UI.goldText : UI.coralText,
      true
    )
  );

  const closeVisual = ghostButton(
    scene,
    panelWidth / 2 - 56,
    -484,
    '×',
    closePicker,
    90,
    90
  );
  panel.add(closeVisual);
  const nativeClose = modalActions.add({
    label: 'Close Rumble contenders',
    rect: {
      x: width / 2 + panelWidth / 2 - 101,
      y: height / 2 - 529,
      width: 90,
      height: 90,
    },
    onActivate: closePicker,
  });

  if (entrants.length === 0) {
    panel.add(
      paperIcon(scene, 'clock', 0, -40, { size: 74, fill: UI.tapeAlt })
    );
    panel.add(
      label(scene, 0, 70, 'NO CONTENDERS YET', TYPE.title, UI.ink, true)
    );
    modalActions.focusInitial(nativeClose);
    return { destroy: closePicker };
  }

  const columns = 2;
  const gap = 16;
  const cardWidth = (panelWidth - 72 - gap) / columns;
  const cardHeight = 184;
  const firstY = -322;
  const rowStep = 202;

  entrants.slice(0, 8).forEach((entrant, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = -panelWidth / 2 + 36 + cardWidth / 2 + column * (cardWidth + gap);
    const y = firstY + row * rowStep;
    const action = planArenaBackAction({
      entrantId: entrant.id,
      ownedScribbitIds,
      backedScribbitId,
    });
    const entrantCard = stickerCard(scene, x, y, cardWidth, cardHeight, {
      tape: false,
      gold: action.kind === 'picked',
    });
    panel.add(entrantCard);

    const artX = -cardWidth / 2 + 58;
    const artSize = 82;
    const frame = scene.add
      .rectangle(artX, -24, artSize, artSize, UI.creamHex, 1)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    frame.on('pointerup', () => inspectEntrant(entrant));
    entrantCard.add(frame);
    void loadDrawing(scene, entrant).then((textureKey) => {
      if (!scene.scene.isActive() || !entrantCard.active) return;
      const portrait = fitDrawing(
        scene.add.image(artX, -24, textureKey),
        artSize - 10
      );
      portrait.setInteractive({ useHandCursor: true });
      portrait.on('pointerup', () => inspectEntrant(entrant));
      entrantCard.add(portrait);
    });

    const name = label(
      scene,
      artX + 56,
      -52,
      entrant.name.toUpperCase(),
      24,
      UI.ink,
      true
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(cardWidth - 142);
    entrantCard.add(name);
    entrantCard.add(elementPaperIcon(scene, entrant.element, artX + 76, 2, 32));

    const actionX = cardWidth / 2 - 58;
    const actionY = 48;
    const icon = action.kind === 'locked' ? 'lock' : 'heart';
    const fill =
      action.kind === 'picked'
        ? UI.gold
        : action.kind === 'available'
          ? UI.coral
          : 0xb7aa92;
    const iconFill =
      action.kind === 'available'
        ? UI.gold
        : action.kind === 'picked'
          ? UI.coralDeep
          : UI.creamHex;
    const activate = (): void => {
      if (action.kind === 'available') {
        layer.destroy(true);
        onPick(entrant);
        return;
      }
      inspectEntrant(entrant);
    };
    const actionButton = paperIconButton(
      scene,
      actionX,
      actionY,
      icon,
      activate,
      100,
      fill,
      iconFill,
      70
    );
    if (!action.enabled && action.kind !== 'picked') actionButton.setAlpha(0.7);
    entrantCard.add(actionButton);
    modalActions.add({
      label: `View details for ${entrant.name}`,
      rect: {
        x: width / 2 + x + artX - artSize / 2,
        y: height / 2 + y - 24 - artSize / 2,
        width: artSize,
        height: artSize,
      },
      onActivate: () => inspectEntrant(entrant),
    });
    modalActions.add({
      label:
        action.kind === 'available'
          ? `Pick ${entrant.name} for tonight’s Rumble`
          : `${entrant.name}. ${action.label}. Open details.`,
      rect: {
        x: width / 2 + x + actionX - 50,
        y: height / 2 + y + actionY - 50,
        width: 100,
        height: 100,
      },
      onActivate: activate,
    });
  });

  modalActions.focusInitial(nativeClose);
  return { destroy: destroyPicker };
}
