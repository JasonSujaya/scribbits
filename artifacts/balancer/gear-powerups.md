# Gear + Power-Up Interaction

Generated: 2026-07-15T11:51:12.271Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 63.3% | 14.1s | 0.00 | 0.00 | 51.2% | 12.2pp | — | 0.0% | 83.0% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 54.9% | 14.3s | 6.09 | 3.33 | 51.2% | 3.7pp | — | 0.0% | 74.3% | 0.0% | OK |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 68.4% | 14.2s | 6.09 | 3.33 | 54.9% | 13.5pp | 1.3pp | 0.0% | 62.9% | 0.0% | OK |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 64.0% | 14.2s | 6.09 | 3.33 | 51.2% | 12.8pp | — | 0.0% | 74.8% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 51.2% | 14.2s | 0.00 | 0.00 | 51.2% | 0.0pp | — | 0.0% | 83.1% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 51.7% | 14.3s | 0.00 | 0.00 | 51.2% | 0.6pp | — | 0.0% | 76.8% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 31.8% | 14.5s | 5.81 | 3.00 | 51.2% | -19.4pp | — | 0.0% | 87.5% | 0.0% | OK |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 38.0% | 14.6s | 5.81 | 3.00 | 31.8% | 6.3pp | 5.7pp | 0.0% | 89.2% | 0.0% | OK |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 46.0% | 14.7s | 5.82 | 3.00 | 51.2% | -5.2pp | — | 0.0% | 83.0% | 0.0% | OK |
| Longshot guard · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 67.3% | 18.5s | 0.00 | 0.00 | 49.0% | 18.3pp | — | 0.0% | 76.7% | 0.0% | OK |
| Longshot guard · Skills only | Equal-Skills field | 39.8% | 18.9s | 6.06 | 3.00 | 49.0% | -9.2pp | — | 0.0% | 92.3% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 53.9% | 18.7s | 6.06 | 3.00 | 39.8% | 14.1pp | -4.1pp | 0.0% | 82.7% | 0.0% | OK |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 47.3% | 18.8s | 6.06 | 3.00 | 49.0% | -1.7pp | — | 0.0% | 86.0% | 0.0% | OK |
| Longshot pressure · Baseline | Fixed no-Gear field | 49.0% | 18.8s | 0.00 | 0.00 | 49.0% | 0.0pp | — | 0.0% | 90.3% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 60.6% | 18.7s | 0.00 | 0.00 | 49.0% | 11.6pp | — | 0.0% | 82.1% | 0.0% | OK |
| Longshot pressure · Skills only | Equal-Skills field | 53.4% | 18.9s | 6.11 | 3.00 | 49.0% | 4.4pp | — | 0.0% | 88.5% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 58.5% | 18.8s | 6.11 | 3.00 | 53.4% | 5.2pp | -6.4pp | 0.0% | 83.3% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 44.8% | 18.8s | 6.11 | 3.00 | 49.0% | -4.2pp | — | 0.0% | 84.3% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage combo · Skills only | Equal-Skills field | 57.9% | 18.3s | 5.87 | 2.72 | 52.8% | 5.0pp | — | 0.0% | 89.7% | 0.0% | OK |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 46.5% | 18.4s | 5.88 | 2.72 | 57.9% | -11.4pp | -11.0pp | 0.0% | 92.5% | 0.0% | OK |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 48.6% | 18.3s | 5.88 | 2.72 | 52.8% | -4.2pp | — | 0.0% | 92.6% | 0.0% | OK |
| Mage sustain · Baseline | Fixed no-Gear field | 52.8% | 18.1s | 0.00 | 0.00 | 52.8% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 52.4% | 18.3s | 0.00 | 0.00 | 52.8% | -0.4pp | — | 0.0% | 93.7% | 0.0% | OK |
| Mage sustain · Skills only | Equal-Skills field | 66.7% | 18.4s | 6.14 | 3.00 | 52.8% | 13.8pp | — | 0.0% | 92.5% | 0.0% | OK |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 56.3% | 18.5s | 6.14 | 3.00 | 66.7% | -10.3pp | -9.9pp | 0.0% | 96.7% | 0.0% | OK |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 48.5% | 18.4s | 6.14 | 3.00 | 52.8% | -4.3pp | — | 0.0% | 96.8% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
