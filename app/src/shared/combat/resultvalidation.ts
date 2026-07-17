import type {
  AuthoritativeBattleResult,
  FighterResult,
  FighterSlot,
} from './types';

function fighterNumbersAreConsistent(fighter: FighterResult): boolean {
  return (
    Number.isSafeInteger(fighter.finalHitPoints) &&
    Number.isSafeInteger(fighter.maxHitPoints) &&
    Number.isSafeInteger(fighter.hitPointPermille) &&
    Number.isSafeInteger(fighter.damageDealt) &&
    fighter.maxHitPoints > 0 &&
    fighter.finalHitPoints >= 0 &&
    fighter.finalHitPoints <= fighter.maxHitPoints &&
    fighter.damageDealt >= 0 &&
    fighter.hitPointPermille ===
      Math.floor((fighter.finalHitPoints * 1_000) / fighter.maxHitPoints)
  );
}

function fighterForSlot(
  result: AuthoritativeBattleResult,
  slot: FighterSlot
): FighterResult {
  return result.fighters[slot === 'a' ? 0 : 1];
}

function expectedWinnerFromComparison(
  comparison: number
): FighterSlot | undefined {
  if (comparison > 0) return 'a';
  if (comparison < 0) return 'b';
  return undefined;
}

/**
 * Verifies that the saved finish label, winner, and terminal fighter state tell
 * one coherent story. Stable seed tie-breaking remains engine-owned; this gate
 * only proves the conditions that make that final fallback legal.
 */
export function battleResultFinishIsConsistent(
  result: AuthoritativeBattleResult,
  maximumTick: number,
  sameRoleDoubleKnockoutUsesDamageShare = false
): boolean {
  const fighterA = result.fighters[0];
  const fighterB = result.fighters[1];
  if (
    fighterA.slot !== 'a' ||
    fighterB.slot !== 'b' ||
    result.winner === result.loser ||
    !fighterNumbersAreConsistent(fighterA) ||
    !fighterNumbersAreConsistent(fighterB)
  ) {
    return false;
  }

  const winner = fighterForSlot(result, result.winner);
  const loser = fighterForSlot(result, result.loser);
  const bothStanding =
    fighterA.finalHitPoints > 0 && fighterB.finalHitPoints > 0;
  const hitPointPercentageComparison =
    fighterA.finalHitPoints * fighterB.maxHitPoints -
    fighterB.finalHitPoints * fighterA.maxHitPoints;

  switch (result.reason) {
    case 'knockout':
      return winner.finalHitPoints > 0 && loser.finalHitPoints === 0;
    case 'double_knockout': {
      if (fighterA.finalHitPoints !== 0 || fighterB.finalHitPoints !== 0) {
        return false;
      }
      const doubleKnockoutComparison =
        sameRoleDoubleKnockoutUsesDamageShare &&
        fighterA.combatRole === fighterB.combatRole
          ? fighterA.damageDealt * fighterA.maxHitPoints -
            fighterB.damageDealt * fighterB.maxHitPoints
          : fighterA.damageDealt - fighterB.damageDealt;
      return (
        doubleKnockoutComparison === 0 ||
        result.winner ===
          expectedWinnerFromComparison(doubleKnockoutComparison)
      );
    }
    case 'timeout_hp_percentage':
      return (
        bothStanding &&
        result.completedTick === maximumTick &&
        result.winner ===
          expectedWinnerFromComparison(hitPointPercentageComparison)
      );
    case 'timeout_damage_dealt':
      return (
        bothStanding &&
        result.completedTick === maximumTick &&
        hitPointPercentageComparison === 0 &&
        fighterA.damageDealt !== fighterB.damageDealt &&
        result.winner ===
          expectedWinnerFromComparison(
            fighterA.damageDealt - fighterB.damageDealt
          )
      );
    case 'timeout_stable_tiebreak':
      return (
        bothStanding &&
        result.completedTick === maximumTick &&
        hitPointPercentageComparison === 0 &&
        fighterA.damageDealt === fighterB.damageDealt
      );
  }
}
