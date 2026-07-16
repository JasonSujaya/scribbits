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

Run one or more suites while tuning:

```bash
node tools/balancer/run.mjs --suite=role-cycle,growth-progression
```

Release verification uses the non-mutating gate:

```bash
pnpm run balance:check
```

Check mode runs the same simulations and thresholds without rewriting the
tracked current reports.

The runner rebuilds that isolated bundle first with:

```bash
node scripts/build-mock-combat.mjs --out-dir dist/balancer-runtime
```

Keeping this output separate prevents a running local preview from replacing
the balancer runtime during a Monte Carlo pass.

Outputs:

- `../artifacts/balancer/latest-summary.md`
- `../artifacts/balancer/latest-results.csv` (one compact row per reported matchup)
- one current `<suite>.md` report per balance suite

Each run replaces these current reports. The balancer intentionally does not
retain timestamped copies in the repository; Git history is the archive for
reports that are deliberately committed.

Suites run and write their reports sequentially so the full balance gate does
not retain every simulated fight in memory at once.

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
- The naked intended counter edge must land between `57%` and `65%` across
  4,000 fights per edge.
- Every intended counter is also tested in all ten battle arenas and must stay
  between `52%` and `75%`; arena art and challenges do not change combat stats.
- Equal-progression class fields stay within `45%` and `55%` at 0, 1, 3, and
  5 Power-Ups. One- and three-card counter edges cap at `69%`; mature five-card
  counter builds cap at `75%` while the full field remains even.
- Card balance is never graded against a vanilla opponent. Equal-rarity cards
  fight same-role peers and must stay within `42–58%` (`45–55%` target).
  Each higher rarity fights the adjacent lower rarity on the same role: every
  tier aggregate must win `52–62%`, while individual cards outside `48–66%`
  are flagged. Reports include a Wilson 95% interval for every card and tier.
  Legendary cards use identical legal Common + Uncommon + Rare support on both
  fighters and must activate in at least `25%` of fights.
- Canonical Brawler, Longshot, and Mage builds must each stay between `30%`
  and `70%` after randomized Power-Ups and Gear against an evenly distributed
  matched-progression field; the naked role matrix keeps its tighter band.
- The mandatory 30-day suite runs 48 deterministic accounts per activity
  profile, checks six combat checkpoints, all ten arena unlocks, ten Theme cycles,
  seven Gear Week days, capsule pacing, collection saturation, Gear ranks,
  Power-Up caps, pity, and matched progression.

The command exits nonzero if the role matrix, counter cycle, generated field,
equal-progression growth/reward paths, offerable single-card usefulness,
equal-progression three-day loop, 30-day content/progression, or matched Gear +
Power-Up profiles break the competitive gate. Progression opponents use the same reward schedule and
Power-Up count as the challenger. Combined-loadout rows
compare two rank-6 Gear pieces and three role-offerable Power-Ups against an
equally progressed field, so progression is never judged against a naked foe.
Reward choices are likewise compared against the opponent's real
rarity-weighted reward choices; the naked row is informational role calibration
only.
The focused Gear + Power-Up profiles allow deliberate sidegrades, but flag a
combined build outside `25–75%` or a Gear addition that costs more than 15
percentage points. The broader equipment-meta suite keeps random-loadout
interaction within 10 percentage points.

The equipment-meta gate is the broad Gear proof: 256 deterministic full
loadouts cover all 34 Gear items and all six ranks at 0, 3, and 5 Power-Ups.
Each loadout is paired with its exact reverse assignment, and no-Gear versus
Gear comparisons reuse the same production combat seed so equipment changes
stats without silently rerolling the fight.

These thresholds live in `run.mjs` and are deliberately easy to change.

## Important

This is a decision tool, not a shipping feature. Do not import it from `src/`.
If a balance experiment needs extra helpers, keep them inside this folder or
inside generated artifacts.
