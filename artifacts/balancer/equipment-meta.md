# Equipment + Power-Up Meta

Generated: 2026-07-17T00:55:06.548Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Equipment sampling coverage | 59 unique modifier vectors | 50.0% | 0.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 0.0% | 0.0% | OK |
| brawler · 0 Power-Ups | Equal equipment + progression field | 62.2% | 15.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 83.0% | 0.0% | FLAG_EQUIPMENT_FIELD |
| longshot · 0 Power-Ups | Equal equipment + progression field | 35.6% | 19.6s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 83.1% | 0.0% | FLAG_EQUIPMENT_FIELD |
| mage · 0 Power-Ups | Equal equipment + progression field | 52.6% | 19.5s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 99.9% | 0.0% | OK |
| brawler · 3 Power-Ups | Equal equipment + progression field | 60.4% | 14.6s | 6.56 | 3.40 | 0.0% | 0.0pp | — | 0.0% | 56.9% | 0.0% | FLAG_EQUIPMENT_FIELD |
| longshot · 3 Power-Ups | Equal equipment + progression field | 37.8% | 18.8s | 5.71 | 2.78 | 0.0% | 0.0pp | — | 0.0% | 71.8% | 0.4% | FLAG_EQUIPMENT_FIELD |
| mage · 3 Power-Ups | Equal equipment + progression field | 51.8% | 18.8s | 5.61 | 2.76 | 0.0% | 0.0pp | — | 0.0% | 57.4% | 0.5% | OK |
| brawler · 5 Power-Ups | Equal equipment + progression field | 56.3% | 14.3s | 10.70 | 5.65 | 0.0% | 0.0pp | — | 0.0% | 53.6% | 0.0% | OK |
| longshot · 5 Power-Ups | Equal equipment + progression field | 33.5% | 18.5s | 9.01 | 4.32 | 0.0% | 0.0pp | — | 0.0% | 61.5% | 0.1% | FLAG_EQUIPMENT_FIELD |
| mage · 5 Power-Ups | Equal equipment + progression field | 60.6% | 19.0s | 9.39 | 4.58 | 0.0% | 0.0pp | — | 0.0% | 57.3% | 0.1% | FLAG_EQUIPMENT_FIELD |
| brawler · 0 Power-Ups | brawler · equal equipment | 50.0% | 10.5s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 0 Power-Ups | longshot · equal equipment | 48.9% | 18.8s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 49.3% | 0.0% | OK |
| brawler · 0 Power-Ups | mage · equal equipment | 87.8% | 18.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 99.7% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 0 Power-Ups | brawler · equal equipment | 51.1% | 18.8s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 49.3% | 0.0% | OK |
| longshot · 0 Power-Ups | longshot · equal equipment | 49.5% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 0 Power-Ups | mage · equal equipment | 6.1% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 0 Power-Ups | brawler · equal equipment | 12.0% | 18.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 99.7% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 0 Power-Ups | longshot · equal equipment | 94.2% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| mage · 0 Power-Ups | mage · equal equipment | 51.7% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 3 Power-Ups | brawler · equal equipment | 49.6% | 10.4s | 7.34 | 3.67 | 0.0% | 0.0pp | — | 0.0% | 85.7% | 0.0% | OK |
| brawler · 3 Power-Ups | longshot · equal equipment | 74.6% | 16.4s | 6.16 | 3.27 | 0.0% | 0.0pp | — | 0.0% | 54.8% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| brawler · 3 Power-Ups | mage · equal equipment | 57.1% | 16.9s | 6.19 | 3.28 | 0.0% | 0.0pp | — | 0.0% | 30.3% | 0.0% | OK |
| longshot · 3 Power-Ups | brawler · equal equipment | 25.3% | 16.4s | 6.17 | 2.91 | 0.0% | 0.0pp | — | 0.0% | 55.3% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 3 Power-Ups | longshot · equal equipment | 50.0% | 20.0s | 5.80 | 2.90 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 3 Power-Ups | mage · equal equipment | 38.0% | 19.9s | 5.14 | 2.52 | 0.0% | 0.0pp | — | 0.0% | 60.0% | 1.3% | OK |
| mage · 3 Power-Ups | brawler · equal equipment | 42.9% | 16.9s | 6.19 | 2.91 | 0.0% | 0.0pp | — | 0.0% | 30.9% | 0.0% | OK |
| mage · 3 Power-Ups | longshot · equal equipment | 62.2% | 19.9s | 5.15 | 2.62 | 0.0% | 0.0pp | — | 0.0% | 60.0% | 1.5% | OK |
| mage · 3 Power-Ups | mage · equal equipment | 50.4% | 19.6s | 5.51 | 2.76 | 0.0% | 0.0pp | — | 0.0% | 81.4% | 0.0% | OK |
| brawler · 5 Power-Ups | brawler · equal equipment | 50.9% | 9.8s | 11.49 | 5.74 | 0.0% | 0.0pp | — | 0.0% | 84.2% | 0.0% | OK |
| brawler · 5 Power-Ups | longshot · equal equipment | 89.5% | 15.6s | 10.16 | 5.57 | 0.0% | 0.0pp | — | 0.0% | 31.4% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| brawler · 5 Power-Ups | mage · equal equipment | 28.3% | 17.6s | 10.45 | 5.64 | 0.0% | 0.0pp | — | 0.0% | 45.0% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 5 Power-Ups | brawler · equal equipment | 10.8% | 15.6s | 10.16 | 4.59 | 0.0% | 0.0pp | — | 0.0% | 31.4% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 5 Power-Ups | longshot · equal equipment | 50.0% | 20.0s | 8.41 | 4.20 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 5 Power-Ups | mage · equal equipment | 39.9% | 19.9s | 8.46 | 4.16 | 0.0% | 0.0pp | — | 0.0% | 53.1% | 0.4% | OK |
| mage · 5 Power-Ups | brawler · equal equipment | 71.7% | 17.6s | 10.45 | 4.81 | 0.0% | 0.0pp | — | 0.0% | 45.1% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 5 Power-Ups | longshot · equal equipment | 59.6% | 19.9s | 8.46 | 4.30 | 0.0% | 0.0pp | — | 0.0% | 53.2% | 0.4% | OK |
| mage · 5 Power-Ups | mage · equal equipment | 50.4% | 19.6s | 9.25 | 4.63 | 0.0% | 0.0pp | — | 0.0% | 73.5% | 0.0% | OK |
| brawler · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 64.2% | 15.9s | 0.00 | 0.00 | 49.9% | 14.3pp | — | 0.0% | 83.5% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 59.5% | 19.6s | 0.00 | 0.00 | 48.3% | 11.1pp | — | 0.0% | 80.5% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| mage · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 65.0% | 19.5s | 0.00 | 0.00 | 51.2% | 13.8pp | — | 0.0% | 100.0% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| brawler · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 65.4% | 14.5s | 6.58 | 3.42 | 55.5% | 9.9pp | -4.4pp | 0.0% | 57.7% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 44.2% | 18.8s | 5.72 | 2.78 | 41.1% | 3.2pp | -8.0pp | 0.0% | 73.9% | 0.4% | OK |
| mage · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 56.6% | 18.9s | 5.61 | 2.76 | 53.7% | 2.9pp | -10.9pp | 0.0% | 60.6% | 0.5% | FLAG_EQUIPMENT_POWERUP_INTERACTION |
| brawler · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 61.4% | 14.3s | 10.71 | 5.67 | 53.2% | 8.2pp | -6.0pp | 0.0% | 53.8% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 36.8% | 18.6s | 9.05 | 4.34 | 34.3% | 2.5pp | -8.7pp | 0.0% | 64.0% | 0.1% | OK |
| mage · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 64.3% | 19.0s | 9.40 | 4.58 | 62.7% | 1.6pp | -12.2pp | 0.0% | 56.5% | 0.1% | FLAG_EQUIPMENT_POWERUP_INTERACTION |

