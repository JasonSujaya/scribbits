import { deterministicInteger, normalizeCombatSeed } from './random';
import type { AccessoryEffectFamily } from '../accessoryeffects';
import type { CombatRole } from './types';
import { toCurrentCombatRole } from './roles';

export const MAXIMUM_POWER_UPS = 5;
export const MAXIMUM_GROWING_POWER_UPS = 3;
export const MAXIMUM_LEGENDARY_POWER_UPS = 1;
// System-wide safety budgets, not per-card balance levers. Both damage and
// healing scale with maximum health so percentage cards stay honest at every
// progression stage: a fighter's bonus Power-Up damage is capped at 15% of the
// opponent's maximum health per fight, and Power-Up healing at 20% of its own.
export const MAXIMUM_POWER_UP_BONUS_DAMAGE_PERMILLE = 150;
export const MAXIMUM_POWER_UP_HEALING_PERMILLE = 200;
// This is a safety ceiling, not a balance lever. Individual cards own their
// activation caps so a full build cannot starve later cards by trigger order.
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
export const POWER_UP_RARITIES = Object.freeze([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const);
export type PowerUpRarity = (typeof POWER_UP_RARITIES)[number];
export type PowerUpBuildPath =
  | 'bounce'
  | 'combo'
  | 'survival'
  | 'special'
  | 'wildcard';

export type PowerUpPlaystyleProfile = Readonly<{
  recommendedRoles: readonly CombatRole[];
  avoidedRoles: readonly CombatRole[];
  maturityUnlockedRoles: readonly CombatRole[];
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
  powerPermille?: number;
  maximumHitPointHealingPermille?: number;
  preventedDamagePermille?: number;
  targetMaxHitPointDamagePermille?: number;
  requiredConsecutiveHits?: number;
  requiredDistinctPowerUps?: number;
  repeatedAttacks?: number;
  extraActivations?: number;
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
      when: 'The first time you touch a wall',
      effect:
        'Restore 2% max health and your next 2 normal hits deal 25% extra damage',
      trigger: 'wall-bounce',
      maximumActivations: 1,
      maximumHitPointHealingPermille: 20,
      repeatedAttacks: 2,
      powerPermille: 250,
    }),
    'v1-smudge-step': definePowerUp({
      id: 'v1-smudge-step',
      name: 'Smudge Step',
      shortName: 'SMUDGE STEP',
      rarity: 'common',
      buildPath: 'survival',
      when: 'Every fourth normal attack would hit you',
      effect: 'Deflect 50% of that hit, up to 2 times',
      trigger: 'incoming-basic',
      maximumActivations: 2,
      preventedDamagePermille: 500,
    }),
    'v1-paper-shield': definePowerUp({
      id: 'v1-paper-shield',
      name: 'Paper Shield',
      shortName: 'PAPER SHIELD',
      rarity: 'common',
      buildPath: 'survival',
      when: "The enemy's special move hits you",
      effect: 'Block 25% of that hit',
      trigger: 'incoming-signature',
      maximumActivations: 1,
      preventedDamagePermille: 250,
    }),
    'v1-combo-spark': definePowerUp({
      id: 'v1-combo-spark',
      name: 'Combo Spark',
      shortName: 'COMBO SPARK',
      rarity: 'common',
      buildPath: 'combo',
      when: 'Your third consecutive normal hit lands',
      effect: 'Deal 25% extra damage and restore 2% max health',
      trigger: 'basic-hit-streak',
      maximumActivations: 1,
      requiredConsecutiveHits: 3,
      powerPermille: 250,
      maximumHitPointHealingPermille: 20,
    }),
    'v1-center-fold': definePowerUp({
      id: 'v1-center-fold',
      name: 'Center Fold',
      shortName: 'CENTER FOLD',
      rarity: 'common',
      buildPath: 'survival',
      when: 'You fall below half health',
      effect: 'Restore 6% max health',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      maximumHitPointHealingPermille: 60,
    }),
    'v1-double-doodle': definePowerUp({
      id: 'v1-double-doodle',
      name: 'Double Doodle',
      shortName: 'DOUBLE DOODLE',
      rarity: 'uncommon',
      buildPath: 'special',
      when: 'A special move hits',
      effect: 'Repeat 25% of that hit',
      trigger: 'landed-signature',
      maximumActivations: 1,
      delayTicks: 6,
      powerPermille: 250,
    }),
    'v1-backup-plan': definePowerUp({
      id: 'v1-backup-plan',
      name: 'Heart Ink',
      shortName: 'HEART INK',
      rarity: 'uncommon',
      buildPath: 'combo',
      when: 'Every fourth normal hit, up to 2 times',
      effect: 'Restore 3% max health',
      trigger: 'basic-hit-count',
      maximumActivations: 2,
      requiredConsecutiveHits: 4,
      maximumHitPointHealingPermille: 30,
    }),
    'v1-counter-sketch': definePowerUp({
      id: 'v1-counter-sketch',
      name: 'Counter Sketch',
      shortName: 'COUNTER SKETCH',
      rarity: 'uncommon',
      buildPath: 'survival',
      when: "The enemy's special move hits you",
      effect: 'Strike back for 50% of your normal attack damage',
      trigger: 'enemy-signature',
      maximumActivations: 1,
      powerPermille: 500,
    }),
    'v1-wallop': definePowerUp({
      id: 'v1-wallop',
      name: 'Wallop',
      shortName: 'WALLOP',
      rarity: 'rare',
      buildPath: 'bounce',
      when: 'You knock the enemy into a wall, up to 2 times',
      effect: 'Deal 50% of your normal attack damage each time',
      trigger: 'knockback-wall-bounce',
      maximumActivations: 2,
      powerPermille: 500,
    }),
    'v1-echo-mark': definePowerUp({
      id: 'v1-echo-mark',
      name: 'Echo Mark',
      shortName: 'ECHO MARK',
      rarity: 'rare',
      buildPath: 'special',
      when: 'A special move hits',
      effect: 'Your next 2 normal hits deal 40% extra damage',
      trigger: 'marked-target-basic',
      maximumActivations: 1,
      repeatedAttacks: 2,
      powerPermille: 400,
    }),
    'v1-last-scribble': definePowerUp({
      id: 'v1-last-scribble',
      name: 'Last Scribble',
      shortName: 'LAST SCRIBBLE',
      rarity: 'epic',
      buildPath: 'survival',
      when: 'A hit would knock you out',
      effect: 'Survive one knockout blow with 10% max health',
      trigger: 'lethal-hit',
      maximumActivations: 1,
      survivingHitPointPermille: 100,
    }),
    'v1-second-draft': definePowerUp({
      id: 'v1-second-draft',
      name: 'Ink Rage',
      shortName: 'INK RAGE',
      rarity: 'epic',
      buildPath: 'survival',
      when: 'You fall below half health',
      effect:
        'Your next 3 normal hits deal 30% extra damage and restore 2% max health',
      trigger: 'below-half-hearts',
      maximumActivations: 1,
      repeatedAttacks: 3,
      powerPermille: 300,
      maximumHitPointHealingPermille: 20,
    }),
    'v1-paper-twin': definePowerUp({
      id: 'v1-paper-twin',
      name: 'Paper Twin',
      shortName: 'PAPER TWIN',
      rarity: 'epic',
      buildPath: 'combo',
      when: 'Your first normal attack hits',
      effect: 'Your first 2 normal hits repeat for 50% of their damage',
      trigger: 'first-basic-hit',
      maximumActivations: 1,
      repeatedAttacks: 2,
      powerPermille: 500,
    }),
    'v1-masterpiece': definePowerUp({
      id: 'v1-masterpiece',
      name: 'Masterpiece',
      shortName: 'MASTERPIECE',
      rarity: 'legendary',
      buildPath: 'wildcard',
      when: 'Three different non-Legendary Power-Ups activate',
      effect: "Deal 10% of the enemy's max health and restore 10% max health",
      trigger: 'distinct-power-ups',
      maximumActivations: 1,
      requiredDistinctPowerUps: 3,
      targetMaxHitPointDamagePermille: 100,
      maximumHitPointHealingPermille: 100,
    }),
    'v1-endless-draft': definePowerUp({
      id: 'v1-endless-draft',
      name: 'Endless Draft',
      shortName: 'ENDLESS DRAFT',
      rarity: 'legendary',
      buildPath: 'wildcard',
      when: 'A Common, Uncommon, or Rare Power-Up activates',
      effect: 'Let every Common, Uncommon, and Rare activate 1 extra time',
      trigger: 'common-power-up',
      maximumActivations: 1,
      extraActivations: 1,
    }),
  });

