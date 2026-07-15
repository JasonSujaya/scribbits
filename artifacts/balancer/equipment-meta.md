# Equipment + Power-Up Meta

Generated: 2026-07-15T10:04:05.496Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Equipment sampling coverage | 59 unique modifier vectors | 50.0% | 0.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 0.0% | 0.0% | OK |
| brawler · 0 Power-Ups | Equal equipment + progression field | 54.2% | 14.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 86.2% | 0.0% | OK |
| longshot · 0 Power-Ups | Equal equipment + progression field | 47.9% | 18.8s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 90.6% | 0.0% | OK |
| mage · 0 Power-Ups | Equal equipment + progression field | 47.9% | 18.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 78.9% | 0.0% | OK |
| brawler · 3 Power-Ups | Equal equipment + progression field | 51.0% | 14.5s | 6.97 | 3.67 | 0.0% | 0.0pp | — | 0.0% | 73.9% | 0.0% | OK |
| longshot · 3 Power-Ups | Equal equipment + progression field | 50.6% | 18.9s | 6.43 | 2.99 | 0.0% | 0.0pp | — | 0.0% | 91.3% | 0.0% | OK |
| mage · 3 Power-Ups | Equal equipment + progression field | 48.4% | 18.3s | 6.78 | 3.44 | 0.0% | 0.0pp | — | 0.0% | 78.3% | 0.0% | OK |
| brawler · 5 Power-Ups | Equal equipment + progression field | 44.7% | 14.6s | 12.04 | 6.29 | 0.0% | 0.0pp | — | 0.0% | 74.3% | 0.0% | FLAG_EQUIPMENT_FIELD |
| longshot · 5 Power-Ups | Equal equipment + progression field | 47.6% | 18.9s | 11.30 | 5.42 | 0.0% | 0.0pp | — | 0.0% | 94.8% | 0.0% | OK |
| mage · 5 Power-Ups | Equal equipment + progression field | 57.5% | 18.3s | 11.94 | 5.93 | 0.0% | 0.0pp | — | 0.0% | 75.4% | 0.0% | FLAG_EQUIPMENT_FIELD |
| brawler · 0 Power-Ups | brawler · equal equipment | 50.1% | 10.6s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 0 Power-Ups | longshot · equal equipment | 43.0% | 17.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 77.4% | 0.0% | OK |
| brawler · 0 Power-Ups | mage · equal equipment | 69.7% | 15.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 81.2% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 0 Power-Ups | brawler · equal equipment | 56.9% | 17.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 77.3% | 0.0% | OK |
| longshot · 0 Power-Ups | longshot · equal equipment | 50.0% | 19.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 0 Power-Ups | mage · equal equipment | 36.9% | 19.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 94.7% | 0.0% | OK |
| mage · 0 Power-Ups | brawler · equal equipment | 30.5% | 15.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 81.0% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 0 Power-Ups | longshot · equal equipment | 63.1% | 19.9s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 94.7% | 0.0% | OK |
| mage · 0 Power-Ups | mage · equal equipment | 50.2% | 18.6s | 0.00 | 0.00 | 0.0% | 0.0pp | — | 0.0% | 61.0% | 0.0% | OK |
| brawler · 3 Power-Ups | brawler · equal equipment | 50.2% | 10.8s | 6.86 | 3.43 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 3 Power-Ups | longshot · equal equipment | 34.7% | 17.3s | 6.72 | 3.80 | 0.0% | 0.0pp | — | 0.0% | 75.1% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| brawler · 3 Power-Ups | mage · equal equipment | 68.2% | 15.5s | 7.34 | 3.78 | 0.0% | 0.0pp | — | 0.0% | 46.5% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 3 Power-Ups | brawler · equal equipment | 65.4% | 17.3s | 6.72 | 2.91 | 0.0% | 0.0pp | — | 0.0% | 74.6% | 0.0% | FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER |
| longshot · 3 Power-Ups | longshot · equal equipment | 50.1% | 19.5s | 6.00 | 3.00 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 3 Power-Ups | mage · equal equipment | 36.3% | 19.9s | 6.59 | 3.05 | 0.0% | 0.0pp | — | 0.0% | 99.5% | 0.0% | OK |
| mage · 3 Power-Ups | brawler · equal equipment | 31.4% | 15.5s | 7.34 | 3.56 | 0.0% | 0.0pp | — | 0.0% | 46.9% | 0.0% | FLAG_EQUIPMENT_MATCHUP |
| mage · 3 Power-Ups | longshot · equal equipment | 63.7% | 19.9s | 6.58 | 3.54 | 0.0% | 0.0pp | — | 0.0% | 99.6% | 0.0% | OK |
| mage · 3 Power-Ups | mage · equal equipment | 50.0% | 19.5s | 6.43 | 3.21 | 0.0% | 0.0pp | — | 0.0% | 88.5% | 0.0% | OK |
| brawler · 5 Power-Ups | brawler · equal equipment | 50.0% | 10.9s | 11.81 | 5.91 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| brawler · 5 Power-Ups | longshot · equal equipment | 46.2% | 17.3s | 11.50 | 6.23 | 0.0% | 0.0pp | — | 0.0% | 85.0% | 0.0% | OK |
| brawler · 5 Power-Ups | mage · equal equipment | 37.8% | 15.6s | 12.82 | 6.73 | 0.0% | 0.0pp | — | 0.0% | 37.9% | 0.0% | FLAG_EQUIPMENT_COUNTER |
| longshot · 5 Power-Ups | brawler · equal equipment | 54.3% | 17.3s | 11.51 | 5.27 | 0.0% | 0.0pp | — | 0.0% | 84.5% | 0.0% | FLAG_EQUIPMENT_COUNTER |
| longshot · 5 Power-Ups | longshot · equal equipment | 49.4% | 19.6s | 10.90 | 5.45 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| longshot · 5 Power-Ups | mage · equal equipment | 39.2% | 19.9s | 11.49 | 5.53 | 0.0% | 0.0pp | — | 0.0% | 99.9% | 0.0% | OK |
| mage · 5 Power-Ups | brawler · equal equipment | 61.8% | 15.6s | 12.82 | 6.09 | 0.0% | 0.0pp | — | 0.0% | 38.6% | 0.0% | OK |
| mage · 5 Power-Ups | longshot · equal equipment | 61.1% | 19.9s | 11.47 | 5.95 | 0.0% | 0.0pp | — | 0.0% | 100.0% | 0.0% | OK |
| mage · 5 Power-Ups | mage · equal equipment | 49.5% | 19.5s | 11.52 | 5.76 | 0.0% | 0.0pp | — | 0.0% | 87.5% | 0.0% | OK |
| brawler · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 43.5% | 14.3s | 0.00 | 0.00 | 48.7% | -5.2pp | — | 0.0% | 79.0% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 40.3% | 18.7s | 0.00 | 0.00 | 49.8% | -9.5pp | — | 0.0% | 88.1% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| mage · 0 Power-Ups · Gear marginal | Paired no-Gear baseline | 41.6% | 18.0s | 0.00 | 0.00 | 51.5% | -9.9pp | — | 0.0% | 84.6% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| brawler · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 45.5% | 14.5s | 6.97 | 3.67 | 49.3% | -3.8pp | 1.4pp | 0.0% | 68.7% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 47.7% | 18.9s | 6.44 | 2.99 | 51.5% | -3.7pp | 5.8pp | 0.0% | 90.1% | 0.0% | FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION |
| mage · 3 Power-Ups · Gear marginal | Paired no-Gear baseline | 44.8% | 18.3s | 6.78 | 3.43 | 49.3% | -4.5pp | 5.4pp | 0.0% | 80.0% | 0.0% | FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION |
| brawler · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 46.7% | 14.6s | 12.00 | 6.29 | 48.8% | -2.1pp | 3.0pp | 0.0% | 71.5% | 0.0% | FLAG_EQUIPMENT_MARGINAL |
| longshot · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 45.8% | 18.9s | 11.31 | 5.43 | 48.1% | -2.3pp | 7.2pp | 0.0% | 94.5% | 0.0% | FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION |
| mage · 5 Power-Ups · Gear marginal | Paired no-Gear baseline | 52.4% | 18.3s | 11.93 | 5.92 | 53.6% | -1.1pp | 8.7pp | 0.0% | 77.1% | 0.0% | FLAG_EQUIPMENT_POWERUP_INTERACTION |

