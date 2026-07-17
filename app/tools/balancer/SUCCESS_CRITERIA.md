# Combat Balance Success Criteria

These gates define what “balanced” means for the authoritative combat simulator.
Passing the base role cycle alone is not sufficient.

## Role identity

- Base counter edges (`Brawler > Mage > Longshot > Brawler`): 57–65%.
- Every arena counter edge: 54–68%, and no arena may move an edge more than
  5 percentage points from its global result.
- Identical-role mirrors: 48–52%.
- Target-A versus target-B orientation gap: at most 3.5 percentage points in
  the combined-rarity field and 2 points in the base role field.

## Weapon rarity

Controlled comparisons use the same role, rank, category, and effect family.
The current catalog has Common, Epic, and Legendary `aim` weapons but no Rare
weapon, so the verifier must not claim adjacent coverage for a missing tier.

- Epic over Common: 56–64%.
- Legendary over Epic: 53–60%.
- Legendary over Common: 60–68%.
- Every individual role must remain above 52%; an aggregate cannot hide a
  role-specific failure.

## Roguelite Power-Up rarity

Power-Ups are build-defining counters, so averaging every unrelated card into
one tier is diagnostic rather than authoritative. For example, a projectile
return and a lethal-hit survival card are not interchangeable stat sticks.
The hard rarity gate therefore uses legal, role-specific representative paths;
the all-card field remains in the report as watches so outliers stay visible.

- Epic representative over Common: at least 52% skill-only.
- Legendary representative over Epic: at least 50% skill-only.
- Natural-field trigger rate: at least 15%; Legendary trigger rate: at least
  25% in its supported four-card build.
- Illegal or non-offerable controlled builds fail before simulation.
- All-card tier aggregates outside 54–62% and individual peer spreads outside
  their target bands are diagnostic watches, not proof that rarity is broken.

## Combined rarity

Controlled comparisons equip both the higher-rarity weapon and higher-rarity
Power-Up build against their lower-rarity equivalents.

- Epic weapon plus Epic skill over Common equivalents: 60–90%.
- Legendary weapon plus Legendary skill over Epic equivalents: 54–88%.
- The combined loadout must keep a positive advantage over the lower combined
  loadout. Because threshold skills intentionally interact with health and
  damage, its win rate may sit up to 6 points below its strongest component for
  Epic/Common and 15 points below for Legendary/Epic.
- Interaction residual: within ±15 points for Epic/Common and ±35 points for
  mature four-card Legendary/Epic builds.
- An intended role counter with equal combined progression: 58–70%.
- An upgraded underdog improves 3–10 percentage points against its counter but
  remains at or below 48%; rarity matters without deleting role identity.

## Safety

- Every legal directed matchup: 30–70%; absolute emergency bounds: 25–75%.
- Same-loadout mirrors: 48–52%.
- Timeout reporting must use the authoritative `timeout_*` battle reason. The
  intentional Mage/Longshot spacing duel may use the full 20-second replay,
  but it must exchange at least half of the fighters' combined maximum health;
  other current-role matchups must not become mostly stalled capped fights.
- Every sampled build must pass authoritative validation; illegal builds must
  be rejected before simulation.
- All deterministic simulation tests, lint, production build, targeted rarity
  Monte Carlo, and the full balance run must complete before this work is
  considered finished.
