# Power-Up Usefulness Monte Carlo

Generated: 2026-07-15T05:54:35.354Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Baseline | Swing | Rarity | Offered? | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | EDGE SPRING | 58.8% | 13.4s | 0.57 | 0.57 | 40.3% | 0.57 | 52.3% | 6.5pp | common | yes | 0.0% | 83.3% | 0.0% | OK |
| Brawler base | SMUDGE STEP | 48.1% | 13.8s | 1.33 | 1.33 | 100.0% | 1.33 | 52.3% | -4.2pp | common | yes | 0.0% | 56.9% | 0.0% | OK |
| Brawler base | PAPER SHIELD | 50.0% | 13.6s | 3.00 | 3.00 | 100.0% | 3.00 | 52.3% | -2.3pp | common | yes | 0.0% | 81.9% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | COMBO SPARK | 35.6% | 13.5s | 1.00 | 1.00 | 67.1% | 1.00 | 52.3% | -16.7pp | common | yes | 0.0% | 83.3% | 0.0% | FLAG_HARMFUL |
| Brawler base | CENTER FOLD | 49.5% | 13.6s | 1.00 | 1.00 | 100.0% | 1.00 | 52.3% | -2.8pp | common | yes | 0.0% | 70.8% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | DOUBLE DOODLE | 43.5% | 13.5s | 2.20 | 2.20 | 100.0% | 2.20 | 52.3% | -8.8pp | rare | yes | 0.0% | 83.3% | 0.0% | OK |
| Brawler base | HEART INK | 44.4% | 13.5s | 0.88 | 0.88 | 83.3% | 0.88 | 52.3% | -7.9pp | rare | yes | 0.0% | 81.9% | 0.0% | OK |
| Brawler base | COUNTER SKETCH | 33.3% | 13.4s | 2.67 | 2.67 | 100.0% | 2.67 | 52.3% | -19.0pp | rare | yes | 0.0% | 81.9% | 0.0% | FLAG_HARMFUL |
| Brawler base | WALLOP | 52.8% | 13.5s | 1.17 | 1.17 | 66.7% | 1.17 | 52.3% | 0.5pp | rare | yes | 0.0% | 83.3% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | ECHO MARK | 52.8% | 13.5s | 3.50 | 3.50 | 100.0% | 3.50 | 52.3% | 0.5pp | rare | yes | 0.0% | 83.3% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | LAST SCRIBBLE | 83.3% | 13.8s | 0.64 | 0.64 | 64.4% | 0.64 | 52.3% | 31.0pp | epic | yes | 0.0% | 83.3% | 0.0% | FLAG_OVERTUNED |
| Brawler base | INK RAGE | 43.5% | 13.5s | 1.00 | 1.00 | 100.0% | 1.00 | 52.3% | -8.8pp | epic | yes | 0.0% | 83.3% | 0.0% | OK |
| Brawler base | PAPER TWIN | 53.7% | 13.5s | 1.00 | 1.00 | 100.0% | 1.00 | 52.3% | 1.4pp | epic | yes | 0.0% | 83.3% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | MASTERPIECE | 52.3% | 13.5s | 0.00 | 0.00 | 0.0% | 0.00 | 52.3% | 0.0pp | legendary | yes | 0.0% | 83.3% | 0.0% | INFO_COMBO_ONLY |
| Brawler base | ENDLESS DRAFT | 52.3% | 13.5s | 0.00 | 0.00 | 0.0% | 0.00 | 52.3% | 0.0pp | legendary | yes | 0.0% | 83.3% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | EDGE SPRING | 87.5% | 13.8s | 3.00 | 3.00 | 100.0% | 3.00 | 46.3% | 41.2pp | common | yes | 0.0% | 56.5% | 0.0% | FLAG_OVERTUNED |
| Longshot base | SMUDGE STEP | 85.2% | 13.6s | 0.83 | 0.83 | 83.3% | 0.83 | 46.3% | 38.9pp | common | yes | 0.0% | 60.2% | 0.0% | FLAG_OVERTUNED |
| Longshot base | PAPER SHIELD | 74.1% | 13.8s | 2.83 | 2.83 | 100.0% | 2.83 | 46.3% | 27.8pp | common | yes | 0.0% | 80.1% | 0.0% | FLAG_OVERTUNED |
| Longshot base | COMBO SPARK | 87.5% | 13.6s | 1.33 | 1.33 | 100.0% | 1.33 | 46.3% | 41.2pp | common | yes | 0.0% | 50.0% | 0.0% | FLAG_OVERTUNED |
| Longshot base | CENTER FOLD | 82.9% | 13.6s | 0.83 | 0.83 | 83.3% | 0.83 | 46.3% | 36.6pp | common | yes | 0.0% | 75.9% | 0.0% | FLAG_OVERTUNED |
| Longshot base | DOUBLE DOODLE | 93.5% | 13.5s | 3.00 | 3.00 | 100.0% | 3.00 | 46.3% | 47.2pp | rare | yes | 0.0% | 50.0% | 0.0% | FLAG_OVERTUNED |
| Longshot base | HEART INK | 65.3% | 13.6s | 1.00 | 1.00 | 100.0% | 1.00 | 46.3% | 19.0pp | rare | yes | 0.0% | 74.1% | 0.0% | FLAG_OVERTUNED |
| Longshot base | COUNTER SKETCH | 100.0% | 13.6s | 2.83 | 2.83 | 100.0% | 2.83 | 46.3% | 53.7pp | rare | yes | 0.0% | 50.5% | 0.0% | FLAG_OVERTUNED |
| Longshot base | WALLOP | 46.3% | 13.5s | 0.34 | 0.34 | 33.8% | 0.34 | 46.3% | 0.0pp | rare | yes | 0.0% | 78.2% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | ECHO MARK | 75.9% | 13.5s | 3.92 | 3.92 | 100.0% | 3.92 | 46.3% | 29.6pp | rare | yes | 0.0% | 50.0% | 0.0% | FLAG_OVERTUNED |
| Longshot base | LAST SCRIBBLE | 100.0% | 13.8s | 0.70 | 0.70 | 70.4% | 0.70 | 46.3% | 53.7pp | epic | yes | 0.0% | 78.2% | 0.0% | FLAG_OVERTUNED |
| Longshot base | INK RAGE | 50.5% | 13.6s | 0.83 | 0.83 | 83.3% | 0.83 | 46.3% | 4.2pp | epic | yes | 0.0% | 78.2% | 0.0% | OK |
| Longshot base | PAPER TWIN | 82.4% | 13.6s | 1.00 | 1.00 | 100.0% | 1.00 | 46.3% | 36.1pp | epic | yes | 0.0% | 50.0% | 0.0% | FLAG_OVERTUNED |
| Longshot base | MASTERPIECE | 46.3% | 13.5s | 0.00 | 0.00 | 0.0% | 0.00 | 46.3% | 0.0pp | legendary | yes | 0.0% | 74.1% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | ENDLESS DRAFT | 46.3% | 13.5s | 0.00 | 0.00 | 0.0% | 0.00 | 46.3% | 0.0pp | legendary | yes | 0.0% | 74.1% | 0.0% | INFO_COMBO_ONLY |
| Mage base | EDGE SPRING | 55.6% | 14.3s | 3.00 | 3.00 | 100.0% | 3.00 | 49.5% | 6.0pp | common | yes | 0.0% | 88.4% | 0.0% | OK |
| Mage base | SMUDGE STEP | 84.3% | 15.3s | 1.00 | 1.00 | 100.0% | 1.00 | 49.5% | 34.7pp | common | yes | 0.0% | 70.8% | 0.0% | FLAG_OVERTUNED |
| Mage base | PAPER SHIELD | 53.2% | 14.2s | 3.00 | 3.00 | 100.0% | 3.00 | 49.5% | 3.7pp | common | yes | 0.0% | 83.8% | 0.0% | OK |
| Mage base | COMBO SPARK | 49.5% | 14.8s | 0.61 | 0.61 | 48.1% | 0.61 | 49.5% | 0.0pp | common | yes | 0.0% | 81.9% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | CENTER FOLD | 43.5% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 49.5% | -6.0pp | common | yes | 0.0% | 70.8% | 0.0% | OK |
| Mage base | DOUBLE DOODLE | 63.0% | 14.1s | 3.00 | 3.00 | 100.0% | 3.00 | 49.5% | 13.4pp | rare | yes | 0.0% | 100.0% | 0.0% | OK |
| Mage base | HEART INK | 72.2% | 14.8s | 1.00 | 1.00 | 100.0% | 1.00 | 49.5% | 22.7pp | rare | yes | 0.0% | 81.0% | 0.0% | FLAG_OVERTUNED |
| Mage base | COUNTER SKETCH | 66.7% | 13.6s | 2.83 | 2.83 | 100.0% | 2.83 | 49.5% | 17.1pp | rare | yes | 0.0% | 62.0% | 0.0% | OK |
| Mage base | WALLOP | 49.5% | 14.8s | 0.00 | 0.00 | 0.0% | 0.00 | 49.5% | 0.0pp | rare | yes | 0.0% | 91.7% | 0.0% | FLAG_DEAD_CARD |
| Mage base | ECHO MARK | 66.7% | 14.0s | 3.45 | 3.45 | 100.0% | 3.45 | 49.5% | 17.1pp | rare | yes | 0.0% | 96.3% | 0.0% | OK |
| Mage base | LAST SCRIBBLE | 84.7% | 15.1s | 0.62 | 0.62 | 62.0% | 0.62 | 49.5% | 35.2pp | epic | yes | 0.0% | 95.8% | 0.0% | FLAG_OVERTUNED |
| Mage base | INK RAGE | 48.6% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 49.5% | -0.9pp | epic | yes | 0.0% | 68.5% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | PAPER TWIN | 55.6% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 49.5% | 6.0pp | epic | yes | 0.0% | 100.0% | 0.0% | OK |
| Mage base | MASTERPIECE | 49.5% | 14.8s | 0.00 | 0.00 | 0.0% | 0.00 | 49.5% | 0.0pp | legendary | yes | 0.0% | 91.7% | 0.0% | INFO_COMBO_ONLY |
| Mage base | ENDLESS DRAFT | 49.5% | 14.8s | 0.00 | 0.00 | 0.0% | 0.00 | 49.5% | 0.0pp | legendary | yes | 0.0% | 91.7% | 0.0% | INFO_COMBO_ONLY |

