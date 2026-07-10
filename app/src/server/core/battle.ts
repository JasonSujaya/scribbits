import type {
  BattleEvent,
  BattleKind,
  BattleReport,
  Element,
  Forecast,
  Scribbit,
} from '../../shared/arena';
import {
  ELEMENT_PREY,
  LEVEL_DAMAGE_BONUS_PER_LEVEL,
  MAX_LEVEL,
} from '../../shared/arena';
import {
  ABILITY_CONFIG_BY_POWER,
  simulateCombat,
} from '../../shared/combat';
import type {
  BattleTimelineEvent,
  BattleTranscript,
  DamageSource,
  FighterSlot,
  PrimaryPower,
} from '../../shared/combat';
import { hashTextToSeed } from './random';

const compatibilityEventLimit = 14;

const powerDisplayName: Readonly<Record<PrimaryPower, string>> = {
  inkquake: ABILITY_CONFIG_BY_POWER.inkquake.displayName,
  nib_halo: ABILITY_CONFIG_BY_POWER.nib_halo.displayName,
  smearstep: ABILITY_CONFIG_BY_POWER.smearstep.displayName,
  colorburst: ABILITY_CONFIG_BY_POWER.colorburst.displayName,
};

const damageSourceDisplayName: Readonly<Record<DamageSource, string>> = {
  inkquake: powerDisplayName.inkquake,
  nib_halo: powerDisplayName.nib_halo,
  smearstep: powerDisplayName.smearstep,
  colorburst: powerDisplayName.colorburst,
  colorburst_echo: 'Colorburst Echo',
  contact: 'body check',
  ember_burn: 'Ember afterburn',
  nib_wall_recoil: 'recoiling nib',
};

const clampLevel = (level: number): number => {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
};

export const getLevelDamageMultiplier = (level: number): number => {
  return 1 + (clampLevel(level) - 1) * LEVEL_DAMAGE_BONUS_PER_LEVEL;
};

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

const getFighter = (
  slot: FighterSlot,
  fighterA: Scribbit,
  fighterB: Scribbit
): Scribbit => {
  return slot === 'a' ? fighterA : fighterB;
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
    return `${forecast.blurb}; ${boostedNames.join(' and ')} catch the ${forecast.boostedElement} current.`;
  }

  return `${forecast.blurb}; ${nerfedNames.join(' and ')} fight through the ${forecast.nerfedElement} drag.`;
};

const getWeatherActor = (
  fighterA: Scribbit,
  forecast: Forecast
): FighterSlot => {
  return fighterA.element === forecast.boostedElement ||
    fighterA.element === forecast.nerfedElement
    ? 'a'
    : 'b';
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

const createDamageText = (
  event: Extract<BattleTimelineEvent, { kind: 'damage' }>,
  fighterA: Scribbit,
  fighterB: Scribbit
): string => {
  const attacker = getFighter(event.sourceFighter, fighterA, fighterB);
  const moveName = damageSourceDisplayName[event.source];
  const criticalLead = event.critical ? 'CRIT! ' : '';
  return `${criticalLead}${attacker.name}'s ${moveName} lands for ${event.amount}.`;
};

const projectCompatibilityEvents = (
  transcript: BattleTranscript,
  fighterA: Scribbit,
  fighterB: Scribbit,
  forecast: Forecast
): BattleEvent[] => {
  const fighterAResult = transcript.result.fighters[0];
  const fighterBResult = transcript.result.fighters[1];
  let hpA = fighterAResult.maxHitPoints;
  let hpB = fighterBResult.maxHitPoints;
  const events: BattleEvent[] = [
    {
      type: 'intro',
      actor: 'a',
      move: null,
      damage: null,
      hpA,
      hpB,
      text: `${fighterA.name} and ${fighterB.name} ricochet into the paper arena.`,
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

  const revealedPowers = new Set<FighterSlot>();
  for (const timelineEvent of transcript.timeline) {
    if (timelineEvent.kind === 'damage') {
      if (timelineEvent.targetFighter === 'a') {
        hpA = timelineEvent.targetHitPoints;
      } else {
        hpB = timelineEvent.targetHitPoints;
      }

      if (events.length < compatibilityEventLimit - 1) {
        events.push({
          type: timelineEvent.critical ? 'crit' : 'hit',
          actor: timelineEvent.sourceFighter,
          move: damageSourceDisplayName[timelineEvent.source],
          damage: timelineEvent.amount,
          hpA,
          hpB,
          text: createDamageText(timelineEvent, fighterA, fighterB),
        });
      }
      continue;
    }

    if (
      timelineEvent.kind === 'ability_telegraphed' &&
      !revealedPowers.has(timelineEvent.actor) &&
      events.length < compatibilityEventLimit - 1
    ) {
      revealedPowers.add(timelineEvent.actor);
      const actor = getFighter(timelineEvent.actor, fighterA, fighterB);
      const moveName = powerDisplayName[timelineEvent.power];
      events.push({
        type: 'move',
        actor: timelineEvent.actor,
        move: moveName,
        damage: null,
        hpA,
        hpB,
        text: `${actor.name} sketches ${moveName} into motion.`,
      });
    }
  }

  const loser = transcript.result.loser;
  const loserScribbit = getFighter(loser, fighterA, fighterB);
  const winnerScribbit = getFighter(transcript.result.winner, fighterA, fighterB);
  events.push({
    type: 'faint',
    actor: loser,
    move: null,
    damage: null,
    hpA: fighterAResult.finalHitPoints,
    hpB: fighterBResult.finalHitPoints,
    text:
      transcript.result.reason === 'knockout' ||
      transcript.result.reason === 'double_knockout'
        ? `${loserScribbit.name} folds into a dramatic doodle pile.`
        : `Time! ${winnerScribbit.name} takes the paper-thin decision.`,
  });

  return events;
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
    events: projectCompatibilityEvents(simulation, fighterA, fighterB, forecast),
    simulation,
  };
};
