# Reward Path

Generated: 2026-07-16T10:15:46.818Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Role-adjusted field | Choice spread | Target rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base · reward baseline | exhibition-win role baseline | 49.9% | 14.3s | 0.00 | 0.00 | 49.9% | 0.0pp | 44.7pp |  | 0.0% | 85.3% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | exhibition-win rarity-weighted upgraded field | 50.9% | 14.0s | 2.12 | 1.10 | 49.9% | 1.0pp | 44.7pp |  | 0.0% | 70.2% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | exhibition-win role baseline | 50.1% | 18.8s | 0.00 | 0.00 | 50.1% | 0.0pp | 29.0pp |  | 0.0% | 89.3% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | exhibition-win rarity-weighted upgraded field | 57.1% | 18.9s | 2.01 | 1.01 | 50.1% | 6.9pp | 29.0pp |  | 0.0% | 88.6% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | exhibition-win role baseline | 52.1% | 18.2s | 0.00 | 0.00 | 52.1% | 0.0pp | 21.8pp |  | 0.0% | 92.2% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | exhibition-win rarity-weighted upgraded field | 42.8% | 17.9s | 1.91 | 0.92 | 52.1% | -9.2pp | 21.8pp |  | 0.0% | 77.9% | 0.0% | FLAG_REWARD_FIELD |
| Brawler base · reward baseline | rival-run-win role baseline | 49.9% | 14.3s | 0.00 | 0.00 | 49.9% | 0.0pp | 37.2pp |  | 0.0% | 85.3% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rival-run-win rarity-weighted upgraded field | 51.6% | 14.0s | 2.14 | 1.10 | 49.9% | 1.8pp | 37.2pp |  | 0.0% | 69.9% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rival-run-win role baseline | 50.1% | 18.8s | 0.00 | 0.00 | 50.1% | 0.0pp | 29.5pp |  | 0.0% | 89.3% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rival-run-win rarity-weighted upgraded field | 57.4% | 18.9s | 2.01 | 1.01 | 50.1% | 7.3pp | 29.5pp |  | 0.0% | 88.5% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rival-run-win role baseline | 52.1% | 18.2s | 0.00 | 0.00 | 52.1% | 0.0pp | 25.1pp |  | 0.0% | 92.2% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rival-run-win rarity-weighted upgraded field | 42.1% | 17.9s | 1.93 | 0.93 | 52.1% | -10.0pp | 25.1pp |  | 0.0% | 77.6% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | rival-run-final-win role baseline | 49.9% | 14.3s | 0.00 | 0.00 | 49.9% | 0.0pp | 35.1pp |  | 0.0% | 85.3% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rival-run-final-win rarity-weighted upgraded field | 53.8% | 13.7s | 2.05 | 1.08 | 49.9% | 3.9pp | 35.1pp |  | 0.0% | 64.5% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rival-run-final-win role baseline | 50.1% | 18.8s | 0.00 | 0.00 | 50.1% | 0.0pp | 25.6pp |  | 0.0% | 89.3% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rival-run-final-win rarity-weighted upgraded field | 60.4% | 18.8s | 2.02 | 1.01 | 50.1% | 10.2pp | 25.6pp |  | 0.0% | 87.4% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rival-run-final-win role baseline | 52.1% | 18.2s | 0.00 | 0.00 | 52.1% | 0.0pp | 34.4pp |  | 0.0% | 92.2% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rival-run-final-win rarity-weighted upgraded field | 37.0% | 17.7s | 1.98 | 0.94 | 52.1% | -15.1pp | 34.4pp |  | 0.0% | 72.2% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | rumble-day-win role baseline | 49.9% | 14.3s | 0.00 | 0.00 | 49.9% | 0.0pp | 34.6pp |  | 0.0% | 85.3% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | rumble-day-win rarity-weighted upgraded field | 52.5% | 13.7s | 2.03 | 1.07 | 49.9% | 2.6pp | 34.6pp |  | 0.0% | 64.3% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | rumble-day-win role baseline | 50.1% | 18.8s | 0.00 | 0.00 | 50.1% | 0.0pp | 26.3pp |  | 0.0% | 89.3% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | rumble-day-win rarity-weighted upgraded field | 61.4% | 18.8s | 2.03 | 1.01 | 50.1% | 11.3pp | 26.3pp |  | 0.0% | 86.7% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rumble-day-win role baseline | 52.1% | 18.2s | 0.00 | 0.00 | 52.1% | 0.0pp | 35.0pp |  | 0.0% | 92.2% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | rumble-day-win rarity-weighted upgraded field | 36.6% | 17.7s | 1.98 | 0.95 | 52.1% | -15.5pp | 35.0pp |  | 0.0% | 72.4% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | champion-win role baseline | 49.9% | 14.3s | 0.00 | 0.00 | 49.9% | 0.0pp | 40.2pp |  | 0.0% | 85.3% | 0.0% | INFO_ROLE_BASELINE |
| Brawler base · equal reward | champion-win rarity-weighted upgraded field | 55.9% | 13.5s | 1.83 | 1.01 | 49.9% | 6.0pp | 40.2pp |  | 0.0% | 61.6% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Longshot base · reward baseline | champion-win role baseline | 50.1% | 18.8s | 0.00 | 0.00 | 50.1% | 0.0pp | 42.5pp |  | 0.0% | 89.3% | 0.0% | INFO_ROLE_BASELINE |
| Longshot base · equal reward | champion-win rarity-weighted upgraded field | 62.1% | 18.8s | 1.83 | 0.87 | 50.1% | 12.0pp | 42.5pp |  | 0.0% | 90.1% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | champion-win role baseline | 52.1% | 18.2s | 0.00 | 0.00 | 52.1% | 0.0pp | 39.8pp |  | 0.0% | 92.2% | 0.0% | INFO_ROLE_BASELINE |
| Mage base · equal reward | champion-win rarity-weighted upgraded field | 32.2% | 17.5s | 1.83 | 0.86 | 52.1% | -19.9pp | 39.8pp |  | 0.0% | 66.5% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| brawler · PAPER SHIELD | exhibition-win rarity-weighted upgraded field | 39.6% | 14.3s | 2.06 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 83.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | exhibition-win rarity-weighted upgraded field | 52.7% | 14.4s | 2.39 | 1.32 | 0.0% | 0.0pp | — | common | 0.0% | 77.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | exhibition-win rarity-weighted upgraded field | 54.9% | 13.4s | 1.97 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 55.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | exhibition-win rarity-weighted upgraded field | 71.5% | 18.8s | 2.02 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 83.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | exhibition-win rarity-weighted upgraded field | 52.2% | 19.0s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 92.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · HEART INK | exhibition-win rarity-weighted upgraded field | 67.6% | 19.0s | 2.31 | 1.29 | 0.0% | 0.0pp | — | uncommon | 0.0% | 81.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | exhibition-win rarity-weighted upgraded field | 38.7% | 17.8s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 77.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | exhibition-win rarity-weighted upgraded field | 39.4% | 17.9s | 1.66 | 0.67 | 0.0% | 0.0pp | — | common | 0.0% | 78.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | exhibition-win rarity-weighted upgraded field | 43.6% | 17.7s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 65.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | exhibition-win rarity-weighted upgraded field | 57.8% | 13.6s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 55.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COUNTER SKETCH | exhibition-win rarity-weighted upgraded field | 72.2% | 18.7s | 2.02 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 83.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER SHIELD | exhibition-win rarity-weighted upgraded field | 47.1% | 18.9s | 2.02 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 93.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | exhibition-win rarity-weighted upgraded field | 29.3% | 17.8s | 2.00 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 76.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | exhibition-win rarity-weighted upgraded field | 49.5% | 18.1s | 1.96 | 0.95 | 0.0% | 0.0pp | — | common | 0.0% | 82.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · DOUBLE DOODLE | exhibition-win rarity-weighted upgraded field | 43.2% | 18.8s | 1.99 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 87.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | exhibition-win rarity-weighted upgraded field | 58.9% | 13.3s | 2.16 | 1.29 | 0.0% | 0.0pp | — | rare | 0.0% | 62.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | exhibition-win rarity-weighted upgraded field | 57.9% | 13.5s | 1.95 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 51.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ECHO MARK | exhibition-win rarity-weighted upgraded field | 69.6% | 18.7s | 2.04 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 85.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | exhibition-win rarity-weighted upgraded field | 43.7% | 18.0s | 2.05 | 1.04 | 0.0% | 0.0pp | — | uncommon | 0.0% | 82.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | exhibition-win rarity-weighted upgraded field | 51.1% | 18.2s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 85.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | exhibition-win rarity-weighted upgraded field | 37.6% | 17.8s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 79.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | exhibition-win rarity-weighted upgraded field | 84.3% | 13.7s | 2.05 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 63.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · LAST SCRIBBLE | exhibition-win rarity-weighted upgraded field | 65.6% | 19.1s | 1.69 | 0.74 | 0.0% | 0.0pp | — | epic | 0.0% | 92.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER TWIN | exhibition-win rarity-weighted upgraded field | 44.4% | 17.4s | 1.98 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 72.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | exhibition-win rarity-weighted upgraded field | 33.3% | 18.5s | 1.11 | 0.22 | 0.0% | 0.0pp | — | epic | 0.0% | 83.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rival-run-win rarity-weighted upgraded field | 42.2% | 14.3s | 2.06 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 82.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rival-run-win rarity-weighted upgraded field | 53.9% | 14.4s | 2.39 | 1.31 | 0.0% | 0.0pp | — | common | 0.0% | 77.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rival-run-win rarity-weighted upgraded field | 56.9% | 13.6s | 2.01 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 55.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · LAST SCRIBBLE | rival-run-win rarity-weighted upgraded field | 61.1% | 19.1s | 1.62 | 0.70 | 0.0% | 0.0pp | — | epic | 0.0% | 96.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rival-run-win rarity-weighted upgraded field | 50.4% | 19.0s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 92.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rival-run-win rarity-weighted upgraded field | 73.4% | 18.8s | 2.01 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 83.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rival-run-win rarity-weighted upgraded field | 43.4% | 17.7s | 1.99 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 65.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rival-run-win rarity-weighted upgraded field | 36.0% | 17.8s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 79.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rival-run-win rarity-weighted upgraded field | 39.7% | 17.9s | 1.67 | 0.68 | 0.0% | 0.0pp | — | common | 0.0% | 78.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ECHO MARK | rival-run-win rarity-weighted upgraded field | 67.1% | 18.7s | 2.00 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 83.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COUNTER SKETCH | rival-run-win rarity-weighted upgraded field | 70.1% | 18.7s | 2.01 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 83.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rival-run-win rarity-weighted upgraded field | 53.9% | 13.4s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 53.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER SHIELD | rival-run-win rarity-weighted upgraded field | 47.4% | 18.9s | 2.01 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 93.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rival-run-win rarity-weighted upgraded field | 50.7% | 18.1s | 1.94 | 0.93 | 0.0% | 0.0pp | — | common | 0.0% | 83.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rival-run-win rarity-weighted upgraded field | 41.4% | 18.0s | 2.07 | 1.05 | 0.0% | 0.0pp | — | uncommon | 0.0% | 81.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · DOUBLE DOODLE | rival-run-win rarity-weighted upgraded field | 43.8% | 18.8s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 88.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rival-run-win rarity-weighted upgraded field | 52.9% | 18.3s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 87.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rival-run-win rarity-weighted upgraded field | 63.5% | 13.4s | 2.23 | 1.31 | 0.0% | 0.0pp | — | rare | 0.0% | 62.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · HEART INK | rival-run-win rarity-weighted upgraded field | 65.1% | 19.0s | 2.32 | 1.29 | 0.0% | 0.0pp | — | uncommon | 0.0% | 82.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rival-run-win rarity-weighted upgraded field | 29.8% | 17.8s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 77.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rival-run-win rarity-weighted upgraded field | 28.7% | 17.8s | 2.01 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 79.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER TWIN | rival-run-win rarity-weighted upgraded field | 44.4% | 17.4s | 1.97 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 75.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rival-run-win rarity-weighted upgraded field | 50.0% | 13.7s | 1.94 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 61.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rival-run-win rarity-weighted upgraded field | 27.8% | 18.3s | 1.36 | 0.42 | 0.0% | 0.0pp | — | epic | 0.0% | 77.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rival-run-win rarity-weighted upgraded field | 79.4% | 13.6s | 2.01 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 62.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rival-run-win rarity-weighted upgraded field | 50.0% | 17.5s | 1.89 | 0.89 | 0.0% | 0.0pp | — | epic | 0.0% | 61.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rival-run-final-win rarity-weighted upgraded field | 54.8% | 14.2s | 2.37 | 1.31 | 0.0% | 0.0pp | — | common | 0.0% | 76.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rival-run-final-win rarity-weighted upgraded field | 55.1% | 13.5s | 1.92 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 55.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rival-run-final-win rarity-weighted upgraded field | 57.9% | 13.3s | 2.18 | 1.31 | 0.0% | 0.0pp | — | rare | 0.0% | 63.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ECHO MARK | rival-run-final-win rarity-weighted upgraded field | 69.7% | 18.7s | 2.01 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 85.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COUNTER SKETCH | rival-run-final-win rarity-weighted upgraded field | 73.7% | 18.6s | 2.02 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 85.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · HEART INK | rival-run-final-win rarity-weighted upgraded field | 63.4% | 18.9s | 2.28 | 1.25 | 0.0% | 0.0pp | — | uncommon | 0.0% | 78.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rival-run-final-win rarity-weighted upgraded field | 35.6% | 17.8s | 2.08 | 1.03 | 0.0% | 0.0pp | — | uncommon | 0.0% | 73.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rival-run-final-win rarity-weighted upgraded field | 33.2% | 17.7s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 72.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rival-run-final-win rarity-weighted upgraded field | 43.7% | 17.6s | 2.07 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 66.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rival-run-final-win rarity-weighted upgraded field | 55.1% | 13.6s | 1.95 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 54.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rival-run-final-win rarity-weighted upgraded field | 38.7% | 14.3s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 82.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rival-run-final-win rarity-weighted upgraded field | 49.5% | 18.9s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 90.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · DOUBLE DOODLE | rival-run-final-win rarity-weighted upgraded field | 52.5% | 18.8s | 2.01 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 88.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rival-run-final-win rarity-weighted upgraded field | 27.8% | 17.7s | 2.04 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 71.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rival-run-final-win rarity-weighted upgraded field | 51.9% | 18.1s | 2.08 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 79.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rival-run-final-win rarity-weighted upgraded field | 31.5% | 17.7s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 73.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rival-run-final-win rarity-weighted upgraded field | 54.3% | 13.4s | 1.97 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 53.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rival-run-final-win rarity-weighted upgraded field | 49.9% | 17.9s | 2.02 | 0.98 | 0.0% | 0.0pp | — | common | 0.0% | 76.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · LAST SCRIBBLE | rival-run-final-win rarity-weighted upgraded field | 61.7% | 19.0s | 1.72 | 0.71 | 0.0% | 0.0pp | — | epic | 0.0% | 93.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rival-run-final-win rarity-weighted upgraded field | 36.3% | 17.6s | 1.58 | 0.57 | 0.0% | 0.0pp | — | common | 0.0% | 71.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER SHIELD | rival-run-final-win rarity-weighted upgraded field | 48.0% | 18.9s | 2.04 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 92.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rival-run-final-win rarity-weighted upgraded field | 22.2% | 18.0s | 1.40 | 0.43 | 0.0% | 0.0pp | — | epic | 0.0% | 72.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rival-run-final-win rarity-weighted upgraded field | 56.7% | 17.6s | 2.01 | 0.97 | 0.0% | 0.0pp | — | epic | 0.0% | 68.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rival-run-final-win rarity-weighted upgraded field | 71.0% | 18.8s | 2.05 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 85.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rival-run-final-win rarity-weighted upgraded field | 73.9% | 13.5s | 1.97 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 64.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER TWIN | rival-run-final-win rarity-weighted upgraded field | 40.3% | 17.3s | 2.00 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 62.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | rumble-day-win rarity-weighted upgraded field | 54.9% | 14.3s | 2.38 | 1.31 | 0.0% | 0.0pp | — | common | 0.0% | 77.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | rumble-day-win rarity-weighted upgraded field | 53.9% | 13.4s | 1.94 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 53.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | rumble-day-win rarity-weighted upgraded field | 38.7% | 14.3s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 81.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COUNTER SKETCH | rumble-day-win rarity-weighted upgraded field | 75.4% | 18.6s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 84.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ECHO MARK | rumble-day-win rarity-weighted upgraded field | 71.6% | 18.7s | 2.02 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 84.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · DOUBLE DOODLE | rumble-day-win rarity-weighted upgraded field | 50.1% | 18.7s | 2.01 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 88.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | rumble-day-win rarity-weighted upgraded field | 35.4% | 17.8s | 2.06 | 1.02 | 0.0% | 0.0pp | — | uncommon | 0.0% | 73.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | rumble-day-win rarity-weighted upgraded field | 60.4% | 17.6s | 1.98 | 0.99 | 0.0% | 0.0pp | — | epic | 0.0% | 70.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | rumble-day-win rarity-weighted upgraded field | 35.9% | 17.6s | 1.61 | 0.60 | 0.0% | 0.0pp | — | common | 0.0% | 70.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | rumble-day-win rarity-weighted upgraded field | 49.1% | 18.9s | 2.01 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 89.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · LAST SCRIBBLE | rumble-day-win rarity-weighted upgraded field | 63.9% | 19.0s | 1.71 | 0.73 | 0.0% | 0.0pp | — | epic | 0.0% | 95.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | rumble-day-win rarity-weighted upgraded field | 45.7% | 17.8s | 2.02 | 0.97 | 0.0% | 0.0pp | — | common | 0.0% | 75.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | rumble-day-win rarity-weighted upgraded field | 53.0% | 18.2s | 2.01 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 84.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | rumble-day-win rarity-weighted upgraded field | 55.9% | 13.6s | 1.95 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 53.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER SHIELD | rumble-day-win rarity-weighted upgraded field | 53.8% | 18.9s | 2.04 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 91.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | rumble-day-win rarity-weighted upgraded field | 25.4% | 17.7s | 2.05 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 72.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | rumble-day-win rarity-weighted upgraded field | 34.2% | 17.7s | 2.03 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 73.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | rumble-day-win rarity-weighted upgraded field | 73.3% | 13.4s | 1.94 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 63.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · HEART INK | rumble-day-win rarity-weighted upgraded field | 62.0% | 18.9s | 2.28 | 1.25 | 0.0% | 0.0pp | — | uncommon | 0.0% | 79.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | rumble-day-win rarity-weighted upgraded field | 43.6% | 17.6s | 2.05 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 66.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | rumble-day-win rarity-weighted upgraded field | 56.4% | 13.3s | 2.17 | 1.31 | 0.0% | 0.0pp | — | rare | 0.0% | 63.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | rumble-day-win rarity-weighted upgraded field | 31.5% | 17.8s | 2.04 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 73.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | rumble-day-win rarity-weighted upgraded field | 27.8% | 17.9s | 1.47 | 0.47 | 0.0% | 0.0pp | — | epic | 0.0% | 72.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER TWIN | rumble-day-win rarity-weighted upgraded field | 40.4% | 17.3s | 2.04 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 64.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | rumble-day-win rarity-weighted upgraded field | 72.7% | 18.8s | 2.05 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 84.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | rumble-day-win rarity-weighted upgraded field | 53.4% | 13.5s | 1.92 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 53.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · WALLOP | champion-win rarity-weighted upgraded field | 52.4% | 13.2s | 2.10 | 1.32 | 0.0% | 0.0pp | — | rare | 0.0% | 64.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ECHO MARK | champion-win rarity-weighted upgraded field | 53.8% | 13.5s | 1.81 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 54.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · INK RAGE | champion-win rarity-weighted upgraded field | 72.7% | 13.5s | 1.85 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 65.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ENDLESS DRAFT | champion-win rarity-weighted upgraded field | 36.1% | 18.8s | 0.86 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 92.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · LAST SCRIBBLE | champion-win rarity-weighted upgraded field | 63.0% | 18.9s | 1.68 | 0.73 | 0.0% | 0.0pp | — | epic | 0.0% | 95.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · ECHO MARK | champion-win rarity-weighted upgraded field | 69.4% | 18.7s | 1.97 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 88.0% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · MASTERPIECE | champion-win rarity-weighted upgraded field | 14.6% | 17.3s | 0.82 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 63.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COMBO SPARK | champion-win rarity-weighted upgraded field | 31.5% | 17.4s | 1.47 | 0.54 | 0.0% | 0.0pp | — | common | 0.0% | 63.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ECHO MARK | champion-win rarity-weighted upgraded field | 27.7% | 17.5s | 1.98 | 1.00 | 0.0% | 0.0pp | — | rare | 0.0% | 67.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · PAPER SHIELD | champion-win rarity-weighted upgraded field | 32.9% | 14.2s | 1.85 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 80.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · DOUBLE DOODLE | champion-win rarity-weighted upgraded field | 54.3% | 18.7s | 1.97 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 90.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · INK RAGE | champion-win rarity-weighted upgraded field | 54.5% | 17.5s | 1.95 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 68.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER TWIN | champion-win rarity-weighted upgraded field | 36.5% | 17.1s | 2.03 | 1.00 | 0.0% | 0.0pp | — | epic | 0.0% | 53.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · DOUBLE DOODLE | champion-win rarity-weighted upgraded field | 51.6% | 13.5s | 1.84 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 54.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · COUNTER SKETCH | champion-win rarity-weighted upgraded field | 53.7% | 13.4s | 1.85 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 53.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · DOUBLE DOODLE | champion-win rarity-weighted upgraded field | 35.0% | 17.5s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 68.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · LAST SCRIBBLE | champion-win rarity-weighted upgraded field | 20.1% | 17.7s | 1.43 | 0.49 | 0.0% | 0.0pp | — | epic | 0.0% | 68.5% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · MASTERPIECE | champion-win rarity-weighted upgraded field | 32.5% | 13.9s | 0.61 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 79.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · COUNTER SKETCH | champion-win rarity-weighted upgraded field | 30.2% | 17.5s | 2.00 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 68.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COUNTER SKETCH | champion-win rarity-weighted upgraded field | 72.0% | 18.6s | 1.98 | 1.00 | 0.0% | 0.0pp | — | uncommon | 0.0% | 88.4% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · HEART INK | champion-win rarity-weighted upgraded field | 28.9% | 17.5s | 1.95 | 1.01 | 0.0% | 0.0pp | — | uncommon | 0.0% | 69.3% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · SMUDGE STEP | champion-win rarity-weighted upgraded field | 45.3% | 18.9s | 1.95 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 87.6% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · HEART INK | champion-win rarity-weighted upgraded field | 58.3% | 18.9s | 2.21 | 1.24 | 0.0% | 0.0pp | — | uncommon | 0.0% | 74.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · CENTER FOLD | champion-win rarity-weighted upgraded field | 41.0% | 17.7s | 2.00 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 70.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · ENDLESS DRAFT | champion-win rarity-weighted upgraded field | 23.2% | 17.4s | 0.82 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 63.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · ENDLESS DRAFT | champion-win rarity-weighted upgraded field | 33.7% | 14.0s | 0.74 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 76.8% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · EDGE SPRING | champion-win rarity-weighted upgraded field | 47.5% | 17.5s | 2.10 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 66.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · COMBO SPARK | champion-win rarity-weighted upgraded field | 65.1% | 18.8s | 1.94 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 88.1% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · MASTERPIECE | champion-win rarity-weighted upgraded field | 29.4% | 18.8s | 0.86 | 0.00 | 0.0% | 0.0pp | — | legendary | 0.0% | 97.2% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| longshot · PAPER SHIELD | champion-win rarity-weighted upgraded field | 52.8% | 18.9s | 1.97 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 88.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| brawler · SMUDGE STEP | champion-win rarity-weighted upgraded field | 33.3% | 13.8s | 2.33 | 1.28 | 0.0% | 0.0pp | — | common | 0.0% | 66.7% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |
| mage · PAPER SHIELD | champion-win rarity-weighted upgraded field | 40.7% | 17.9s | 2.11 | 1.00 | 0.0% | 0.0pp | — | common | 0.0% | 75.9% | 0.0% | INFO_REWARD_CARD_DIAGNOSTIC |

## Hard flags

- Brawler base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (50.9%, 14.0s avg)
- Longshot base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (57.1%, 18.9s avg)
- Mage base · equal reward vs exhibition-win rarity-weighted upgraded field: FLAG_REWARD_FIELD (42.8%, 17.9s avg)
- Brawler base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (51.6%, 14.0s avg)
- Longshot base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (57.4%, 18.9s avg)
- Mage base · equal reward vs rival-run-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (42.1%, 17.9s avg)
- Brawler base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (53.8%, 13.7s avg)
- Longshot base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (60.4%, 18.8s avg)
- Mage base · equal reward vs rival-run-final-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (37.0%, 17.7s avg)
- Brawler base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (52.5%, 13.7s avg)
- Longshot base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (61.4%, 18.8s avg)
- Mage base · equal reward vs rumble-day-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (36.6%, 17.7s avg)
- Brawler base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_CHOICE_SPREAD (55.9%, 13.5s avg)
- Longshot base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (62.1%, 18.8s avg)
- Mage base · equal reward vs champion-win rarity-weighted upgraded field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (32.2%, 17.5s avg)

## Watches

No watch-only rows from current thresholds.
