import type { DailyRumbleReceipt } from '../../shared/arena';

export type RumbleReturnPresentation = Readonly<{
  title: string;
  detail: string | null;
  reward: string;
  highlight: boolean;
}>;

export function planRumbleReturnPresentation(
  receipt: DailyRumbleReceipt
): RumbleReturnPresentation {
  if (receipt.kind === 'backed') {
    const title =
      receipt.cloutEarned === 3
        ? 'YOU CALLED IT!'
        : receipt.cloutEarned === 1
          ? 'FINALIST PICK'
          : 'SCOUTING REPORT';
    return {
      title,
      detail: `${receipt.backedName} • ${receipt.cloutEarned > 0 ? 'PODIUM' : 'OUT'}\n${receipt.championName} WON RUMBLE #${receipt.resolvedDay}`,
      reward:
        receipt.cloutEarned > 0
          ? `+${receipt.cloutEarned} CLOUT${receipt.inkAwarded > 0 ? ` • +${receipt.inkAwarded} INK` : ''}`
          : 'NO REWARD • PICK AGAIN',
      highlight: receipt.cloutEarned === 3,
    };
  }

  const title = `${receipt.entrant.name.toUpperCase()} ${receipt.isChampion ? 'WON' : 'WENT'} • ${receipt.wins}–${receipt.losses}`;
  const xp = `${receipt.xpAwarded > 0 ? '+' : ''}${receipt.xpAwarded} XP`;
  const ink = `${receipt.inkAwarded > 0 ? '+' : ''}${receipt.inkAwarded} INK`;
  return {
    title,
    detail: null,
    reward: `${xp} • ${ink}`,
    highlight: receipt.isChampion,
  };
}

export function formatRumbleReturnAccessibleSummary(
  presentation: RumbleReturnPresentation
): string {
  return [presentation.title, presentation.detail, presentation.reward]
    .filter((line): line is string => Boolean(line))
    .map((line) => line.replace(/\n+/g, '. '))
    .join('. ');
}
