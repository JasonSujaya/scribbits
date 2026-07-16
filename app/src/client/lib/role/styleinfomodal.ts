import { Scene } from 'phaser';
import type * as Phaser from 'phaser';
import { getCombatRoleContent } from '../../../shared/combat/roles';
import type { CurrentCombatRole } from '../../../shared/combat/types';
import { CanvasModalOverlay } from '../overlay';
import { paperIcon } from '../papericons';
import { markSfxManaged, playSfx } from '../sfx';
import { ROLE_STYLES, UI } from '../theme';
import { button, label, stickerCard } from '../ui';

const FIGHTER_STYLE_ROLES: readonly CurrentCombatRole[] = [
  'brawler',
  'longshot',
  'mage',
];

const FIGHTER_STYLE_COLOR_NAMES: Readonly<Record<CurrentCombatRole, string>> = {
  brawler: 'brown + coral + orange',
  longshot: 'gold + green + blue',
  mage: 'aqua + purple + pink',
};

const FIGHTER_STYLE_COUNTERS: Readonly<
  Record<CurrentCombatRole, Readonly<{ beats: string; weakTo: string }>>
> = Object.freeze({
  brawler: Object.freeze({ beats: 'MAGE', weakTo: 'LONGSHOT' }),
  longshot: Object.freeze({ beats: 'BRAWLER', weakTo: 'MAGE' }),
  mage: Object.freeze({ beats: 'LONGSHOT', weakTo: 'BRAWLER' }),
});

const semanticDescription =
  'The color group covering the most drawing area determines fighter style. Brown, coral, and orange make Brawler. Gold, green, and blue make Longshot. Aqua, purple, and pink make Mage. Brawler beats Mage, Mage beats Longshot, and Longshot beats Brawler. Equal color groups are randomized. Black, grey, and white are neutral, so neutral-only drawings are randomized too.';

export type FighterStyleInfoModal = Readonly<{ destroy: () => void }>;

type FighterStyleInfoModalOptions = Readonly<{
  trigger: HTMLElement | null;
  onCloseRequest: () => void;
}>;

export const createFighterStyleInfoModal = (
  scene: Scene,
  options: FighterStyleInfoModalOptions
): FighterStyleInfoModal => {
  const { width, height } = scene.scale;
  const cardWidth = width - 80;
  const cardHeight = Math.min(980, height - 120);
  const cardTop = (height - cardHeight) / 2;
  const cardBottom = cardTop + cardHeight;
  let destroyed = false;
  let closeRequested = false;
  const requestClose = (): void => {
    if (destroyed || closeRequested) return;
    closeRequested = true;
    options.onCloseRequest();
  };

  const actions = new CanvasModalOverlay(
    scene,
    'Fighter styles',
    requestClose,
    semanticDescription,
    options.trigger
  );
  const layer = scene.add.container(0, 0).setDepth(2600).setScrollFactor(0);
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    layer.destroy(true);
  };
  layer.once('destroy', () => {
    destroyed = true;
    actions.destroy();
  });

  const shade = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.74)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  markSfxManaged(shade);
  shade.on('pointerup', () => {
    playSfx('ui.close');
    requestClose();
  });
  const card = stickerCard(
    scene,
    width / 2,
    cardTop + cardHeight / 2,
    cardWidth,
    cardHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: 94 }
  ).setScrollFactor(0);
  const cardInputBlocker = scene.add
    .rectangle(
      width / 2,
      cardTop + cardHeight / 2,
      cardWidth,
      cardHeight,
      0xffffff,
      0.001
    )
    .setScrollFactor(0)
    .setInteractive();
  cardInputBlocker.on(
    'pointerup',
    (
      _pointer: unknown,
      _localX: unknown,
      _localY: unknown,
      event: Phaser.Types.Input.EventData
    ) => event.stopPropagation?.()
  );
  layer.add([shade, card, cardInputBlocker]);

  layer.add([
    paperIcon(scene, 'info', width / 2, cardTop + 70, {
      size: 54,
      fill: UI.gold,
      stroke: UI.inkHex,
    }).setScrollFactor(0),
    label(
      scene,
      width / 2,
      cardTop + 126,
      'COLOR DECIDES YOUR ROLE',
      32,
      UI.ink,
      true
    ).setScrollFactor(0),
    label(
      scene,
      width / 2,
      cardTop + 168,
      'THE BIGGEST COLOR AREA WINS',
      19,
      UI.coralText,
      true
    ).setScrollFactor(0),
  ]);

  const rowStartY = cardTop + 265;
  FIGHTER_STYLE_ROLES.forEach((role, index) => {
    const roleContent = getCombatRoleContent(role);
    const counters = FIGHTER_STYLE_COUNTERS[role];
    const rowY = rowStartY + index * 132;
    const roleStyle = ROLE_STYLES[role];
    const roleColor = roleStyle.color;
    const rowCard = scene.add.graphics().setScrollFactor(0);
    rowCard.fillStyle(roleColor, 0.1);
    rowCard.fillRoundedRect(76, rowY - 56, width - 152, 112, 18);
    rowCard.lineStyle(2, roleColor, 0.42);
    rowCard.strokeRoundedRect(76, rowY - 56, width - 152, 112, 18);
    layer.add(rowCard);
    layer.add(
      paperIcon(scene, roleContent.icon, 122, rowY, {
        size: 46,
        fill: roleColor,
        stroke: UI.inkHex,
      }).setScrollFactor(0)
    );
    layer.add(
      label(
        scene,
        168,
        rowY - 27,
        roleContent.displayName.toUpperCase(),
        23,
        UI.ink,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
    );
    layer.add(
      label(
        scene,
        168,
        rowY + 5,
        `${FIGHTER_STYLE_COLOR_NAMES[role].toUpperCase()} · ${roleContent.rangeLabel}`,
        17,
        UI.inkSoft,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
    );
    layer.add(
      label(
        scene,
        168,
        rowY + 35,
        `BEATS ${counters.beats} · WEAK TO ${counters.weakTo}`,
        16,
        roleStyle.colorText,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
    );
  });

  layer.add(
    label(
      scene,
      width / 2,
      cardBottom - 154,
      'MIX COLORS FREELY — THE MOST-USED GROUP WINS. A TIE PICKS ONE AT RANDOM. BLACK + GREY + WHITE ARE NEUTRAL.',
      17,
      UI.inkSoft,
      true
    )
      .setWordWrapWidth(cardWidth - 110)
      .setAlign('center')
      .setScrollFactor(0)
  );
  layer.add(
    button(
      scene,
      width / 2,
      cardBottom - 74,
      'GOT IT',
      requestClose,
      cardWidth - 120,
      UI.coral,
      UI.ink,
      88
    ).setScrollFactor(0)
  );
  const closeControl = actions.add({
    label: 'Got it',
    rect: {
      x: 100,
      y: cardBottom - 124,
      width: width - 200,
      height: 100,
    },
    onActivate: requestClose,
  });
  actions.focusInitial(closeControl);

  return Object.freeze({ destroy });
};
