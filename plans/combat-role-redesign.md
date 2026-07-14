# Combat Role Redesign Plan

## Status

Implemented in the current release worktree. CHONK/SPIKE/ZIP/CHARM remain the
stable analyzer stats, while Brawler, Longshot, Gunner, and Mage are the
player-facing combat roles. Historical reports keep their original Shape Power
identity and presentation through the versioned compatibility path.

## Outcome

Make every Scribbit's fighting style understandable before it attacks. A player
should be able to identify both fighters' range, behavior, primary attack, and
matchup edge from their drawings and combat silhouettes without opening a stat
panel.

The redesign keeps drawing-derived identity and server-authoritative 20 Hz
combat, but changes the player-facing battle model to four explicit roles:

| Drawing trait | Internal dominant stat | Player-facing role | Combat identity |
| --- | --- | --- | --- |
| Big and filled | CHONK | **Brawler** | Durable close-range physical fighter |
| Sharp and jagged | SPIKE | **Longshot** | Slow, powerful long-range physical fighter |
| Small and compact | ZIP | **Gunner** | Mobile, rapid mid-range ink shooter |
| Many colors | CHARM | **Mage** | Charged ranged area and control fighter |

CHONK/SPIKE/ZIP/CHARM remain the analyzer's stable stat names. Brawler,
Longshot, Gunner, and Mage become the language players see in birth, Arena,
Replay, Battles, and the Field Guide.

## Product principles

1. **Predetermined style, not predetermined winner.** Role, range, movement,
   attacks, and strengths are stable. Matchup, build, arena, element, and Gear
   still decide the result.
2. **One readable identity first.** Role is primary. Element is a secondary
   payload. Gear is a bounded modifier. Do not present three competing class
   systems.
3. **Behavior must prove the label.** A Gunner that spends the fight body-checking
   is not a Gunner. Each role needs a distinct movement controller and attack
   cadence.
4. **Visible causes only.** Any advantage label or recap must name facts that
   are present in the authoritative inputs or transcript.
5. **No new client authority.** The server computes the complete transcript;
   Phaser only renders it.
6. **Old replays remain truthful.** Existing stored transcripts keep their
   original mechanics and presentation path.

## Role contracts

### Brawler

- Drawing trigger: dominant CHONK from a large, filled body.
- Range: close.
- Permanent visual tell: oversized ink fists and a blocky guard stance.
- Movement: advances directly, turns slowly, never voluntarily retreats.
- Basic attack: heavy body slam with clear contact and knockback.
- Signature: **Inkquake**, an expanding close-range shockwave.
- Passive rule: highest hearts and stagger resistance.
- Strong against: Mage when it closes before the cast completes.
- Weak against: Longshot, which can maintain distance and punish the approach.

### Longshot

- Drawing trigger: dominant SPIKE from sharp edges and jagged geometry.
- Range: long.
- Permanent visual tell: a large folded-paper bow or quill launcher with a
  visible aim line.
- Movement: maintains maximum useful distance and repositions after each shot.
- Basic attack: slow, telegraphed quill projectile with high impact.
- Signature: **Nib Volley**, three physical quills fired in a readable spread.
- Passive rule: gains impact when a shot travels from its preferred range.
- Strong against: Brawler, whose direct approach is easy to line up.
- Weak against: Gunner, whose mobile pressure interrupts slow aim cycles.

### Gunner

- Drawing trigger: dominant ZIP from a small, compact footprint.
- Range: medium.
- Permanent visual tell: an Ink Blaster, muzzle flash, tracer, and visible
  reload state. Do not use a realistic firearm.
- Movement: strafes around its preferred range and retreats when crowded.
- Basic attack: rapid low-impact ink shots in short bursts.
- Signature: **Smearstep Barrage**, a repositioning dash followed by a fixed
  three-shot burst.
- Passive rule: can keep firing while moving, but has a punishable reload.
- Strong against: Longshot, which cannot finish its slow aim cycle under
  sustained pressure.
- Weak against: Mage, whose barrier and area attack punish repeated mid-range
  firing lanes.

### Mage

- Drawing trigger: dominant CHARM from multiple distinct colors.
- Range: medium to long.
- Permanent visual tell: a floating palette orb, charge ring, and large target
  area drawn before impact.
