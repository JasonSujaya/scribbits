# Role Cycle

Generated: 2026-07-15T10:41:08.281Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler > Mage | Mage base | 58.2% | 16.4s | 0.00 | 0.00 | 0.0% | 64.0% | 0.0% | OK |
| Mage > Longshot | Longshot base | 61.4% | 19.8s | 0.00 | 0.00 | 0.0% | 95.7% | 0.0% | OK |
| Longshot > Brawler | Brawler base | 100.0% | 15.4s | 0.00 | 0.00 | 0.0% | 1.8% | 0.0% | FLAG_OVERPOWERED_EDGE |

## Hard flags

- Longshot > Brawler vs Brawler base: FLAG_OVERPOWERED_EDGE (100.0%, 15.4s avg)

## Watches

No watch-only rows from current thresholds.
