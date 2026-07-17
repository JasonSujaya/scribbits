import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type {
  BattleTimelineEvent,
  CombatRole,
} from '../../shared/combat/types';
import {
  starterWeaponTextureForRole,
  type HeldWeaponVisual,
} from './heldweaponpresentation';
import { ROLE_STYLES } from './theme';

export type RoleWeaponAttack = Extract<
  BattleTimelineEvent,
  { kind: 'role_attack' }
>['attack'];

export type RoleWeaponLayers = {
  rear: Phaser.GameObjects.Container;
  front: Phaser.GameObjects.Container;
};

export type AttachedRoleWeapon = {
  role: CombatRole;
  playAttack: (attack: RoleWeaponAttack) => void;
  destroy: () => void;
};

type WeaponMount = Readonly<{
  x: number;
  y: number;
  angle: number;
  maximumWidth?: number;
  maximumHeight?: number;
}>;

type MountedWeapon = {
  motion: Phaser.GameObjects.Container;
};

const STARTER_MOUNTS: Readonly<
  Record<Exclude<CombatRole, 'gunner'>, WeaponMount>
> = Object.freeze({
  brawler: { x: 46, y: 10, angle: -7, maximumWidth: 116 },
  longshot: { x: 45, y: 0, angle: 0, maximumHeight: 116 },
  mage: { x: 48, y: -8, angle: -12, maximumWidth: 120 },
});

const EQUIPPED_WEAPON_MOUNTS: Readonly<Record<string, WeaponMount>> =
  Object.freeze({
    'inkquake-rumble-belt': {
      x: 0,
      y: 32,
      angle: 0,
      maximumWidth: 94,
    },
  });

const DEFAULT_EQUIPPED_WEAPON_MOUNT: WeaponMount = Object.freeze({
  x: 43,
  y: 4,
  angle: 56,
  maximumHeight: 104,
});

/**
 * Mounts the real lead Weapon used by combat. An empty Weapon loadout gets a
 * generated wooden starter prop for its role, so equipping and unequipping
 * visibly replaces the held item without changing the authoritative fight.
 */
export function createAttachedRoleWeapon(
  scene: Scene,
  layers: RoleWeaponLayers,
  role: CombatRole,
  heldWeapon: HeldWeaponVisual | null,
  fighterDisplaySize: number,
  facing: 1 | -1,
  reduceMotion: boolean
): AttachedRoleWeapon {
  const fighterScale = Math.max(0.72, fighterDisplaySize / 220);
  const mountedWeapons: MountedWeapon[] = [];

  const addImage = (
    textureKey: string,
    frame: string | undefined,
    mountConfig: WeaponMount
  ): void => {
    const motion = scene.add.container(0, 0);
    const mount = scene.add
      .container(
        mountConfig.x * facing * fighterScale,
        mountConfig.y * fighterScale
      )
      .setScale(facing * fighterScale, fighterScale);
    const image = scene.add.image(0, 0, textureKey, frame);
    fitWeaponImage(image, mountConfig);
    image.setAngle(mountConfig.angle);
    mount.add(image);
    motion.add(mount);
    layers.front.add(motion);
    mountedWeapons.push({ motion });
  };

  const hasEquippedWeaponArt =
    heldWeapon !== null &&
    scene.textures.exists(heldWeapon.textureKey) &&
    scene.textures.get(heldWeapon.textureKey).has(heldWeapon.frame);

  if (heldWeapon && hasEquippedWeaponArt) {
    addImage(
      heldWeapon.textureKey,
      heldWeapon.frame,
      EQUIPPED_WEAPON_MOUNTS[heldWeapon.gearId] ?? DEFAULT_EQUIPPED_WEAPON_MOUNT
    );
  } else {
    const starterTexture = starterWeaponTextureForRole(role);
    if (
      role !== 'gunner' &&
      starterTexture &&
      scene.textures.exists(starterTexture)
    ) {
      addImage(starterTexture, undefined, STARTER_MOUNTS[role]);
    } else if (role === 'gunner') {
      addLegacyGunnerBlaster(
        scene,
        layers.front,
        mountedWeapons,
        fighterScale,
        facing
      );
    }
  }

  const playAttack = (attack: RoleWeaponAttack): void => {
    if (reduceMotion || mountedWeapons.length === 0) return;
    const motionTargets = mountedWeapons.map(({ motion }) => motion);
    for (const target of motionTargets) {
      scene.tweens.killTweensOf(target);
      target.setPosition(0, 0).setScale(1).setAngle(0);
    }

    const isBrawler = role === 'brawler' || attack === 'body_slam';
    const isLongshot = role === 'longshot' || attack === 'piercing_quill';
    const isMage = role === 'mage' || attack === 'color_bolt';
    scene.tweens.add({
      targets: motionTargets,
      x: isBrawler ? facing * 9 : isLongshot ? -facing * 15 : facing * 5,
      y: isBrawler ? -2 : isMage ? -12 : 1,
      angle: isBrawler ? facing * 7 : isLongshot ? -facing * 9 : facing * 10,
      scaleX: isBrawler ? 1.08 : isLongshot ? 0.9 : 1.12,
      scaleY: isMage ? 1.12 : 1,
      duration: isBrawler ? 90 : isLongshot ? 118 : 132,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        for (const target of motionTargets) {
          target.setPosition(0, 0).setScale(1).setAngle(0);
        }
      },
    });
  };

  return {
    role,
    playAttack,
    destroy: () => {
      for (const { motion } of mountedWeapons) {
        scene.tweens.killTweensOf(motion);
        motion.destroy(true);
      }
    },
  };
}

