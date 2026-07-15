import { deterministicInteger, normalizeCombatSeed } from './random';
import type { AccessoryEffectFamily } from '../accessoryeffects';
import type { CombatRole } from './types';
import { toCurrentCombatRole } from './roles';

export const MAXIMUM_POWER_UPS = 5;
export const MAXIMUM_GROWING_POWER_UPS = 3;
export const MAXIMUM_LEGENDARY_POWER_UPS = 1;
export const MAXIMUM_POWER_UP_BONUS_DAMAGE = 60;
export const MAXIMUM_POWER_UP_TRIGGER_EVENTS = 32;

export const POWER_UP_IDS = Object.freeze([
  'v1-edge-spring',
  'v1-smudge-step',
  'v1-paper-shield',
  'v1-combo-spark',
  'v1-center-fold',
  'v1-double-doodle',
  'v1-backup-plan',
  'v1-counter-sketch',
  'v1-wallop',
  'v1-echo-mark',
  'v1-last-scribble',
  'v1-second-draft',
  'v1-paper-twin',
  'v1-masterpiece',
  'v1-endless-draft',
] as const);

export type PowerUpId = (typeof POWER_UP_IDS)[number];
export type PowerUpRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PowerUpBuildPath =
  | 'bounce'
  | 'combo'
  | 'survival'
  | 'special'
  | 'wildcard';

export type PowerUpPlaystyleProfile = Readonly<{
  recommendedRoles: readonly CombatRole[];
  avoidedRoles: readonly CombatRole[];
  gearFamilies: readonly AccessoryEffectFamily[];
}>;

export type PowerUpDefinition = Readonly<{
  id: PowerUpId;
  name: string;
  shortName: string;
  rarity: PowerUpRarity;
  buildPath: PowerUpBuildPath;
  when: string;
  effect: string;
  description: string;
  trigger:
    | 'wall-bounce'
    | 'incoming-basic'
    | 'incoming-signature'
    | 'basic-hit-streak'
    | 'basic-hit-count'
    | 'below-half-hearts'
    | 'landed-signature'
    | 'missed-signature'
    | 'enemy-signature'
    | 'knockback-wall-bounce'
    | 'marked-target-basic'
    | 'lethal-hit'
    | 'first-basic-hit'
    | 'distinct-power-ups'
    | 'common-power-up';
  maximumActivations: number;
  delayTicks?: number;
  durationTicks?: number;
  powerPermille?: number;
  bonusDamage?: number;
  bonusDamageCap?: number;
  healingAmount?: number;
  preventedDamage?: number;
  lethalDamageCap?: number;
  requiredConsecutiveHits?: number;
  requiredDistinctPowerUps?: number;
  repeatedAttacks?: number;
  extraActivations?: number;
  survivingHitPoints?: number;
  survivingHitPointPermille?: number;
}>;

type PowerUpDefinitionInput = Omit<PowerUpDefinition, 'description'>;

const definePowerUp = <T extends PowerUpDefinitionInput>(
  definition: T
): T & Readonly<{ description: string }> =>
  Object.freeze({
    ...definition,
    description: `${definition.when}. ${definition.effect}.`,
  });

