import { deterministicInteger, normalizeCombatSeed } from './random';

export const MAXIMUM_POWER_UPS = 5;
export const MAXIMUM_LEGENDARY_POWER_UPS = 1;
export const MAXIMUM_POWER_UP_BONUS_DAMAGE = 36;
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
export type PowerUpExclusiveGroup = 'signature-retry';

export type PowerUpDefinition = Readonly<{
  id: PowerUpId;
  name: string;
  shortName: string;
  rarity: PowerUpRarity;
  description: string;
  trigger:
    | 'wall-bounce'
    | 'missed-basic'
    | 'incoming-signature'
    | 'basic-hit-streak'
    | 'below-half-hearts'
    | 'landed-signature'
    | 'missed-signature'
    | 'enemy-signature'
    | 'knockback-wall-bounce'
    | 'marked-target-basic'
    | 'lethal-hit'
    | 'distinct-power-ups'
    | 'common-power-up';
  maximumActivations: number;
  exclusiveGroup?: PowerUpExclusiveGroup;
  delayTicks?: number;
  durationTicks?: number;
  powerPermille?: number;
  bonusDamage?: number;
  bonusDamageCap?: number;
  preventedDamage?: number;
  requiredConsecutiveHits?: number;
  requiredDistinctPowerUps?: number;
  repeatedAttacks?: number;
  survivingHitPoints?: number;
}>;

const definePowerUp = <T extends PowerUpDefinition>(definition: T): T =>
  Object.freeze(definition);

export const POWER_UP_CATALOG: Readonly<Record<PowerUpId, PowerUpDefinition>> =
  Object.freeze({
    'v1-edge-spring': definePowerUp({
      id: 'v1-edge-spring',
      name: 'Edge Spring',
      shortName: 'EDGE SPRING',
      rarity: 'common',
      description: 'First wall bounce redirects toward center for 3 ticks.',
      trigger: 'wall-bounce',
      maximumActivations: 1,
      durationTicks: 3,
    }),
    'v1-smudge-step': definePowerUp({
      id: 'v1-smudge-step',
      name: 'Smudge Step',
      shortName: 'SMUDGE STEP',
      rarity: 'common',
      description:
        'First fully missed basic attack triggers a short side dash.',
      trigger: 'missed-basic',
      maximumActivations: 1,
    }),
    'v1-paper-shield': definePowerUp({
      id: 'v1-paper-shield',
      name: 'Paper Shield',
      shortName: 'PAPER SHIELD',
      rarity: 'common',
      description: 'First incoming signature hit prevents up to 10 damage.',
      trigger: 'incoming-signature',
      maximumActivations: 1,
      preventedDamage: 10,
    }),
    'v1-combo-spark': definePowerUp({
      id: 'v1-combo-spark',
      name: 'Combo Spark',
      shortName: 'COMBO SPARK',
      rarity: 'common',
      description: 'Third consecutive landed basic attack adds 6 damage.',
      trigger: 'basic-hit-streak',
      maximumActivations: 1,
      requiredConsecutiveHits: 3,
      bonusDamage: 6,
    }),
    'v1-center-fold': definePowerUp({
      id: 'v1-center-fold',
      name: 'Center Fold',
      shortName: 'CENTER FOLD',
      rarity: 'common',
      description:
        'First crossing below half hearts turns toward center and grants 4 defense ticks.',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      durationTicks: 4,
    }),
    'v1-double-doodle': definePowerUp({
      id: 'v1-double-doodle',
      name: 'Double Doodle',
      shortName: 'DOUBLE DOODLE',
      rarity: 'rare',
      description:
        'First landed signature echoes after 6 ticks at 35% power, capped at 12 damage.',
      trigger: 'landed-signature',
      maximumActivations: 1,
      delayTicks: 6,
      powerPermille: 350,
      bonusDamageCap: 12,
    }),
    'v1-backup-plan': definePowerUp({
      id: 'v1-backup-plan',
      name: 'Backup Plan',
      shortName: 'BACKUP PLAN',
      rarity: 'rare',
      description:
        'First missed signature retries after 12 ticks at 50% power.',
      trigger: 'missed-signature',
      maximumActivations: 1,
      exclusiveGroup: 'signature-retry',
      delayTicks: 12,
      powerPermille: 500,
    }),
    'v1-counter-sketch': definePowerUp({
      id: 'v1-counter-sketch',
      name: 'Counter Sketch',
      shortName: 'COUNTER SKETCH',
      rarity: 'rare',
      description:
        'First enemy signature schedules a half-power basic counter, capped at 10 damage.',
      trigger: 'enemy-signature',
      maximumActivations: 1,
      powerPermille: 500,
      bonusDamageCap: 10,
    }),
    'v1-wallop': definePowerUp({
      id: 'v1-wallop',
      name: 'Wallop',
      shortName: 'WALLOP',
      rarity: 'rare',
      description:
        "First opponent wall bounce after the owner's knockback adds 8 damage.",
      trigger: 'knockback-wall-bounce',
      maximumActivations: 1,
      bonusDamage: 8,
    }),
    'v1-echo-mark': definePowerUp({
      id: 'v1-echo-mark',
      name: 'Echo Mark',
      shortName: 'ECHO MARK',
      rarity: 'rare',
      description:
        'First signature hit marks the target; the next landed basic consumes it for 8 damage.',
      trigger: 'marked-target-basic',
      maximumActivations: 1,
      bonusDamage: 8,
    }),
    'v1-last-scribble': definePowerUp({
      id: 'v1-last-scribble',
      name: 'Last Scribble',
      shortName: 'LAST SCRIBBLE',
      rarity: 'epic',
      description:
        'First lethal enemy hit leaves 1 heart and grants 6 defense ticks.',
      trigger: 'lethal-hit',
      maximumActivations: 1,
      survivingHitPoints: 1,
      durationTicks: 6,
    }),
    'v1-second-draft': definePowerUp({
      id: 'v1-second-draft',
      name: 'Second Draft',
      shortName: 'SECOND DRAFT',
      rarity: 'epic',
      description:
        'First missed signature retries after 10 ticks at 65% power.',
      trigger: 'missed-signature',
      maximumActivations: 1,
      exclusiveGroup: 'signature-retry',
      delayTicks: 10,
      powerPermille: 650,
    }),
    'v1-paper-twin': definePowerUp({
      id: 'v1-paper-twin',
      name: 'Paper Twin',
      shortName: 'PAPER TWIN',
      rarity: 'epic',
      description:
        'Below half hearts, the next 2 landed basics echo at 35%, capped at 6 damage each.',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      repeatedAttacks: 2,
      powerPermille: 350,
      bonusDamageCap: 6,
    }),
    'v1-masterpiece': definePowerUp({
      id: 'v1-masterpiece',
      name: 'Masterpiece',
      shortName: 'MASTERPIECE',
      rarity: 'legendary',
      description:
        'After 3 distinct non-Legendary Power-Ups trigger, release an 18-damage ink burst.',
      trigger: 'distinct-power-ups',
      maximumActivations: 1,
      requiredDistinctPowerUps: 3,
      bonusDamage: 18,
    }),
    'v1-endless-draft': definePowerUp({
      id: 'v1-endless-draft',
      name: 'Endless Draft',
      shortName: 'ENDLESS DRAFT',
      rarity: 'legendary',
      description:
        'The first consumed Common Power-Up receives 1 extra activation.',
      trigger: 'common-power-up',
      maximumActivations: 1,
    }),
  });

