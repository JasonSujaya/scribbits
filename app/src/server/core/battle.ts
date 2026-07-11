import type {
  BattleKind,
  BattleReport,
  Element,
  Forecast,
  Scribbit,
} from '../../shared/arena';
import { ELEMENT_PREY } from '../../shared/arena';
import { getLevelDamageMultiplier } from '../../shared/battle';
import { simulateCombat } from '../../shared/combat';
import { hashTextToSeed } from './random';

export { getLevelDamageMultiplier } from '../../shared/battle';

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

const cloneScribbitSnapshot = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    accessories: [...scribbit.accessories],
    careDoneToday: [...scribbit.careDoneToday],
  };
};

const createReportId = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind
): string => {
  const reportSeed = hashTextToSeed(
    `${kind}:${forecast.day}:${seed}:${fighterA.id}:${fighterB.id}`
  );
  return `battle-${kind}-${forecast.day}-${reportSeed.toString(36)}`;
};

const createCombatSeed = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind
): string => {
  return `${kind}:${forecast.day}:${seed}:${fighterA.id}:${fighterB.id}`;
};

const getCombatDamageModifierPermille = (
  fighter: Scribbit,
  forecast: Forecast
): number => {
  return Math.round(
    getLevelDamageMultiplier(fighter.level) *
      getForecastDamageMultiplier(fighter.element, forecast) *
      1_000
  );
};

export const simulate = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind
): BattleReport => {
  const simulation = simulateCombat({
    seed: createCombatSeed(fighterA, fighterB, seed, forecast, kind),
    fighters: [
      {
        id: fighterA.id,
        name: fighterA.name,
        element: fighterA.element,
        stats: fighterA.stats,
        damageModifierPermille: getCombatDamageModifierPermille(
          fighterA,
          forecast
        ),
      },
      {
        id: fighterB.id,
        name: fighterB.name,
        element: fighterB.element,
        stats: fighterB.stats,
        damageModifierPermille: getCombatDamageModifierPermille(
          fighterB,
          forecast
        ),
      },
    ],
  });

  return {
    id: createReportId(fighterA, fighterB, seed, forecast, kind),
    kind,
    day: forecast.day,
    a: cloneScribbitSnapshot(fighterA),
    b: cloneScribbitSnapshot(fighterB),
    winner: simulation.result.winner,
    simulation,
  };
};
