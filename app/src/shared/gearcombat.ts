import {
  ACCESSORY_EFFECTS,
  type AccessoryEffectFamily,
} from './accessoryeffects';
import {
  capsuleRarityRank,
  getAttachedGearRank,
  type CapsuleRarity,
  type GearRank,
  type Scribbit,
} from './arena';
import { findGearCosmetic, type CosmeticGearCatalogEntry } from './cosmetics';
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from './equipment';
import type { GearCombatModifiers, GearCombatSnapshot } from './combat';
import { hashStringToUint32 } from './stablehash';

export const GEAR_COMBAT_VERSION = 1 as const;

export const GEAR_RANK_STRENGTH_PERMILLE: Readonly<Record<GearRank, number>> =
  Object.freeze({
    1: 3,
    2: 7,
    3: 11,
    4: 16,
    5: 20,
    6: 24,
  });

export const GEAR_RARITY_STRENGTH_PERMILLE: Readonly<
  Record<CapsuleRarity, number>
> = Object.freeze({
  common: 0,
  rare: 6,
  epic: 11,
  legendary: 18,
});

const SUPPORT_STRENGTH_DIVISOR = 4;
const MAXIMUM_AXIS_DELTA_PERMILLE = 30;
const MAXIMUM_RESOLVED_LOADOUT_AXIS_DELTA_PERMILLE = 5;
const MAXIMUM_TIMING_DELTA_TICKS = 1;

export type GearTechniqueEffect = Readonly<{
  family: AccessoryEffectFamily;
  name: string;
  battleCue: string;
  modifiers: GearCombatModifiers;
  summary: string;
}>;

export type ResolvedGearTechnique = Readonly<{
  category: EquipmentCategory;
  effectFamily: AccessoryEffectFamily;
  supportEffectFamily: AccessoryEffectFamily | null;
  leadGearId: string;
  leadRank: GearRank;
  supportGearId: string | null;
  supportRank: GearRank | null;
  effect: GearTechniqueEffect;
}>;

export type ResolvedGearCombatLoadout = Readonly<{
  version: typeof GEAR_COMBAT_VERSION;
  techniques: readonly ResolvedGearTechnique[];
  modifiers: GearCombatModifiers;
  snapshot: GearCombatSnapshot | null;
}>;

export type GearCombatSummaryTone = 'benefit' | 'tradeoff' | 'neutral';

export type GearCombatSummaryItem = Readonly<{
  key: 'impact' | 'hearts' | 'crit' | 'cooldown' | 'windup' | 'start';
  label: string;
  value: string;
  tone: GearCombatSummaryTone;
}>;

export const EMPTY_GEAR_COMBAT_MODIFIERS: GearCombatModifiers = Object.freeze({
  damagePermille: 1_000,
  maximumHitPointsPermille: 1_000,
  cooldownPermille: 1_000,
  criticalChanceBonusPermille: 0,
  telegraphTicksDelta: 0,
  initialDelayTicksDelta: 0,
});

const signedPercent = (deltaPermille: number): string => {
  const prefix = deltaPermille >= 0 ? '+' : '-';
  return `${prefix}${(Math.abs(deltaPermille) / 10).toFixed(1)}%`;
};

const percentagePoint = (permille: number): string => {
  return `+${(permille / 10).toFixed(1)}%`;
};

const summaryPercent = (deltaPermille: number): string => {
  if (deltaPermille === 0) return '0.0%';
  return signedPercent(deltaPermille);
};

const timingSummary = (ticks: number): string => {
  if (ticks === 0) return 'NORMAL';
  return `${Math.abs(ticks)}T ${ticks < 0 ? 'FASTER' : 'SLOWER'}`;
};

