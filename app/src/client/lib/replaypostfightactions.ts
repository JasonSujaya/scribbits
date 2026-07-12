// Shared post-fight hierarchy. Keeping one planner and renderer outside Replay
// prevents win and loss branches from drifting into different action grids.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  planReplayPostFightActions,
  type ReplayPostFightAction,
  type ReplayPostFightActionKind,
} from './battlepresentation';
import { CanvasActionOverlay } from './overlay';
import { UI } from './theme';
import { button, ghostButton } from './ui';

export type PostFightActions = Readonly<{
  container: Phaser.GameObjects.Container;
  setAccessibleVisible: (visible: boolean) => void;
  destroy: () => void;
}>;

export function createPostFightActions(
  scene: Scene,
  input: Readonly<{
    x: number;
    y: number;
    accessibilityX: number;
    accessibilityY: number;
    width: number;
    canChooseRival: boolean;
    canBackContender: boolean;
    returnLabel: string;
    onRivals: () => void;
    onPractice: () => void;
    onBackContender: () => void;
    onReturn: () => void;
  }>
): PostFightActions {
  const plan = planReplayPostFightActions(input);
  const container = scene.add.container(input.x, input.y);
  const accessibleOverlay = new CanvasActionOverlay(scene);
  const callbacks: Readonly<Record<ReplayPostFightActionKind, () => void>> = {
    rivals: input.onRivals,
    practice: input.onPractice,
    backContender: input.onBackContender,
    return: input.onReturn,
  };
  const activateAction = (kind: ReplayPostFightActionKind): void => {
    callbacks[kind]();
  };
  const placeAccessibleAction = (
    action: ReplayPostFightAction,
    localX: number,
    localY: number,
    width: number
  ): void => {
    accessibleOverlay.add({
      label: action.accessibleLabel,
      rect: {
        x: input.accessibilityX + localX - width / 2,
        y: input.accessibilityY + localY - plan.buttonHeight / 2,
        width,
        height: plan.buttonHeight,
      },
      onActivate: () => activateAction(action.kind),
    });
  };
  const createAction = (
    action: ReplayPostFightAction,
    x: number,
    y: number,
    width: number
  ): Phaser.GameObjects.Container => {
    if (action.tone === 'ghost') {
      return ghostButton(
        scene,
        x,
        y,
        action.label,
        () => activateAction(action.kind),
        width,
        plan.buttonHeight
      );
    }
    return button(
      scene,
      x,
      y,
      action.label,
      () => activateAction(action.kind),
      width,
      action.tone === 'coral' ? UI.coralDeep : UI.gold,
      UI.ink,
      plan.buttonHeight
    );
  };

  container.add(createAction(plan.primary, 0, 0, input.width));
  placeAccessibleAction(plan.primary, 0, 0, input.width);
  if (plan.secondary.length > 0) {
    const gap = 12;
    const secondaryWidth =
      (input.width - gap * (plan.secondary.length - 1)) /
      plan.secondary.length;
    const secondaryStartX = -input.width / 2 + secondaryWidth / 2;
    plan.secondary.forEach((action, index) => {
      const actionX = secondaryStartX + index * (secondaryWidth + gap);
      container.add(
        createAction(
          action,
          actionX,
          plan.secondaryRowOffset ?? 0,
          secondaryWidth
        )
      );
      placeAccessibleAction(
        action,
        actionX,
        plan.secondaryRowOffset ?? 0,
        secondaryWidth
      );
    });
  }

  let destroyed = false;
  return {
    container,
    setAccessibleVisible: (visible) => accessibleOverlay.setVisible(visible),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      accessibleOverlay.destroy();
      if (container.scene) container.destroy(true);
    },
  };
}
