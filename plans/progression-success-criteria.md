# Scribbits Progression Success Criteria

## Purpose

This is the release gate for whether Scribbits progression feels understandable,
rewarding, competitive, and worth returning to. It covers the whole player arc,
not only combat balance.

The intended structure is:

**draw a personal fighter -> make a build -> watch it grow -> mature into
competition -> advance the permanent collection and Arena journey.**

Scribbits should use HABBY's useful unfolding structure—an immediate core loop,
one obvious next goal, and gradually introduced systems—without copying
pay-to-win power inflation, excessive currencies, or deliberate grind walls.

## Non-negotiable principles

1. **The drawing is the hook.** The first meaningful action is drawing a
   Scribbit, not managing Gear, currencies, quests, or menus.
2. **One clear next goal.** A player should always be able to say what they are
   working toward next.
3. **Every meaningful session advances something permanent.** Valid progress
   includes Arena/Tour progress, collection discovery, Gear/Forge progress,
   account milestones, or an enduring cosmetic/VFX unlock.
4. **Growth is felt, not merely counted.** A new Power-Up, Gear technique,
   maturity step, or level must visibly change the battle or presentation.
5. **Competitive power stays bounded.** Progress creates build variety and
   expression without making an older account unbeatable.
6. **Maturity opens the next layer.** Day-three maturity must feel like a
   graduation into competition, not an expiration or progression dead end.
7. **No dead rewards.** A duplicate must advance Forge progress or another
   visible permanent meter. Maxed rewards must redirect into useful progress.

## Player-arc acceptance criteria

### First five minutes: prove the promise

- The player reaches **Home -> Draw -> Role reveal -> choose one of three
  Power-Ups -> founding battle -> result** without a dead end.
- The submitted drawing is unmistakably the fighter shown in the battle.
- The player sees their Role and the class counter rule before the fight.
- The first Power-Up visibly triggers during the replay when its condition is
  met.
- The result clearly explains the winner, the important matchup/build reason,
  the reward, and the next action.
- Required explanations use no more than two blocking teaching surfaces.

### First session: create a return reason

- The player completes or begins one three-bout Rival Run.
- The player receives one permanent account reward or clearly sees how to earn
  it next.
- Only the systems needed for the current goal demand attention. Locked systems
  state what milestone reveals them.
- The session ends with one explicit return goal, such as tomorrow's growth,
  the next Rival Run bout, first Gear, or the next Arena/Tour node.

### Days one to three: the Scribbit grows

- A typical growing Scribbit earns **2-3 Power-Ups** and experiences roughly
  **4-5 wins** across the three-day growth window.
- Each day contains at least one meaningful choice or visible improvement.
- Level, Power-Up, Gear, and Role terminology remain distinct.
- The maturity countdown is shown in days, hours, and minutes.
- Day three ends in a visible maturity ceremony that explains:
  - base stats are now locked;
  - the Scribbit remains usable;
  - what mature competition is;
  - what permanent goal advances next.

### Days four to seven: unfold the metagame

- Bag, Gear, Forge, Rumble/Pick, and advanced competition are introduced in a
  deliberate order rather than as one first-session menu dump.
- The player owns enough Gear to make at least one understandable loadout
  choice.
- The player understands that Gear is reusable account progression while
  Power-Ups belong to one Scribbit.
- A seven-day player still has a visible near-term goal after reaching level 5
  or a five-card build.
- The day-seven reward is meaningful and does not collapse into a permanently
  weaker daily-login reward track on day eight.

### Days eight to thirty: maintain forward motion

- A permanent Arena/Tour or League ladder provides a chapter-like next goal.
- The ten existing arenas contribute to that visible journey instead of being
  presentation-only rotation.
- A player who cannot win the next competitive step can still make bounded
  progress through collection, Forge, practice/mastery, or account milestones.
- A typical session produces at least one permanent progress receipt.
- The game still has unfinished, understandable goals at day 30.
- Thirty-day earned-economy targets:

| Player profile | Chest opens | Collection discovered | Average strongest useful Gear rank |
| --- | ---: | ---: | ---: |
| Casual | 35-45 | 45-60% | 1.7-2.3 |
| Regular | 55-75 | 60-78% | 2.0-3.0 |
| Competitive | 80-105 | 75-88% | 2.7-3.8 |

These ranges are pacing gates, not monetization targets. Scribbits does not sell
combat power.

## Combat and economy gates

- The naked class counter edge stays within **57-65%**:
  Brawler > Mage > Longshot > Brawler.
- Equal-progression population fields stay within **45-55%** at 0, 1, 3, and
  5 Power-Ups.