export function summarizeGearCombatModifiers(
  modifiers: GearCombatModifiers
): readonly GearCombatSummaryItem[] {
  const impactDelta = modifiers.damagePermille - 1_000;
  const heartsDelta = modifiers.maximumHitPointsPermille - 1_000;
  const cooldownDelta = modifiers.cooldownPermille - 1_000;
  return Object.freeze([
    Object.freeze({
      key: 'impact',
      label: 'IMPACT',
      value: summaryPercent(impactDelta),
      tone:
        impactDelta > 0 ? 'benefit' : impactDelta < 0 ? 'tradeoff' : 'neutral',
    }),
    Object.freeze({
      key: 'hearts',
      label: 'HEARTS',
      value: summaryPercent(heartsDelta),
      tone:
        heartsDelta > 0 ? 'benefit' : heartsDelta < 0 ? 'tradeoff' : 'neutral',
    }),
    Object.freeze({
      key: 'crit',
      label: 'FOCUS',
      value: summaryPercent(modifiers.criticalChanceBonusPermille),
      tone: modifiers.criticalChanceBonusPermille > 0 ? 'benefit' : 'neutral',
    }),
    Object.freeze({
      key: 'cooldown',
      label: 'COOLDOWN',
      value:
        cooldownDelta === 0
          ? 'NORMAL'
          : `${(Math.abs(cooldownDelta) / 10).toFixed(1)}% ${
              cooldownDelta < 0 ? 'FASTER' : 'SLOWER'
            }`,
      tone:
        cooldownDelta < 0
          ? 'benefit'
          : cooldownDelta > 0
            ? 'tradeoff'
            : 'neutral',
    }),
    Object.freeze({
      key: 'windup',
      label: 'WIND-UP',
      value: timingSummary(modifiers.telegraphTicksDelta),
      tone:
        modifiers.telegraphTicksDelta < 0
          ? 'benefit'
          : modifiers.telegraphTicksDelta > 0
            ? 'tradeoff'
            : 'neutral',
    }),
    Object.freeze({
      key: 'start',
      label: 'START',
      value: timingSummary(modifiers.initialDelayTicksDelta),
      tone:
        modifiers.initialDelayTicksDelta < 0
          ? 'benefit'
          : modifiers.initialDelayTicksDelta > 0
            ? 'tradeoff'
            : 'neutral',
    }),
  ] satisfies GearCombatSummaryItem[]);
}

const freezeModifiers = (modifiers: GearCombatModifiers): GearCombatModifiers =>
  Object.freeze({ ...modifiers });

const effectForStrength = (
  family: AccessoryEffectFamily,
  strengthPermille: number
): GearTechniqueEffect => {
  const definition = ACCESSORY_EFFECTS[family];
  let modifiers: GearCombatModifiers;
  let summary: string;

  switch (family) {
    case 'guard': {
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        maximumHitPointsPermille: 1_000 + strengthPermille,
      };
      summary = `${signedPercent(strengthPermille)} HEARTS`;
      break;
    }
    case 'rush': {
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 + strengthPermille,
      };
      summary = `${signedPercent(strengthPermille)} DASH IMPACT`;
      break;
    }
    case 'focus': {
      const focusBonus = Math.max(1, Math.ceil(strengthPermille / 2));
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        cooldownPermille: 1_000 - strengthPermille,
        criticalChanceBonusPermille: focusBonus,
      };
      summary = `${percentagePoint(focusBonus)} FOCUS · ${signedPercent(strengthPermille)} RECOVERY`;
      break;
    }
    case 'ready': {
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        criticalChanceBonusPermille: strengthPermille,
      };
      summary = `${percentagePoint(strengthPermille)} OPENING FOCUS`;
      break;
    }
    case 'fortune': {
      const fortuneFocus = Math.max(1, Math.ceil((strengthPermille * 3) / 4));
      const fortuneGuard = Math.max(1, Math.ceil(strengthPermille / 3));
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        maximumHitPointsPermille: 1_000 + fortuneGuard,
        criticalChanceBonusPermille: fortuneFocus,
      };
      summary = `${percentagePoint(fortuneFocus)} FOCUS · ${signedPercent(fortuneGuard)} HEARTS`;
      break;
    }
    case 'aim': {
      const aimFocus = Math.max(1, Math.ceil(strengthPermille / 2));
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 + strengthPermille,
        criticalChanceBonusPermille: aimFocus,
      };
      summary = `${signedPercent(strengthPermille)} IMPACT · ${percentagePoint(aimFocus)} FOCUS`;
      break;
    }
  }

  return Object.freeze({
    family,
    name: definition.techniqueName,
    battleCue: definition.battleCue,
    modifiers: freezeModifiers(modifiers),
    summary,
  });
};

export function getGearTechniqueEffect(
  gear: Pick<CosmeticGearCatalogEntry, 'effectFamily'> &
    Partial<Pick<CosmeticGearCatalogEntry, 'rarity'>>,
  rank: GearRank,
  supportRank: GearRank | null = null
): GearTechniqueEffect {
  const leadStrength = GEAR_RANK_STRENGTH_PERMILLE[rank];
  const supportStrength = supportRank
    ? Math.floor(
        GEAR_RANK_STRENGTH_PERMILLE[supportRank] / SUPPORT_STRENGTH_DIVISOR
      )
    : 0;
  return effectForStrength(gear.effectFamily, leadStrength + supportStrength);
}

