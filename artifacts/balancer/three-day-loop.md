# Three-Day Growing Loop

Generated: 2026-07-16T10:15:08.616Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Final PU | Top final sets | Picked cards | Triggered cards | Loop wins | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | --- |
| Brawler base | 3-day loop | 53.1% | 14.0s | 3.62 | 1.89 | 0.0% | 66.3% | 0.0% | 2.85 | SMUDGE STEP + PAPER SHIELD + COUNTER SKETCH (5); PAPER SHIELD + SMUDGE STEP + DOUBLE DOODLE (4); PAPER SHIELD + SMUDGE STEP + COUNTER SKETCH (3) | PAPER SHIELD (53); SMUDGE STEP (49); DOUBLE DOODLE (44); COUNTER SKETCH (39); WALLOP (28) | SMUDGE STEP (377); PAPER SHIELD (315); COUNTER SKETCH (213); DOUBLE DOODLE (209); WALLOP (180) | 4.78 | OK |
| Longshot base | 3-day loop | 52.6% | 18.9s | 3.49 | 1.74 | 0.0% | 88.9% | 0.0% | 2.90 | SMUDGE STEP + PAPER SHIELD + COMBO SPARK (3); DOUBLE DOODLE + COUNTER SKETCH + HEART INK (3); SMUDGE STEP + COUNTER SKETCH + ECHO MARK (2) | COUNTER SKETCH (44); SMUDGE STEP (38); COMBO SPARK (36); DOUBLE DOODLE (34); PAPER SHIELD (32) | COUNTER SKETCH (230); SMUDGE STEP (227); COMBO SPARK (196); DOUBLE DOODLE (183); PAPER SHIELD (172) | 4.74 | OK |
| Mage base | 3-day loop | 42.8% | 18.0s | 3.08 | 1.49 | 0.0% | 77.9% | 0.0% | 2.86 | CENTER FOLD + PAPER SHIELD + COMBO SPARK (3); CENTER FOLD + PAPER SHIELD + EDGE SPRING (2); COUNTER SKETCH + PAPER SHIELD + CENTER FOLD (2) | EDGE SPRING (39); COMBO SPARK (37); CENTER FOLD (36); DOUBLE DOODLE (25); PAPER SHIELD (25) | EDGE SPRING (197); CENTER FOLD (161); DOUBLE DOODLE (139); HEART INK (125); PAPER SHIELD (124) | 3.85 | FLAG_WIN_PACING |

## Hard flags

- Mage base vs 3-day loop: FLAG_WIN_PACING (42.8%, 18.0s avg)

## Watches

No watch-only rows from current thresholds.