const definePlaystyleProfile = (
  recommendedRoles: readonly CombatRole[],
  gearFamilies: readonly AccessoryEffectFamily[],
  avoidedRoles: readonly CombatRole[] = [],
  maturityUnlockedRoles: readonly CombatRole[] = []
): PowerUpPlaystyleProfile =>
  Object.freeze({
    recommendedRoles: Object.freeze([...recommendedRoles]),
    avoidedRoles: Object.freeze([...avoidedRoles]),
    maturityUnlockedRoles: Object.freeze([...maturityUnlockedRoles]),
    gearFamilies: Object.freeze([...gearFamilies]),
  });

export const POWER_UP_PLAYSTYLE_PROFILES: Readonly<
  Record<PowerUpId, PowerUpPlaystyleProfile>
> = Object.freeze({
  'v1-edge-spring': definePlaystyleProfile(
    ['mage'],
    ['rush', 'ready'],
    ['brawler', 'longshot']
  ),
  'v1-smudge-step': definePlaystyleProfile(
    ['longshot'],
    ['rush', 'focus'],
    ['mage']
  ),
  'v1-paper-shield': definePlaystyleProfile(['brawler'], ['guard', 'fortune']),
  'v1-combo-spark': definePlaystyleProfile(
    ['mage'],
    ['rush', 'ready', 'aim'],
    ['brawler']
  ),
  'v1-center-fold': definePlaystyleProfile(
    ['mage'],
    ['guard', 'fortune'],
    ['brawler', 'longshot']
  ),
  'v1-double-doodle': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['focus', 'aim', 'fortune']
  ),
  'v1-backup-plan': definePlaystyleProfile(
    ['mage'],
    ['rush', 'focus', 'ready'],
    ['brawler']
  ),
  'v1-counter-sketch': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['guard', 'ready']
  ),
  'v1-wallop': definePlaystyleProfile(
    ['brawler'],
    ['guard', 'rush', 'ready'],
    ['longshot', 'mage']
  ),
  'v1-echo-mark': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['focus', 'aim', 'fortune']
  ),
  'v1-last-scribble': definePlaystyleProfile(
    ['longshot', 'mage'],
    ['guard'],
    ['brawler']
  ),
  'v1-second-draft': definePlaystyleProfile(
    ['brawler', 'mage'],
    ['focus', 'ready', 'fortune'],
    ['longshot']
  ),
  'v1-paper-twin': definePlaystyleProfile(
    ['mage'],
    ['guard', 'rush', 'fortune'],
    ['brawler', 'longshot']
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
  const unlockedAtMaturity =
    ownedPowerUpIds.length >= MAXIMUM_GROWING_POWER_UPS &&
    profile.maturityUnlockedRoles.includes(currentRole);
  if (profile.avoidedRoles.includes(currentRole) && !unlockedAtMaturity) {
    return -100;
  }
  const roleScore = profile.recommendedRoles.includes(currentRole) ? 2 : 0;
  const gearScore = profile.gearFamilies.some((family) =>
    gearFamilies.includes(family)
  )
    ? 4
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
  combatRole?: CombatRole,
  ownedPowerUpCount = 0
): boolean =>
  !combatRole ||
  !POWER_UP_PLAYSTYLE_PROFILES[powerUpId].avoidedRoles.includes(combatRole) ||
  (ownedPowerUpCount >= MAXIMUM_GROWING_POWER_UPS &&
    POWER_UP_PLAYSTYLE_PROFILES[powerUpId].maturityUnlockedRoles.includes(
      combatRole
    ));

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

