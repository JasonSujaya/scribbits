import type {
  BattleTimelineEvent,
  BattleTranscript,
  CombatRules,
  DamageSource,
} from './combat/types';
import { hashStringToUint32 } from './stablehash';

export const BATTLE_ARENA_IDS = Object.freeze([
  'v1-sticker-stadium',
  'v1-ink-playground',
  'v1-element-clash',
  'v1-chalkboard-court',
  'v1-garden-patch',
  'v1-neon-arcade',
  'v1-candy-gym',
  'v1-moonlight-puddle',
  'v1-tournament-ring',
  'v1-scribble-lab',
] as const);

export type BattleArenaId = (typeof BATTLE_ARENA_IDS)[number];

export type BattleArenaModifier = Readonly<{
  startingExtentPermille?: 920 | 1080;
  cooldownPermille?: 950 | 1050;
  movementPermille?: 950 | 1050;
  maximumHitPointsPermille?: 960 | 1040;
  shrinkStartsAtTick?: 260;
}>;

export type BattleArenaChallenge =
  | Readonly<{ kind: 'complete'; target: 1 }>
  | Readonly<{
      kind: 'event_count';
      event: 'ability_activated' | 'wall_bounce' | 'fighter_collision';
      target: number;
    }>
  | Readonly<{ kind: 'damage_source_count'; source: 'contact'; target: number }>
  | Readonly<{ kind: 'primary_damage'; target: number; afterTick?: number }>;

export type BattleArenaDefinition = Readonly<{
  id: BattleArenaId;
  name: string;
  shortRule: string;
  challengeLabel: string;
  unlockOrdinal: number;
  modifier: BattleArenaModifier;
  challenge: BattleArenaChallenge;
}>;

export type BattleArenaChallengeProgress = Readonly<{
  progress: number;
  target: number;
  completed: boolean;
}>;

const definition = (value: BattleArenaDefinition): BattleArenaDefinition =>
  Object.freeze({
    ...value,
    modifier: Object.freeze({ ...value.modifier }),
    challenge: Object.freeze({ ...value.challenge }),
  });

export const BATTLE_ARENA_CATALOG: Readonly<
  Record<BattleArenaId, BattleArenaDefinition>
