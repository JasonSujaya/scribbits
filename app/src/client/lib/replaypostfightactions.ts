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
    rivalActionCopy?: Readonly<{
      label: string;
      accessibleLabel: string;
    }>;
    onRivals: () => void;
    onBackContender: () => void;
    onReturn: () => void;
  }>
): PostFightActions {
  const plan = planReplayPostFightActions(input);
  const container = scene.add.container(input.x, input.y);
  const accessibleOverlay = new CanvasActionOverlay(scene);
  const callbacks: Readonly<Record<ReplayPostFightActionKind, () => void>> = {
    rivals: input.onRivals,
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
    width: number,
    compactReturn = false
  ): Phaser.GameObjects.Container => {
    if (action.tone === 'ghost') {
      return ghostButton(
        scene,
        x,
        y,
        compactReturn ? '‹' : action.label,
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

  if (plan.primary) {
    const gap = 12;
    const returnWidth = plan.buttonHeight;
    const primaryWidth = input.width - returnWidth - gap;
    const returnX = -input.width / 2 + returnWidth / 2;
    const primaryX = input.width / 2 - primaryWidth / 2;
    container.add(createAction(plan.returnAction, returnX, 0, returnWidth, true));
    container.add(createAction(plan.primary, primaryX, 0, primaryWidth));
    placeAccessibleAction(plan.returnAction, returnX, 0, returnWidth);
    placeAccessibleAction(plan.primary, primaryX, 0, primaryWidth);
  } else {
    container.add(createAction(plan.returnAction, 0, 0, input.width));
    placeAccessibleAction(plan.returnAction, 0, 0, input.width);
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