## Hard flags

- Brawler base vs COMBO SPARK: FLAG_HARMFUL (35.6%, 13.5s avg)
- Brawler base vs COUNTER SKETCH: FLAG_HARMFUL (33.3%, 13.4s avg)
- Brawler base vs LAST SCRIBBLE: FLAG_OVERTUNED (83.3%, 13.8s avg)
- Longshot base vs EDGE SPRING: FLAG_OVERTUNED (87.5%, 13.8s avg)
- Longshot base vs SMUDGE STEP: FLAG_OVERTUNED (85.2%, 13.6s avg)
- Longshot base vs PAPER SHIELD: FLAG_OVERTUNED (74.1%, 13.8s avg)
- Longshot base vs COMBO SPARK: FLAG_OVERTUNED (87.5%, 13.6s avg)
- Longshot base vs CENTER FOLD: FLAG_OVERTUNED (82.9%, 13.6s avg)
- Longshot base vs DOUBLE DOODLE: FLAG_OVERTUNED (93.5%, 13.5s avg)
- Longshot base vs HEART INK: FLAG_OVERTUNED (65.3%, 13.6s avg)
- Longshot base vs COUNTER SKETCH: FLAG_OVERTUNED (100.0%, 13.6s avg)
- Longshot base vs ECHO MARK: FLAG_OVERTUNED (75.9%, 13.5s avg)
- Longshot base vs LAST SCRIBBLE: FLAG_OVERTUNED (100.0%, 13.8s avg)
- Longshot base vs PAPER TWIN: FLAG_OVERTUNED (82.4%, 13.6s avg)
- Mage base vs SMUDGE STEP: FLAG_OVERTUNED (84.3%, 15.3s avg)
- Mage base vs HEART INK: FLAG_OVERTUNED (72.2%, 14.8s avg)
- Mage base vs WALLOP: FLAG_DEAD_CARD (49.5%, 14.8s avg)
- Mage base vs LAST SCRIBBLE: FLAG_OVERTUNED (84.7%, 15.1s avg)

## Watches

- Brawler base vs PAPER SHIELD: WATCH_LOW_IMPACT (50.0%, 13.6s avg)
- Brawler base vs CENTER FOLD: WATCH_LOW_IMPACT (49.5%, 13.6s avg)
- Brawler base vs WALLOP: WATCH_LOW_IMPACT (52.8%, 13.5s avg)
- Brawler base vs ECHO MARK: WATCH_LOW_IMPACT (52.8%, 13.5s avg)
- Brawler base vs PAPER TWIN: WATCH_LOW_IMPACT (53.7%, 13.5s avg)
- Longshot base vs WALLOP: WATCH_LOW_IMPACT (46.3%, 13.5s avg)
- Mage base vs COMBO SPARK: WATCH_LOW_IMPACT (49.5%, 14.8s avg)
- Mage base vs INK RAGE: WATCH_LOW_IMPACT (48.6%, 14.6s avg)
