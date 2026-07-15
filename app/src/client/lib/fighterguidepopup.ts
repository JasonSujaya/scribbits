import type { Scene } from 'phaser';
import {
  COMBAT_ROLE_ADVANTAGE,
  COMBAT_ROLE_IDS,
  getCombatRoleContent,
} from '../../shared/combat/roles';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { ROLE_STYLES, UI } from './theme';
import { ghostButton, label, stickerCard } from './ui';
import { translate } from './localization';

export type FighterGuidePopup = Readonly<{ destroy: () => void }>;

export function openFighterGuidePopup(
  scene: Scene,
  onOpenMoreRules: () => void,
  onClose: () => void
): FighterGuidePopup {
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 580);
  const cardWidth = width - 140;
  const popupLayer = scene.add
    .container(0, 0)
    .setDepth(3200)
    .setScrollFactor(0);
  let popupOverlay: CanvasModalOverlay | null = null;
  let destroyed = false;

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    popupOverlay?.destroy();
    popupOverlay = null;
    popupLayer.destroy(true);
    onClose();
  };

  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72)
    .setInteractive();
  scrim.on('pointerup', destroy);
  const popupCard = stickerCard(scene, width / 2, centerY, width - 80, 710, {
    tapeColor: UI.tapeAlt,
    tilt: -0.25,
  });
  popupLayer.add([
    scrim,
    popupCard,
    label(
      scene,
      width / 2,
      centerY - 290,
      translate('appMenu.fieldGuideTitle'),
      38,
      UI.ink,
      true
    ),
    label(
      scene,
      width / 2,
      centerY - 244,
      translate('appMenu.fieldGuideSubtitle'),
      18,
      UI.inkSoft,
      true
    ),
  ]);

  popupOverlay = new CanvasModalOverlay(
    scene,
    translate('appMenu.fieldGuideTitle'),
    destroy,
    translate('appMenu.fieldGuideDescription')
  );

  COMBAT_ROLE_IDS.forEach((role, index) => {
    const roleContent = getCombatRoleContent(role);
    const beatenRole = getCombatRoleContent(COMBAT_ROLE_ADVANTAGE[role]);
    const counterRole = COMBAT_ROLE_IDS.find(
      (candidate) => COMBAT_ROLE_ADVANTAGE[candidate] === role
    );
    const counter = getCombatRoleContent(counterRole ?? role);
    const roleStyle = ROLE_STYLES[role];
    const y = centerY - 140 + index * 138;
    const roleCard = stickerCard(scene, width / 2, y, cardWidth, 112, {
      tape: false,
    });
    roleCard.add([
      scene.add
        .rectangle(0, 0, cardWidth - 16, 96, roleStyle.soft, 0.24)
        .setStrokeStyle(2, roleStyle.color, 0.22),
      scene.add.rectangle(-cardWidth / 2 + 16, 0, 12, 80, roleStyle.color, 1),
      paperIcon(scene, roleContent.icon, -cardWidth / 2 + 64, 0, {
        size: 38,
        fill: roleStyle.color,
      }),
      label(
        scene,
        -cardWidth / 2 + 108,
        -20,
        roleContent.displayName.toUpperCase(),
        23,
        roleStyle.colorText,
        true
      ).setOrigin(0, 0.5),
      label(
        scene,
        -cardWidth / 2 + 108,
        20,
        roleContent.rangeLabel,
        15,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5),
      label(
        scene,
        86,
        -20,
        `BEATS ${beatenRole.displayName.toUpperCase()}`,
        21,
        UI.ink,
        true
      ),
      label(
        scene,
        86,
        20,
        `WEAK TO ${counter.displayName.toUpperCase()}`,
        16,
        UI.inkSoft,
        true
      ),
    ]);
    popupLayer.add(roleCard);
  });

  const moreRulesButton = ghostButton(
    scene,
    width / 2 - 130,
    centerY + 290,
    translate('appMenu.moreRules'),
    () => {
      destroy();
      onOpenMoreRules();
    },
    220
  );
  const closeButton = ghostButton(
    scene,
    width / 2 + 130,
    centerY + 290,
    translate('appMenu.close'),
    destroy,
    220
  );
  popupLayer.add([moreRulesButton, closeButton]);
  popupOverlay.add({
    label: translate('appMenu.openMoreRules'),
    rect: {
      x: width / 2 - 240,
      y: centerY + 240,
      width: 220,
      height: 100,
    },
    onActivate: () => {
      destroy();
      onOpenMoreRules();
    },
  });
  const closeControl = popupOverlay.add({
    label: translate('appMenu.closeFieldGuide'),
    rect: {
      x: width / 2 + 20,
      y: centerY + 240,
      width: 220,
      height: 100,
    },
    onActivate: destroy,
  });
  popupOverlay.focusInitial(closeControl);

  return { destroy };
}
