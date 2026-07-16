# Power-Up Roguelite Contract

## Goal

Replace Element and numeric Ink Mods with one readable roguelite layer:

- the drawing chooses the permanent combat Role;
- birth immediately offers three randomized behavioral Power-Ups and the player chooses one;
- later wins offer three more behavioral Power-Ups;
- a Scribbit may own five unique Power-Ups and at most one Legendary;
- Gear remains the only swappable system that changes damage, hearts,
  cooldown, focus, wind-up, or starting timing.

Power-Ups belong to the Scribbit, disappear from active play when it is
archived, and never enter the reusable Gear inventory.

## Reward rules

| Source                                         | Common | Uncommon | Rare | Epic | Legendary |
| ---------------------------------------------- | -----: | -------: | ---: | ---: | --------: |
| Birth, before the first fight                  |    65% |      29% |   5% |   1% |        0% |
| Exhibition or Rival Run win                    |    65% |      29% |   5% |   1% |        0% |
| Rival Run final win or a Rumble day with a win |    35% |      42% |  15% |   8% |        0% |
| Champion win                                   |     5% |      20% |  40% |  30% |        5% |

- Losses do not create an offer.
- Each of the three cards rolls its rarity from the source weights, selects a
  distinct role-fit Power-Up, then the completed offer is shuffled so rarity
  never owns a fixed card position.
- Weights renormalize across available tiers when owned cards or the
  one-Legendary cap make a tier unavailable.
- Birth offers are generated from the committed Scribbit; later offers are generated from the battle report.
- Closing or reloading cannot reroll or lose an offer.
- Choices must be distinct, unowned, compatible, and outside any exclusive
  group already owned.
- A Scribbit with five Power-Ups receives no further offer in v1.
- A Scribbit that already owns a Legendary cannot roll another Legendary.
- Direct Power-Up healing scales from maximum health and is capped at 20% of
  maximum health across a fight so stacked sustain cannot become an infinite
  loop.

## Launch catalog

The redesign follows the useful part of Archero's ability model: every pick
works by itself, repeated triggers make a build feel active throughout a fight,
and matching build paths amplify one another. The five paths are **Bounce**,
**Combo**, **Survival**, **Special**, and **Any Build**. Serialized v1 IDs stay
stable, including the IDs behind the renamed Heart Ink and Ink Rage cards.

### Common

- **Edge Spring · Bounce** — the first wall touch restores 2% max health and
  makes the next two normal hits deal 25% extra damage.
- **Smudge Step · Survival** — deflects 50% of every fourth incoming normal
  attack, up to two times.
- **Paper Shield · Survival** — blocks 25% of the first incoming special hit.
- **Combo Spark · Combo** — the third consecutive normal hit deals 25% extra
  damage and restores 2% max health.
- **Center Fold · Survival** — the first crossing below half health restores 6%
  max health.

### Uncommon

- **Double Doodle · Special** — repeats 25% of the first special hit.
- **Heart Ink · Combo** — every fourth landed normal attack restores 3% max
  health, up to two times.
- **Counter Sketch · Survival** — the first incoming special hit schedules a
  counter for 50% of the owner's normal attack damage.

### Rare

- **Wallop · Bounce** — the first two knockbacks into a wall deal 50% of normal
  attack damage each.
- **Echo Mark · Special** — the first special hit empowers the next two normal
  hits for 40% extra damage.

### Epic

- **Last Scribble · Survival** — once per fight, survives a knockout blow with
  10% max health.
- **Ink Rage · Survival** — below half health, the next three normal hits deal
  30% extra damage and restore 2% max health each.
- **Paper Twin · Combo** — the first two normal hits repeat for 50% damage each.

### Legendary

- **Masterpiece · Any Build** — after three different non-Legendary Power-Ups
  activate, deals 10% of enemy max health and restores 10% max health.
- **Endless Draft · Any Build** — every Common, Uncommon, and Rare Power-Up
  receives one additional activation.

## Build paths

- **Combo:** Combo Spark → Heart Ink → Echo Mark → Paper Twin.
- **Survival:** Paper Shield → Center Fold → Counter Sketch → Last Scribble →
  Ink Rage.
- **Bounce:** Edge Spring → Wallop.
- **Special:** Double Doodle → Echo Mark, with Combo cards converting the
  repeated pressure into healing and follow-up damage.
- **Any Build:** Masterpiece rewards variety; Endless Draft strengthens the
  build already taking shape.

## Combat balance ceilings

- Every fighter has a Power-Up bonus damage budget equal to 15% of the
  opponent's maximum health per fight.
- Power-Up damage follows the same readable class matchup multiplier as every
  other damage source.
- When both fighters have progressed to the same Power-Up depth, a small
  depth-specific class counterweight keeps stacked effects from warping that
  triangle. It does not reduce a progressed build's advantage over a fresh one.
- Bonus hits use normal barriers and never critical-hit.
- Power-Ups never apply a removed Element payload.
- Maximum five unique Power-Ups and one Legendary.
- Maximum 32 Power-Up trigger events per fighter per fight.
- Scheduled effects are state records, not spawned combat entities.
- Gunner volleys count combo/miss triggers by attack number, not individual
  shots.

## Compatibility

- Stored Scribbit schema v1 keeps its frozen Element and Ink Mod parser.
- Runtime Scribbit schema v2 removes Element and stores Power-Ups.
- Stored combat transcripts v1-v4 remain readable with their legacy Element
  and upgrade fields.
- New combat transcript v5 omits Element and accepts only Power-Ups.
- The historical `v1-element-clash` arena id remains valid for old reports but
  receives neutral player-facing presentation.

## Initial balance gate

- Every Power-Up primitive has a deterministic trigger and cap test.
- Every legal five-card build remains byte-identical for identical inputs.
- Every legal build respects the 15%-of-opponent-max-health bonus ceiling.
- The naked class cycle is gated to 57–65% for each intended edge.
- Arena visuals and challenges remain distinct, but their combat modifiers are
  neutral. A separate 24,000-fight gate verifies that all ten arenas preserve
  the three intended class edges.
- Equal-progression population fields stay within 45–55% through 0, 1, 3,
  and 5 Power-Ups. Five-card counter builds may reach 75% while the overall
  three-class field remains even.
- Power-Up value is graded upgraded-versus-upgraded on the same combat role,
  never against vanilla. Equal-rarity peers target 45–55% and hard-fail outside
  42–58%. Each rarity step must beat the adjacent lower tier by 52–62% in
  aggregate without exceeding 66% for an individual non-Legendary card.
- Legendary tests use mirrored legal Common + Uncommon + Rare support, compare
  both Legendary peers and Legendary-versus-Epic, and require the Legendary to
  activate in at least 25% of sampled fights.
- The equipment meta samples every Gear item and rank. One technique keeps its
  full rank identity; multi-technique loadouts average their effects and cap
  each resolved combat axis at 0.5%, preventing eight-slot stacking.
- No Power-Up changes a Gear snapshot or any Gear modifier field.
- No sampled build moves a neutral mirrored matchup outside a 40–60% band
  without an explicit documented counter-build explanation.
