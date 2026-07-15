# Damage Source Breakdown

Generated: 2026-07-15T00:34:09.768Z

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
| Brawler base | Generated field | 46.7% | 14.5s | 0.00 | 0.00 | brawler_slam 108.3, inkquake 82.4 | smearstep 50.9, brawler_slam 41.5, gunner_shot 32.4 | body_slam 75.9% | 0.0% | 71.9% | 0.0% | OK |
| Longshot base | Generated field | 90.2% | 15.2s | 0.00 | 0.00 | nib_halo 107.3, longshot_quill 87.3 | smearstep 31.6, inkquake 28.7, gunner_shot 28.0 | piercing_quill 90.6%, nib_volley 85.1% | 0.0% | 61.9% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Generated field | 26.8% | 17.2s | 0.00 | 0.00 | gunner_shot 78.0, smearstep 74.8 | inkquake 33.1, gunner_shot 29.0, smearstep 25.0 | ink_shot 47.9%, smearstep_barrage 40.2% | 0.0% | 71.5% | 0.0% | FLAG_WIN_RATE |
| Mage base | Generated field | 31.8% | 16.2s | 0.00 | 0.00 | colorburst 75.4, mage_bolt 61.2, colorburst_echo 25.9 | brawler_slam 35.8, smearstep 28.4, gunner_shot 27.7 | color_bolt 74.0% | 0.0% | 62.3% | 0.0% | FLAG_WIN_RATE |

## Flags

- Longshot base vs Mage base: FLAG_WIN_RATE (96.3%, 14.2s avg)
- Gunner base vs Brawler base: FLAG_WIN_RATE (33.8%, 15.2s avg)
- Mage base vs Longshot base: FLAG_WIN_RATE (1.9%, 14.2s avg)
- Longshot base vs Generated field: FLAG_WIN_RATE (90.2%, 15.2s avg)
- Gunner base vs Generated field: FLAG_WIN_RATE (26.8%, 17.2s avg)
- Mage base vs Generated field: FLAG_WIN_RATE (31.8%, 16.2s avg)
