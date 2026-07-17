import type { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import {
  POWER_UP_CATALOG,
  type PowerUpId,
  type PowerUpRarity,
} from '../../shared/combat/powerups';
import type { PaperIconKey } from './papericons';
import {
  createSandboxBattlePreview,
  type SandboxEffectStyle,
  type SandboxBattlePreview,
} from './sandboxbattlepreview';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, TYPE, UI } from './theme';
import { ghostButton, label } from './ui';

const RARITY_COLORS: Readonly<Record<PowerUpRarity, number>> = Object.freeze({
  common: UI.inkSoftHex,
  uncommon: 0x49a36d,
  rare: 0x4f9dcc,
  epic: 0x8a5cd8,
  legendary: UI.gold,
});

export type PowerUpEffectPreview = Readonly<{ destroy: () => void }>;

function effectIcon(powerUpId: PowerUpId): PaperIconKey {
  const definition = POWER_UP_CATALOG[powerUpId];
  if ((definition.maximumHitPointHealingPermille ?? 0) > 0) return 'heart';
  if ((definition.preventedDamagePermille ?? 0) > 0) return 'shield';
  if (
    (definition.projectileWallBounces ?? 0) > 0 ||
    (definition.projectileReturns ?? 0) > 0
  ) {
    return 'back';
  }
  if ((definition.additionalOrbiters ?? 0) > 0) return 'spark';
  return definition.buildPath === 'survival' ? 'armor' : 'target';
}

function effectStyle(powerUpId: PowerUpId): SandboxEffectStyle {
  const definition = POWER_UP_CATALOG[powerUpId];
  if ((definition.survivingHitPointPermille ?? 0) > 0) return 'survive';
  if ((definition.projectileWallBounces ?? 0) > 0 || definition.trigger === 'wall-bounce') {
    return 'bounce';
  }
  if ((definition.projectileReturns ?? 0) > 0) return 'return';
  if ((definition.additionalOrbiters ?? 0) > 0) return 'orbit';
  if (
    (definition.impactZoneLifetimeTicks ?? 0) > 0 ||
    (definition.zoneLifetimePermille ?? 0) > 0
  ) {
    return 'zone';
  }
  if (definition.trigger === 'enemy-signature') return 'counter';
  if (
    (definition.repeatedAttacks ?? 0) > 0 ||
    (definition.extraActivations ?? 0) > 0 ||
    (definition.delayTicks ?? 0) > 0
  ) {
    return 'repeat';
  }
  return 'critical';
}

function effectResultLabel(powerUpId: PowerUpId): string {
  const definition = POWER_UP_CATALOG[powerUpId];
  const percent = (permille: number): string => `${permille / 10}%`;
  if ((definition.survivingHitPointPermille ?? 0) > 0) {
    return `SURVIVE AT ${percent(definition.survivingHitPointPermille!) } HP`;
  }
  if ((definition.preventedDamagePermille ?? 0) > 0) {
    return `BLOCK ${percent(definition.preventedDamagePermille!)} DAMAGE`;
  }
  if ((definition.projectileWallBounces ?? 0) > 0) {
    return `BOUNCE ×${definition.projectileWallBounces}`;
  }
  if ((definition.projectileReturns ?? 0) > 0) return 'PROJECTILE RETURNS';
  if ((definition.additionalOrbiters ?? 0) > 0) {
    return `+${definition.additionalOrbiters} ORBITER`;
  }
  if ((definition.zoneLifetimePermille ?? 0) > 0) {
    return `ZONE +${percent(definition.zoneLifetimePermille! - 1_000)}`;
  }
  if ((definition.maximumHitPointHealingPermille ?? 0) > 0) {
    return `+${percent(definition.maximumHitPointHealingPermille!)} HP`;
  }
  if ((definition.repeatedAttacks ?? 0) > 0) {
    return `BOOST NEXT ${definition.repeatedAttacks} HITS`;
  }
  if ((definition.powerPermille ?? 0) > 0) {
    return `+${percent(definition.powerPermille!)} DAMAGE`;
  }
  return definition.shortName;
}