export type PowerUpRarityWeights = Readonly<Record<PowerUpRarity, number>>;

const defineRarityWeights = (
  common: number,
  uncommon: number,
  rare: number,
  epic: number,
  legendary: number
): PowerUpRarityWeights =>
  Object.freeze({ common, uncommon, rare, epic, legendary });

export const POWER_UP_OFFER_RARITY_WEIGHTS: Readonly<
  Record<PowerUpOfferSource, PowerUpRarityWeights>
> = Object.freeze({
  birth: defineRarityWeights(65, 29, 5, 1, 0),
  'exhibition-win': defineRarityWeights(65, 29, 5, 1, 0),
  'rival-run-win': defineRarityWeights(65, 29, 5, 1, 0),
  'rival-run-final-win': defineRarityWeights(35, 42, 15, 8, 0),
  'rumble-day-win': defineRarityWeights(35, 42, 15, 8, 0),
  'champion-win': defineRarityWeights(5, 20, 40, 30, 5),
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
  const rarityWeights = POWER_UP_OFFER_RARITY_WEIGHTS[input.source];
  const selectedIds: PowerUpId[] = [];
  const selectedRarities: PowerUpRarity[] = [];
  const normalizedSeed = normalizeCombatSeed(input.seed);

  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const remainingCandidates = POWER_UP_IDS.filter((id) => {
      const definition = POWER_UP_CATALOG[id];
      return (
        !ownedIds.has(id) &&
        !selectedIds.includes(id) &&
        !(definition.rarity === 'legendary' && ownsLegendary) &&
        powerUpIsOfferableForRole(
          id,
          input.combatRole,
          ownedValidation.powerUpIds.length
        )
      );
    });
    const availableRarities = POWER_UP_RARITIES.filter(
      (rarity) =>
        rarityWeights[rarity] > 0 &&
        remainingCandidates.some((id) => POWER_UP_CATALOG[id].rarity === rarity)
    );
    const totalRarityWeight = availableRarities.reduce(
      (total, rarity) => total + rarityWeights[rarity],
      0
    );
    if (totalRarityWeight <= 0) return undefined;
    let rarityRoll = deterministicInteger(
      normalizedSeed,
      'power-up-offer:v3:rarity',
      totalRarityWeight,
      input.source,
      slotIndex,
      ownedValidation.powerUpIds.join(','),
      selectedRarities.join(',')
    );
    const rarity = availableRarities.find((candidateRarity) => {
      rarityRoll -= rarityWeights[candidateRarity];
      return rarityRoll < 0;
    });
    if (!rarity) return undefined;
    const candidates = remainingCandidates.filter(
      (id) => POWER_UP_CATALOG[id].rarity === rarity
    );
    const selectedId = input.combatRole
      ? (() => {
          const weightedCandidates = candidates.map((id) => ({
            id,
            weight:
              1 +
              Math.max(
                0,
                scorePowerUpFit(
                  id,
                  input.combatRole as CombatRole,
                  input.gearFamilies ?? [],
                  ownedValidation.powerUpIds
                )
              ),
          }));
          const totalWeight = weightedCandidates.reduce(
            (total, candidate) => total + candidate.weight,
            0
          );
          let candidateRoll = deterministicInteger(
            normalizedSeed,
            'power-up-offer:v4:weighted-playstyle',
            totalWeight,
            input.source,
            slotIndex,
            rarity,
            input.combatRole,
            (input.gearFamilies ?? []).join(','),
            ownedValidation.powerUpIds.join(',')
          );
          return weightedCandidates.find((candidate) => {
            candidateRoll -= candidate.weight;
            return candidateRoll < 0;
          })?.id;
        })()
      : candidates[
          deterministicInteger(
            normalizedSeed,
            'power-up-offer:v4:choice',
            candidates.length,
            input.source,
            slotIndex,
            rarity,
            ownedValidation.powerUpIds.join(',')
          )
        ];
    if (!selectedId) return undefined;
    selectedIds.push(selectedId);
    selectedRarities.push(rarity);
  }

  for (let index = selectedIds.length - 1; index > 0; index -= 1) {
    const swapIndex = deterministicInteger(
      normalizedSeed,
      'power-up-offer:v3:shuffle',
      index + 1,
      input.source,
      index,
      ownedValidation.powerUpIds.join(',')
    );
    [selectedIds[index], selectedIds[swapIndex]] = [
      selectedIds[swapIndex]!,
      selectedIds[index]!,
    ];
  }
  return Object.freeze(selectedIds);
};
