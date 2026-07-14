# Power-Up Roguelite Contract

## Goal

Replace Element and numeric Ink Mods with one readable roguelite layer:

- the drawing chooses the permanent combat Role;
- wins offer three behavioral Power-Ups;
- a Scribbit may own five unique Power-Ups and at most one Legendary;
- Gear remains the only swappable system that changes damage, hearts,
  cooldown, focus, wind-up, or starting timing.

Power-Ups belong to the Scribbit, disappear from active play when it is
archived, and never enter the reusable Gear inventory.

## Reward rules

| Source | Three-card offer |
| --- | --- |
| Exhibition or Rival Run win | Common, Common, Rare |
| Rival Run final win or a Rumble day with a win | Common, Rare, Epic |
| Champion win | Rare, Epic, Legendary |

- Losses do not create an offer.
- Offers are generated and persisted by the server from the battle report.
- Closing or reloading cannot reroll or lose an offer.
- Choices must be distinct, unowned, compatible, and outside any exclusive
  group already owned.
- A Scribbit with five Power-Ups receives no further offer in v1.
- A Scribbit that already owns a Legendary receives an Epic in the Legendary
  choice slot.

## Launch catalog

### Common

- **Edge Spring** — first wall bounce redirects toward center for three ticks.
- **Smudge Step** — first fully missed basic attack triggers a short side dash.
- **Paper Shield** — first incoming signature hit prevents up to 10 damage.
- **Combo Spark** — third consecutive landed basic adds 6 damage.
- **Center Fold** — first crossing below half hearts turns toward center and
  gains four defense ticks.

### Rare

- **Double Doodle** — first landed signature echoes after six ticks for 35% of
  the actual hit, capped at 12 damage.
- **Backup Plan** — first missed signature retries after twelve ticks at 50%
  power.
- **Counter Sketch** — first enemy signature schedules a half-power basic
  counter, capped at 10 damage.
- **Wallop** — first opponent wall bounce immediately after the owner's
  knockback adds 8 damage.
- **Echo Mark** — first signature hit marks the target; the next landed basic
  consumes it for 8 damage.

### Epic

- **Last Scribble** — first lethal enemy hit leaves one heart and grants six
  defense ticks.
- **Second Draft** — first missed signature retries after ten ticks at 65%
  power. It is mutually exclusive with Backup Plan.
- **Paper Twin** — after first crossing below half hearts, the next two landed
  basic attacks echo at 35%, capped at 6 damage each.

### Legendary

- **Masterpiece** — after three distinct owned non-Legendary Power-Ups trigger,
  release an 18-damage ink burst.
- **Endless Draft** — the first consumed Common Power-Up receives one extra
  activation.

## Combat balance ceilings

- Every fighter has a 36-damage Power-Up bonus budget per fight.
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
