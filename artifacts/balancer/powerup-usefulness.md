# Power-Up Rarity Monte Carlo

Generated: 2026-07-17T04:18:19.016Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Target rarity | Opponent rarity | Comparison | Scope | Peers | Expected | 95% interval | Upgrades | Timeouts | Stalled | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| UNCOMMON tier aggregate | COMMON same-role tier | 54.7% | 18.2s | 1.88 | 0.94 | 93.5% | 0.94 | uncommon | common | Tier aggregate | Same-role mirror | 8 | 54.0%–62.0% | 53.7%–55.6% | 1 vs 1 | 30.3% | 0.0% | 93.8% | 0.0% | OK |
| RARE tier aggregate | UNCOMMON same-role tier | 44.0% | 15.4s | 2.22 | 1.22 | 100.0% | 1.22 | rare | uncommon | Tier aggregate | Same-role mirror | 5 | 54.0%–62.0% | 42.4%–45.6% | 1 vs 1 | 30.3% | 0.0% | 93.5% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| EPIC tier aggregate | RARE same-role tier | 34.8% | 16.0s | 2.10 | 0.90 | 90.3% | 0.90 | epic | rare | Tier aggregate | Same-role mirror | 3 | 54.0%–62.0% | 32.7%–36.9% | 1 vs 1 | 36.1% | 0.0% | 93.0% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LEGENDARY tier aggregate | EPIC same-role tier | 45.4% | 16.8s | 8.44 | 4.56 | 99.2% | 0.99 | legendary | epic | Tier aggregate | Same-role mirror | 3 | 54.0%–62.0% | 42.6%–48.4% | 4 vs 4 | 39.7% | 0.0% | 81.4% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · UNCOMMON tier aggregate | COMMON same-role tier | 59.3% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 56.8%–61.6% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| BRAWLER · RARE tier aggregate | UNCOMMON same-role tier | 32.5% | 10.3s | 2.50 | 1.50 | 100.0% | 1.50 | rare | uncommon | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 30.2%–34.8% | 1 vs 1 | 0.0% | 0.0% | 91.1% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · EPIC tier aggregate | RARE same-role tier | 37.1% | 10.3s | 2.50 | 1.00 | 100.0% | 1.00 | epic | rare | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 33.8%–40.5% | 1 vs 1 | 0.0% | 0.0% | 86.1% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · LEGENDARY tier aggregate | EPIC same-role tier | 15.9% | 10.2s | 10.05 | 5.40 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 12.3%–20.3% | 4 vs 4 | 0.0% | 0.0% | 64.1% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LONGSHOT · UNCOMMON tier aggregate | COMMON same-role tier | 51.4% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Tier aggregate | Same-role mirror | 4 | 52.0%–68.0% | 49.0%–53.9% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LONGSHOT · RARE tier aggregate | UNCOMMON same-role tier | 61.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 56.4%–65.9% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| LONGSHOT · EPIC tier aggregate | RARE same-role tier | 0.0% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 0.0%–1.0% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LONGSHOT · LEGENDARY tier aggregate | EPIC same-role tier | 52.5% | 20.0s | 8.00 | 4.00 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 44.8%–60.1% | 4 vs 4 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| MAGE · UNCOMMON tier aggregate | COMMON same-role tier | 54.4% | 19.4s | 1.74 | 0.91 | 90.9% | 0.91 | uncommon | common | Tier aggregate | Same-role mirror | 5 | 52.0%–68.0% | 53.3%–55.5% | 1 vs 1 | 22.4% | 0.0% | 91.3% | 0.0% | OK |
| MAGE · RARE tier aggregate | UNCOMMON same-role tier | 51.2% | 19.2s | 1.99 | 1.00 | 100.0% | 1.00 | rare | uncommon | Tier aggregate | Same-role mirror | 4 | 52.0%–68.0% | 48.7%–53.6% | 1 vs 1 | 43.3% | 0.0% | 94.3% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| MAGE · EPIC tier aggregate | RARE same-role tier | 49.8% | 19.6s | 1.76 | 0.76 | 75.9% | 0.76 | epic | rare | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 46.3%–53.2% | 1 vs 1 | 40.3% | 0.0% | 96.5% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| MAGE · LEGENDARY tier aggregate | EPIC same-role tier | 58.4% | 19.4s | 7.74 | 4.28 | 98.6% | 0.99 | legendary | epic | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 54.6%–62.2% | 4 vs 4 | 44.5% | 0.0% | 85.5% | 0.0% | OK |
| Brawler base · SMUDGE STEP | Same-role common peers | 91.8% | 10.8s | 3.00 | 2.00 | 100.0% | 2.00 | common | common | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 88.6%–94.1% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · PAPER SHIELD | Same-role common peers | 12.3% | 10.8s | 3.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 9.4%–15.8% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · DOUBLE DOODLE | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · DOUBLE DOODLE | Same-role adjacent common field | 61.5% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 58.1%–64.8% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role adjacent common field | 57.0% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 53.5%–60.4% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · WALLOP | Same-role rare peers | 24.8% | 10.0s | 3.00 | 2.00 | 100.0% | 2.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 20.8%–29.2% | 1 vs 1 | 0.0% | 0.0% | 60.5% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · WALLOP | Same-role adjacent uncommon field | 15.0% | 10.2s | 3.00 | 2.00 | 100.0% | 2.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 12.7%–17.6% | 1 vs 1 | 0.0% | 0.0% | 82.1% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Brawler base · ECHO MARK | Same-role rare peers | 72.3% | 10.0s | 3.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 67.7%–76.4% | 1 vs 1 | 0.0% | 0.0% | 64.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · ECHO MARK | Same-role adjacent uncommon field | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 46.5%–53.5% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · INK RAGE | Same-role epic peers | 49.5% | 10.6s | 2.00 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 44.6%–54.4% | 1 vs 1 | 0.0% | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Brawler base · INK RAGE | Same-role adjacent rare field | 37.1% | 10.3s | 2.50 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 33.8%–40.5% | 1 vs 1 | 0.0% | 0.0% | 86.1% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · SMUDGE STEP | Same-role common peers | 61.3% | 20.0s | 2.33 | 1.33 | 100.0% | 1.33 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 58.5%–64.0% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Longshot base · COMBO SPARK | Same-role common peers | 52.1% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 49.3%–54.9% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · PAPER TWIN | Same-role epic peers | 46.8% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 41.9%–51.6% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · PAPER TWIN | Same-role adjacent rare field | 0.0% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 0.0%–1.0% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · BANK SHOT | Same-role common peers | 13.8% | 20.0s | 2.33 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 11.9%–15.8% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Longshot base · RETURNING STROKE | Same-role rare peers | 50.5% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 45.6%–55.4% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · RETURNING STROKE | Same-role adjacent uncommon field | 61.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 56.4%–65.9% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · ORBITING NIB | Same-role uncommon peers | 49.5% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 44.6%–54.4% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · ORBITING NIB | Same-role adjacent common field | 51.4% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 4 | 0.0%–100.0% | 49.0%–53.9% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · WIDER HALO | Same-role common peers | 75.4% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 72.9%–77.8% | 1 vs 1 | 100.0% | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · EDGE SPRING | Same-role common peers | 79.0% | 19.6s | 1.85 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 76.9%–80.9% | 1 vs 1 | 52.4% | 0.0% | 90.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · PAPER SHIELD | Same-role common peers | 28.4% | 19.9s | 1.75 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 26.3%–30.7% | 1 vs 1 | 72.3% | 0.0% | 99.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · COMBO SPARK | Same-role common peers | 10.1% | 19.5s | 1.20 | 0.20 | 19.9% | 0.20 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 8.7%–11.6% | 1 vs 1 | 32.5% | 0.0% | 89.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · CENTER FOLD | Same-role common peers | 58.8% | 19.8s | 1.75 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 56.3%–61.1% | 1 vs 1 | 61.7% | 0.0% | 98.7% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · DOUBLE DOODLE | Same-role uncommon peers | 39.8% | 19.1s | 1.98 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 37.1%–42.6% | 1 vs 1 | 34.3% | 0.0% | 95.1% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · DOUBLE DOODLE | Same-role adjacent common field | 51.1% | 19.4s | 1.86 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 48.9%–53.3% | 1 vs 1 | 21.8% | 0.0% | 86.9% | 0.0% | OK |
| Mage base · HEART INK | Same-role uncommon peers | 19.7% | 19.2s | 1.96 | 0.96 | 96.3% | 0.96 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 17.5%–22.0% | 1 vs 1 | 22.7% | 0.0% | 92.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · HEART INK | Same-role adjacent common field | 30.9% | 19.6s | 1.44 | 0.64 | 63.6% | 0.64 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 28.9%–32.9% | 1 vs 1 | 37.0% | 0.0% | 92.8% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · COUNTER SKETCH | Same-role uncommon peers | 39.8% | 19.2s | 1.98 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 37.0%–42.5% | 1 vs 1 | 34.8% | 0.0% | 94.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · COUNTER SKETCH | Same-role adjacent common field | 55.6% | 19.4s | 1.86 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 53.5%–57.8% | 1 vs 1 | 21.4% | 0.0% | 88.3% | 0.0% | OK |
| Mage base · ECHO MARK | Same-role rare peers | 52.5% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 47.6%–57.3% | 1 vs 1 | 68.3% | 0.0% | 96.3% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Mage base · ECHO MARK | Same-role adjacent uncommon field | 51.2% | 19.2s | 1.99 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 4 | 0.0%–100.0% | 48.7%–53.6% | 1 vs 1 | 43.3% | 0.0% | 94.3% | 0.0% | OK |
| Mage base · LAST SCRIBBLE | Same-role epic peers | 49.5% | 19.9s | 1.21 | 0.21 | 21.3% | 0.21 | epic | epic | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 44.6%–54.4% | 1 vs 1 | 74.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base · LAST SCRIBBLE | Same-role adjacent rare field | 48.5% | 19.7s | 1.52 | 0.52 | 51.7% | 0.52 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 43.6%–53.4% | 1 vs 1 | 40.3% | 0.0% | 99.8% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · INK RAGE | Same-role epic peers | 51.0% | 19.9s | 1.21 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 46.1%–55.9% | 1 vs 1 | 76.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base · INK RAGE | Same-role adjacent rare field | 51.0% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 46.1%–55.9% | 1 vs 1 | 40.3% | 0.0% | 93.3% | 0.0% | OK |
| Mage base · PAINT SPLASH | Same-role uncommon peers | 100.0% | 18.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 99.7%–100.0% | 1 vs 1 | 0.0% | 0.0% | 99.7% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · PAINT SPLASH | Same-role adjacent common field | 80.0% | 19.0s | 1.80 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 78.2%–81.7% | 1 vs 1 | 9.5% | 0.0% | 97.2% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · WET PAINT | Same-role common peers | 71.8% | 19.3s | 1.84 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 69.6%–74.0% | 1 vs 1 | 31.8% | 0.0% | 94.1% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · MASTERPIECE | Same-role legendary peers | 20.0% | 10.3s | 10.48 | 4.98 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 14.5%–26.9% | 4 vs 4 | 0.0% | 0.0% | 96.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · MASTERPIECE | Same-role adjacent epic field | 0.0% | 10.7s | 9.50 | 5.00 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 0.0%–2.3% | 4 vs 4 | 0.0% | 0.0% | 96.3% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Brawler base · ENDLESS DRAFT | Same-role legendary peers | 86.9% | 10.3s | 10.49 | 5.50 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 80.8%–91.3% | 4 vs 4 | 0.0% | 0.0% | 96.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · ENDLESS DRAFT | Same-role adjacent epic field | 31.9% | 9.6s | 10.61 | 5.80 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 25.2%–39.4% | 4 vs 4 | 0.0% | 0.0% | 31.9% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · MASTERPIECE | Same-role legendary peers | 50.6% | 20.0s | 8.00 | 4.00 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 43.0%–58.3% | 4 vs 4 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · MASTERPIECE | Same-role adjacent epic field | 52.5% | 20.0s | 8.00 | 4.00 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 44.8%–60.1% | 4 vs 4 | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base · MASTERPIECE | Same-role legendary peers | 64.4% | 19.3s | 8.53 | 3.77 | 97.5% | 0.97 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 56.7%–71.4% | 4 vs 4 | 46.3% | 0.0% | 84.4% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · MASTERPIECE | Same-role adjacent epic field | 67.2% | 19.2s | 7.28 | 3.79 | 97.2% | 0.97 | legendary | epic | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 61.9%–72.1% | 4 vs 4 | 37.2% | 0.0% | 80.9% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · ENDLESS DRAFT | Same-role legendary peers | 25.0% | 19.3s | 8.51 | 4.78 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 18.9%–32.2% | 4 vs 4 | 43.1% | 0.0% | 86.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · ENDLESS DRAFT | Same-role adjacent epic field | 49.7% | 19.5s | 8.20 | 4.77 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 44.2%–55.1% | 4 vs 4 | 51.9% | 0.0% | 90.0% | 0.0% | WATCH_RARITY_ADVANTAGE |

