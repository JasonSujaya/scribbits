// Replay-scoped Inkcast authoring. Transcript facts are already authoritative;
// this layer renders the versioned shared copy pack and rotates each bank
// without repeats before reuse. It never changes simulation or reward state.

import type {
  CombatElement,
  FighterSlot,
  PrimaryPower,
} from '../../shared/combat/types';
import { getShapePowerBattleName } from '../../shared/combat/shapepowercontent';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import {
  renderInkcastCommentaryTemplate,
  selectInkcastCommentaryVariant,
  type InkcastCommentaryBankId,
  type InkcastMissPower,
} from '../../shared/content/replaycommentary';
import { hashContentKey } from '../../shared/content/deterministic';

export type ReplayCommentaryFighter = Readonly<{
  id: string;
  name: string;
  element: CombatElement;
  primaryPower: PrimaryPower;
}>;

export type ReplayCommentaryContext = Readonly<{
  battleId: string;
  replayPass?: number;
  fighters: Readonly<Record<FighterSlot, ReplayCommentaryFighter>>;
}>;

type CommentaryFactBase = Readonly<{ tick: number }>;

export type ReplayCommentaryFact =
  | (CommentaryFactBase & Readonly<{ kind: 'battle-start' }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'power-telegraph';
        actor: FighterSlot;
        power: PrimaryPower;
        activationNumber: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'power-missed';
        actor: FighterSlot;
        power: InkcastMissPower;
        activationNumber: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'damage';
        sourceFighter: FighterSlot;
        targetFighter: FighterSlot;
        sourceName: string;
        sourcePower: PrimaryPower | null;
        amount: number;
        critical: boolean;
      }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'burn'; targetFighter: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'barrier-created'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'barrier-hit';
        actor: FighterSlot;
        absorbedDamage: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'barrier-broken'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'ink-pressure'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'nib-recoil'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'arena-shrink' }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'echo-created'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'echo-fired'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'echo-shattered'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'late-fight' }>);

export type ReplayCommentaryAuthor = Readonly<{
  author: (fact: ReplayCommentaryFact) => string;
}>;

const FIGHTER_SLOTS: readonly FighterSlot[] = Object.freeze(['a', 'b']);

export function isReplayCommentaryMissPower(
  power: PrimaryPower
): power is InkcastMissPower {
  return power !== 'colorburst';
}

export function createReplayCommentaryAuthor(
  context: ReplayCommentaryContext
): ReplayCommentaryAuthor {
  const contextSnapshot = snapshotReplayCommentaryContext(context);
  const occurrenceByBank = new Map<InkcastCommentaryBankId, number>();

  return Object.freeze({
    author: (fact: ReplayCommentaryFact): string => {
      const founderSignature = authorFounderSignatureReaction(
        contextSnapshot,
        fact
      );
      if (founderSignature) return founderSignature;

      const bankId = getReplayCommentaryBankId(fact);
      const occurrenceIndex = occurrenceByBank.get(bankId) ?? 0;
      const commentarySeed =
        (contextSnapshot.replayPass ?? 0) > 0
          ? `${contextSnapshot.battleId}:watch:${contextSnapshot.replayPass}`
          : contextSnapshot.battleId;
      const variant = selectInkcastCommentaryVariant(
        bankId,
        commentarySeed,
        occurrenceIndex
      );
      occurrenceByBank.set(bankId, occurrenceIndex + 1);
      return renderReplayCommentaryFact(
        contextSnapshot,
        fact,
        variant.template
      );
    },
  });
}

export function getReplayCommentaryBankId(
  fact: ReplayCommentaryFact
): InkcastCommentaryBankId {
  switch (fact.kind) {
    case 'battle-start':
      return 'general.battle-start';
    case 'power-telegraph':
      return `power.${fact.power}.telegraph`;
    case 'power-missed':
      return `power.${fact.power}.miss`;
    case 'damage':
      if (fact.critical) return 'general.critical-hit';
      return fact.sourcePower
        ? `power.${fact.sourcePower}.hit`
        : 'general.normal-hit';
    case 'burn':
      return 'general.burn';
    case 'barrier-created':
      return 'general.barrier-created';
    case 'barrier-hit':
      return 'general.barrier-hit';
    case 'barrier-broken':
      return 'general.barrier-broken';
    case 'ink-pressure':
      return 'general.ink-pressure';
    case 'nib-recoil':
      return 'general.nib-recoil';
    case 'arena-shrink':
      return 'general.arena-shrink';
    case 'echo-created':
      return 'general.echo-created';
    case 'echo-fired':
      return 'general.echo-fired';
    case 'echo-shattered':
      return 'general.echo-shattered';
    case 'late-fight':
      return 'general.late-fight';
    default:
      return assertNeverFact(fact);
  }
}