export const isPowerUpId = (value: unknown): value is PowerUpId =>
  typeof value === 'string' && POWER_UP_IDS.includes(value as PowerUpId);

export type PowerUpBuildValidation =
  | Readonly<{ valid: true; powerUpIds: readonly PowerUpId[] }>
  | Readonly<{
      valid: false;
      reason:
        | 'not-an-array'
        | 'unknown-id'
        | 'duplicate'
        | 'too-many'
        | 'too-many-legendary'
        | 'exclusive-conflict';
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
  const seenExclusiveGroups = new Set<PowerUpExclusiveGroup>();
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
    if (definition.exclusiveGroup) {
      if (seenExclusiveGroups.has(definition.exclusiveGroup)) {
        return Object.freeze({ valid: false, reason: 'exclusive-conflict' });
      }
      seenExclusiveGroups.add(definition.exclusiveGroup);
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
}>;

const defineRarityPattern = (
  ...rarities: readonly PowerUpRarity[]
): readonly PowerUpRarity[] => Object.freeze(rarities);

export const POWER_UP_OFFER_RARITIES: Readonly<
  Record<PowerUpOfferSource, readonly PowerUpRarity[]>
> = Object.freeze({
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
}>;

export const createDeterministicPowerUpOffer = (
  input: CreatePowerUpOfferInput
): readonly PowerUpId[] | undefined => {
  const ownedValidation = validatePowerUpBuild(input.ownedPowerUpIds);
  if (!ownedValidation.valid)
    throw new Error(`Invalid owned Power-Up build: ${ownedValidation.reason}.`);
  if (ownedValidation.powerUpIds.length >= MAXIMUM_POWER_UPS) return undefined;

  const ownedIds = new Set(ownedValidation.powerUpIds);
  const ownedExclusiveGroups = new Set(
    ownedValidation.powerUpIds.flatMap((id) => {
      const group = POWER_UP_CATALOG[id].exclusiveGroup;
      return group ? [group] : [];
    })
  );
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
        (!definition.exclusiveGroup ||
          !ownedExclusiveGroups.has(definition.exclusiveGroup))
      );
    });
    if (candidates.length === 0) return undefined;
    const candidateIndex = deterministicInteger(
      normalizedSeed,
      'power-up-offer:v1',
      candidates.length,
      input.source,
      slotIndex,
      ownedValidation.powerUpIds.join(',')
    );
    const selectedId = candidates[candidateIndex];
    if (!selectedId) return undefined;
    selectedIds.push(selectedId);
  }
  return Object.freeze(selectedIds);
};
