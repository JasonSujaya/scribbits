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
import { button, ghostButton, iconButton } from './ui';

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
    canReplay: boolean;
    canShareClip?: boolean;
    returnLabel: string;
    primaryAction?: ReplayPostFightAction;
    rivalActionCopy?: Readonly<{
      label: string;
      accessibleLabel: string;
    }>;
    onRivals: () => void;
    onFirstChest?: () => void;
    onBackContender: () => void;
    onReplay: () => void;
    onShareClip?: () => void;
    onReturn: () => void;
  }>
): PostFightActions {
  const plan = planReplayPostFightActions(input);
  const container = scene.add.container(input.x, input.y);
  const accessibleOverlay = new CanvasActionOverlay(scene);
  const callbacks: Readonly<Record<ReplayPostFightActionKind, () => void>> = {
    rivals: input.onRivals,
    firstChest: input.onFirstChest ?? (() => undefined),
    backContender: input.onBackContender,
    replay: input.onReplay,
    share: input.onShareClip ?? (() => undefined),
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
    if (action.kind === 'replay') {
      return iconButton(
        scene,
        x,
        y,
        'replay',
        action.label,
        () => activateAction(action.kind),
        width,
        UI.creamHex,
        UI.ink,
        plan.buttonHeight,
        UI.gold
      );
    }
    if (action.kind === 'share') {
      return iconButton(
        scene,
        x,
        y,
        'spark',
        action.label,
        () => activateAction(action.kind),
        width,
        UI.creamHex,
        UI.ink,
        plan.buttonHeight,
        UI.coral
      );
    }
    if (
      action.kind === 'rivals' ||
      action.kind === 'firstChest' ||
      action.kind === 'backContender'
    ) {
      return iconButton(
        scene,
        x,
        y,
        action.kind === 'rivals'
          ? 'sword'
          : action.kind === 'firstChest'
            ? 'ink'
            : 'trophy',
        action.label,
        () => activateAction(action.kind),
        width,
        action.tone === 'coral' ? UI.coralDeep : UI.gold,
        UI.ink,
        plan.buttonHeight,
        UI.creamHex
      );
    }
    if (action.tone === 'ghost') {
      return ghostButton(
        scene,
        x,
        y,
        compactReturn ? `‹ ${action.label}` : action.label,
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

  const addUtilityActions = (y: number): void => {
    const gap = 12;
    const returnWidth = Math.min(
      180,
      Math.max(136, 72 + plan.returnAction.label.length * 12)
    );
    const optionalActions = [plan.replayAction, plan.shareAction].filter(
      (action): action is ReplayPostFightAction => Boolean(action)
    );
    const optionalWidth =
      optionalActions.length > 0
        ? Math.min(
            220,
            (input.width - returnWidth - gap * optionalActions.length) /
              optionalActions.length
          )
        : 0;
    const utilityWidth =
      returnWidth + optionalActions.length * (gap + optionalWidth);
    let actionX = -utilityWidth / 2 + returnWidth / 2;
    container.add(
      createAction(plan.returnAction, actionX, y, returnWidth, true)
    );
    placeAccessibleAction(plan.returnAction, actionX, y, returnWidth);
    actionX += returnWidth / 2;
    for (const action of optionalActions) {
      actionX += gap + optionalWidth / 2;
      container.add(createAction(action, actionX, y, optionalWidth));
      placeAccessibleAction(action, actionX, y, optionalWidth);
      actionX += optionalWidth / 2;
    }
  };

  if (plan.primary) {
    const primaryY = -58;
    const utilityY = 58;
    container.add(createAction(plan.primary, 0, primaryY, input.width));
    placeAccessibleAction(plan.primary, 0, primaryY, input.width);
    addUtilityActions(utilityY);
  } else {
    addUtilityActions(0);
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
