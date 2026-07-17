# Three-Day Growing Loop

Generated: 2026-07-17T01:13:56.713Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Final PU | Top final sets | Picked cards | Triggered cards | Loop wins | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | --- |
| Brawler base | 3-day loop | 63.3% | 15.2s | 4.20 | 2.19 | 0.3% | 70.7% | 0.0% | 2.95 | PAPER SHIELD + COUNTER SKETCH + DOUBLE DOODLE (3); SMUDGE STEP + ECHO MARK + DOUBLE DOODLE (3); DOUBLE DOODLE + COUNTER SKETCH + SMUDGE STEP (3) | SMUDGE STEP (52); PAPER SHIELD (50); COUNTER SKETCH (43); DOUBLE DOODLE (42); WALLOP (20) | SMUDGE STEP (404); PAPER SHIELD (328); COUNTER SKETCH (240); DOUBLE DOODLE (230); WALLOP (226) | 5.70 | FLAG_WIN_PACING |
| Longshot base | 3-day loop | 42.9% | 19.0s | 3.19 | 1.57 | 68.1% | 75.3% | 0.0% | 2.81 | WIDER HALO + ORBITING NIB + COMBO SPARK (3); ORBITING NIB + WIDER HALO + BANK SHOT (3); ORBITING NIB + SMUDGE STEP + BANK SHOT (3) | ORBITING NIB (50); WIDER HALO (42); BANK SHOT (37); SMUDGE STEP (35); COMBO SPARK (27) | ORBITING NIB (301); SMUDGE STEP (246); WIDER HALO (218); COMBO SPARK (131); BANK SHOT (115) | 3.86 | FLAG_TIMEOUTS+FLAG_WIN_PACING |
| Mage base | 3-day loop | 57.6% | 19.1s | 3.50 | 1.73 | 48.9% | 76.3% | 0.1% | 2.95 | WET PAINT + COMBO SPARK + CENTER FOLD (2); PAINT SPLASH + COUNTER SKETCH + DOUBLE DOODLE (2); CENTER FOLD + COUNTER SKETCH + DOUBLE DOODLE (1) | CENTER FOLD (32); WET PAINT (27); COMBO SPARK (27); PAINT SPLASH (25); EDGE SPRING (23) | EDGE SPRING (156); WET PAINT (151); CENTER FOLD (150); PAINT SPLASH (132); HEART INK (116) | 5.19 | FLAG_TIMEOUTS+FLAG_WIN_PACING |

## Hard flags

- Brawler base vs 3-day loop: FLAG_WIN_PACING (63.3%, 15.2s avg)
- Longshot base vs 3-day loop: FLAG_TIMEOUTS+FLAG_WIN_PACING (42.9%, 19.0s avg)
- Mage base vs 3-day loop: FLAG_TIMEOUTS+FLAG_WIN_PACING (57.6%, 19.1s avg)

## Watches

No watch-only rows from current thresholds.
