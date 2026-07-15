import { getScribbitLifecycleStage, type Scribbit } from '../../shared/arena';

export type MatureArenaCompetitorPlan = Readonly<{
  eligible: boolean;
  statusLabel: string;
  accessibleStatus: string;
}>;

export function planMatureArenaCompetitor(
  scribbit: Scribbit,
  currentArenaDay: number
): MatureArenaCompetitorPlan {
  const lifecycle = getScribbitLifecycleStage(scribbit, currentArenaDay);
  if (lifecycle === 'mature') {
    return {
      eligible: true,
      statusLabel: 'MATURE • STATS LOCKED',
      accessibleStatus: `${scribbit.name} is mature and can enter the Arena.`,
    };
  }
  if (lifecycle === 'archived') {
    return {
      eligible: false,
      statusLabel: 'RETIRED • NOT ELIGIBLE',
      accessibleStatus: `${scribbit.name} is retired and cannot enter the Mature Arena.`,
    };
  }
  return {
    eligible: false,
    statusLabel: `LOCKED • MATURES DAY ${scribbit.expiresDay}`,
    accessibleStatus: `${scribbit.name} is still growing and cannot enter the Mature Arena until day ${scribbit.expiresDay}.`,
  };
}

export function selectMatureArenaCompetitor(
  scribbits: readonly Scribbit[],
  currentArenaDay: number,
  selectedScribbitId: string | null
): Scribbit | null {
  if (scribbits.length === 0) return null;
  const selected = scribbits.find(
    (scribbit) => scribbit.id === selectedScribbitId
  );
  if (selected) return selected;
  return (
    scribbits.find(
      (scribbit) =>
        getScribbitLifecycleStage(scribbit, currentArenaDay) === 'mature'
    ) ??
    scribbits[0] ??
    null
  );
}
