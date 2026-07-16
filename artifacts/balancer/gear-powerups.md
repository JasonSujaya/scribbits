# Gear + Power-Up Interaction

Generated: 2026-07-16T10:16:16.189Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 63.3% | 14.1s | 0.00 | 0.00 | 51.2% | 12.2pp | — | 0.0% | 83.0% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 72.1% | 13.5s | 6.09 | 3.26 | 51.2% | 20.9pp | — | 0.0% | 66.4% | 0.0% | FLAG_GEAR_META |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 72.1% | 13.5s | 6.09 | 3.26 | 72.1% | 0.0pp | -12.2pp | 0.0% | 66.4% | 0.0% | OK |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 68.5% | 13.6s | 6.09 | 3.25 | 51.2% | 17.3pp | — | 0.0% | 66.6% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 51.7% | 14.3s | 0.00 | 0.00 | 51.2% | 0.6pp | — | 0.0% | 76.8% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 54.4% | 14.1s | 6.17 | 3.33 | 51.2% | 3.2pp | — | 0.0% | 55.8% | 0.0% | OK |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 56.1% | 14.2s | 6.17 | 3.33 | 54.4% | 1.8pp | 1.2pp | 0.0% | 57.0% | 0.0% | OK |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 64.6% | 14.3s | 6.17 | 3.33 | 51.2% | 13.4pp | — | 0.0% | 56.0% | 0.0% | OK |
| Longshot guard · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 67.3% | 18.5s | 0.00 | 0.00 | 49.0% | 18.3pp | — | 0.0% | 76.7% | 0.0% | OK |
| Longshot guard · Skills only | Equal-Skills field | 56.2% | 18.9s | 6.17 | 3.00 | 49.0% | 7.2pp | — | 0.0% | 92.0% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 79.5% | 18.8s | 6.17 | 3.00 | 56.2% | 23.4pp | 5.1pp | 0.0% | 90.8% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 71.5% | 18.8s | 6.17 | 3.00 | 49.0% | 22.5pp | — | 0.0% | 91.7% | 0.0% | FLAG_GEAR_META |
| Longshot pressure · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 60.6% | 18.7s | 0.00 | 0.00 | 49.0% | 11.6pp | — | 0.0% | 82.1% | 0.0% | OK |
| Longshot pressure · Skills only | Equal-Skills field | 43.7% | 18.7s | 6.17 | 3.00 | 49.0% | -5.3pp | — | 0.0% | 80.7% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 49.5% | 18.6s | 6.17 | 3.00 | 43.7% | 5.8pp | -5.8pp | 0.0% | 80.2% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 38.6% | 18.7s | 6.17 | 3.00 | 49.0% | -10.4pp | — | 0.0% | 85.7% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage combo · Skills only | Equal-Skills field | 13.9% | 17.2s | 5.56 | 2.56 | 52.8% | -38.9pp | — | 0.0% | 54.5% | 0.0% | FLAG_GEAR_META |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 8.6% | 17.4s | 5.65 | 2.57 | 13.9% | -5.3pp | -4.9pp | 0.0% | 59.3% | 0.0% | FLAG_HARMFUL_GEAR_INTERACTION |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 14.8% | 17.4s | 5.74 | 2.65 | 52.8% | -38.1pp | — | 0.0% | 59.8% | 0.0% | FLAG_GEAR_META |
| Mage sustain · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage sustain · Skills only | Equal-Skills field | 57.5% | 17.9s | 6.13 | 3.00 | 52.8% | 4.6pp | — | 0.0% | 71.5% | 0.0% | OK |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 50.1% | 17.9s | 6.15 | 3.00 | 57.5% | -7.4pp | -7.0pp | 0.0% | 71.8% | 0.0% | OK |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 42.3% | 17.9s | 6.15 | 3.00 | 52.8% | -10.6pp | — | 0.0% | 72.5% | 0.0% | OK |

## Hard flags

- Brawler pressure · Skills only vs Equal-Skills field: FLAG_GEAR_META (72.1%, 13.5s avg)
- Longshot guard · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (79.5%, 18.8s avg)
- Longshot guard · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (71.5%, 18.8s avg)
- Mage combo · Skills only vs Equal-Skills field: FLAG_GEAR_META (13.9%, 17.2s avg)
- Mage combo · Target Gear + equal Skills vs Equal-Skills field: FLAG_HARMFUL_GEAR_INTERACTION (8.6%, 17.4s avg)
- Mage combo · Equal Gear + Skills vs Equal Gear + Skills field: FLAG_GEAR_META (14.8%, 17.4s avg)

## Watches

No watch-only rows from current thresholds.