export function formatGearTechnique(
  gear: Pick<CosmeticGearCatalogEntry, 'effectFamily'> &
    Partial<Pick<CosmeticGearCatalogEntry, 'rarity'>>,
  rank: GearRank
): string {
  const effect = getGearTechniqueEffect(gear, rank);
  return `${effect.name.toUpperCase()} · ${effect.summary}`;
}

const clampAxis = (value: number): number => {
  return Math.max(
    1_000 - MAXIMUM_AXIS_DELTA_PERMILLE,
    Math.min(1_000 + MAXIMUM_AXIS_DELTA_PERMILLE, value)
  );
};

const clampTiming = (value: number): number => {
  return Math.max(
    -MAXIMUM_TIMING_DELTA_TICKS,
    Math.min(MAXIMUM_TIMING_DELTA_TICKS, value)
  );
};

const combineModifiers = (
  modifierSets: readonly GearCombatModifiers[]
): GearCombatModifiers => {
  let damagePermille = 1_000;
  let maximumHitPointsPermille = 1_000;
  let cooldownPermille = 1_000;
  let criticalChanceBonusPermille = 0;
  let telegraphTicksDelta = 0;
  let initialDelayTicksDelta = 0;

  for (const modifiers of modifierSets) {
    damagePermille += modifiers.damagePermille - 1_000;
    maximumHitPointsPermille += modifiers.maximumHitPointsPermille - 1_000;
    cooldownPermille += modifiers.cooldownPermille - 1_000;
    criticalChanceBonusPermille += modifiers.criticalChanceBonusPermille;
    telegraphTicksDelta += modifiers.telegraphTicksDelta;
    initialDelayTicksDelta += modifiers.initialDelayTicksDelta;
  }

  return freezeModifiers({
    damagePermille: clampAxis(damagePermille),
    maximumHitPointsPermille: clampAxis(maximumHitPointsPermille),
    cooldownPermille: clampAxis(cooldownPermille),
    criticalChanceBonusPermille: Math.min(
      MAXIMUM_AXIS_DELTA_PERMILLE,
      criticalChanceBonusPermille
    ),
    telegraphTicksDelta: clampTiming(telegraphTicksDelta),
    initialDelayTicksDelta: clampTiming(initialDelayTicksDelta),
  });
};

const combineTechniqueEffects = (
  techniques: readonly ResolvedGearTechnique[]
): GearCombatModifiers => {
  if (techniques.length === 0) return EMPTY_GEAR_COMBAT_MODIFIERS;
  const combined = combineModifiers(
    techniques.map((technique) => technique.effect.modifiers)
  );
  if (techniques.length === 1) return combined;

  const averageDelta = (value: number, neutral: number): number =>
    Math.round((value - neutral) / techniques.length);
  const clampResolvedDelta = (value: number): number =>
    Math.max(
      -MAXIMUM_RESOLVED_LOADOUT_AXIS_DELTA_PERMILLE,
      Math.min(MAXIMUM_RESOLVED_LOADOUT_AXIS_DELTA_PERMILLE, value)
    );
  return freezeModifiers({
    damagePermille:
      1_000 + clampResolvedDelta(averageDelta(combined.damagePermille, 1_000)),
    maximumHitPointsPermille:
      1_000 +
      clampResolvedDelta(
        averageDelta(combined.maximumHitPointsPermille, 1_000)
      ),
    cooldownPermille:
      1_000 +
      clampResolvedDelta(averageDelta(combined.cooldownPermille, 1_000)),
    criticalChanceBonusPermille: Math.max(
      0,
      clampResolvedDelta(
        Math.round(combined.criticalChanceBonusPermille / techniques.length)
      )
    ),
    telegraphTicksDelta: clampTiming(
      Math.round(combined.telegraphTicksDelta / techniques.length)
    ),
    initialDelayTicksDelta: clampTiming(
      Math.round(combined.initialDelayTicksDelta / techniques.length)
    ),
  });
};

