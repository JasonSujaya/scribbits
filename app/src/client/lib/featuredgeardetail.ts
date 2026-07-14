import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { AccessoryEffectFamily } from '../../shared/accessoryeffects';
import type { CosmeticGearCatalogEntry } from '../../shared/cosmetics';
import { getGearTechniqueEffect } from '../../shared/gearcombat';
import { getCombatRoleContent } from '../../shared/combat';
import { renderCosmeticPreview } from './cosmeticpreview';
import { createStickerShine } from './stickerfxshader';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, TYPE, UI } from './theme';
import { ghostButton, label } from './ui';

const EFFECT_COLORS: Readonly<Record<AccessoryEffectFamily, number>> =
  Object.freeze({
    guard: 0x5b9dff,
    rush: UI.coral,
    focus: 0x8a5cd8,
    ready: UI.gold,
    fortune: 0x4faa4f,
    aim: 0x2f9fd8,
  });

export type FeaturedGearDetail = Readonly<{ destroy: () => void }>;

/** Read-only Shop preview for one featured Gear effect. */
export function openFeaturedGearDetail(
  scene: Scene,
  entry: CosmeticGearCatalogEntry,
  trigger: HTMLElement,
  onDestroy: () => void
): FeaturedGearDetail {
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 700);
  const effect = getGearTechniqueEffect(entry, 1);
  const roleRelicCopy = entry.roleAffinity
    ? `${getCombatRoleContent(entry.roleAffinity).displayName} relic. ${entry.roleEffect ?? ''}`
    : 'Works with every role weapon.';
  const effectColor = EFFECT_COLORS[entry.effectFamily];
  const reducedMotion = prefersReducedMotion();
  let destroyed = false;
  let shine: ReturnType<typeof createStickerShine> = null;

  const close = (): void => {
    shell.finish(() => undefined);
  };

  const shell = createStickerModalShell({
    scene,
    title: `${entry.name} effect`,
    description:
      `${entry.name}. ${entry.rarity} ${entry.category} Gear. ` +
      `${entry.description} ${roleRelicCopy} ${effect.name}. ${effect.battleCue} ${effect.summary}.`,
    onRequestClose: close,
    trigger,
    depth: 3300,
    cardCenterY: centerY,
    cardWidth: width - 100,
    cardHeight: 720,
    shadeAlpha: 0.72,
    tapeWidth: 152,
    openingDurationMilliseconds: reducedMotion ? 1 : 260,
    blockCard: true,
    onDestroy: () => {
      if (destroyed) return;
      destroyed = true;
      shine?.destroy();
      shine = null;
      onDestroy();
    },
  });

  const card = shell.card;
  const effectAura = scene.add
    .circle(0, -95, 124, effectColor, 0.1)
    .setStrokeStyle(6, effectColor, 0.42);
  const goldRing = scene.add
    .circle(0, -95, 96, UI.gold, 0.08)
    .setStrokeStyle(5, UI.goldHex, 0.88);
  const innerRing = scene.add
    .circle(0, -95, 76, UI.creamHex, 0.04)
    .setStrokeStyle(3, UI.creamHex, 0.75);
  const orbit = scene.add.container(0, -95);
  for (let index = 0; index < 8; index += 1) {
    const angle = Phaser.Math.DegToRad(index * 45 - 12);
    const radius = index % 2 === 0 ? 118 : 106;
    orbit.add(
      scene.add.star(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        4,
        index % 2 === 0 ? 5 : 3,
        index % 2 === 0 ? 17 : 11,
        index % 2 === 0 ? UI.goldHex : effectColor,
        0.96
      )
    );
  }
  card.add([effectAura, goldRing, innerRing, orbit]);

  renderCosmeticPreview({
    scene,
    parent: card,
    entry,
    x: 0,
    y: -95,
    size: 188,
    width: 210,
    height: 210,
  });

  const rarity = label(
    scene,
    0,
    -302,
    `${entry.rarity.toUpperCase()} ${entry.category.toUpperCase()}`,
    21,
    UI.coralText,
    true
  );
  const title = label(scene, 0, 44, entry.name, 38, UI.ink, true)
    .setWordWrapWidth(width - 170)
    .setLineSpacing(2);
  const effectName = label(
    scene,
    0,
    104,
    `1★ EFFECT · ${effect.name.toUpperCase()}`,
    23,
    UI.goldText,
    true
  );
  const battleCue = label(
    scene,
    0,
    154,
    entry.roleAffinity
      ? `${getCombatRoleContent(entry.roleAffinity).displayName.toUpperCase()} RELIC · ${entry.roleEffect ?? effect.battleCue}`
      : effect.battleCue,
    TYPE.body,
    UI.ink,
    true
  ).setWordWrapWidth(width - 170);
  const effectSummary = label(
    scene,
    0,
    198,
    effect.summary,
    22,
    UI.coralText,
    true
  ).setWordWrapWidth(width - 170);
  const helper = label(
    scene,
    0,
    232,
    'EQUIP IN BAG TO ACTIVATE',
    18,
    UI.inkSoft,
    true
  );
  const closeButton = ghostButton(scene, 0, 307, 'CLOSE', close, 220);
  card.add([
    rarity,
    title,
    effectName,
    battleCue,
    effectSummary,
    helper,
    closeButton,
  ]);

  const closeControl = shell.actions.add({
    label: `Close ${entry.name} effect`,
    rect: {
      x: width / 2 - 110,
      y: centerY + 257,
      width: 220,
      height: 100,
    },
    pointerPassthrough: true,
    onActivate: close,
  });
  shell.shade.on('pointerup', close);

  shine = createStickerShine({
    scene,
    x: width / 2,
    y: centerY - 95,
    width: 292,
    height: 292,
    depth: 3302,
    reduceMotion: reducedMotion,
    tint: [1, 0.78, 0.24],
    intensity: 0.86,
  });

  if (!reducedMotion) {
    orbit.setAngle(-18).setScale(0.88);
    scene.tweens.add({
      targets: orbit,
      angle: 32,
      scaleX: 1,
      scaleY: 1,
      duration: 880,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: [effectAura, goldRing],
      alpha: { from: 0.45, to: 1 },
      duration: 620,
      ease: 'Sine.easeOut',
    });
  }

  shell.open(() => {
    shine?.play(780);
    shell.actions.focusInitial(closeControl);
  });

  return Object.freeze({ destroy: () => shell.destroy() });
}
