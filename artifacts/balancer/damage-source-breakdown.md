# Damage Source Breakdown

Generated: 2026-07-17T01:22:26.656Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 48.1% | 10.6s | 0.00 | 0.00 | brawler_slam 153.4, inkquake 104.5 | brawler_slam 153.9, inkquake 104.2 | body_slam 96.6% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 39.4% | 18.7s | 0.00 | 0.00 | brawler_slam 129.1, inkquake 81.9 | nib_halo 153.3, longshot_quill 105.0 | body_slam 82.0% | 0.0% | 39.4% | 0.0% | OK |
| Brawler base | Mage base | 60.0% | 18.6s | 0.00 | 0.00 | inkquake 129.0, brawler_slam 110.1 | mage_bolt 88.0, colorburst 83.2, colorburst_echo 60.0 | body_slam 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Brawler base | 56.9% | 18.7s | 0.00 | 0.00 | nib_halo 153.0, longshot_quill 105.0 | brawler_slam 130.5, inkquake 82.3 | nib_volley 100.0%, piercing_quill 92.9% | 0.0% | 42.5% | 0.0% | OK |
| Longshot base | Longshot base | 52.5% | 20.0s | 0.00 | 0.00 | longshot_quill 84.0 | longshot_quill 84.0 | piercing_quill 85.7% | 100.0% | 100.0% | 0.0% | OK |
| Longshot base | Mage base | 38.8% | 20.0s | 0.00 | 0.00 | longshot_quill 100.0, nib_halo 16.9 | colorburst 63.9, mage_bolt 28.0, colorburst_echo 21.0 | nib_volley 100.0%, piercing_quill 85.7% | 100.0% | 100.0% | 0.0% | OK |
| Mage base | Brawler base | 43.8% | 18.6s | 0.00 | 0.00 | mage_bolt 88.0, colorburst 84.2, colorburst_echo 60.1 | inkquake 129.1, brawler_slam 109.9 | color_bolt 85.7% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Longshot base | 63.7% | 20.0s | 0.00 | 0.00 | colorburst 63.7, mage_bolt 28.0, colorburst_echo 21.0 | longshot_quill 99.9, nib_halo 17.1 | color_bolt 62.5% | 100.0% | 100.0% | 0.0% | OK |
| Mage base | Mage base | 54.4% | 19.6s | 0.00 | 0.00 | colorburst 154.0, mage_bolt 39.6, paint_zone 28.1 | colorburst 153.5, mage_bolt 39.3, paint_zone 28.3 | color_bolt 58.2% | 12.5% | 100.0% | 0.0% | OK |
| Brawler base | Generated field | 57.7% | 15.1s | 0.00 | 0.00 | brawler_slam 132.7, inkquake 102.3 | brawler_slam 50.7, nib_halo 46.1, longshot_quill 34.5 | body_slam 94.1% | 2.3% | 67.1% | 0.0% | OK |
| Longshot base | Generated field | 48.6% | 19.2s | 0.00 | 0.00 | longshot_quill 88.2, nib_halo 51.7 | brawler_slam 47.2, inkquake 27.3, colorburst 20.5 | nib_volley 100.0%, piercing_quill 81.0% | 67.2% | 85.9% | 0.0% | OK |
| Mage base | Generated field | 54.8% | 18.6s | 0.00 | 0.00 | colorburst 97.7, mage_bolt 55.1, colorburst_echo 27.6 | colorburst 43.3, longshot_quill 36.8, brawler_slam 36.4 | color_bolt 74.5% | 52.5% | 67.1% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
