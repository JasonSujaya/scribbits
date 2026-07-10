// Pure presentation plans for drawing-selected Shape Powers.
//
// Replay owns Phaser objects and timing. This module owns names, readable
// first-reveal copy, and deterministic geometry so every power can be tested
// without booting a scene.

import { ABILITY_CONFIG_BY_POWER } from '../../shared/combat';
import type {
  DamageSource,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';

export type ScreenPoint = Readonly<{ x: number; y: number }>;

export type ShapePowerVisualEffect = Readonly<{
  power: PrimaryPower;
  phase: 'telegraph' | 'active';
  startTick: number;
  endTick: number;
  aimDirection: FixedVector;
}>;

export type ShapePowerDrawCommand =
  | Readonly<{
      kind: 'stroke-circle';
      center: ScreenPoint;
      radius: number;
      lineWidth: number;
      color: number;
      alpha: number;
    }>
  | Readonly<{
      kind: 'line';
      start: ScreenPoint;
      end: ScreenPoint;
      lineWidth: number;
      color: number;
      alpha: number;
    }>
  | Readonly<{
      kind: 'fill-circle';
      center: ScreenPoint;
      radius: number;
      color: number;
      alpha: number;
    }>
  | Readonly<{
      kind: 'fill-triangle';
      first: ScreenPoint;
      second: ScreenPoint;
      third: ScreenPoint;
      color: number;
      alpha: number;
    }>;

export type ShapePowerVisualInput = Readonly<{
  effect: ShapePowerVisualEffect;
  frameTick: number;
  fighterCenter: ScreenPoint;
  activationCenter: ScreenPoint;
  primaryColor: number;
  colorburstPalette: readonly [number, number, number];
}>;

export type ShapePowerCalloutInput = Readonly<{
  side: 'a' | 'b';
  actorCenter: ScreenPoint;
  opponentCenter: ScreenPoint;
  firstReveal: boolean;
  viewportWidth: number;
  viewportHeight: number;
}>;

export type ShapePowerCalloutPlan = Readonly<{
  position: ScreenPoint;
  fontSize: number;
}>;

const revealLineByPower: Readonly<Record<PrimaryPower, string>> = {
  inkquake: 'Impact shockwave',
  nib_halo: '3 orbiting quills',
  smearstep: 'Dashes twice',
  colorburst: 'Cone · then echo',
};

const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(maximum, Math.max(minimum, value));
};

const normalizedDirection = (direction: FixedVector): ScreenPoint => {
  const length = Math.max(1, Math.hypot(direction.x, direction.y));
  return { x: direction.x / length, y: direction.y / length };
};

const pointAlong = (
  center: ScreenPoint,
  direction: ScreenPoint,
  distance: number
): ScreenPoint => {
  return {
    x: center.x + direction.x * distance,
    y: center.y + direction.y * distance,
  };
};

export function getShapePowerDisplayName(power: PrimaryPower): string {
  return ABILITY_CONFIG_BY_POWER[power].displayName;
}

export function getShapePowerRevealCopy(power: PrimaryPower): string {
  return `${getShapePowerDisplayName(power).toUpperCase()}!\n${revealLineByPower[power].toUpperCase()}`;
}

export function getDamageSourceDisplayName(source: DamageSource): string {
  if (source === 'colorburst_echo') return 'Colorburst Echo';
  if (source === 'ember_burn') return 'Ember afterburn';
  if (source === 'nib_wall_recoil') return 'recoiling nib';
  if (source === 'contact') return 'body check';
  return getShapePowerDisplayName(source);
}

