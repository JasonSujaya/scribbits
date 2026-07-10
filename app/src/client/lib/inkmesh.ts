// Pure geometry and motion rules for the Phaser 4.2 Inkbody mesh.
//
// Keeping this module free of Phaser makes the relationship between drawing
// stats and motion deterministic, testable, and easy for future agents to
// understand. LiveSprite owns the renderer; this file owns the mesh data.

import type { ScribbitStats } from '../../shared/arena';

export const INK_MESH_SEGMENTS = 4;

export type SignatureTrait = 'chonk' | 'spike' | 'zip' | 'charm';

export const SIGNATURE_POWER: Record<
  SignatureTrait,
  { name: string; playerHint: string }
> = {
  chonk: { name: 'INKQUAKE', playerHint: 'Filled shape powers a heavy squash.' },
  spike: { name: 'QUILL RUSH', playerHint: 'Jagged edges power a sharp stretch.' },
  zip: { name: 'SMEARSTEP', playerHint: 'Compact ink powers a quick sidestep.' },
  charm: { name: 'COLORBURST', playerHint: 'More colors power a bright flourish.' },
};

export type InkMeshGeometry = {
  // x, y, u, v for every vertex. `vertices` is mutated in place each frame;
  // `restVertices` never changes and is the source of truth.
  vertices: number[];
  restVertices: number[];
  // a, b, c, texturePage for every triangle, matching Phaser 4.2 Mesh2D.
  indices: number[];
  pointsPerSide: number;
  width: number;
  height: number;
};

export type InkMeshMotion = {
  elapsedSeconds: number;
  awakenProgress: number; // 0 collapsed into an ink blot, 1 fully unfolded
  impactProgress: number; // 0 fresh impact, 1 settled
  impactDirection: 1 | -1;
  crumpleProgress: number;
  celebrateAmount: number;
  signatureAmount: number;
  signatureTrait: SignatureTrait;
  reduceMotion: boolean;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function getSignatureTrait(stats: ScribbitStats): SignatureTrait {
  const orderedTraits: SignatureTrait[] = ['chonk', 'spike', 'zip', 'charm'];
  return orderedTraits.reduce((winner, trait) => {
    return stats[trait] > stats[winner] ? trait : winner;
  }, orderedTraits[0] ?? 'chonk');
}

export function buildInkMeshGeometry(
  width: number,
  height: number,
  segments = INK_MESH_SEGMENTS
): InkMeshGeometry {
  const safeSegments = Math.max(1, Math.round(segments));
  const pointsPerSide = safeSegments + 1;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < pointsPerSide; row += 1) {
    const v = row / safeSegments;
    for (let column = 0; column < pointsPerSide; column += 1) {
      const u = column / safeSegments;
      vertices.push((u - 0.5) * width, (v - 0.5) * height, u, v);
    }
  }

  for (let row = 0; row < safeSegments; row += 1) {
    for (let column = 0; column < safeSegments; column += 1) {
      const topLeft = row * pointsPerSide + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + pointsPerSide;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, topRight, bottomLeft, 0);
      indices.push(topRight, bottomRight, bottomLeft, 0);
    }
  }

  return {
    vertices: [...vertices],
    restVertices: vertices,
    indices,
    pointsPerSide,
    width,
    height,
  };
}

