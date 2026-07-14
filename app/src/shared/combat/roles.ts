import type { CombatRole, DominantStat, PrimaryPower } from './types';

export type CombatRange = 'close' | 'long' | 'medium' | 'medium-long';

export type CombatRoleContent = Readonly<{
  id: CombatRole;
  displayName: string;
  dominantStat: DominantStat;
  signaturePower: PrimaryPower;
  range: CombatRange;
  rangeLabel: string;
  drawingCue: string;
  weaponName: string;
  basicAttackName: string;
  signatureName: string;
  behavior: string;
  strength: string;
  weakness: string;
  icon: 'fist' | 'crosshair' | 'blaster' | 'orb';
}>;

export type CombatRoleRules = Readonly<{
  preferredRangeMinimum: number;
  preferredRangeMaximum: number;
  basicAttackCooldownTicks: number;
  basicAttackBaseDamage: number;
  basicAttackStatDivisor: number;
  burstShotCount: number;
  burstShotIntervalTicks: number;
}>;

export type CombatRoleMatchupRead = Readonly<{
  challengerRole: CombatRole;
  rivalRole: CombatRole;
  pressure: 'challenger' | 'rival' | 'neutral' | 'mirror';
  label: string;
  detail: string;
}>;

export const COMBAT_ROLE_IDS: readonly CombatRole[] = Object.freeze([
  'brawler',
  'longshot',
  'gunner',
  'mage',
]);

export const COMBAT_ROLE_CONTENT: Readonly<
  Record<CombatRole, CombatRoleContent>
> = Object.freeze({
  brawler: Object.freeze({
    id: 'brawler',
    displayName: 'Brawler',
    dominantStat: 'chonk',
    signaturePower: 'inkquake',
    range: 'close',
    rangeLabel: 'CLOSE RANGE',
    drawingCue: 'Big, filled bodies',
    weaponName: 'Ink Fists',
    basicAttackName: 'Body Slam',
    signatureName: 'Inkquake',
    behavior: 'Closes distance and breaks charged attacks.',
    strength: 'Closes on Mage before the cast completes.',
    weakness: 'Longshot can punish its direct approach.',
    icon: 'fist',
  }),
  longshot: Object.freeze({
    id: 'longshot',
    displayName: 'Longshot',
    dominantStat: 'spike',
    signaturePower: 'nib_halo',
    range: 'long',
    rangeLabel: 'LONG RANGE',
    drawingCue: 'Sharp, jagged edges',
    weaponName: 'Quill Launcher',
    basicAttackName: 'Piercing Quill',
    signatureName: 'Nib Volley',
    behavior: 'Keeps its distance and lines up heavy quill shots.',
    strength: 'Lines up Brawler during its approach.',
    weakness: 'Gunner pressure interrupts its slow aim.',
    icon: 'crosshair',
  }),
  gunner: Object.freeze({
    id: 'gunner',
    displayName: 'Gunner',
    dominantStat: 'zip',
    signaturePower: 'smearstep',
    range: 'medium',
    rangeLabel: 'MID RANGE',
    drawingCue: 'Small, compact shapes',
    weaponName: 'Ink Blaster',
    basicAttackName: 'Ink Burst',
    signatureName: 'Smearstep Barrage',
    behavior: 'Strafes, fires short bursts, and reloads in the open.',
    strength: 'Suppresses Longshot before the quill is ready.',
    weakness: 'Mage barriers and area attacks trap its firing lane.',
    icon: 'blaster',
  }),
  mage: Object.freeze({
    id: 'mage',
    displayName: 'Mage',
    dominantStat: 'charm',
    signaturePower: 'colorburst',
    range: 'medium-long',
    rangeLabel: 'RANGED MAGIC',
    drawingCue: 'Many distinct colors',
    weaponName: 'Palette Orb',
    basicAttackName: 'Color Bolt',
    signatureName: 'Colorburst',
    behavior: 'Channels a visible cast, releases it, then retreats.',
    strength: 'Controls Gunner firing lanes with barriers and color.',
    weakness: 'Brawler can interrupt its channel at close range.',
    icon: 'orb',
  }),
});

