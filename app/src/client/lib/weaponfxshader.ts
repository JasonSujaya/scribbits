import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { WeaponFxPhase, WeaponFxQuality } from './weaponfxpresentation';

export type WeaponFxShaderUniforms = {
  progress: number;
  intensity: number;
  mode: number;
  phase: number;
  facing: number;
  quality: number;
  rank: number;
  tint: readonly [number, number, number];
};

type ActiveWeaponFxQuality = Exclude<WeaponFxQuality, 'off'>;

export type WeaponFxShaderOptions = Readonly<{
  scene: Scene;
  uniforms: WeaponFxShaderUniforms;
  x: number;
  y: number;
  fighterDisplaySize: number;
  quality: ActiveWeaponFxQuality;
}>;

const WEAPON_FX_SHADER_NAME = 'ScribbitsWeaponFxV1';

// One transparent procedural shader covers all weapon families. Callers own
// cue timing and lifecycle; this module owns only the reusable Phaser shader
// definition, uniforms, bounded quad construction, and warm-up behavior.
const WEAPON_FX_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform float uProgress;
uniform float uIntensity;
uniform float uMode;
uniform float uPhase;
uniform float uFacing;
uniform float uQuality;
uniform float uRank;
uniform vec3 uTint;

float lineMask(float distanceToLine, float width) {
  return 1.0 - smoothstep(width, width + 0.025, distanceToLine);
}

float ringMask(float radius, float target, float width) {
  return lineMask(abs(radius - target), width);
}

float boxMask(vec2 point, vec2 halfSize) {
  vec2 edge = abs(point) - halfSize;
  return 1.0 - smoothstep(0.0, 0.025, max(edge.x, edge.y));
}

float bladeMask(vec2 point) {
  float blade = 1.0 - smoothstep(
    0.9,
    1.0,
    abs(point.x) / 0.34 + abs(point.y) / 0.075
  );
  float guard = boxMask(point + vec2(0.25, 0.0), vec2(0.026, 0.13));
  float handle = boxMask(point + vec2(0.34, 0.0), vec2(0.09, 0.035));
  return max(blade, max(guard, handle));
}