export const POWER_UP_CATALOG: Readonly<Record<PowerUpId, PowerUpDefinition>> =
  Object.freeze({
    'v1-edge-spring': definePowerUp({
      id: 'v1-edge-spring',
      name: 'Edge Spring',
      shortName: 'EDGE SPRING',
      rarity: 'common',
      buildPath: 'bounce',
      when: 'You touch a wall, up to 3 times',
      effect: 'Restore 3 health and empower your next 2 normal hits',
      trigger: 'wall-bounce',
      maximumActivations: 3,
      durationTicks: 3,
      healingAmount: 3,
      repeatedAttacks: 2,
      bonusDamage: 2,
    }),
    'v1-smudge-step': definePowerUp({
      id: 'v1-smudge-step',
      name: 'Smudge Step',
      shortName: 'SMUDGE STEP',
      rarity: 'common',
      buildPath: 'survival',
      when: 'Every fourth normal attack would hit you',
      effect: 'Dodge it completely, up to 3 times',
      trigger: 'incoming-basic',
      maximumActivations: 3,
    }),
    'v1-paper-shield': definePowerUp({
      id: 'v1-paper-shield',
      name: 'Paper Shield',
      shortName: 'PAPER SHIELD',
      rarity: 'common',
      buildPath: 'survival',
      when: "The enemy's special move hits you, up to 3 times",
      effect: 'Block up to 5 damage from each hit',
      trigger: 'incoming-signature',
      maximumActivations: 3,
      preventedDamage: 5,
    }),
    'v1-combo-spark': definePowerUp({
      id: 'v1-combo-spark',
      name: 'Combo Spark',
      shortName: 'COMBO SPARK',
      rarity: 'common',
      buildPath: 'combo',
      when: 'Every third normal hit, up to 3 times',
      effect: 'Deal 50% extra damage and restore 4 health',
      trigger: 'basic-hit-streak',
      maximumActivations: 3,
      requiredConsecutiveHits: 3,
      powerPermille: 500,
      bonusDamageCap: 8,
      healingAmount: 4,
    }),
    'v1-center-fold': definePowerUp({
      id: 'v1-center-fold',
      name: 'Center Fold',
      shortName: 'CENTER FOLD',
      rarity: 'common',
      buildPath: 'survival',
      when: 'You fall below half health',
      effect: 'Restore 12 health and briefly block incoming damage',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      durationTicks: 10,
      healingAmount: 12,
    }),
    'v1-double-doodle': definePowerUp({
      id: 'v1-double-doodle',
      name: 'Double Doodle',
      shortName: 'DOUBLE DOODLE',
      rarity: 'rare',
      buildPath: 'special',
      when: 'A special move hits, up to 3 times',
      effect: 'Repeat part of that hit for up to 6 damage',
      trigger: 'landed-signature',
      maximumActivations: 3,
      delayTicks: 6,
      powerPermille: 400,
      bonusDamageCap: 6,
    }),
    'v1-backup-plan': definePowerUp({
      id: 'v1-backup-plan',
      name: 'Heart Ink',
      shortName: 'HEART INK',
      rarity: 'rare',
      buildPath: 'combo',
      when: 'Every fourth normal hit, up to 3 times',
      effect: 'Restore 8 health',
      trigger: 'basic-hit-count',
      maximumActivations: 3,
      requiredConsecutiveHits: 4,
      healingAmount: 8,
    }),
    'v1-counter-sketch': definePowerUp({
      id: 'v1-counter-sketch',
      name: 'Counter Sketch',
      shortName: 'COUNTER SKETCH',
      rarity: 'rare',
      buildPath: 'survival',
      when: "The enemy's special move hits you, up to 3 times",
      effect: 'Strike back for up to 6 damage and restore 3 health',
      trigger: 'enemy-signature',
      maximumActivations: 3,
      powerPermille: 250,
      bonusDamageCap: 6,
      healingAmount: 3,
    }),
    'v1-wallop': definePowerUp({
      id: 'v1-wallop',
      name: 'Wallop',
      shortName: 'WALLOP',
      rarity: 'rare',
      buildPath: 'bounce',
      when: 'You knock the enemy into a wall, up to 3 times',
      effect: 'Deal 6 extra damage each time',
      trigger: 'knockback-wall-bounce',
      maximumActivations: 3,
      bonusDamage: 6,
    }),
    'v1-echo-mark': definePowerUp({
      id: 'v1-echo-mark',
      name: 'Echo Mark',
      shortName: 'ECHO MARK',
      rarity: 'rare',
      buildPath: 'special',
      when: 'A special move hits',
      effect: 'Your next 2 normal hits deal 35% extra damage',
      trigger: 'marked-target-basic',
      maximumActivations: 4,
      repeatedAttacks: 2,
      powerPermille: 350,
      bonusDamageCap: 6,
    }),
    'v1-last-scribble': definePowerUp({
      id: 'v1-last-scribble',
      name: 'Last Scribble',
      shortName: 'LAST SCRIBBLE',
      rarity: 'epic',
      buildPath: 'survival',
      when: 'A hit would knock you out',
      effect: 'Survive with 30% health and briefly block damage',
      trigger: 'lethal-hit',
      maximumActivations: 1,
      survivingHitPointPermille: 300,
      durationTicks: 10,
    }),
    'v1-second-draft': definePowerUp({
      id: 'v1-second-draft',
      name: 'Ink Rage',
      shortName: 'INK RAGE',
      rarity: 'epic',
      buildPath: 'survival',
      when: 'You fall below half health',
      effect:
        'Your next 4 normal hits deal 5 extra damage and restore 2 health',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      repeatedAttacks: 4,
      bonusDamage: 5,
      healingAmount: 2,
    }),
    'v1-paper-twin': definePowerUp({
      id: 'v1-paper-twin',
      name: 'Paper Twin',
      shortName: 'PAPER TWIN',
      rarity: 'epic',
      buildPath: 'combo',
      when: 'Your first normal attack hits',
      effect: 'Your first 4 normal hits repeat for up to 4 damage each',
      trigger: 'first-basic-hit',
      maximumActivations: 1,
      repeatedAttacks: 4,
      powerPermille: 350,
      bonusDamageCap: 4,
    }),
    'v1-masterpiece': definePowerUp({
      id: 'v1-masterpiece',
      name: 'Masterpiece',
      shortName: 'MASTERPIECE',
      rarity: 'legendary',
      buildPath: 'wildcard',
      when: 'Three different non-Legendary Power-Ups activate',
      effect: 'Deal 12 damage and restore 10 health',
      trigger: 'distinct-power-ups',
      maximumActivations: 1,
      requiredDistinctPowerUps: 3,
      bonusDamage: 12,
      healingAmount: 10,
    }),
    'v1-endless-draft': definePowerUp({
      id: 'v1-endless-draft',
      name: 'Endless Draft',
      shortName: 'ENDLESS DRAFT',
      rarity: 'legendary',
      buildPath: 'wildcard',
      when: 'A Common or Rare Power-Up activates',
      effect: 'Let every Common and Rare activate 1 extra time',
      trigger: 'common-power-up',
      maximumActivations: 1,
      extraActivations: 1,
    }),
  });