- A deliberate five-card counter build may reach **75%**, but the overall
  three-class field remains even.
- Mirrored Gear matchups remain within **40-60%** unless a documented
  counter-build explains the result.
- Full high-rank Gear cannot erase the class system or create an automatic win.
- The full level 1-5 arc remains a bounded **1.5% damage increase**.
- Daily Draw funds exactly one standard chest at the live price.
- Epic-or-better pity occurs by pull 10.
- No loss removes earned account progress.
- No paid purchase grants combat power.

## Clarity and battle-feel gates

After one session, a player should be able to answer all five questions:

1. What Role is my Scribbit?
2. Which Role does it beat, and which Role beats it?
3. What did my Power-Up do?
4. What did my Gear do?
5. What should I do next?

Visual acceptance requires:

- Brawler, Longshot, and Mage attacks are distinguishable without reading text.
- Fighters do not remain visually stacked on top of each other during important
  hits.
- Power-Up and Gear triggers identify the source, target, and outcome.
- The class-advantage hit has a restrained but unmistakable `ADVANTAGE +10%`
  cue.
- Damage numbers, trigger labels, commentary, and Gear effects do not compete
  for the same screen space.
- Reduced-motion mode preserves every important gameplay read.

## Launch-measurement targets

These are initial hypotheses until production data establishes a real baseline.

- At least **65%** of players who begin Draw submit a valid Scribbit.
- At least **80%** of submitted Scribbits complete the founding replay.
- At least **90%** of players shown the first Power-Up offer choose one.
- At least **50%** of founding-fight players reach the first permanent reward.
- At least **30%** of first-day players return for another Arena day.
- At least **18%** return by day three.
- At least **10%** return by day seven.
- Fewer than **10%** of progression exits occur on a screen with no clear next
  action.

## Verification required before calling progression complete

- The full deterministic balancer finishes with zero hard flags.
- Three-day and thirty-day simulations remain inside the ranges above.
- Fresh-player, returning-player, growing, mature, full-roster, and archive
  paths pass end to end.
- The live mobile preview proves every required trigger and maturity handoff
  visually.
- Type-check, lint, tests, simulation suites, and production build pass.
- Player-facing prices and rewards match the live constants and documentation.
- A small usability test confirms that players can answer the five clarity
  questions without developer explanation.

## Current status

- [x] The first-session Draw -> Power-Up -> battle hook exists.
- [x] The three-day growing loop averages roughly 2.9 Power-Ups and 4.4 wins.
- [x] Level thresholds and bounded level power are centralized.
- [x] The 30-day economy has casual, regular, and competitive simulations.
- [x] Class, Power-Up, and Gear balance suites have zero hard flags.
- [x] Daily Draw currently funds one 7-Ink chest.
- [x] The 30-node Arena Tour is permanent and advances through wins or three
  distinct daily efforts.
- [x] Feature unlocks are staged: Home, Battles, Shop, Bag, then Arena.
- [x] Duplicates and maxed Gear redirect into useful rarity-matched progress.
- [x] Maturity visibly graduates a Scribbit into the Arena Tour.
- [x] Class, Power-Up, and Gear triggers have distinct battle reads and
  collision-free callout lanes.
- [x] The day-seven login track continues into an 18-Ink Studio Week cycle.
- [x] Progression analytics are versioned, allowlisted, and instrumented.
- [x] Player-facing documentation uses the live 7-Ink chest price.
- [ ] Validate the launch targets with real production cohorts.
- [ ] Run the small external usability test for the five clarity questions.

## Current simulation proof

- The full Monte Carlo run covers **801,474 fights across 18 suites**, with
  **zero hard flags** and 22 watch-only rows.
- The three-day loop averages **2.85-2.94 Power-Ups** and **4.38-4.49 wins**
  across Brawler, Longshot, and Mage starters.
- The thirty-day economy lands inside every target range:

| Player profile | Chest opens | Collection discovered | Average strongest useful Gear rank |
| --- | ---: | ---: | ---: |
| Casual | 43 | 56.0% | 2.0 |
| Regular | 70 | 73.4% | 2.4 |
| Competitive | 99 | 82.0% | 3.2 |

- Median Arena Tour progress by day 30 is **5/30 casual, 12/30 regular, and
  18/30 competitive**, so every typical profile still has a clear unfinished
  long-term goal.
- Production retention and comprehension remain measurement gates, not claims;
  the analytics needed to measure them are now installed.

Progression is successful only when the balance simulations pass **and** a
player always sees, understands, and feels their next step.
