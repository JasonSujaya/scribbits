# Gear Effects Balance Contract

## Product rule

Birth stickers, titles, pens, and paid cosmetics never add combat power. Reusable
earned Gear may provide a small server-authored sidegrade in Exhibition/Spar.
Gear never mutates the drawing's fixed 100-point CHONK/SPIKE/ZIP/CHARM build,
never changes Shape Power selection, and remains disabled in Rumble, Champion,
and Practice until the wider balance matrix passes.

The loadout keeps two slots in each of four categories: weapon, armor, shoes,
and accessory. Each category resolves into one readable technique: the
highest-rank piece leads and the other piece contributes 25% support strength.
That gives at most four techniques, not eight stacked procs. Rarity changes drop
rate and presentation; only forged rank changes the bounded sidegrade.

## Rank curve

| Rank | Technique strength | Presentation        |
| ---- | -----------------: | ------------------- |
| 1★   |               0.4% | Base ink cue        |
| 2★   |               0.7% | Stronger cue        |
| 3★   |               1.0% | Full cue            |
| 4★   |               1.3% | Gold enhancement    |
| 5★   |               1.6% | Maximum normal star |
| Red★ |               2.0% | Red awakened cue    |

Three loose copies Forge the next rank. Moving from 1★ to Red★ costs 15 loose
copies. Permanent random stat rolls are deliberately excluded from v1: they
would require an idempotent persisted Forge imprint and would encourage reroll
chasing. Build variety comes from the chosen Gear families; later run-only
boons may offer random CHONK-like heart, SPIKE-like impact, ZIP-like speed, or
CHARM-like critical choices without changing the birth stats.

## Six techniques

| Family  | Battle cue    | Benefit                                  | Tradeoff                      |
| ------- | ------------- | ---------------------------------------- | ----------------------------- |
| Guard   | Paper Guard   | More maximum hearts                      | Slightly less impact          |
| Rush    | Dash Blades   | More dash impact                         | Fewer hearts                   |
| Focus   | Orbiting Nibs | Rank-1 crit; faster wind-up from 2★      | Slightly slower recovery      |
| Ready   | First Strike  | Rank-1 crit; faster first power from 2★  | Slightly less impact          |
| Fortune | Lucky Echo    | Higher critical chance                   | Slightly less impact          |
| Aim     | Blade Volley  | More impact with blade VFX               | Fewer hearts; slower recovery |

All percentage axes are capped to ±3% after the four category techniques are
combined. Timing changes are capped to one tick. Gear is snapshotted into v3
combat input and included in the deterministic seed and report identity;
gear-free fights retain the historical v2 transcript.

## Balance gates

- Every rank from 1★ through 5★ and Red★ stays within 40–60% versus no Gear
  across all six families and all four Shape Powers using mirrored slots and
  600 deterministic seeds.
- Two legal full-loadout matrices collectively cover all six families; Red★
  versus the matching 1★ loadout stays within 42–58%.
- Existing cross-power win rates stay at or below 65%.
- Base stats remain exactly 100 and select the same Shape Power with or without
  Gear.
- Every fight remains within 400 ticks and existing event/entity caps.
- Rumble, Champion, and Practice remain Gear-neutral until an expanded arena,
  element, and Ink Mod matrix passes.
- Functional Gear remains earned-only; any paid product stays cosmetic-only.

## Seven-day content

`app/src/shared/content/gearweek.ts` rotates a visible Bag headline through:

1. Blade Basics — Aim Gear.
2. Paper Fort — Guard Gear.
3. First Strike — Ready Gear.
4. Orbit School — Focus Gear.
5. Dash Blades — Rush Gear.
6. Lucky Echo — Fortune Gear.
7. Red Star Showcase — win an Exhibition with four active techniques and at
   least one Red★ item.

The first six days feature every current Gear item once; day seven demonstrates
the terminal tier without granting free Red★ power.
