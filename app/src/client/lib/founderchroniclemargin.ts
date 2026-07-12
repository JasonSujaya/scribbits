// Compact Phaser presentation for the account-level Founder Rival Thread.
// Progress is planned from the server snapshot in founderchronicle.ts; this
// adapter owns only paper layout, navigation, and callbacks.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type {
  FounderChronicle,
  FounderChronicleBeat,
} from '../../shared/arena';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import {
  getFounderChronicleBeatCopy,
  planFounderChronicle,
} from './founderchronicle';
import { generateDoodleTexture } from './proceduraldoodleart';
import { ELEMENT_STYLES, TYPE, UI } from './theme';
import { button, ghostButton, handLettered, label, stickerCard } from './ui';

export type FounderChronicleMarginOptions = Readonly<{
  chronicle: FounderChronicle;
  currentDay: number;
  newestBeat?: FounderChronicleBeat | null;
  onContinue?: () => void;
  onClose?: () => void;
}>;

export type FounderChronicleMargin = Readonly<{
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}>;

const addLeftLabel = (
  scene: Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string,
  width: number,
  bold = false
): Phaser.GameObjects.Text => {
  const textObject = label(scene, x, y, text, size, color, bold)
    .setOrigin(0, 0.5)
    .setAlign('left')
    .setWordWrapWidth(width, true);
  container.add(textObject);
  return textObject;
};

