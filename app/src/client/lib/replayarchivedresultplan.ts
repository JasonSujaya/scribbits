import type { BattleReport } from '../../shared/arena';
import {
  formatBattleRecapLead,
  type BattleRecapPerspective,
} from './battlerecap';
import { formatRivalRunResultLine } from './rivalrunpresentation';

export type ArchivedReplayResultCopy = Readonly<{
  lead: string;
  status: string;
}>;

export const planArchivedReplayResultCopy = (input: {
  winnerName: string;
  perspective: BattleRecapPerspective;
  rivalRun: BattleReport['rivalRun'];
}): ArchivedReplayResultCopy => {
  return {
    lead: formatBattleRecapLead(
      { winnerName: input.winnerName },
      input.perspective
    ),
    status: input.rivalRun
      ? `${formatRivalRunResultLine(input.rivalRun)} • ARCHIVED`
      : 'ARCHIVED • SERVER RESULT SAVED',
  };
};