const definePlaystyleProfile = (
  recommendedRoles: readonly CombatRole[],
  gearFamilies: readonly AccessoryEffectFamily[],
  avoidedRoles: readonly CombatRole[] = []
): PowerUpPlaystyleProfile =>
  Object.freeze({
    recommendedRoles: Object.freeze([...recommendedRoles]),
    avoidedRoles: Object.freeze([...avoidedRoles]),
    gearFamilies: Object.freeze([...gearFamilies]),
  });

export const POWER_UP_PLAYSTYLE_PROFILES: Readonly<
  Record<PowerUpId, PowerUpPlaystyleProfile>
> = Object.freeze({
  'v1-edge-spring': definePlaystyleProfile(['mage'], ['rush', 'ready']),
  'v1-smudge-step': definePlaystyleProfile(['longshot'], ['rush', 'focus']),
  'v1-paper-shield': definePlaystyleProfile(
    ['brawler', 'mage'],
    ['guard', 'fortune']
  ),
  'v1-combo-spark': definePlaystyleProfile(
    ['longshot'],
    ['rush', 'ready', 'aim']
  ),
  'v1-center-fold': definePlaystyleProfile(
    ['brawler', 'mage'],
    ['guard', 'fortune']
  ),
  'v1-double-doodle': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['focus', 'aim', 'fortune']
  ),
  'v1-backup-plan': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['rush', 'focus', 'ready']
  ),
  'v1-counter-sketch': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['guard', 'ready']
  ),
  'v1-wallop': definePlaystyleProfile(['brawler'], ['guard', 'rush', 'ready']),
  'v1-echo-mark': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['focus', 'aim', 'fortune']
  ),
  'v1-last-scribble': definePlaystyleProfile(['brawler'], ['guard']),
  'v1-second-draft': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['focus', 'ready', 'fortune']
  ),
  'v1-paper-twin': definePlaystyleProfile(
    ['longshot'],
    ['guard', 'rush', 'fortune']
  ),
  'v1-masterpiece': definePlaystyleProfile(
    ['brawler', 'longshot', 'mage'],
    ['ready', 'fortune']
  ),
  'v1-endless-draft': definePlaystyleProfile(
    ['brawler', 'longshot', 'mage'],
    ['ready', 'fortune']
  ),
});

