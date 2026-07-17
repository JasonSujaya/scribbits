import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { AccessoryEffectFamily } from '../../shared/accessoryeffects';
import type { GearRank, Scribbit } from '../../shared/arena';
import type { CosmeticGearCatalogEntry } from '../../shared/cosmetics';
import { getGearTechniqueEffect } from '../../shared/gearcombat';
import { getCombatRoleContent } from '../../shared/combat';
import { renderCosmeticPreview } from './cosmeticpreview';
import { createStickerShine } from './stickerfxshader';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, TYPE, UI } from './theme';
import { ghostButton, label } from './ui';
import {
  createSandboxBattlePreview,
  type SandboxEffectStyle,
  type SandboxBattlePreview,
} from './sandboxbattlepreview';
import { heldWeaponVisualForGear } from './heldweaponpresentation';

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

const WEAPON_EFFECT_STYLE: Readonly<Record<AccessoryEffectFamily, SandboxEffectStyle>> =
  Object.freeze({
    guard: 'survive',
    rush: 'speed',
    focus: 'critical',
    ready: 'critical',
    fortune: 'critical',
    aim: 'critical',
  });

/** Read-only, looping preview for one Gear effect. */
export function openFeaturedGearDetail(
  scene: Scene,
  entry: CosmeticGearCatalogEntry,
  trigger: HTMLElement,
  onDestroy: () => void,
  rank: GearRank = 1,
  fighter?: Scribbit
): FeaturedGearDetail {
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 700);
  const effect = getGearTechniqueEffect(entry, rank);
  const roleRelicCopy = entry.roleAffinity
    ? `${getCombatRoleContent(entry.roleAffinity).displayName} relic. ${entry.roleEffect ?? ''}`
    : 'Works with every role weapon.';
  const effectColor = EFFECT_COLORS[entry.effectFamily];
  const reducedMotion = prefersReducedMotion();
  let destroyed = false;
  let shine: ReturnType<typeof createStickerShine> = null;
  let battlePreview: SandboxBattlePreview | null = null;

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
      scene.tweens.killTweensOf([
        effectAura,
        goldRing,
        orbit,
        gearPreview,
      ]);
      battlePreview?.destroy();
      battlePreview = null;
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

  const gearPreview = renderCosmeticPreview({
    scene,
    parent: card,
    entry,
    x: 0,
    y: -95,
    size: 188,
    width: 210,
    height: 210,
  });

  if (fighter) {
    battlePreview = createSandboxBattlePreview({
      scene,
      parent: card,
      fighter,
      x: 0,
      y: -95,
      width: width - 190,
      height: 270,
      accentColor: effectColor,
      direction: 'fighter-attacks',
      result: 'damage',
      cue: effect.name.toUpperCase(),
      effectLabel: effect.summary,
      effectStyle: WEAPON_EFFECT_STYLE[entry.effectFamily],
      mode: 'weapon',
      heldWeapon: heldWeaponVisualForGear(entry),
      resultIcon: 'target',
    });
  }

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
    `${rank}★ EFFECT · ${effect.name.toUpperCase()}`,
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
    fighter
      ? 'LIVE TRAINING LOOP · 0 XP · NOTHING SAVED'
      : 'LOOPING DEMO · EQUIP IN BAG TO ACTIVATE',
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

  if (!fighter) {
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
  }

  if (!reducedMotion && !fighter) {
    orbit.setAngle(-18).setScale(0.88);
    scene.tweens.add({
      targets: orbit,
      scaleX: 1,
      scaleY: 1,
      duration: 880,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: goldRing,
      alpha: { from: 0.45, to: 1 },
      duration: 620,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: gearPreview,
      x: { from: -10, to: 10 },
      angle: { from: -5, to: 5 },
      scaleX: { from: 0.96, to: 1.06 },
      scaleY: { from: 0.96, to: 1.06 },
      duration: 760,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: effectAura,
      scaleX: { from: 0.88, to: 1.16 },
      scaleY: { from: 0.88, to: 1.16 },
      alpha: { from: 0.45, to: 0.9 },
      duration: 760,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: orbit,
      angle: { from: -18, to: 342 },
      duration: 5200,
      ease: 'Linear',
      repeat: -1,
    });
  }

  shell.open(() => {
    shine?.play(780);
    shell.actions.focusInitial(closeControl);
  });

  return Object.freeze({ destroy: () => shell.destroy() });
}
