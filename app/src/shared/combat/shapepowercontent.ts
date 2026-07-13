// Player-facing Shape Power content shared by drawing, server reports, and
// replay. Combat numbers stay in config.ts; this file only owns stable names
// and concise explanations so presentation copy cannot drift between layers.

import type { CombatElement, DamageSource, PrimaryPower } from './types';

export type ShapePowerContent = Readonly<{
  displayName: string;
  drawingCue: string;
  fieldGuideCue: string;
  revealLine: string;
  receiptEffect: string;
  playerHint: string;
  noCleanHitCallout: string;
}>;

export type ShapeReceiptPlan = Readonly<{
  cause: string;
  move: string;
  effect: string;
  birthLine: string;
  battleLine: string;
}>;

export type ElementBattleCue = Readonly<{
  label: string;
  detail: string;
}>;

export const SHAPE_POWER_IDS: readonly PrimaryPower[] = Object.freeze([
  'inkquake',
  'nib_halo',
  'smearstep',
  'colorburst',
]);

export const SHAPE_POWER_CONTENT_BY_POWER: Readonly<
  Record<PrimaryPower, ShapePowerContent>
> = Object.freeze({
  inkquake: Object.freeze({
    displayName: 'Inkquake',
    drawingCue: 'Big, filled bodies',
    fieldGuideCue: 'More HP',
    revealLine: 'Shockwave + knockback',
    receiptEffect: 'Expanding shockwave',
    playerHint: 'Filled bodies launch an expanding shockwave.',
    noCleanHitCallout: 'RING ENDS',
  }),
  nib_halo: Object.freeze({
    displayName: 'Nib Halo',
    drawingCue: 'Sharp edges',
    fieldGuideCue: 'Sharp edge',
    revealLine: '3 quills + dead zone',
    receiptEffect: '3 rotating quills',
    playerHint: 'Jagged edges summon three rotating quills.',
    noCleanHitCallout: 'NIBS SETTLE',
  }),
  smearstep: Object.freeze({
    displayName: 'Smearstep',
    drawingCue: 'Small, compact shapes',
    fieldGuideCue: 'Faster move',
    revealLine: 'Predictive double dash',
    receiptEffect: 'Predictive double dash',
    playerHint: 'Compact shapes predict and dash twice.',
    noCleanHitCallout: 'DASH ENDS',
  }),
  colorburst: Object.freeze({
    displayName: 'Colorburst',
    drawingCue: 'More colors',
    fieldGuideCue: 'More crit',
    revealLine: 'Cone + delayed echo',
    receiptEffect: 'Cone + delayed echo',
    playerHint: 'More colors fire a cone and delayed echo.',
    noCleanHitCallout: 'CONE FADES',
  }),
});

// Element payloads already alter authoritative combat. These sixteen names
// expose that existing combination as recognizable authored content without
// adding power, entities, or a second ability-selection system.
export const SIGNATURE_MOVE_NAME_BY_ELEMENT: Readonly<
  Record<CombatElement, Readonly<Record<PrimaryPower, string>>>
> = Object.freeze({
  ember: Object.freeze({
    inkquake: 'Cinderquake',
    nib_halo: 'Firetip Halo',
    smearstep: 'Flashscrawl',
    colorburst: 'Wildfire Bloom',
  }),
  tide: Object.freeze({
    inkquake: 'Tidal Thump',
    nib_halo: 'Riptide Halo',
    smearstep: 'Slipstream',
    colorburst: 'Splashback',
  }),
  moss: Object.freeze({
    inkquake: 'Rootquake',
    nib_halo: 'Briar Halo',
    smearstep: 'Vine Skip',
    colorburst: 'Bloom Burst',
  }),
  storm: Object.freeze({
    inkquake: 'Thunderfold',
    nib_halo: 'Static Crown',
    smearstep: 'Bolt Scribble',
    colorburst: 'Prism Tempest',
  }),
});

export const ELEMENT_BATTLE_CUE_BY_ELEMENT: Readonly<
  Record<CombatElement, ElementBattleCue>
> = Object.freeze({
  ember: Object.freeze({ label: 'AFTERBURN', detail: 'CAPPED BURN' }),
  tide: Object.freeze({ label: 'RIPTIDE PUSH', detail: 'KNOCKBACK' }),
  moss: Object.freeze({ label: 'PAPER SHIELD', detail: 'BLOCKS DAMAGE' }),
  storm: Object.freeze({ label: 'QUICKCAST', detail: 'SHORT TELEGRAPH' }),
});

export function isShapePowerId(value: unknown): value is PrimaryPower {
  return (
    typeof value === 'string' &&
    (SHAPE_POWER_IDS as readonly string[]).includes(value)
  );
}

export function getShapePowerContent(power: PrimaryPower): ShapePowerContent {
  return SHAPE_POWER_CONTENT_BY_POWER[power];
}

export function getShapePowerDisplayName(power: PrimaryPower): string {
  return getShapePowerContent(power).displayName;
}

export function getShapePowerDrawingCue(power: PrimaryPower): string {
  const content = getShapePowerContent(power);
  return `${content.drawingCue} wake ${content.displayName}.`;
}

export function getShapePowerFieldGuideCue(power: PrimaryPower): string {
  const content = getShapePowerContent(power);
  return `${content.fieldGuideCue} · ${content.displayName}`;
}

export function getShapePowerSignatureName(
  element: CombatElement,
  power: PrimaryPower
): string {
  return SIGNATURE_MOVE_NAME_BY_ELEMENT[element][power];
}

/** One reusable receipt connecting a submitted shape to its combat behavior. */
export function planShapeReceipt(
  element: CombatElement,
  power: PrimaryPower
): ShapeReceiptPlan {
  const content = getShapePowerContent(power);
  const cause = content.drawingCue.toUpperCase();
  const move = getShapePowerSignatureName(element, power).toUpperCase();
  const effect = content.receiptEffect.toUpperCase();
  return Object.freeze({
    cause,
    move,
    effect,
    birthLine: `${cause} → ${move}`,
    battleLine: `${cause} → ${effect}`,
  });
}

export function getShapePowerRevealCopy(
  power: PrimaryPower,
  element?: CombatElement
): string {
  const content = getShapePowerContent(power);
  const moveName = element
    ? getShapePowerSignatureName(element, power)
    : content.displayName;
  return `${moveName.toUpperCase()}!\n${content.revealLine.toUpperCase()}`;
}

export function getShapePowerNoCleanHitCallout(power: PrimaryPower): string {
  return getShapePowerContent(power).noCleanHitCallout;
}

export function getElementBattleCue(element: CombatElement): ElementBattleCue {
  return ELEMENT_BATTLE_CUE_BY_ELEMENT[element];
}

export function getDamageSourceDisplayName(
  source: DamageSource,
  element?: CombatElement
): string {
  if (source === 'colorburst_echo') {
    return element
      ? `${getShapePowerSignatureName(element, 'colorburst')} Echo`
      : `${getShapePowerDisplayName('colorburst')} Echo`;
  }
  if (source === 'ember_burn') return 'Ember afterburn';
  if (source === 'nib_wall_recoil') return 'recoiling nib';
  if (source === 'contact') return 'body check';
  return element
    ? getShapePowerSignatureName(element, source)
    : getShapePowerDisplayName(source);
}