export function scorePowerUpFit(
  powerUpId: PowerUpId,
  combatRole: CombatRole,
  gearFamilies: readonly AccessoryEffectFamily[] = [],
  ownedPowerUpIds: readonly PowerUpId[] = []
): number {
  const profile = POWER_UP_PLAYSTYLE_PROFILES[powerUpId];
  const currentRole = toCurrentCombatRole(combatRole);
  if (profile.avoidedRoles.includes(currentRole)) return -100;
  const roleScore = profile.recommendedRoles.includes(currentRole) ? 4 : 0;
  const gearScore = profile.gearFamilies.some((family) =>
    gearFamilies.includes(family)
  )
    ? 2
    : 0;
  const buildPath = POWER_UP_CATALOG[powerUpId].buildPath;
  const buildPathScore =
    buildPath !== 'wildcard' &&
    ownedPowerUpIds.some(
      (ownedPowerUpId) =>
        POWER_UP_CATALOG[ownedPowerUpId].buildPath === buildPath
    )
      ? 3
      : 0;
  return roleScore + gearScore + buildPathScore;
}

export const isPowerUpId = (value: unknown): value is PowerUpId =>
  typeof value === 'string' && POWER_UP_IDS.includes(value as PowerUpId);

export const powerUpIsOfferableForRole = (
  powerUpId: PowerUpId,
  combatRole?: CombatRole
): boolean =>
  !combatRole ||
  !POWER_UP_PLAYSTYLE_PROFILES[powerUpId].avoidedRoles.includes(combatRole);

export type PowerUpBuildValidation =
  | Readonly<{ valid: true; powerUpIds: readonly PowerUpId[] }>
  | Readonly<{
      valid: false;
      reason:
        | 'not-an-array'
        | 'unknown-id'
        | 'duplicate'
        | 'too-many'
        | 'too-many-legendary';
    }>;

export const validatePowerUpBuild = (
  value: unknown
): PowerUpBuildValidation => {
  if (!Array.isArray(value))
    return Object.freeze({ valid: false, reason: 'not-an-array' });
  if (value.length > MAXIMUM_POWER_UPS)
    return Object.freeze({ valid: false, reason: 'too-many' });
  const powerUpIds: PowerUpId[] = [];
  const seenIds = new Set<PowerUpId>();
  let legendaryCount = 0;
  for (const valueId of value) {
    if (!isPowerUpId(valueId))
      return Object.freeze({ valid: false, reason: 'unknown-id' });
    if (seenIds.has(valueId))
      return Object.freeze({ valid: false, reason: 'duplicate' });
    const definition = POWER_UP_CATALOG[valueId];
    if (definition.rarity === 'legendary') legendaryCount += 1;
    if (legendaryCount > MAXIMUM_LEGENDARY_POWER_UPS) {
      return Object.freeze({ valid: false, reason: 'too-many-legendary' });
    }
    seenIds.add(valueId);
    powerUpIds.push(valueId);
  }
  return Object.freeze({ valid: true, powerUpIds: Object.freeze(powerUpIds) });
};

export const parsePowerUpBuild = (
  value: unknown
): readonly PowerUpId[] | undefined => {
  const validation = validatePowerUpBuild(value);
  return validation.valid ? validation.powerUpIds : undefined;
};

export const POWER_UP_OFFER_SOURCES = Object.freeze([
  'birth',
  'exhibition-win',
  'rival-run-win',
  'rival-run-final-win',
  'rumble-day-win',
  'champion-win',
] as const);
export type PowerUpOfferSource = (typeof POWER_UP_OFFER_SOURCES)[number];

export type PowerUpOffer = Readonly<{
  version: 1;
  id: string;
  scribbitId: string;
  sourceReportId: string;
  source: PowerUpOfferSource;
  choices: readonly [PowerUpId, PowerUpId, PowerUpId];
  createdAtMs: number;
}>;

export type ChoosePowerUpRequest = Readonly<{
  scribbitId: string;
  offerId: string;
  selectedId: PowerUpId;
  expectedPowerUpCount: number;
}>;

export type ChoosePowerUpResponse = Readonly<{
  scribbitId: string;
  selectedId: PowerUpId;
  powerUpIds: readonly PowerUpId[];
  discoveredPowerUpIds?: readonly PowerUpId[];
}>;

