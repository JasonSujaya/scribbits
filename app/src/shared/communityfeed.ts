import type { BattleReport } from './arena';
import type { CommunityDrawTheme } from './content/communitydrawthemes';
import {
  createCommunityChallengePostData,
  type CommunityChallengePostData,
} from './communitychallenge';
import {
  createCommunityFightPostData,
  type CommunityUpdateItem,
  type CommunityVisualPostData,
} from './communitypostdata';

export type CommunityPostDraft =
  | Readonly<{
      id: string;
      title: string;
      body: string;
      entry: 'challenge';
      postData: CommunityChallengePostData;
    }>
  | Readonly<{
      id: string;
      title: string;
      body: string;
      entry: 'community';
      postData: CommunityVisualPostData;
    }>;

export type ArenaSeasonAnnouncement = Readonly<{
  name: string;
  campaignName: string;
  startArenaDay: number;
  endArenaDay: number;
}>;

export type ArenaEventAnnouncement = Readonly<{
  name: string;
  seasonName: string;
  scoreMultiplier: number;
}>;

export type ArenaFinalAnnouncement = Readonly<{
  name: string;
  winnerUsername: string | null;
  winnerScore: number | null;
}>;

export type ArenaUpdateDraftInput = Readonly<{
  arenaDay: number;
  appUrl: string;
  themePool: readonly CommunityDrawTheme[] | null;
  startingSeason: ArenaSeasonAnnouncement | null;
  finalizedSeason: ArenaFinalAnnouncement | null;
  startingEvents: readonly ArenaEventAnnouncement[];
  endedEvents: readonly ArenaEventAnnouncement[];
}>;

const finishLabel = (report: BattleReport): string => {
  const reason = report.simulation?.result.reason;
  if (reason === 'knockout') return 'knockout';
  if (reason === 'double_knockout') return 'double knockout';
  return 'final-bell decision';
};

const totalDamage = (report: BattleReport): number =>
  report.simulation?.result.fighters.reduce(
    (total, fighter) => total + fighter.damageDealt,
    0
  ) ?? 0;

const finalHealthDifference = (report: BattleReport): number => {
  const fighters = report.simulation?.result.fighters;
  return fighters
    ? Math.abs(fighters[0].hitPointPermille - fighters[1].hitPointPermille)
    : Number.MAX_SAFE_INTEGER;
};

/** Picks the hardest-hitting fight, then favors closer and longer ties. */
export const selectStrongestFight = (
  reports: readonly BattleReport[]
): BattleReport | null => {
  const eligibleReports = reports.filter(
    (report) => report.kind === 'rumble' && report.simulation !== undefined
  );
  return (
    [...eligibleReports].sort((left, right) =>
      totalDamage(right) !== totalDamage(left)
        ? totalDamage(right) - totalDamage(left)
        : finalHealthDifference(left) !== finalHealthDifference(right)
          ? finalHealthDifference(left) - finalHealthDifference(right)
          : (right.simulation?.result.completedTick ?? 0) !==
              (left.simulation?.result.completedTick ?? 0)
            ? (right.simulation?.result.completedTick ?? 0) -
              (left.simulation?.result.completedTick ?? 0)
            : left.id.localeCompare(right.id)
    )[0] ?? null
  );
};

