# Role Matrix

Generated: 2026-07-17T01:09:59.120Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 50.1% | 10.6s | 0.00 | 0.00 | 0.0% | 100.0% | 0.0% | WATCH_DURATION |
| Brawler base | Longshot base | 42.9% | 18.8s | 0.00 | 0.00 | 0.0% | 42.6% | 0.0% | OK |
| Brawler base | Mage base | 58.2% | 18.6s | 0.00 | 0.00 | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Brawler base | 57.3% | 18.8s | 0.00 | 0.00 | 0.0% | 42.8% | 0.0% | OK |
| Longshot base | Longshot base | 51.8% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Longshot base | Mage base | 35.8% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Mage base | Brawler base | 42.3% | 18.6s | 0.00 | 0.00 | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Longshot base | 63.7% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Mage base | Mage base | 51.5% | 19.7s | 0.00 | 0.00 | 17.1% | 99.6% | 0.0% | FLAG_TIMEOUTS |

## Hard flags

- Longshot base vs Longshot base: FLAG_TIMEOUTS (51.8%, 20.0s avg)
- Longshot base vs Mage base: FLAG_TIMEOUTS (35.8%, 20.0s avg)
- Mage base vs Longshot base: FLAG_TIMEOUTS (63.7%, 20.0s avg)
- Mage base vs Mage base: FLAG_TIMEOUTS (51.5%, 19.7s avg)

## Watches

- Brawler base vs Brawler base: WATCH_DURATION (50.1%, 10.6s avg)
