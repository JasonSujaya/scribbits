import type { Scribbit } from '../../shared/arena';

const ARENA_BRACKET_MAXIMUM_VISIBLE_ENTRANTS = 8;

export type ArenaBackActionKind =
  | 'picked'
  | 'owned'
  | 'locked'
  | 'available';

type ArenaBackActionPlan = Readonly<{
  kind: ArenaBackActionKind;
  label: string;
  enabled: boolean;
}>;

type VisibleArenaEntrantsInput = Readonly<{
  entrantsInSourceOrder: readonly Scribbit[];
  ownedScribbitIdsInRosterOrder: readonly string[];
  backedScribbitId: string | null;
}>;

/**
 * Keeps the player's pick and first roster-ordered entrant visible, then fills
 * the bracket from the end of source order without mutating that source.
 */
export function selectVisibleArenaEntrants(
  input: VisibleArenaEntrantsInput
): readonly Scribbit[] {
  const pickedEntrant = input.entrantsInSourceOrder.find(
    (entrant) => entrant.id === input.backedScribbitId
  );
  const firstOwnedEntrant = input.ownedScribbitIdsInRosterOrder
    .map((ownedId) =>
      input.entrantsInSourceOrder.find((entrant) => entrant.id === ownedId)
    )
    .find((entrant): entrant is Scribbit => entrant !== undefined);
  const pinnedIds = new Set(
    [pickedEntrant?.id, firstOwnedEntrant?.id].filter(
      (id): id is string => id !== undefined
    )
  );
  const reverseSourceEntrants = [...input.entrantsInSourceOrder]
    .reverse()
    .filter((entrant) => !pinnedIds.has(entrant.id));
  const prioritizedEntrants = [
    pickedEntrant,
    firstOwnedEntrant,
    ...reverseSourceEntrants,
  ].filter((entrant): entrant is Scribbit => entrant !== undefined);

  return prioritizedEntrants
    .filter(
      (entrant, index) =>
        prioritizedEntrants.findIndex(
          (candidate) => candidate.id === entrant.id
        ) === index
    )
    .slice(0, ARENA_BRACKET_MAXIMUM_VISIBLE_ENTRANTS);
}

/** Plans the semantic Back state without importing Phaser colors or callbacks. */
export function planArenaBackAction(input: {
  entrantId: string;
  ownedScribbitIds: readonly string[];
  backedScribbitId: string | null;
}): ArenaBackActionPlan {
  if (input.backedScribbitId === input.entrantId) {
    return Object.freeze({
      kind: 'picked',
      label: '✓ Picked',
      enabled: false,
    });
  }
  if (input.ownedScribbitIds.includes(input.entrantId)) {
    return Object.freeze({
      kind: 'owned',
      label: 'Your entry',
      enabled: false,
    });
  }
  if (input.backedScribbitId) {
    return Object.freeze({
      kind: 'locked',
      label: 'Pick locked',
      enabled: false,
    });
  }
  return Object.freeze({
    kind: 'available',
    label: 'Back',
    enabled: true,
  });
}
