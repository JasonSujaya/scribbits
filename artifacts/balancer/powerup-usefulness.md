# Power-Up Rarity Monte Carlo

Generated: 2026-07-16T10:15:06.533Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Trigger rate | Card triggers | Target rarity | Opponent rarity | Comparison | Scope | Peers | Expected | 95% interval | Upgrades | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| UNCOMMON tier aggregate | COMMON same-role tier | 42.3% | 18.1s | 2.06 | 1.04 | 100.0% | 1.04 | uncommon | common | Tier aggregate | Same-role mirror | 5 | 52.0%–62.0% | 41.4%–43.3% | 1 vs 1 | 0.0% | 97.8% | 0.0% | FLAG_TIER_ADVANTAGE_MISSING |
| RARE tier aggregate | UNCOMMON same-role tier | 47.1% | 15.9s | 1.80 | 0.80 | 80.0% | 0.80 | rare | uncommon | Tier aggregate | Same-role mirror | 3 | 52.0%–62.0% | 45.6%–48.7% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_TIER_ADVANTAGE_MISSING |
| EPIC tier aggregate | RARE same-role tier | 66.8% | 16.4s | 1.74 | 0.91 | 90.6% | 0.91 | epic | rare | Tier aggregate | Same-role mirror | 2 | 52.0%–62.0% | 64.9%–68.7% | 1 vs 1 | 0.0% | 96.0% | 0.0% | FLAG_TIER_ADVANTAGE_EXCESSIVE |
| LEGENDARY tier aggregate | EPIC same-role tier | 64.6% | 17.1s | 8.70 | 4.89 | 90.5% | 0.91 | legendary | epic | Tier aggregate | Same-role mirror | 3 | 52.0%–62.0% | 62.2%–66.9% | 4 vs 4 | 0.0% | 77.8% | 0.0% | FLAG_TIER_ADVANTAGE_EXCESSIVE |
| Brawler base · SMUDGE STEP | Same-role common peers | 90.0% | 10.8s | 3.00 | 2.00 | 100.0% | 2.00 | common | common | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 86.7%–92.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Brawler base · PAPER SHIELD | Same-role common peers | 9.0% | 10.8s | 3.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 6.6%–12.2% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Brawler base · DOUBLE DOODLE | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · DOUBLE DOODLE | Same-role adjacent common field | 56.3% | 10.7s | 2.41 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 48.0%–66.0% | 52.8%–59.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role uncommon peers | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 45.1%–54.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · COUNTER SKETCH | Same-role adjacent common field | 39.8% | 10.6s | 2.40 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 2 | 48.0%–66.0% | 36.4%–43.2% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Brawler base · WALLOP | Same-role rare peers | 51.0% | 10.4s | 1.00 | 0.00 | 0.0% | 0.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 46.1%–55.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_DEAD_CARD |
| Brawler base · WALLOP | Same-role adjacent uncommon field | 43.6% | 10.4s | 1.00 | 0.00 | 0.0% | 0.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 48.0%–66.0% | 40.2%–47.1% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_DEAD_CARD+FLAG_RARITY_ADVANTAGE_MISSING |
| Brawler base · ECHO MARK | Same-role rare peers | 48.0% | 10.4s | 1.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 43.1%–52.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · ECHO MARK | Same-role adjacent uncommon field | 50.0% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 2 | 48.0%–66.0% | 46.5%–53.5% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · INK RAGE | Same-role epic peers | 45.5% | 10.5s | 2.00 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 0 | 42.0%–58.0% | 40.7%–50.4% | 1 vs 1 | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Brawler base · INK RAGE | Same-role adjacent rare field | 66.0% | 10.4s | 1.50 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 2 | 48.0%–66.0% | 62.6%–69.2% | 1 vs 1 | 0.0% | 88.6% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Longshot base · SMUDGE STEP | Same-role common peers | 63.9% | 19.9s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 60.5%–67.1% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Longshot base · PAPER SHIELD | Same-role common peers | 4.8% | 19.8s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 3.5%–6.5% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Longshot base · COMBO SPARK | Same-role common peers | 81.5% | 19.8s | 2.00 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 78.7%–84.0% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Longshot base · DOUBLE DOODLE | Same-role uncommon peers | 30.3% | 19.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 27.2%–33.5% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Longshot base · DOUBLE DOODLE | Same-role adjacent common field | 30.6% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 3 | 48.0%–66.0% | 28.0%–33.2% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Longshot base · HEART INK | Same-role uncommon peers | 50.1% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 46.7%–53.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · HEART INK | Same-role adjacent common field | 50.7% | 19.9s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 3 | 48.0%–66.0% | 47.9%–53.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · COUNTER SKETCH | Same-role uncommon peers | 67.8% | 19.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 64.4%–70.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Longshot base · COUNTER SKETCH | Same-role adjacent common field | 68.4% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 3 | 48.0%–66.0% | 65.7%–71.0% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_EXCESSIVE |
| Longshot base · ECHO MARK | Same-role rare peers | 49.5% | 19.4s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 42.0%–58.0% | 44.6%–54.4% | 1 vs 1 | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · ECHO MARK | Same-role adjacent uncommon field | 52.6% | 19.5s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 3 | 48.0%–66.0% | 49.8%–55.4% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · LAST SCRIBBLE | Same-role epic peers | 51.0% | 20.0s | 1.60 | 0.83 | 83.3% | 0.83 | epic | epic | Equal rarity | Same-role mirror | 0 | 42.0%–58.0% | 46.1%–55.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Longshot base · LAST SCRIBBLE | Same-role adjacent rare field | 97.8% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 48.0%–66.0% | 95.8%–98.8% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_EXCESSIVE |
| Mage base · EDGE SPRING | Same-role common peers | 92.3% | 20.0s | 1.67 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 42.0%–58.0% | 90.6%–93.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Mage base · PAPER SHIELD | Same-role common peers | 53.3% | 19.4s | 1.79 | 1.00 | 100.0% | 1.00 | common | common | Equal rarity | Same-role mirror | 3 | 42.0%–58.0% | 50.5%–56.1% | 1 vs 1 | 0.0% | 99.3% | 0.0% | OK |
| Mage base · COMBO SPARK | Same-role common peers | 21.1% | 19.5s | 1.72 | 0.72 | 72.3% | 0.72 | common | common | Equal rarity | Same-role mirror | 3 | 42.0%–58.0% | 18.9%–23.5% | 1 vs 1 | 0.0% | 99.2% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Mage base · CENTER FOLD | Same-role common peers | 38.7% | 19.5s | 1.58 | 0.67 | 66.7% | 0.67 | common | common | Equal rarity | Same-role mirror | 3 | 42.0%–58.0% | 36.0%–41.5% | 1 vs 1 | 0.0% | 99.8% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Mage base · DOUBLE DOODLE | Same-role uncommon peers | 53.8% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 50.3%–57.2% | 1 vs 1 | 0.0% | 99.6% | 0.0% | OK |
| Mage base · DOUBLE DOODLE | Same-role adjacent common field | 26.4% | 19.4s | 1.90 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 4 | 48.0%–66.0% | 24.3%–28.6% | 1 vs 1 | 0.0% | 93.6% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · HEART INK | Same-role uncommon peers | 43.6% | 19.5s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 40.2%–47.1% | 1 vs 1 | 0.0% | 99.3% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Mage base · HEART INK | Same-role adjacent common field | 46.6% | 19.5s | 2.19 | 1.25 | 100.0% | 1.25 | uncommon | common | Rarity advantage | Same-role mirror | 4 | 48.0%–66.0% | 44.1%–49.0% | 1 vs 1 | 0.0% | 99.8% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · COUNTER SKETCH | Same-role uncommon peers | 53.4% | 19.6s | 2.00 | 1.00 | 100.0% | 1.00 | uncommon | uncommon | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 49.9%–56.8% | 1 vs 1 | 0.0% | 100.0% | 0.0% | OK |
| Mage base · COUNTER SKETCH | Same-role adjacent common field | 31.3% | 19.3s | 1.88 | 1.00 | 100.0% | 1.00 | uncommon | common | Rarity advantage | Same-role mirror | 4 | 48.0%–66.0% | 29.0%–33.6% | 1 vs 1 | 0.0% | 92.6% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · ECHO MARK | Same-role rare peers | 52.0% | 19.9s | 2.00 | 1.00 | 100.0% | 1.00 | rare | rare | Equal rarity | Same-role mirror | 0 | 42.0%–58.0% | 47.1%–56.9% | 1 vs 1 | 0.0% | 100.0% | 0.0% | INFO_SELF_MIRROR_ONLY |
| Mage base · ECHO MARK | Same-role adjacent uncommon field | 42.2% | 19.7s | 2.00 | 1.00 | 100.0% | 1.00 | rare | uncommon | Rarity advantage | Same-role mirror | 3 | 48.0%–66.0% | 39.4%–45.0% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · LAST SCRIBBLE | Same-role epic peers | 29.4% | 19.4s | 1.85 | 0.85 | 85.3% | 0.85 | epic | epic | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 26.3%–32.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Mage base · LAST SCRIBBLE | Same-role adjacent rare field | 12.0% | 19.6s | 1.44 | 0.44 | 43.8% | 0.44 | epic | rare | Rarity advantage | Same-role mirror | 1 | 48.0%–66.0% | 9.2%–15.6% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · INK RAGE | Same-role epic peers | 70.4% | 19.0s | 1.88 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 67.1%–73.4% | 1 vs 1 | 0.0% | 86.4% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Mage base · INK RAGE | Same-role adjacent rare field | 64.8% | 19.1s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 48.0%–66.0% | 59.9%–69.3% | 1 vs 1 | 0.0% | 98.8% | 0.0% | WATCH_RARITY_ADVANTAGE |
| Mage base · PAPER TWIN | Same-role epic peers | 51.4% | 19.0s | 1.99 | 1.00 | 100.0% | 1.00 | epic | epic | Equal rarity | Same-role mirror | 2 | 42.0%–58.0% | 47.9%–54.8% | 1 vs 1 | 0.0% | 85.0% | 0.0% | OK |
| Mage base · PAPER TWIN | Same-role adjacent rare field | 94.5% | 19.4s | 2.00 | 1.00 | 100.0% | 1.00 | epic | rare | Rarity advantage | Same-role mirror | 1 | 48.0%–66.0% | 91.8%–96.3% | 1 vs 1 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_EXCESSIVE |
| Brawler base · MASTERPIECE | Same-role legendary peers | 60.0% | 9.8s | 8.50 | 3.00 | 50.0% | 0.50 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 52.3%–67.3% | 4 vs 4 | 0.0% | 59.4% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Brawler base · MASTERPIECE | Same-role adjacent epic field | 40.0% | 9.9s | 6.96 | 3.42 | 50.0% | 0.50 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 48.0%–70.0% | 32.7%–47.7% | 4 vs 4 | 0.0% | 70.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Brawler base · ENDLESS DRAFT | Same-role legendary peers | 43.8% | 9.7s | 8.50 | 5.50 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 36.3%–51.5% | 4 vs 4 | 0.0% | 60.0% | 0.0% | WATCH_EQUAL_RARITY_SPREAD |
| Brawler base · ENDLESS DRAFT | Same-role adjacent epic field | 35.6% | 9.9s | 9.00 | 5.50 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 48.0%–70.0% | 28.6%–43.3% | 4 vs 4 | 0.0% | 60.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Longshot base · MASTERPIECE | Same-role legendary peers | 100.0% | 16.8s | 10.46 | 4.00 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 97.7%–100.0% | 4 vs 4 | 0.0% | 61.9% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Longshot base · MASTERPIECE | Same-role adjacent epic field | 100.0% | 18.3s | 8.00 | 4.00 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 48.0%–70.0% | 97.7%–100.0% | 4 vs 4 | 0.0% | 81.3% | 0.0% | FLAG_RARITY_ADVANTAGE_EXCESSIVE |
| Longshot base · ENDLESS DRAFT | Same-role legendary peers | 0.0% | 16.8s | 10.46 | 6.46 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 0.0%–2.3% | 4 vs 4 | 0.0% | 63.7% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Longshot base · ENDLESS DRAFT | Same-role adjacent epic field | 46.9% | 19.2s | 10.42 | 6.46 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 1 | 48.0%–70.0% | 39.3%–54.6% | 4 vs 4 | 0.0% | 100.0% | 0.0% | FLAG_RARITY_ADVANTAGE_MISSING |
| Mage base · MASTERPIECE | Same-role legendary peers | 77.5% | 18.2s | 9.78 | 3.71 | 85.6% | 0.86 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 70.4%–83.3% | 4 vs 4 | 0.0% | 61.3% | 0.0% | FLAG_EQUAL_RARITY_OVERPOWERED |
| Mage base · MASTERPIECE | Same-role adjacent epic field | 84.0% | 19.0s | 7.56 | 3.70 | 85.0% | 0.85 | legendary | epic | Rarity advantage | Same-role mirror | 3 | 48.0%–70.0% | 80.4%–87.0% | 4 vs 4 | 0.0% | 63.1% | 0.0% | FLAG_RARITY_ADVANTAGE_EXCESSIVE |
| Mage base · ENDLESS DRAFT | Same-role legendary peers | 21.9% | 18.2s | 9.78 | 6.07 | 100.0% | 1.00 | legendary | legendary | Equal rarity | Same-role mirror | 1 | 42.0%–58.0% | 16.2%–28.9% | 4 vs 4 | 0.0% | 58.1% | 0.0% | FLAG_EQUAL_RARITY_UNDERPOWERED |
| Mage base · ENDLESS DRAFT | Same-role adjacent epic field | 57.3% | 18.8s | 9.96 | 6.15 | 100.0% | 1.00 | legendary | epic | Rarity advantage | Same-role mirror | 3 | 48.0%–70.0% | 52.8%–61.6% | 4 vs 4 | 0.0% | 92.3% | 0.0% | OK |

