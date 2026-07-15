# Damage Source Breakdown

Generated: 2026-07-15T00:37:04.115Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Target dmg/source | Taken dmg/source | Target hit rate | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base | Brawler base | 50.0% | 13.5s | 0.00 | 0.00 | brawler_slam 137.1, inkquake 88.0 | brawler_slam 137.1, inkquake 87.9 | body_slam 65.2% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Longshot base | 100.0% | 13.4s | 0.00 | 0.00 | inkquake 105.6, brawler_slam 79.4 | nib_halo 98.1, longshot_quill 85.2 | body_slam 100.0% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Brawler base | Gunner base | 62.5% | 15.2s | 0.00 | 0.00 | brawler_slam 86.3, inkquake 84.7 | smearstep 133.0, gunner_shot 85.0 | body_slam 89.9% | 0.0% | 62.5% | 0.0% | OK |
| Brawler base | Mage base | 11.3% | 13.9s | 0.00 | 0.00 | inkquake 100.2, brawler_slam 84.0 | colorburst 104.2, colorburst_echo 60.9, mage_bolt 59.7 | body_slam 66.7% | 0.0% | 100.0% | 0.0% | FLAG_WIN_RATE |
| Longshot base | Brawler base | 0.0% | 13.4s | 0.00 | 0.00 | nib_halo 98.0, longshot_quill 84.8 | inkquake 105.1, brawler_slam 79.9 | piercing_quill 100.0%, nib_volley 87.5% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Longshot base | Longshot base | 50.0% | 14.4s | 0.00 | 0.00 | nib_halo 117.0, longshot_quill 66.0 | nib_halo 117.0, longshot_quill 66.0 | nib_volley 100.0%, piercing_quill 81.8% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base | Gunner base | 0.0% | 16.7s | 0.00 | 0.00 | nib_halo 70.0, longshot_quill 51.1 | smearstep 94.9, gunner_shot 90.1 | piercing_quill 50.0%, nib_volley 50.0% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Longshot base | Mage base | 100.0% | 14.4s | 0.00 | 0.00 | nib_halo 104.9, longshot_quill 80.1 | colorburst 87.5, mage_bolt 70.0 | piercing_quill 100.0%, nib_volley 100.0% | 0.0% | 46.9% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Brawler base | 33.8% | 15.2s | 0.00 | 0.00 | smearstep 132.2, gunner_shot 84.9 | brawler_slam 87.9, inkquake 84.2 | smearstep_barrage 87.2%, ink_shot 58.9% | 0.0% | 66.3% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Longshot base | 100.0% | 16.7s | 0.00 | 0.00 | smearstep 94.9, gunner_shot 90.1 | nib_halo 69.8, longshot_quill 51.0 | smearstep_barrage 55.6%, ink_shot 50.0% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Gunner base | Gunner base | 51.2% | 20.0s | 0.00 | 0.00 | gunner_shot 62.3, smearstep 61.2 | gunner_shot 61.9, smearstep 60.3 | ink_shot 33.0%, smearstep_barrage 26.9% | 0.0% | 100.0% | 0.0% | OK |
| Gunner base | Mage base | 91.9% | 18.3s | 0.00 | 0.00 | smearstep 95.5, gunner_shot 82.7 | mage_bolt 67.7, colorburst 39.2, colorburst_echo 23.7 | ink_shot 62.9%, smearstep_barrage 53.5% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Mage base | Brawler base | 86.3% | 13.9s | 0.00 | 0.00 | colorburst 104.1, colorburst_echo 60.9, mage_bolt 59.8 | inkquake 100.1, brawler_slam 84.0 | color_bolt 91.7% | 0.0% | 100.0% | 0.0% | FLAG_WIN_RATE |
| Mage base | Longshot base | 0.0% | 14.4s | 0.00 | 0.00 | colorburst 87.7, mage_bolt 69.9 | nib_halo 104.8, longshot_quill 80.2 | color_bolt 83.3% | 0.0% | 55.6% | 0.0% | FLAG_WIN_RATE |
| Mage base | Gunner base | 6.3% | 18.4s | 0.00 | 0.00 | mage_bolt 68.1, colorburst 38.3, colorburst_echo 23.4 | smearstep 96.4, gunner_shot 83.3 | color_bolt 70.1% | 0.0% | 0.0% | 0.0% | FLAG_WIN_RATE |
| Mage base | Mage base | 48.1% | 17.1s | 0.00 | 0.00 | colorburst 132.8, mage_bolt 51.8, colorburst_echo 0.1 | colorburst 132.6, mage_bolt 51.9, colorburst_echo 0.1 | color_bolt 66.7% | 0.0% | 100.0% | 0.0% | OK |
| Brawler base | Generated field | 50.6% | 14.3s | 0.00 | 0.00 | brawler_slam 105.8, inkquake 85.9 | smearstep 50.9, brawler_slam 41.5, gunner_shot 32.4 | body_slam 76.6% | 0.0% | 62.1% | 0.0% | OK |
| Longshot base | Generated field | 51.6% | 16.3s | 0.00 | 0.00 | nib_halo 110.4, longshot_quill 71.3 | smearstep 36.1, gunner_shot 35.6, inkquake 30.7 | nib_volley 82.3%, piercing_quill 74.8% | 0.0% | 66.0% | 0.0% | OK |
| Gunner base | Generated field | 36.9% | 17.7s | 0.00 | 0.00 | gunner_shot 83.7, smearstep 78.8 | inkquake 33.1, gunner_shot 29.0, smearstep 25.0 | ink_shot 49.2%, smearstep_barrage 41.1% | 0.0% | 74.2% | 0.0% | OK |
| Mage base | Generated field | 32.8% | 16.5s | 0.00 | 0.00 | colorburst 67.9, mage_bolt 66.5, colorburst_echo 29.4 | brawler_slam 35.7, smearstep 29.2, gunner_shot 26.9 | color_bolt 78.0% | 0.0% | 65.8% | 0.0% | FLAG_WIN_RATE |

## Flags

- Brawler base vs Longshot base: FLAG_WIN_RATE (100.0%, 13.4s avg)
- Brawler base vs Mage base: FLAG_WIN_RATE (11.3%, 13.9s avg)
- Longshot base vs Brawler base: FLAG_WIN_RATE (0.0%, 13.4s avg)
- Longshot base vs Gunner base: FLAG_WIN_RATE (0.0%, 16.7s avg)
- Longshot base vs Mage base: FLAG_WIN_RATE (100.0%, 14.4s avg)
- Gunner base vs Brawler base: FLAG_WIN_RATE (33.8%, 15.2s avg)
- Gunner base vs Longshot base: FLAG_WIN_RATE (100.0%, 16.7s avg)
- Gunner base vs Mage base: FLAG_WIN_RATE (91.9%, 18.3s avg)
- Mage base vs Brawler base: FLAG_WIN_RATE (86.3%, 13.9s avg)
- Mage base vs Longshot base: FLAG_WIN_RATE (0.0%, 14.4s avg)
- Mage base vs Gunner base: FLAG_WIN_RATE (6.3%, 18.4s avg)
- Mage base vs Generated field: FLAG_WIN_RATE (32.8%, 16.5s avg)
