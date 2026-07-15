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

| Source                                         | Three-card offer      |
| ---------------------------------------------- | --------------------- |
| Birth, before the first fight                  | Common, Common, Rare  |
| Exhibition or Rival Run win                    | Common, Common, Rare  |
| Rival Run final win or a Rumble day with a win | Common, Rare, Epic    |
| Champion win                                   | Rare, Epic, Legendary |

- Losses do not create an offer.
- Birth offers are generated from the committed Scribbit; later offers are generated from the battle report.
- Closing or reloading cannot reroll or lose an offer.
- Choices must be distinct, unowned, compatible, and outside any exclusive
  group already owned.
- A Scribbit with five Power-Ups receives no further offer in v1.
- A Scribbit that already owns a Legendary receives an Epic in the Legendary
  choice slot.

## Launch catalog

The redesign follows the useful part of Archero's ability model: every pick
works by itself, repeated triggers make a build feel active throughout a fight,
and matching build paths amplify one another. The five paths are **Bounce**,
**Combo**, **Survival**, **Special**, and **Any Build**. Serialized v1 IDs stay
stable, including the IDs behind the renamed Heart Ink and Ink Rage cards.

### Common

- **Edge Spring · Bounce** — up to three wall touches restore 3 health, turn
  the Scribbit back toward the fight, and empower its next two normal hits.
- **Smudge Step · Survival** — completely dodges every fourth incoming normal
  attack, up to three times.
- **Paper Shield · Survival** — blocks up to 5 damage from each of the first
  three incoming special hits.
- **Combo Spark · Combo** — every third consecutive normal hit, up to three
  times, deals 50% extra damage and restores 4 health.
- **Center Fold · Survival** — first crossing below half health restores 12
  health and briefly blocks incoming damage.

### Rare

- **Double Doodle · Special** — the first three special hits repeat for 40% of
  their damage, capped at 6 damage each.
- **Heart Ink · Combo** — every fourth landed normal attack restores 8 health,
  up to three times.
- **Counter Sketch · Survival** — the first three incoming special hits schedule
  a counter for up to 6 damage and restore 3 health.
- **Wallop · Bounce** — the first three knockbacks into a wall add 6 damage.
- **Echo Mark · Special** — special hits empower the next two normal hits for 35%
  extra damage, up to four empowered hits.

### Epic

- **Last Scribble · Survival** — once per fight, survives a knockout with 30%
  health and briefly blocks damage.
- **Ink Rage · Survival** — below half health, the next four normal hits add 5
  damage and restore 2 health each.
- **Paper Twin · Combo** — the first four normal hits repeat for 35% damage,
  capped at 4 damage each.

### Legendary

- **Masterpiece · Any Build** — after three different non-Legendary Power-Ups
  activate, deals 12 damage and restores 10 health.
- **Endless Draft · Any Build** — every Common and Rare Power-Up receives one
  additional activation.

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

- Every fighter has a 60-damage Power-Up bonus budget per fight.
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
- Every legal build respects the 36-damage bonus ceiling.
- Mirrored Role matchups run at least 100 seeds per build sample.
- No Power-Up changes a Gear snapshot or any Gear modifier field.
- No sampled build moves a neutral mirrored matchup outside a 40–60% band
  without an explicit documented counter-build explanation.