> = Object.freeze({
  'v1-sticker-stadium': definition({
    id: 'v1-sticker-stadium',
    name: 'Sticker Stadium',
    shortRule: 'Even ground',
    challengeLabel: 'Finish the fight',
    unlockOrdinal: 1,
    modifier: {},
    challenge: { kind: 'complete', target: 1 },
  }),
  'v1-ink-playground': definition({
    id: 'v1-ink-playground',
    name: 'Ink Playground',
    shortRule: 'Powers 5% faster',
    challengeLabel: 'Cast 8 powers',
    unlockOrdinal: 2,
    modifier: { cooldownPermille: 950 },
    challenge: { kind: 'event_count', event: 'ability_activated', target: 8 },
  }),
  'v1-element-clash': definition({
    id: 'v1-element-clash',
    name: 'Element Clash',
    shortRule: 'Health 4% lower',
    challengeLabel: 'Deal 100 power damage',
    unlockOrdinal: 3,
    modifier: { maximumHitPointsPermille: 960 },
    challenge: { kind: 'primary_damage', target: 100 },
  }),
  'v1-chalkboard-court': definition({
    id: 'v1-chalkboard-court',
    name: 'Chalkboard Court',
    shortRule: 'Tighter opening',
    challengeLabel: 'Bounce twice',
    unlockOrdinal: 4,
    modifier: { startingExtentPermille: 920 },
    challenge: { kind: 'event_count', event: 'wall_bounce', target: 2 },
  }),
  'v1-garden-patch': definition({
    id: 'v1-garden-patch',
    name: 'Garden Patch',
    shortRule: 'Movement 5% slower',
    challengeLabel: 'Collide twice',
    unlockOrdinal: 5,
    modifier: { movementPermille: 950 },
    challenge: { kind: 'event_count', event: 'fighter_collision', target: 2 },
  }),
  'v1-neon-arcade': definition({
    id: 'v1-neon-arcade',
    name: 'Neon Arcade',
    shortRule: 'Movement 5% faster',
    challengeLabel: 'Bounce 3 times',
    unlockOrdinal: 6,
    modifier: { movementPermille: 1050 },
    challenge: { kind: 'event_count', event: 'wall_bounce', target: 3 },
  }),
  'v1-candy-gym': definition({
    id: 'v1-candy-gym',
    name: 'Candy Gym',
    shortRule: 'Powers 5% slower',
    challengeLabel: 'Land 2 bumps',
    unlockOrdinal: 7,
    modifier: { cooldownPermille: 1050 },
    challenge: { kind: 'damage_source_count', source: 'contact', target: 2 },
  }),
  'v1-moonlight-puddle': definition({
    id: 'v1-moonlight-puddle',
    name: 'Moonlight Puddle',
    shortRule: 'Health 4% higher',
    challengeLabel: 'Cast 6 powers',
    unlockOrdinal: 8,
    modifier: { maximumHitPointsPermille: 1040 },
    challenge: { kind: 'event_count', event: 'ability_activated', target: 6 },
  }),
  'v1-tournament-ring': definition({
    id: 'v1-tournament-ring',
    name: 'Tournament Ring',
    shortRule: 'Wider opening',
    challengeLabel: 'Land 4 powers',
    unlockOrdinal: 9,
    modifier: { startingExtentPermille: 1080 },
    challenge: { kind: 'primary_damage', target: 4 },
  }),
  'v1-scribble-lab': definition({
    id: 'v1-scribble-lab',
    name: 'Scribble Lab',
    shortRule: 'Early death-zone',
    challengeLabel: 'Power-hit after fold',
    unlockOrdinal: 10,
    modifier: { shrinkStartsAtTick: 260 },
    challenge: { kind: 'primary_damage', target: 1, afterTick: 260 },
  }),
});

export const DEFAULT_BATTLE_ARENA_ID: BattleArenaId = 'v1-sticker-stadium';

export const isBattleArenaId = (value: unknown): value is BattleArenaId => {
  return BATTLE_ARENA_IDS.includes(value as BattleArenaId);
};

export const getBattleArenaDefinition = (
  id: BattleArenaId | undefined
): BattleArenaDefinition => {
  return BATTLE_ARENA_CATALOG[id ?? DEFAULT_BATTLE_ARENA_ID];
};

export const getUnlockedBattleArenaDefinitions = (
  day: number
): readonly BattleArenaDefinition[] => {
  const normalizedDay = Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1;
  const unlockedCount = Math.min(
    BATTLE_ARENA_IDS.length,
    1 + Math.floor((normalizedDay - 1) / 2)
  );
  return Object.freeze(
    BATTLE_ARENA_IDS.slice(0, unlockedCount).map(
      (id) => BATTLE_ARENA_CATALOG[id]
    )
  );
};

const rawBattleArenaForDay = (day: number): BattleArenaDefinition => {
  const unlocked = getUnlockedBattleArenaDefinitions(day);
  const index = hashStringToUint32(`battle-arena:v1:${day}`) % unlocked.length;
  return unlocked[index] ?? BATTLE_ARENA_CATALOG[DEFAULT_BATTLE_ARENA_ID];
};

export const getBattleArenaForDay = (day: number): BattleArenaDefinition => {
  const normalizedDay = Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1;
  const selected = rawBattleArenaForDay(normalizedDay);
  const unlocked = getUnlockedBattleArenaDefinitions(normalizedDay);
  if (normalizedDay <= 1 || unlocked.length <= 1) return selected;
  const previous = rawBattleArenaForDay(normalizedDay - 1);
  if (previous.id !== selected.id) return selected;
  const selectedIndex = unlocked.findIndex((arena) => arena.id === selected.id);
  return unlocked[(selectedIndex + 1) % unlocked.length] ?? selected;
};

