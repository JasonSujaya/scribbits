import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type {
  BattleTimelineEvent,
  CombatRole,
} from '../../shared/combat/types';
import { ROLE_STYLES } from './theme';

type FighterSide = 'a' | 'b';
type RoleAttack = Extract<
  BattleTimelineEvent,
  { kind: 'role_attack' }
>['attack'];

type RoleWeaponRuntime = {
  role: CombatRole;
  facing: 1 | -1;
  scale: number;
  weapon: Phaser.GameObjects.Graphics;
  action: Phaser.GameObjects.Graphics;
};

/** Permanent, Gear-independent combat silhouettes for v4 role replays. */
export class RoleWeaponRenderer {
  private readonly scene: Scene;
  private readonly reduceMotion: boolean;
  private readonly runtimes = new Map<FighterSide, RoleWeaponRuntime>();

  constructor(scene: Scene, reduceMotion: boolean) {
    this.scene = scene;
    this.reduceMotion = reduceMotion;
  }

  attach(
    side: FighterSide,
    role: CombatRole,
    x: number,
    y: number,
    facing: 1 | -1,
    fighterDisplaySize: number
  ): void {
    this.destroyRuntime(side);
    const weapon = this.scene.add.graphics().setPosition(x, y).setDepth(11);
    const action = this.scene.add.graphics().setPosition(x, y).setDepth(12);
    const runtime: RoleWeaponRuntime = {
      role,
      facing,
      scale: Math.max(0.72, fighterDisplaySize / 220),
      weapon,
      action,
    };
    this.runtimes.set(side, runtime);
    this.drawWeapon(runtime);
    this.updateDebugState();
  }

  follow(side: FighterSide, x: number, y: number): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    runtime.weapon.setPosition(x, y);
    runtime.action.setPosition(x, y);
  }

  trigger(
    side: FighterSide,
    attack: RoleAttack,
    targetX: number,
    targetY: number,
    hit: boolean
  ): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    const localTargetX = targetX - runtime.action.x;
    const localTargetY = targetY - runtime.action.y;
    this.drawAction(runtime, attack, localTargetX, localTargetY, hit);
    runtime.action.setAlpha(1);
    if (this.reduceMotion) {
      this.scene.time.delayedCall(120, () => runtime.action.clear());
      return;
    }
    this.scene.tweens.killTweensOf(runtime.action);
    this.scene.tweens.add({
      targets: runtime.action,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        runtime.action.clear().setAlpha(1);
      },
    });
  }

  destroy(): void {
    for (const side of [...this.runtimes.keys()]) this.destroyRuntime(side);
    this.runtimes.clear();
    delete this.scene.game.canvas.dataset.roleWeapons;
  }

  private drawWeapon(runtime: RoleWeaponRuntime): void {
    const graphics = runtime.weapon;
    const facing = runtime.facing;
    const scale = runtime.scale;
    const color = ROLE_STYLES[runtime.role].color;
    graphics.clear();
    graphics.lineStyle(4 * scale, 0x2d211a, 1);
    graphics.fillStyle(color, 1);
    switch (runtime.role) {
      case 'brawler':
        graphics.fillCircle(-34 * scale, 14 * scale, 16 * scale);
        graphics.strokeCircle(-34 * scale, 14 * scale, 16 * scale);
        graphics.fillCircle(34 * scale, 14 * scale, 16 * scale);
        graphics.strokeCircle(34 * scale, 14 * scale, 16 * scale);
        break;
      case 'longshot': {
        const startX = 18 * facing * scale;
        const endX = 78 * facing * scale;
        graphics.lineStyle(12 * scale, color, 1);
        graphics.lineBetween(startX, 8 * scale, endX, 8 * scale);
        graphics.lineStyle(4 * scale, 0x2d211a, 1);
        graphics.lineBetween(startX, 8 * scale, endX, 8 * scale);
        graphics.fillTriangle(
          endX + 18 * facing * scale,
          8 * scale,
          endX - 5 * facing * scale,
          -5 * scale,
          endX - 5 * facing * scale,
          21 * scale
        );
        break;
      }
      case 'gunner': {
        const x = 34 * facing * scale;
        graphics.fillRoundedRect(
          x - (facing < 0 ? 38 : 0) * scale,
          -2 * scale,
          38 * scale,
          24 * scale,
          6 * scale
        );
        graphics.strokeRoundedRect(
          x - (facing < 0 ? 38 : 0) * scale,
          -2 * scale,
          38 * scale,
          24 * scale,
          6 * scale
        );
        graphics.lineBetween(
          x + 14 * facing * scale,
          20 * scale,
          x + 4 * facing * scale,
          42 * scale
        );
        break;
      }
      case 'mage':
        graphics.fillCircle(44 * facing * scale, -20 * scale, 17 * scale);
        graphics.strokeCircle(44 * facing * scale, -20 * scale, 17 * scale);
        graphics.lineStyle(3 * scale, 0x2d211a, 0.9);
        graphics.strokeCircle(44 * facing * scale, -20 * scale, 27 * scale);
        break;
    }
  }

  private drawAction(
    runtime: RoleWeaponRuntime,
    attack: RoleAttack,
    targetX: number,
    targetY: number,
    hit: boolean
  ): void {
    const graphics = runtime.action;
    const color = ROLE_STYLES[runtime.role].color;
    const alpha = hit ? 1 : 0.48;
    graphics.clear().lineStyle(7, color, alpha);
    if (attack === 'body_slam') {
      graphics.strokeCircle(0, 8, 52);
      graphics.strokeCircle(0, 8, 72);
      return;
    }
    if (attack === 'color_bolt') {
      graphics.fillStyle(color, alpha).fillCircle(targetX, targetY, 14);
      graphics.lineBetween(38 * runtime.facing, -18, targetX, targetY);
      return;
    }
    if (attack === 'smearstep_barrage') {
      for (const offset of [-12, 0, 12]) {
        graphics.lineBetween(
          34 * runtime.facing,
          offset,
          targetX,
          targetY + offset
        );
      }
      return;
    }
    graphics.lineBetween(34 * runtime.facing, 4, targetX, targetY);
    if (attack === 'piercing_quill' || attack === 'nib_volley') {
      graphics
        .fillStyle(color, alpha)
        .fillTriangle(
          targetX,
          targetY,
          targetX - 22 * runtime.facing,
          targetY - 10,
          targetX - 22 * runtime.facing,
          targetY + 10
        );
    } else {
      graphics.fillStyle(color, alpha).fillCircle(targetX, targetY, 8);
    }
  }

  private destroyRuntime(side: FighterSide): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    this.scene.tweens.killTweensOf(runtime.action);
    runtime.weapon.destroy();
    runtime.action.destroy();
    this.runtimes.delete(side);
  }

  private updateDebugState(): void {
    this.scene.game.canvas.dataset.roleWeapons = [...this.runtimes.entries()]
      .map(([side, runtime]) => `${side}:${runtime.role}`)
      .join(',');
  }
}