## Hard flags

No balance flags from current thresholds.

## Watches

- RARE tier aggregate vs UNCOMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (44.0%, 15.4s avg)
- EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (34.8%, 16.0s avg)
- LEGENDARY tier aggregate vs EPIC same-role tier: WATCH_TIER_ADVANTAGE_MISSING (45.4%, 16.8s avg)
- BRAWLER · RARE tier aggregate vs UNCOMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (32.5%, 10.3s avg)
- BRAWLER · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (37.1%, 10.3s avg)
- BRAWLER · LEGENDARY tier aggregate vs EPIC same-role tier: WATCH_TIER_ADVANTAGE_MISSING (15.9%, 10.2s avg)
- LONGSHOT · UNCOMMON tier aggregate vs COMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (51.4%, 20.0s avg)
- LONGSHOT · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (0.0%, 20.0s avg)
- MAGE · RARE tier aggregate vs UNCOMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (51.2%, 19.2s avg)
- MAGE · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (49.8%, 19.6s avg)
- Brawler base · SMUDGE STEP vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (91.8%, 10.8s avg)
- Brawler base · PAPER SHIELD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (12.3%, 10.8s avg)
- Brawler base · WALLOP vs Same-role rare peers: WATCH_EQUAL_RARITY_SPREAD (24.8%, 10.0s avg)
- Brawler base · WALLOP vs Same-role adjacent uncommon field: WATCH_RARITY_ADVANTAGE (15.0%, 10.2s avg)
- Brawler base · ECHO MARK vs Same-role rare peers: WATCH_EQUAL_RARITY_SPREAD (72.3%, 10.0s avg)
- Brawler base · INK RAGE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (37.1%, 10.3s avg)
- Longshot base · SMUDGE STEP vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (61.3%, 20.0s avg)
- Longshot base · PAPER TWIN vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (0.0%, 20.0s avg)
- Longshot base · BANK SHOT vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (13.8%, 20.0s avg)
- Longshot base · WIDER HALO vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (75.4%, 20.0s avg)
- Mage base · EDGE SPRING vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (79.0%, 19.6s avg)
- Mage base · PAPER SHIELD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (28.4%, 19.9s avg)
- Mage base · COMBO SPARK vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (10.1%, 19.5s avg)
- Mage base · CENTER FOLD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (58.8%, 19.8s avg)
- Mage base · DOUBLE DOODLE vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (39.8%, 19.1s avg)
- Mage base · HEART INK vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (19.7%, 19.2s avg)
- Mage base · HEART INK vs Same-role adjacent common field: WATCH_RARITY_ADVANTAGE (30.9%, 19.6s avg)
- Mage base · COUNTER SKETCH vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (39.8%, 19.2s avg)
- Mage base · LAST SCRIBBLE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (48.5%, 19.7s avg)
- Mage base · PAINT SPLASH vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (100.0%, 18.6s avg)
- Mage base · PAINT SPLASH vs Same-role adjacent common field: WATCH_RARITY_ADVANTAGE (80.0%, 19.0s avg)
- Mage base · WET PAINT vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (71.8%, 19.3s avg)
- Brawler base · MASTERPIECE vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (20.0%, 10.3s avg)
- Brawler base · MASTERPIECE vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (0.0%, 10.7s avg)
- Brawler base · ENDLESS DRAFT vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (86.9%, 10.3s avg)
- Brawler base · ENDLESS DRAFT vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (31.9%, 9.6s avg)
- Mage base · MASTERPIECE vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (64.4%, 19.3s avg)
- Mage base · MASTERPIECE vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (67.2%, 19.2s avg)
- Mage base · ENDLESS DRAFT vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (25.0%, 19.3s avg)
- Mage base · ENDLESS DRAFT vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (49.7%, 19.5s avg)
