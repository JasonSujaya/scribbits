import {
  INK_REWARDS,
  MAX_ALIVE_PER_USER,
  type ArenaState,
  type DrawChargeState,
  type PowerUpOffer,
  type Scribbit,
} from '../../shared/arena';

type DrawingSupplySelection = Readonly<{
  drawingInkId: string | null;
  brushId: string | null;
}>;

type SubmittedScribbitArenaInput = Readonly<{
  arena: ArenaState;
  scribbit: Scribbit;
  drawingSupplies: DrawingSupplySelection;
  drawCharges: DrawChargeState;
  enteredRumble: boolean;
  powerUpOffer: PowerUpOffer | null;
}>;

export type SubmittedScribbitArenaResult =
  | Readonly<{ status: 'day-changed' }>
  | Readonly<{
      status: 'applied';
      arena: ArenaState;
      alreadyTracked: boolean;
    }>;

export const projectSubmittedScribbitArena = ({
  arena,
  scribbit,
  drawingSupplies,
  drawCharges,
  enteredRumble,
  powerUpOffer,
}: SubmittedScribbitArenaInput): SubmittedScribbitArenaResult => {
  if (scribbit.bornDay !== arena.dayNumber) {
    return { status: 'day-changed' };
  }

  const alreadyTracked =
    arena.todayEntrants.some((entrant) => entrant.id === scribbit.id) ||
    arena.myScribbits.some(
      (ownedScribbit) => ownedScribbit.id === scribbit.id
    );
  const myDrawingSupplies = { ...(arena.myDrawingSupplies ?? {}) };
  if (!alreadyTracked) {
    [drawingSupplies.drawingInkId, drawingSupplies.brushId].forEach(
      (supplyId) => {
        if (!supplyId) return;
        const nextCount = Math.max(0, (myDrawingSupplies[supplyId] ?? 0) - 1);
        if (nextCount > 0) myDrawingSupplies[supplyId] = nextCount;
        else delete myDrawingSupplies[supplyId];
      }
    );
  }

  const todayEntrants =
    !enteredRumble ||
    arena.todayEntrants.some((entrant) => entrant.id === scribbit.id)
      ? arena.todayEntrants
      : [scribbit, ...arena.todayEntrants];
  const myScribbits = arena.myScribbits.some(
    (ownedScribbit) => ownedScribbit.id === scribbit.id
  )
    ? arena.myScribbits
    : [scribbit, ...arena.myScribbits].slice(0, MAX_ALIVE_PER_USER);

  return {
    status: 'applied',
    alreadyTracked,
    arena: {
      ...arena,
      hasCreatedScribbit: true,
      drawnToday: true,
      enteredToday: arena.enteredToday || enteredRumble,
      drawCharges,
      rumbleEntrants: todayEntrants.length,
      todayEntrants,
      myInk: (arena.myInk ?? 0) + (alreadyTracked ? 0 : INK_REWARDS.dailyDraw),
      myDrawingSupplies,
      myScribbits,
      pendingPowerUpOffers: [
        ...(arena.pendingPowerUpOffers ?? []).filter(
          (offer) => offer.scribbitId !== scribbit.id
        ),
        ...(powerUpOffer ? [powerUpOffer] : []),
      ],
    },
  };
};
