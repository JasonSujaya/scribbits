# Gear + Power-Up Interaction

Generated: 2026-07-15T11:56:22.561Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 63.3% | 14.1s | 0.00 | 0.00 | 51.2% | 12.2pp | — | 0.0% | 83.0% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 64.3% | 14.0s | 6.06 | 3.33 | 51.2% | 13.1pp | — | 0.0% | 72.6% | 0.0% | OK |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 66.7% | 13.9s | 6.06 | 3.33 | 64.3% | 2.4pp | -9.7pp | 0.0% | 72.5% | 0.0% | OK |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 64.0% | 13.8s | 6.06 | 3.33 | 51.2% | 12.9pp | — | 0.0% | 67.7% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 51.7% | 14.3s | 0.00 | 0.00 | 51.2% | 0.6pp | — | 0.0% | 76.8% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 34.3% | 14.5s | 5.81 | 3.00 | 51.2% | -16.9pp | — | 0.0% | 87.9% | 0.0% | OK |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 30.3% | 14.6s | 5.81 | 3.00 | 34.3% | -4.0pp | -4.5pp | 0.0% | 89.2% | 0.0% | OK |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 37.8% | 14.6s | 5.82 | 3.00 | 51.2% | -13.3pp | — | 0.0% | 83.0% | 0.0% | OK |
| Longshot guard · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 67.3% | 18.5s | 0.00 | 0.00 | 49.0% | 18.3pp | — | 0.0% | 76.7% | 0.0% | OK |
| Longshot guard · Skills only | Equal-Skills field | 41.9% | 18.9s | 6.06 | 3.00 | 49.0% | -7.1pp | — | 0.0% | 92.8% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 61.0% | 18.6s | 6.06 | 3.00 | 41.9% | 19.2pp | 0.9pp | 0.0% | 83.3% | 0.0% | OK |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 53.7% | 18.7s | 6.06 | 3.00 | 49.0% | 4.7pp | — | 0.0% | 85.2% | 0.0% | OK |
| Longshot pressure · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 60.6% | 18.7s | 0.00 | 0.00 | 49.0% | 11.6pp | — | 0.0% | 82.1% | 0.0% | OK |
| Longshot pressure · Skills only | Equal-Skills field | 51.7% | 18.8s | 6.11 | 3.00 | 49.0% | 2.7pp | — | 0.0% | 88.5% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 62.7% | 18.7s | 6.11 | 3.00 | 51.7% | 11.0pp | -0.6pp | 0.0% | 83.2% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 49.0% | 18.8s | 6.11 | 3.00 | 49.0% | -0.0pp | — | 0.0% | 84.2% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage combo · Skills only | Equal-Skills field | 53.4% | 18.2s | 5.84 | 2.68 | 52.8% | 0.6pp | — | 0.0% | 88.0% | 0.0% | OK |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 43.2% | 18.2s | 5.84 | 2.69 | 53.4% | -10.3pp | -9.8pp | 0.0% | 88.5% | 0.0% | OK |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 49.4% | 18.2s | 5.84 | 2.69 | 52.8% | -3.4pp | — | 0.0% | 88.6% | 0.0% | OK |
| Mage sustain · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage sustain · Skills only | Equal-Skills field | 59.5% | 18.3s | 6.14 | 3.00 | 52.8% | 6.7pp | — | 0.0% | 92.4% | 0.0% | OK |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 54.9% | 18.3s | 6.14 | 3.00 | 59.5% | -4.6pp | -4.2pp | 0.0% | 93.8% | 0.0% | OK |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 48.9% | 18.3s | 6.14 | 3.00 | 52.8% | -4.0pp | — | 0.0% | 93.4% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