export function updateInkMeshVertices(
  geometry: InkMeshGeometry,
  stats: ScribbitStats,
  motion: InkMeshMotion
): void {
  const wake = motion.reduceMotion ? 1 : easeOutCubic(clamp01(motion.awakenProgress));
  const ambientMotion = motion.reduceMotion ? 0 : 1;
  const impact = motion.reduceMotion ? 0 : 1 - clamp01(motion.impactProgress);
  const crumple = clamp01(motion.crumpleProgress);
  const flourish = motion.reduceMotion ? 0 : clamp01(motion.signatureAmount);
  const celebration = motion.reduceMotion ? 0 : clamp01(motion.celebrateAmount);

  const chonk = clamp01(stats.chonk / 60);
  const spike = clamp01(stats.spike / 60);
  const zip = clamp01(stats.zip / 60);
  const charm = clamp01(stats.charm / 60);
  const breathRate = 2.5 + zip * 1.8;
  const breathPixels = 1.8 + chonk * 4.2;
  const time = motion.elapsedSeconds;

  for (let vertexIndex = 0; vertexIndex < geometry.restVertices.length; vertexIndex += 4) {
    const restX = geometry.restVertices[vertexIndex] ?? 0;
    const restY = geometry.restVertices[vertexIndex + 1] ?? 0;
    const u = geometry.restVertices[vertexIndex + 2] ?? 0;
    const v = geometry.restVertices[vertexIndex + 3] ?? 0;
    const normalizedX = u * 2 - 1;
    const normalizedY = v * 2 - 1;
    const centerWeight = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);

    // Birth: unfold the actual drawing from one ink blot with a radial ripple.
    const distanceFromCenter = Math.hypot(normalizedX, normalizedY);
    const birthRipple =
      Math.sin(distanceFromCenter * 9 - wake * 12) * (1 - wake) * 18 * centerWeight;
    let x = restX * wake + normalizedX * birthRipple;
    let y = restY * wake + normalizedY * birthRipple;

    // Idle motion is stat-driven: Chonk breathes deeper and Zip breathes faster.
    const breath = Math.sin(time * breathRate + normalizedX * 0.9);
    y += breath * breathPixels * (0.3 + centerWeight * 0.7) * wake * (1 - crumple) * ambientMotion;
    x += Math.cos(time * breathRate * 0.72 + normalizedY) * breathPixels * 0.25 * centerWeight * ambientMotion;

    // A hit becomes a vertex ripple travelling away from the struck edge.
    if (impact > 0) {
      const sourceU = motion.impactDirection > 0 ? 0 : 1;
      const impactDistance = Math.hypot(u - sourceU, v - 0.55);
      const impactWave =
        Math.sin(impactDistance * 13 - motion.impactProgress * 14) *
        impact *
        (5 + chonk * 5);
      x += motion.impactDirection * impactWave * (0.35 + centerWeight);
      y -= impactWave * 0.32 * centerWeight;
    }

    // The dominant drawing stat controls a readable, deterministic silhouette.
    if (flourish > 0) {
      const pulse = Math.sin(flourish * Math.PI);
      if (motion.signatureTrait === 'chonk') {
        x *= 1 + pulse * (0.08 + chonk * 0.1);
        y += Math.abs(normalizedY) * pulse * 11;
      } else if (motion.signatureTrait === 'spike') {
        x += normalizedX * pulse * (10 + spike * 15);
        y *= 1 - pulse * 0.06;
      } else if (motion.signatureTrait === 'zip') {
        x += normalizedY * pulse * (9 + zip * 12);
      } else {
        const radial = 1 + pulse * (0.07 + charm * 0.1) * centerWeight;
        x *= radial;
        y *= radial;
      }
    }

    if (celebration > 0) {
      y -= Math.abs(Math.sin(time * 6 + normalizedX * 2.5)) * celebration * 7 * centerWeight;
    }

    // KO folds the upper paper toward the floor and pulls the silhouette inward.
    if (crumple > 0) {
      const topWeight = 1 - v;
      const floorY = geometry.height * 0.48 - topWeight * geometry.height * 0.08;
      x *= 1 - crumple * topWeight * 0.42;
      y += (floorY - y) * crumple * (0.35 + topWeight * 0.65);
    }

    geometry.vertices[vertexIndex] = x;
    geometry.vertices[vertexIndex + 1] = y;
    geometry.vertices[vertexIndex + 2] = u;
    geometry.vertices[vertexIndex + 3] = v;
  }
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
