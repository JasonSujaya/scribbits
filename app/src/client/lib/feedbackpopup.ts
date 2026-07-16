import { context as devvitContext, showToast } from '@devvit/web/client';
import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS,
  FEEDBACK_MESSAGE_MINIMUM_CHARACTERS,
  type FeedbackCategory,
  type SubmitFeedbackResponse,
} from '../../shared/feedback';
import { submitFeedback } from './api';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { DOM_TYPE, TYPE, UI } from './theme';
import { button, ghostButton, handLettered, label, stickerCard } from './ui';
import { getArena, setArena } from './registry';

export type FeedbackPopup = Readonly<{ destroy: () => void }>;

const CATEGORY_LABELS: Readonly<Record<FeedbackCategory, string>> = {
  bug: 'BUG',
  idea: 'IDEA',
  balance: 'BALANCE',
  other: 'OTHER',
};

export function openFeedbackPopup(
  scene: Scene,
  onClose: () => void,
  trigger?: HTMLElement | null,
  onSubmitted?: (response: SubmitFeedbackResponse) => void
): FeedbackPopup {
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 610);
  const popupLayer = scene.add
    .container(0, 0)
    .setDepth(3300)
    .setScrollFactor(0);
  const modalActions = new CanvasModalOverlay(
    scene,
    'Send feedback',
    () => destroy(),
    'Send a private note to the Scribbits team.',
    trigger
  );
  let destroyed = false;
  let sending = false;
  let selectedCategory: FeedbackCategory = 'idea';

  const destroy = (): void => {
    if (destroyed || sending) return;
    destroyed = true;
    modalActions.destroy();
    popupLayer.destroy(true);
    onClose();
  };

  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.7)
    .setInteractive();
  scrim.on('pointerup', destroy);
  const card = stickerCard(scene, width / 2, centerY, width - 72, 880, {
    tapeColor: UI.tapeAlt,
    tapeWidth: 108,
    tilt: -0.15,
  });
  const cardBlocker = scene.add
    .rectangle(0, 0, width - 72, 880, 0xffffff, 0.001)
    .setInteractive();
  cardBlocker.on(
    'pointerup',
    (
      _pointer: unknown,
      _localX: unknown,
      _localY: unknown,
      event: Phaser.Types.Input.EventData
    ) => event.stopPropagation?.()
  );
  card.addAt(cardBlocker, 0);
  const contentLayer = scene.add.container(0, 0);
  card.add(contentLayer);
  popupLayer.add([scrim, card]);

  contentLayer.add([
    paperIcon(scene, 'pencil', 0, -344, {
      size: 64,
      fill: UI.tapeAlt,
    }),
    handLettered(scene, 0, -276, 'DROP US A SCRIBBLE', 43, UI.ink, true),
    label(
      scene,
      0,
      -228,
      'What kind of note is it?',
      TYPE.body,
      UI.inkSoft,
      true
    ),
  ]);

  const categoryVisuals = new Map<
    FeedbackCategory,
    { background: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }
  >();
  const categoryControls: HTMLButtonElement[] = [];
  const categoryStartX = 86;
  const categoryWidth = 130;
  const categoryGap = 10;
  const categoryY = centerY - 154;

  const drawCategory = (category: FeedbackCategory): void => {
    const visual = categoryVisuals.get(category);
    if (!visual) return;
    const selected = selectedCategory === category;
    visual.background.clear();
    visual.background.fillStyle(selected ? UI.coral : UI.creamHex, 1);
    visual.background.fillRoundedRect(-65, -30, 130, 60, 20);
    visual.background.lineStyle(3, UI.inkHex, 1);
    visual.background.strokeRoundedRect(-65, -30, 130, 60, 20);
    visual.text.setColor(UI.ink);
  };

  FEEDBACK_CATEGORIES.forEach((category, index) => {
    const centerX =
      categoryStartX +
      categoryWidth / 2 +
      index * (categoryWidth + categoryGap);
    const visual = scene.add.container(
      centerX - width / 2,
      categoryY - centerY
    );
    const background = scene.add.graphics();
    const text = label(
      scene,
      0,
      0,
      CATEGORY_LABELS[category],
      19,
      UI.ink,
      true
    );
    visual.add([background, text]);
    contentLayer.add(visual);
    categoryVisuals.set(category, { background, text });
    const control = modalActions.add({
      label: `${CATEGORY_LABELS[category]} feedback`,
      attributes: {
        role: 'radio',
        'aria-checked': String(selectedCategory === category),
      },
      rect: {
        x: centerX - categoryWidth / 2,
        y: categoryY - 30,
        width: categoryWidth,
        height: 60,
      },
      onActivate: () => {
        if (sending) return;
        selectedCategory = category;
        categoryControls.forEach((categoryControl, controlIndex) => {
          categoryControl.setAttribute(
            'aria-checked',
            String(FEEDBACK_CATEGORIES[controlIndex] === selectedCategory)
          );
        });
        FEEDBACK_CATEGORIES.forEach(drawCategory);
      },
    });
    categoryControls.push(control);
    drawCategory(category);
  });

  const textarea = document.createElement('textarea');
  textarea.maxLength = FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS;
  textarea.placeholder = "Tell us what's on your mind…";
  textarea.spellcheck = true;
  textarea.autocomplete = 'off';
  textarea.setAttribute('aria-label', 'Your feedback');
  Object.assign(textarea.style, {
    ...DOM_TYPE.body,
    color: UI.ink,
    background: UI.cream,
    border: `4px dashed ${UI.ink}`,
    borderRadius: '18px',
    outline: 'none',
    padding: '18px 20px',
    resize: 'none',
  });
  modalActions.placeElement(
    textarea,
    {
      x: 82,
      y: centerY - 115,
      width: width - 164,
      height: 250,
    },
    { focusable: true }
  );

  const countLabel = label(
    scene,
    width / 2 - 102,
    160,
    `0 / ${FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS}`,
    18,
    UI.inkSoft,
    true
  );
  contentLayer.add(countLabel);

  const statusLabel = label(
    scene,
    0,
    205,
    'Your note is private and goes only to the Scribbits team.',
    18,
    UI.inkSoft,
    true
  ).setWordWrapWidth(width - 180);
  contentLayer.add(statusLabel);
  const accessibleStatus = modalActions.addStatus();

  const cancelButton = ghostButton(
    scene,
    -142,
    320,
    'NEVER MIND',
    destroy,
    238
  );
  const sendButton = button(
    scene,
    142,
    320,
    'SEND IT',
    () => submit(),
    238,
    UI.coral,
    UI.ink,
    88
  );
  contentLayer.add([cancelButton, sendButton]);

  const cancelControl = modalActions.add({
    label: 'Close feedback without sending',
    rect: {
      x: width / 2 - 142 - 119,
      y: centerY + 276,
      width: 238,
      height: 88,
    },
    onActivate: destroy,
  });
  const sendControl = modalActions.add({
    label: 'Send feedback',
    rect: {
      x: width / 2 + 142 - 119,
      y: centerY + 276,
      width: 238,
      height: 88,
    },
    enabled: false,
    onActivate: () => submit(),
  });

  const setSubmissionEnabled = (enabled: boolean): void => {
    sendControl.disabled = !enabled;
    sendControl.setAttribute('aria-disabled', String(!enabled));
    sendButton.setAlpha(enabled ? 1 : 0.52);
  };

  const renderSuccess = (response: SubmitFeedbackResponse): void => {
    textarea.hidden = true;
    categoryControls.forEach((control) => {
      control.hidden = true;
    });
    cancelControl.hidden = true;
    sendControl.hidden = true;
    contentLayer.removeAll(true);
    const done = (): void => {
      sending = false;
      destroy();
    };
    contentLayer.add([
      paperIcon(scene, 'spark', 0, -130, { size: 100, fill: UI.gold }),
      handLettered(scene, 0, -20, 'GOT IT — THANKS!', 48, UI.ink, true),
      label(
        scene,
        0,
        65,
        response.inkAwarded > 0
          ? `+${response.inkAwarded} MYSTERY INK`
          : 'We read every note.',
        TYPE.body,
        response.inkAwarded > 0 ? UI.goldText : UI.inkSoft,
        true
      ),
      button(scene, 0, 190, 'DONE', done, 250, UI.coral, UI.ink, 88),
    ]);
    const doneControl = modalActions.add({
      label: 'Close feedback confirmation',
      rect: {
        x: width / 2 - 125,
        y: centerY + 146,
        width: 250,
        height: 88,
      },
      onActivate: done,
    });
    accessibleStatus.textContent =
      response.inkAwarded > 0
        ? `Feedback sent. You earned ${response.inkAwarded} Mystery Ink.`
        : 'Feedback sent. We read every note.';
    modalActions.focusInitial(doneControl);
  };

  const submit = (): void => {
    if (sending || destroyed) return;
    const message = textarea.value.trim();
    if (message.length < FEEDBACK_MESSAGE_MINIMUM_CHARACTERS) {
      textarea.focus();
      return;
    }
    sending = true;
    textarea.disabled = true;
    categoryControls.forEach((control) => {
      control.disabled = true;
    });
    cancelControl.disabled = true;
    sendControl.disabled = true;
    statusLabel.setText('Sending your note…');
    accessibleStatus.textContent = 'Sending your feedback.';

    void submitFeedback({
      category: selectedCategory,
      message,
      sourceScene: scene.scene.key,
      appVersion: devvitContext?.appVersion?.trim() || 'LOCAL',
    }).then((result) => {
      if (destroyed || !scene.scene.isActive()) return;
      if (result.ok) {
        const arena = getArena(scene);
        if (arena) setArena(scene, { ...arena, myInk: result.data.ink });
        onSubmitted?.(result.data);
        showToast(
          result.data.inkAwarded > 0
            ? `Thanks — you earned ${result.data.inkAwarded} Mystery Ink!`
            : 'Thanks — your note was sent.'
        );
        renderSuccess(result.data);
        return;
      }
      sending = false;
      textarea.disabled = false;
      categoryControls.forEach((control) => {
        control.disabled = false;
      });
      cancelControl.disabled = false;
      statusLabel.setText(result.error);
      accessibleStatus.textContent = result.error;
      showToast(result.error);
      setSubmissionEnabled(
        textarea.value.trim().length >= FEEDBACK_MESSAGE_MINIMUM_CHARACTERS
      );
    });
  };

  textarea.addEventListener('input', () => {
    const characterCount = textarea.value.length;
    countLabel.setText(
      `${characterCount} / ${FEEDBACK_MESSAGE_MAXIMUM_CHARACTERS}`
    );
    setSubmissionEnabled(
      !sending &&
        textarea.value.trim().length >= FEEDBACK_MESSAGE_MINIMUM_CHARACTERS
    );
  });
  setSubmissionEnabled(false);
  modalActions.focusInitial(textarea);
  return { destroy };
}
