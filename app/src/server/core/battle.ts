import type {
  BattleEvent,
  BattleKind,
  BattleReport,
  Element,
  Forecast,
  Scribbit,
} from '../../shared/arena';
import {
  BELIEF_MOVE_UNLOCK,
  ELEMENT_PREY,
  MOVES_BY_ELEMENT,
} from '../../shared/arena';
import { getBattleMaxHp } from '../../shared/battle';
import { createMulberry32, hashTextToSeed } from './random';

type FighterSlot = 'a' | 'b';

type AttackChoice = {
  moveName: string;
  isBeliefMove: boolean;
};

const maxAttackCount = 5;

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

const getPossessiveName = (name: string): string => {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
};

const getFighter = (
  slot: FighterSlot,
  fighterA: Scribbit,
  fighterB: Scribbit
): Scribbit => {
  return slot === 'a' ? fighterA : fighterB;
};

const getOtherSlot = (slot: FighterSlot): FighterSlot => {
  return slot === 'a' ? 'b' : 'a';
};

const chooseFirstSlot = (fighterA: Scribbit, fighterB: Scribbit): FighterSlot => {
  if (fighterA.stats.zip !== fighterB.stats.zip) {
    return fighterA.stats.zip > fighterB.stats.zip ? 'a' : 'b';
  }

  if (fighterA.stats.charm !== fighterB.stats.charm) {
    return fighterA.stats.charm > fighterB.stats.charm ? 'a' : 'b';
  }

  return fighterA.id <= fighterB.id ? 'a' : 'b';
};

const chooseMove = (
  scribbit: Scribbit,
  attackNumber: number
): AttackChoice => {
  const moves = MOVES_BY_ELEMENT[scribbit.element];

  if (
    scribbit.belief >= BELIEF_MOVE_UNLOCK &&
    attackNumber > 0 &&
    attackNumber % 3 === 0
  ) {
    return {
      moveName: moves[2],
      isBeliefMove: true,
    };
  }

  return {
    moveName: attackNumber % 2 === 1 ? moves[0] : moves[1],
    isBeliefMove: false,
  };
};

const createMoveText = (scribbit: Scribbit, moveName: string): string => {
  return `${scribbit.name} winds up ${moveName} with deeply questionable confidence.`;
};

const createHitText = (
  attacker: Scribbit,
  moveName: string,
  damage: number,
  isCrit: boolean
): string => {
  const critLead = isCrit ? 'CRIT! ' : '';
  return `${critLead}${getPossessiveName(attacker.name)} ${moveName} connects - ${damage} damage!`;
};

const createWeatherText = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  forecast: Forecast
): string => {
  const boostedNames = [fighterA, fighterB]
    .filter((fighter) => fighter.element === forecast.boostedElement)
    .map((fighter) => fighter.name);
  const nerfedNames = [fighterA, fighterB]
    .filter((fighter) => fighter.element === forecast.nerfedElement)
    .map((fighter) => fighter.name);

  if (boostedNames.length > 0) {
    return `${forecast.blurb}; ${boostedNames.join(' and ')} get a ${forecast.boostedElement} boost.`;
  }

  return `${forecast.blurb}; ${nerfedNames.join(' and ')} feel the ${forecast.nerfedElement} wobble.`;
};

const getWeatherActor = (
  fighterA: Scribbit,
  forecast: Forecast
): FighterSlot => {
  if (
    fighterA.element === forecast.boostedElement ||
    fighterA.element === forecast.nerfedElement
  ) {
    return 'a';
  }

  return 'b';
};

const forecastAffectsBattle = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  forecast: Forecast
): boolean => {
  return [fighterA.element, fighterB.element].some((element) => {
    return element === forecast.boostedElement || element === forecast.nerfedElement;
  });
};

