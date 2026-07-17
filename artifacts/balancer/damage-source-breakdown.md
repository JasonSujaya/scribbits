# Damage Source Breakdown

Generated: 2026-07-17T04:20:12.559Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Stalled | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 50.0% | 10.6s | 0.00 | 0.00 | brawler_slam 153.2, inkquake 104.6 | brawler_slam 154.4, inkquake 103.9 | body_slam 96.5% | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 40.0% | 18.7s | 0.00 | 0.00 | brawler_slam 129.4, inkquake 82.0 | nib_halo 153.5, longshot_quill 105.0 | body_slam 81.9% | 0.0% | 0.0% | 40.6% | 0.0% | OK |
| Brawler base | Mage base | 56.9% | 18.6s | 0.00 | 0.00 | inkquake 128.7, brawler_slam 110.2 | mage_bolt 88.0, colorburst 84.1, colorburst_echo 60.0 | body_slam 100.0% | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Brawler base | 56.3% | 18.8s | 0.00 | 0.00 | nib_halo 153.2, longshot_quill 104.9 | brawler_slam 130.7, inkquake 82.5 | nib_volley 100.0%, piercing_quill 92.8% | 0.0% | 0.0% | 43.1% | 0.0% | OK |
| Longshot base | Longshot base | 52.5% | 20.0s | 0.00 | 0.00 | longshot_quill 123.1 | longshot_quill 122.9 | piercing_quill 97.7% | 100.0% | 1.9% | 100.0% | 0.0% | OK |
| Longshot base | Mage base | 34.4% | 20.0s | 0.00 | 0.00 | longshot_quill 99.9, nib_halo 16.9 | colorburst 63.7, mage_bolt 28.0, colorburst_echo 21.0 | nib_volley 100.0%, piercing_quill 85.7% | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Brawler base | 40.0% | 18.6s | 0.00 | 0.00 | mage_bolt 88.1, colorburst 83.1, colorburst_echo 60.0 | inkquake 129.1, brawler_slam 109.9 | color_bolt 85.7% | 0.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Longshot base | 61.3% | 20.0s | 0.00 | 0.00 | colorburst 63.7, mage_bolt 28.0, colorburst_echo 21.0 | longshot_quill 100.0, nib_halo 17.0 | color_bolt 62.5% | 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Mage base | 53.1% | 19.6s | 0.00 | 0.00 | colorburst 154.9, mage_bolt 39.7, paint_zone 28.1 | colorburst 154.5, mage_bolt 39.2, paint_zone 28.0 | color_bolt 58.4% | 10.0% | 0.0% | 99.4% | 0.0% | OK |
| Brawler base | Generated field | 57.1% | 15.1s | 0.00 | 0.00 | brawler_slam 132.7, inkquake 102.2 | brawler_slam 50.8, nib_halo 46.1, longshot_quill 34.5 | body_slam 94.0% | 2.3% | 0.0% | 66.5% | 0.0% | OK |
| Longshot base | Generated field | 49.2% | 19.2s | 0.00 | 0.00 | longshot_quill 94.0, nib_halo 52.0 | brawler_slam 47.2, inkquake 27.2, longshot_quill 26.1 | nib_volley 100.0%, piercing_quill 81.5% | 67.2% | 36.1% | 85.6% | 0.0% | OK |
| Mage base | Generated field | 55.9% | 18.6s | 0.00 | 0.00 | colorburst 97.9, mage_bolt 55.2, colorburst_echo 27.3 | colorburst 43.5, longshot_quill 36.7, brawler_slam 36.4 | color_bolt 74.5% | 52.8% | 4.6% | 67.8% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