- Movement: holds position while casting, then retreats after release.
- Basic attack: slow color bolt with a visible charge.
- Signature: **Colorburst**, a cone followed by a delayed echo.
- Passive rule: gains a stronger cast when its channel is not interrupted.
- Strong against: Gunner through a visible barrier and area denial.
- Weak against: Brawler, which can break the channel at close range.

## Matchup model

The readable advantage loop is:

```text
BRAWLER -> MAGE -> GUNNER -> LONGSHOT -> BRAWLER
```

The two cross-loop pairings are neutral. A favorable role matchup should target
a 55-60% seeded win band after slot swapping, with a hard 65% ceiling. Neutral
and mirror matchups should remain inside 45-55%. These are balance targets, not
values shown to players.

The server must produce a typed `MatchupRead` from inspectable facts:

- both roles and preferred ranges;
- level difference;
- today's forecast;
- today's arena modifier;
- active Exhibition Gear;
- the role advantage, if any.

The player sees one short explanation, for example:

```text
YOUR GUNNER HAS THE EDGE
Rapid ink interrupts Longshot's slow aim.
```

`SAFE`, `EVEN`, and `BOLD` may remain as Rival Run scoring tiers, but each tier
must include its strongest truthful reason. Hidden projection results cannot be
the only explanation. The current matchup contract deliberately describes
mechanics rather than winner odds; counter and advantage language must replace
that contract at the same time rather than being layered on top of it.

## Randomness policy

The current engine is deterministic for one seed but uses the seed for opening
velocity, first-power delay, damage variance, critical hits, and final stable
ties. That is technically reproducible but visually arbitrary.

For the new ruleset:

- role controller, preferred range, targeting, attack cadence, and opening
  delay are fixed by the role contract;
- remove random critical hits and replace them with a visible focus meter or a
  fixed every-Nth-hit rule;
- remove damage variance for the first implementation, then reintroduce at most
  cosmetic-sized variance only if it does not change matchup readability;
- use stable day, fighter, arena, and bout inputs for the battle seed;
- allow the seed to select safe cosmetic motion variants, not hidden combat
  advantages;
- decide timeouts by remaining HP percentage, then damage dealt, then a stable
  fighter identity order. Never present an unexplained coin flip.

## Combat-engine design

### Keep

- Server-owned synchronous simulation and immutable transcript.
- 20 Hz fixed-tick execution and 20-second maximum.
- Fixed-point math, bounded checkpoints, event caps, arena folding, Ink
  Pressure, and transcript validation.
- Drawing-derived 100-point stat budget.
- Ember burn, Tide shove, Moss barrier, and Storm wind-up as secondary element
  payloads.

### Change

- Add a shared `CombatRole` derived from the existing dominant-stat selector.
- Give each role its own movement-intent function instead of one shared pursuit
  controller.
- Add deterministic basic-attack cadence separate from the signature power.
- Add preferred-range and reload/channel state to fighter checkpoints.
- Add transcript events for physical shot, ink burst, reload, cast channel,
  interruption, and role passive activation. Fired, impact, and miss events must
  carry authoritative origin, target, and timing facts.
- Update authoritative result and recap facts so the server can identify the
  deciding role interaction.

Longshot and Gunner shots should be resolved as bounded telegraph/fire/impact
events, not persistent free-running projectile entities. Phaser can animate a
quill arc or tracer between authoritative positions. This preserves the combat
entity cap and avoids adding a second physics simulation.

## Compatibility and migration

No Scribbit storage migration is required because role is derived from existing
stats. Existing founders also receive roles from their frozen stats, followed
by a manual catalog review to ensure the roster covers all four roles.

Battle compatibility does require versioning:

1. Preserve transcript versions 1-3 and their existing power/event parser.
2. Introduce transcript version 4 for role behavior and new events. Version 4
   must validate Gear independently instead of overloading version 3 to mean
   that Gear exists.
3. Continue displaying old reports with their original Shape Power names and
   motion.
4. Use the new role renderer only when the stored transcript declares the new
   ruleset.
5. Keep legacy report identity and Redis keys unchanged.
6. Do not rewrite stored reports or recalculate historical winners.
7. Bump the report-ID and combat-seed namespaces for new-rule battles so they
   cannot collide with reports produced by the old mechanics.