const chooseWinnerByRemainingHp = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  hpA: number,
  hpB: number
): FighterSlot => {
  if (hpA !== hpB) {
    return hpA > hpB ? 'a' : 'b';
  }

  if (fighterA.stats.zip !== fighterB.stats.zip) {
    return fighterA.stats.zip > fighterB.stats.zip ? 'a' : 'b';
  }

  if (fighterA.stats.charm !== fighterB.stats.charm) {
    return fighterA.stats.charm > fighterB.stats.charm ? 'a' : 'b';
  }

  return fighterA.id <= fighterB.id ? 'a' : 'b';
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

const calculateDamage = (
  attacker: Scribbit,
  defender: Scribbit,
  forecast: Forecast,
  randomNumber: () => number,
  isBeliefMove: boolean
): { damage: number; isCrit: boolean } => {
  const baseDamage = 8 + attacker.stats.spike * 0.9;
  const diceMultiplier = 0.9 + randomNumber() * 0.2;
  const critChance = Math.min(0.25, attacker.stats.charm / 220);
  const isCrit = randomNumber() < critChance;
  const critMultiplier = isCrit ? 1.6 : 1;
  const beliefMultiplier = isBeliefMove ? 1.1 : 1;
  const damage = Math.max(
    1,
    Math.round(
      baseDamage *
        getElementDamageMultiplier(attacker.element, defender.element) *
        getForecastDamageMultiplier(attacker.element, forecast) *
        diceMultiplier *
        critMultiplier *
        beliefMultiplier
    )
  );

  return {
    damage,
    isCrit,
  };
};

export const simulate = (
  fighterA: Scribbit,
  fighterB: Scribbit,
  seed: number,
  forecast: Forecast,
  kind: BattleKind
): BattleReport => {
  const randomNumber = createMulberry32(seed);
  const firstSlot = chooseFirstSlot(fighterA, fighterB);
  const secondSlot = getOtherSlot(firstSlot);
  const turnOrder: [FighterSlot, FighterSlot] = [firstSlot, secondSlot];
  const attackCounts: Record<FighterSlot, number> = {
    a: 0,
    b: 0,
  };
  let hpA = getBattleMaxHp(fighterA.stats);
  let hpB = getBattleMaxHp(fighterB.stats);
  const events: BattleEvent[] = [
    {
      type: 'intro',
      actor: firstSlot,
      move: null,
      damage: null,
      hpA,
      hpB,
      text: `${fighterA.name} and ${fighterB.name} stomp into the bracket like they own the crayons.`,
    },
  ];

  if (forecastAffectsBattle(fighterA, fighterB, forecast)) {
    events.push({
      type: 'weather',
      actor: getWeatherActor(fighterA, forecast),
      move: null,
      damage: null,
      hpA,
      hpB,
      text: createWeatherText(fighterA, fighterB, forecast),
    });
  }

  let attacksResolved = 0;
  while (attacksResolved < maxAttackCount && hpA > 0 && hpB > 0) {
    const actor = attacksResolved % 2 === 0 ? turnOrder[0] : turnOrder[1];
    const defender = getOtherSlot(actor);
    const attackerScribbit = getFighter(actor, fighterA, fighterB);
    const defenderScribbit = getFighter(defender, fighterA, fighterB);
    attackCounts[actor] += 1;
    const attackChoice = chooseMove(attackerScribbit, attackCounts[actor]);

    events.push({
      type: 'move',
      actor,
      move: attackChoice.moveName,
      damage: null,
      hpA,
      hpB,
      text: createMoveText(attackerScribbit, attackChoice.moveName),
    });

    const damageResult = calculateDamage(
      attackerScribbit,
      defenderScribbit,
      forecast,
      randomNumber,
      attackChoice.isBeliefMove
    );

    if (defender === 'a') {
      hpA = Math.max(0, hpA - damageResult.damage);
      if (hpA === 0 && attacksResolved === 0) {
        hpA = 1;
      }
    } else {
      hpB = Math.max(0, hpB - damageResult.damage);
      if (hpB === 0 && attacksResolved === 0) {
        hpB = 1;
      }
    }

    events.push({
      type: damageResult.isCrit ? 'crit' : 'hit',
      actor,
      move: attackChoice.moveName,
      damage: damageResult.damage,
      hpA,
      hpB,
      text: createHitText(
        attackerScribbit,
        attackChoice.moveName,
        damageResult.damage,
        damageResult.isCrit
      ),
    });

    attacksResolved += 1;
  }

  const winner =
    hpA <= 0
      ? 'b'
      : hpB <= 0
        ? 'a'
        : chooseWinnerByRemainingHp(fighterA, fighterB, hpA, hpB);
  const loser = getOtherSlot(winner);
  const loserScribbit = getFighter(loser, fighterA, fighterB);

  if (loser === 'a') {
    hpA = 0;
  } else {
    hpB = 0;
  }

  events.push({
    type: 'faint',
    actor: loser,
    move: null,
    damage: null,
    hpA,
    hpB,
    text: `${loserScribbit.name} folds into a heroic little floor scribble.`,
  });

  return {
    id: createReportId(fighterA, fighterB, seed, forecast, kind),
    kind,
    day: forecast.day,
    a: fighterA,
    b: fighterB,
    winner,
    events,
  };
};