export function authorFounderBattleOpening(
  context: ReplayCommentaryContext
): string | null {
  const founderCandidates = FIGHTER_SLOTS.flatMap((slot) => {
    const fighter = context.fighters[slot];
    const definition = getFoundingScribbitDefinition(fighter.id);
    return definition ? [{ fighter, definition }] : [];
  });
  if (founderCandidates.length === 0) return null;

  const founderCandidate =
    founderCandidates[
      hashContentKey(`${context.battleId}:founder-opening-slot`) %
        founderCandidates.length
    ];
  if (!founderCandidate) return null;

  const openingLines = founderCandidate.definition.personality.openingLines;
  const openingLine =
    openingLines[
      hashContentKey(
        `${context.battleId}:${founderCandidate.fighter.id}:founder-opening-line`
      ) % openingLines.length
    ];
  if (!openingLine) return null;
  return formatFounderCommentary(founderCandidate.fighter.name, openingLine);
}

export function authorFounderBattleOutcome(
  context: ReplayCommentaryContext,
  winnerSlot: FighterSlot
): string | null {
  const winner = context.fighters[winnerSlot];
  const winnerFounder = getFoundingScribbitDefinition(winner.id);
  if (winnerFounder) {
    return `“${winnerFounder.personality.victoryLine}”`;
  }

  const loserSlot: FighterSlot = winnerSlot === 'a' ? 'b' : 'a';
  const loser = context.fighters[loserSlot];
  const loserFounder = getFoundingScribbitDefinition(loser.id);
  if (!loserFounder) return null;
  return `“${loserFounder.personality.defeatLine}”`;
}

function renderReplayCommentaryFact(
  context: ReplayCommentaryContext,
  fact: ReplayCommentaryFact,
  template: string
): string {
  const fighterA = context.fighters.a;
  const fighterB = context.fighters.b;

  switch (fact.kind) {
    case 'battle-start':
      return renderInkcastCommentaryTemplate(template, {
        moveA: getShapePowerBattleName(fighterA.primaryPower),
        moveB: getShapePowerBattleName(fighterB.primaryPower),
      });
    case 'power-telegraph':
    case 'power-missed': {
      const actor = context.fighters[fact.actor];
      return renderInkcastCommentaryTemplate(template, {
        actor: safeName(actor.name),
        move: getShapePowerBattleName(fact.power),
      });
    }
    case 'damage':
      return renderInkcastCommentaryTemplate(template, {
        source: safeSourceName(fact.sourceName),
        target: safeName(context.fighters[fact.targetFighter].name),
        amount: Math.max(0, Math.floor(fact.amount)),
      });
    case 'burn':
      return renderInkcastCommentaryTemplate(template, {
        target: safeName(context.fighters[fact.targetFighter].name),
      });
    case 'barrier-created':
    case 'barrier-broken':
    case 'ink-pressure':
    case 'nib-recoil':
      return renderInkcastCommentaryTemplate(template, {
        actor: safeName(context.fighters[fact.actor].name),
      });
    case 'barrier-hit':
      return renderInkcastCommentaryTemplate(template, {
        actor: safeName(context.fighters[fact.actor].name),
        amount: Math.max(0, Math.floor(fact.absorbedDamage)),
      });
    case 'arena-shrink':
    case 'late-fight':
      return renderInkcastCommentaryTemplate(template, {});
    case 'echo-created':
    case 'echo-fired':
    case 'echo-shattered': {
      const actor = context.fighters[fact.actor];
      return renderInkcastCommentaryTemplate(template, {
        actor: safeName(actor.name),
        move: getShapePowerBattleName('colorburst'),
      });
    }
    default:
      return assertNeverFact(fact);
  }
}

function authorFounderSignatureReaction(
  context: ReplayCommentaryContext,
  fact: ReplayCommentaryFact
): string | null {
  if (fact.kind !== 'power-telegraph' || fact.activationNumber !== 1) {
    return null;
  }

  const actor = context.fighters[fact.actor];
  const founder = getFoundingScribbitDefinition(actor.id);
  if (!founder) return null;
  const authoredReaction = founder.personality.signatureReaction;
  const plainReaction = authoredReaction.includes('!')
    ? authoredReaction.slice(authoredReaction.indexOf('!') + 1).trim()
    : authoredReaction;
  return formatFounderCommentary(actor.name, plainReaction);
}

function snapshotReplayCommentaryContext(
  context: ReplayCommentaryContext
): ReplayCommentaryContext {
  return Object.freeze({
    battleId: context.battleId,
    replayPass: Math.max(0, Math.floor(context.replayPass ?? 0)),
    fighters: Object.freeze({
      a: Object.freeze({ ...context.fighters.a }),
      b: Object.freeze({ ...context.fighters.b }),
    }),
  });
}

function safeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 24) || 'Scribbit';
}

function safeSourceName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 32) || 'impact';
}

function formatFounderCommentary(name: string, line: string): string {
  return `${safeName(name)}: “${line}”`;
}

function assertNeverFact(fact: never): never {
  throw new Error(`Unhandled Inkcast commentary fact: ${JSON.stringify(fact)}`);
}
