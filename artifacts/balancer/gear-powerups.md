# Gear + Power-Up Interaction

Generated: 2026-07-15T05:54:35.362Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Interaction | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler base · Baseline | FIELD | 52.5% | 13.5s | 0.00 | 0.00 | — | 0.0% | 83.3% | 0.0% | OK |
| Brawler base · Gear only | FIELD | 33.3% | 13.6s | 0.00 | 0.00 | — | 0.0% | 81.7% | 0.0% | FLAG_WIN_RATE |
| Brawler base · Skills only | FIELD | 32.9% | 13.4s | 2.82 | 2.82 | — | 0.0% | 66.7% | 0.0% | FLAG_WIN_RATE |
| Brawler base · Gear + Skills | FIELD | 29.6% | 13.6s | 2.59 | 2.59 | 15.8pp | 0.0% | 71.3% | 0.0% | FLAG_WIN_RATE |
| Longshot base · Baseline | FIELD | 45.8% | 13.5s | 0.00 | 0.00 | — | 0.0% | 76.3% | 0.0% | OK |
| Longshot base · Gear only | FIELD | 47.3% | 13.5s | 0.00 | 0.00 | — | 0.0% | 75.4% | 0.0% | OK |
| Longshot base · Skills only | FIELD | 99.6% | 13.4s | 7.83 | 7.83 | — | 0.0% | 41.5% | 0.0% | FLAG_WIN_RATE |
| Longshot base · Gear + Skills | FIELD | 100.0% | 13.3s | 7.83 | 7.83 | -1.0pp | 0.0% | 41.3% | 0.0% | FLAG_WIN_RATE |
| Mage base · Baseline | FIELD | 52.5% | 14.8s | 0.00 | 0.00 | — | 0.0% | 91.3% | 0.0% | OK |
| Mage base · Gear only | FIELD | 50.8% | 14.8s | 0.00 | 0.00 | — | 0.0% | 90.8% | 0.0% | OK |
| Mage base · Skills only | FIELD | 81.3% | 14.6s | 6.98 | 6.98 | — | 0.0% | 43.8% | 0.0% | FLAG_WIN_RATE |
| Mage base · Gear + Skills | FIELD | 82.5% | 14.6s | 6.99 | 6.99 | 2.9pp | 0.0% | 44.2% | 0.0% | FLAG_WIN_RATE |

## Hard flags

- Brawler base · Gear only: FLAG_WIN_RATE (33.3%, 13.6s avg)
- Brawler base · Skills only: FLAG_WIN_RATE (32.9%, 13.4s avg)
- Brawler base · Gear + Skills: FLAG_WIN_RATE (29.6%, 13.6s avg)
- Longshot base · Skills only: FLAG_WIN_RATE (99.6%, 13.4s avg)
- Longshot base · Gear + Skills: FLAG_WIN_RATE (100.0%, 13.3s avg)
- Mage base · Skills only: FLAG_WIN_RATE (81.3%, 14.6s avg)
- Mage base · Gear + Skills: FLAG_WIN_RATE (82.5%, 14.6s avg)

## Watches

No watch-only rows from current thresholds.