const getCombinedGearTechniqueEffect = (
  leadGear: Pick<CosmeticGearCatalogEntry, 'effectFamily' | 'rarity'>,
  leadRank: GearRank,
  supportGear: Pick<CosmeticGearCatalogEntry, 'effectFamily' | 'rarity'> | null,
  supportRank: GearRank | null
): GearTechniqueEffect => {
  if (!supportGear || !supportRank) {
    return getGearTechniqueEffect(leadGear, leadRank);
  }
  if (supportGear.effectFamily === leadGear.effectFamily) {
    return getGearTechniqueEffect(leadGear, leadRank, supportRank);
  }

  const leadEffect = getGearTechniqueEffect(leadGear, leadRank);
  const supportStrength = Math.max(
    1,
    Math.floor(
      GEAR_RANK_STRENGTH_PERMILLE[supportRank] / SUPPORT_STRENGTH_DIVISOR
    )
  );
  // Mixed-family support contributes its scalar identity without importing
  // the support item's full-rank strength into the lead technique.
  const supportEffect = effectForStrength(
    supportGear.effectFamily,
    supportStrength
  );
  return Object.freeze({
    family: leadEffect.family,
    name: `${leadEffect.name} + ${supportEffect.name}`,
    battleCue: `${leadEffect.battleCue} ${supportEffect.battleCue}`,
    modifiers: combineModifiers([
      leadEffect.modifiers,
      supportEffect.modifiers,
    ]),
    summary: `${leadEffect.summary} · ${supportEffect.name.toUpperCase()} SUPPORT`,
  });
};

export function resolveGearCombatLoadout(
  scribbit: Pick<Scribbit, 'gearRanks'> &
    Partial<Pick<Scribbit, 'equipmentLoadout'>>
): ResolvedGearCombatLoadout {
  const techniques: ResolvedGearTechnique[] = [];

  for (const category of EQUIPMENT_CATEGORIES) {
    const rankedGear = (scribbit.equipmentLoadout?.[category] ?? [])
      .map((gearId, slotIndex) => {
        if (gearId === null) return null;
        const gear = findGearCosmetic(gearId);
        if (!gear || gear.category !== category) return null;
        return {
          gear,
          rank: getAttachedGearRank(scribbit, gearId),
          slotIndex,
        };
      })
      .filter(
        (
          value
        ): value is {
          gear: CosmeticGearCatalogEntry;
          rank: GearRank;
          slotIndex: number;
        } => value !== null
      )
      .sort((left, right) => {
        return (
          right.rank - left.rank ||
          capsuleRarityRank(right.gear.rarity) -
            capsuleRarityRank(left.gear.rarity) ||
          left.slotIndex - right.slotIndex
        );
      });
    const lead = rankedGear[0];
    if (!lead) continue;
    const support = rankedGear[1] ?? null;
    techniques.push(
      Object.freeze({
        category,
        effectFamily: lead.gear.effectFamily,
        supportEffectFamily: support?.gear.effectFamily ?? null,
        leadGearId: lead.gear.id,
        leadRank: lead.rank,
        supportGearId: support?.gear.id ?? null,
        supportRank: support?.rank ?? null,
        effect: getCombinedGearTechniqueEffect(
          lead.gear,
          lead.rank,
          support?.gear ?? null,
          support?.rank ?? null
        ),
      })
    );
  }

  const modifiers = combineTechniqueEffects(techniques);
  const snapshot =
    techniques.length === 0
      ? null
      : Object.freeze({
          version: GEAR_COMBAT_VERSION,
          techniques: Object.freeze(
            techniques.map((technique) =>
              Object.freeze({
                category: technique.category,
                effectFamily: technique.effectFamily,
                leadGearId: technique.leadGearId,
                leadRank: technique.leadRank,
                supportGearId: technique.supportGearId,
                supportRank: technique.supportRank,
              })
            )
          ),
          modifiers,
        });
  return Object.freeze({
    version: GEAR_COMBAT_VERSION,
    techniques: Object.freeze(techniques),
    modifiers,
    snapshot,
  });
}

export function gearCombatFingerprint(
  resolved: ResolvedGearCombatLoadout
): string {
  const identity = resolved.techniques
    .map((technique) => {
      const support = technique.supportGearId
        ? `${technique.supportGearId}@${technique.supportRank}`
        : '-';
      return `${technique.category}:${technique.effectFamily}:${technique.leadGearId}@${technique.leadRank}+${support}`;
    })
    .join('|');
  return identity
    ? hashStringToUint32(`gear-combat:v1:${identity}`).toString(36)
    : '';
}

export function gearCombatSnapshotMatchesScribbit(
  snapshot: GearCombatSnapshot | undefined,
  scribbit: Pick<Scribbit, 'gearRanks'> &
    Partial<Pick<Scribbit, 'equipmentLoadout'>>
): boolean {
  const expected = resolveGearCombatLoadout(scribbit).snapshot;
  if (!snapshot || !expected)
    return snapshot === undefined && expected === null;
  return JSON.stringify(snapshot) === JSON.stringify(expected);
}
