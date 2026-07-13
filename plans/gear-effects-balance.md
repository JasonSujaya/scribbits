# Gear Effects Balance Contract

## Product rule

Gear rarity and forged rank improve art, foil, entrance, and KO presentation. They never multiply combat stats. Every accessory belongs to one of eight **Style Traits**, and each family has Common gear so rarity cannot become power.

The reusable loadout contract reserves two slots in each of four categories: weapon, armor, shoes, and accessory. This is capacity, not permission to stack eight independent effects. Current mode is `display-only`: trait metadata stays internal, player-facing collection and capsule screens do not name it, and gear does not enter combat input or change a transcript.

## Proposed sidegrades

| Trait   | Future benefit                         | Required tradeoff | Initial items                                 |
| ------- | -------------------------------------- | ----------------- | --------------------------------------------- |
| Guard   | +0.5% max HP                           | -0.5% damage      | Beanie, Snail Shell Backpack, Cape            |
| Edge    | +0.5% damage                           | +1% cooldown      | Tiny Sword, Mustache, Golden Crown            |
| Rush    | -1% cooldown                           | -0.5% max HP      | Speed Scarf, Propeller Cap, Ink Skates        |
| Focus   | -1 telegraph tick                      | +1% cooldown      | Monocle, Round Glasses, Headphones            |
| Ready   | -1 initial ability-delay tick          | -0.5% damage      | Bowtie, Party Hat, Top Hat                    |
| Fortune | +0.6 percentage points critical chance | -0.3% damage      | Flower Crown, Colorburst Rosette, Prism Crown |
| Impact  | +5% authored knockback                 | -1% movement      | Rumble Belt, Crater Crown, Dragon Wings       |
| Aim     | +3% Shape Power collision/range        | -0.5% damage      | Nib Headband, Eyepatch, Nib Circlet           |

When effects activate, each category resolves its two equipped pieces into at most one category perk, for four perks total. Two items never apply two raw modifiers, duplicate families do not stack, and rarity or forge rank never scales the values. A perk resolves atomically—if the benefit cannot apply, its tradeoff must not apply alone. Pair recipes can create the build-combo chase without turning eight slots into an unreadable modifier pile.

## Activation sequence

1. **Display only:** ship trait metadata, art language, and previews with zero combat changes.
2. **Exhibition:** resolve each occupied category into one free sidegrade, then let owned gear determine its pair recipe and visuals. Snapshot category, recipe, and effect version in the server-authored fighter input and transcript.
3. **Competitive:** enable only after the full balance matrix passes. Never infer historical effects from a player's current inventory.

## Balance gates

- Identical seed, stats, element, and Ink Mods produce identical transcripts in display-only mode regardless of accessory or rank.
- Test 8 traits × all 15 legal four-of-six Ink Mod loadouts × 4 Shape Powers × 4 elements × slot swaps and representative seeds.
- Trait versus no-trait, same-build aggregate win rate stays within 45–55%.
- No trait shifts a matchup by more than 5 percentage points from its baseline.
- Absolute power-matchup win rate stays at or below 65%; identical slot A stays within 40–60%.
- Maximum-level versus level-1 remains within the existing 60% cap.
- Every fight remains within 400 ticks and existing event/entity caps.
- Aim validates each power geometry independently; Impact touches only authored knockback and never wall-ejection safety.

Until those gates pass, Rumble and Boss battles remain accessory-neutral.
