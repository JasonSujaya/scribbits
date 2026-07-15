# Power-Up Usefulness Monte Carlo

Generated: 2026-07-15T00:38:13.809Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Baseline | Swing | Rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base | EDGE SPRING | 62.5% | 13.8s | 0.50 | 0.50 | 50.0% | 0.50 | 52.4% | 10.1pp | common | 0.0% | 87.5% | 0.0% | OK |
| Brawler base | SMUDGE STEP | 52.4% | 14.2s | 0.74 | 0.74 | 74.3% | 0.74 | 52.4% | 0.0pp | common | 0.0% | 43.1% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | PAPER SHIELD | 66.3% | 13.9s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | 13.9pp | common | 0.0% | 85.8% | 0.0% | OK |
| Brawler base | COMBO SPARK | 54.5% | 14.0s | 0.75 | 0.75 | 75.0% | 0.75 | 52.4% | 2.1pp | common | 0.0% | 79.5% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | CENTER FOLD | 53.8% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | 1.4pp | common | 0.0% | 78.8% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | DOUBLE DOODLE | 61.8% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | 9.4pp | rare | 0.0% | 87.5% | 0.0% | OK |
| Brawler base | BACKUP PLAN | 53.5% | 14.0s | 0.13 | 0.13 | 12.5% | 0.13 | 52.4% | 1.0pp | rare | 0.0% | 86.5% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | COUNTER SKETCH | 51.0% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | -1.4pp | rare | 0.0% | 85.1% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | WALLOP | 53.1% | 14.1s | 0.70 | 0.70 | 70.1% | 0.70 | 52.4% | 0.7pp | rare | 0.0% | 78.1% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | ECHO MARK | 52.4% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | 0.0pp | rare | 0.0% | 77.4% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | LAST SCRIBBLE | 67.0% | 14.3s | 0.26 | 0.26 | 26.0% | 0.26 | 52.4% | 14.6pp | epic | 0.0% | 79.5% | 0.0% | OK |
| Brawler base | SECOND DRAFT | 61.1% | 13.9s | 0.13 | 0.13 | 12.5% | 0.13 | 52.4% | 8.7pp | epic | 0.0% | 87.2% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | PAPER TWIN | 52.8% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 52.4% | 0.3pp | epic | 0.0% | 77.8% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | MASTERPIECE | 54.2% | 14.0s | 0.00 | 0.00 | 0.0% | 0.00 | 52.4% | 1.7pp | legendary | 0.0% | 79.2% | 0.0% | INFO_COMBO_ONLY |
| Brawler base | ENDLESS DRAFT | 53.5% | 14.0s | 0.00 | 0.00 | 0.0% | 0.00 | 52.4% | 1.0pp | legendary | 0.0% | 78.5% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | EDGE SPRING | 74.0% | 14.5s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | 10.1pp | common | 0.0% | 67.4% | 0.0% | OK |
| Longshot base | SMUDGE STEP | 73.3% | 14.6s | 0.22 | 0.22 | 21.9% | 0.22 | 63.9% | 9.4pp | common | 0.0% | 66.0% | 0.0% | OK |
| Longshot base | PAPER SHIELD | 59.0% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | -4.9pp | common | 0.0% | 62.5% | 0.0% | OK |
| Longshot base | COMBO SPARK | 62.5% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | -1.4pp | common | 0.0% | 64.2% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | CENTER FOLD | 63.9% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | 0.0pp | common | 0.0% | 67.0% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | DOUBLE DOODLE | 26.7% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | -37.2pp | rare | 0.0% | 52.1% | 0.0% | FLAG_HARMFUL |
| Longshot base | BACKUP PLAN | 63.9% | 14.6s | 0.00 | 0.00 | 0.0% | 0.00 | 63.9% | 0.0pp | rare | 0.0% | 67.4% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | COUNTER SKETCH | 67.0% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | 3.1pp | rare | 0.0% | 84.0% | 0.0% | OK |
| Longshot base | WALLOP | 64.9% | 14.6s | 0.14 | 0.14 | 13.9% | 0.14 | 63.9% | 1.0pp | rare | 0.0% | 64.6% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | ECHO MARK | 63.2% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | -0.7pp | rare | 0.0% | 67.7% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | LAST SCRIBBLE | 86.8% | 14.6s | 0.35 | 0.35 | 35.1% | 0.35 | 63.9% | 22.9pp | epic | 0.0% | 67.7% | 0.0% | FLAG_OVERTUNED |
| Longshot base | SECOND DRAFT | 63.9% | 14.6s | 0.00 | 0.00 | 0.0% | 0.00 | 63.9% | 0.0pp | epic | 0.0% | 71.2% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | PAPER TWIN | 63.2% | 14.6s | 1.00 | 1.00 | 100.0% | 1.00 | 63.9% | -0.7pp | epic | 0.0% | 66.0% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | MASTERPIECE | 62.5% | 14.6s | 0.00 | 0.00 | 0.0% | 0.00 | 63.9% | -1.4pp | legendary | 0.0% | 68.1% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | ENDLESS DRAFT | 62.5% | 14.6s | 0.00 | 0.00 | 0.0% | 0.00 | 63.9% | -1.4pp | legendary | 0.0% | 66.0% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | EDGE SPRING | 42.4% | 17.2s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | -4.9pp | common | 0.0% | 50.7% | 0.0% | OK |
| Gunner base | SMUDGE STEP | 38.2% | 17.7s | 0.61 | 0.61 | 61.1% | 0.61 | 47.2% | -9.0pp | common | 0.0% | 68.4% | 0.0% | OK |
| Gunner base | PAPER SHIELD | 66.3% | 17.6s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | 19.1pp | common | 0.0% | 57.6% | 0.0% | FLAG_OVERTUNED |
| Gunner base | COMBO SPARK | 45.5% | 17.5s | 0.60 | 0.60 | 60.4% | 0.60 | 47.2% | -1.7pp | common | 0.0% | 64.2% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | CENTER FOLD | 48.6% | 17.7s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | 1.4pp | common | 0.0% | 67.7% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | DOUBLE DOODLE | 63.9% | 17.6s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | 16.7pp | rare | 0.0% | 76.7% | 0.0% | OK |
| Gunner base | BACKUP PLAN | 57.6% | 17.5s | 0.31 | 0.31 | 31.3% | 0.31 | 47.2% | 10.4pp | rare | 0.0% | 64.9% | 0.0% | OK |
| Gunner base | COUNTER SKETCH | 55.9% | 17.8s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | 8.7pp | rare | 0.0% | 72.9% | 0.0% | OK |
| Gunner base | WALLOP | 47.6% | 17.6s | 0.00 | 0.00 | 0.0% | 0.00 | 47.2% | 0.3pp | rare | 0.0% | 63.9% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | ECHO MARK | 39.6% | 17.4s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | -7.6pp | rare | 0.0% | 67.7% | 0.0% | OK |
| Gunner base | LAST SCRIBBLE | 47.2% | 17.7s | 0.11 | 0.11 | 11.1% | 0.11 | 47.2% | 0.0pp | epic | 0.0% | 68.4% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | SECOND DRAFT | 56.9% | 17.5s | 0.33 | 0.33 | 32.6% | 0.33 | 47.2% | 9.7pp | epic | 0.0% | 58.3% | 0.0% | OK |
| Gunner base | PAPER TWIN | 43.8% | 17.5s | 1.00 | 1.00 | 100.0% | 1.00 | 47.2% | -3.5pp | epic | 0.0% | 66.3% | 0.0% | OK |
| Gunner base | MASTERPIECE | 41.7% | 17.4s | 0.00 | 0.00 | 0.0% | 0.00 | 47.2% | -5.6pp | legendary | 0.0% | 67.4% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | ENDLESS DRAFT | 44.4% | 17.5s | 0.00 | 0.00 | 0.0% | 0.00 | 47.2% | -2.8pp | legendary | 0.0% | 61.8% | 0.0% | INFO_COMBO_ONLY |
| Mage base | EDGE SPRING | 43.1% | 15.2s | 0.88 | 0.88 | 88.2% | 0.88 | 34.7% | 8.3pp | common | 0.0% | 68.1% | 0.0% | OK |
| Mage base | SMUDGE STEP | 28.8% | 15.9s | 0.88 | 0.88 | 87.5% | 0.88 | 34.7% | -5.9pp | common | 0.0% | 65.3% | 0.0% | OK |
| Mage base | PAPER SHIELD | 46.2% | 15.7s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | 11.5pp | common | 0.0% | 80.6% | 0.0% | OK |
| Mage base | COMBO SPARK | 37.8% | 15.6s | 0.29 | 0.29 | 29.2% | 0.29 | 34.7% | 3.1pp | common | 0.0% | 60.4% | 0.0% | OK |
| Mage base | CENTER FOLD | 37.8% | 15.6s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | 3.1pp | common | 0.0% | 60.4% | 0.0% | OK |
| Mage base | DOUBLE DOODLE | 39.2% | 14.8s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | 4.5pp | rare | 0.0% | 66.7% | 0.0% | OK |
| Mage base | BACKUP PLAN | 38.9% | 16.0s | 0.25 | 0.25 | 25.0% | 0.25 | 34.7% | 4.2pp | rare | 0.0% | 83.7% | 0.0% | OK |
| Mage base | COUNTER SKETCH | 25.3% | 15.5s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | -9.4pp | rare | 0.0% | 59.0% | 0.0% | OK |
| Mage base | WALLOP | 37.5% | 15.6s | 0.00 | 0.00 | 0.0% | 0.00 | 34.7% | 2.8pp | rare | 0.0% | 60.8% | 0.0% | FLAG_DEAD_CARD |
| Mage base | ECHO MARK | 35.4% | 15.7s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | 0.7pp | rare | 0.0% | 63.9% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | LAST SCRIBBLE | 53.1% | 15.7s | 0.24 | 0.24 | 24.3% | 0.24 | 34.7% | 18.4pp | epic | 0.0% | 70.5% | 0.0% | FLAG_OVERTUNED |
| Mage base | SECOND DRAFT | 38.2% | 16.1s | 0.25 | 0.25 | 25.0% | 0.25 | 34.7% | 3.5pp | epic | 0.0% | 85.4% | 0.0% | OK |
| Mage base | PAPER TWIN | 37.2% | 15.7s | 1.00 | 1.00 | 100.0% | 1.00 | 34.7% | 2.4pp | epic | 0.0% | 65.6% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | MASTERPIECE | 40.3% | 15.6s | 0.00 | 0.00 | 0.0% | 0.00 | 34.7% | 5.6pp | legendary | 0.0% | 67.4% | 0.0% | INFO_COMBO_ONLY |
| Mage base | ENDLESS DRAFT | 36.8% | 15.7s | 0.00 | 0.00 | 0.0% | 0.00 | 34.7% | 2.1pp | legendary | 0.0% | 64.2% | 0.0% | INFO_COMBO_ONLY |

