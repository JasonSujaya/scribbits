import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { supportsStickerShine } from './stickerfxpresentation';

type StickerShineUniforms = {
  progress: number;
  intensity: number;
  tint: readonly [number, number, number];
};

export type StickerShineOptions = Readonly<{
  scene: Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  reduceMotion: boolean;
  tint: readonly [number, number, number];
  intensity: number;
}>;

export type StickerShineHandle = Readonly<{
  displayObject: Phaser.GameObjects.Shader;
  play: (durationMilliseconds?: number) => void;
  hide: () => void;
  destroy: () => void;
}>;

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

const STICKER_SHINE_SHADER_NAME = 'ScribbitsStickerShineV1';

// A single procedural quad supplies a reusable warm shine sweep. Keeping the
// shader texture-free avoids atlas/sampler artifacts while its soft vignette
// keeps the flash inside the sticker bounds. It remains short-lived and
// loop-free so it never becomes a full-screen post-processing cost.
const STICKER_SHINE_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform float uProgress;
uniform float uIntensity;
uniform vec3 uTint;

void main() {
  vec2 uv = outTexCoord;
  vec2 centered = abs(uv - 0.5) * 2.0;
  float progress = clamp(uProgress, 0.0, 1.0);
  float sweepCenter = mix(-0.34, 1.48, progress);
  float diagonal = uv.x + uv.y * 0.34;
  float distanceToSweep = abs(diagonal - sweepCenter);
  float softBand = 1.0 - smoothstep(0.055, 0.16, distanceToSweep);
  float brightCore = 1.0 - smoothstep(0.0, 0.042, distanceToSweep);
  float vignette = 1.0 - smoothstep(0.78, 1.0, max(centered.x, centered.y));
  float lifetime = 1.0 - abs(progress * 2.0 - 1.0);
  lifetime = smoothstep(0.0, 1.0, lifetime);
  float alpha = vignette * (softBand * 0.48 + brightCore * 0.72);
  alpha *= lifetime * clamp(uIntensity, 0.0, 1.0);
  alpha = clamp(alpha, 0.0, 1.0);
  vec3 color = mix(uTint, vec3(1.0, 0.97, 0.74), brightCore * 0.78);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function createStickerShine(
  input: StickerShineOptions
): StickerShineHandle | null {
  const browserNavigator =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithDeviceMemory);
  if (
    !supportsStickerShine({
      webgl: input.scene.game.renderer.type === Phaser.WEBGL,
      reduceMotion: input.reduceMotion,
      ...(browserNavigator?.hardwareConcurrency !== undefined
        ? { hardwareConcurrency: browserNavigator.hardwareConcurrency }
        : {}),
      ...(browserNavigator?.deviceMemory !== undefined
        ? { deviceMemoryGigabytes: browserNavigator.deviceMemory }
        : {}),
    })
  ) {
    return null;
  }

  const uniforms: StickerShineUniforms = {
    progress: 0,
    intensity: 0,
    tint: input.tint,
  };
  try {
    const shader = input.scene.add
      .shader(
        {
          name: STICKER_SHINE_SHADER_NAME,
          shaderName: STICKER_SHINE_SHADER_NAME,
          fragmentSource: STICKER_SHINE_FRAGMENT_SHADER,
          setupUniforms: (
            setUniform: (name: string, value: unknown) => void
          ) => {
            setUniform('uProgress', uniforms.progress);
            setUniform('uIntensity', uniforms.intensity);
            setUniform('uTint', uniforms.tint);
          },
        },
        input.x,
        input.y,
        input.width,
        input.height
      )
      .setDepth(input.depth)
      .setBlendMode(Phaser.BlendModes.ADD);

    let destroyed = false;
    const hide = (): void => {
      if (!destroyed && shader.scene) shader.setVisible(false);
    };
    const play = (durationMilliseconds = 700): void => {
      if (destroyed || !shader.scene) return;
      input.scene.tweens.killTweensOf(uniforms);
      uniforms.progress = 0;
      uniforms.intensity = Phaser.Math.Clamp(input.intensity, 0, 1);
      shader.setVisible(true);
      input.scene.tweens.add({
        targets: uniforms,
        progress: 1,
        duration: Phaser.Math.Clamp(durationMilliseconds, 240, 900),
        ease: 'Sine.easeInOut',
        onComplete: hide,
      });
    };
    const destroy = (): void => {
      if (destroyed) return;
      destroyed = true;
      input.scene.tweens.killTweensOf(uniforms);
      shader.destroy();
    };

    // Compile one transparent frame before the intro begins, then sleep until
    // the caller triggers the bounded sweep.
    input.scene.game.events.once(Phaser.Core.Events.POST_RENDER, hide);
    return { displayObject: shader, play, hide, destroy };
  } catch {
    return null;
  }
}
