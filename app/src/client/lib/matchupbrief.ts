// Pure content planning for the pre-fight VS ceremony. The battle engine owns
// outcomes; this module only explains the two drawing-selected mechanics.

import type { BattleKind } from '../../shared/arena';
import { ABILITY_CONFIG_BY_POWER } from '../../shared/combat/config';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import type {
  CombatElement,
  PrimaryPower,
  RawCombatStats,
} from '../../shared/combat/types';

export type BattleMatchupFighterPick = Readonly<{
  id: string;
  element: CombatElement;
  stats: RawCombatStats;
}>;

export type BattleMatchupFighterPlan = Readonly<{
  power: PrimaryPower;
  signatureName: string;
  founderEpithet: string | null;
}>;

export type BattleMatchup = Readonly<{
  label: string;
  detail: string;
}>;

export type BattleMatchupBriefInput = Readonly<{
  battleKind: BattleKind;
  fighterA: BattleMatchupFighterPick;
  fighterB: BattleMatchupFighterPick;
}>;

export type BattleMatchupBriefPlan = Readonly<{
  title: string;
  caption: string;
  matchup: BattleMatchup;
  fighters: Readonly<{
    a: BattleMatchupFighterPlan;
    b: BattleMatchupFighterPlan;
  }>;
}>;

export type BattleMatchupPowerPairKey =
  | 'inkquake|inkquake'
  | 'inkquake|nib_halo'
  | 'inkquake|smearstep'
  | 'inkquake|colorburst'
  | 'nib_halo|nib_halo'
  | 'nib_halo|smearstep'
  | 'nib_halo|colorburst'
  | 'smearstep|smearstep'
  | 'smearstep|colorburst'
  | 'colorburst|colorburst';

export const BATTLE_MATCHUP_BRIEF_CAPTION =
  'WATCH FOR • MECHANICS, NOT WIN ODDS';

export const BATTLE_MATCHUP_TITLE_BY_KIND: Readonly<
  Record<BattleKind, string>
> = Object.freeze({
  exhibition: 'EXHIBITION MATCHUP',
  practice: 'POWER PRACTICE',
  boss: 'CHAMPION CHALLENGE',
  rumble: 'RUMBLE BOUT',
});

function formatPermilleAsPercentage(permille: number): string {
  return `${permille / 10}%`;
}

function formatSmearstepDashCount(dashCount: number): string {
  if (dashCount === 1) return 'ONCE';
  if (dashCount === 2) return 'TWICE';
  return `${dashCount} TIMES`;
}

const ACTIVE_HALO_AREA_DAMAGE_REDUCTION_PERCENTAGE_TEXT =
  formatPermilleAsPercentage(
    ABILITY_CONFIG_BY_POWER.nib_halo.areaDamageReductionPermille
  );
const SMEARSTEP_DASH_COUNT_TEXT = formatSmearstepDashCount(
  ABILITY_CONFIG_BY_POWER.smearstep.dashCount
);

export const BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR: Readonly<
  Record<BattleMatchupPowerPairKey, BattleMatchup>
> = Object.freeze({
  'inkquake|inkquake': Object.freeze({
    label: 'RING vs RING',
    detail: 'RINGS HIT ONCE PER CAST AND KNOCK BACK',
  }),
  'inkquake|nib_halo': Object.freeze({
    label: 'RING vs HALO',
    detail: `ACTIVE HALO CUTS RING DAMAGE ${ACTIVE_HALO_AREA_DAMAGE_REDUCTION_PERCENTAGE_TEXT}`,
  }),
  'inkquake|smearstep': Object.freeze({
    label: 'RING vs DASH',
    detail: 'DASHES CAN CROSS THE EXPANDING RING',
  }),
  'inkquake|colorburst': Object.freeze({
    label: 'RING vs ECHO',
    detail: 'THE RING CAN SHATTER A WAITING ECHO',
  }),
  'nib_halo|nib_halo': Object.freeze({
    label: 'HALO vs HALO',
    detail: 'HALOS HAVE A DEAD ZONE • WALL NIBS RECOIL',
  }),
  'nib_halo|smearstep': Object.freeze({
    label: 'HALO vs DASH',
    detail: 'DASH DAMAGE IS NOT HALO-REDUCED • NIBS HAVE A DEAD ZONE',
  }),
  'nib_halo|colorburst': Object.freeze({
    label: 'HALO vs CONE',
    detail: `ACTIVE HALO CUTS CONE AND ECHO DAMAGE ${ACTIVE_HALO_AREA_DAMAGE_REDUCTION_PERCENTAGE_TEXT}`,
  }),
  'smearstep|smearstep': Object.freeze({
    label: 'DASH vs DASH',
    detail: `EACH CAST PREDICTS AND DASHES ${SMEARSTEP_DASH_COUNT_TEXT}`,
  }),
  'smearstep|colorburst': Object.freeze({
    label: 'DASH vs ECHO',
    detail: 'DASH CONTACT CAN SHATTER THE ECHO • CONE AIM LOCKS',
  }),
  'colorburst|colorburst': Object.freeze({
    label: 'CONE vs CONE',
    detail: 'LOCKED CONES CAN SHATTER WAITING ECHOES',
  }),
});

