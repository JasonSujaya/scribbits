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
  const backdrop = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.82)
    .setScrollFactor(0)
    .setDepth(2_300)
    .setInteractive();
  const card = stickerCard(scene, width / 2, height / 2, width - 80, 720, {
    tapeColor: UI.tapeAlt,
    tapeWidth: 100,
  })
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

  card.add(
    label(scene, 0, -310, 'BLUE-TAPE MARGIN', TYPE.caption, UI.coralText, true)
  );
  card.add(handLettered(scene, 0, -265, 'FOUNDER RIVAL', 42, UI.ink, false));

  if (options.newestBeat) {
    const beatCopy = getFounderChronicleBeatCopy(options.newestBeat);
    const newMargin = scene.add
      .rectangle(0, -212, 510, 54, UI.gold, 1)
      .setStrokeStyle(3, UI.inkHex, 1);
    card.add(newMargin);
    card.add(
      label(
        scene,
        0,
        -212,
        `NEW · ${beatCopy.headline.toUpperCase()} · ${beatCopy.detail.toUpperCase()}`,
        19,
        UI.ink,
        true
      ).setWordWrapWidth(490, true)
    );
  }

  const activeRivalry = plan.activeRivalry;
  if (activeRivalry) {
    const founder = getFoundingScribbitDefinition(activeRivalry.founderId);
    if (founder) {
      const texture = generateDoodleTexture(
        scene,
        founder.id,
        founder.element,
        founder.stats
      );
      const portrait = scene.add
        .image(-205, -78, texture)
        .setDisplaySize(190, 190);
      card.add(portrait);
      const style = ELEMENT_STYLES[founder.element];
      addLeftLabel(
        scene,
        card,
        -82,
        -150,
        founder.name.toUpperCase(),
        34,
        UI.ink,
        360,
        true
      );
      addLeftLabel(
        scene,
        card,
        -82,
        -112,
        founder.personality.epithet.toUpperCase(),
        20,
        style.primaryText,
        360,
        true
      );
      addLeftLabel(
        scene,
        card,
        -82,
        -58,
        activeRivalry.scoreLine.toUpperCase(),
        30,
        UI.ink,
        360,
        true
      );
      addLeftLabel(
        scene,
        card,
        -82,
        -18,
        activeRivalry.availabilityLine.toUpperCase(),
        22,
        activeRivalry.readyToday ? UI.coralText : UI.goldText,
        360,
        true
      );
    }

    const boutsPlayed = activeRivalry.playerWins + activeRivalry.founderWins;
    const boutStartX = -118;
    for (let index = 0; index < 3; index += 1) {
      const filled = index < boutsPlayed;
      const circle = scene.add
        .circle(
          boutStartX + index * 118,
          70,
          30,
          filled ? UI.inkHex : UI.creamHex,
          1
        )
        .setStrokeStyle(4, UI.inkHex, 1);
      card.add(circle);
      card.add(
        label(
          scene,
          boutStartX + index * 118,
          70,
          filled ? '✓' : String(index + 1),
          23,
          filled ? UI.cream : UI.ink,
          true
        )
      );
    }
    card.add(
      label(
        scene,
        0,
        118,
        `PAGE ${activeRivalry.nextBoutNumber}/3 · ${activeRivalry.nextEpisodeTitle}`,
        19,
        UI.inkSoft,
        true
      ).setWordWrapWidth(510, true)
    );

    const quoteCard = scene.add
      .rectangle(0, 190, 540, 116, UI.creamHex, 1)
      .setStrokeStyle(3, UI.inkHex, 0.75);
    card.add(quoteCard);
    card.add(
      label(scene, 0, 190, `“${activeRivalry.quote}”`, 24, UI.ink, false)
        .setWordWrapWidth(500, true)
        .setLineSpacing(3)
    );

    if (activeRivalry.readyToday && options.onContinue) {
      card.add(
        button(
          scene,
          0,
          306,
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
      card.add(ghostButton(scene, 0, 306, 'Close margin', close, 360));
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
