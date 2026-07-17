# Gear + Power-Up Interaction

Generated: 2026-07-17T04:20:54.444Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Stalled | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler pressure · Baseline | Fixed no-Gear field | 51.1% | 16.0s | 0.00 | 0.00 | 51.1% | 0.0pp | — | 0.0% | 0.0% | 80.8% | 0.0% | OK |
| Brawler pressure · Gear only | Fixed no-Gear field | 51.1% | 16.0s | 0.00 | 0.00 | 51.1% | 0.0pp | — | 0.0% | 0.0% | 80.8% | 0.0% | OK |
| Brawler pressure · Skills only | Equal-Skills field | 58.3% | 13.9s | 7.01 | 4.00 | 51.1% | 7.2pp | — | 0.0% | 0.0% | 38.3% | 0.0% | OK |
| Brawler pressure · Target Gear + equal Skills | Equal-Skills field | 58.3% | 13.9s | 7.01 | 4.00 | 58.3% | 0.0pp | 0.0pp | 0.0% | 0.0% | 38.3% | 0.0% | OK |
| Brawler pressure · Equal Gear + Skills | Equal Gear + Skills field | 49.6% | 14.1s | 7.23 | 4.00 | 51.1% | -1.5pp | — | 0.0% | 0.0% | 48.9% | 0.0% | OK |
| Brawler sustain · Baseline | Fixed no-Gear field | 51.1% | 16.0s | 0.00 | 0.00 | 51.1% | 0.0pp | — | 0.0% | 0.0% | 80.8% | 0.0% | OK |
| Brawler sustain · Gear only | Fixed no-Gear field | 58.3% | 16.0s | 0.00 | 0.00 | 51.1% | 7.3pp | — | 0.2% | 0.0% | 78.8% | 0.0% | OK |
| Brawler sustain · Skills only | Equal-Skills field | 20.3% | 15.3s | 6.50 | 3.17 | 51.1% | -30.8pp | — | 0.0% | 0.0% | 52.5% | 0.0% | WATCH_GEAR_META |
| Brawler sustain · Target Gear + equal Skills | Equal-Skills field | 39.7% | 15.4s | 6.80 | 3.30 | 20.3% | 19.5pp | 12.2pp | 0.0% | 0.0% | 68.7% | 0.0% | OK |
| Brawler sustain · Equal Gear + Skills | Equal Gear + Skills field | 31.1% | 15.3s | 6.64 | 3.30 | 51.1% | -20.0pp | — | 0.0% | 0.0% | 61.1% | 0.0% | OK |
| Longshot guard · Baseline | Fixed no-Gear field | 47.7% | 19.6s | 0.00 | 0.00 | 47.7% | 0.0pp | — | 66.7% | 0.5% | 81.2% | 0.0% | OK |
| Longshot guard · Gear only | Fixed no-Gear field | 87.7% | 19.4s | 0.00 | 0.00 | 47.7% | 40.0pp | — | 66.7% | 0.0% | 71.4% | 0.0% | WATCH_GEAR_FIELD |
| Longshot guard · Skills only | Equal-Skills field | 45.9% | 18.8s | 4.17 | 2.34 | 47.7% | -1.8pp | — | 66.7% | 0.0% | 55.5% | 0.0% | OK |
| Longshot guard · Target Gear + equal Skills | Equal-Skills field | 66.6% | 18.7s | 4.17 | 2.34 | 45.9% | 20.7pp | -19.3pp | 66.7% | 0.0% | 37.0% | 0.0% | OK |
| Longshot guard · Equal Gear + Skills | Equal Gear + Skills field | 48.3% | 18.7s | 4.17 | 2.34 | 47.7% | 0.6pp | — | 66.7% | 0.0% | 37.3% | 0.0% | OK |
| Longshot pressure · Baseline | Fixed no-Gear field | 47.7% | 19.6s | 0.00 | 0.00 | 47.7% | 0.0pp | — | 66.7% | 0.5% | 81.2% | 0.0% | OK |
| Longshot pressure · Gear only | Fixed no-Gear field | 87.8% | 19.4s | 0.00 | 0.00 | 47.7% | 40.2pp | — | 66.7% | 0.0% | 71.1% | 0.0% | WATCH_GEAR_FIELD |
| Longshot pressure · Skills only | Equal-Skills field | 53.2% | 18.8s | 3.50 | 1.67 | 47.7% | 5.5pp | — | 66.7% | 0.0% | 49.1% | 0.0% | OK |
| Longshot pressure · Target Gear + equal Skills | Equal-Skills field | 66.7% | 18.7s | 3.54 | 1.71 | 53.2% | 13.5pp | -26.7pp | 66.7% | 0.0% | 58.9% | 0.0% | OK |
| Longshot pressure · Equal Gear + Skills | Equal Gear + Skills field | 51.0% | 18.7s | 3.50 | 1.67 | 47.7% | 3.4pp | — | 66.7% | 0.0% | 59.5% | 0.0% | OK |
| Mage combo · Baseline | Fixed no-Gear field | 51.5% | 19.4s | 0.00 | 0.00 | 51.5% | 0.0pp | — | 38.3% | 0.0% | 99.8% | 0.0% | OK |
| Mage combo · Gear only | Fixed no-Gear field | 90.0% | 19.5s | 0.00 | 0.00 | 51.5% | 38.5pp | — | 46.8% | 0.0% | 99.9% | 0.0% | WATCH_GEAR_FIELD |
| Mage combo · Skills only | Equal-Skills field | 46.0% | 18.6s | 4.85 | 2.19 | 51.5% | -5.5pp | — | 50.2% | 0.0% | 43.8% | 0.0% | OK |
| Mage combo · Target Gear + equal Skills | Equal-Skills field | 51.2% | 18.9s | 4.93 | 2.27 | 46.0% | 5.2pp | -33.3pp | 52.1% | 0.0% | 49.5% | 0.0% | OK |
| Mage combo · Equal Gear + Skills | Equal Gear + Skills field | 45.5% | 18.7s | 4.95 | 2.28 | 51.5% | -6.0pp | — | 59.5% | 0.0% | 39.8% | 0.0% | OK |
| Mage sustain · Baseline | Fixed no-Gear field | 51.5% | 19.4s | 0.00 | 0.00 | 51.5% | 0.0pp | — | 38.3% | 0.0% | 99.8% | 0.0% | OK |
| Mage sustain · Gear only | Fixed no-Gear field | 90.0% | 19.5s | 0.00 | 0.00 | 51.5% | 38.5pp | — | 46.8% | 0.0% | 99.9% | 0.0% | WATCH_GEAR_FIELD |
| Mage sustain · Skills only | Equal-Skills field | 74.0% | 19.0s | 4.68 | 2.00 | 51.5% | 22.5pp | — | 52.0% | 0.0% | 57.1% | 0.0% | WATCH_GEAR_META |
| Mage sustain · Target Gear + equal Skills | Equal-Skills field | 77.5% | 19.2s | 4.75 | 2.00 | 74.0% | 3.5pp | -35.0pp | 59.1% | 0.0% | 64.5% | 0.0% | WATCH_HARMFUL_GEAR_INTERACTION |
| Mage sustain · Equal Gear + Skills | Equal Gear + Skills field | 72.9% | 19.3s | 4.68 | 2.00 | 51.5% | 21.4pp | — | 58.8% | 0.0% | 60.4% | 0.0% | WATCH_GEAR_META |

## Hard flags

No balance flags from current thresholds.

## Watches

- Brawler sustain · Skills only vs Equal-Skills field: WATCH_GEAR_META (20.3%, 15.3s avg)
- Longshot guard · Gear only vs Fixed no-Gear field: WATCH_GEAR_FIELD (87.7%, 19.4s avg)
- Longshot pressure · Gear only vs Fixed no-Gear field: WATCH_GEAR_FIELD (87.8%, 19.4s avg)
- Mage combo · Gear only vs Fixed no-Gear field: WATCH_GEAR_FIELD (90.0%, 19.5s avg)
- Mage sustain · Gear only vs Fixed no-Gear field: WATCH_GEAR_FIELD (90.0%, 19.5s avg)
- Mage sustain · Skills only vs Equal-Skills field: WATCH_GEAR_META (74.0%, 19.0s avg)
- Mage sustain · Target Gear + equal Skills vs Equal-Skills field: WATCH_HARMFUL_GEAR_INTERACTION (77.5%, 19.2s avg)
- Mage sustain · Equal Gear + Skills vs Equal Gear + Skills field: WATCH_GEAR_META (72.9%, 19.3s avg)
