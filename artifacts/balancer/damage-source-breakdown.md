# Damage Source Breakdown

Generated: 2026-07-15T08:58:40.687Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 46.3% | 10.6s | 0.00 | 0.00 | brawler_slam 153.9, inkquake 104.5 | brawler_slam 154.3, inkquake 104.0 | body_slam 97.3% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 36.9% | 16.9s | 0.00 | 0.00 | brawler_slam 134.8, inkquake 86.8 | nib_halo 153.5, longshot_quill 105.5 | body_slam 89.2% | 0.0% | 70.6% | 0.0% | OK |
| Brawler base | Mage base | 55.0% | 15.3s | 0.00 | 0.00 | brawler_slam 161.0, inkquake 78.0 | colorburst 116.4, mage_bolt 64.5, colorburst_echo 51.7 | body_slam 92.1% | 0.0% | 65.6% | 0.0% | OK |
| Longshot base | Brawler base | 56.9% | 17.0s | 0.00 | 0.00 | nib_halo 153.5, longshot_quill 105.5 | brawler_slam 135.8, inkquake 88.3 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 74.4% | 0.0% | OK |
| Longshot base | Longshot base | 50.0% | 19.2s | 0.00 | 0.00 | nib_halo 134.9, longshot_quill 104.0 | nib_halo 134.8, longshot_quill 104.8 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Mage base | 39.4% | 19.8s | 0.00 | 0.00 | nib_halo 121.2, longshot_quill 108.5 | colorburst 136.5, mage_bolt 67.3, colorburst_echo 20.6 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 90.0% | 0.0% | OK |
| Mage base | Brawler base | 46.3% | 15.3s | 0.00 | 0.00 | colorburst 117.1, mage_bolt 64.4, colorburst_echo 51.7 | brawler_slam 160.9, inkquake 78.2 | color_bolt 82.8% | 0.0% | 66.3% | 0.0% | OK |
| Mage base | Longshot base | 63.1% | 19.8s | 0.00 | 0.00 | colorburst 137.4, mage_bolt 67.4, colorburst_echo 21.3 | nib_halo 121.0, longshot_quill 108.0 | color_bolt 76.5% | 0.0% | 93.1% | 0.0% | OK |
| Mage base | Mage base | 61.3% | 19.2s | 0.00 | 0.00 | colorburst 148.4, mage_bolt 70.0, colorburst_echo 15.7 | colorburst 149.8, mage_bolt 69.4, colorburst_echo 11.8 | color_bolt 79.8% | 0.0% | 97.5% | 0.0% | OK |
| Brawler base | Generated field | 57.0% | 14.3s | 0.00 | 0.00 | brawler_slam 138.9, inkquake 94.0 | brawler_slam 51.0, nib_halo 48.8, longshot_quill 36.5 | body_slam 95.3% | 0.0% | 67.1% | 0.0% | OK |
| Longshot base | Generated field | 55.6% | 18.2s | 0.00 | 0.00 | nib_halo 134.5, longshot_quill 103.7 | nib_halo 46.1, colorburst 40.8, inkquake 38.0 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 73.1% | 0.0% | OK |
| Mage base | Generated field | 56.7% | 18.0s | 0.00 | 0.00 | colorburst 131.9, mage_bolt 65.9, colorburst_echo 31.7 | brawler_slam 48.2, colorburst 46.9, nib_halo 41.8 | color_bolt 78.9% | 0.0% | 70.8% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
