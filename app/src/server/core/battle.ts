import type {
  BattleKind,
  BattleReport,
  Element,
  Forecast,
  Scribbit,
} from '../../shared/arena';
import { ELEMENT_PREY } from '../../shared/arena';
import { cloneScribbit } from '../../shared/arena';
import { getLevelDamageMultiplier } from '../../shared/battle';
import { simulateCombat } from '../../shared/combat';
import { projectStatsForCurrentCombat } from '../../shared/combat/selection';
import {
  gearCombatFingerprint,
  resolveGearCombatLoadout,
} from '../../shared/gearcombat';
import {
  evaluateBattleArenaChallenge,
  getBattleArenaDefinition,
  getBattleArenaForDay,
  type BattleArenaId,
} from '../../shared/battlearena';
import { hashTextToSeed } from './random';

// Retained for stored-report compatibility and forecast copy. The fixed-tick
// engine replaces this old blanket matchup multiplier with readable elemental
// payloads: Ember burn, Tide knockback, Moss barrier, and Storm timing.
export const getElementDamageMultiplier = (
  attackerElement: Element,
  defenderElement: Element
): number => {
  if (ELEMENT_PREY[attackerElement] === defenderElement) {
    return 1.25;
  }

  if (ELEMENT_PREY[defenderElement] === attackerElement) {
    return 0.75;
  }

  return 1;
};

export const getForecastDamageMultiplier = (
  attackerElement: Element,
  forecast: Forecast
): number => {
  if (attackerElement === forecast.boostedElement) {
    return 1.15;
  }

  if (attackerElement === forecast.nerfedElement) {
    return 0.9;
  }

  return 1;
};

const createReportId = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind,
  battleArenaId: BattleArenaId,
  gearFingerprint: string
): string => {
  const gearIdentity = gearFingerprint ? `:gear-v1:${gearFingerprint}` : '';
  const identity = `${kind}:${forecast.day}:${battleArenaId}:${seed}:${fighterA.id}:${fighterB.id}${gearIdentity}`;
  const digest = [0, 1, 2, 3]
    .map((lane) => {
      return hashTextToSeed(`report-id-v5:power-ups-v1:${lane}:${identity}`)
        .toString(36)
        .padStart(7, '0');
    })
    .join('');
  return `battle-${kind}-${forecast.day}-${digest}`;
};

const createCombatSeed = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind,
  battleArenaId: BattleArenaId
): string => {
  return `power-ups-v1:${kind}:${forecast.day}:${battleArenaId}:${seed}:${fighterA.id}:${fighterB.id}`;
};

const getCombatDamageModifierPermille = (fighter: Scribbit): number =>
  Math.round(getLevelDamageMultiplier(fighter.level) * 1_000);

export const simulate = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind,
  options: Readonly<{ battleArenaId?: BattleArenaId }> = {}
): BattleReport => {
  const battleArena = options.battleArenaId
    ? getBattleArenaDefinition(options.battleArenaId)
    : getBattleArenaForDay(forecast.day);
  // Active Gear starts in direct Exhibition/Spar fights. Rumble, Champion,
  // and Practice stay on the combat-neutral rules until the wider matrix ships.
  const gearEnabled = kind === 'exhibition';
  const fighterAGear = resolveGearCombatLoadout(fighterA);
  const fighterBGear = resolveGearCombatLoadout(fighterB);
  const gearFingerprint =
    gearEnabled && (fighterAGear.snapshot || fighterBGear.snapshot)
      ? `a[${gearCombatFingerprint(fighterAGear)}]:b[${gearCombatFingerprint(fighterBGear)}]`
      : '';
  const simulation = simulateCombat({
    seed: createCombatSeed(
      fighterA,
      fighterB,
      seed,
      forecast,
      kind,
      battleArena.id
    ),
    battleArenaId: battleArena.id,
    fighters: [
      {
        id: fighterA.id,
        name: fighterA.name,
        stats: projectStatsForCurrentCombat(fighterA.stats),
        powerUpIds: [...(fighterA.powerUpIds ?? [])],
        damageModifierPermille: getCombatDamageModifierPermille(fighterA),
        ...(gearEnabled && fighterAGear.snapshot
          ? { gear: fighterAGear.snapshot }
          : {}),
      },
      {
        id: fighterB.id,
        name: fighterB.name,
        stats: projectStatsForCurrentCombat(fighterB.stats),
        powerUpIds: [...(fighterB.powerUpIds ?? [])],
        damageModifierPermille: getCombatDamageModifierPermille(fighterB),
        ...(gearEnabled && fighterBGear.snapshot
          ? { gear: fighterBGear.snapshot }
          : {}),
      },
    ],
  });

  return {
    id: createReportId(
      fighterA,
      fighterB,
      seed,
      forecast,
      kind,
      battleArena.id,
      gearFingerprint
    ),
    kind,
    day: forecast.day,
    a: cloneScribbit(fighterA),
    b: cloneScribbit(fighterB),
    winner: simulation.result.winner,
    battleArenaId: battleArena.id,
    arenaChallenge: evaluateBattleArenaChallenge(battleArena.id, simulation),
    simulation,
  };
};