export function buildShapePowerDrawCommands(
  input: ShapePowerVisualInput
): readonly ShapePowerDrawCommand[] {
  const { effect } = input;
  const duration = Math.max(1, effect.endTick - effect.startTick);
  const progress = clamp((input.frameTick - effect.startTick) / duration, 0, 1);
  const phaseAlpha =
    effect.phase === 'telegraph' ? 0.38 + progress * 0.34 : 0.78;

  if (effect.power === 'inkquake') {
    const center = input.activationCenter;
    if (effect.phase === 'telegraph') {
      return [0, 1].map((ringIndex) => ({
        kind: 'stroke-circle' as const,
        center,
        radius: 38 + ringIndex * 18 + progress * 14,
        lineWidth: ringIndex === 0 ? 7 : 4,
        color: input.primaryColor,
        alpha: phaseAlpha - ringIndex * 0.12,
      }));
    }
    return [0, 1, 2].map((ringIndex) => ({
      kind: 'stroke-circle' as const,
      center,
      radius: 34 + progress * 142 - ringIndex * 24,
      lineWidth: 10 - ringIndex * 2,
      color: input.primaryColor,
      alpha: Math.max(0.18, phaseAlpha - ringIndex * 0.18),
    }));
  }

  if (effect.power === 'nib_halo') {
    const commands: ShapePowerDrawCommand[] = [];
    const orbitRadius = effect.phase === 'telegraph' ? 54 : 82;
    for (let nibIndex = 0; nibIndex < 3; nibIndex += 1) {
      const angle = input.frameTick * 0.22 + (Math.PI * 2 * nibIndex) / 3;
      const outward = { x: Math.cos(angle), y: Math.sin(angle) };
      const perpendicular = { x: -outward.y, y: outward.x };
      const nibCenter = pointAlong(input.fighterCenter, outward, orbitRadius);
      const tip = pointAlong(nibCenter, outward, 28);
      const baseCenter = pointAlong(nibCenter, outward, -20);
      commands.push({
        kind: 'fill-triangle',
        first: tip,
        second: pointAlong(baseCenter, perpendicular, 11),
        third: pointAlong(baseCenter, perpendicular, -11),
        color: input.primaryColor,
        alpha: phaseAlpha,
      });
      commands.push({
        kind: 'fill-circle',
        center: nibCenter,
        radius: 7,
        color: 0x2b2016,
        alpha: phaseAlpha,
      });
    }
    return commands;
  }

  const aim = normalizedDirection(effect.aimDirection);
  if (effect.power === 'smearstep') {
    const commands: ShapePowerDrawCommand[] = [];
    const perpendicular = { x: -aim.y, y: aim.x };
    for (let streakIndex = 0; streakIndex < 4; streakIndex += 1) {
      const laneOffset = (streakIndex - 1.5) * 13;
      const start = {
        x:
          input.fighterCenter.x -
          aim.x * (30 + streakIndex * 10) +
          perpendicular.x * laneOffset,
        y:
          input.fighterCenter.y -
          aim.y * (30 + streakIndex * 10) +
          perpendicular.y * laneOffset,
      };
      commands.push({
        kind: 'line',
        start,
        end: pointAlong(start, aim, -(48 + progress * 54)),
        lineWidth: Math.max(3, 8 - streakIndex),
        color: input.primaryColor,
        alpha: phaseAlpha / (1 + streakIndex * 0.28),
      });
    }
    return commands;
  }

  const perpendicular = { x: -aim.y, y: aim.x };
  const range = effect.phase === 'telegraph' ? 108 : 168;
  const halfWidth = effect.phase === 'telegraph' ? 46 : 84;
  const commands: ShapePowerDrawCommand[] = [];
  input.colorburstPalette.forEach((color, colorIndex) => {
    const layerScale = 1 - colorIndex * 0.17;
    commands.push({
      kind: 'fill-triangle',
      first: input.fighterCenter,
      second: {
        x:
          input.fighterCenter.x +
          aim.x * range * layerScale +
          perpendicular.x * halfWidth * layerScale,
        y:
          input.fighterCenter.y +
          aim.y * range * layerScale +
          perpendicular.y * halfWidth * layerScale,
      },
      third: {
        x:
          input.fighterCenter.x +
          aim.x * range * layerScale -
          perpendicular.x * halfWidth * layerScale,
        y:
          input.fighterCenter.y +
          aim.y * range * layerScale -
          perpendicular.y * halfWidth * layerScale,
      },
      color,
      alpha: (effect.phase === 'telegraph' ? 0.13 : 0.2) + colorIndex * 0.035,
    });
  });
  commands.push({
    kind: 'line',
    start: input.fighterCenter,
    end: pointAlong(input.fighterCenter, aim, range),
    lineWidth: 6,
    color: input.primaryColor,
    alpha: phaseAlpha,
  });
  return commands;
}

export function planShapePowerCallout(
  input: ShapePowerCalloutInput
): ShapePowerCalloutPlan {
  const desiredY = input.actorCenter.y - 165;
  const boundedY = clamp(desiredY, 390, input.viewportHeight - 360);
  const fightersOverlap =
    Math.abs(input.actorCenter.x - input.opponentCenter.x) < 190 &&
    Math.abs(input.actorCenter.y - input.opponentCenter.y) < 64;
  const useStableLane = input.firstReveal || fightersOverlap;

  return {
    position: {
      x: useStableLane
        ? input.viewportWidth * (input.side === 'a' ? 0.25 : 0.75)
        : input.actorCenter.x,
      y: boundedY,
    },
    fontSize: input.firstReveal ? 26 : 24,
  };
}