float hash21(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 point = (outTexCoord - 0.5) * 2.0;
  point.x *= uFacing;
  float progress = clamp(uProgress, 0.0, 1.0);
  float pulse = sin(progress * 3.14159265);
  float radius = length(point);
  float isBladeVolley = uMode > 2.5 && uMode < 3.5 ? 1.0 : 0.0;
  float effect = 0.0;
  vec3 color = uTint;

  if (uMode < 0.5) {
    float sweep = mix(-1.25, 1.25, progress);
    float slash = abs(point.x + point.y * 0.62 - sweep);
    float echoSlash = abs(point.x + point.y * 0.62 - sweep + 0.2);
    effect = lineMask(slash, 0.045) + lineMask(echoSlash, 0.018) * 0.55;
  } else if (uMode < 1.5) {
    float shockRadius = mix(0.08, 1.05, progress);
    effect = ringMask(radius, shockRadius, 0.055);
    effect += ringMask(radius, shockRadius * 0.7, 0.026) * 0.45;
  } else if (uMode < 2.5) {
    float trail = lineMask(abs(point.y) + max(0.0, point.x) * 0.12, 0.055);
    float speedBands = step(0.68, fract((point.y + 1.0) * 7.0 + progress * 3.0));
    effect = trail * speedBands * (1.0 - smoothstep(-0.9, 0.75, point.x));
  } else if (uMode < 3.5) {
    float travel = mix(-0.62, 0.46, progress);
    float topBlade = bladeMask(point - vec2(travel + 0.08, -0.34));
    float middleBlade = bladeMask(point - vec2(travel, 0.0));
    float bottomBlade = bladeMask(point - vec2(travel + 0.08, 0.34));
    float topTrail = lineMask(abs(point.y + 0.34), 0.016) *
      (1.0 - smoothstep(travel - 0.56, travel - 0.18, point.x));
    float middleTrail = lineMask(abs(point.y), 0.016) *
      (1.0 - smoothstep(travel - 0.62, travel - 0.2, point.x));
    float bottomTrail = lineMask(abs(point.y - 0.34), 0.016) *
      (1.0 - smoothstep(travel - 0.56, travel - 0.18, point.x));
    effect = topBlade + middleBlade + bottomBlade;
    effect += (topTrail + middleTrail + bottomTrail) * pulse * 0.5;
  } else if (uMode < 4.5) {
    float angle = atan(point.y, point.x) / 6.2831853 + 0.5;
    color = 0.55 + 0.45 * cos(6.2831853 * (angle + vec3(0.0, 0.33, 0.67) + progress));
    float prism = ringMask(radius, mix(0.18, 0.92, progress), 0.05);
    float sparkle = step(0.94, hash21(floor(point * 12.0) + progress));
    effect = prism + sparkle * pulse * uQuality * (1.0 - smoothstep(0.1, 1.0, radius));
  } else if (uMode < 5.5) {
    float shield = max(abs(point.x) * 0.84 + abs(point.y) * 0.58, radius * 0.82);
    effect = lineMask(abs(shield - mix(0.45, 0.82, pulse)), 0.035);
  } else if (uMode < 6.5) {
    float aperture = abs(abs(point.x) - abs(point.y));
    effect = lineMask(aperture, 0.026) * (1.0 - smoothstep(0.2, 0.95, radius));
    effect += ringMask(radius, 0.46, 0.022) * pulse;
  } else {
    float rays = abs(sin(atan(point.y, point.x) * 8.0));
    float star = (1.0 - smoothstep(0.0, 0.22, rays)) * (1.0 - smoothstep(0.28, 0.95, radius));
    effect = star * smoothstep(0.18, 0.5, radius) + ringMask(radius, 0.34 + pulse * 0.24, 0.03);
  }

  // All ranks share one shader and one bounded draw. Ranks 1-3 progressively
  // add a basic echo, 4-5 reveal same-pass detail, and rank 6 earns a red-star
  // signature without particles, textures, loops, or additional quads.
  if (uRank > 0.01) {
    float rankEcho = ringMask(radius, mix(0.2, 0.94, progress), 0.022);
    effect += rankEcho * uRank * mix(0.28, 0.035, isBladeVolley);
  }
  if (uRank > 0.42) {
    float enhanced = smoothstep(0.42, 0.62, uRank);
    effect += ringMask(radius, mix(0.12, 0.76, progress), 0.014) * enhanced * mix(0.42, 0.055, isBladeVolley);
    if (uQuality > 0.5) {
      float rankSparkle = step(0.955, hash21(floor(point * 11.0) + progress * 2.0));
      effect += rankSparkle * pulse * enhanced * (1.0 - smoothstep(0.18, 0.95, radius)) * 0.5;
    }
  }
  if (uRank > 0.99) {
    float redStarRays = 1.0 - smoothstep(0.0, 0.18, abs(sin(atan(point.y, point.x) * 5.0)));
    float redStarStrength = mix(0.65, 0.12, isBladeVolley);
    effect += redStarRays * (1.0 - smoothstep(0.24, 0.82, radius)) * redStarStrength;
    color = mix(color, vec3(1.0, 0.16, 0.08), 0.45 + pulse * 0.35);
  }

  float phaseBoost = mix(0.82, 1.0, step(0.5, uPhase));
  float alpha = clamp(effect * pulse * uIntensity * phaseBoost, 0.0, 0.92);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function weaponFxPhaseUniform(phase: WeaponFxPhase): number {
  if (phase === 'telegraph') return 0;
  if (phase === 'active') return 1;
  return 2;
}

export function createWeaponFxShader(
  input: WeaponFxShaderOptions
): Phaser.GameObjects.Shader {
  const effectSize = Phaser.Math.Clamp(
    Math.round(
      input.fighterDisplaySize * (input.quality === 'full' ? 1.7 : 1.45)
    ),
    300,
    420
  );
  const shader = input.scene.add
    .shader(
      {
        name: WEAPON_FX_SHADER_NAME,
        shaderName: WEAPON_FX_SHADER_NAME,
        fragmentSource: WEAPON_FX_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          setUniform('uProgress', input.uniforms.progress);
          setUniform('uIntensity', input.uniforms.intensity);
          setUniform('uMode', input.uniforms.mode);
          setUniform('uPhase', input.uniforms.phase);
          setUniform('uFacing', input.uniforms.facing);
          setUniform('uQuality', input.uniforms.quality);
          setUniform('uRank', input.uniforms.rank);
          setUniform('uTint', input.uniforms.tint);
        },
      },
      input.x,
      input.y,
      effectSize,
      effectSize
    )
    .setDepth(8)
    .setBlendMode(Phaser.BlendModes.ADD);

  // Render one transparent warm-up frame while the FIGHT banner is loading,
  // then hide the quad until its first cue.
  input.scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
    if (shader.scene) shader.setVisible(false);
  });
  return shader;
}
