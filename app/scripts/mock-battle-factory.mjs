// Small testable adapter around the production battle facade. Interactive mock
// fights advance their own deterministic seed stream; explicit debug fixtures
// never perturb it.

export const createMockBattleReportFactory = ({ simulate, getForecast }) => {
  let interactiveSeed = 0;

  return (kind, fighterA, fighterB, options = {}) => {
    const explicitSeed = Number.isSafeInteger(options.seed)
      ? options.seed
      : undefined;
    if (explicitSeed === undefined) interactiveSeed += 1;
    return simulate(
      fighterA,
      fighterB,
      explicitSeed ?? interactiveSeed,
      options.forecast ?? getForecast(),
      kind,
      options.battleArenaId
        ? { battleArenaId: options.battleArenaId }
        : undefined
    );
  };
};
