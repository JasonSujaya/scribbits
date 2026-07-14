# Scribbits Balancer

Local-only combat balance harness. This folder is intentionally outside `src/`,
outside every app `tsconfig`, and outside the Vite/Devvit build. It does not add
routes, call Hono APIs, touch Redis, or require Devvit login.

It imports the production mock combat bundle from `dist/mock-runtime/battle.mjs`,
then calls the real combat facade directly:

```text
tools/balancer/run.mjs
  -> dist/mock-runtime/battle.mjs
    -> src/server/core/mockRuntime.ts
      -> src/server/core/battle.ts
      -> src/shared/combat/engine.ts
```

## Run

From `app/`:

```bash
node tools/balancer/run.mjs
```

If the mock combat bundle is missing, the runner builds it first with:

```bash
node scripts/build-mock-combat.mjs
```

Outputs:

- `../artifacts/balancer/latest-summary.md`
- `../artifacts/balancer/latest-results.csv`
- timestamped copies of both files

## What it answers

- Is a role/stat shape winning too much against the field?
- Is a Power-Up build producing unhealthy win-rate swings?
- Are fights ending too fast, too slow, or timing out too often?
- Which pairings should we inspect before changing live tuning?

## Decision rules

The first pass uses conservative flags:

- `FLAG` if player A win rate is below `35%` or above `65%`.
- `FLAG` if timeout rate is above `8%`.
- `WATCH` if average fight duration is below `12s` or above `45s`.

These thresholds live in `run.mjs` and are deliberately easy to change.

## Important

This is a decision tool, not a shipping feature. Do not import it from `src/`.
If a balance experiment needs extra helpers, keep them inside this folder or
inside generated artifacts.
