# Reward Path

Generated: 2026-07-15T10:17:19.464Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Choice spread | Rarity | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Brawler base · reward baseline | exhibition-win fixed field | 73.6% | 13.2s | 0.00 | 0.00 | 73.6% | 0.0pp | 10.0pp |  | 0.0% | 82.7% | 0.0% | OK |
| Brawler base · immediate reward | exhibition-win fixed field | 67.9% | 13.4s | 0.92 | 0.92 | 73.6% | -5.6pp | 10.0pp |  | 0.0% | 79.5% | 0.0% | OK |
| Brawler base · equal reward | exhibition-win equal-progression field | 69.2% | 13.4s | 1.90 | 0.94 | 73.6% | -4.3pp | 10.0pp |  | 0.0% | 78.8% | 0.0% | FLAG_REWARD_FIELD |
| Longshot base · reward baseline | exhibition-win fixed field | 46.1% | 18.3s | 0.00 | 0.00 | 46.1% | 0.0pp | 34.8pp |  | 0.0% | 89.3% | 0.0% | OK |
| Longshot base · immediate reward | exhibition-win fixed field | 47.7% | 18.4s | 1.00 | 1.00 | 46.1% | 1.6pp | 34.8pp |  | 0.0% | 92.2% | 0.0% | OK |
| Longshot base · equal reward | exhibition-win equal-progression field | 50.6% | 18.5s | 2.01 | 1.00 | 46.1% | 4.5pp | 34.8pp |  | 0.0% | 91.6% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | exhibition-win fixed field | 29.7% | 17.4s | 0.00 | 0.00 | 29.7% | 0.0pp | 13.5pp |  | 0.0% | 93.9% | 0.0% | OK |
| Mage base · immediate reward | exhibition-win fixed field | 36.8% | 17.4s | 0.93 | 0.93 | 29.7% | 7.1pp | 13.5pp |  | 0.0% | 89.1% | 0.0% | OK |
| Mage base · equal reward | exhibition-win equal-progression field | 29.7% | 17.5s | 1.91 | 0.97 | 29.7% | 0.0pp | 13.5pp |  | 0.0% | 86.7% | 0.0% | FLAG_REWARD_FIELD |
| Brawler base · reward baseline | rival-run-win fixed field | 73.6% | 13.2s | 0.00 | 0.00 | 73.6% | 0.0pp | 10.0pp |  | 0.0% | 82.7% | 0.0% | OK |
| Brawler base · immediate reward | rival-run-win fixed field | 68.4% | 13.4s | 0.92 | 0.92 | 73.6% | -5.2pp | 10.0pp |  | 0.0% | 79.9% | 0.0% | OK |
| Brawler base · equal reward | rival-run-win equal-progression field | 69.4% | 13.4s | 1.91 | 0.94 | 73.6% | -4.2pp | 10.0pp |  | 0.0% | 77.8% | 0.0% | FLAG_REWARD_FIELD |
| Longshot base · reward baseline | rival-run-win fixed field | 46.1% | 18.3s | 0.00 | 0.00 | 46.1% | 0.0pp | 34.8pp |  | 0.0% | 89.3% | 0.0% | OK |
| Longshot base · immediate reward | rival-run-win fixed field | 47.1% | 18.4s | 1.00 | 1.00 | 46.1% | 1.0pp | 34.8pp |  | 0.0% | 92.5% | 0.0% | OK |
| Longshot base · equal reward | rival-run-win equal-progression field | 50.7% | 18.5s | 2.03 | 0.99 | 46.1% | 4.6pp | 34.8pp |  | 0.0% | 91.9% | 0.0% | FLAG_REWARD_CHOICE_SPREAD |
| Mage base · reward baseline | rival-run-win fixed field | 29.7% | 17.4s | 0.00 | 0.00 | 29.7% | 0.0pp | 13.5pp |  | 0.0% | 93.9% | 0.0% | OK |
| Mage base · immediate reward | rival-run-win fixed field | 37.6% | 17.4s | 0.98 | 0.98 | 29.7% | 7.9pp | 13.5pp |  | 0.0% | 87.9% | 0.0% | OK |
| Mage base · equal reward | rival-run-win equal-progression field | 31.0% | 17.5s | 1.96 | 1.02 | 29.7% | 1.3pp | 13.5pp |  | 0.0% | 85.5% | 0.0% | FLAG_REWARD_FIELD |
| Brawler base · reward baseline | rival-run-final-win fixed field | 73.6% | 13.2s | 0.00 | 0.00 | 73.6% | 0.0pp | 4.7pp |  | 0.0% | 82.7% | 0.0% | OK |
| Brawler base · immediate reward | rival-run-final-win fixed field | 70.6% | 13.5s | 0.98 | 0.98 | 73.6% | -3.0pp | 4.7pp |  | 0.0% | 75.2% | 0.0% | OK |
| Brawler base · equal reward | rival-run-final-win equal-progression field | 73.0% | 13.5s | 1.90 | 0.98 | 73.6% | -0.6pp | 4.7pp |  | 0.0% | 76.9% | 0.0% | FLAG_REWARD_FIELD |
| Longshot base · reward baseline | rival-run-final-win fixed field | 46.1% | 18.3s | 0.00 | 0.00 | 46.1% | 0.0pp | 0.0pp |  | 0.0% | 89.3% | 0.0% | OK |
| Longshot base · immediate reward | rival-run-final-win fixed field | 47.1% | 18.3s | 0.97 | 0.97 | 46.1% | 1.0pp | 0.0pp |  | 0.0% | 92.1% | 0.0% | OK |
| Longshot base · equal reward | rival-run-final-win equal-progression field | 47.3% | 18.5s | 2.01 | 0.97 | 46.1% | 1.2pp | 0.0pp |  | 0.0% | 90.5% | 0.0% | OK |
| Mage base · reward baseline | rival-run-final-win fixed field | 29.7% | 17.4s | 0.00 | 0.00 | 29.7% | 0.0pp | 0.0pp |  | 0.0% | 93.9% | 0.0% | OK |
| Mage base · immediate reward | rival-run-final-win fixed field | 36.8% | 17.5s | 0.95 | 0.95 | 29.7% | 7.2pp | 0.0pp |  | 0.0% | 90.5% | 0.0% | OK |
| Mage base · equal reward | rival-run-final-win equal-progression field | 30.4% | 17.6s | 1.97 | 0.98 | 29.7% | 0.7pp | 0.0pp |  | 0.0% | 85.1% | 0.0% | FLAG_REWARD_FIELD |
| Brawler base · reward baseline | rumble-day-win fixed field | 73.6% | 13.2s | 0.00 | 0.00 | 73.6% | 0.0pp | 10.0pp |  | 0.0% | 82.7% | 0.0% | OK |
| Brawler base · immediate reward | rumble-day-win fixed field | 70.7% | 13.5s | 0.97 | 0.97 | 73.6% | -2.8pp | 10.0pp |  | 0.0% | 76.0% | 0.0% | OK |
| Brawler base · equal reward | rumble-day-win equal-progression field | 73.5% | 13.4s | 1.90 | 0.98 | 73.6% | -0.1pp | 10.0pp |  | 0.0% | 76.5% | 0.0% | FLAG_REWARD_FIELD |
| Longshot base · reward baseline | rumble-day-win fixed field | 46.1% | 18.3s | 0.00 | 0.00 | 46.1% | 0.0pp | 0.0pp |  | 0.0% | 89.3% | 0.0% | OK |
| Longshot base · immediate reward | rumble-day-win fixed field | 46.2% | 18.3s | 0.97 | 0.97 | 46.1% | 0.1pp | 0.0pp |  | 0.0% | 91.7% | 0.0% | OK |
| Longshot base · equal reward | rumble-day-win equal-progression field | 46.3% | 18.5s | 2.00 | 0.97 | 46.1% | 0.2pp | 0.0pp |  | 0.0% | 90.0% | 0.0% | OK |
| Mage base · reward baseline | rumble-day-win fixed field | 29.7% | 17.4s | 0.00 | 0.00 | 29.7% | 0.0pp | 100.0pp |  | 0.0% | 93.9% | 0.0% | OK |
| Mage base · immediate reward | rumble-day-win fixed field | 36.1% | 17.4s | 0.93 | 0.93 | 29.7% | 6.4pp | 100.0pp |  | 0.0% | 91.4% | 0.0% | OK |
| Mage base · equal reward | rumble-day-win equal-progression field | 30.4% | 17.6s | 1.94 | 0.96 | 29.7% | 0.7pp | 100.0pp |  | 0.0% | 86.2% | 0.0% | FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD |
| Brawler base · reward baseline | champion-win fixed field | 73.6% | 13.2s | 0.00 | 0.00 | 73.6% | 0.0pp | 7.1pp |  | 0.0% | 82.7% | 0.0% | OK |
| Brawler base · immediate reward | champion-win fixed field | 73.9% | 13.5s | 0.95 | 0.95 | 73.6% | 0.3pp | 7.1pp |  | 0.0% | 70.0% | 0.0% | OK |
| Brawler base · equal reward | champion-win equal-progression field | 77.6% | 13.5s | 1.70 | 0.95 | 73.6% | 4.0pp | 7.1pp |  | 0.0% | 73.4% | 0.0% | FLAG_REWARD_FIELD |
| Longshot base · reward baseline | champion-win fixed field | 46.1% | 18.3s | 0.00 | 0.00 | 46.1% | 0.0pp | 17.3pp |  | 0.0% | 89.3% | 0.0% | OK |
| Longshot base · immediate reward | champion-win fixed field | 50.2% | 18.3s | 0.78 | 0.78 | 46.1% | 4.1pp | 17.3pp |  | 0.0% | 92.2% | 0.0% | OK |
| Longshot base · equal reward | champion-win equal-progression field | 42.1% | 18.4s | 1.73 | 0.79 | 46.1% | -3.9pp | 17.3pp |  | 0.0% | 88.2% | 0.0% | FLAG_REWARD_FIELD |
| Mage base · reward baseline | champion-win fixed field | 29.7% | 17.4s | 0.00 | 0.00 | 29.7% | 0.0pp | 0.0pp |  | 0.0% | 93.9% | 0.0% | OK |
| Mage base · immediate reward | champion-win fixed field | 35.5% | 17.4s | 0.79 | 0.79 | 29.7% | 5.9pp | 0.0pp |  | 0.0% | 92.5% | 0.0% | OK |
| Mage base · equal reward | champion-win equal-progression field | 30.7% | 17.7s | 1.69 | 0.82 | 29.7% | 1.1pp | 0.0pp |  | 0.0% | 84.1% | 0.0% | FLAG_REWARD_FIELD |
| brawler · PAPER SHIELD | Paired no-Power-Up field | 68.5% | 13.3s | 1.00 | 1.00 | 74.2% | -5.7pp | — | common | 0.0% | 79.6% | 0.0% | FLAG_HARMFUL_OFFER |
| brawler · SMUDGE STEP | Paired no-Power-Up field | 62.4% | 13.5s | 0.72 | 0.72 | 73.3% | -11.0pp | — | common | 0.0% | 87.2% | 0.0% | FLAG_HARMFUL_OFFER |
| brawler · DOUBLE DOODLE | Paired no-Power-Up field | 72.7% | 13.4s | 1.00 | 1.00 | 73.6% | -1.0pp | — | uncommon | 0.0% | 74.6% | 0.0% | WATCH_LOW_IMPACT_OFFER |
| longshot · CENTER FOLD | Paired no-Power-Up field | 33.2% | 18.4s | 1.00 | 1.00 | 45.9% | -12.7pp | — | common | 0.0% | 88.7% | 0.0% | FLAG_HARMFUL_OFFER |
| longshot · SMUDGE STEP | Paired no-Power-Up field | 67.5% | 18.6s | 1.00 | 1.00 | 45.4% | 22.1pp | — | common | 0.0% | 96.3% | 0.0% | FLAG_RARITY_OVERPOWERED |
| longshot · COUNTER SKETCH | Paired no-Power-Up field | 46.0% | 18.2s | 1.00 | 1.00 | 46.2% | -0.1pp | — | uncommon | 0.0% | 92.0% | 0.0% | WATCH_LOW_IMPACT_OFFER |
| mage · COUNTER SKETCH | Paired no-Power-Up field | 36.2% | 17.4s | 1.00 | 1.00 | 30.8% | 5.4pp | — | uncommon | 0.0% | 92.9% | 0.0% | OK |
| mage · COMBO SPARK | Paired no-Power-Up field | 33.6% | 17.3s | 0.32 | 0.32 | 29.6% | 4.0pp | — | common | 0.0% | 94.6% | 0.0% | OK |
| mage · EDGE SPRING | Paired no-Power-Up field | 47.8% | 17.5s | 1.67 | 1.67 | 30.3% | 17.5pp | — | common | 0.0% | 66.5% | 0.0% | OK |
| longshot · COMBO SPARK | Paired no-Power-Up field | 40.2% | 18.1s | 1.00 | 1.00 | 46.9% | -6.7pp | — | common | 0.0% | 93.8% | 0.0% | FLAG_HARMFUL_OFFER |
| mage · ECHO MARK | Paired no-Power-Up field | 35.8% | 17.5s | 1.00 | 1.00 | 29.8% | 6.0pp | — | rare | 0.0% | 93.1% | 0.0% | OK |
| mage · CENTER FOLD | Paired no-Power-Up field | 33.3% | 17.5s | 1.00 | 1.00 | 29.3% | 3.9pp | — | common | 0.0% | 93.6% | 0.0% | OK |
| brawler · WALLOP | Paired no-Power-Up field | 80.2% | 13.8s | 1.33 | 1.33 | 73.8% | 6.4pp | — | rare | 0.0% | 54.5% | 0.0% | OK |
| brawler · ECHO MARK | Paired no-Power-Up field | 70.3% | 13.4s | 1.00 | 1.00 | 71.0% | -0.7pp | — | rare | 0.0% | 76.5% | 0.0% | WATCH_LOW_IMPACT_OFFER |
| longshot · HEART INK | Paired no-Power-Up field | 34.3% | 18.3s | 1.10 | 1.10 | 45.8% | -11.5pp | — | uncommon | 0.0% | 87.1% | 0.0% | FLAG_HARMFUL_OFFER |
| longshot · ECHO MARK | Paired no-Power-Up field | 46.1% | 18.2s | 1.00 | 1.00 | 45.7% | 0.5pp | — | rare | 0.0% | 92.4% | 0.0% | WATCH_LOW_IMPACT_OFFER |
| mage · HEART INK | Paired no-Power-Up field | 33.5% | 17.4s | 0.73 | 0.73 | 29.1% | 4.4pp | — | uncommon | 0.0% | 94.0% | 0.0% | OK |
| mage · PAPER SHIELD | Paired no-Power-Up field | 35.1% | 17.3s | 1.00 | 1.00 | 28.9% | 6.2pp | — | common | 0.0% | 98.4% | 0.0% | OK |
| longshot · DOUBLE DOODLE | Paired no-Power-Up field | 46.2% | 18.2s | 1.00 | 1.00 | 46.9% | -0.7pp | — | uncommon | 0.0% | 91.8% | 0.0% | WATCH_LOW_IMPACT_OFFER |
| mage · DOUBLE DOODLE | Paired no-Power-Up field | 36.1% | 17.5s | 1.00 | 1.00 | 29.6% | 6.5pp | — | uncommon | 0.0% | 93.0% | 0.0% | OK |
| brawler · INK RAGE | Paired no-Power-Up field | 69.0% | 13.1s | 1.00 | 1.00 | 74.9% | -5.9pp | — | epic | 0.0% | 75.3% | 0.0% | FLAG_HARMFUL_OFFER |
| brawler · LAST SCRIBBLE | Paired no-Power-Up field | 80.5% | 13.4s | 0.15 | 0.15 | 69.5% | 11.0pp | — | epic | 0.0% | 85.0% | 0.0% | OK |
| longshot · LAST SCRIBBLE | Paired no-Power-Up field | 63.8% | 18.5s | 0.43 | 0.43 | 46.7% | 17.1pp | — | epic | 0.0% | 94.9% | 0.0% | OK |
| mage · PAPER TWIN | Paired no-Power-Up field | 38.2% | 17.5s | 1.00 | 1.00 | 26.6% | 11.6pp | — | epic | 0.0% | 93.3% | 0.0% | OK |
| brawler · PAPER TWIN | Paired no-Power-Up field | 72.9% | 13.8s | 1.00 | 1.00 | 75.1% | -2.2pp | — | epic | 0.0% | 61.8% | 0.0% | FLAG_HARMFUL_OFFER |
| mage · LAST SCRIBBLE | Paired no-Power-Up field | 34.6% | 17.5s | 0.13 | 0.13 | 30.1% | 4.5pp | — | epic | 0.0% | 95.1% | 0.0% | OK |
| mage · INK RAGE | Paired no-Power-Up field | 39.1% | 17.3s | 1.00 | 1.00 | 30.6% | 8.6pp | — | epic | 0.0% | 91.4% | 0.0% | OK |
| longshot · ENDLESS DRAFT | Paired no-Power-Up field | 44.0% | 18.3s | 0.00 | 0.00 | 44.0% | 0.0pp | — | legendary | 0.0% | 85.7% | 0.0% | INFO_COMBO_ONLY |
| mage · MASTERPIECE | Paired no-Power-Up field | 27.3% | 17.5s | 0.00 | 0.00 | 27.3% | 0.0pp | — | legendary | 0.0% | 93.9% | 0.0% | INFO_COMBO_ONLY |
| mage · ENDLESS DRAFT | Paired no-Power-Up field | 33.3% | 17.4s | 0.00 | 0.00 | 33.3% | 0.0pp | — | legendary | 0.0% | 93.9% | 0.0% | INFO_COMBO_ONLY |
| brawler · ENDLESS DRAFT | Paired no-Power-Up field | 75.0% | 13.2s | 0.00 | 0.00 | 75.0% | 0.0pp | — | legendary | 0.0% | 79.2% | 0.0% | INFO_COMBO_ONLY |
| longshot · MASTERPIECE | Paired no-Power-Up field | 51.7% | 18.4s | 0.00 | 0.00 | 51.7% | 0.0pp | — | legendary | 0.0% | 90.0% | 0.0% | INFO_COMBO_ONLY |
| brawler · MASTERPIECE | Paired no-Power-Up field | 76.7% | 13.0s | 0.00 | 0.00 | 76.7% | 0.0pp | — | legendary | 0.0% | 83.3% | 0.0% | INFO_COMBO_ONLY |