export function openFounderChronicleMargin(
  scene: Scene,
  options: FounderChronicleMarginOptions
): FounderChronicleMargin {
  const { width, height } = scene.scale;
  const plan = planFounderChronicle(options.chronicle, options.currentDay);
  const activeRivalry = plan.activeRivalry;
  const hasNewestBeat =
    options.newestBeat !== null && options.newestBeat !== undefined;
  const cardHeight = activeRivalry ? (hasNewestBeat ? 700 : 640) : 720;
  const backdrop = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.82)
    .setScrollFactor(0)
    .setDepth(2_300)
    .setInteractive();
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    width - 80,
    cardHeight,
    {
      tapeColor: UI.tapeAlt,
      tapeWidth: 100,
    }
  )
    .setScrollFactor(0)
    .setDepth(2_301);

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    backdrop.destroy();
    card.destroy(true);
    options.onClose?.();
  };
  backdrop.on('pointerup', close);

  const titleY = activeRivalry ? -cardHeight / 2 + 54 : -285;
  card.add(handLettered(scene, 0, titleY, 'FOUNDER RIVAL', 38, UI.ink, false));

  if (options.newestBeat) {
    const beatCopy = getFounderChronicleBeatCopy(options.newestBeat);
    const newestBeatY = activeRivalry ? titleY + 64 : -224;
    const newMargin = scene.add
      .rectangle(0, newestBeatY, 530, 58, UI.gold, 1)
      .setStrokeStyle(2, UI.inkHex, 1);
    card.add(newMargin);
    card.add(
      label(
        scene,
        0,
        newestBeatY,
        `NEW · ${beatCopy.headline.toUpperCase()}`,
        18,
        UI.ink,
        true
      )
        .setWordWrapWidth(500, true)
        .setLineSpacing(-2)
    );
  }

  if (activeRivalry) {
    const founder = getFoundingScribbitDefinition(activeRivalry.founderId);
    if (founder) {
      const style = ELEMENT_STYLES[founder.element];
      const profileY = titleY + (hasNewestBeat ? 176 : 112);
      const texture = generateDoodleTexture(
        scene,
        founder.id,
        founder.element,
        founder.stats
      );
      const portraitBackdrop = scene.add
        .circle(-206, profileY, 88, style.soft, 0.3)
        .setStrokeStyle(3, style.primary, 0.85);
      const portrait = scene.add
        .image(-206, profileY, texture)
        .setDisplaySize(164, 164);
      card.add([portraitBackdrop, portrait]);
      addLeftLabel(
        scene,
        card,
        -100,
        profileY - 42,
        founder.name.toUpperCase(),
        32,
        UI.ink,
        375,
        true
      );
      addLeftLabel(
        scene,
        card,
        -100,
        profileY - 7,
        founder.personality.epithet.toUpperCase(),
        18,
        style.primaryText,
        375,
        true
      );

      const scoreAvailabilityY = profileY + 48;
      const statusFill = activeRivalry.readyToday ? UI.coral : UI.gold;
      const statusStroke = activeRivalry.readyToday ? UI.coralDeep : UI.goldHex;
      card.add(
        scene.add
          .rectangle(91, scoreAvailabilityY, 382, 46, statusFill, 0.22)
          .setStrokeStyle(2, statusStroke, 0.8)
      );
      const scoreAvailability = label(
        scene,
        -88,
        scoreAvailabilityY,
        `${activeRivalry.scoreLine.toUpperCase()} · ${activeRivalry.availabilityLine.toUpperCase()}`,
        19,
        UI.ink,
        true
      )
        .setOrigin(0, 0.5)
        .setAlign('left');
      const scoreAvailabilityWidth = 358;
      if (scoreAvailability.width > scoreAvailabilityWidth) {
        const fittedScale = scoreAvailabilityWidth / scoreAvailability.width;
        scoreAvailability.setScale(fittedScale);
      }
      card.add(scoreAvailability);

      const boutsPlayed = activeRivalry.playerWins + activeRivalry.founderWins;
      const progressY = profileY + 118;
      const progressStartX = -174;
      const progressSpacing = 174;
      card.add(scene.add.rectangle(0, progressY, 348, 5, UI.inkHex, 0.18));
      const completedTrackWidth =
        Math.max(0, boutsPlayed - 1) * progressSpacing;
      if (completedTrackWidth > 0) {
        card.add(
          scene.add.rectangle(
            progressStartX + completedTrackWidth / 2,
            progressY,
            completedTrackWidth,
            5,
            style.primary,
            1
          )
        );
      }
      for (let index = 0; index < 3; index += 1) {
        const filled = index < boutsPlayed;
        const nodeX = progressStartX + index * progressSpacing;
        const circle = scene.add
          .circle(nodeX, progressY, 18, filled ? style.primary : UI.creamHex, 1)
          .setStrokeStyle(3, UI.inkHex, 1);
        card.add(circle);
        card.add(
          label(
            scene,
            nodeX,
            progressY,
            filled ? '✓' : String(index + 1),
            16,
            filled ? UI.cream : UI.ink,
            true
          )
        );
      }

      const nextPageY = progressY + 50;
      card.add(
        label(
          scene,
          0,
          nextPageY,
          `PAGE ${activeRivalry.nextBoutNumber}/3 · ${activeRivalry.nextEpisodeTitle}`,
          20,
          UI.inkSoft,
          true
        ).setWordWrapWidth(530, true)
      );

      const quoteY = nextPageY + 84;
      const quoteCard = scene.add
        .rectangle(0, quoteY, 540, 90, style.soft, 0.2)
        .setStrokeStyle(2, style.primary, 0.7);
      card.add(quoteCard);
      card.add(
        label(scene, 0, quoteY, `“${activeRivalry.quote}”`, 21, UI.ink, false)
          .setWordWrapWidth(500, true)
          .setLineSpacing(2)
      );

      const actionY = cardHeight / 2 - 58;
      if (activeRivalry.readyToday && options.onContinue) {
        card.add(
          button(
            scene,
            0,
            actionY,
            'CONTINUE THREAD →',
            () => {
              close();
              options.onContinue?.();
            },
            440,
            UI.coral,
            UI.ink
          )
        );
      } else {
        card.add(ghostButton(scene, 0, actionY, 'Close margin', close, 360));
      }
    }
  } else {
    card.add(
      label(
        scene,
        0,
        -115,
        plan.emptyLine ?? 'Your next founder fight starts a new thread.',
        TYPE.body,
        UI.ink,
        true
      ).setWordWrapWidth(520, true)
    );

    if (plan.resolvedNotes.length === 0) {
      card.add(
        label(
          scene,
          0,
          15,
          plan.legacyEncounterCount > 0
            ? `${plan.legacyEncounterCount} EARLIER FOUNDER ENCOUNTER${plan.legacyEncounterCount === 1 ? '' : 'S'} CARRIED FORWARD.\nA NEW RIVAL THREAD STILL STARTS 0–0.`
            : 'No checklist. No power reward. Just one rival who remembers the fight.',
          23,
          UI.inkSoft,
          false
        ).setWordWrapWidth(500, true)
      );
    } else {
      plan.resolvedNotes.slice(0, 3).forEach((note, index) => {
        const y = -20 + index * 112;
        const style = ELEMENT_STYLES[note.element];
        const row = scene.add
          .rectangle(0, y, 540, 96, style.soft, 0.28)
          .setStrokeStyle(3, style.primary, 0.8);
        card.add(row);
        addLeftLabel(
          scene,
          card,
          -248,
          y - 22,
          `${note.name.toUpperCase()} · ${note.scoreLine.toUpperCase()}`,
          21,
          UI.ink,
          496,
          true
        );
        addLeftLabel(
          scene,
          card,
          -248,
          y + 20,
          `“${note.quote}”`,
          18,
          UI.inkSoft,
          496,
          false
        );
      });
    }
    card.add(ghostButton(scene, 0, 306, 'Close margin', close, 360));
  }

  return {
    container: card,
    destroy: close,
  };
}
