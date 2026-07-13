# Slop Audit — Scribbits Arena

_Last verified: 2026-07-14 against the current dirty worktree._

## Summary

The cleanup closed every verified P0 and P1 finding and five of the six P2 findings. Current verified open totals: **0 P0, 0 P1, 1 P2**. Migration of the legacy deterministic harness now has focused battle-presentation and capsule-presentation suites. The remaining work is bounded to continuing that domain-by-domain migration.

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

### P2-7 — one Arena action system and one Mystery Ink entry

- Arena now renders the selected Scribbit and selected opponent as one visible
  matchup, then uses the shared paper `iconButton` system for Champion, Spar,
  Fight, and the compact Rumble action. Three local rounded-box button variants
  are deleted.
- Champion keeps one focused daily-contract launcher. Every player-facing Spar
  from Arena, first birth, or a Replay result delegates to
  `app/src/client/lib/rivalrunflow.ts`, which owns the server slate, UTC rollover,
  selected-opponent request, report staging, errors, and VS ceremony. The three
  former scene-local or blind paths are removed.
- Mystery Ink moved from the Arena header to Shop, so its earned-currency chest
  ceremony has one focused home instead of competing with battle or Bag loadout.
- `app/tests/arena-hub-ui.test.mjs` guards the hierarchy, shared button owner,
  removed legacy wording, Shop capsule entry, and single Rival Run controller.

### P2-4 — legacy stage bitmaps removed

- The unreferenced Arena, battle, and paper JPG stages are removed from the
  current worktree.
- Gameplay now preloads one shared `scribbits-stage.png`; Shop deliberately owns
  the separate `scribbits-shop-stage.png` because its reward-machine composition
  is a different surface.
- No runtime or test reference to the deleted JPG names remains.

### Additional requested cleanup

- Impact and Edge are no longer Gear effect families; their six items were reassigned across the six supported families.
- Replay now plans and renders six heart icons with full, half, and empty states; numeric health remains available through the accessibility label.
- Draw has one compact two-page tool owner: base colors plus everyday controls
  stay visible, while optional supplies and destructive/history actions share
  one advanced page. Native focus, timer recovery, and active-supply state use
  that same owner rather than parallel canvas-only behavior.
- Responsive boot height, overlay scaling, Draw vertical slack, and uniformly
  scaled stage art now share the 720-wide portrait model without scene-local
  width scaling or vertically stretched backgrounds.
- `renderMysteryCosmeticPreview`, `removeRumbleEntrant`, and unused request/slot type aliases were deleted.

## Remaining P2 work

### P2-2 — finish splitting the legacy deterministic harness

- **Current improvement:** `app/scripts/run-test-suites.mjs` discovers `app/tests/**/*.test.mjs`, compiles through `app/tools/tsconfig.tests.json` into an isolated temporary directory, removes that directory after the run, and then runs the legacy harness for compatibility coverage. `app/tests/battle-presentation.test.mjs` owns the battle-presentation domain, while `app/tests/capsule-presentation.test.mjs` now owns the capsule layout, cost, retry, batch, collector, ownership, and Red-Star presentation assertions removed from the broad harness.
- **Still open:** the remaining legacy harness is still large and domain-spanning, with older compilation/import wiring for unmigrated areas.
- **Next cut:** move the next coherent equipment/economy block into `app/tests`, then continue one domain at a time and delete each migrated legacy block.

## Verification snapshot

- `./verify.command`: pass.
- Type-check: pass.
- ESLint: pass.
- Discoverable suites: **126/126 tests pass** across 32 files.
- Legacy deterministic harness: **181/181 groups pass** after capsule migration.
- Production build: pass in **4630 ms**.
- Live browser proof: Arena opens the chooser before the first Spar; the selected rival reaches the VS and replay; all three server-scored bouts complete; `NEW RIVAL RUN` rolls to a fresh bout 1/3 slate; the compact modal clears and dims the dock.
- Shop proof: the fifth dock tab opens its dedicated scene, completes a
  server-backed single chest, and routes the confirmed reward into Bag.
- Screenshots: `artifacts/screenshots/rival-run-canonical-entry-final.png`,
  `artifacts/screenshots/rival-run-three-bout-finish-final.png`,
  `artifacts/screenshots/scribbits-shop-live-final.png`, and
  `artifacts/screenshots/scribbits-shop-reward-final.png`.

## Next cleanup order

1. Migrate the next equipment/economy assertion block into a focused suite.
2. Continue one coherent domain at a time until the legacy harness can be deleted.
