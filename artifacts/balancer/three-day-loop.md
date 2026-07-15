# Three-Day Growing Loop

Generated: 2026-07-15T05:54:35.358Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Timeouts | Close | Blowouts | Final PU | Top final sets | Picked cards | Triggered cards | Loop wins | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | --- |
| Brawler base | 3-day loop | 40.7% | 13.8s | 2.97 | 2.97 | 0.0% | 63.1% | 0.0% | 2.76 | CENTER FOLD + PAPER SHIELD + SMUDGE STEP (41); PAPER SHIELD + CENTER FOLD + SMUDGE STEP (23); CENTER FOLD + PAPER SHIELD (7) | CENTER FOLD (80); PAPER SHIELD (77); SMUDGE STEP (64) | PAPER SHIELD (1362); CENTER FOLD (507); SMUDGE STEP (267) | 3.66 | OK |
| Longshot base | 3-day loop | 90.4% | 13.7s | 2.58 | 2.58 | 0.0% | 48.8% | 0.0% | 2.99 | COMBO SPARK + SMUDGE STEP + CENTER FOLD (27); SMUDGE STEP + COMBO SPARK + PAPER SHIELD (23); SMUDGE STEP + COMBO SPARK + CENTER FOLD (15) | COMBO SPARK (80); SMUDGE STEP (80); CENTER FOLD (42); PAPER SHIELD (37) | COMBO SPARK (684); PAPER SHIELD (541); SMUDGE STEP (445); CENTER FOLD (184) | 8.14 | FLAG_WIN_RATE |
| Mage base | 3-day loop | 63.5% | 14.6s | 3.91 | 3.91 | 0.0% | 66.1% | 0.0% | 2.92 | PAPER SHIELD + CENTER FOLD + EDGE SPRING (33); CENTER FOLD + PAPER SHIELD + EDGE SPRING (16); EDGE SPRING + CENTER FOLD + PAPER SHIELD (16) | PAPER SHIELD (79); CENTER FOLD (79); EDGE SPRING (76) | PAPER SHIELD (1299); EDGE SPRING (1095); CENTER FOLD (421) | 5.71 | OK |

## Hard flags

- Longshot base vs 3-day loop: FLAG_WIN_RATE (90.4%, 13.7s avg)

## Watches

No watch-only rows from current thresholds.
