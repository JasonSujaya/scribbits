# Weapon + Roguelite Rarity Progression

Generated: 2026-07-17T01:08:13.626Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Weapon only | Skill only | A/B gap | Target rarity | Opponent rarity | Comparison | Scope | Expected | Timeouts | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Brawler base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 57.8% | 10.2s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.6pp | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 0.0% | 90.0% | 0.0% | OK |
| Longshot base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 59.0% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.6pp | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 100.0% | 100.0% | 0.0% | OK |
| Mage base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 62.3% | 19.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.1pp | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 33.5% | 92.8% | 0.0% | OK |
| Brawler base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 56.3% | 10.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.4pp | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 56.5% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.7pp | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 100.0% | 100.0% | 0.0% | OK |
| Mage base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 53.2% | 19.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.8pp | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 35.4% | 92.1% | 0.0% | OK |
| Brawler base · Void Nib Lance | Tiny Sword · Rank 3 | 61.5% | 10.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.2pp | legendary | common | Rarity advantage | Same-role mirror | 60.0%–68.0% | 0.0% | 90.9% | 0.0% | OK |
| Longshot base · Void Nib Lance | Tiny Sword · Rank 3 | 62.8% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.6pp | legendary | common | Rarity advantage | Same-role mirror | 60.0%–68.0% | 100.0% | 100.0% | 0.0% | OK |
| Mage base · Void Nib Lance | Tiny Sword · Rank 3 | 65.2% | 19.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.2pp | legendary | common | Rarity advantage | Same-role mirror | 60.0%–68.0% | 33.1% | 92.3% | 0.0% | OK |
| Brawler base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 86.3% | 10.3s | 2.69 | 1.00 | 66.3% | 20.0pp | 11.7pp | 58.3% | 66.3% | 1.2pp | epic | common | Rarity advantage | Same-role mirror | 60.0%–90.0% | 0.0% | 71.3% | 0.0% | OK |
| Longshot base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 79.5% | 20.0s | 2.00 | 1.00 | 79.2% | 0.3pp | -7.5pp | 57.8% | 79.2% | 1.1pp | epic | common | Rarity advantage | Same-role mirror | 60.0%–90.0% | 100.0% | 100.0% | 0.0% | OK |
| Mage base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 68.7% | 19.4s | 1.49 | 0.49 | 62.3% | 6.4pp | -5.4pp | 61.8% | 62.3% | 1.1pp | epic | common | Rarity advantage | Same-role mirror | 60.0%–90.0% | 39.9% | 97.4% | 0.0% | OK |
| Brawler base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 68.4% | 9.5s | 8.42 | 4.42 | 69.9% | -1.6pp | -7.9pp | 56.4% | 69.9% | 1.0pp | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 0.0% | 100.0% | 0.0% | OK |
| Longshot base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 80.6% | 20.0s | 6.64 | 3.32 | 79.5% | 1.1pp | -4.2pp | 55.3% | 79.5% | 1.9pp | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 100.0% | 100.0% | 0.0% | OK |
| Mage base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 72.6% | 19.2s | 8.00 | 4.00 | 63.6% | 9.0pp | 5.3pp | 53.7% | 63.6% | 1.9pp | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 36.3% | 74.3% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