const defineRarityPattern = (
  ...rarities: readonly PowerUpRarity[]
): readonly PowerUpRarity[] => Object.freeze(rarities);

export const POWER_UP_OFFER_RARITIES: Readonly<
  Record<PowerUpOfferSource, readonly PowerUpRarity[]>
> = Object.freeze({
  birth: defineRarityPattern('common', 'common', 'rare'),
  'exhibition-win': defineRarityPattern('common', 'common', 'rare'),
  'rival-run-win': defineRarityPattern('common', 'common', 'rare'),
  'rival-run-final-win': defineRarityPattern('common', 'rare', 'epic'),
  'rumble-day-win': defineRarityPattern('common', 'rare', 'epic'),
  'champion-win': defineRarityPattern('rare', 'epic', 'legendary'),
});

export type CreatePowerUpOfferInput = Readonly<{
  seed: string | number;
  source: PowerUpOfferSource;
  ownedPowerUpIds: unknown;
  combatRole?: CombatRole;
  gearFamilies?: readonly AccessoryEffectFamily[];
  maxPowerUps?: number;
}>;

export const createDeterministicPowerUpOffer = (
  input: CreatePowerUpOfferInput
): readonly PowerUpId[] | undefined => {
  const ownedValidation = validatePowerUpBuild(input.ownedPowerUpIds);
  if (!ownedValidation.valid)
    throw new Error(`Invalid owned Power-Up build: ${ownedValidation.reason}.`);
  const maxPowerUps = Math.max(
    0,
    Math.min(
      MAXIMUM_POWER_UPS,
      Number.isSafeInteger(input.maxPowerUps)
        ? Math.floor(input.maxPowerUps as number)
        : MAXIMUM_POWER_UPS
    )
  );
  if (ownedValidation.powerUpIds.length >= maxPowerUps) return undefined;

  const ownedIds = new Set(ownedValidation.powerUpIds);
  const ownsLegendary = ownedValidation.powerUpIds.some(
    (id) => POWER_UP_CATALOG[id].rarity === 'legendary'
  );
  const rarities = POWER_UP_OFFER_RARITIES[input.source].map((rarity) =>
    rarity === 'legendary' && ownsLegendary ? 'epic' : rarity
  );
  const selectedIds: PowerUpId[] = [];
  const normalizedSeed = normalizeCombatSeed(input.seed);

  for (let slotIndex = 0; slotIndex < rarities.length; slotIndex += 1) {
    const rarity = rarities[slotIndex];
    const candidates = POWER_UP_IDS.filter((id) => {
      const definition = POWER_UP_CATALOG[id];
      return (
        definition.rarity === rarity &&
        !ownedIds.has(id) &&
        !selectedIds.includes(id) &&
        powerUpIsOfferableForRole(id, input.combatRole)
      );
    });
    if (candidates.length === 0) return undefined;
    const fittedCandidates = input.combatRole
      ? (() => {
          const highestScore = Math.max(
            ...candidates.map((id) =>
              scorePowerUpFit(
                id,
                input.combatRole as CombatRole,
                input.gearFamilies ?? [],
                ownedValidation.powerUpIds
              )
            )
          );
          return candidates.filter(
            (id) =>
              scorePowerUpFit(
                id,
                input.combatRole as CombatRole,
                input.gearFamilies ?? [],
                ownedValidation.powerUpIds
              ) === highestScore
          );
        })()
      : candidates;
    const candidateIndex = input.combatRole
      ? deterministicInteger(
          normalizedSeed,
          'power-up-offer:v2:playstyle',
          fittedCandidates.length,
          input.source,
          slotIndex,
          input.combatRole,
          (input.gearFamilies ?? []).join(','),
          ownedValidation.powerUpIds.join(',')
        )
      : deterministicInteger(
          normalizedSeed,
          'power-up-offer:v1',
          fittedCandidates.length,
          input.source,
          slotIndex,
          ownedValidation.powerUpIds.join(',')
        );
    const selectedId = fittedCandidates[candidateIndex];
    if (!selectedId) return undefined;
    selectedIds.push(selectedId);
  }
  return Object.freeze(selectedIds);
};