## Hard flags

- UNCOMMON tier aggregate vs COMMON same-role tier: FLAG_TIER_ADVANTAGE_MISSING (42.3%, 18.1s avg)
- RARE tier aggregate vs UNCOMMON same-role tier: FLAG_TIER_ADVANTAGE_MISSING (47.1%, 15.9s avg)
- EPIC tier aggregate vs RARE same-role tier: FLAG_TIER_ADVANTAGE_EXCESSIVE (66.8%, 16.4s avg)
- LEGENDARY tier aggregate vs EPIC same-role tier: FLAG_TIER_ADVANTAGE_EXCESSIVE (64.6%, 17.1s avg)
- Brawler base · SMUDGE STEP vs Same-role common peers: FLAG_EQUAL_RARITY_OVERPOWERED (90.0%, 10.8s avg)
- Brawler base · PAPER SHIELD vs Same-role common peers: FLAG_EQUAL_RARITY_UNDERPOWERED (9.0%, 10.8s avg)
- Brawler base · COUNTER SKETCH vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_MISSING (39.8%, 10.6s avg)
- Brawler base · WALLOP vs Same-role rare peers: FLAG_DEAD_CARD (51.0%, 10.4s avg)
- Brawler base · WALLOP vs Same-role adjacent uncommon field: FLAG_DEAD_CARD+FLAG_RARITY_ADVANTAGE_MISSING (43.6%, 10.4s avg)
- Longshot base · SMUDGE STEP vs Same-role common peers: FLAG_EQUAL_RARITY_OVERPOWERED (63.9%, 19.9s avg)
- Longshot base · PAPER SHIELD vs Same-role common peers: FLAG_EQUAL_RARITY_UNDERPOWERED (4.8%, 19.8s avg)
- Longshot base · COMBO SPARK vs Same-role common peers: FLAG_EQUAL_RARITY_OVERPOWERED (81.5%, 19.8s avg)
- Longshot base · DOUBLE DOODLE vs Same-role uncommon peers: FLAG_EQUAL_RARITY_UNDERPOWERED (30.3%, 19.5s avg)
- Longshot base · DOUBLE DOODLE vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_MISSING (30.6%, 19.6s avg)
- Longshot base · COUNTER SKETCH vs Same-role uncommon peers: FLAG_EQUAL_RARITY_OVERPOWERED (67.8%, 19.5s avg)
- Longshot base · COUNTER SKETCH vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_EXCESSIVE (68.4%, 19.6s avg)
- Longshot base · LAST SCRIBBLE vs Same-role adjacent rare field: FLAG_RARITY_ADVANTAGE_EXCESSIVE (97.8%, 19.6s avg)
- Mage base · EDGE SPRING vs Same-role common peers: FLAG_EQUAL_RARITY_OVERPOWERED (92.3%, 20.0s avg)
- Mage base · COMBO SPARK vs Same-role common peers: FLAG_EQUAL_RARITY_UNDERPOWERED (21.1%, 19.5s avg)
- Mage base · CENTER FOLD vs Same-role common peers: FLAG_EQUAL_RARITY_UNDERPOWERED (38.7%, 19.5s avg)
- Mage base · DOUBLE DOODLE vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_MISSING (26.4%, 19.4s avg)
- Mage base · HEART INK vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_MISSING (46.6%, 19.5s avg)
- Mage base · COUNTER SKETCH vs Same-role adjacent common field: FLAG_RARITY_ADVANTAGE_MISSING (31.3%, 19.3s avg)
- Mage base · ECHO MARK vs Same-role adjacent uncommon field: FLAG_RARITY_ADVANTAGE_MISSING (42.2%, 19.7s avg)
- Mage base · LAST SCRIBBLE vs Same-role epic peers: FLAG_EQUAL_RARITY_UNDERPOWERED (29.4%, 19.4s avg)
- Mage base · LAST SCRIBBLE vs Same-role adjacent rare field: FLAG_RARITY_ADVANTAGE_MISSING (12.0%, 19.6s avg)
- Mage base · INK RAGE vs Same-role epic peers: FLAG_EQUAL_RARITY_OVERPOWERED (70.4%, 19.0s avg)
- Mage base · PAPER TWIN vs Same-role adjacent rare field: FLAG_RARITY_ADVANTAGE_EXCESSIVE (94.5%, 19.4s avg)
- Brawler base · MASTERPIECE vs Same-role legendary peers: FLAG_EQUAL_RARITY_OVERPOWERED (60.0%, 9.8s avg)
- Brawler base · MASTERPIECE vs Same-role adjacent epic field: FLAG_RARITY_ADVANTAGE_MISSING (40.0%, 9.9s avg)
- Brawler base · ENDLESS DRAFT vs Same-role adjacent epic field: FLAG_RARITY_ADVANTAGE_MISSING (35.6%, 9.9s avg)
- Longshot base · MASTERPIECE vs Same-role legendary peers: FLAG_EQUAL_RARITY_OVERPOWERED (100.0%, 16.8s avg)
- Longshot base · MASTERPIECE vs Same-role adjacent epic field: FLAG_RARITY_ADVANTAGE_EXCESSIVE (100.0%, 18.3s avg)
- Longshot base · ENDLESS DRAFT vs Same-role legendary peers: FLAG_EQUAL_RARITY_UNDERPOWERED (0.0%, 16.8s avg)
- Longshot base · ENDLESS DRAFT vs Same-role adjacent epic field: FLAG_RARITY_ADVANTAGE_MISSING (46.9%, 19.2s avg)
- Mage base · MASTERPIECE vs Same-role legendary peers: FLAG_EQUAL_RARITY_OVERPOWERED (77.5%, 18.2s avg)
- Mage base · MASTERPIECE vs Same-role adjacent epic field: FLAG_RARITY_ADVANTAGE_EXCESSIVE (84.0%, 19.0s avg)
- Mage base · ENDLESS DRAFT vs Same-role legendary peers: FLAG_EQUAL_RARITY_UNDERPOWERED (21.9%, 18.2s avg)

## Watches

- Brawler base · INK RAGE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (66.0%, 10.4s avg)
- Mage base · HEART INK vs Same-role uncommon peers: WATCH_EQUAL_RARITY_SPREAD (43.6%, 19.5s avg)
- Mage base · INK RAGE vs Same-role adjacent rare field: WATCH_RARITY_ADVANTAGE (64.8%, 19.1s avg)
- Brawler base · ENDLESS DRAFT vs Same-role legendary peers: WATCH_EQUAL_RARITY_SPREAD (43.8%, 9.7s avg)
