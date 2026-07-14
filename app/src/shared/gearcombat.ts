import {
  ACCESSORY_EFFECTS,
  type AccessoryEffectFamily,
} from './accessoryeffects';
import { getAttachedGearRank, type GearRank, type Scribbit } from './arena';
import { findGearCosmetic, type CosmeticGearCatalogEntry } from './cosmetics';
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from './equipment';
import type { GearCombatModifiers, GearCombatSnapshot } from './combat';
import { hashStringToUint32 } from './stablehash';

export const GEAR_COMBAT_VERSION = 1 as const;

export const GEAR_RANK_STRENGTH_PERMILLE: Readonly<Record<GearRank, number>> =
  Object.freeze({
    1: 4,
    2: 7,
    3: 10,
    4: 13,
    5: 16,
    6: 20,
  });

const SUPPORT_STRENGTH_DIVISOR = 4;
const MAXIMUM_AXIS_DELTA_PERMILLE = 30;
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
      label: 'CRIT',
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
  strengthPermille: number,
  leadRank: GearRank
): GearTechniqueEffect => {
  const definition = ACCESSORY_EFFECTS[family];
  const tradeoff = Math.max(1, Math.round(strengthPermille / 2));
  const lightTradeoff = Math.max(1, Math.round(strengthPermille / 3));
  const timingDelta = leadRank >= 2 ? -1 : 0;
  let modifiers: GearCombatModifiers;
  let summary: string;

  switch (family) {
    case 'guard': {
      const guardTradeoff =
        leadRank <= 2
          ? 0
          : leadRank === 5
            ? Math.round((strengthPermille * 3) / 4)
            : strengthPermille;
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 - guardTradeoff,
        maximumHitPointsPermille: 1_000 + strengthPermille,
      };
      summary =
        guardTradeoff === 0
          ? `${signedPercent(strengthPermille)} HEARTS`
          : `${signedPercent(strengthPermille)} HEARTS · ${signedPercent(-guardTradeoff)} IMPACT`;
      break;
    }
    case 'rush': {
      const rushStartDelta = leadRank >= 5 ? -1 : 0;
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 + strengthPermille,
        maximumHitPointsPermille: 1_000 - strengthPermille,
        cooldownPermille: 1_000 + strengthPermille,
        initialDelayTicksDelta: rushStartDelta,
      };
      summary =
        rushStartDelta === 0
          ? `${signedPercent(strengthPermille)} DASH IMPACT · ${signedPercent(-strengthPermille)} HEARTS · ${signedPercent(strengthPermille)} COOLDOWN`
          : `${Math.abs(rushStartDelta)}T QUICK START · ${signedPercent(strengthPermille)} DASH IMPACT · ${signedPercent(-strengthPermille)} HEARTS · ${signedPercent(strengthPermille)} COOLDOWN`;
      break;
    }
    case 'focus':
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        cooldownPermille: 1_000 + strengthPermille,
        criticalChanceBonusPermille: timingDelta === 0 ? strengthPermille : 0,
        telegraphTicksDelta: timingDelta,
      };
      summary =
        timingDelta === 0
          ? `${percentagePoint(strengthPermille)} CRIT · ${signedPercent(strengthPermille)} RECOVERY`
          : `${Math.abs(timingDelta)}T FASTER WIND-UP · ${signedPercent(strengthPermille)} RECOVERY`;
      break;
    case 'ready':
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: timingDelta === 0 ? 1_000 : 1_000 - tradeoff,
        criticalChanceBonusPermille: timingDelta === 0 ? strengthPermille : 0,
        initialDelayTicksDelta: timingDelta,
      };
      summary =
        timingDelta === 0
          ? `${percentagePoint(strengthPermille)} CRIT`
          : `${Math.abs(timingDelta)}T FASTER START · ${signedPercent(-tradeoff)} IMPACT`;
      break;
    case 'fortune':
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 - lightTradeoff,
        criticalChanceBonusPermille: strengthPermille,
      };
      summary = `${percentagePoint(strengthPermille)} CRIT · ${signedPercent(-lightTradeoff)} IMPACT`;
      break;
    case 'aim':
      modifiers = {
        ...EMPTY_GEAR_COMBAT_MODIFIERS,
        damagePermille: 1_000 + strengthPermille,
        maximumHitPointsPermille: 1_000 - tradeoff,
        cooldownPermille: 1_000 + tradeoff,
      };
      summary = `${signedPercent(strengthPermille)} IMPACT · ${signedPercent(-tradeoff)} HEARTS · ${signedPercent(tradeoff)} COOLDOWN`;
      break;
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
  gear: Pick<CosmeticGearCatalogEntry, 'effectFamily'>,
  rank: GearRank,
  supportRank: GearRank | null = null
): GearTechniqueEffect {
  const supportStrength = supportRank
    ? Math.floor(
        GEAR_RANK_STRENGTH_PERMILLE[supportRank] / SUPPORT_STRENGTH_DIVISOR
      )
    : 0;
  return effectForStrength(
    gear.effectFamily,
    GEAR_RANK_STRENGTH_PERMILLE[rank] + supportStrength,
    rank
  );
}

export function formatGearTechnique(
  gear: Pick<CosmeticGearCatalogEntry, 'effectFamily'>,
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

const combineTechniqueEffects = (
  techniques: readonly ResolvedGearTechnique[]
): GearCombatModifiers => {
  let damagePermille = 1_000;
  let maximumHitPointsPermille = 1_000;
  let cooldownPermille = 1_000;
  let criticalChanceBonusPermille = 0;
  let telegraphTicksDelta = 0;
  let initialDelayTicksDelta = 0;

  for (const technique of techniques) {
    const modifiers = technique.effect.modifiers;
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
        return right.rank - left.rank || left.slotIndex - right.slotIndex;
      });
    const lead = rankedGear[0];
    if (!lead) continue;
    const support = rankedGear[1] ?? null;
    techniques.push(
      Object.freeze({
        category,
        effectFamily: lead.gear.effectFamily,
        leadGearId: lead.gear.id,
        leadRank: lead.rank,
        supportGearId: support?.gear.id ?? null,
        supportRank: support?.rank ?? null,
        effect: getGearTechniqueEffect(
          lead.gear,
          lead.rank,
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
