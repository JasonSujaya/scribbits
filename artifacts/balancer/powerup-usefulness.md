# Power-Up Rarity Monte Carlo

Generated: 2026-07-17T01:13:46.473Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Target rarity | Opponent rarity | Comparison | Scope | Peers | Expected | 95% interval | Upgrades | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| UNCOMMON tier aggregate | COMMON same-role tier | 53.9% | 18.2s | 1.88 | 0.94 | 93.6% | 0.94 | uncommon | common | Tier aggregate | Same-role mirror | 8 | 54.0%–62.0% | 53.0%–54.8% | 1 vs 1 | 30.4% | 94.1% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| RARE tier aggregate | UNCOMMON same-role tier | 45.1% | 15.4s | 2.22 | 1.22 | 100.0% | 1.22 | rare | uncommon | Tier aggregate | Same-role mirror | 5 | 54.0%–62.0% | 43.5%–46.8% | 1 vs 1 | 31.9% | 92.6% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| EPIC tier aggregate | RARE same-role tier | 50.6% | 15.8s | 2.12 | 0.92 | 92.5% | 0.92 | epic | rare | Tier aggregate | Same-role mirror | 3 | 54.0%–62.0% | 48.4%–52.8% | 1 vs 1 | 35.3% | 84.6% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LEGENDARY tier aggregate | EPIC same-role tier | 52.5% | 16.8s | 8.29 | 4.51 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 3 | 54.0%–62.0% | 49.6%–55.4% | 4 vs 4 | 47.1% | 87.0% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · UNCOMMON tier aggregate | COMMON same-role tier | 58.9% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 56.4%–61.3% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| BRAWLER · RARE tier aggregate | UNCOMMON same-role tier | 32.4% | 10.3s | 2.50 | 1.50 | 100.0% | 1.50 | rare | uncommon | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 30.2%–34.8% | 1 vs 1 | 0.0% | 90.9% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · EPIC tier aggregate | RARE same-role tier | 43.8% | 10.1s | 2.50 | 1.00 | 100.0% | 1.00 | epic | rare | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 40.4%–47.2% | 1 vs 1 | 0.0% | 71.3% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| BRAWLER · LEGENDARY tier aggregate | EPIC same-role tier | 25.9% | 10.1s | 9.79 | 5.27 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 21.4%–31.0% | 4 vs 4 | 0.0% | 78.1% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LONGSHOT · UNCOMMON tier aggregate | COMMON same-role tier | 43.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Tier aggregate | Same-role mirror | 4 | 52.0%–68.0% | 40.9%–45.8% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| LONGSHOT · RARE tier aggregate | UNCOMMON same-role tier | 60.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 55.4%–64.9% | 1 vs 1 | 100.0% | 100.0% | 0.0% | OK |
| LONGSHOT · EPIC tier aggregate | RARE same-role tier | 98.8% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 97.1%–99.5% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_TIER_ADVANTAGE_EXCESSIVE |
| LONGSHOT · LEGENDARY tier aggregate | EPIC same-role tier | 67.5% | 20.0s | 7.53 | 3.76 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 59.9%–74.3% | 4 vs 4 | 100.0% | 100.0% | 0.0% | OK |
| MAGE · UNCOMMON tier aggregate | COMMON same-role tier | 55.0% | 19.4s | 1.74 | 0.91 | 91.0% | 0.91 | uncommon | common | Tier aggregate | Same-role mirror | 5 | 52.0%–68.0% | 53.9%–56.1% | 1 vs 1 | 22.5% | 91.8% | 0.0% | OK |
| MAGE · RARE tier aggregate | UNCOMMON same-role tier | 54.1% | 19.3s | 1.99 | 1.00 | 100.0% | 1.00 | rare | uncommon | Tier aggregate | Same-role mirror | 4 | 52.0%–68.0% | 51.6%–56.5% | 1 vs 1 | 46.9% | 92.4% | 0.0% | OK |
| MAGE · EPIC tier aggregate | RARE same-role tier | 33.4% | 19.4s | 1.81 | 0.81 | 81.1% | 0.81 | epic | rare | Tier aggregate | Same-role mirror | 1 | 52.0%–68.0% | 30.2%–36.7% | 1 vs 1 | 38.3% | 90.3% | 0.0% | WATCH_TIER_ADVANTAGE_MISSING |
| MAGE · LEGENDARY tier aggregate | EPIC same-role tier | 62.0% | 19.4s | 7.74 | 4.32 | 100.0% | 1.00 | legendary | epic | Tier aggregate | Same-role mirror | 2 | 52.0%–68.0% | 58.2%–65.7% | 4 vs 4 | 57.3% | 88.1% | 0.0% | OK |
| Brawler base · SMUDGE STEP | Same-role common peers | 91.3% | 10.7s | 3.00 | 2.00 | 100.0% | 2.00 | common | common | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 88.1%–93.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · PAPER SHIELD | Same-role common peers | 10.3% | 10.8s | 3.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 7.6%–13.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · DOUBLE DOODLE | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · DOUBLE DOODLE | Same-role adjacent common field | 61.8% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 58.3%–65.1% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role adjacent common field | 56.0% | 10.7s | 2.47 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 52.5%–59.4% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · WALLOP | Same-role rare peers | 17.0% | 9.8s | 3.00 | 2.00 | 100.0% | 2.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 13.6%–21.0% | 1 vs 1 | 0.0% | 45.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · WALLOP | Same-role adjacent uncommon field | 14.9% | 10.2s | 3.00 | 2.00 | 100.0% | 2.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 12.6%–17.5% | 1 vs 1 | 0.0% | 81.8% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Brawler base · ECHO MARK | Same-role rare peers | 83.0% | 9.8s | 3.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 79.0%–86.4% | 1 vs 1 | 0.0% | 48.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · ECHO MARK | Same-role adjacent uncommon field | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 46.5%–53.5% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · INK RAGE | Same-role epic peers | 48.3% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 43.4%–53.1% | 1 vs 1 | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Brawler base · INK RAGE | Same-role adjacent rare field | 43.8% | 10.1s | 2.50 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 40.4%–47.2% | 1 vs 1 | 0.0% | 71.3% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · SMUDGE STEP | Same-role common peers | 52.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 49.4%–55.1% | 1 vs 1 | 100.0% | 100.0% | 0.0% | OK |
| Longshot base · COMBO SPARK | Same-role common peers | 71.1% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 68.5%–73.6% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Longshot base · PAPER TWIN | Same-role epic peers | 52.0% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 47.1%–56.9% | 1 vs 1 | 100.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · PAPER TWIN | Same-role adjacent rare field | 98.8% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 97.1%–99.5% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · BANK SHOT | Same-role common peers | 0.0% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 0.0%–0.3% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Longshot base · RETURNING STROKE | Same-role rare peers | 52.8% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 47.9%–57.6% | 1 vs 1 | 100.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · RETURNING STROKE | Same-role adjacent uncommon field | 60.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 55.4%–64.9% | 1 vs 1 | 100.0% | 100.0% | 0.0% | OK |
| Longshot base · ORBITING NIB | Same-role uncommon peers | 53.0% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 48.1%–57.8% | 1 vs 1 | 100.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · ORBITING NIB | Same-role adjacent common field | 43.3% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 4 | 0.0%–100.0% | 40.9%–45.8% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · WIDER HALO | Same-role common peers | 75.8% | 20.0s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 73.2%–78.1% | 1 vs 1 | 100.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · EDGE SPRING | Same-role common peers | 78.7% | 19.6s | 1.85 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 76.6%–80.6% | 1 vs 1 | 52.9% | 91.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · PAPER SHIELD | Same-role common peers | 28.7% | 19.9s | 1.75 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 26.6%–31.0% | 1 vs 1 | 72.2% | 99.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · COMBO SPARK | Same-role common peers | 11.1% | 19.5s | 1.21 | 0.21 | 20.9% | 0.21 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 9.7%–12.8% | 1 vs 1 | 33.1% | 90.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · CENTER FOLD | Same-role common peers | 60.0% | 19.8s | 1.75 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 57.6%–62.4% | 1 vs 1 | 65.1% | 98.6% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · DOUBLE DOODLE | Same-role uncommon peers | 41.1% | 19.1s | 1.98 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 38.3%–43.9% | 1 vs 1 | 33.6% | 95.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · DOUBLE DOODLE | Same-role adjacent common field | 51.1% | 19.4s | 1.86 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 49.0%–53.3% | 1 vs 1 | 22.4% | 87.6% | 0.0% | OK |
| Mage base · HEART INK | Same-role uncommon peers | 20.6% | 19.2s | 1.96 | 0.96 | 95.7% | 0.96 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 18.4%–23.0% | 1 vs 1 | 23.3% | 93.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · HEART INK | Same-role adjacent common field | 31.4% | 19.6s | 1.44 | 0.64 | 64.0% | 0.64 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 29.4%–33.5% | 1 vs 1 | 37.1% | 93.2% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · COUNTER SKETCH | Same-role uncommon peers | 40.1% | 19.2s | 1.98 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 37.3%–42.9% | 1 vs 1 | 34.8% | 96.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · COUNTER SKETCH | Same-role adjacent common field | 57.6% | 19.4s | 1.86 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 55.4%–59.7% | 1 vs 1 | 20.9% | 89.3% | 0.0% | OK |
| Mage base · ECHO MARK | Same-role rare peers | 51.0% | 19.9s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 0.0%–100.0% | 46.1%–55.9% | 1 vs 1 | 91.0% | 98.3% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Mage base · ECHO MARK | Same-role adjacent uncommon field | 54.1% | 19.3s | 1.99 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 4 | 0.0%–100.0% | 51.6%–56.5% | 1 vs 1 | 46.9% | 92.4% | 0.0% | OK |
| Mage base · LAST SCRIBBLE | Same-role epic peers | 75.8% | 19.8s | 1.59 | 0.59 | 58.8% | 0.59 | epic | epic | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 71.3%–79.7% | 1 vs 1 | 38.5% | 99.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · LAST SCRIBBLE | Same-role adjacent rare field | 31.5% | 19.6s | 1.62 | 0.62 | 62.3% | 0.62 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 27.1%–36.2% | 1 vs 1 | 37.5% | 100.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · INK RAGE | Same-role epic peers | 25.8% | 19.8s | 1.58 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 21.7%–30.3% | 1 vs 1 | 40.5% | 99.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · INK RAGE | Same-role adjacent rare field | 35.3% | 19.3s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 30.7%–40.1% | 1 vs 1 | 39.0% | 80.5% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · PAINT SPLASH | Same-role uncommon peers | 100.0% | 18.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 3 | 0.0%–100.0% | 99.7%–100.0% | 1 vs 1 | 0.0% | 99.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · PAINT SPLASH | Same-role adjacent common field | 80.0% | 19.0s | 1.80 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 5 | 0.0%–100.0% | 78.2%–81.7% | 1 vs 1 | 9.7% | 97.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · WET PAINT | Same-role common peers | 74.4% | 19.3s | 1.83 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 4 | 0.0%–100.0% | 72.2%–76.5% | 1 vs 1 | 30.3% | 94.2% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · MASTERPIECE | Same-role legendary peers | 29.4% | 10.2s | 10.53 | 4.97 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 22.9%–36.8% | 4 vs 4 | 0.0% | 96.9% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · MASTERPIECE | Same-role adjacent epic field | 10.0% | 10.7s | 9.54 | 5.00 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 6.2%–15.6% | 4 vs 4 | 0.0% | 96.3% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Brawler base · ENDLESS DRAFT | Same-role legendary peers | 66.3% | 10.3s | 10.52 | 5.53 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 58.6%–73.1% | 4 vs 4 | 0.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · ENDLESS DRAFT | Same-role adjacent epic field | 41.9% | 9.6s | 10.04 | 5.53 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 34.5%–49.6% | 4 vs 4 | 0.0% | 60.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · MASTERPIECE | Same-role legendary peers | 64.4% | 20.0s | 7.53 | 3.76 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 56.7%–71.4% | 4 vs 4 | 100.0% | 100.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Longshot base · MASTERPIECE | Same-role adjacent epic field | 67.5% | 20.0s | 7.53 | 3.76 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 0.0%–100.0% | 59.9%–74.3% | 4 vs 4 | 100.0% | 100.0% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · MASTERPIECE | Same-role legendary peers | 67.5% | 19.3s | 8.61 | 3.83 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 59.9%–74.3% | 4 vs 4 | 60.6% | 88.8% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · MASTERPIECE | Same-role adjacent epic field | 65.6% | 19.4s | 7.21 | 3.82 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 60.3%–70.6% | 4 vs 4 | 57.5% | 87.8% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · ENDLESS DRAFT | Same-role legendary peers | 26.9% | 19.3s | 8.62 | 4.79 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 0.0%–100.0% | 20.6%–34.2% | 4 vs 4 | 54.4% | 86.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · ENDLESS DRAFT | Same-role adjacent epic field | 58.4% | 19.3s | 8.26 | 4.82 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 2 | 0.0%–100.0% | 53.0%–63.7% | 4 vs 4 | 57.2% | 88.4% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