## Hard flags

- Brawler base · equal reward vs exhibition-win equal-progression field: FLAG_REWARD_FIELD (69.2%, 13.4s avg)
- Longshot base · equal reward vs exhibition-win equal-progression field: FLAG_REWARD_CHOICE_SPREAD (50.6%, 18.5s avg)
- Mage base · equal reward vs exhibition-win equal-progression field: FLAG_REWARD_FIELD (29.7%, 17.5s avg)
- Brawler base · equal reward vs rival-run-win equal-progression field: FLAG_REWARD_FIELD (69.4%, 13.4s avg)
- Longshot base · equal reward vs rival-run-win equal-progression field: FLAG_REWARD_CHOICE_SPREAD (50.7%, 18.5s avg)
- Mage base · equal reward vs rival-run-win equal-progression field: FLAG_REWARD_FIELD (31.0%, 17.5s avg)
- Brawler base · equal reward vs rival-run-final-win equal-progression field: FLAG_REWARD_FIELD (73.0%, 13.5s avg)
- Mage base · equal reward vs rival-run-final-win equal-progression field: FLAG_REWARD_FIELD (30.4%, 17.6s avg)
- Brawler base · equal reward vs rumble-day-win equal-progression field: FLAG_REWARD_FIELD (73.5%, 13.4s avg)
- Mage base · equal reward vs rumble-day-win equal-progression field: FLAG_REWARD_FIELD+FLAG_REWARD_CHOICE_SPREAD (30.4%, 17.6s avg)
- Brawler base · equal reward vs champion-win equal-progression field: FLAG_REWARD_FIELD (77.6%, 13.5s avg)
- Longshot base · equal reward vs champion-win equal-progression field: FLAG_REWARD_FIELD (42.1%, 18.4s avg)
- Mage base · equal reward vs champion-win equal-progression field: FLAG_REWARD_FIELD (30.7%, 17.7s avg)
- brawler · PAPER SHIELD vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (68.5%, 13.3s avg)
- brawler · SMUDGE STEP vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (62.4%, 13.5s avg)
- longshot · CENTER FOLD vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (33.2%, 18.4s avg)
- longshot · SMUDGE STEP vs Paired no-Power-Up field: FLAG_RARITY_OVERPOWERED (67.5%, 18.6s avg)
- longshot · COMBO SPARK vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (40.2%, 18.1s avg)
- longshot · HEART INK vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (34.3%, 18.3s avg)
- brawler · INK RAGE vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (69.0%, 13.1s avg)
- brawler · PAPER TWIN vs Paired no-Power-Up field: FLAG_HARMFUL_OFFER (72.9%, 13.8s avg)

## Watches

- brawler · DOUBLE DOODLE vs Paired no-Power-Up field: WATCH_LOW_IMPACT_OFFER (72.7%, 13.4s avg)
- longshot · COUNTER SKETCH vs Paired no-Power-Up field: WATCH_LOW_IMPACT_OFFER (46.0%, 18.2s avg)
- brawler · ECHO MARK vs Paired no-Power-Up field: WATCH_LOW_IMPACT_OFFER (70.3%, 13.4s avg)
- longshot · ECHO MARK vs Paired no-Power-Up field: WATCH_LOW_IMPACT_OFFER (46.1%, 18.2s avg)
- longshot · DOUBLE DOODLE vs Paired no-Power-Up field: WATCH_LOW_IMPACT_OFFER (46.2%, 18.2s avg)
