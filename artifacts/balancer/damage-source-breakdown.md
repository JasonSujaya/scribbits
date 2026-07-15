# Damage Source Breakdown

Generated: 2026-07-15T11:50:40.903Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 53.1% | 10.6s | 0.00 | 0.00 | brawler_slam 154.3, inkquake 104.1 | brawler_slam 153.5, inkquake 104.4 | body_slam 97.3% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 40.6% | 17.0s | 0.00 | 0.00 | brawler_slam 134.0, inkquake 85.7 | nib_halo 158.4, longshot_quill 100.6 | body_slam 89.6% | 0.0% | 72.5% | 0.0% | OK |
| Brawler base | Mage base | 58.8% | 15.2s | 0.00 | 0.00 | brawler_slam 160.3, inkquake 78.7 | colorburst 115.2, mage_bolt 65.0, colorburst_echo 54.0 | body_slam 92.0% | 0.0% | 80.6% | 0.0% | OK |
| Longshot base | Brawler base | 61.9% | 17.0s | 0.00 | 0.00 | nib_halo 158.7, longshot_quill 100.4 | brawler_slam 133.6, inkquake 85.0 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 70.0% | 0.0% | OK |
| Longshot base | Longshot base | 45.6% | 19.6s | 0.00 | 0.00 | nib_halo 141.7, longshot_quill 98.0 | nib_halo 141.6, longshot_quill 98.1 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Mage base | 34.4% | 19.8s | 0.00 | 0.00 | nib_halo 124.0, longshot_quill 104.8 | colorburst 138.3, mage_bolt 68.6, colorburst_echo 21.6 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 95.6% | 0.0% | OK |
| Mage base | Brawler base | 40.6% | 15.4s | 0.00 | 0.00 | colorburst 114.8, mage_bolt 65.6, colorburst_echo 55.1 | brawler_slam 161.5, inkquake 77.5 | color_bolt 82.9% | 0.0% | 85.0% | 0.0% | OK |
| Mage base | Longshot base | 58.8% | 19.9s | 0.00 | 0.00 | colorburst 136.9, mage_bolt 69.7, colorburst_echo 20.0 | nib_halo 124.5, longshot_quill 105.1 | color_bolt 77.4% | 0.0% | 96.3% | 0.0% | OK |
| Mage base | Mage base | 50.6% | 19.2s | 0.00 | 0.00 | colorburst 149.3, mage_bolt 69.8, colorburst_echo 13.5 | colorburst 149.5, mage_bolt 69.8, colorburst_echo 13.8 | color_bolt 78.8% | 0.0% | 98.1% | 0.0% | OK |
| Brawler base | Generated field | 57.8% | 14.5s | 0.00 | 0.00 | brawler_slam 146.9, inkquake 88.0 | brawler_slam 50.7, nib_halo 48.7, colorburst 35.5 | body_slam 96.9% | 0.0% | 73.8% | 0.0% | OK |
| Longshot base | Generated field | 50.3% | 18.7s | 0.00 | 0.00 | nib_halo 139.5, longshot_quill 101.5 | nib_halo 46.5, colorburst 43.1, inkquake 33.5 | nib_volley 100.0%, piercing_quill 100.0% | 0.0% | 71.4% | 0.0% | OK |
| Mage base | Generated field | 60.2% | 18.0s | 0.00 | 0.00 | colorburst 131.9, mage_bolt 68.2, colorburst_echo 29.8 | brawler_slam 49.3, colorburst 48.4, nib_halo 41.7 | color_bolt 79.7% | 0.0% | 76.4% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
