# Rival Run Risk

Generated: 2026-07-17T01:13:48.866Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Brawler base · SAFE | Brawler common Power-Ups | 63.3% | 11.2s | 3.00 | 0.00 | 0.0% | 88.3% | 0.0% | WATCH_DURATION |
| Brawler base · EVEN | Mage base | 55.5% | 18.6s | 0.00 | 0.00 | 0.0% | 100.0% | 0.0% | OK |
| Brawler base · RISKY | Longshot base | 43.0% | 18.8s | 0.00 | 0.00 | 0.0% | 43.0% | 0.0% | OK |
| Longshot base · SAFE | Brawler base | 54.7% | 18.8s | 0.00 | 0.00 | 0.0% | 45.3% | 0.0% | OK |
| Longshot base · EVEN | Mage base | 39.1% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Longshot base · RISKY | Longshot base | 54.7% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Mage base · SAFE | Brawler base | 43.0% | 18.6s | 0.00 | 0.00 | 0.0% | 100.0% | 0.0% | OK |
| Mage base · EVEN | Longshot base | 66.4% | 20.0s | 0.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |
| Mage base · RISKY | Longshot rush Power-Ups | 51.6% | 20.0s | 2.00 | 0.00 | 100.0% | 100.0% | 0.0% | FLAG_TIMEOUTS |

## Hard flags

- Longshot base · EVEN vs Mage base: FLAG_TIMEOUTS (39.1%, 20.0s avg)
- Longshot base · RISKY vs Longshot base: FLAG_TIMEOUTS (54.7%, 20.0s avg)
- Mage base · EVEN vs Longshot base: FLAG_TIMEOUTS (66.4%, 20.0s avg)
- Mage base · RISKY vs Longshot rush Power-Ups: FLAG_TIMEOUTS (51.6%, 20.0s avg)

## Watches

- Brawler base · SAFE vs Brawler common Power-Ups: WATCH_DURATION (63.3%, 11.2s avg)
