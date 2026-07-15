# Scribbits Balancer

Local-only combat balance harness. This folder is intentionally outside `src/`,
outside every app `tsconfig`, and outside the Vite/Devvit build. It does not add
routes, call Hono APIs, touch Redis, or require Devvit login.

It builds an isolated production combat bundle in
`dist/balancer-runtime/battle.mjs`,
then calls the real combat facade directly:

```text
tools/balancer/run.mjs
  -> dist/balancer-runtime/battle.mjs
    -> src/server/core/mockRuntime.ts
      -> src/server/core/battle.ts
      -> src/shared/combat/engine.ts
```

## Run

From `app/`:

```bash
node tools/balancer/run.mjs
```

Release verification uses the non-mutating gate:

```bash
pnpm run balance:check
```

Check mode runs the same simulations and thresholds without rewriting tracked
reports or timestamped artifacts.

The runner rebuilds that isolated bundle first with:

```bash
node scripts/build-mock-combat.mjs --out-dir dist/balancer-runtime
```

Keeping this output separate prevents a running local preview from replacing
the balancer runtime during a Monte Carlo pass.

Outputs:

- `../artifacts/balancer/latest-summary.md`
- `../artifacts/balancer/latest-results.csv`
- timestamped copies of both files

## What it answers

- Is a role/stat shape winning too much against the field?
- Is a Power-Up build producing unhealthy win-rate swings?
- Do Power-Ups and two-slot Gear techniques remain fair when combined?
- Does 30 days of casual, regular, or competitive play progress without
  economy burnout or activity-driven combat regression?
- Are fights ending too fast, too slow, or timing out too often?
- Which pairings should we inspect before changing live tuning?

## Decision rules

The first pass uses conservative flags:

- `FLAG` if player A win rate is below `35%` or above `65%`.
- `FLAG` if timeout rate is above `8%`.
- `WATCH` if average fight duration is below `12s` or above `45s`.
- The intended counter edge must land between `52.5%` and `63%` across 4,000
  fights per edge.
- Canonical Brawler, Longshot, and Mage builds must each stay between `30%`
  and `70%` after randomized Power-Ups and Gear against an evenly distributed
  matched-progression field; the naked role matrix keeps its tighter band.
- The mandatory 30-day suite runs 48 deterministic accounts per activity
  profile, checks six combat checkpoints, all ten Arenas, ten Theme cycles,
  seven Gear Week days, capsule pacing, collection saturation, Gear ranks,
  Power-Up caps, pity, and matched progression.

The command exits nonzero if the role matrix, counter cycle, generated field,
equal-progression growth/reward paths, offerable single-card usefulness,
equal-progression three-day loop, 30-day content/progression, or matched Gear +
Power-Up profiles break the competitive gate. Progression opponents use the same reward schedule and
Power-Up count as the challenger. Combined-loadout rows
compare two rank-6 Gear pieces and three role-offerable Power-Ups against an
equally progressed field, so progression is never judged against a naked foe.
Matched-loadout win rates only hard-fail when their 95% Wilson interval sits
fully outside the 35–65% band; point estimates on the boundary remain watches.
Gear/skill interaction above 15 percentage points is watched and above 20 is a
hard failure.

These thresholds live in `run.mjs` and are deliberately easy to change.

## Important

This is a decision tool, not a shipping feature. Do not import it from `src/`.
If a balance experiment needs extra helpers, keep them inside this folder or
inside generated artifacts.
