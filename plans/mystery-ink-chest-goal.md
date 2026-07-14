# Mystery Ink Chest Goal

## Objective

Create a polished, chest-led Shop that feels exciting without predatory gacha mechanics: tap a mini chest to shake and open it, show real Gear art and honest rarity odds, support one or ten opens with no 100-open or auto-repeat action, spend earned Ink, and keep future Reddit Gold cosmetics visibly disabled and cosmetic-only.

## Product rules

- Shop acquires, Bag equips, and Gallery remembers.
- Shop is a primary dock destination; Gallery opens directly from Home.
- Current earned currency remains Ink; battles are the main source while daily play can award small bridge amounts.
- Common/Rare/Epic odds remain 70%/25%/5%, with Epic guaranteed by open ten.
- One chest costs 5 Ink. Ten is the maximum batch and costs 50 Ink.
- Every open remains server-authored and individually idempotent; a failed ten-open resumes the exact unfinished operation instead of charging twice.
- Gear keeps the canonical two Weapon, two Armor, two Shoes, and two Accessory slots.
- Reddit Gold Styles is a disabled coming-soon card. No payment or entitlement flow is in scope.
- Excitement comes from art, chest motion, rarity color, collection discovery, and Forge progress—not near misses, countdowns, auto-repeat, fake scarcity, or hidden odds.

## Delivered

- [x] Replaced the capsule vending machine and procedural chest geometry with matched generated closed/open chest art.
- [x] Added a dedicated Shop scene with a generated scrapbook stage.
- [x] Replaced the Gallery dock slot with Shop and moved Gallery to a compact Home action.
- [x] Removed chest acquisition from Bag so inventory and equipment stay focused.
- [x] Added a Loot banner with a shining featured Gear preview and tappable effect details.
- [x] Added a disabled `REDDIT GOLD STYLES · COMING SOON` banner.
- [x] Added generated Ink tokens to the wallet and exact `OPEN ×1` / `OPEN ×10` costs; no intermediate, `OPEN 100`, or auto-repeat action.
- [x] Added a paid-order ten-item reveal cadence that pauses for rarity, announces each reward, and keeps the complete 5x2 grid visible.
- [x] Limited visible focus rings to keyboard navigation so programmatic focus no longer paints red rectangles over the canvas.
- [x] Made odds and `EPIC IN N OR SOONER` visible.
- [x] Added reduced-motion fallbacks for chest and rarity ceremonies.
- [x] Added Epic `Comet Crayon Blade` Weapon and `Rocket Eraser Boots` Shoes with shared vector art.
- [x] Reused Bag inventory, Forge, equipment, pity, operation receipts, and catalog preview architecture.
- [x] Made partial ten-open failures resume through an explicit `RETRY N` action with the remaining cost and safely recorded progress.

## Verification

- [x] Current chest-scope TypeScript and targeted ESLint pass for all changed client modules.
- [x] All five focused Mystery Ink presentation and reveal tests pass, including paid order, reduced motion, generated art, and focus modality.
- [x] Live 393x852 Shop → one-open and ten-open flows pass with zero browser warnings or errors.
- [x] Live ten-open completes as 8 Common, 1 Rare, and 1 Epic, then keeps the full ten-item grid visible.
- [x] Clean mobile screenshot proof exists in `artifacts/screenshots/` for the Ink controls, one-open reward, and final ten-open grid.
- [x] The full release gate reached green after the chest implementation: type-check, lint, all 43 Node suites, legacy simulation harness, and production build.
- [x] Keyboard-only focus proof keeps the coral ring aligned to the exact `OPEN ×10` button bounds.
- [x] Independent reviewer verdict is `FIXED` after re-checking controls, ceremony, paid order, reduced motion, retry safety, and live proof.
- [ ] A final whole-worktree repeat is currently blocked by unrelated in-flight `season.ts` and `Draw.ts` edits that arrived after the green run; preserve that work and rerun the gate when those edits settle.

## Stop rule

Complete only when the full release gate and independent review pass. If unrelated in-flight Gear combat or mock fixtures block the gate, preserve those files and report the exact blocker separately from the verified chest flow.