/** Optional looping explanation for a discovered Power-Up. */
export function openPowerUpEffectPreview(
  scene: Scene,
  powerUpId: PowerUpId,
  fighter: Scribbit,
  trigger: HTMLElement,
  onDestroy: () => void
): PowerUpEffectPreview {
  const definition = POWER_UP_CATALOG[powerUpId];
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 700);
  const accentColor = RARITY_COLORS[definition.rarity];
  const reducedMotion = prefersReducedMotion();
  let destroyed = false;
  let battlePreview: SandboxBattlePreview | null = null;

  const close = (): void => {
    shell.finish(() => undefined);
  };

  const shell = createStickerModalShell({
    scene,
    title: `${definition.name} effect preview`,
    description: `${definition.name}. When ${definition.when}; then ${definition.effect}.`,
    onRequestClose: close,
    trigger,
    depth: 5200,
    cardCenterY: centerY,
    cardWidth: width - 100,
    cardHeight: 740,
    shadeAlpha: 0.78,
    tapeWidth: 150,
    openingDurationMilliseconds: reducedMotion ? 1 : 240,
    blockCard: true,
    onDestroy: () => {
      if (destroyed) return;
      destroyed = true;
      battlePreview?.destroy();
      battlePreview = null;
      onDestroy();
    },
  });

  const card = shell.card;
  const incomingTriggers = new Set([
    'incoming-basic',
    'incoming-signature',
    'enemy-signature',
    'below-half-hearts',
    'lethal-hit',
  ]);
  const result =
    (definition.maximumHitPointHealingPermille ?? 0) > 0
      ? 'healing'
      : (definition.preventedDamagePermille ?? 0) > 0
        ? 'shield'
        : 'damage';
  battlePreview = createSandboxBattlePreview({
    scene,
    parent: card,
    fighter,
    x: 0,
    y: -112,
    width: width - 190,
    height: 270,
    accentColor,
    direction: incomingTriggers.has(definition.trigger)
      ? 'dummy-attacks'
      : 'fighter-attacks',
    result,
    cue: definition.shortName,
    effectLabel: effectResultLabel(powerUpId),
    effectStyle: effectStyle(powerUpId),
    mode: 'power-up',
    powerUpId,
    resultIcon: effectIcon(powerUpId),
  });

  const rarity = label(
    scene,
    0,
    -296,
    `${definition.rarity.toUpperCase()} · ${definition.buildPath.toUpperCase()} BUILD`,
    18,
    UI.coralText,
    true
  );
  const title = label(scene, 0, 44, definition.name, 36, UI.ink, true);
  const triggerLabel = label(scene, 0, 104, `WHEN · ${definition.when}`, 19, UI.ink, true)
    .setWordWrapWidth(width - 180)
    .setLineSpacing(3);
  const effectLabel = label(scene, 0, 180, `THEN · ${definition.effect}`, 21, UI.coralText, true)
    .setWordWrapWidth(width - 180)
    .setLineSpacing(3);
  const helper = label(
    scene,
    0,
    247,
    'LIVE TRAINING LOOP · 0 XP · NOTHING SAVED',
    TYPE.caption,
    UI.inkSoft,
    true
  );
  const closeButton = ghostButton(scene, 0, 318, 'CLOSE', close, 220);
  card.add([rarity, title, triggerLabel, effectLabel, helper, closeButton]);

  const closeControl = shell.actions.add({
    label: `Close ${definition.name} effect preview`,
    rect: {
      x: width / 2 - 110,
      y: centerY + 268,
      width: 220,
      height: 100,
    },
    pointerPassthrough: true,
    onActivate: close,
  });
  shell.shade.on('pointerup', close);

  shell.open(() => shell.actions.focusInitial(closeControl));
  return Object.freeze({ destroy: () => shell.destroy() });
}
