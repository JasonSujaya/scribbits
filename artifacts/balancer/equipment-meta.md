# Equipment + Power-Up Meta

Generated: 2026-07-16T10:18:24.099Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Equipment sampling coverage | 59 unique modifier vectors | 50.0% | 0.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 0.0% | 0.0% | OK |
| brawler · 0 Power-Ups | Equal equipment + progression field | 48.4% | 14.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 86.0% | 0.0% | OK |
| longshot · 0 Power-Ups | Equal equipment + progression field | 46.9% | 18.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 91.7% | 0.0% | OK |
| mage · 0 Power-Ups | Equal equipment + progression field | 55.0% | 18.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 80.9% | 0.0% | OK |
| brawler · 3 Power-Ups | Equal equipment + progression field | 59.0% | 13.9s | 6.28 | 3.27 | 0.0% | 0.0pp | — | 0.0% | 56.3% | 0.0% | FLAG_EQUIPMENT_FIELD |
| longshot · 3 Power-Ups | Equal equipment + progression field | 55.1% | 18.9s | 6.02 | 2.98 | 0.0% | 0.0pp | — | 0.0% | 86.9% | 0.0% | OK |
| mage · 3 Power-Ups | Equal equipment + progression field | 36.3% | 17.8s | 5.93 | 2.86 | 0.0% | 0.0pp | — | 0.0% | 68.8% | 0.0% | FLAG_EQUIPMENT_FIELD |
| brawler · 5 Power-Ups | Equal equipment + progression field | 59.0% | 14.4s | 10.33 | 5.34 | 0.0% | 0.0pp | — | 0.0% | 67.4% | 0.0% | FLAG_EQUIPMENT_FIELD |
| longshot · 5 Power-Ups | Equal equipment + progression field | 47.0% | 18.9s | 10.12 | 5.02 | 0.0% | 0.0pp | — | 0.0% | 88.6% | 0.0% | OK |
| mage · 5 Power-Ups | Equal equipment + progression field | 44.6% | 18.4s | 10.06 | 4.89 | 0.0% | 0.0pp | — | 0.0% | 79.8% | 0.0% | OK |
| brawler · 0 Power-Ups | brawler · equal equipment | 49.7% | 10.6s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 0 Power-Ups | longshot · equal equipment | 46.4% | 17.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 76.7% | 0.0% | OK |
| brawler · 0 Power-Ups | mage · equal equipment | 49.3% | 15.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 81.4% | 0.0% | OK |
| longshot · 0 Power-Ups | brawler · equal equipment | 54.0% | 17.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 77.1% | 0.0% | OK |
| longshot · 0 Power-Ups | longshot · equal equipment | 50.9% | 19.6s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 0 Power-Ups | mage · equal equipment | 35.7% | 19.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 98.1% | 0.0% | OK |
| mage · 0 Power-Ups | brawler · equal equipment | 49.9% | 15.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 81.3% | 0.0% | OK |
| mage · 0 Power-Ups | longshot · equal equipment | 64.6% | 19.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 97.8% | 0.0% | OK |
| mage · 0 Power-Ups | mage · equal equipment | 50.5% | 18.7s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 63.6% | 0.0% | OK |
| brawler · 3 Power-Ups | brawler · equal equipment | 50.2% | 10.8s | 6.61 | 3.31 | 0.0% | 0.0pp | — | 0.0% | 92.0% | 0.0% | OK |
| brawler · 3 Power-Ups | longshot · equal equipment | 29.6% | 17.0s | 6.22 | 3.25 | 0.0% | 0.0pp | — | 0.0% | 63.9% | 0.0% | OK |
| brawler · 3 Power-Ups | mage · equal equipment | 97.1% | 13.8s | 6.02 | 3.25 | 0.0% | 0.0pp | — | 0.0% | 12.9% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 3 Power-Ups | brawler · equal equipment | 70.6% | 17.0s | 6.22 | 2.97 | 0.0% | 0.0pp | — | 0.0% | 63.6% | 0.0% | FLAG_EQUIPMENT_COUNTER |
| longshot · 3 Power-Ups | longshot · equal equipment | 50.5% | 19.8s | 5.90 | 2.95 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 3 Power-Ups | mage · equal equipment | 44.1% | 19.9s | 5.96 | 3.03 | 0.0% | 0.0pp | — | 0.0% | 97.2% | 0.0% | OK |
| mage · 3 Power-Ups | brawler · equal equipment | 2.9% | 13.8s | 6.02 | 2.76 | 0.0% | 0.0pp | — | 0.0% | 13.1% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 3 Power-Ups | longshot · equal equipment | 55.5% | 19.9s | 5.96 | 2.92 | 0.0% | 0.0pp | — | 0.0% | 97.0% | 0.0% | OK |
| mage · 3 Power-Ups | mage · equal equipment | 50.4% | 19.7s | 5.81 | 2.91 | 0.0% | 0.0pp | — | 0.0% | 96.2% | 0.0% | OK |
| brawler · 5 Power-Ups | brawler · equal equipment | 49.7% | 10.5s | 10.10 | 5.05 | 0.0% | 0.0pp | — | 0.0% | 91.2% | 0.0% | OK |
| brawler · 5 Power-Ups | longshot · equal equipment | 41.2% | 17.0s | 10.51 | 5.47 | 0.0% | 0.0pp | — | 0.0% | 68.3% | 0.0% | OK |
| brawler · 5 Power-Ups | mage · equal equipment | 86.0% | 15.7s | 10.38 | 5.51 | 0.0% | 0.0pp | — | 0.0% | 42.6% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 5 Power-Ups | brawler · equal equipment | 59.4% | 17.0s | 10.50 | 5.03 | 0.0% | 0.0pp | — | 0.0% | 67.8% | 0.0% | OK |
| longshot · 5 Power-Ups | longshot · equal equipment | 50.7% | 19.9s | 9.80 | 4.90 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 5 Power-Ups | mage · equal equipment | 30.9% | 19.9s | 10.07 | 5.12 | 0.0% | 0.0pp | — | 0.0% | 98.0% | 0.0% | OK |
| mage · 5 Power-Ups | brawler · equal equipment | 14.4% | 15.7s | 10.38 | 4.87 | 0.0% | 0.0pp | — | 0.0% | 42.9% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 5 Power-Ups | longshot · equal equipment | 69.7% | 19.9s | 10.06 | 4.94 | 0.0% | 0.0pp | — | 0.0% | 98.2% | 0.0% | OK |
| mage · 5 Power-Ups | mage · equal equipment | 49.8% | 19.7s | 9.76 | 4.87 | 0.0% | 0.0pp | — | 0.0% | 98.2% | 0.0% | OK |
| brawler · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 44.5% | 14.3s | 0.00 | 0.00 | 49.6% | -5.1pp | — | 0.0% | 86.0% | 0.0% | OK |
| longshot · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 45.3% | 18.8s | 0.00 | 0.00 | 49.2% | -3.9pp | — | 0.0% | 89.9% | 0.0% | OK |
| mage · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 46.5% | 18.0s | 0.00 | 0.00 | 51.2% | -4.7pp | — | 0.0% | 86.0% | 0.0% | OK |
| brawler · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 52.1% | 13.8s | 6.28 | 3.27 | 57.3% | -5.2pp | -0.1pp | 0.0% | 56.3% | 0.0% | OK |
| longshot · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 56.8% | 18.9s | 6.03 | 2.98 | 56.0% | 0.8pp | 4.7pp | 0.0% | 86.1% | 0.0% | OK |
| mage · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 34.1% | 17.8s | 5.93 | 2.86 | 36.4% | -2.3pp | 2.4pp | 0.0% | 69.2% | 0.0% | OK |
| brawler · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 54.5% | 14.4s | 10.33 | 5.34 | 58.2% | -3.7pp | 1.4pp | 0.0% | 66.9% | 0.0% | OK |
| longshot · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 45.3% | 18.9s | 10.12 | 5.02 | 44.6% | 0.7pp | 4.6pp | 0.0% | 88.2% | 0.0% | OK |
| mage · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 43.7% | 18.4s | 10.07 | 4.90 | 47.8% | -4.1pp | 0.6pp | 0.0% | 79.1% | 0.0% | OK |

## Hard flags

- brawler · 3 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (59.0%, 13.9s avg)
- mage · 3 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (36.3%, 17.8s avg)
- brawler · 5 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (59.0%, 14.4s avg)
- brawler · 3 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (97.1%, 13.8s avg)
- longshot · 3 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_COUNTER (70.6%, 17.0s avg)
- mage · 3 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (2.9%, 13.8s avg)
- brawler · 5 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (86.0%, 15.7s avg)
- mage · 5 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (14.4%, 15.7s avg)

## Watches

No watch-only rows from current thresholds.