## Hard flags

- brawler · 5 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (44.7%, 14.6s avg)
- mage · 5 Power-Ups vs Equal equipment + progression field: FLAG_EQUIPMENT_FIELD (57.5%, 18.3s avg)
- brawler · 0 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (69.7%, 15.4s avg)
- mage · 0 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (30.5%, 15.4s avg)
- brawler · 3 Power-Ups vs longshot · equal equipment: FLAG_EQUIPMENT_MATCHUP (34.7%, 17.3s avg)
- brawler · 3 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (68.2%, 15.5s avg)
- longshot · 3 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP+FLAG_EQUIPMENT_COUNTER (65.4%, 17.3s avg)
- mage · 3 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_MATCHUP (31.4%, 15.5s avg)
- brawler · 5 Power-Ups vs mage · equal equipment: FLAG_EQUIPMENT_COUNTER (37.8%, 15.6s avg)
- longshot · 5 Power-Ups vs brawler · equal equipment: FLAG_EQUIPMENT_COUNTER (54.3%, 17.3s avg)
- brawler · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (43.5%, 14.3s avg)
- longshot · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (40.3%, 18.7s avg)
- mage · 0 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (41.6%, 18.0s avg)
- brawler · 3 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (45.5%, 14.5s avg)
- longshot · 3 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION (47.7%, 18.9s avg)
- mage · 3 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION (44.8%, 18.3s avg)
- brawler · 5 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL (46.7%, 14.6s avg)
- longshot · 5 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_MARGINAL+FLAG_EQUIPMENT_POWERUP_INTERACTION (45.8%, 18.9s avg)
- mage · 5 Power-Ups · Gear marginal vs Paired no-Gear baseline: FLAG_EQUIPMENT_POWERUP_INTERACTION (52.4%, 18.3s avg)

## Watches

No watch-only rows from current thresholds.
