# Role Classification Edge Cases

Generated: 2026-07-17T04:26:31.150Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Stalled | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Edge · 25 all | Brawler base | 0.0% | 10.6s | 0.00 | 0.00 | 0.0% | 0.0% | 100.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 25 all | Longshot base | 43.8% | 17.3s | 0.00 | 0.00 | 0.0% | 0.0% | 46.3% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 25 all | Mage base | 6.3% | 15.9s | 0.00 | 0.00 | 0.0% | 0.0% | 6.3% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Chonk | Brawler base | 0.0% | 11.1s | 0.00 | 0.00 | 0.0% | 0.0% | 30.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Chonk | Longshot base | 0.0% | 17.2s | 0.00 | 0.00 | 0.0% | 0.0% | 0.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Chonk | Mage base | 82.5% | 19.7s | 0.00 | 0.00 | 83.8% | 0.0% | 100.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Spike | Brawler base | 0.0% | 17.8s | 0.00 | 0.00 | 0.0% | 0.0% | 15.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Spike | Longshot base | 100.0% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 100.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Spike | Mage base | 0.0% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 100.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Charm | Brawler base | 0.0% | 17.4s | 0.00 | 0.00 | 0.0% | 0.0% | 0.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Charm | Longshot base | 100.0% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 100.0% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |
| Edge · 28 Charm | Mage base | 0.0% | 19.7s | 0.00 | 0.00 | 82.5% | 0.0% | 2.5% | 0.0% | INFO_ROLE_EDGE_DIAGNOSTIC |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