const EXPECTED_MATCHUP_MECHANICS_COUNT = 10;
const MAXIMUM_MATCHUP_LABEL_LENGTH = 18;
const MAXIMUM_MATCHUP_DETAIL_LENGTH = 72;
const WINNER_PREDICTION_WORD_PATTERN =
  /\b(?:advantage|weak|counter|favored|odds|chance|likely|wins)\b/i;

function assertUnreachablePower(power: never): never {
  throw new Error(`Unhandled matchup power: ${power}`);
}

function getBattleMatchupPowerPairKey(
  firstPower: PrimaryPower,
  secondPower: PrimaryPower
): BattleMatchupPowerPairKey {
  switch (firstPower) {
    case 'inkquake':
      switch (secondPower) {
        case 'inkquake':
          return 'inkquake|inkquake';
        case 'nib_halo':
          return 'inkquake|nib_halo';
        case 'smearstep':
          return 'inkquake|smearstep';
        case 'colorburst':
          return 'inkquake|colorburst';
        default:
          return assertUnreachablePower(secondPower);
      }
    case 'nib_halo':
      switch (secondPower) {
        case 'inkquake':
          return 'inkquake|nib_halo';
        case 'nib_halo':
          return 'nib_halo|nib_halo';
        case 'smearstep':
          return 'nib_halo|smearstep';
        case 'colorburst':
          return 'nib_halo|colorburst';
        default:
          return assertUnreachablePower(secondPower);
      }
    case 'smearstep':
      switch (secondPower) {
        case 'inkquake':
          return 'inkquake|smearstep';
        case 'nib_halo':
          return 'nib_halo|smearstep';
        case 'smearstep':
          return 'smearstep|smearstep';
        case 'colorburst':
          return 'smearstep|colorburst';
        default:
          return assertUnreachablePower(secondPower);
      }
    case 'colorburst':
      switch (secondPower) {
        case 'inkquake':
          return 'inkquake|colorburst';
        case 'nib_halo':
          return 'nib_halo|colorburst';
        case 'smearstep':
          return 'smearstep|colorburst';
        case 'colorburst':
          return 'colorburst|colorburst';
        default:
          return assertUnreachablePower(secondPower);
      }
    default:
      return assertUnreachablePower(firstPower);
  }
}

function planBattleMatchupFighter(
  fighter: BattleMatchupFighterPick
): BattleMatchupFighterPlan {
  const power = selectPrimaryPower(fighter.stats);
  const founder = getFoundingScribbitDefinition(fighter.id);
  return Object.freeze({
    power,
    signatureName: getShapePowerSignatureName(fighter.element, power),
    founderEpithet: founder?.personality.epithet ?? null,
  });
}

function getBattleMatchup(
  firstPower: PrimaryPower,
  secondPower: PrimaryPower
): BattleMatchup {
  return BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR[
    getBattleMatchupPowerPairKey(firstPower, secondPower)
  ];
}

export function planBattleMatchupBrief(
  input: BattleMatchupBriefInput
): BattleMatchupBriefPlan {
  const fighterA = planBattleMatchupFighter(input.fighterA);
  const fighterB = planBattleMatchupFighter(input.fighterB);
  return Object.freeze({
    title: BATTLE_MATCHUP_TITLE_BY_KIND[input.battleKind],
    caption: BATTLE_MATCHUP_BRIEF_CAPTION,
    matchup: getBattleMatchup(fighterA.power, fighterB.power),
    fighters: Object.freeze({ a: fighterA, b: fighterB }),
  });
}

export function validateBattleMatchupContent(): string[] {
  const errors: string[] = [];
  const mechanicsEntries = Object.entries(BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR);

  if (mechanicsEntries.length !== EXPECTED_MATCHUP_MECHANICS_COUNT) {
    errors.push(
      `Matchup mechanics needs exactly ${EXPECTED_MATCHUP_MECHANICS_COUNT} entries.`
    );
  }

  const uniqueContent = new Set(
    mechanicsEntries.map(
      ([, mechanics]) => `${mechanics.label}\u0000${mechanics.detail}`
    )
  );
  if (uniqueContent.size !== mechanicsEntries.length) {
    errors.push('Matchup mechanics entries must all be unique.');
  }

  for (const [pairKey, mechanics] of mechanicsEntries) {
    if (mechanics.label.length > MAXIMUM_MATCHUP_LABEL_LENGTH) {
      errors.push(
        `${pairKey} label exceeds ${MAXIMUM_MATCHUP_LABEL_LENGTH} characters.`
      );
    }
    if (mechanics.detail.length > MAXIMUM_MATCHUP_DETAIL_LENGTH) {
      errors.push(
        `${pairKey} detail exceeds ${MAXIMUM_MATCHUP_DETAIL_LENGTH} characters.`
      );
    }
    const predictionWord = WINNER_PREDICTION_WORD_PATTERN.exec(
      `${mechanics.label} ${mechanics.detail}`
    );
    if (predictionWord) {
      errors.push(
        `${pairKey} uses winner-prediction word "${predictionWord[0]}".`
      );
    }
  }

  return errors;
}
