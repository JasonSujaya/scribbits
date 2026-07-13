import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import {
  chooseWeaponFxQuality,
  planWeaponFxCue,
  resolveWeaponFxProfile,
  type WeaponFxPhase,
  type WeaponFxProfile,
  type WeaponFxQuality,
} from './weaponfxpresentation';
import {
  createWeaponFxShader,
  weaponFxPhaseUniform,
  type WeaponFxShaderUniforms,
} from './weaponfxshader';

type FighterSide = 'a' | 'b';

type WeaponFxRuntime = {
  profile: WeaponFxProfile;
  shader: Phaser.GameObjects.Shader | null;
  fallback: Phaser.GameObjects.Graphics;
  uniforms: WeaponFxShaderUniforms;
  phase: WeaponFxPhase;
  elapsedMilliseconds: number;
  durationMilliseconds: number;
  active: boolean;
};

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

const EFFECT_UPDATE_MILLISECONDS = 1000 / 30;
const PI = Math.PI;

const browserWeaponFxQuality = (
  scene: Scene,
  reduceMotion: boolean
): WeaponFxQuality => {
  const browserNavigator =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithDeviceMemory);
  const override =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('weapon-fx');
  return chooseWeaponFxQuality({
    webgl: scene.game.renderer.type === Phaser.WEBGL,
    reduceMotion,
    ...(browserNavigator?.hardwareConcurrency !== undefined
      ? { hardwareConcurrency: browserNavigator.hardwareConcurrency }
      : {}),
    ...(browserNavigator?.deviceMemory !== undefined
      ? { deviceMemoryGigabytes: browserNavigator.deviceMemory }
      : {}),
    override,
  });
};

export class WeaponFxRenderer {
  readonly quality: WeaponFxQuality;
  private readonly scene: Scene;
  private readonly reduceMotion: boolean;
  private readonly runtimes = new Map<FighterSide, WeaponFxRuntime>();
  private updateAccumulatorMilliseconds = 0;

  constructor(scene: Scene, reduceMotion: boolean) {
    this.scene = scene;
    this.reduceMotion = reduceMotion;
    this.quality = browserWeaponFxQuality(scene, reduceMotion);
    this.scene.game.canvas.dataset.weaponFxQuality = this.quality;
    this.scene.game.canvas.dataset.activeWeaponFx = '0';
    this.scene.game.canvas.dataset.weaponFxPhase = 'idle';
  }

  attach(
    side: FighterSide,
    scribbit: Pick<Scribbit, 'accessories'>,
    x: number,
    y: number,
    facing: 1 | -1,
    fighterDisplaySize: number
  ): void {
    this.destroyRuntime(side);
    const profile = resolveWeaponFxProfile(scribbit);
    if (!profile) return;

    const fallback = this.scene.add
      .graphics()
      .setPosition(x, y)
      .setDepth(8)
      .setVisible(false);
    const uniforms: WeaponFxShaderUniforms = {
      progress: 0,
      intensity: 0,
      mode: profile.shaderMode,
      phase: 0,
      facing,
      quality: this.quality === 'full' ? 1 : 0,
      tint: profile.tint,
    };
    const shader =
      this.quality === 'off'
        ? null
        : createWeaponFxShader({
            scene: this.scene,
            uniforms,
            x,
            y,
            fighterDisplaySize,
            quality: this.quality,
          });
    this.runtimes.set(side, {
      profile,
      shader,
      fallback,
      uniforms,
      phase: 'telegraph',
      elapsedMilliseconds: 0,
      durationMilliseconds: 1,
      active: false,
    });
  }

