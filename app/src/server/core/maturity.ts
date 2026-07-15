import { getScribbitLifecycleStage, type Scribbit } from '../../shared/arena';
import type { ArenaStorage } from './storage';

export const getMaturityAcknowledgementsKey = (userId: string): string =>
  `user:${userId}:maturity-acknowledgements`;

export const loadPendingMaturityScribbitIds = async (
  storage: ArenaStorage,
  userId: string,
  scribbits: readonly Scribbit[],
  currentDay: number
): Promise<string[]> => {
  const acknowledgements = await storage.hGetAll(
    getMaturityAcknowledgementsKey(userId)
  );
  return scribbits
    .filter(
      (scribbit) =>
        getScribbitLifecycleStage(scribbit, currentDay) === 'mature' &&
        acknowledgements[scribbit.id] === undefined
    )
    .map((scribbit) => scribbit.id);
};

export const acknowledgeScribbitMaturity = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string,
  acknowledgedAtMs: number
): Promise<void> => {
  if (!userId || !scribbitId || !Number.isSafeInteger(acknowledgedAtMs)) {
    throw new Error('Maturity acknowledgement input is invalid.');
  }
  await storage.hSet(getMaturityAcknowledgementsKey(userId), {
    [scribbitId]: acknowledgedAtMs.toString(),
  });
};
