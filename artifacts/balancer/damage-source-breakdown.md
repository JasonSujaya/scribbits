# Damage Source Breakdown

Generated: 2026-07-15T05:54:35.361Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 50.0% | 13.5s | 0.00 | 0.00 | brawler_slam 137.1, inkquake 87.9 | brawler_slam 137.3, inkquake 87.7 | body_slam 65.3% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 46.3% | 13.7s | 0.00 | 0.00 | inkquake 87.2, brawler_slam 49.4 | nib_halo 135.1, longshot_quill 89.4 | body_slam 66.7% | 0.0% | 50.0% | 0.0% | OK |
| Brawler base | Mage base | 60.0% | 13.4s | 0.00 | 0.00 | inkquake 94.0, brawler_slam 90.6 | colorburst 103.7, mage_bolt 57.0, colorburst_echo 54.5 | body_slam 57.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Brawler base | 55.0% | 13.7s | 0.00 | 0.00 | nib_halo 134.9, longshot_quill 89.7 | inkquake 87.0, brawler_slam 49.7 | nib_volley 100.0%, piercing_quill 98.8% | 0.0% | 50.0% | 0.0% | OK |
| Longshot base | Longshot base | 50.0% | 13.0s | 0.00 | 0.00 | nib_halo 100.2, longshot_quill 84.8 | nib_halo 100.1, longshot_quill 84.9 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Mage base | 40.6% | 13.9s | 0.00 | 0.00 | longshot_quill 90.0, nib_halo 82.0 | colorburst 106.8, mage_bolt 51.5, colorburst_echo 20.6 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 78.1% | 0.0% | OK |
| Mage base | Brawler base | 43.1% | 13.4s | 0.00 | 0.00 | colorburst 103.5, mage_bolt 56.7, colorburst_echo 54.4 | inkquake 93.4, brawler_slam 91.2 | color_bolt 90.8% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Longshot base | 58.8% | 13.9s | 0.00 | 0.00 | colorburst 106.2, mage_bolt 51.4, colorburst_echo 20.4 | longshot_quill 90.4, nib_halo 81.9 | color_bolt 81.7% | 0.0% | 73.8% | 0.0% | OK |
| Mage base | Mage base | 51.2% | 17.0s | 0.00 | 0.00 | colorburst 132.4, mage_bolt 51.5, colorburst_echo 0.8 | colorburst 132.2, mage_bolt 51.8, colorburst_echo 0.7 | color_bolt 66.7% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Generated field | 26.2% | 13.9s | 0.00 | 0.00 | brawler_slam 88.5, inkquake 86.7 | nib_halo 64.0, longshot_quill 48.4, brawler_slam 35.4 | body_slam 72.2% | 0.0% | 57.4% | 0.0% | OK |
| Longshot base | Generated field | 48.0% | 13.9s | 0.00 | 0.00 | nib_halo 106.8, longshot_quill 85.5 | nib_halo 50.7, longshot_quill 41.7, colorburst 23.2 | nib_volley 100.0%, piercing_quill 92.6% | 0.0% | 75.6% | 0.0% | OK |
| Mage base | Generated field | 61.3% | 14.5s | 0.00 | 0.00 | colorburst 113.7, mage_bolt 54.8, colorburst_echo 23.0 | longshot_quill 41.7, nib_halo 33.2, colorburst 32.0 | color_bolt 80.1% | 0.0% | 59.8% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
