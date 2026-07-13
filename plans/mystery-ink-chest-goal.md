# Mystery Ink Chest Goal

## Objective

Create a polished, chest-led Shop that feels exciting without predatory gacha mechanics: tap a mini chest to shake and open it, show real Gear art and honest rarity odds, support one or ten opens with no 100-open or auto-repeat action, spend earned Ink, and keep future Reddit Gold cosmetics visibly disabled and cosmetic-only.

## Product rules

- Shop acquires, Bag equips, and Gallery remembers.
- Shop is a primary dock destination; Gallery opens from top-right Settings.
- Current earned currency remains Ink; Rumble and Spar wins already award it.
- Common/Rare/Epic odds remain 70%/25%/5%, with Epic guaranteed by open ten.
- One chest costs 5 Ink. Ten is the maximum batch and costs 50 Ink.
- Every open remains server-authored and individually idempotent; a failed ten-open resumes the exact unfinished operation instead of charging twice.
- Gear keeps the canonical two Weapon, two Armor, two Shoes, and two Accessory slots.
- Reddit Gold Styles is a disabled coming-soon card. No payment or entitlement flow is in scope.
- Excitement comes from art, chest motion, rarity color, collection discovery, and Forge progress—not near misses, countdowns, auto-repeat, fake scarcity, or hidden odds.

## Delivered

- [x] Replaced the capsule vending machine with a clickable illustrated chest.
- [x] Added a dedicated Shop scene with a generated scrapbook stage.
- [x] Replaced the Gallery dock slot with Shop and moved Gallery into top-right Settings.
- [x] Removed chest acquisition from Bag so inventory and equipment stay focused.
- [x] Added a Loot banner with a shining featured Gear preview and tappable effect details.
- [x] Added a disabled `REDDIT GOLD STYLES · COMING SOON` banner.
- [x] Added `OPEN 1` and server-safe `OPEN 10`; no `OPEN 100` or auto-repeat.
- [x] Added a ten-item results grid and accessible batch summary.
- [x] Made odds and `EPIC IN N OR SOONER` visible.
- [x] Added reduced-motion fallbacks for chest and rarity ceremonies.
- [x] Added Epic `Comet Crayon Blade` Weapon and `Rocket Eraser Boots` Shoes with shared vector art.
- [x] Reused Bag inventory, Forge, equipment, pity, operation receipts, and catalog preview architecture.
- [x] Made partial ten-open failures resume through an explicit `RETRY N` action with the remaining cost and safely recorded progress.

## Verification

- [x] Targeted ESLint passes for changed TypeScript files.
- [x] 32 discovered suites / 126 tests pass.
- [x] Live 393x852 Shop → settings → Gallery → Shop → one-open → reveal → Bag flow passes with zero browser warnings or errors.
- [x] Live ten-open completes as 8 Common, 1 Rare, 1 Epic and reports three new styles.
- [x] Screenshot proof exists in `artifacts/screenshots/`.
- [x] Full release gate passes: lint, type-check, 126 tests, 181 legacy harness groups, and production build.
- [x] Independent reviewer verdict is `FIXED` after adversarial retry and economy-boundary review.

## Stop rule

Complete only when the full release gate and independent review pass. If unrelated in-flight Gear combat or mock fixtures block the gate, preserve those files and report the exact blocker separately from the verified chest flow.