export const COMBAT_ROLE_ADVANTAGE: Readonly<Record<CombatRole, CombatRole>> =
  Object.freeze({
    brawler: 'mage',
    mage: 'gunner',
    gunner: 'longshot',
    longshot: 'brawler',
  });

export const COMBAT_ROLE_RULES: Readonly<Record<CombatRole, CombatRoleRules>> =
  Object.freeze({
    brawler: Object.freeze({
      preferredRangeMinimum: 0,
      preferredRangeMaximum: 1_400,
      basicAttackCooldownTicks: 16,
      basicAttackBaseDamage: 14,
      basicAttackStatDivisor: 6,
      burstShotCount: 1,
      burstShotIntervalTicks: 0,
    }),
    longshot: Object.freeze({
      preferredRangeMinimum: 4_500,
      preferredRangeMaximum: 6_500,
      basicAttackCooldownTicks: 44,
      basicAttackBaseDamage: 12,
      basicAttackStatDivisor: 11,
      burstShotCount: 1,
      burstShotIntervalTicks: 0,
    }),
    gunner: Object.freeze({
      preferredRangeMinimum: 2_800,
      preferredRangeMaximum: 4_200,
      basicAttackCooldownTicks: 48,
      basicAttackBaseDamage: 6,
      basicAttackStatDivisor: 18,
      burstShotCount: 3,
      burstShotIntervalTicks: 4,
    }),
    mage: Object.freeze({
      preferredRangeMinimum: 3_400,
      preferredRangeMaximum: 5_400,
      basicAttackCooldownTicks: 50,
      basicAttackBaseDamage: 8,
      basicAttackStatDivisor: 10,
      burstShotCount: 1,
      burstShotIntervalTicks: 0,
    }),
  });

export function isCombatRole(value: unknown): value is CombatRole {
  return (
    typeof value === 'string' &&
    (COMBAT_ROLE_IDS as readonly string[]).includes(value)
  );
}

export function getCombatRoleContent(role: CombatRole): CombatRoleContent {
  return COMBAT_ROLE_CONTENT[role];
}

export function getCombatRoleRules(role: CombatRole): CombatRoleRules {
  return COMBAT_ROLE_RULES[role];
}

export function getCombatRoleAdvantage(
  attacker: CombatRole,
  defender: CombatRole
): 'advantage' | 'disadvantage' | 'neutral' {
  if (COMBAT_ROLE_ADVANTAGE[attacker] === defender) return 'advantage';
  if (COMBAT_ROLE_ADVANTAGE[defender] === attacker) return 'disadvantage';
  return 'neutral';
}

export function createCombatRoleMatchupRead(
  challengerRole: CombatRole,
  rivalRole: CombatRole
): CombatRoleMatchupRead {
  const challenger = getCombatRoleContent(challengerRole);
  const rival = getCombatRoleContent(rivalRole);
  const edge = getCombatRoleAdvantage(challengerRole, rivalRole);
  if (challengerRole === rivalRole) {
    return Object.freeze({
      challengerRole,
      rivalRole,
      pressure: 'mirror',
      label: `${challenger.displayName.toUpperCase()} MIRROR`,
      detail: `${challenger.rangeLabel} · TIMING DECIDES IT`,
    });
  }
  if (edge === 'advantage') {
    return Object.freeze({
      challengerRole,
      rivalRole,
      pressure: 'challenger',
      label: `${challenger.displayName.toUpperCase()} PRESSURE`,
      detail: challenger.strength.toUpperCase(),
    });
  }
  if (edge === 'disadvantage') {
    return Object.freeze({
      challengerRole,
      rivalRole,
      pressure: 'rival',
      label: `${rival.displayName.toUpperCase()} PRESSURE`,
      detail: rival.strength.toUpperCase(),
    });
  }
  return Object.freeze({
    challengerRole,
    rivalRole,
    pressure: 'neutral',
    label: `${challenger.displayName.toUpperCase()} vs ${rival.displayName.toUpperCase()}`,
    detail: `${challenger.rangeLabel} · ${rival.rangeLabel} · POSITIONING DECIDES IT`,
  });
}
