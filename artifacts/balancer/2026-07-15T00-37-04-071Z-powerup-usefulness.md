# Power-Up Usefulness Monte Carlo

Generated: 2026-07-15T00:37:04.094Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Baseline | Swing | Rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base | EDGE SPRING | 66.3% | 13.7s | 0.38 | 0.38 | 37.5% | 0.38 | 54.5% | 11.8pp | common | 0.0% | 75.0% | 0.0% | OK |
| Brawler base | SMUDGE STEP | 68.1% | 14.0s | 0.62 | 0.62 | 61.8% | 0.62 | 54.5% | 13.5pp | common | 0.0% | 52.1% | 0.0% | OK |
| Brawler base | PAPER SHIELD | 71.2% | 13.9s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 16.7pp | common | 0.0% | 73.3% | 0.0% | OK |
| Brawler base | COMBO SPARK | 57.3% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 2.8pp | common | 0.0% | 67.0% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | CENTER FOLD | 56.3% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 1.7pp | common | 0.0% | 66.3% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | DOUBLE DOODLE | 73.6% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 19.1pp | rare | 0.0% | 75.0% | 0.0% | FLAG_OVERTUNED |
| Brawler base | BACKUP PLAN | 56.6% | 14.0s | 0.13 | 0.13 | 12.5% | 0.13 | 54.5% | 2.1pp | rare | 0.0% | 74.0% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | COUNTER SKETCH | 55.9% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 1.4pp | rare | 0.0% | 72.6% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | WALLOP | 56.9% | 14.0s | 0.70 | 0.70 | 70.1% | 0.70 | 54.5% | 2.4pp | rare | 0.0% | 65.6% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | ECHO MARK | 55.2% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | 0.7pp | rare | 0.0% | 64.9% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | LAST SCRIBBLE | 79.5% | 14.1s | 0.26 | 0.26 | 26.4% | 0.26 | 54.5% | 25.0pp | epic | 0.0% | 67.0% | 0.0% | FLAG_OVERTUNED |
| Brawler base | SECOND DRAFT | 62.5% | 13.8s | 0.13 | 0.13 | 12.5% | 0.13 | 54.5% | 8.0pp | epic | 0.0% | 74.7% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | PAPER TWIN | 54.2% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 54.5% | -0.3pp | epic | 0.0% | 65.3% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | MASTERPIECE | 58.0% | 14.0s | 0.00 | 0.00 | 0.0% | 0.00 | 54.5% | 3.5pp | legendary | 0.0% | 66.7% | 0.0% | INFO_COMBO_ONLY |
| Brawler base | ENDLESS DRAFT | 56.6% | 14.0s | 0.00 | 0.00 | 0.0% | 0.00 | 54.5% | 2.1pp | legendary | 0.0% | 66.0% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | EDGE SPRING | 12.5% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | -25.0pp | common | 0.0% | 50.0% | 0.0% | FLAG_HARMFUL |
| Longshot base | SMUDGE STEP | 37.5% | 15.4s | 0.50 | 0.50 | 50.0% | 0.50 | 37.5% | 0.0pp | common | 0.0% | 37.2% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | PAPER SHIELD | 37.5% | 14.7s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | common | 0.0% | 28.5% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | COMBO SPARK | 37.5% | 14.7s | 0.75 | 0.75 | 75.0% | 0.75 | 37.5% | 0.0pp | common | 0.0% | 40.6% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | CENTER FOLD | 37.5% | 14.7s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | common | 0.0% | 38.9% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | DOUBLE DOODLE | 37.5% | 15.0s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | rare | 0.0% | 38.5% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | BACKUP PLAN | 37.5% | 14.7s | 0.25 | 0.25 | 25.0% | 0.25 | 37.5% | 0.0pp | rare | 0.0% | 38.5% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | COUNTER SKETCH | 37.5% | 14.9s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | rare | 0.0% | 50.3% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | WALLOP | 37.5% | 14.7s | 0.00 | 0.00 | 0.0% | 0.00 | 37.5% | 0.0pp | rare | 0.0% | 38.9% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | ECHO MARK | 37.5% | 14.7s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | rare | 0.0% | 41.3% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | LAST SCRIBBLE | 50.0% | 14.7s | 0.13 | 0.13 | 12.5% | 0.13 | 37.5% | 12.5pp | epic | 0.0% | 38.9% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | SECOND DRAFT | 37.5% | 14.7s | 0.25 | 0.25 | 25.0% | 0.25 | 37.5% | 0.0pp | epic | 0.0% | 38.2% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | PAPER TWIN | 37.5% | 14.7s | 1.00 | 1.00 | 100.0% | 1.00 | 37.5% | 0.0pp | epic | 0.0% | 41.7% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | MASTERPIECE | 37.5% | 14.7s | 0.00 | 0.00 | 0.0% | 0.00 | 37.5% | 0.0pp | legendary | 0.0% | 36.1% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | ENDLESS DRAFT | 37.5% | 14.7s | 0.00 | 0.00 | 0.0% | 0.00 | 37.5% | 0.0pp | legendary | 0.0% | 40.6% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | EDGE SPRING | 60.8% | 17.4s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | -9.4pp | common | 0.0% | 64.9% | 0.0% | OK |
| Gunner base | SMUDGE STEP | 70.8% | 18.1s | 0.73 | 0.73 | 72.6% | 0.73 | 70.1% | 0.7pp | common | 0.0% | 50.3% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | PAPER SHIELD | 80.6% | 17.5s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | 10.4pp | common | 0.0% | 33.3% | 0.0% | OK |
| Gunner base | COMBO SPARK | 72.6% | 17.6s | 0.50 | 0.50 | 50.0% | 0.50 | 70.1% | 2.4pp | common | 0.0% | 38.5% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | CENTER FOLD | 70.1% | 17.6s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | 0.0pp | common | 0.0% | 39.9% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | DOUBLE DOODLE | 74.0% | 17.4s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | 3.8pp | rare | 0.0% | 56.6% | 0.0% | OK |
| Gunner base | BACKUP PLAN | 82.3% | 17.5s | 0.25 | 0.25 | 25.3% | 0.25 | 70.1% | 12.2pp | rare | 0.0% | 39.9% | 0.0% | OK |
| Gunner base | COUNTER SKETCH | 67.0% | 17.4s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | -3.1pp | rare | 0.0% | 42.7% | 0.0% | OK |
| Gunner base | WALLOP | 70.5% | 17.6s | 0.00 | 0.00 | 0.0% | 0.00 | 70.1% | 0.3pp | rare | 0.0% | 39.6% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | ECHO MARK | 66.3% | 17.5s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | -3.8pp | rare | 0.0% | 42.4% | 0.0% | OK |
| Gunner base | LAST SCRIBBLE | 69.1% | 17.5s | 0.00 | 0.00 | 0.0% | 0.00 | 70.1% | -1.0pp | epic | 0.0% | 42.0% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | SECOND DRAFT | 81.9% | 17.5s | 0.25 | 0.25 | 25.3% | 0.25 | 70.1% | 11.8pp | epic | 0.0% | 35.8% | 0.0% | OK |
| Gunner base | PAPER TWIN | 68.1% | 17.5s | 1.00 | 1.00 | 100.0% | 1.00 | 70.1% | -2.1pp | epic | 0.0% | 40.6% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | MASTERPIECE | 70.5% | 17.5s | 0.00 | 0.00 | 0.0% | 0.00 | 70.1% | 0.3pp | legendary | 0.0% | 42.0% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | ENDLESS DRAFT | 67.4% | 17.5s | 0.00 | 0.00 | 0.0% | 0.00 | 70.1% | -2.8pp | legendary | 0.0% | 39.2% | 0.0% | INFO_COMBO_ONLY |
| Mage base | EDGE SPRING | 29.9% | 15.7s | 0.96 | 0.96 | 95.8% | 0.96 | 34.4% | -4.5pp | common | 0.0% | 75.0% | 0.0% | OK |
| Mage base | SMUDGE STEP | 41.0% | 15.6s | 0.88 | 0.88 | 87.5% | 0.88 | 34.4% | 6.6pp | common | 0.0% | 64.9% | 0.0% | OK |
| Mage base | PAPER SHIELD | 45.5% | 15.8s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | 11.1pp | common | 0.0% | 62.2% | 0.0% | OK |
| Mage base | COMBO SPARK | 35.1% | 15.9s | 0.72 | 0.72 | 71.9% | 0.72 | 34.4% | 0.7pp | common | 0.0% | 61.1% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | CENTER FOLD | 37.2% | 15.9s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | 2.8pp | common | 0.0% | 63.2% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | DOUBLE DOODLE | 49.7% | 15.2s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | 15.3pp | rare | 0.0% | 75.0% | 0.0% | OK |
| Mage base | BACKUP PLAN | 36.8% | 15.9s | 0.50 | 0.50 | 50.0% | 0.50 | 34.4% | 2.4pp | rare | 0.0% | 75.0% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | COUNTER SKETCH | 18.1% | 15.8s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | -16.3pp | rare | 0.0% | 75.0% | 0.0% | FLAG_HARMFUL |
| Mage base | WALLOP | 35.8% | 15.9s | 0.00 | 0.00 | 0.0% | 0.00 | 34.4% | 1.4pp | rare | 0.0% | 64.6% | 0.0% | FLAG_DEAD_CARD |
| Mage base | ECHO MARK | 36.1% | 16.0s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | 1.7pp | rare | 0.0% | 65.3% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | LAST SCRIBBLE | 37.2% | 16.3s | 0.41 | 0.41 | 41.0% | 0.41 | 34.4% | 2.8pp | epic | 0.0% | 72.2% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | SECOND DRAFT | 36.1% | 16.0s | 0.50 | 0.50 | 50.0% | 0.50 | 34.4% | 1.7pp | epic | 0.0% | 75.0% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | PAPER TWIN | 34.0% | 15.9s | 1.00 | 1.00 | 100.0% | 1.00 | 34.4% | -0.3pp | epic | 0.0% | 62.5% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | MASTERPIECE | 34.0% | 16.0s | 0.00 | 0.00 | 0.0% | 0.00 | 34.4% | -0.3pp | legendary | 0.0% | 62.8% | 0.0% | INFO_COMBO_ONLY |
| Mage base | ENDLESS DRAFT | 37.8% | 15.9s | 0.00 | 0.00 | 0.0% | 0.00 | 34.4% | 3.5pp | legendary | 0.0% | 63.5% | 0.0% | INFO_COMBO_ONLY |