function fitWeaponImage(
  image: Phaser.GameObjects.Image,
  mountConfig: WeaponMount
): void {
  if (mountConfig.maximumWidth !== undefined) {
    const scale = mountConfig.maximumWidth / Math.max(1, image.width);
    image.setDisplaySize(
      mountConfig.maximumWidth,
      Math.max(1, image.height * scale)
    );
    return;
  }

  const maximumHeight = mountConfig.maximumHeight ?? 100;
  const scale = maximumHeight / Math.max(1, image.height);
  image.setDisplaySize(Math.max(1, image.width * scale), maximumHeight);
}

function addLegacyGunnerBlaster(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  mountedWeapons: MountedWeapon[],
  fighterScale: number,
  facing: 1 | -1
): void {
  const motion = scene.add.container(0, 0);
  const mount = scene.add
    .container(20 * facing * fighterScale, 4 * fighterScale)
    .setScale(facing * fighterScale, fighterScale);
  const graphics = scene.add.graphics();
  drawLegacyBlaster(graphics, ROLE_STYLES.gunner.color);
  mount.add(graphics);
  motion.add(mount);
  layer.add(motion);
  mountedWeapons.push({ motion });
}

const INK_OUTLINE = 0x2d211a;
const PAPER = 0xfff4d6;

function drawLegacyBlaster(
  graphics: Phaser.GameObjects.Graphics,
  color: number
): void {
  graphics.clear();
  graphics.lineStyle(4, INK_OUTLINE, 1);
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(-5, -8, 43, 24, 6);
  graphics.strokeRoundedRect(-5, -8, 43, 24, 6);
  graphics.fillStyle(PAPER, 1);
  graphics.fillRoundedRect(7, -3, 25, 8, 2);
  graphics.strokeRoundedRect(7, -3, 25, 8, 2);
  graphics.fillStyle(color, 1);
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(3, 14),
      new Phaser.Math.Vector2(18, 14),
      new Phaser.Math.Vector2(12, 36),
      new Phaser.Math.Vector2(0, 36),
    ],
    true
  );
  graphics.strokePoints(
    [
      new Phaser.Math.Vector2(3, 14),
      new Phaser.Math.Vector2(18, 14),
      new Phaser.Math.Vector2(12, 36),
      new Phaser.Math.Vector2(0, 36),
    ],
    true
  );
}
