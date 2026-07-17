# Weapon + Roguelite Rarity Progression

Generated: 2026-07-17T04:26:30.633Z

Runner: `app/tools/balancer/run.mjs`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

| Target | Opponent | Win rate | Avg duration | Power-Up triggers | Target PU | Baseline | Swing | Interaction | Weapon only | Skill only | A/B gap | Weak-side win rate | Target rarity | Opponent rarity | Comparison | Scope | Expected | Timeouts | Stalled | Close | Blowouts | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Brawler base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 58.2% | 10.1s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.6pp | — | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 0.0% | 0.0% | 86.0% | 0.0% | OK |
| Longshot base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 60.7% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 2.1pp | — | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 100.0% | 85.4% | 100.0% | 0.0% | OK |
| Mage base · COMET CRAYON BLADE | Tiny Sword · Rank 3 | 61.9% | 19.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.2pp | — | epic | common | Rarity advantage | Same-role mirror | 56.0%–64.0% | 35.8% | 0.0% | 91.9% | 0.0% | OK |
| Brawler base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 56.4% | 10.2s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.3pp | — | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 0.0% | 0.0% | 99.3% | 0.0% | OK |
| Longshot base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 55.2% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.6pp | — | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 100.0% | 91.3% | 100.0% | 0.0% | OK |
| Mage base · Void Nib Lance | COMET CRAYON BLADE · Rank 3 | 53.7% | 19.4s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.9pp | — | legendary | epic | Rarity advantage | Same-role mirror | 53.0%–60.0% | 43.6% | 0.0% | 91.3% | 0.0% | OK |
| Brawler base · Void Nib Lance | Tiny Sword · Rank 3 | 65.6% | 10.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.1pp | — | legendary | common | Rarity advantage | Same-role mirror | 59.5%–68.0% | 0.0% | 0.0% | 81.5% | 0.0% | OK |
| Longshot base · Void Nib Lance | Tiny Sword · Rank 3 | 59.9% | 20.0s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 1.4pp | — | legendary | common | Rarity advantage | Same-role mirror | 59.5%–68.0% | 100.0% | 87.7% | 100.0% | 0.0% | OK |
| Mage base · Void Nib Lance | Tiny Sword · Rank 3 | 65.7% | 19.3s | 0.00 | 0.00 | 0.0% | 0.0pp | — | — | — | 0.7pp | — | legendary | common | Rarity advantage | Same-role mirror | 59.5%–68.0% | 36.8% | 0.0% | 91.9% | 0.0% | OK |
| Brawler base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 72.4% | 10.3s | 2.45 | 1.00 | 59.1% | 13.3pp | 9.9pp | 59.1% | 53.5% | 0.1pp | 72.4% | epic | common | Rarity advantage | Same-role mirror | 60.0%–91.0% | 0.0% | 0.0% | 95.2% | 0.0% | OK |
| Longshot base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 90.2% | 20.0s | 2.00 | 1.00 | 88.1% | 2.1pp | -8.3pp | 60.4% | 88.1% | 0.0pp | 90.2% | epic | common | Rarity advantage | Same-role mirror | 60.0%–91.0% | 100.0% | 71.1% | 100.0% | 0.0% | OK |
| Mage base · COMET CRAYON BLADE + higher skills | Tiny Sword + lower skills | 63.3% | 19.5s | 1.36 | 0.36 | 61.8% | 1.6pp | -8.5pp | 61.8% | 60.1% | 0.5pp | 63.1% | epic | common | Rarity advantage | Same-role mirror | 60.0%–91.0% | 52.5% | 0.0% | 95.2% | 0.0% | OK |
| Brawler base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 70.8% | 10.0s | 8.73 | 4.42 | 72.0% | -1.2pp | -7.8pp | 56.7% | 72.0% | 1.9pp | 69.9% | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 0.0% | 0.0% | 96.3% | 0.0% | OK |
| Longshot base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 64.1% | 20.0s | 8.00 | 4.00 | 65.1% | -1.0pp | -3.5pp | 52.5% | 65.1% | 0.4pp | 63.9% | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 100.0% | 34.0% | 97.6% | 0.0% | OK |
| Mage base · Void Nib Lance + higher skills | COMET CRAYON BLADE + lower skills | 76.5% | 19.2s | 8.00 | 4.00 | 66.9% | 9.6pp | 5.3pp | 54.3% | 66.9% | 0.4pp | 76.3% | legendary | epic | Rarity advantage | Same-role mirror | 54.0%–88.0% | 39.5% | 0.0% | 78.3% | 0.0% | OK |

## Hard flags

No balance flags from current thresholds.

## Watches

No watch-only rows from current thresholds.