## Flags

- Brawler base vs SMUDGE STEP: WATCH_LOW_IMPACT (52.4%, 14.2s avg)
- Brawler base vs COMBO SPARK: WATCH_LOW_IMPACT (54.5%, 14.0s avg)
- Brawler base vs CENTER FOLD: WATCH_LOW_IMPACT (53.8%, 14.0s avg)
- Brawler base vs BACKUP PLAN: FLAG_DEAD_CARD (53.5%, 14.0s avg)
- Brawler base vs COUNTER SKETCH: WATCH_LOW_IMPACT (51.0%, 14.1s avg)
- Brawler base vs WALLOP: WATCH_LOW_IMPACT (53.1%, 14.1s avg)
- Brawler base vs ECHO MARK: WATCH_LOW_IMPACT (52.4%, 14.0s avg)
- Brawler base vs SECOND DRAFT: FLAG_DEAD_CARD (61.1%, 13.9s avg)
- Brawler base vs PAPER TWIN: WATCH_LOW_IMPACT (52.8%, 14.1s avg)
- Longshot base vs COMBO SPARK: WATCH_LOW_IMPACT (62.5%, 14.6s avg)
- Longshot base vs CENTER FOLD: WATCH_LOW_IMPACT (63.9%, 14.6s avg)
- Longshot base vs DOUBLE DOODLE: FLAG_HARMFUL (26.7%, 14.2s avg)
- Longshot base vs BACKUP PLAN: FLAG_DEAD_CARD (63.9%, 14.6s avg)
- Longshot base vs WALLOP: FLAG_DEAD_CARD (64.9%, 14.6s avg)
- Longshot base vs ECHO MARK: WATCH_LOW_IMPACT (63.2%, 14.6s avg)
- Longshot base vs LAST SCRIBBLE: FLAG_OVERTUNED (86.8%, 14.6s avg)
- Longshot base vs SECOND DRAFT: FLAG_DEAD_CARD (63.9%, 14.6s avg)
- Longshot base vs PAPER TWIN: WATCH_LOW_IMPACT (63.2%, 14.6s avg)
- Gunner base vs PAPER SHIELD: FLAG_OVERTUNED (66.3%, 17.6s avg)
- Gunner base vs COMBO SPARK: WATCH_LOW_IMPACT (45.5%, 17.5s avg)
- Gunner base vs CENTER FOLD: WATCH_LOW_IMPACT (48.6%, 17.7s avg)
- Gunner base vs WALLOP: FLAG_DEAD_CARD (47.6%, 17.6s avg)
- Gunner base vs LAST SCRIBBLE: FLAG_DEAD_CARD (47.2%, 17.7s avg)
- Mage base vs WALLOP: FLAG_DEAD_CARD (37.5%, 15.6s avg)
- Mage base vs ECHO MARK: WATCH_LOW_IMPACT (35.4%, 15.7s avg)
- Mage base vs LAST SCRIBBLE: FLAG_OVERTUNED (53.1%, 15.7s avg)
- Mage base vs PAPER TWIN: WATCH_LOW_IMPACT (37.2%, 15.7s avg)