export const buildArenaUpdateDraft = (
  input: ArenaUpdateDraftInput
): CommunityPostDraft | null => {
  const sections: string[] = [];
  const titleDetails: string[] = [];
  const updateItems: CommunityUpdateItem[] = [];

  if (input.startingSeason) {
    titleDetails.push(`${input.startingSeason.name} begins`);
    sections.push(
      `## ${input.startingSeason.name} begins`,
      `${input.startingSeason.campaignName} runs from Arena Day ${input.startingSeason.startArenaDay} through ${input.startingSeason.endArenaDay}. Every correct Champion pick now counts toward the new standings.`
    );
    updateItems.push({
      eyebrow: 'NEW SEASON',
      title: input.startingSeason.name,
      detail: `${input.startingSeason.campaignName} · Days ${input.startingSeason.startArenaDay}–${input.startingSeason.endArenaDay}`,
      tone: 'season',
    });
  }

  if (input.finalizedSeason) {
    titleDetails.push(`${input.finalizedSeason.name} final`);
    const winner = input.finalizedSeason.winnerUsername
      ? `u/${input.finalizedSeason.winnerUsername} takes the crown${input.finalizedSeason.winnerScore === null ? '' : ` with ${input.finalizedSeason.winnerScore} points`}.`
      : 'The final standings are now locked.';
    sections.push(`## ${input.finalizedSeason.name} is final`, winner);
    updateItems.push({
      eyebrow: 'FINAL STANDINGS',
      title: input.finalizedSeason.winnerUsername
        ? `u/${input.finalizedSeason.winnerUsername} takes the crown`
        : input.finalizedSeason.name,
      detail:
        input.finalizedSeason.winnerScore === null
          ? 'The final standings are locked.'
          : `${input.finalizedSeason.winnerScore} points · ${input.finalizedSeason.name}`,
      tone: 'final',
    });
  }

  for (const event of input.endedEvents) {
    titleDetails.push(`${event.name} ended`);
    sections.push(
      `## ${event.name} has ended`,
      `${event.seasonName}'s scoring event is now closed.`
    );
    updateItems.push({
      eyebrow: 'EVENT COMPLETE',
      title: event.name,
      detail: `${event.seasonName}'s scoring event is now closed.`,
      tone: 'event',
    });
  }

  for (const event of input.startingEvents) {
    titleDetails.push(`${event.name} live`);
    sections.push(
      `## ${event.name} is live`,
      `${event.seasonName} standings now earn ${event.scoreMultiplier}\u00d7 points during this event.`
    );
    updateItems.push({
      eyebrow: `${event.scoreMultiplier}\u00d7 SCORING`,
      title: event.name,
      detail: `${event.seasonName} standings earn boosted points now.`,
      tone: 'event',
    });
  }

  if (input.themePool) {
    const finalThemeDay = input.arenaDay + 2;
    titleDetails.push('new Doodle Dares');
    sections.push(
      `## New Doodle Dares \u00b7 Days ${input.arenaDay}\u2013${finalThemeDay}`,
      'Every player gets one of these five prompts, then unlocks another after completing it:',
      input.themePool.map((theme) => `- ${theme.prompt}`).join('\n')
    );
  }

  if (sections.length === 0) return null;
  sections.push(`[Open Scribbits and join in](${input.appUrl})`);
  if (input.themePool) {
    const finalThemeDay = input.arenaDay + 2;
    return Object.freeze({
      id: `arena-update:${input.arenaDay}`,
      title: `Draw Them All \u00b7 Days ${input.arenaDay}\u2013${finalThemeDay}`,
      body: sections.join('\n\n'),
      entry: 'challenge',
      postData: createCommunityChallengePostData(
        input.arenaDay,
        titleDetails.filter((detail) => detail !== 'new Doodle Dares')
      ),
    });
  }
  return Object.freeze({
    id: `visual-arena-update:${input.arenaDay}`,
    title: `Arena Update \u00b7 Day ${input.arenaDay} \u00b7 ${titleDetails.join(' + ') || 'season event'}`,
    body: sections.join('\n\n'),
    entry: 'community',
    postData: Object.freeze({
      surface: 'community-update',
      version: 1,
      arenaDay: input.arenaDay,
      headline: titleDetails[0] ?? 'The Arena changed',
      items: Object.freeze(updateItems),
    }),
  });
};

export const buildWeeklyFightDraft = (
  report: BattleReport,
  weekStartArenaDay: number,
  weekEndArenaDay: number,
  appUrl: string
): CommunityPostDraft => {
  const winner = report.winner === 'a' ? report.a : report.b;
  const completedSeconds = Math.max(
    1,
    Math.round((report.simulation?.result.completedMilliseconds ?? 0) / 1_000)
  );
  return Object.freeze({
    id: `visual-fight-of-the-week:${weekStartArenaDay}-${weekEndArenaDay}`,
    title: `Fight of the Week \u00b7 Days ${weekStartArenaDay}\u2013${weekEndArenaDay} \u00b7 ${report.a.name} vs ${report.b.name}`,
    body: [
      `The strongest Rumble fight from Arena Days ${weekStartArenaDay}\u2013${weekEndArenaDay} delivered **${totalDamage(report)} total damage** in ${completedSeconds} seconds.`,
      `**${winner.name}** won by ${finishLabel(report)}.`,
      `[Open Scribbits to watch battles and enter the next Rumble](${appUrl})`,
    ].join('\n\n'),
    entry: 'community',
    postData: createCommunityFightPostData(
      report,
      weekStartArenaDay,
      weekEndArenaDay
    ),
  });
};
