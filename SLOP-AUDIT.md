# Slop Audit — Scribbits Arena

_Last verified: 2026-07-13 against the current dirty worktree._

## Summary

The cleanup closed every verified P0 and P1 finding and four of the six P2 findings. Current verified open totals: **0 P0, 0 P1, 2 P2**. The remaining work is bounded: migrate the 17k-line legacy deterministic harness into focused suites, and decide whether to keep or delete one unreferenced 312 KB Arena source bitmap.

The player-facing cleanup is also complete: the Ink Kit now has the four canonical Gear categories plus a separate Styles section, each Gear style renders once with aggregate Forge progress, the retired Impact and Edge effect families are gone, and Replay health is presented as full/half/empty hearts.

## Closed in this pass

### P0-1 and P1-2 — one equipment taxonomy and one card per Gear style

- `app/src/shared/equipment.ts:6-13` remains the only category contract: Weapon, Armor, Shoes, and Accessory.
- `app/src/client/lib/collectionbook.ts:18-61` consumes that contract and adds Styles as the only non-Gear section.
- `app/src/client/lib/collectionbook.ts:330-367` renders one aggregate card per owned Gear style with rank, copies, and Forge progress. Per-copy keys and `LOOSE PIECE`/`FORGE PIECE` presentation are removed.
- `app/tests/equipment-contract.test.mjs` guards the taxonomy, consolidated presentation, and retired Impact/Edge families.

### P0-2 — one Ink balance key owner

- `app/src/server/core/inkStore.ts:96` owns `ink:${userId}` construction.
- Daily Spar rewards consume that owner rather than reconstructing the key.
- `app/tests/architecture-contract.test.mjs` rejects a second production owner.

### P1-1 — reply-loss-safe daily Care and Champion workflows

- `app/src/server/core/dailyActions.ts:90` owns the atomic Care action and exact retry recovery.
- `app/src/server/core/dailyActions.ts:247` owns the Champion outcome, battle report, daily marker, and retry recovery.
- `app/src/server/routes/api.ts` delegates both routes to those workflows.
- `app/tests/daily-actions.test.mjs` injects an ambiguous commit and proves no duplicate XP, Ink, report, or outcome.

### P1-3 — one complete Scribbit removal workflow

- `app/src/server/core/removal.ts:13` owns owner removal, report-threshold removal, battle cleanup, Champion cleanup, and full moderation-index cleanup.
- Owner, moderation, and privacy entry points delegate to it.
- `app/tests/scribbit-removal.test.mjs` verifies the forward and reverse cleanup paths.

### P1-4 — stored corruption fails closed

- Founder Chronicle, Rival Run, Ink balance, capsule pull count, and capsule pity parsers now distinguish `missing`, `valid`, and `invalid` state.
- Invalid bytes are preserved and block derived writes instead of silently resetting progression.
- `app/tests/stored-state-corruption.test.mjs` proves the exact corrupt bytes survive.

### P1-5 — one Rumble return policy

- `app/src/server/core/rumbleReturn.ts:172` owns both owned and backed return receipts, payout, replay visibility, and fighter projection.
- `app/src/server/routes/api.ts:726` performs one delegation.
- `app/tests/rumble-return.test.mjs` covers owned, backed, hidden-fighter, and route-contract cases.

### P1-6 — receipts use the canonical modal lifecycle

- Arena Rumble return and Legacy return both compose `CanvasModalOverlay`.
- Background inerting, focus trapping, Escape handling, and focus restoration now share the same owner.

### P2-1 — retired personal Legends archive removed

- `myFaded` and `getFadedScribbitsForUser` are removed from shared state, production loading, API responses, client paging, and mock payloads.
- `app/tests/legends-contract.test.mjs` prevents the parallel archive from returning.

### P2-3 — one sticker-modal shell

- `app/src/client/lib/stickermodalshell.ts:36` owns the common card, opening tween, input-ready fence, lifecycle cleanup, and close geometry.
- Care and draw confirmation compose the shared shell.

### P2-5 — one Gallery text fitter

- `app/src/client/lib/fittext.ts:1` is shared by Gallery and Legacy cards.
- `app/tests/fit-text.test.mjs` covers trim, bound, and ellipsis behavior.

### P2-6 — canonical player vocabulary

- Player copy uses Pick, Gear, and Forge while `/api/back`, stored `backed`, and other compatibility identifiers remain stable internally.
- `app/tests/player-vocabulary.test.mjs` guards both sides of that boundary.

### Additional requested cleanup

- Impact and Edge are no longer Gear effect families; their six items were reassigned across the six supported families.
- Replay now plans and renders six heart icons with full, half, and empty states; numeric health remains available through the accessibility label.
- `renderMysteryCosmeticPreview`, `removeRumbleEntrant`, and unused request/slot type aliases were deleted.

## Remaining P2 work

### P2-2 — finish splitting the legacy deterministic harness

- **Current improvement:** `app/scripts/run-test-suites.mjs` discovers `app/tests/**/*.test.mjs`, compiles through `app/tools/tsconfig.tests.json` into an isolated temporary directory, removes that directory after the run, and then runs the legacy harness for compatibility coverage.
- **Still open:** `app/scripts/test-battle.mjs` remains a 17k-line domain-spanning suite with its older compilation/import wiring.
- **Next cut:** move one domain at a time into `app/tests`, beginning with combat presentation and equipment/economy, then remove each migrated legacy block.

### P2-4 — one unreferenced Arena source bitmap remains

- `app/src/client/assets/scribbits-arena-stage.jpg` is unreferenced and approximately 312 KB.
- It is currently untracked and may be active user artwork, so it was preserved rather than deleted during a shared dirty-worktree cleanup.
- The dead renderer, dead server function, and dead type exports from this finding are already removed.

## Verification snapshot

- `./verify.command`: pass.
- Type-check: pass.
- ESLint: pass.
- Discoverable suites: **29/29 tests pass** across 10 files.
- Legacy deterministic harness: **176/176 groups pass**.
- Production build: pass in **5169 ms**.
- Live mobile browser proof: Ink Kit exposes Weapon, Armor, Shoes, Accessory, and Styles; Weapon shows one card per style; runtime errors: **0**.
- Screenshot: `artifacts/scribbits-ink-kit-cleanup-verified.png`.

## Next cleanup order

1. Migrate combat-presentation assertions from `test-battle.mjs` into a focused suite.
2. Continue by equipment/economy domain until the legacy harness can be deleted.
3. Confirm ownership of `scribbits-arena-stage.jpg`, then either wire it intentionally or delete it.
