// Pure post-battle copy planning. The authoritative transcript owns every
// result and number; this module only turns that truth into presentation copy.

import {
  getDamageSourceDisplayName,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';
import type {
  BattleEndReason,
  BattleTimelineEvent,
  BattleTranscript,
  CombatElement,
  FighterResult,
  FighterSlot,
} from '../../shared/combat/types';

type DamageTimelineEvent = Extract<
  BattleTimelineEvent,
  Readonly<{ kind: 'damage' }>
>;

export type BattleRecapHighlight = Readonly<{
  label: string;
  text: string;
}>;

export type BattleRecapPlan = Readonly<{
  winnerSlot: FighterSlot;
  loserSlot: FighterSlot;
  winnerName: string;
  loserName: string;
  winnerElement: CombatElement;
  headline: string;
  verdictLine: string;
  tapeLine: string;
  highlight: BattleRecapHighlight | null;
  partial: boolean;
  finishPresentation: 'knockout' | 'double-knockout' | 'decision';
  finishSound: 'knockout' | 'bell';
}>;

function fighterIndex(slot: FighterSlot): 0 | 1 {
  return slot === 'a' ? 0 : 1;
}

function fighterResultForSlot(
  transcript: BattleTranscript,
  slot: FighterSlot
): FighterResult {
  const firstResult = transcript.result.fighters[0];
  return firstResult.slot === slot
    ? firstResult
    : transcript.result.fighters[1];
}

function headlineForReason(
  reason: BattleEndReason,
  winnerName: string
): string {
  switch (reason) {
    case 'knockout':
      return `KO • ${winnerName} WINS`;
    case 'double_knockout':
      return `DOUBLE KO • ${winnerName} TAKES THE VERDICT`;
    case 'timeout_hp_percentage':
      return `TIME • ${winnerName} WINS ON INK LEFT`;
    case 'timeout_damage_dealt':
      return `TIME • INK % TIED • ${winnerName} WINS ON DAMAGE`;
    case 'timeout_stable_tiebreak':
      return `DEAD EVEN • ${winnerName} TAKES THE VERDICT`;
  }
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function finishPresentationForReason(
  reason: BattleEndReason
): BattleRecapPlan['finishPresentation'] {
  if (reason === 'knockout') return 'knockout';
  if (reason === 'double_knockout') return 'double-knockout';
  return 'decision';
}

function findTerminalKnockoutDamage(
  transcript: BattleTranscript,
  loserSlot: FighterSlot
): DamageTimelineEvent | null {
  for (const event of transcript.timeline) {
    if (
      event.kind === 'damage' &&
      event.tick === transcript.result.completedTick &&
      event.targetFighter === loserSlot &&
      event.targetHitPoints === 0 &&
      event.amount > 0
    ) {
      return event;
    }
  }
  return null;
}

function findLargestWinnerDamage(
  transcript: BattleTranscript,
  winnerSlot: FighterSlot,
  loserSlot: FighterSlot
): DamageTimelineEvent | null {
  let largestDamage: DamageTimelineEvent | null = null;

  for (const event of transcript.timeline) {
    if (
      event.kind !== 'damage' ||
      event.sourceFighter !== winnerSlot ||
      event.targetFighter !== loserSlot ||
      event.amount <= 0
    ) {
      continue;
    }
    if (
      largestDamage === null ||
      event.amount > largestDamage.amount ||
      (event.amount === largestDamage.amount && event.tick < largestDamage.tick)
    ) {
      largestDamage = event;
    }
  }

  return largestDamage;
}

function planHighlight(
  transcript: BattleTranscript,
  winnerSlot: FighterSlot,
  loserSlot: FighterSlot
): BattleRecapHighlight | null {
  if (transcript.eventsTruncated) {
    return {
      label: 'SERVER RESULT',
      text: 'Play-by-play limited; result and final HP preserved.',
    };
  }

  const terminalDamage =
    transcript.result.reason === 'knockout'
      ? findTerminalKnockoutDamage(transcript, loserSlot)
      : null;
  const damageEvent =
    terminalDamage ??
    findLargestWinnerDamage(transcript, winnerSlot, loserSlot);

  if (damageEvent === null) {
    return null;
  }

  const sourceFighter =
    transcript.fighters[fighterIndex(damageEvent.sourceFighter)];
  const targetFighter =
    transcript.fighters[fighterIndex(damageEvent.targetFighter)];
  const damageSourceName = getDamageSourceDisplayName(
    damageEvent.source,
    sourceFighter.element
  );

  return {
    label: terminalDamage === damageEvent ? 'FINAL SPLAT' : 'BIGGEST SPLAT',
    text: `${damageSourceName}${damageEvent.critical ? ' CRIT' : ''} • ${damageEvent.amount} to ${targetFighter.name}`,
  };
}

export function planBattleRecap(transcript: BattleTranscript): BattleRecapPlan {
  const { result } = transcript;
  const winnerSlot = result.winner;
  const loserSlot = result.loser;
  const winnerFighter = transcript.fighters[fighterIndex(winnerSlot)];
  const loserFighter = transcript.fighters[fighterIndex(loserSlot)];
  const winnerResult = fighterResultForSlot(transcript, winnerSlot);
  const loserResult = fighterResultForSlot(transcript, loserSlot);
  const winnerSignature = getShapePowerSignatureName(
    winnerFighter.element,
    winnerResult.primaryPower
  );
  const finishPresentation = finishPresentationForReason(result.reason);

  return {
    winnerSlot,
    loserSlot,
    winnerName: winnerFighter.name,
    loserName: loserFighter.name,
    winnerElement: winnerFighter.element,
    headline: headlineForReason(result.reason, winnerFighter.name),
    verdictLine: `${formatDuration(result.completedMilliseconds)} • INK LEFT ${winnerResult.finalHitPoints}/${winnerResult.maxHitPoints} vs ${loserResult.finalHitPoints}/${loserResult.maxHitPoints}`,
    tapeLine: `${winnerResult.damageDealt} TOTAL DAMAGE • ${winnerSignature.toUpperCase()}`,
    highlight: planHighlight(transcript, winnerSlot, loserSlot),
    partial: transcript.eventsTruncated,
    finishPresentation,
    finishSound: finishPresentation === 'decision' ? 'bell' : 'knockout',
  };
}