const scaleInteger = (value: number, permille: number): number => {
  return Math.max(1, Math.round((value * permille) / 1_000));
};

export const applyBattleArenaModifier = (
  baseRules: CombatRules,
  arenaId: BattleArenaId | undefined
): CombatRules => {
  const modifier = getBattleArenaDefinition(arenaId).modifier;
  const extentPermille = modifier.startingExtentPermille ?? 1_000;
  const movementPermille = modifier.movementPermille ?? 1_000;
  const hitPointsPermille = modifier.maximumHitPointsPermille ?? 1_000;
  const cooldownPermille = modifier.cooldownPermille ?? 1_000;
  const scaleCooldown = <Value extends { cooldownTicks: number }>(
    value: Value
  ): Value => ({
    ...value,
    cooldownTicks: scaleInteger(value.cooldownTicks, cooldownPermille),
  });

  return Object.freeze({
    ...baseRules,
    arena: Object.freeze({
      ...baseRules.arena,
      startingHalfWidth: scaleInteger(
        baseRules.arena.startingHalfWidth,
        extentPermille
      ),
      startingHalfHeight: scaleInteger(
        baseRules.arena.startingHalfHeight,
        extentPermille
      ),
      shrinkStartsAtTick:
        modifier.shrinkStartsAtTick ?? baseRules.arena.shrinkStartsAtTick,
    }),
    fighter: Object.freeze({
      ...baseRules.fighter,
      baseHitPoints: scaleInteger(
        baseRules.fighter.baseHitPoints,
        hitPointsPermille
      ),
      hitPointsPerChonk: scaleInteger(
        baseRules.fighter.hitPointsPerChonk,
        hitPointsPermille
      ),
      baseMovementPerTick: scaleInteger(
        baseRules.fighter.baseMovementPerTick,
        movementPermille
      ),
      movementPerZip: scaleInteger(
        baseRules.fighter.movementPerZip,
        movementPermille
      ),
    }),
    abilities: Object.freeze({
      inkquake: Object.freeze(scaleCooldown(baseRules.abilities.inkquake)),
      nib_halo: Object.freeze(scaleCooldown(baseRules.abilities.nib_halo)),
      smearstep: Object.freeze(scaleCooldown(baseRules.abilities.smearstep)),
      colorburst: Object.freeze(scaleCooldown(baseRules.abilities.colorburst)),
    }),
  });
};

const PRIMARY_DAMAGE_SOURCES = new Set<DamageSource>([
  'inkquake',
  'nib_halo',
  'smearstep',
  'colorburst',
  'colorburst_echo',
]);

const eventMatchesChallenge = (
  event: BattleTimelineEvent,
  challenge: BattleArenaChallenge
): number => {
  if (challenge.kind === 'complete') {
    return event.kind === 'battle_ended' ? 1 : 0;
  }
  if (challenge.kind === 'event_count') {
    return event.kind === challenge.event ? 1 : 0;
  }
  if (challenge.kind === 'damage_source_count') {
    return event.kind === 'damage' && event.source === challenge.source ? 1 : 0;
  }
  if (
    event.kind !== 'damage' ||
    !PRIMARY_DAMAGE_SOURCES.has(event.source) ||
    (challenge.afterTick !== undefined && event.tick < challenge.afterTick)
  ) {
    return 0;
  }
  return challenge.target >= 100 ? event.amount : 1;
};

export const evaluateBattleArenaChallenge = (
  arenaId: BattleArenaId | undefined,
  transcript: BattleTranscript
): BattleArenaChallengeProgress => {
  const challenge = getBattleArenaDefinition(arenaId).challenge;
  const progress = transcript.timeline.reduce(
    (total, event) => total + eventMatchesChallenge(event, challenge),
    0
  );
  return Object.freeze({
    progress: Math.min(progress, challenge.target),
    target: challenge.target,
    completed: progress >= challenge.target,
  });
};
