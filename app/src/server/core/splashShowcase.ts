import type {
  Scribbit,
  SplashCreation,
} from '../../shared/arena';

export const SPLASH_CREATION_LIMIT = 3;

type SplashCreationSelection = Readonly<{
  recentCreations: readonly Scribbit[];
  hiddenScribbitIds: ReadonlySet<string>;
}>;

const isRenderableCreation = (
  scribbit: Scribbit,
  hiddenScribbitIds: ReadonlySet<string>
): boolean => {
  return (
    !scribbit.isFounding &&
    !hiddenScribbitIds.has(scribbit.id) &&
    scribbit.artist.trim().length > 0 &&
    scribbit.imageUrl.trim().length > 0
  );
};

const projectCreation = (scribbit: Scribbit): SplashCreation => {
  return {
    id: scribbit.id,
    name: scribbit.name,
    artist: scribbit.artist,
    imageUrl: scribbit.imageUrl,
  };
};

export const selectSplashCreations = (
  selection: SplashCreationSelection
): SplashCreation[] => {
  const creations: SplashCreation[] = [];
  const selectedIds = new Set<string>();

  for (const scribbit of selection.recentCreations) {
    if (
      creations.length >= SPLASH_CREATION_LIMIT ||
      selectedIds.has(scribbit.id) ||
      !isRenderableCreation(scribbit, selection.hiddenScribbitIds)
    ) {
      continue;
    }
    selectedIds.add(scribbit.id);
    creations.push(projectCreation(scribbit));
  }

  return creations;
};
