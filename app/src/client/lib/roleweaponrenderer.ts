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
  action: Phaser.GameObjects.Graphics;
};

/** World-space attack marks kept separate from LiveSprite's attached weapon. */
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
    _fighterDisplaySize: number
  ): void {
    this.destroyRuntime(side);
    const action = this.scene.add.graphics().setPosition(x, y).setDepth(12);
    const runtime: RoleWeaponRuntime = {
      role,
      facing,
      action,
    };
    this.runtimes.set(side, runtime);
    this.updateDebugState();
  }

  follow(side: FighterSide, x: number, y: number): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
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
    runtime.action.setAlpha(1).setScale(1);
    this.scene.game.canvas.dataset.lastRoleAttack = `${side}:${runtime.role}:${attack}`;
    if (this.reduceMotion) {
      this.scene.time.delayedCall(600, () => runtime.action.clear());
      return;
    }
    this.scene.tweens.killTweensOf(runtime.action);
    this.scene.tweens.add({
      targets: runtime.action,
      alpha: 0,
      scale: attack === 'body_slam' ? 1.16 : 1.04,
      duration: 420,
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
      graphics.fillStyle(color, alpha * 0.28).fillCircle(0, 8, 48);
      graphics.strokeCircle(0, 8, 52);
      graphics.strokeCircle(0, 8, 72);
      graphics.lineStyle(11, color, alpha);
      graphics.beginPath();
      graphics.arc(0, 8, 86, -0.72, 0.72, false);
      graphics.strokePath();
      return;
    }
    if (attack === 'color_bolt') {
      const startX = 38 * runtime.facing;
      const startY = -18;
      graphics.lineStyle(3, color, alpha * 0.45);
      graphics.lineBetween(startX, startY, targetX, targetY);
      for (const progress of [0.25, 0.5, 0.75]) {
        graphics
          .fillStyle(color, alpha * progress)
          .fillCircle(
            startX + (targetX - startX) * progress,
            startY + (targetY - startY) * progress,
            4 + progress * 5
          );
      }
      graphics.fillStyle(0xffffff, alpha * 0.9).fillCircle(targetX, targetY, 8);
      graphics.fillStyle(color, alpha * 0.38).fillCircle(targetX, targetY, 24);
      graphics.lineStyle(6, color, alpha).strokeCircle(targetX, targetY, 18);
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
      const startX = 34 * runtime.facing;
      for (const progress of [0.35, 0.62, 0.88]) {
        const quillX = startX + (targetX - startX) * progress;
        const quillY = 4 + (targetY - 4) * progress;
        const length = 12 + progress * 16;
        graphics
          .fillStyle(color, alpha * progress)
          .fillTriangle(
            quillX + length * runtime.facing,
            quillY,
            quillX - length * 0.45 * runtime.facing,
            quillY - 9,
            quillX - length * 0.45 * runtime.facing,
            quillY + 9
          );
      }
    } else {
      graphics.fillStyle(color, alpha).fillCircle(targetX, targetY, 8);
    }
  }

  private destroyRuntime(side: FighterSide): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    this.scene.tweens.killTweensOf(runtime.action);
    runtime.action.destroy();
    this.runtimes.delete(side);
  }

  private updateDebugState(): void {
    this.scene.game.canvas.dataset.roleWeapons = [...this.runtimes.entries()]
      .map(([side, runtime]) => `${side}:${runtime.role}`)
      .join(',');
  }
}
