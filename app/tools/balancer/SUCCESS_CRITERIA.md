# Combat Balance Success Criteria

These gates define what “balanced” means for the authoritative combat simulator.
Passing the base role cycle alone is not sufficient.

## Role identity

- Base counter edges (`Brawler > Mage > Longshot > Brawler`): 56.5–65%.
- Every arena counter edge: 54–68%, and no arena may move an edge more than
  5 percentage points from its global result.
- Identical-role mirrors: 48–52%.
- Target-A versus target-B orientation gap: at most 3.5 percentage points for
  weapon-only rarity, 10 points for combined weapon + skill rarity, and 2
  points in the base role field. A higher-rarity combined loadout must still
  win at least 50% from each individual orientation.

## Weapon rarity

Controlled comparisons use the same role, rank, category, and effect family.
The current catalog has Common, Epic, and Legendary `aim` weapons but no Rare
weapon, so the verifier must not claim adjacent coverage for a missing tier.

- Epic over Common: 56–64%.
- Legendary over Epic: 53–60%.
- Legendary over Common: 59.5–68%.

Acquisition must not leave combat Gear entirely to category luck:

- The first eligible capsule grants a Common weapon. Existing inventories with
  no discovered weapon receive the same catch-up on their next pull.
- If an Epic-or-better weapon has not arrived naturally, an Epic weapon is
  guaranteed by pull 30.
- If a Legendary weapon has not arrived naturally, it is guaranteed by pull
  100.
- The ordinary 70/25/4/1 rarity distribution and ten-pull Epic-or-better pity
  remain authoritative outside these disclosed weapon safeguards.
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
- Forced single-card combo probes, fixed showcase Gear profiles, reward-choice
  spreads, and progression-versus-fresh-player pacing remain diagnostic
  watches. The legal growth, full-equipment, and controlled-rarity suites own
  the hard gates for those systems.
- Across equal-progression random fields, each class remains within 44–56% and
  the widest class spread remains at most 15 points. Same-role mirrors remain
  within 45–55%.

## Combined rarity

Controlled comparisons equip both the higher-rarity weapon and higher-rarity
Power-Up build against their lower-rarity equivalents.

- Epic weapon plus Epic skill over Common equivalents: 60–91%.
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

## Full equipment field

- A sampled equipped loadout must improve its paired no-equipment baseline by
  2–22 percentage points across the role field. This is the gameplay value of
  weapons and the rest of the equipped set, not a cosmetic-only promise.
- Giving both fighters the same equipment may move a directed role matchup by
  at most 8 percentage points from its paired no-equipment baseline. The base
  and growth suites own absolute class-counter bands; this gate proves gear
  does not erase them.
- Adding three or five Power-Ups may change the equipment lift by at most 20
  points, and the equipped build must retain a positive advantage.

## Safety

- Every legal directed matchup: 30–70%; absolute emergency bounds: 25–75%.
- Same-loadout mirrors: 48–52%.
- Timeout reporting must use the authoritative `timeout_*` battle reason. The
  intentional Mage/Longshot spacing duel may use the full 20-second replay,
  but it must exchange at least 44% of the fighters' combined maximum health;
  other current-role matchups must not become mostly stalled capped fights.
- Every sampled build must pass authoritative validation; illegal builds must
  be rejected before simulation.
- All deterministic simulation tests, lint, production build, targeted rarity
  Monte Carlo, and the full balance run must complete before this work is
  considered finished.
