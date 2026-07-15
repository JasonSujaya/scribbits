import type {
  CombatRole,
  CurrentCombatRole,
  DominantStat,
  PrimaryPower,
} from './types';

export type CombatRange = 'close' | 'long' | 'medium' | 'medium-long';
export type CombatRoleIcon = 'sword' | 'target' | 'gun' | 'spark';

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
  icon: CombatRoleIcon;
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

export const COMBAT_ROLE_IDS: readonly CurrentCombatRole[] = Object.freeze([
  'brawler',
  'longshot',
  'mage',
]);

const KNOWN_COMBAT_ROLE_IDS: readonly CombatRole[] = Object.freeze([
  ...COMBAT_ROLE_IDS,
  'gunner',
]);

export function toCurrentCombatRole(role: CombatRole): CurrentCombatRole {
  return role === 'gunner' ? 'longshot' : role;
}

export const COMBAT_ROLE_CONTENT: Readonly<
  Record<CurrentCombatRole, CombatRoleContent>
> = Object.freeze({
  brawler: Object.freeze({
    id: 'brawler',
    displayName: 'Brawler',
    dominantStat: 'chonk',
    signaturePower: 'inkquake',
    range: 'close',
    rangeLabel: 'CLOSE RANGE',
    drawingCue: 'Brown, coral, or orange ink',
    weaponName: 'Ink Fists',
    basicAttackName: 'Body Slam',
    signatureName: 'Inkquake',
    behavior: 'Closes distance and breaks charged attacks.',
    strength: 'Closes on Mage before the cast completes.',
    weakness: 'Longshot can punish its direct approach.',
    icon: 'sword',
  }),
  longshot: Object.freeze({
    id: 'longshot',
    displayName: 'Longshot',
    dominantStat: 'spike',
    signaturePower: 'nib_halo',
    range: 'long',
    rangeLabel: 'LONG RANGE',
    drawingCue: 'Gold, green, or blue ink',
    weaponName: 'Quill Launcher',
    basicAttackName: 'Piercing Quill',
    signatureName: 'Nib Volley',
    behavior: 'Keeps its distance and lines up heavy quill shots.',
    strength: 'Lines up Brawler during its approach.',
    weakness: 'Mage shields and color zones spoil its clean shot.',
    icon: 'target',
  }),
  mage: Object.freeze({
    id: 'mage',
    displayName: 'Mage',
    dominantStat: 'charm',
    signaturePower: 'colorburst',
    range: 'medium-long',
    rangeLabel: 'RANGED MAGIC',
    drawingCue: 'Aqua, purple, or pink ink',
    weaponName: 'Palette Orb',
    basicAttackName: 'Color Bolt',
    signatureName: 'Colorburst',
    behavior: 'Channels a visible cast, releases it, then retreats.',
    strength: 'Blocks Longshot sightlines with barriers and color.',
    weakness: 'Brawler can interrupt its channel at close range.',
    icon: 'spark',
  }),
});

// Frozen presentation for archived v4-v6 Gunner reports. New Scribbits never
// select this role, but old replays keep the weapon and move they originally
// fought with instead of rewriting history.
const LEGACY_GUNNER_CONTENT: CombatRoleContent = Object.freeze({
  id: 'gunner',
  displayName: 'Gunner',
  dominantStat: 'zip',
  signaturePower: 'smearstep',
  range: 'medium',
  rangeLabel: 'MID RANGE',
  drawingCue: 'Legacy gold or green ink',
  weaponName: 'Ink Blaster',
  basicAttackName: 'Ink Burst',
  signatureName: 'Smearstep Barrage',
  behavior: 'Strafes, fires short bursts, and reloads in the open.',
  strength: 'Archived role from the four-class ruleset.',
  weakness: 'Archived role from the four-class ruleset.',
  icon: 'gun',
});

export const COMBAT_ROLE_ADVANTAGE: Readonly<
  Record<CurrentCombatRole, CurrentCombatRole>
> = Object.freeze({
  brawler: 'mage',
  mage: 'longshot',
  longshot: 'brawler',
});

export const COMBAT_ROLE_RULES: Readonly<
  Record<CurrentCombatRole, CombatRoleRules>
> = Object.freeze({
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
    basicAttackBaseDamage: 11,
    basicAttackStatDivisor: 11,
    burstShotCount: 1,
    burstShotIntervalTicks: 0,
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
    (KNOWN_COMBAT_ROLE_IDS as readonly string[]).includes(value)
  );
}

export function isCurrentCombatRole(
  value: unknown
): value is CurrentCombatRole {
  return (
    typeof value === 'string' &&
    (COMBAT_ROLE_IDS as readonly string[]).includes(value)
  );
}

export function getCombatRoleContent(role: CombatRole): CombatRoleContent {
  return role === 'gunner' ? LEGACY_GUNNER_CONTENT : COMBAT_ROLE_CONTENT[role];
}

export function getCombatRoleRules(role: CombatRole): CombatRoleRules {
  return COMBAT_ROLE_RULES[toCurrentCombatRole(role)];
}

export function getCombatRoleAdvantage(
  attacker: CombatRole,
  defender: CombatRole
): 'advantage' | 'disadvantage' | 'neutral' {
  const currentAttacker = toCurrentCombatRole(attacker);
  const currentDefender = toCurrentCombatRole(defender);
  if (COMBAT_ROLE_ADVANTAGE[currentAttacker] === currentDefender) {
    return 'advantage';
  }
  if (COMBAT_ROLE_ADVANTAGE[currentDefender] === currentAttacker) {
    return 'disadvantage';
  }
  return 'neutral';
}

export function createCombatRoleMatchupRead(
  challengerRole: CombatRole,
  rivalRole: CombatRole
): CombatRoleMatchupRead {
  const currentChallengerRole = toCurrentCombatRole(challengerRole);
  const currentRivalRole = toCurrentCombatRole(rivalRole);
  const challenger = getCombatRoleContent(currentChallengerRole);
  const rival = getCombatRoleContent(currentRivalRole);
  const edge = getCombatRoleAdvantage(currentChallengerRole, currentRivalRole);
  if (currentChallengerRole === currentRivalRole) {
    return Object.freeze({
      challengerRole: currentChallengerRole,
      rivalRole: currentRivalRole,
      pressure: 'mirror',
      label: `${challenger.displayName.toUpperCase()} MIRROR`,
      detail: `${challenger.rangeLabel} · TIMING DECIDES IT`,
    });
  }
  if (edge === 'advantage') {
    return Object.freeze({
      challengerRole: currentChallengerRole,
      rivalRole: currentRivalRole,
      pressure: 'challenger',
      label: `${challenger.displayName.toUpperCase()} BEATS ${rival.displayName.toUpperCase()}`,
      detail: challenger.strength.toUpperCase(),
    });
  }
  if (edge === 'disadvantage') {
    return Object.freeze({
      challengerRole: currentChallengerRole,
      rivalRole: currentRivalRole,
      pressure: 'rival',
      label: `${rival.displayName.toUpperCase()} BEATS ${challenger.displayName.toUpperCase()}`,
      detail: rival.strength.toUpperCase(),
    });
  }
  return Object.freeze({
    challengerRole: currentChallengerRole,
    rivalRole: currentRivalRole,
    pressure: 'neutral',
    label: `${challenger.displayName.toUpperCase()} vs ${rival.displayName.toUpperCase()}`,
    detail: `${challenger.rangeLabel} · ${rival.rangeLabel} · POSITIONING DECIDES IT`,
  });
}
