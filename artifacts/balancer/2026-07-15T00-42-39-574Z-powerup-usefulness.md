# Power-Up Usefulness Monte Carlo

Generated: 2026-07-15T00:42:39.593Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Baseline | Swing | Rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base | EDGE SPRING | 52.1% | 13.8s | 0.50 | 0.50 | 50.0% | 0.50 | 41.7% | 10.4pp | common | 0.0% | 87.5% | 0.0% | OK |
| Brawler base | SMUDGE STEP | 42.4% | 14.4s | 0.64 | 0.64 | 64.2% | 0.64 | 41.7% | 0.7pp | common | 0.0% | 32.6% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | PAPER SHIELD | 52.8% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 11.1pp | common | 0.0% | 74.7% | 0.0% | OK |
| Brawler base | COMBO SPARK | 45.5% | 14.1s | 0.75 | 0.75 | 75.0% | 0.75 | 41.7% | 3.8pp | common | 0.0% | 69.8% | 0.0% | OK |
| Brawler base | CENTER FOLD | 45.8% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 4.2pp | common | 0.0% | 70.8% | 0.0% | OK |
| Brawler base | DOUBLE DOODLE | 53.8% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 12.2pp | rare | 0.0% | 78.1% | 0.0% | OK |
| Brawler base | BACKUP PLAN | 44.4% | 14.1s | 0.13 | 0.13 | 12.5% | 0.13 | 41.7% | 2.8pp | rare | 0.0% | 74.7% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | COUNTER SKETCH | 52.4% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 10.8pp | rare | 0.0% | 77.4% | 0.0% | OK |
| Brawler base | WALLOP | 44.1% | 14.2s | 0.64 | 0.64 | 64.2% | 0.64 | 41.7% | 2.4pp | rare | 0.0% | 69.1% | 0.0% | WATCH_LOW_IMPACT |
| Brawler base | ECHO MARK | 52.8% | 14.0s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 11.1pp | rare | 0.0% | 77.8% | 0.0% | OK |
| Brawler base | LAST SCRIBBLE | 57.3% | 14.2s | 0.15 | 0.15 | 15.3% | 0.15 | 41.7% | 15.6pp | epic | 0.0% | 70.5% | 0.0% | OK |
| Brawler base | SECOND DRAFT | 46.9% | 14.1s | 0.13 | 0.13 | 12.5% | 0.13 | 41.7% | 5.2pp | epic | 0.0% | 78.1% | 0.0% | FLAG_DEAD_CARD |
| Brawler base | PAPER TWIN | 50.7% | 14.1s | 1.00 | 1.00 | 100.0% | 1.00 | 41.7% | 9.0pp | epic | 0.0% | 75.7% | 0.0% | OK |
| Brawler base | MASTERPIECE | 44.8% | 14.2s | 0.00 | 0.00 | 0.0% | 0.00 | 41.7% | 3.1pp | legendary | 0.0% | 69.1% | 0.0% | INFO_COMBO_ONLY |
| Brawler base | ENDLESS DRAFT | 44.1% | 14.2s | 0.00 | 0.00 | 0.0% | 0.00 | 41.7% | 2.4pp | legendary | 0.0% | 69.1% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | EDGE SPRING | 49.7% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 10.1pp | common | 0.0% | 60.1% | 0.0% | OK |
| Longshot base | SMUDGE STEP | 49.3% | 14.3s | 0.22 | 0.22 | 21.9% | 0.22 | 39.6% | 9.7pp | common | 0.0% | 58.7% | 0.0% | OK |
| Longshot base | PAPER SHIELD | 38.5% | 14.3s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | -1.0pp | common | 0.0% | 56.6% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | COMBO SPARK | 50.0% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 10.4pp | common | 0.0% | 38.9% | 0.0% | OK |
| Longshot base | CENTER FOLD | 39.2% | 14.3s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | -0.3pp | common | 0.0% | 57.6% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | DOUBLE DOODLE | 48.3% | 14.3s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 8.7pp | rare | 0.0% | 40.3% | 0.0% | OK |
| Longshot base | BACKUP PLAN | 38.9% | 14.3s | 0.00 | 0.00 | 0.0% | 0.00 | 39.6% | -0.7pp | rare | 0.0% | 58.3% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | COUNTER SKETCH | 50.0% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 10.4pp | rare | 0.0% | 38.5% | 0.0% | OK |
| Longshot base | WALLOP | 40.3% | 14.3s | 0.25 | 0.25 | 24.7% | 0.25 | 39.6% | 0.7pp | rare | 0.0% | 57.6% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | ECHO MARK | 50.7% | 14.2s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 11.1pp | rare | 0.0% | 37.5% | 0.0% | OK |
| Longshot base | LAST SCRIBBLE | 51.4% | 14.3s | 0.13 | 0.13 | 13.2% | 0.13 | 39.6% | 11.8pp | epic | 0.0% | 59.0% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | SECOND DRAFT | 38.9% | 14.3s | 0.00 | 0.00 | 0.0% | 0.00 | 39.6% | -0.7pp | epic | 0.0% | 60.4% | 0.0% | FLAG_DEAD_CARD |
| Longshot base | PAPER TWIN | 40.6% | 14.3s | 1.00 | 1.00 | 100.0% | 1.00 | 39.6% | 1.0pp | epic | 0.0% | 57.3% | 0.0% | WATCH_LOW_IMPACT |
| Longshot base | MASTERPIECE | 38.9% | 14.3s | 0.00 | 0.00 | 0.0% | 0.00 | 39.6% | -0.7pp | legendary | 0.0% | 58.3% | 0.0% | INFO_COMBO_ONLY |
| Longshot base | ENDLESS DRAFT | 38.2% | 14.3s | 0.00 | 0.00 | 0.0% | 0.00 | 39.6% | -1.4pp | legendary | 0.0% | 59.7% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | EDGE SPRING | 49.3% | 17.4s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | -6.9pp | common | 0.0% | 50.7% | 0.0% | OK |
| Gunner base | SMUDGE STEP | 48.6% | 17.9s | 0.61 | 0.61 | 61.1% | 0.61 | 56.3% | -7.6pp | common | 0.0% | 58.0% | 0.0% | OK |
| Gunner base | PAPER SHIELD | 69.8% | 17.6s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 13.5pp | common | 0.0% | 51.4% | 0.0% | OK |
| Gunner base | COMBO SPARK | 57.3% | 17.6s | 0.60 | 0.60 | 60.4% | 0.60 | 56.3% | 1.0pp | common | 0.0% | 51.4% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | CENTER FOLD | 57.3% | 17.8s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 1.0pp | common | 0.0% | 59.0% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | DOUBLE DOODLE | 81.3% | 17.8s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 25.0pp | rare | 0.0% | 53.1% | 0.0% | FLAG_OVERTUNED |
| Gunner base | BACKUP PLAN | 68.1% | 17.5s | 0.42 | 0.42 | 41.7% | 0.42 | 56.3% | 11.8pp | rare | 0.0% | 54.5% | 0.0% | OK |
| Gunner base | COUNTER SKETCH | 67.4% | 17.7s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 11.1pp | rare | 0.0% | 52.1% | 0.0% | OK |
| Gunner base | WALLOP | 57.6% | 17.7s | 0.00 | 0.00 | 0.0% | 0.00 | 56.3% | 1.4pp | rare | 0.0% | 53.8% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | ECHO MARK | 77.8% | 17.7s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 21.5pp | rare | 0.0% | 54.2% | 0.0% | FLAG_OVERTUNED |
| Gunner base | LAST SCRIBBLE | 54.9% | 17.7s | 0.00 | 0.00 | 0.0% | 0.00 | 56.3% | -1.4pp | epic | 0.0% | 59.4% | 0.0% | FLAG_DEAD_CARD |
| Gunner base | SECOND DRAFT | 66.0% | 17.5s | 0.42 | 0.42 | 41.7% | 0.42 | 56.3% | 9.7pp | epic | 0.0% | 49.3% | 0.0% | OK |
| Gunner base | PAPER TWIN | 57.3% | 17.3s | 1.00 | 1.00 | 100.0% | 1.00 | 56.3% | 1.0pp | epic | 0.0% | 57.3% | 0.0% | WATCH_LOW_IMPACT |
| Gunner base | MASTERPIECE | 51.4% | 17.6s | 0.00 | 0.00 | 0.0% | 0.00 | 56.3% | -4.9pp | legendary | 0.0% | 57.3% | 0.0% | INFO_COMBO_ONLY |
| Gunner base | ENDLESS DRAFT | 53.5% | 17.6s | 0.00 | 0.00 | 0.0% | 0.00 | 56.3% | -2.8pp | legendary | 0.0% | 52.8% | 0.0% | INFO_COMBO_ONLY |
| Mage base | EDGE SPRING | 66.3% | 15.1s | 0.88 | 0.88 | 88.2% | 0.88 | 59.7% | 6.6pp | common | 0.0% | 52.8% | 0.0% | OK |
| Mage base | SMUDGE STEP | 53.8% | 15.9s | 0.88 | 0.88 | 87.5% | 0.88 | 59.7% | -5.9pp | common | 0.0% | 58.7% | 0.0% | OK |
| Mage base | PAPER SHIELD | 66.0% | 15.4s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 6.3pp | common | 0.0% | 54.9% | 0.0% | OK |
| Mage base | COMBO SPARK | 62.5% | 15.3s | 0.30 | 0.30 | 29.5% | 0.30 | 59.7% | 2.8pp | common | 0.0% | 54.2% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | CENTER FOLD | 62.5% | 15.3s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 2.8pp | common | 0.0% | 53.5% | 0.0% | WATCH_LOW_IMPACT |
| Mage base | DOUBLE DOODLE | 72.9% | 15.2s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 13.2pp | rare | 0.0% | 74.7% | 0.0% | OK |
| Mage base | BACKUP PLAN | 63.2% | 15.7s | 0.25 | 0.25 | 25.0% | 0.25 | 59.7% | 3.5pp | rare | 0.0% | 75.0% | 0.0% | OK |
| Mage base | COUNTER SKETCH | 66.7% | 15.5s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 6.9pp | rare | 0.0% | 69.1% | 0.0% | OK |
| Mage base | WALLOP | 61.8% | 15.3s | 0.00 | 0.00 | 0.0% | 0.00 | 59.7% | 2.1pp | rare | 0.0% | 52.4% | 0.0% | FLAG_DEAD_CARD |
| Mage base | ECHO MARK | 70.1% | 14.9s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 10.4pp | rare | 0.0% | 53.8% | 0.0% | OK |
| Mage base | LAST SCRIBBLE | 61.8% | 15.3s | 0.00 | 0.00 | 0.0% | 0.00 | 59.7% | 2.1pp | epic | 0.0% | 53.1% | 0.0% | FLAG_DEAD_CARD |
| Mage base | SECOND DRAFT | 62.8% | 15.8s | 0.25 | 0.25 | 25.0% | 0.25 | 59.7% | 3.1pp | epic | 0.0% | 75.0% | 0.0% | OK |
| Mage base | PAPER TWIN | 63.2% | 15.4s | 1.00 | 1.00 | 100.0% | 1.00 | 59.7% | 3.5pp | epic | 0.0% | 55.6% | 0.0% | OK |
| Mage base | MASTERPIECE | 64.2% | 15.3s | 0.00 | 0.00 | 0.0% | 0.00 | 59.7% | 4.5pp | legendary | 0.0% | 55.2% | 0.0% | INFO_COMBO_ONLY |
| Mage base | ENDLESS DRAFT | 61.8% | 15.4s | 0.00 | 0.00 | 0.0% | 0.00 | 59.7% | 2.1pp | legendary | 0.0% | 54.5% | 0.0% | INFO_COMBO_ONLY |