  follow(side: FighterSide, x: number, y: number): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    runtime.shader?.setPosition(x, y);
    runtime.fallback.setPosition(x, y);
  }

  trigger(side: FighterSide, phase: WeaponFxPhase, critical = false): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    const cue = planWeaponFxCue(phase, critical);
    runtime.phase = phase;
    runtime.elapsedMilliseconds = 0;
    runtime.durationMilliseconds = cue.durationMilliseconds;
    runtime.active = true;
    runtime.uniforms.progress = 0;
    runtime.uniforms.phase = weaponFxPhaseUniform(phase);
    runtime.uniforms.intensity = cue.intensity;
    runtime.shader?.setVisible(true);
    runtime.fallback.setVisible(runtime.shader === null);
    if (runtime.shader === null) {
      this.drawFallback(runtime, this.reduceMotion ? 0.62 : 0);
    }
    this.updateDebugState();
  }

  update(deltaMilliseconds: number, playbackSpeed: number): void {
    this.updateAccumulatorMilliseconds += Math.max(0, deltaMilliseconds);
    if (this.updateAccumulatorMilliseconds < EFFECT_UPDATE_MILLISECONDS) return;
    const elapsed = this.updateAccumulatorMilliseconds * playbackSpeed;
    this.updateAccumulatorMilliseconds %= EFFECT_UPDATE_MILLISECONDS;

    for (const runtime of this.runtimes.values()) {
      if (!runtime.active) continue;
      runtime.elapsedMilliseconds += elapsed;
      const progress = Math.min(
        1,
        runtime.elapsedMilliseconds / runtime.durationMilliseconds
      );
      runtime.uniforms.progress = progress;
      if (runtime.shader === null && !this.reduceMotion) {
        this.drawFallback(runtime, progress);
      }
      if (progress >= 1) this.deactivate(runtime);
    }
    this.updateDebugState();
  }

  stopAll(): void {
    for (const runtime of this.runtimes.values()) this.deactivate(runtime);
    this.updateDebugState();
  }

  destroy(): void {
    for (const side of [...this.runtimes.keys()]) this.destroyRuntime(side);
    this.runtimes.clear();
    this.scene.game.canvas.dataset.activeWeaponFx = '0';
    this.scene.game.canvas.dataset.weaponFxPhase = 'idle';
  }

  private drawFallback(runtime: WeaponFxRuntime, progress: number): void {
    const graphics = runtime.fallback;
    const color = runtime.profile.fallbackColor;
    const pulse = Math.sin(Math.max(0, Math.min(1, progress)) * PI);
    const alpha = 0.45 + pulse * 0.45;
    graphics.clear().lineStyle(7, color, alpha);

    switch (runtime.profile.shaderMode) {
      case 0: {
        const sweep = -100 + progress * 200;
        graphics.lineBetween(sweep - 70, 74, sweep + 70, -74);
        graphics.lineStyle(3, 0xfff4d6, alpha * 0.8);
        graphics.lineBetween(sweep - 58, 80, sweep + 82, -68);
        break;
      }
      case 1:
        graphics.strokeCircle(0, 0, 26 + progress * 104);
        graphics.lineStyle(3, 0xfff4d6, alpha * 0.7);
        graphics.strokeCircle(0, 0, 18 + progress * 72);
        break;
      case 2:
        for (let lineIndex = -2; lineIndex <= 2; lineIndex += 1) {
          graphics.lineBetween(-132, lineIndex * 20, 58, lineIndex * 12);
        }
        break;
      case 3:
        graphics.strokeCircle(0, 0, 76 - pulse * 30);
        graphics.lineBetween(-108, 0, 108, 0);
        graphics.lineBetween(0, -108, 0, 108);
        break;
      case 4:
        graphics.strokeCircle(0, 0, 34 + progress * 82);
        graphics.lineStyle(4, 0x19cfe6, alpha);
        graphics.strokeCircle(0, 0, 22 + progress * 58);
        break;
      case 5:
        graphics.strokeRoundedRect(-80, -96, 160, 192, 54);
        break;
      case 6:
        graphics.lineBetween(-88, -88, 88, 88);
        graphics.lineBetween(88, -88, -88, 88);
        graphics.strokeCircle(0, 0, 52);
        break;
      default:
        for (let ray = 0; ray < 8; ray += 1) {
          const angle = (ray / 8) * PI * 2;
          graphics.lineBetween(
            Math.cos(angle) * 36,
            Math.sin(angle) * 36,
            Math.cos(angle) * (82 + pulse * 24),
            Math.sin(angle) * (82 + pulse * 24)
          );
        }
    }
  }

  private deactivate(runtime: WeaponFxRuntime): void {
    runtime.active = false;
    runtime.uniforms.intensity = 0;
    runtime.shader?.setVisible(false);
    runtime.fallback.clear().setVisible(false);
  }

  private destroyRuntime(side: FighterSide): void {
    const runtime = this.runtimes.get(side);
    if (!runtime) return;
    runtime.shader?.destroy();
    runtime.fallback.destroy();
    this.runtimes.delete(side);
  }

  private updateDebugState(): void {
    const active = [...this.runtimes.values()].filter(
      (runtime) => runtime.active
    );
    this.scene.game.canvas.dataset.activeWeaponFx = String(active.length);
    this.scene.game.canvas.dataset.weaponFxPhase =
      active.map((runtime) => runtime.phase).join(',') || 'idle';
    this.scene.game.canvas.dataset.weaponFxIds =
      active.map((runtime) => runtime.profile.weaponId).join(',') || 'none';
  }
}
