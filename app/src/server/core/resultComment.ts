import type { Forecast, Scribbit } from '../../shared/arena';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import type { CloutPayoutResult } from './clout';

export type RumbleResultSummary = {
  resolvedDay: number;
  champion: Scribbit;
  runnerUp: Scribbit | null;
  reportCount: number;
  resolvedForecast: Forecast;
  nextForecast: Forecast;
  cloutPayout: CloutPayoutResult;
};

const creditedScribbitName = (scribbit: Scribbit): string => {
  if (scribbit.isFounding)
    return `**${scribbit.name}** (Arena founding Scribbit)`;
  // The in-app card carries reportable Reddit attribution. Result comments use
  // the Scribbit identity only so a later player-data deletion never leaves a
  // username behind in an app-authored Reddit comment.
  return `**${scribbit.name}** (community Scribbit)`;
};

const battleCountText = (reportCount: number): string => {
  return `${reportCount} ${reportCount === 1 ? 'battle' : 'battles'}`;
};

export const formatRumbleResultComment = (
  summary: RumbleResultSummary
): string => {
  const scoutLine =
    summary.cloutPayout.paidBackers > 0
      ? `🎟️ ${summary.cloutPayout.championBackers} champion backers earned +3 Clout; ${summary.cloutPayout.runnerUpBackers} finalist backers earned +1.`
      : '🎟️ Nobody called this one. Tonight is a fresh chance to Back a contender.';
  const lines = [
    `## 🏆 Rumble #${summary.resolvedDay} results`,
    '',
    `👑 Champion: ${creditedScribbitName(summary.champion)}`,
  ];
  const championFounder = getFoundingScribbitDefinition(summary.champion.id);
  if (championFounder) {
    lines.push(
      `> ${championFounder.name}: “${championFounder.personality.rumbleLine}”`
    );
  }

  if (summary.runnerUp) {
    lines.push(`🥈 Runner-up: ${creditedScribbitName(summary.runnerUp)}`);
  }

  lines.push(
    '',
    `⚔️ ${battleCountText(summary.reportCount)} resolved under: _${summary.resolvedForecast.blurb}_`,
    scoutLine,
    '',
    '### Next forecast',
    summary.nextForecast.blurb,
    '',
    '**Who are you backing in the next Rumble?**'
  );

  return lines.join('\n');
};