The current `PrimaryPower` values can remain as legacy-compatible signature
identifiers during migration. Player-facing role copy must come from one shared
role catalog rather than being duplicated across scenes.

## Presentation plan

### Drawing and birth

- Live preview shows `BECOMING A GUNNER` plus one sentence explaining the
  drawing cause.
- Birth result shows role, range, basic attack, and signature. Remove the
  four-stat dashboard from the default path.
- Practice prompts target roles rather than unexplained internal stats.

### Arena and rival selection

- Every fighter card shows one role icon and `MELEE`, `MID-RANGE`, or
  `LONG-RANGE`.
- Rival details lead with matchup reason, then level/forecast/Gear details.
- Use consistent non-color silhouettes: fist, quill launcher, Ink Blaster,
  palette orb.

### VS ceremony

- Show `BRAWLER vs MAGE` before names and secondary modifiers.
- Show one advantage line only when the server supplied a valid `MatchupRead`.
- Keep Element and Gear as small secondary chips.

### Replay

- Keep the role weapon/effect visible whenever the fighter is visible.
- Make preferred range legible through behavior, not a permanent debug ring.
- HUD shows role icon and current state: `AIMING`, `RELOADING`, `CHANNELING`, or
  `CLOSING` only while it changes.
- Damage and commentary remain transcript-driven.

### Result

- Add `WHY IT TURNED` with one deciding transcript fact.
- Example: `BRAWLER BROKE THE COLORBURST CHANNEL AT 4.2s`.
- Do not claim a role counter caused the win unless the transcript proves the
  relevant interaction occurred.

## Gear, elements, and progression

- Role never changes after birth or through Gear.
- Gear remains a bounded sidegrade and must not add a second role.
- Rename or regroup Gear technique presentation where its current name conflicts
  with the new role vocabulary.
- Keep Gear combat-active only in Exhibition/Spar until the expanded role,
  element, arena, and Gear balance matrix passes.
- Element visuals use the fighter's existing accent color but never replace the
  role icon or weapon tell.
- Ink Mods remain mechanically bounded. Their acquisition should eventually
  become a visible choice between two role-compatible options; automatic hidden
  assignment is acceptable only during the migration window.
- Preserve existing cosmetic and collectible IDs. Power-named cosmetics need an
  explicit display-label migration or a deliberate legacy label; never silently
  rename stored identifiers.

## Implementation phases

### Phase 1 — Contract and fixtures

- Add the canonical role catalog and dominant-stat mapping.
- Give the new concept one shared player-facing content home; update the
  overview's one-home table before adding scene-specific role copy.
- Define range, behavior, basic attack, signature, strengths, and weaknesses as
  typed shared data.
- Add four stable fighter fixtures and golden role-selection tests.
- Add `MatchupRead` with strict fact-safe validation.
- Update product documentation to distinguish roles from legacy Shape Powers.

Done when every client/server consumer imports one role authority and no scene
redefines role labels or matchup rules.

### Phase 2 — Versioned combat engine

- Add role-specific movement controllers and deterministic attack schedules.
- Add the new bounded transcript events and checkpoint fields.
- Implement Brawler and Mage first to prove close-range interruption and
  charged area attacks.
- Implement Longshot and Gunner next to prove two visibly different ranged
  styles.
- Replace outcome-changing crit/opening randomness under the new ruleset.
- Preserve old transcript execution and validation.

Done when the engine produces deterministic, valid, bounded transcripts for all
16 ordered role matchups and replays legacy fixtures unchanged.

### Phase 3 — Matchmaking and server integration

- Use the new ruleset for Practice and debug fixtures first.
- Replace opaque Rival Run projection copy with server-authored `MatchupRead`.
- Validate the actual chosen opponent against the same role-aware slate.
- Enable new Exhibition reports after Practice/debug verification.
- Enable Champion and Rumble only after their full mode-specific balance gates
  pass.

Done when retries are idempotent, reward commits remain atomic, and every new
report stores one validated role transcript.

### Phase 4 — Player-facing presentation

- Update Draw preview, birth, Arena cards, rival details, VS, Replay HUD,
  commentary, recap, Battles, and Field Guide.
- Add one coherent paper-cut visual kit for the four role tells.
- Keep Canvas and reduced-motion fallbacks truthful.
- Update accessibility summaries and native overlay labels.

