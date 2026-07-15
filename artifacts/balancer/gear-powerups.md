# Gear + Power-Up Interaction

Generated: 2026-07-15T10:14:55.529Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 75.3% | 13.3s | 0.00 | 0.00 | 75.3% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 75.3% | 13.2s | 0.00 | 0.00 | 75.3% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 78.7% | 13.6s | 4.68 | 2.25 | 75.3% | 3.4pp | — | 0.0% | 77.2% | 0.0% | FLAG_GEAR_META |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 78.7% | 13.5s | 4.68 | 2.25 | 78.7% | 0.0pp | 0.0pp | 0.0% | 77.2% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 67.6% | 13.5s | 4.57 | 2.12 | 75.3% | -7.8pp | — | 0.0% | 80.8% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 75.3% | 13.3s | 0.00 | 0.00 | 75.3% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 67.9% | 13.3s | 0.00 | 0.00 | 75.3% | -7.4pp | — | 0.0% | 61.8% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 70.5% | 13.4s | 5.14 | 2.77 | 75.3% | -4.9pp | — | 0.0% | 70.4% | 0.0% | FLAG_GEAR_META |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 79.7% | 13.5s | 5.21 | 2.85 | 70.5% | 9.3pp | 16.7pp | 0.0% | 43.6% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 74.2% | 13.5s | 5.10 | 2.71 | 75.3% | -1.2pp | — | 0.0% | 76.2% | 0.0% | FLAG_GEAR_META |
| Longshot guard · Baseline | Fixed no-Gear field | 44.0% | 18.4s | 0.00 | 0.00 | 44.0% | 0.0pp | — | 0.0% | 87.8% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 59.1% | 17.6s | 0.00 | 0.00 | 44.0% | 15.1pp | — | 0.0% | 96.4% | 0.0% | OK |
| Longshot guard · Skills only | Equal-Skills field | 46.0% | 18.5s | 5.58 | 3.00 | 44.0% | 2.0pp | — | 0.0% | 88.6% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 66.8% | 17.8s | 5.47 | 3.00 | 46.0% | 20.8pp | 5.7pp | 0.0% | 89.3% | 0.0% | OK |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 58.3% | 17.8s | 5.47 | 3.00 | 44.0% | 14.3pp | — | 0.0% | 84.5% | 0.0% | OK |
| Longshot pressure · Baseline | Fixed no-Gear field | 44.0% | 18.4s | 0.00 | 0.00 | 44.0% | 0.0pp | — | 0.0% | 87.8% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 36.6% | 18.2s | 0.00 | 0.00 | 44.0% | -7.4pp | — | 0.0% | 100.0% | 0.0% | OK |
| Longshot pressure · Skills only | Equal-Skills field | 44.4% | 18.6s | 4.71 | 2.09 | 44.0% | 0.4pp | — | 0.0% | 90.4% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 48.7% | 18.4s | 4.52 | 2.07 | 44.4% | 4.3pp | 11.8pp | 0.0% | 91.3% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 41.4% | 18.2s | 4.52 | 2.07 | 44.0% | -2.6pp | — | 0.0% | 88.0% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 30.7% | 17.4s | 0.00 | 0.00 | 30.7% | 0.0pp | — | 0.0% | 92.9% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 23.5% | 17.5s | 0.00 | 0.00 | 30.7% | -7.2pp | — | 0.0% | 92.8% | 0.0% | FLAG_GEAR_FIELD |
| Mage combo · Skills only | Equal-Skills field | 28.5% | 17.7s | 5.17 | 2.49 | 30.7% | -2.2pp | — | 0.0% | 83.5% | 0.0% | FLAG_GEAR_META |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 22.0% | 17.7s | 5.18 | 2.50 | 28.5% | -6.5pp | 0.7pp | 0.0% | 89.7% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 26.8% | 17.7s | 5.18 | 2.50 | 30.7% | -3.8pp | — | 0.0% | 86.3% | 0.0% | FLAG_GEAR_META |
| Mage sustain · Baseline | Fixed no-Gear field | 30.7% | 17.4s | 0.00 | 0.00 | 30.7% | 0.0pp | — | 0.0% | 92.9% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 23.5% | 17.5s | 0.00 | 0.00 | 30.7% | -7.2pp | — | 0.0% | 92.8% | 0.0% | FLAG_GEAR_FIELD |
| Mage sustain · Skills only | Equal-Skills field | 32.0% | 17.7s | 5.45 | 2.76 | 30.7% | 1.4pp | — | 0.0% | 84.0% | 0.0% | OK |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 24.5% | 17.8s | 5.47 | 2.76 | 32.0% | -7.6pp | -0.4pp | 0.0% | 90.1% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 31.8% | 17.8s | 5.47 | 2.76 | 30.7% | 1.1pp | — | 0.0% | 90.1% | 0.0% | OK |

## Hard flags

- Brawler pressure · Skills only vs Equal-Skills field: FLAG_GEAR_META (78.7%, 13.6s avg)
- Brawler pressure · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (78.7%, 13.5s avg)
- Brawler sustain · Skills only vs Equal-Skills field: FLAG_GEAR_META (70.5%, 13.4s avg)
- Brawler sustain · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (79.7%, 13.5s avg)
- Brawler sustain · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (74.2%, 13.5s avg)
- Mage combo · Gear only vs Fixed no-Gear field: FLAG_GEAR_FIELD (23.5%, 17.5s avg)
- Mage combo · Skills only vs Equal-Skills field: FLAG_GEAR_META (28.5%, 17.7s avg)
- Mage combo · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (22.0%, 17.7s avg)
- Mage combo · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (26.8%, 17.7s avg)
- Mage sustain · Gear only vs Fixed no-Gear field: FLAG_GEAR_FIELD (23.5%, 17.5s avg)
- Mage sustain · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (24.5%, 17.8s avg)

## Watches

No watch-only rows from current thresholds.