## Hard flags

- brawler · 0 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (62.2%, 15.9s avg)
- longshot · 0 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (35.6%, 19.6s avg)
- brawler · 3 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (60.4%, 14.6s avg)
- longshot · 3 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (37.8%, 18.8s avg)
- longshot · 5 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (33.5%, 18.5s avg)
- mage · 5 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (60.6%, 19.0s avg)
- brawler · 0 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (87.8%, 18.4s avg)
- longshot · 0 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP (6.1%, 20.0s avg)
- mage · 0 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (12.0%, 18.4s avg)
- mage · 0 Power-Ups vs longshot · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (94.2%, 20.0s avg)
- brawler · 3 Power-Ups vs longshot · equal equipment: FLAG_EQUIPMENT_MATCHUP (74.6%, 16.4s avg)
- longshot · 3 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (25.3%, 16.4s avg)
- brawler · 5 Power-Ups vs longshot · equal equipment: FLAG_EQUIPMENT_MATCHUP (89.5%, 15.6s avg)
- brawler · 5 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (28.3%, 17.6s avg)
- longshot · 5 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (10.8%, 15.6s avg)
- mage · 5 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (71.7%, 17.6s avg)
- brawler · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (64.2%, 15.9s avg)
- longshot · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (59.5%, 19.6s avg)
- mage · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (65.0%, 19.5s avg)
- brawler · 3 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (65.4%, 14.5s avg)
- mage · 3 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_POWERUP_INTERACTION (56.6%, 18.9s avg)
- brawler · 5 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (61.4%, 14.3s avg)
- mage · 5 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_POWERUP_INTERACTION (64.3%, 19.0s avg)

## Watches

No watch-only rows from current thresholds.
