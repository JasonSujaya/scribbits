# Gear + Power-Up Interaction

Generated: 2026-07-17T01:30:06.334Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 51.5% | 16.0s | 0.00 | 0.00 | 51.5% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 51.5% | 16.0s | 0.00 | 0.00 | 51.5% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 67.5% | 14.8s | 7.24 | 4.00 | 51.5% | 16.0pp | — | 1.8% | 53.9% | 0.0% | OK |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 67.5% | 14.7s | 7.24 | 4.00 | 67.5% | 0.0pp | 0.0pp | 1.8% | 53.9% | 0.0% | OK |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 54.2% | 14.9s | 7.33 | 4.00 | 51.5% | 2.7pp | — | 0.0% | 60.7% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 51.5% | 16.0s | 0.00 | 0.00 | 51.5% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 67.8% | 16.0s | 0.00 | 0.00 | 51.5% | 16.2pp | — | 0.1% | 78.3% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 38.0% | 16.1s | 6.74 | 3.22 | 51.5% | -13.5pp | — | 0.0% | 75.2% | 0.0% | OK |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 66.1% | 15.9s | 6.83 | 3.32 | 38.0% | 28.1pp | 11.8pp | 0.4% | 75.2% | 0.0% | OK |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 56.1% | 15.9s | 6.82 | 3.32 | 51.5% | 4.6pp | — | 0.0% | 71.6% | 0.0% | OK |
| Longshot guard · Baseline | Fixed no-Gear field | 49.3% | 19.6s | 0.00 | 0.00 | 49.3% | 0.0pp | — | 66.7% | 80.8% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 80.8% | 19.4s | 0.00 | 0.00 | 49.3% | 31.4pp | — | 66.7% | 71.7% | 0.0% | FLAG_GEAR_FIELD |
| Longshot guard · Skills only | Equal-Skills field | 38.6% | 19.5s | 4.66 | 2.53 | 49.3% | -10.7pp | — | 68.6% | 90.3% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 37.9% | 19.5s | 4.72 | 2.51 | 38.6% | -0.7pp | -32.1pp | 66.7% | 89.5% | 0.0% | OK |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 26.3% | 19.4s | 4.68 | 2.51 | 49.3% | -23.0pp | — | 66.7% | 80.0% | 0.0% | FLAG_GEAR_META |
| Longshot pressure · Baseline | Fixed no-Gear field | 49.3% | 19.6s | 0.00 | 0.00 | 49.3% | 0.0pp | — | 66.7% | 80.8% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 75.0% | 19.4s | 0.00 | 0.00 | 49.3% | 25.7pp | — | 66.7% | 71.8% | 0.0% | OK |
| Longshot pressure · Skills only | Equal-Skills field | 43.1% | 19.4s | 4.23 | 2.07 | 49.3% | -6.2pp | — | 66.7% | 93.7% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 62.9% | 19.4s | 4.18 | 2.01 | 43.1% | 19.8pp | -5.9pp | 66.7% | 94.3% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 51.2% | 19.4s | 4.17 | 2.00 | 49.3% | 1.9pp | — | 66.7% | 99.3% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 53.0% | 19.4s | 0.00 | 0.00 | 53.0% | 0.0pp | — | 38.0% | 99.9% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 79.9% | 19.5s | 0.00 | 0.00 | 53.0% | 26.9pp | — | 45.2% | 99.9% | 0.0% | OK |
| Mage combo · Skills only | Equal-Skills field | 40.9% | 18.7s | 5.12 | 2.29 | 53.0% | -12.1pp | — | 50.6% | 71.5% | 0.0% | OK |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 38.0% | 18.8s | 5.17 | 2.34 | 40.9% | -2.8pp | -29.8pp | 52.8% | 70.8% | 0.0% | OK |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 39.2% | 18.6s | 5.17 | 2.34 | 53.0% | -13.8pp | — | 54.6% | 58.2% | 0.0% | OK |
| Mage sustain · Baseline | Fixed no-Gear field | 53.0% | 19.4s | 0.00 | 0.00 | 53.0% | 0.0pp | — | 38.0% | 99.9% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 79.9% | 19.5s | 0.00 | 0.00 | 53.0% | 26.9pp | — | 45.2% | 99.9% | 0.0% | OK |
| Mage sustain · Skills only | Equal-Skills field | 72.8% | 19.1s | 5.46 | 2.62 | 53.0% | 19.8pp | — | 52.2% | 71.8% | 0.0% | FLAG_GEAR_META |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 83.0% | 19.2s | 5.46 | 2.62 | 72.8% | 10.3pp | -16.7pp | 53.9% | 72.4% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 74.1% | 19.2s | 5.52 | 2.67 | 53.0% | 21.1pp | — | 54.5% | 72.3% | 0.0% | FLAG_GEAR_META |

## Hard flags

- Longshot guard · Gear only vs Fixed no-Gear field: FLAG_GEAR_FIELD (80.8%, 19.4s avg)
- Longshot guard · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (26.3%, 19.4s avg)
- Mage sustain · Skills only vs Equal-Skills field: FLAG_GEAR_META (72.8%, 19.1s avg)
- Mage sustain · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (83.0%, 19.2s avg)
- Mage sustain · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (74.1%, 19.2s avg)

## Watches

No watch-only rows from current thresholds.