Done when a mobile screenshot without explanatory annotations lets a reviewer
identify all four roles and their ranges correctly.

### Phase 5 — Balance and rollout

- Run the full role x role x element x arena matrix with mirrored slots.
- Add Gear and Ink Mod matrices for Exhibition.
- Tune toward the target advantage and neutral bands without hiding causes.
- Run complete verification, production build, local mock, and Reddit playtest.
- Remove superseded new-ruleset code only after legacy replay compatibility is
  proven.

Done when all gates below pass and the live app demonstrates one complete fight
for each role at mobile size.

## Verification gates

### Engine

- Same inputs produce byte-equivalent transcripts.
- Every battle ends by tick 400.
- Timeline, checkpoint, and entity caps hold for all role matchups.
- Each role maintains its preferred-range behavior for a measurable majority of
  eligible ticks.
- Brawler closes, Longshot aims, Gunner strafes/reloads, and Mage channels in
  every stable fixture.
- Interruptions and matchup explanations correspond to real transcript events.

### Balance

- Favorable loop matchups: target 55-60% and never exceed 65% across mirrored
  deterministic scenarios.
- Neutral and mirror matchups: 45-55%.
- No level, Ink Mod, or legal Gear loadout exceeds the published power ceiling.
- Forecast and arena modifiers do not invert every matchup of one role.

### Compatibility

- Stored v1-v3 reports still parse and replay with their original winners.
- New reports fail closed on malformed role/event/checkpoint data.
- Battles history can mix legacy and role reports on the same page.
- Practice remains ephemeral; rewards and Rumble entry remain impossible there.

### Frontend

- Role and range are readable at both 320x568 and 393x852 before the fight
  begins.
- All four permanent visual tells remain distinct in WebGL, Canvas fallback,
  reduced motion, and grayscale.
- Speed and Skip never change the authoritative result.
- Missing legacy motion remains a result-only view.
- No role explanation overflows or covers combat on supported mobile sizes.

### Release

- `./verify.command` passes from a clean shell.
- Local mock completes Draw/Practice, Spar, Champion, saved Replay, and Battles
  return paths.
- A fresh screenshot set proves Draw role preview, four VS matchups, four live
  roles, and fact-bound result explanations.
- Production Devvit build completes with no runtime or console errors.

## Primary implementation ownership

- Role selection and canonical definitions: `app/src/shared/combat/selection.ts`,
  `app/src/shared/combat/config.ts`, and the shared combat content layer.
- Fixed-tick behavior and transcript: `app/src/shared/combat/engine.ts`,
  `types.ts`, and `transcriptvalidation.ts`.
- Battle report assembly and mode rollout: `app/src/server/core/battle.ts`,
  `rivalRun.ts`, and `app/src/server/routes/api.ts`.
- Cross-scene battle staging: `app/src/client/lib/registry.ts`.
- Rival readability: `app/src/client/lib/sparrivals.ts` and
  `replaysparrivaldraft.ts`.
- Matchup claims: `app/src/client/lib/matchupbrief.ts` and the server-authored
  `MatchupRead` contract must move together.
- Player-facing combat: `app/src/client/scenes/Draw.ts`, `ArenaHome.ts`,
  `Replay.ts`, `MyBattles.ts`, and shared replay presentation helpers.
- Secondary consumers: Practice, founder selection, Rival Run challenge
  counting, care reactions, Doodle Dare copy, Gear Week copy, commentary, and
  power-named cosmetics must be inventoried before legacy presentation code is
  removed.
- Compatibility and proof: combat engine tests, transcript validation tests,
  focused client suites, the deterministic harness, and live mock artifacts.

## Explicit non-goals

- Live synchronous PvP or WebSockets.
- Player-controlled movement during Replay.
- Team combat or a healer/support role.
- Realistic firearms.
- Paid combat power.
- Rewriting historical battle results.
- Adding a second inventory or skill-tree system.
- Shipping all modes at once without Practice and Exhibition proof.

## Final acceptance test

Give a new player four unlabeled battle clips, one per role. They must correctly
identify which fighter is close-range, long-range, rapid-fire, and magic in at
least three of four clips. Then show two pre-fight cards; the player must explain
the displayed advantage before watching. If those tests fail, the redesign is
not visually clear enough even when the simulation gates pass.
