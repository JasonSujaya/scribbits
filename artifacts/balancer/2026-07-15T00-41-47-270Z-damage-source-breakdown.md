# Damage Source Breakdown

Generated: 2026-07-15T00:41:47.337Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 50.0% | 13.5s | 0.00 | 0.00 | brawler_slam 137.1, inkquake 88.0 | brawler_slam 137.1, inkquake 87.9 | body_slam 65.2% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 50.0% | 14.0s | 0.00 | 0.00 | inkquake 117.6, brawler_slam 45.3 | nib_halo 126.0, longshot_quill 94.5 | body_slam 83.3% | 0.0% | 50.0% | 0.0% | OK |
| Brawler base | Gunner base | 62.5% | 15.2s | 0.00 | 0.00 | brawler_slam 86.3, inkquake 84.7 | smearstep 133.0, gunner_shot 85.0 | body_slam 89.9% | 0.0% | 62.5% | 0.0% | OK |
| Brawler base | Mage base | 50.0% | 13.4s | 0.00 | 0.00 | inkquake 94.2, brawler_slam 90.3 | colorburst 104.6, mage_bolt 55.2, colorburst_echo 54.8 | body_slam 58.6% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Brawler base | 50.0% | 14.0s | 0.00 | 0.00 | nib_halo 125.8, longshot_quill 94.7 | inkquake 117.4, brawler_slam 45.4 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 50.0% | 0.0% | OK |
| Longshot base | Longshot base | 50.0% | 13.0s | 0.00 | 0.00 | nib_halo 100.1, longshot_quill 84.9 | nib_halo 99.7, longshot_quill 85.3 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Gunner base | 57.5% | 17.1s | 0.00 | 0.00 | longshot_quill 91.7, nib_halo 88.5 | smearstep 87.3, gunner_shot 77.6 | piercing_quill 75.2%, nib_volley 66.1% | 0.0% | 82.5% | 0.0% | OK |
| Longshot base | Mage base | 96.3% | 14.2s | 0.00 | 0.00 | nib_halo 100.0, longshot_quill 84.7 | colorburst 100.5, mage_bolt 38.1, colorburst_echo 19.8 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 37.5% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Brawler base | 33.8% | 15.2s | 0.00 | 0.00 | smearstep 132.2, gunner_shot 84.9 | brawler_slam 87.9, inkquake 84.2 | smearstep_barrage 87.2%, ink_shot 58.9% | 0.0% | 66.3% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Longshot base | 41.3% | 17.1s | 0.00 | 0.00 | smearstep 87.5, gunner_shot 77.6 | longshot_quill 91.6, nib_halo 88.6 | smearstep_barrage 47.4%, ink_shot 41.9% | 0.0% | 83.8% | 0.0% | OK |
| Gunner base | Gunner base | 51.2% | 20.0s | 0.00 | 0.00 | gunner_shot 62.3, smearstep 61.2 | gunner_shot 61.9, smearstep 60.3 | ink_shot 33.0%, smearstep_barrage 26.9% | 0.0% | 100.0% | 0.0% | OK |
| Gunner base | Mage base | 50.0% | 17.7s | 0.00 | 0.00 | smearstep 74.6, gunner_shot 72.8 | colorburst 61.6, mage_bolt 58.1, colorburst_echo 30.0 | ink_shot 57.9%, smearstep_barrage 44.8% | 0.0% | 12.5% | 0.0% | OK |
| Mage base | Brawler base | 48.8% | 13.4s | 0.00 | 0.00 | colorburst 104.0, colorburst_echo 55.2, mage_bolt 55.1 | inkquake 94.0, brawler_slam 90.5 | color_bolt 90.9% | 0.0% | 100.0% | 0.0% | OK |
| Mage base | Longshot base | 1.9% | 14.2s | 0.00 | 0.00 | colorburst 99.8, mage_bolt 38.3, colorburst_echo 19.9 | nib_halo 100.2, longshot_quill 84.8 | color_bolt 52.1% | 0.0% | 36.3% | 0.0% | FLAG_WIN_RATE |
| Mage base | Gunner base | 58.8% | 17.5s | 0.00 | 0.00 | colorburst 65.4, mage_bolt 58.3, colorburst_echo 30.9 | gunner_shot 73.0, smearstep 72.7 | color_bolt 62.9% | 0.0% | 15.6% | 0.0% | OK |
| Mage base | Mage base | 48.1% | 17.1s | 0.00 | 0.00 | colorburst 132.8, mage_bolt 51.8, colorburst_echo 0.1 | colorburst 132.6, mage_bolt 51.9, colorburst_echo 0.1 | color_bolt 66.7% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Generated field | 57.0% | 14.1s | 0.00 | 0.00 | brawler_slam 98.5, inkquake 93.4 | brawler_slam 35.5, nib_halo 30.9, smearstep 30.1 | body_slam 74.4% | 0.0% | 67.8% | 0.0% | OK |
| Longshot base | Generated field | 75.6% | 14.9s | 0.00 | 0.00 | nib_halo 106.6, longshot_quill 88.4 | nib_halo 26.4, inkquake 25.7, colorburst 22.6 | piercing_quill 93.1%, nib_volley 89.4% | 0.0% | 63.5% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Generated field | 64.6% | 18.0s | 0.00 | 0.00 | smearstep 85.9, gunner_shot 79.4 | inkquake 26.0, nib_halo 23.6, longshot_quill 21.8 | ink_shot 48.8%, smearstep_barrage 46.8% | 0.0% | 63.7% | 0.0% | OK |
| Mage base | Generated field | 41.8% | 16.0s | 0.00 | 0.00 | colorburst 100.1, mage_bolt 56.4, colorburst_echo 25.9 | colorburst 32.0, brawler_slam 26.3, nib_halo 21.2 | color_bolt 69.7% | 0.0% | 76.2% | 0.0% | OK |

## Flags

- Longshot base vs Mage base: FLAG_WIN_RATE (96.3%, 14.2s avg)
- Gunner base vs Brawler base: FLAG_WIN_RATE (33.8%, 15.2s avg)
- Mage base vs Longshot base: FLAG_WIN_RATE (1.9%, 14.2s avg)
- Longshot base vs Generated field: FLAG_WIN_RATE (75.6%, 14.9s avg)