## Flags

- Brawler base vs COMBO SPARK: WATCH_LOW_IMPACT (57.3%, 14.0s avg)
- Brawler base vs CENTER FOLD: WATCH_LOW_IMPACT (56.3%, 14.0s avg)
- Brawler base vs DOUBLE DOODLE: FLAG_OVERTUNED (73.6%, 14.0s avg)
- Brawler base vs BACKUP PLAN: FLAG_DEAD_CARD (56.6%, 14.0s avg)
- Brawler base vs COUNTER SKETCH: WATCH_LOW_IMPACT (55.9%, 14.0s avg)
- Brawler base vs WALLOP: WATCH_LOW_IMPACT (56.9%, 14.0s avg)
- Brawler base vs ECHO MARK: WATCH_LOW_IMPACT (55.2%, 14.0s avg)
- Brawler base vs LAST SCRIBBLE: FLAG_OVERTUNED (79.5%, 14.1s avg)
- Brawler base vs SECOND DRAFT: FLAG_DEAD_CARD (62.5%, 13.8s avg)
- Brawler base vs PAPER TWIN: WATCH_LOW_IMPACT (54.2%, 14.0s avg)
- Longshot base vs EDGE SPRING: FLAG_HARMFUL (12.5%, 14.6s avg)
- Longshot base vs SMUDGE STEP: WATCH_LOW_IMPACT (37.5%, 15.4s avg)
- Longshot base vs PAPER SHIELD: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs COMBO SPARK: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs CENTER FOLD: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs DOUBLE DOODLE: WATCH_LOW_IMPACT (37.5%, 15.0s avg)
- Longshot base vs BACKUP PLAN: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs COUNTER SKETCH: WATCH_LOW_IMPACT (37.5%, 14.9s avg)
- Longshot base vs WALLOP: FLAG_DEAD_CARD (37.5%, 14.7s avg)
- Longshot base vs ECHO MARK: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs LAST SCRIBBLE: FLAG_DEAD_CARD (50.0%, 14.7s avg)
- Longshot base vs SECOND DRAFT: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Longshot base vs PAPER TWIN: WATCH_LOW_IMPACT (37.5%, 14.7s avg)
- Gunner base vs SMUDGE STEP: WATCH_LOW_IMPACT (70.8%, 18.1s avg)
- Gunner base vs COMBO SPARK: WATCH_LOW_IMPACT (72.6%, 17.6s avg)
- Gunner base vs CENTER FOLD: WATCH_LOW_IMPACT (70.1%, 17.6s avg)
- Gunner base vs WALLOP: FLAG_DEAD_CARD (70.5%, 17.6s avg)
- Gunner base vs LAST SCRIBBLE: FLAG_DEAD_CARD (69.1%, 17.5s avg)
- Gunner base vs PAPER TWIN: WATCH_LOW_IMPACT (68.1%, 17.5s avg)
- Mage base vs COMBO SPARK: WATCH_LOW_IMPACT (35.1%, 15.9s avg)
- Mage base vs CENTER FOLD: WATCH_LOW_IMPACT (37.2%, 15.9s avg)
- Mage base vs BACKUP PLAN: WATCH_LOW_IMPACT (36.8%, 15.9s avg)
- Mage base vs COUNTER SKETCH: FLAG_HARMFUL (18.1%, 15.8s avg)
- Mage base vs WALLOP: FLAG_DEAD_CARD (35.8%, 15.9s avg)
- Mage base vs ECHO MARK: WATCH_LOW_IMPACT (36.1%, 16.0s avg)
- Mage base vs LAST SCRIBBLE: WATCH_LOW_IMPACT (37.2%, 16.3s avg)
- Mage base vs SECOND DRAFT: WATCH_LOW_IMPACT (36.1%, 16.0s avg)
- Mage base vs PAPER TWIN: WATCH_LOW_IMPACT (34.0%, 15.9s avg)