- UNCOMMON tier aggregate vs COMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (53.9%, 18.2s avg)
- RARE tier aggregate vs UNCOMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (45.1%, 15.4s avg)
- EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (50.6%, 15.8s avg)
- LEGENDARY tier aggregate vs EPIC same-role tier: WATCH_TIER_ADVANTAGE_MISSING (52.5%, 16.8s avg)
- BRAWLER · RARE tier aggregate vs UNCOMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (32.4%, 10.3s avg)
- BRAWLER · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (43.8%, 10.1s avg)
- BRAWLER · LEGENDARY tier aggregate vs EPIC same-role tier: WATCH_TIER_ADVANTAGE_MISSING (25.9%, 10.1s avg)
- LONGSHOT · UNCOMMON tier aggregate vs COMMON same-role tier: WATCH_TIER_ADVANTAGE_MISSING (43.3%, 20.0s avg)
- LONGSHOT · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_EXCESSIVE (98.8%, 20.0s avg)
- MAGE · EPIC tier aggregate vs RARE same-role tier: WATCH_TIER_ADVANTAGE_MISSING (33.4%, 19.4s avg)
- Brawler base · SMUDGE STEP vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (91.3%, 10.7s avg)
- Brawler base · PAPER SHIELD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (10.3%, 10.8s avg)
- Brawler base · WALLOP vs Same-role rare peers: WATCH_EQUAL_RARITY_SPREAD (17.0%, 9.8s avg)
- Brawler base · WALLOP vs Same-role adjacent uncommon field: WATCH_RARITY_ADVANTAGE (14.9%, 10.2s avg)
- Brawler base · ECHO MARK vs Same-role rare peers: WATCH_EQUAL_RARITY_SPREAD (83.0%, 9.8s avg)
- Brawler base · INK RAGE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (43.8%, 10.1s avg)
- Longshot base · COMBO SPARK vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (71.1%, 20.0s avg)
- Longshot base · PAPER TWIN vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (98.8%, 20.0s avg)
- Longshot base · BANK SHOT vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (0.0%, 20.0s avg)
- Longshot base · ORBITING NIB vs Same-role adjacent common field: WATCH_RARITY_ADVANTAGE (43.3%, 20.0s avg)
- Longshot base · WIDER HALO vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (75.8%, 20.0s avg)
- Mage base · EDGE SPRING vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (78.7%, 19.6s avg)
- Mage base · PAPER SHIELD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (28.7%, 19.9s avg)
- Mage base · COMBO SPARK vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (11.1%, 19.5s avg)
- Mage base · CENTER FOLD vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (60.0%, 19.8s avg)
- Mage base · DOUBLE DOODLE vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (41.1%, 19.1s avg)
- Mage base · HEART INK vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (20.6%, 19.2s avg)
- Mage base · HEART INK vs Same-role adjacent common field: WATCH_RARITY_ADVANTAGE (31.4%, 19.6s avg)
- Mage base · COUNTER SKETCH vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (40.1%, 19.2s avg)
- Mage base · LAST SCRIBBLE vs Same-role epic peers: WATCH_EQUAL_RARITY_SPREAD (75.8%, 19.8s avg)
- Mage base · LAST SCRIBBLE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (31.5%, 19.6s avg)
- Mage base · INK RAGE vs Same-role epic peers: WATCH_EQUAL_RARITY_SPREAD (25.8%, 19.8s avg)
- Mage base · INK RAGE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (35.3%, 19.3s avg)
- Mage base · PAINT SPLASH vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (100.0%, 18.6s avg)
- Mage base · PAINT SPLASH vs Same-role adjacent common field: WATCH_RARITY_ADVANTAGE (80.0%, 19.0s avg)
- Mage base · WET PAINT vs Same-role common peers: WATCH_EQUAL_RARITY_SPREAD (74.4%, 19.3s avg)
- Brawler base · MASTERPIECE vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (29.4%, 10.2s avg)
- Brawler base · MASTERPIECE vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (10.0%, 10.7s avg)
- Brawler base · ENDLESS DRAFT vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (66.3%, 10.3s avg)
- Brawler base · ENDLESS DRAFT vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (41.9%, 9.6s avg)
- Longshot base · MASTERPIECE vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (64.4%, 20.0s avg)
- Longshot base · MASTERPIECE vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (67.5%, 20.0s avg)
- Mage base · MASTERPIECE vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (67.5%, 19.3s avg)
- Mage base · MASTERPIECE vs Same-role adjacent epic field: WATCH_RARITY_ADVANTAGE (65.6%, 19.4s avg)
- Mage base · ENDLESS DRAFT vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (26.9%, 19.3s avg)