## Flags

- Brawler base vs SMUDGE STEP: WATCH_LOW_IMPACT (42.4%, 14.4s avg)
- Brawler base vs BACKUP PLAN: FLAG_DEAD_CARD (44.4%, 14.1s avg)
- Brawler base vs WALLOP: WATCH_LOW_IMPACT (44.1%, 14.2s avg)
- Brawler base vs SECOND DRAFT: FLAG_DEAD_CARD (46.9%, 14.1s avg)
- Longshot base vs PAPER SHIELD: WATCH_LOW_IMPACT (38.5%, 14.3s avg)
- Longshot base vs CENTER FOLD: WATCH_LOW_IMPACT (39.2%, 14.3s avg)
- Longshot base vs BACKUP PLAN: FLAG_DEAD_CARD (38.9%, 14.3s avg)
- Longshot base vs WALLOP: WATCH_LOW_IMPACT (40.3%, 14.3s avg)
- Longshot base vs LAST SCRIBBLE: FLAG_DEAD_CARD (51.4%, 14.3s avg)
- Longshot base vs SECOND DRAFT: FLAG_DEAD_CARD (38.9%, 14.3s avg)
- Longshot base vs PAPER TWIN: WATCH_LOW_IMPACT (40.6%, 14.3s avg)
- Gunner base vs COMBO SPARK: WATCH_LOW_IMPACT (57.3%, 17.6s avg)
- Gunner base vs CENTER FOLD: WATCH_LOW_IMPACT (57.3%, 17.8s avg)
- Gunner base vs DOUBLE DOODLE: FLAG_OVERTUNED (81.3%, 17.8s avg)
- Gunner base vs WALLOP: FLAG_DEAD_CARD (57.6%, 17.7s avg)
- Gunner base vs ECHO MARK: FLAG_OVERTUNED (77.8%, 17.7s avg)
- Gunner base vs LAST SCRIBBLE: FLAG_DEAD_CARD (54.9%, 17.7s avg)
- Gunner base vs PAPER TWIN: WATCH_LOW_IMPACT (57.3%, 17.3s avg)
- Mage base vs COMBO SPARK: WATCH_LOW_IMPACT (62.5%, 15.3s avg)
- Mage base vs CENTER FOLD: WATCH_LOW_IMPACT (62.5%, 15.3s avg)
- Mage base vs WALLOP: FLAG_DEAD_CARD (61.8%, 15.3s avg)
- Mage base vs LAST SCRIBBLE: FLAG_DEAD_CARD (61.8%, 15.3s avg)
