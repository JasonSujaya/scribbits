import type { Scene } from 'phaser';
import { CAPSULE_PITY, CAPSULE_RARITY_PERCENTAGES } from '../../shared/arena';
import { COSMETIC_CATALOG, GEAR_CATALOG_ENTRIES } from '../../shared/cosmetics';
import { renderCosmeticPreview } from './cosmeticpreview';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, UI } from './theme';
import { button, label } from './ui';

const LEGENDARY_SEASON_GEAR = GEAR_CATALOG_ENTRIES.filter(
  (entry) => entry.rarity === 'legendary'
);

const PRIZE_KIND_COUNTS = Object.freeze({
  gear: COSMETIC_CATALOG.filter((entry) => entry.kind === 'accessory').length,
  pens: COSMETIC_CATALOG.filter((entry) => entry.kind === 'pen').length,
  ink: COSMETIC_CATALOG.filter((entry) => entry.kind === 'drawing-ink').length,
  brushes: COSMETIC_CATALOG.filter((entry) => entry.kind === 'brush').length,
  titles: COSMETIC_CATALOG.filter((entry) => entry.kind === 'title').length,
});

export type CapsulePrizeGuide = Readonly<{ destroy: () => void }>;

export function openCapsulePrizeGuide(
  scene: Scene,
  seasonName: string | undefined,
  trigger: HTMLButtonElement,
  onDestroy: () => void
): CapsulePrizeGuide {
  const { width, height } = scene.scale;
  const cardCenterY = height / 2;
  const seasonLabel = seasonName?.trim().toUpperCase() || 'CURRENT SEASON';
  const jackpotNames = LEGENDARY_SEASON_GEAR.map((entry) => entry.name).join(
    ', '
  );
  const description =
    `${seasonLabel} has ${COSMETIC_CATALOG.length} possible claw-machine prizes. ` +
    `The legendary top wins are ${jackpotNames}. ` +
    `${CAPSULE_RARITY_PERCENTAGES.common} percent are common, ` +
    `${CAPSULE_RARITY_PERCENTAGES.rare} percent rare, ` +
    `${CAPSULE_RARITY_PERCENTAGES.epic} percent epic, and ` +
    `${CAPSULE_RARITY_PERCENTAGES.legendary} percent legendary. ` +
    `An epic or legendary prize is guaranteed within ${CAPSULE_PITY} pulls.`;
  const close = (): void => {
    shell.finish(() => undefined);
  };
  const shell = createStickerModalShell({
    scene,
    title: `${seasonLabel} claw-machine prizes`,
    description,
    onRequestClose: close,
    trigger,
    depth: 3500,
    cardCenterY,
    cardWidth: Math.min(668, width - 80),
    cardHeight: 820,
    shadeAlpha: 0.76,
    tapeWidth: 110,
    openingDurationMilliseconds: prefersReducedMotion() ? 1 : 220,
    blockCard: true,
    onDestroy,
  });

  const card = shell.card;
  card.add(label(scene, 0, -342, 'TOP WINS THIS SEASON', 36, UI.ink, true));
  card.add(label(scene, 0, -300, seasonLabel, 20, UI.coralText, true));
  card.add(scene.add.rectangle(0, -266, width - 230, 3, UI.coral, 0.7));

  LEGENDARY_SEASON_GEAR.forEach((entry, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const tileX = column === 0 ? -145 : 145;
    const tileY = -158 + row * 202;
    const tile = scene.add.container(tileX, tileY);
    const backing = scene.add
      .rectangle(0, 0, 258, 174, UI.gold, 0.1)
      .setStrokeStyle(4, UI.coral, 0.76);
    const rarity = label(scene, 0, -66, 'LEGENDARY', 14, UI.coralText, true);
    const name = label(scene, 0, 52, entry.name.toUpperCase(), 18, UI.ink, true)
      .setWordWrapWidth(220)
      .setLineSpacing(1);
    const category = label(
      scene,
      0,
      75,
      entry.category.toUpperCase(),
      14,
      UI.inkSoft,
      true
    );
    tile.add([backing, rarity]);
    renderCosmeticPreview({
      scene,
      parent: tile,
      entry,
      y: -12,
      size: 96,
      width: 104,
      height: 104,
      maxScale: 0.9,
    });
    tile.add([name, category]);
    card.add(tile);
  });

  card.add(
    label(
      scene,
      0,
      166,
      `${COSMETIC_CATALOG.length} TOTAL PRIZES`,
      23,
      UI.ink,
      true
    )
  );
  card.add(
    label(
      scene,
      0,
      201,
      `${PRIZE_KIND_COUNTS.gear} GEAR • ${PRIZE_KIND_COUNTS.pens} PENS • ${PRIZE_KIND_COUNTS.ink} INKS • ${PRIZE_KIND_COUNTS.brushes} BRUSHES • ${PRIZE_KIND_COUNTS.titles} TITLES`,
      15,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 170)
  );
  card.add(
    label(
      scene,
      0,
      248,
      `${CAPSULE_RARITY_PERCENTAGES.common}% COMMON • ${CAPSULE_RARITY_PERCENTAGES.rare}% RARE • ${CAPSULE_RARITY_PERCENTAGES.epic}% EPIC • ${CAPSULE_RARITY_PERCENTAGES.legendary}% LEGENDARY`,
      16,
      UI.coralText,
      true
    ).setWordWrapWidth(width - 170)
  );
  card.add(
    label(
      scene,
      0,
      286,
      `EPIC OR LEGENDARY WITHIN ${CAPSULE_PITY} PULLS`,
      17,
      UI.goldText,
      true
    )
  );
  card.add(button(scene, 0, 352, 'GOT IT', close, 220, UI.coral, UI.ink, 72));

  const closeControl = shell.actions.add({
    label: 'Got it, close season prize guide',
    rect: {
      x: width / 2 - 110,
      y: cardCenterY + 316,
      width: 220,
      height: 72,
    },
    pointerPassthrough: true,
    onActivate: close,
  });
  shell.shade.on('pointerup', close);
  shell.open(() => shell.actions.focusInitial(closeControl));

  return Object.freeze({ destroy: shell.destroy });
}
