// Shared two-choice row for owned exhibition outcomes. Keeping this layout out
// of Replay prevents win and loss branches from drifting again.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { UI } from './theme';
import { button } from './ui';

export function createPostFightSparringChoices(
  scene: Scene,
  input: Readonly<{
    x: number;
    y: number;
    width: number;
    onRivals: () => void;
    onPractice: () => void;
  }>
): Phaser.GameObjects.Container {
  const row = scene.add.container(input.x, input.y);
  const gap = 18;
  const buttonWidth = (input.width - gap) / 2;
  const offset = buttonWidth / 2 + gap / 2;
  const rivals = button(
    scene,
    -offset,
    0,
    '🥊 RIVALS',
    input.onRivals,
    buttonWidth,
    UI.coralDeep
  );
  const practice = button(
    scene,
    offset,
    0,
    '✏️ PRACTICE',
    input.onPractice,
    buttonWidth,
    UI.tapeAlt,
    UI.ink
  );
  row.add([rivals, practice]);
  return row;
}
