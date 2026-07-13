import type { DailyRumbleReceipt } from '../../shared/arena';

export type RumbleReturnPresentation = Readonly<{
  outcome: 'victory' | 'defeat';
  outcomeLabel: 'VICTORY!' | 'DEFEAT';
  title: string;
  detail: string | null;
  reward: string;
  highlight: boolean;
}>;

export function planRumbleReturnPresentation(
  receipt: DailyRumbleReceipt
): RumbleReturnPresentation {
  if (receipt.kind === 'backed') {
    const won = receipt.cloutEarned === 3;
    return {
      outcome: won ? 'victory' : 'defeat',
      outcomeLabel: won ? 'VICTORY!' : 'DEFEAT',
      title: `${receipt.backedName.toUpperCase()} ${won ? 'WON THE RUMBLE' : 'WAS ELIMINATED'}`,
      detail: `${receipt.championName} WON RUMBLE #${receipt.resolvedDay}`,
      reward:
        receipt.cloutEarned > 0
          ? `+${receipt.cloutEarned} CLOUT${receipt.inkAwarded > 0 ? ` • +${receipt.inkAwarded} INK` : ''}`
          : 'NO CLOUT EARNED',
      highlight: won,
    };
  }

  const title = `${receipt.entrant.name.toUpperCase()} ${receipt.isChampion ? 'WON THE RUMBLE' : 'WAS ELIMINATED'}`;
  const xp = `${receipt.xpAwarded > 0 ? '+' : ''}${receipt.xpAwarded} XP`;
  const ink = `${receipt.inkAwarded > 0 ? '+' : ''}${receipt.inkAwarded} INK`;
  return {
    outcome: receipt.isChampion ? 'victory' : 'defeat',
    outcomeLabel: receipt.isChampion ? 'VICTORY!' : 'DEFEAT',
    title,
    detail: `RUMBLE RECORD ${receipt.wins}–${receipt.losses}`,
    reward: `${xp} • ${ink}`,
    highlight: receipt.isChampion,
  };
}

export function formatRumbleReturnAccessibleSummary(
  presentation: RumbleReturnPresentation
): string {
  return [
    presentation.outcomeLabel,
    presentation.title,
    presentation.detail,
    presentation.reward,
  ]
    .filter((line): line is string => Boolean(line))
    .map((line) => line.replace(/\n+/g, '. '))
    .join('. ');
}
