export type ArenaStartupLoads<Player, Forecast> = Readonly<{
  player: Promise<Player>;
  season: Promise<unknown>;
  forecast: Promise<Forecast>;
}>;

type ArenaStartupLoaders<Player, Forecast> = Readonly<{
  loadPlayer: () => Promise<Player>;
  ensureSeason: () => Promise<unknown>;
  ensureForecast: () => Promise<Forecast>;
}>;

export type ArenaLoadRunner = <Result>(
  load: () => Promise<Result>
) => Promise<Result>;

/**
 * Starts the independent Arena bootstrap reads together. Keeping the promises
 * separate lets the route continue as soon as the specific result it needs is
 * ready without turning startup into another serial phase.
 */
export const startArenaStartupLoads = <Player, Forecast>(
  loaders: ArenaStartupLoaders<Player, Forecast>
): ArenaStartupLoads<Player, Forecast> => ({
  player: loaders.loadPlayer(),
  season: loaders.ensureSeason(),
  forecast: loaders.ensureForecast(),
});

/**
 * Shares one concurrency budget across the Arena route's independent storage
 * loads. Individual loaders can still batch internally, so the route keeps
 * headroom instead of sending every top-level Redis workflow at once.
 */
export const createArenaLoadRunner = (
  maximumConcurrency: number
): ArenaLoadRunner => {
  if (!Number.isInteger(maximumConcurrency) || maximumConcurrency < 1) {
    throw new Error('Arena load concurrency must be a positive integer.');
  }

  let activeLoads = 0;
  const queuedLoads: Array<() => void> = [];

  const startNextLoad = (): void => {
    if (activeLoads >= maximumConcurrency) return;
    queuedLoads.shift()?.();
  };

  return <Result>(load: () => Promise<Result>): Promise<Result> =>
    new Promise<Result>((resolve, reject) => {
      const startLoad = (): void => {
        activeLoads += 1;
        void Promise.resolve()
          .then(load)
          .then(resolve, reject)
          .finally(() => {
            activeLoads -= 1;
            startNextLoad();
          });
      };

      if (activeLoads < maximumConcurrency) startLoad();
      else queuedLoads.push(startLoad);
    });
};
