# Reward Path

Generated: 2026-07-17T01:19:27.835Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Role-adjusted field | Choice spread | Target rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base · reward baseline | exhibition-win role baseline | 60.7% | 16.0s | 0.00 | 0.00 | 60.7% | 0.0pp | 28.7pp |  | 0.0% | 81.0% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | exhibition-win rarity-weighted upgraded field | 60.3% | 15.4s | 2.25 | 1.13 | 60.7% | -0.4pp | 28.7pp |  | 0.0% | 75.8% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | exhibition-win role baseline | 51.6% | 19.6s | 0.00 | 0.00 | 51.6% | 0.0pp | 36.7pp |  | 66.7% | 81.4% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | exhibition-win rarity-weighted upgraded field | 43.0% | 19.1s | 1.91 | 0.98 | 51.6% | -8.6pp | 36.7pp |  | 66.5% | 76.6% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | exhibition-win role baseline | 59.1% | 19.4s | 0.00 | 0.00 | 59.1% | 0.0pp | 35.1pp |  | 38.7% | 99.7% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | exhibition-win rarity-weighted upgraded field | 59.0% | 19.2s | 1.80 | 0.86 | 59.1% | -0.1pp | 35.1pp |  | 46.2% | 83.8% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | rival-run-win role baseline | 60.7% | 16.0s | 0.00 | 0.00 | 60.7% | 0.0pp | 29.0pp |  | 0.0% | 81.0% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rival-run-win rarity-weighted upgraded field | 61.6% | 15.4s | 2.24 | 1.12 | 60.7% | 0.9pp | 29.0pp |  | 0.0% | 77.2% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rival-run-win role baseline | 51.6% | 19.6s | 0.00 | 0.00 | 51.6% | 0.0pp | 38.6pp |  | 66.7% | 81.4% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rival-run-win rarity-weighted upgraded field | 43.3% | 19.1s | 1.91 | 0.99 | 51.6% | -8.3pp | 38.6pp |  | 66.4% | 77.3% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rival-run-win role baseline | 59.1% | 19.4s | 0.00 | 0.00 | 59.1% | 0.0pp | 28.4pp |  | 38.7% | 99.7% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rival-run-win rarity-weighted upgraded field | 58.3% | 19.2s | 1.80 | 0.86 | 59.1% | -0.8pp | 28.4pp |  | 46.4% | 83.1% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | rival-run-final-win role baseline | 60.7% | 16.0s | 0.00 | 0.00 | 60.7% | 0.0pp | 29.3pp |  | 0.0% | 81.0% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rival-run-final-win rarity-weighted upgraded field | 63.9% | 15.2s | 2.23 | 1.15 | 60.7% | 3.2pp | 29.3pp |  | 0.0% | 70.6% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rival-run-final-win role baseline | 51.6% | 19.6s | 0.00 | 0.00 | 51.6% | 0.0pp | 38.0pp |  | 66.7% | 81.4% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rival-run-final-win rarity-weighted upgraded field | 44.2% | 19.1s | 1.93 | 0.95 | 51.6% | -7.3pp | 38.0pp |  | 66.4% | 76.1% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rival-run-final-win role baseline | 59.1% | 19.4s | 0.00 | 0.00 | 59.1% | 0.0pp | 27.0pp |  | 38.7% | 99.7% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rival-run-final-win rarity-weighted upgraded field | 53.8% | 19.0s | 1.86 | 0.91 | 59.1% | -5.3pp | 27.0pp |  | 45.4% | 81.8% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | rumble-day-win role baseline | 60.7% | 16.0s | 0.00 | 0.00 | 60.7% | 0.0pp | 32.6pp |  | 0.0% | 81.0% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rumble-day-win rarity-weighted upgraded field | 64.2% | 15.2s | 2.20 | 1.14 | 60.7% | 3.5pp | 32.6pp |  | 0.0% | 71.6% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rumble-day-win role baseline | 51.6% | 19.6s | 0.00 | 0.00 | 51.6% | 0.0pp | 38.0pp |  | 66.7% | 81.4% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rumble-day-win rarity-weighted upgraded field | 45.3% | 19.1s | 1.90 | 0.93 | 51.6% | -6.2pp | 38.0pp |  | 66.4% | 76.2% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rumble-day-win role baseline | 59.1% | 19.4s | 0.00 | 0.00 | 59.1% | 0.0pp | 27.4pp |  | 38.7% | 99.7% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rumble-day-win rarity-weighted upgraded field | 53.8% | 19.0s | 1.82 | 0.90 | 59.1% | -5.3pp | 27.4pp |  | 45.3% | 82.9% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | champion-win role baseline | 60.7% | 16.0s | 0.00 | 0.00 | 60.7% | 0.0pp | 47.5pp |  | 0.0% | 81.0% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | champion-win rarity-weighted upgraded field | 65.7% | 15.1s | 2.17 | 1.16 | 60.7% | 5.0pp | 47.5pp |  | 0.1% | 72.0% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | champion-win role baseline | 51.6% | 19.6s | 0.00 | 0.00 | 51.6% | 0.0pp | 47.7pp |  | 66.7% | 81.4% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | champion-win rarity-weighted upgraded field | 45.2% | 19.1s | 1.74 | 0.83 | 51.6% | -6.4pp | 47.7pp |  | 66.7% | 82.6% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | champion-win role baseline | 59.1% | 19.4s | 0.00 | 0.00 | 59.1% | 0.0pp | 46.0pp |  | 38.7% | 99.7% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | champion-win rarity-weighted upgraded field | 48.9% | 19.0s | 1.66 | 0.79 | 59.1% | -10.2pp | 46.0pp |  | 47.5% | 87.0% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| brawler · PAPER SHIELD | exhibition-win rarity-weighted upgraded field | 47.2% | 15.5s | 2.14 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 77.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | exhibition-win rarity-weighted upgraded field | 62.0% | 15.6s | 2.49 | 1.32 | 0.0% | 0.0pp | — | common | 0.0% | 77.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | exhibition-win rarity-weighted upgraded field | 72.9% | 15.2s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 75.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · WIDER HALO | exhibition-win rarity-weighted upgraded field | 57.2% | 18.7s | 1.95 | 1.00 | 0.0% | 0.0pp | — | common | 65.5% | 89.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | exhibition-win rarity-weighted upgraded field | 52.4% | 19.4s | 2.12 | 1.22 | 0.0% | 0.0pp | — | common | 66.7% | 68.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ORBITING NIB | exhibition-win rarity-weighted upgraded field | 31.5% | 18.5s | 1.94 | 1.00 | 0.0% | 0.0pp | — | uncommon | 66.7% | 58.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAINT SPLASH | exhibition-win rarity-weighted upgraded field | 63.7% | 18.2s | 1.90 | 1.00 | 0.0% | 0.0pp | — | uncommon | 33.1% | 40.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | exhibition-win rarity-weighted upgraded field | 42.7% | 19.3s | 1.25 | 0.37 | 0.0% | 0.0pp | — | common | 39.3% | 94.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | exhibition-win rarity-weighted upgraded field | 60.3% | 19.2s | 1.88 | 1.00 | 0.0% | 0.0pp | — | common | 41.5% | 46.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | exhibition-win rarity-weighted upgraded field | 62.3% | 15.4s | 2.06 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 75.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · BANK SHOT | exhibition-win rarity-weighted upgraded field | 22.1% | 19.8s | 1.66 | 0.77 | 0.0% | 0.0pp | — | common | 66.7% | 95.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | exhibition-win rarity-weighted upgraded field | 55.2% | 19.3s | 1.97 | 1.00 | 0.0% | 0.0pp | — | rare | 50.0% | 94.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · WET PAINT | exhibition-win rarity-weighted upgraded field | 61.7% | 18.8s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 49.0% | 85.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | exhibition-win rarity-weighted upgraded field | 70.7% | 19.5s | 1.75 | 0.79 | 0.0% | 0.0pp | — | common | 55.9% | 98.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | exhibition-win rarity-weighted upgraded field | 70.8% | 14.4s | 3.12 | 2.00 | 0.0% | 0.0pp | — | rare | 0.0% | 62.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | exhibition-win rarity-weighted upgraded field | 73.8% | 15.1s | 2.09 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 71.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · RETURNING STROKE | exhibition-win rarity-weighted upgraded field | 53.6% | 19.4s | 1.64 | 0.67 | 0.0% | 0.0pp | — | rare | 66.7% | 70.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | exhibition-win rarity-weighted upgraded field | 57.6% | 19.1s | 1.98 | 0.99 | 0.0% | 0.0pp | — | uncommon | 44.4% | 91.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | exhibition-win rarity-weighted upgraded field | 47.7% | 19.3s | 1.96 | 1.00 | 0.0% | 0.0pp | — | uncommon | 43.1% | 96.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | exhibition-win rarity-weighted upgraded field | 57.2% | 19.5s | 1.94 | 0.98 | 0.0% | 0.0pp | — | common | 55.6% | 98.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | exhibition-win rarity-weighted upgraded field | 58.8% | 19.4s | 1.92 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 76.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | exhibition-win rarity-weighted upgraded field | 75.9% | 15.2s | 2.09 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 71.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | exhibition-win rarity-weighted upgraded field | 57.5% | 19.4s | 1.86 | 0.92 | 0.0% | 0.0pp | — | uncommon | 44.1% | 95.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER TWIN | exhibition-win rarity-weighted upgraded field | 57.4% | 19.4s | 1.98 | 1.00 | 0.0% | 0.0pp | — | epic | 66.7% | 92.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | exhibition-win rarity-weighted upgraded field | 44.4% | 19.2s | 1.70 | 0.74 | 0.0% | 0.0pp | — | epic | 40.7% | 100.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | exhibition-win rarity-weighted upgraded field | 77.8% | 19.5s | 1.33 | 0.44 | 0.0% | 0.0pp | — | epic | 33.3% | 100.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rival-run-win rarity-weighted upgraded field | 46.9% | 15.5s | 2.14 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 78.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rival-run-win rarity-weighted upgraded field | 62.8% | 15.6s | 2.48 | 1.32 | 0.0% | 0.0pp | — | common | 0.0% | 78.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rival-run-win rarity-weighted upgraded field | 66.0% | 15.4s | 2.06 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 79.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER TWIN | rival-run-win rarity-weighted upgraded field | 57.1% | 19.4s | 1.94 | 1.00 | 0.0% | 0.0pp | — | epic | 66.7% | 92.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rival-run-win rarity-weighted upgraded field | 51.8% | 19.4s | 2.12 | 1.21 | 0.0% | 0.0pp | — | common | 66.7% | 68.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · WIDER HALO | rival-run-win rarity-weighted upgraded field | 59.1% | 18.7s | 1.95 | 1.00 | 0.0% | 0.0pp | — | common | 65.4% | 90.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rival-run-win rarity-weighted upgraded field | 60.3% | 19.2s | 1.89 | 1.00 | 0.0% | 0.0pp | — | common | 41.1% | 43.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAINT SPLASH | rival-run-win rarity-weighted upgraded field | 65.1% | 18.2s | 1.93 | 1.00 | 0.0% | 0.0pp | — | uncommon | 31.1% | 38.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rival-run-win rarity-weighted upgraded field | 41.9% | 19.3s | 1.27 | 0.38 | 0.0% | 0.0pp | — | common | 41.0% | 94.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rival-run-win rarity-weighted upgraded field | 58.7% | 19.4s | 1.91 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 74.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · RETURNING STROKE | rival-run-win rarity-weighted upgraded field | 53.8% | 19.4s | 1.63 | 0.67 | 0.0% | 0.0pp | — | rare | 66.7% | 70.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ORBITING NIB | rival-run-win rarity-weighted upgraded field | 29.4% | 18.5s | 1.94 | 1.00 | 0.0% | 0.0pp | — | uncommon | 66.7% | 57.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rival-run-win rarity-weighted upgraded field | 75.2% | 15.3s | 2.05 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 76.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · BANK SHOT | rival-run-win rarity-weighted upgraded field | 20.5% | 19.8s | 1.68 | 0.76 | 0.0% | 0.0pp | — | common | 66.7% | 94.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · WET PAINT | rival-run-win rarity-weighted upgraded field | 61.8% | 18.9s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 48.4% | 85.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rival-run-win rarity-weighted upgraded field | 56.2% | 19.2s | 1.95 | 0.98 | 0.0% | 0.0pp | — | uncommon | 44.9% | 94.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rival-run-win rarity-weighted upgraded field | 57.7% | 19.6s | 1.95 | 0.98 | 0.0% | 0.0pp | — | common | 59.0% | 99.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rival-run-win rarity-weighted upgraded field | 70.3% | 19.5s | 1.74 | 0.80 | 0.0% | 0.0pp | — | common | 54.4% | 99.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rival-run-win rarity-weighted upgraded field | 75.4% | 14.3s | 3.13 | 2.00 | 0.0% | 0.0pp | — | rare | 0.0% | 59.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rival-run-win rarity-weighted upgraded field | 59.8% | 19.4s | 1.81 | 0.88 | 0.0% | 0.0pp | — | uncommon | 43.3% | 96.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rival-run-win rarity-weighted upgraded field | 55.3% | 19.4s | 1.99 | 1.00 | 0.0% | 0.0pp | — | rare | 49.4% | 95.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rival-run-win rarity-weighted upgraded field | 46.0% | 19.3s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 47.9% | 93.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rival-run-win rarity-weighted upgraded field | 52.8% | 19.4s | 1.72 | 0.78 | 0.0% | 0.0pp | — | epic | 44.4% | 97.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rival-run-win rarity-weighted upgraded field | 75.9% | 14.9s | 2.13 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 79.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rival-run-win rarity-weighted upgraded field | 70.4% | 19.6s | 1.22 | 0.33 | 0.0% | 0.0pp | — | epic | 50.0% | 100.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rival-run-win rarity-weighted upgraded field | 68.3% | 15.3s | 2.09 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 66.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rival-run-final-win rarity-weighted upgraded field | 58.2% | 15.6s | 2.45 | 1.30 | 0.0% | 0.0pp | — | common | 0.0% | 72.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rival-run-final-win rarity-weighted upgraded field | 75.0% | 15.0s | 2.12 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 64.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rival-run-final-win rarity-weighted upgraded field | 66.4% | 14.3s | 3.12 | 2.00 | 0.0% | 0.0pp | — | rare | 0.0% | 55.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER TWIN | rival-run-final-win rarity-weighted upgraded field | 59.5% | 19.3s | 2.01 | 1.00 | 0.0% | 0.0pp | — | epic | 66.7% | 92.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rival-run-final-win rarity-weighted upgraded field | 53.3% | 19.4s | 2.11 | 1.16 | 0.0% | 0.0pp | — | common | 66.7% | 72.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ORBITING NIB | rival-run-final-win rarity-weighted upgraded field | 30.8% | 18.4s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 66.7% | 58.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rival-run-final-win rarity-weighted upgraded field | 51.5% | 19.0s | 1.99 | 0.99 | 0.0% | 0.0pp | — | uncommon | 47.6% | 90.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAINT SPLASH | rival-run-final-win rarity-weighted upgraded field | 63.8% | 18.2s | 1.94 | 1.00 | 0.0% | 0.0pp | — | uncommon | 32.4% | 39.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rival-run-final-win rarity-weighted upgraded field | 59.3% | 19.4s | 1.97 | 0.99 | 0.0% | 0.0pp | — | common | 57.0% | 93.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rival-run-final-win rarity-weighted upgraded field | 67.7% | 15.3s | 2.03 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 75.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rival-run-final-win rarity-weighted upgraded field | 45.8% | 15.4s | 2.10 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 74.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · RETURNING STROKE | rival-run-final-win rarity-weighted upgraded field | 56.1% | 19.4s | 1.65 | 0.67 | 0.0% | 0.0pp | — | rare | 66.7% | 71.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · WIDER HALO | rival-run-final-win rarity-weighted upgraded field | 58.0% | 18.7s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 64.4% | 89.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rival-run-final-win rarity-weighted upgraded field | 51.7% | 19.2s | 1.96 | 1.00 | 0.0% | 0.0pp | — | rare | 51.0% | 93.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rival-run-final-win rarity-weighted upgraded field | 39.1% | 19.2s | 1.27 | 0.38 | 0.0% | 0.0pp | — | common | 43.3% | 91.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rival-run-final-win rarity-weighted upgraded field | 42.4% | 19.1s | 1.96 | 1.00 | 0.0% | 0.0pp | — | uncommon | 48.9% | 94.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rival-run-final-win rarity-weighted upgraded field | 75.1% | 15.1s | 2.05 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 71.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rival-run-final-win rarity-weighted upgraded field | 66.1% | 19.4s | 1.80 | 0.83 | 0.0% | 0.0pp | — | common | 54.5% | 98.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rival-run-final-win rarity-weighted upgraded field | 58.8% | 19.4s | 1.99 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 78.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rival-run-final-win rarity-weighted upgraded field | 45.8% | 19.2s | 1.86 | 0.92 | 0.0% | 0.0pp | — | uncommon | 41.4% | 92.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · BANK SHOT | rival-run-final-win rarity-weighted upgraded field | 21.6% | 19.8s | 1.73 | 0.76 | 0.0% | 0.0pp | — | common | 66.7% | 97.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · WET PAINT | rival-run-final-win rarity-weighted upgraded field | 58.4% | 18.8s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 47.7% | 83.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rival-run-final-win rarity-weighted upgraded field | 55.2% | 19.0s | 1.95 | 1.00 | 0.0% | 0.0pp | — | common | 38.7% | 44.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rival-run-final-win rarity-weighted upgraded field | 66.0% | 19.4s | 1.30 | 0.41 | 0.0% | 0.0pp | — | epic | 45.8% | 99.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rival-run-final-win rarity-weighted upgraded field | 46.7% | 19.2s | 1.71 | 0.77 | 0.0% | 0.0pp | — | epic | 47.8% | 93.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rival-run-final-win rarity-weighted upgraded field | 65.2% | 15.2s | 2.06 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 67.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rumble-day-win rarity-weighted upgraded field | 58.4% | 15.6s | 2.46 | 1.31 | 0.0% | 0.0pp | — | common | 0.0% | 72.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rumble-day-win rarity-weighted upgraded field | 74.8% | 15.2s | 2.03 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 74.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rumble-day-win rarity-weighted upgraded field | 45.6% | 15.4s | 2.07 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 73.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ORBITING NIB | rumble-day-win rarity-weighted upgraded field | 31.2% | 18.4s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 66.7% | 59.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER TWIN | rumble-day-win rarity-weighted upgraded field | 58.1% | 19.3s | 1.99 | 1.00 | 0.0% | 0.0pp | — | epic | 66.7% | 92.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · BANK SHOT | rumble-day-win rarity-weighted upgraded field | 22.4% | 19.7s | 1.74 | 0.77 | 0.0% | 0.0pp | — | common | 66.7% | 97.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rumble-day-win rarity-weighted upgraded field | 49.9% | 19.2s | 1.83 | 0.92 | 0.0% | 0.0pp | — | uncommon | 44.1% | 94.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rumble-day-win rarity-weighted upgraded field | 53.0% | 19.3s | 1.76 | 0.81 | 0.0% | 0.0pp | — | epic | 49.1% | 94.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rumble-day-win rarity-weighted upgraded field | 67.5% | 19.4s | 1.78 | 0.85 | 0.0% | 0.0pp | — | common | 53.3% | 97.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rumble-day-win rarity-weighted upgraded field | 53.4% | 19.5s | 1.94 | 1.00 | 0.0% | 0.0pp | — | common | 56.4% | 96.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rumble-day-win rarity-weighted upgraded field | 40.4% | 19.2s | 1.22 | 0.38 | 0.0% | 0.0pp | — | common | 40.2% | 91.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rumble-day-win rarity-weighted upgraded field | 69.7% | 15.3s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 75.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · RETURNING STROKE | rumble-day-win rarity-weighted upgraded field | 56.8% | 19.4s | 1.65 | 0.67 | 0.0% | 0.0pp | — | rare | 66.7% | 70.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rumble-day-win rarity-weighted upgraded field | 49.9% | 19.2s | 1.95 | 1.00 | 0.0% | 0.0pp | — | rare | 51.6% | 93.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAINT SPLASH | rumble-day-win rarity-weighted upgraded field | 63.4% | 18.2s | 1.89 | 1.00 | 0.0% | 0.0pp | — | uncommon | 32.4% | 38.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · WET PAINT | rumble-day-win rarity-weighted upgraded field | 55.9% | 18.8s | 1.98 | 1.00 | 0.0% | 0.0pp | — | common | 47.4% | 83.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rumble-day-win rarity-weighted upgraded field | 66.7% | 15.2s | 2.05 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 68.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rumble-day-win rarity-weighted upgraded field | 54.3% | 19.4s | 2.13 | 1.17 | 0.0% | 0.0pp | — | common | 66.7% | 72.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rumble-day-win rarity-weighted upgraded field | 57.8% | 19.1s | 1.90 | 1.00 | 0.0% | 0.0pp | — | common | 37.8% | 45.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · WIDER HALO | rumble-day-win rarity-weighted upgraded field | 60.4% | 18.7s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 65.0% | 91.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rumble-day-win rarity-weighted upgraded field | 69.9% | 14.3s | 3.11 | 2.00 | 0.0% | 0.0pp | — | rare | 0.0% | 53.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rumble-day-win rarity-weighted upgraded field | 52.5% | 19.1s | 1.94 | 0.99 | 0.0% | 0.0pp | — | uncommon | 47.6% | 91.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rumble-day-win rarity-weighted upgraded field | 45.5% | 19.1s | 1.95 | 1.00 | 0.0% | 0.0pp | — | uncommon | 46.6% | 93.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rumble-day-win rarity-weighted upgraded field | 67.8% | 19.4s | 1.22 | 0.39 | 0.0% | 0.0pp | — | epic | 45.6% | 98.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rumble-day-win rarity-weighted upgraded field | 78.2% | 14.9s | 2.05 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 68.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rumble-day-win rarity-weighted upgraded field | 58.9% | 19.4s | 1.96 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 74.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | champion-win rarity-weighted upgraded field | 61.1% | 14.3s | 3.06 | 2.00 | 0.0% | 0.0pp | — | rare | 0.0% | 55.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | champion-win rarity-weighted upgraded field | 75.3% | 15.0s | 2.02 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 74.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | champion-win rarity-weighted upgraded field | 60.8% | 15.4s | 2.01 | 1.00 | 0.0% | 0.0pp | — | epic | 0.3% | 75.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · MASTERPIECE | champion-win rarity-weighted upgraded field | 34.3% | 19.6s | 0.77 | 0.00 | 0.0% | 0.0pp | — | legendary | 67.4% | 86.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER TWIN | champion-win rarity-weighted upgraded field | 56.8% | 19.3s | 1.93 | 1.00 | 0.0% | 0.0pp | — | epic | 66.7% | 97.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · RETURNING STROKE | champion-win rarity-weighted upgraded field | 49.0% | 19.3s | 1.58 | 0.67 | 0.0% | 0.0pp | — | rare | 66.7% | 81.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · MASTERPIECE | champion-win rarity-weighted upgraded field | 47.0% | 19.1s | 0.78 | 0.00 | 0.0% | 0.0pp | — | legendary | 51.0% | 84.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | champion-win rarity-weighted upgraded field | 68.5% | 19.4s | 1.72 | 0.89 | 0.0% | 0.0pp | — | common | 61.1% | 98.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | champion-win rarity-weighted upgraded field | 47.5% | 19.1s | 1.88 | 1.00 | 0.0% | 0.0pp | — | rare | 51.9% | 91.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | champion-win rarity-weighted upgraded field | 42.1% | 15.6s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 72.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ORBITING NIB | champion-win rarity-weighted upgraded field | 29.3% | 18.4s | 1.92 | 1.00 | 0.0% | 0.0pp | — | uncommon | 66.7% | 63.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | champion-win rarity-weighted upgraded field | 67.2% | 19.3s | 1.35 | 0.50 | 0.0% | 0.0pp | — | epic | 47.6% | 99.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | champion-win rarity-weighted upgraded field | 38.2% | 19.0s | 1.71 | 0.84 | 0.0% | 0.0pp | — | epic | 45.2% | 88.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | champion-win rarity-weighted upgraded field | 67.0% | 15.4s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 80.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | champion-win rarity-weighted upgraded field | 72.6% | 15.2s | 2.02 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 77.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | champion-win rarity-weighted upgraded field | 30.9% | 19.1s | 1.73 | 0.90 | 0.0% | 0.0pp | — | uncommon | 42.7% | 85.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · MASTERPIECE | champion-win rarity-weighted upgraded field | 72.2% | 15.5s | 0.84 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 81.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAINT SPLASH | champion-win rarity-weighted upgraded field | 60.6% | 18.2s | 1.92 | 1.00 | 0.0% | 0.0pp | — | uncommon | 34.0% | 35.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · BANK SHOT | champion-win rarity-weighted upgraded field | 20.8% | 19.8s | 1.69 | 0.76 | 0.0% | 0.0pp | — | common | 66.7% | 97.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | champion-win rarity-weighted upgraded field | 38.7% | 19.0s | 1.90 | 1.00 | 0.0% | 0.0pp | — | uncommon | 51.1% | 90.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | champion-win rarity-weighted upgraded field | 68.5% | 19.4s | 1.94 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 85.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ENDLESS DRAFT | champion-win rarity-weighted upgraded field | 46.0% | 19.1s | 0.77 | 0.00 | 0.0% | 0.0pp | — | legendary | 50.5% | 83.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ENDLESS DRAFT | champion-win rarity-weighted upgraded field | 73.9% | 15.4s | 0.87 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 80.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | champion-win rarity-weighted upgraded field | 57.4% | 18.9s | 1.90 | 1.00 | 0.0% | 0.0pp | — | common | 37.7% | 50.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | champion-win rarity-weighted upgraded field | 26.2% | 18.9s | 1.18 | 0.36 | 0.0% | 0.0pp | — | common | 36.5% | 82.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · WIDER HALO | champion-win rarity-weighted upgraded field | 56.8% | 18.7s | 1.92 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 95.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | champion-win rarity-weighted upgraded field | 43.9% | 19.0s | 1.87 | 1.00 | 0.0% | 0.0pp | — | uncommon | 53.4% | 88.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · WET PAINT | champion-win rarity-weighted upgraded field | 52.4% | 18.8s | 1.93 | 1.00 | 0.0% | 0.0pp | — | common | 46.0% | 83.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | champion-win rarity-weighted upgraded field | 44.4% | 19.2s | 1.97 | 1.14 | 0.0% | 0.0pp | — | common | 66.7% | 77.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | champion-win rarity-weighted upgraded field | 27.8% | 15.4s | 2.44 | 1.33 | 0.0% | 0.0pp | — | common | 0.0% | 61.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | champion-win rarity-weighted upgraded field | 72.2% | 19.6s | 1.89 | 1.00 | 0.0% | 0.0pp | — | common | 66.7% | 100.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |

## Hard flags

- Brawler base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (60.3%, 15.4s avg)
- Longshot base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (43.0%, 19.1s avg)
- Mage base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (59.0%, 19.2s avg)
- Brawler base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (61.6%, 15.4s avg)
- Longshot base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (43.3%, 19.1s avg)
- Mage base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (58.3%, 19.2s avg)
- Brawler base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (63.9%, 15.2s avg)
- Longshot base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (44.2%, 19.1s avg)
- Mage base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (53.8%, 19.0s avg)
- Brawler base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (64.2%, 15.2s avg)
- Longshot base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (45.3%, 19.1s avg)
- Mage base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (53.8%, 19.0s avg)
- Brawler base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (65.7%, 15.1s avg)
- Longshot base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (45.2%, 19.1s avg)
- Mage base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (48.9%, 19.0s avg)

## Watches

No watch-only rows from current thresholds.
