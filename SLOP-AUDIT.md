# Slop Audit — Scribbits Arena

_Last verified: 2026-07-17 against commit f36cb18 and the current dirty worktree._

## Summary

The focused weapon and roguelite-data cleanup closed all **5 P0** findings and
the Gear vocabulary drift. The remaining open work is **2 P1 and 1 P2**:
Power-Up behavior typing, battle-clip upload hardening, and the legacy harness.

The repository artifact pass removed 971 obsolete generated files from the
current tree: timestamped balance reports, unreferenced visual QA captures,
loose root proof images, and superseded client bitmaps. The live app and trailer
inputs remain referenced, while future local screenshots and loose proof images
are ignored instead of silently becoming repository history.

The player-facing cleanup is also complete: the Ink Kit now has the four canonical Gear categories plus a separate Styles section, each Gear style renders once with aggregate Forge progress, the retired Impact and Edge effect families are gone, and Replay health is presented as full/half/empty hearts.

## Closed in this pass

### P2-8 — bounded generated reports and visual QA artifacts

- The balancer now overwrites 20 current reports instead of writing a complete
  timestamped report family on every run. The 402 tracked timestamped reports
  are removed, and 1,481 ignored timestamped reports were deleted locally.
- `artifacts/screenshots/` keeps only the 13 files referenced by current docs or
  trailer tooling; 410 unreferenced captures are removed. Another 135 loose
  root/artifact proof images with no source, config, test, or doc reference are
  removed.
- Twenty-four client images with no repository reference are removed. Runtime
  WebP assets, test-read source atlases, the logo, and explicit trailer inputs
  remain.
- `.gitignore` now keeps local screenshot and loose proof output out of future
  commits. Curated community, Devpost, proof, ImageGen, and trailer directories
  remain explicit release/media homes.
- The working directory fell from 8.2 GiB to 1.5 GiB; the current tracked-tree
  deletion is 359.15 MiB. This does not rewrite Git history.

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
- Gameplay now preloads one shared `scribbits-stage.webp`; Shop deliberately owns
  the separate `scribbits-shop-stage.webp` because its reward-machine composition
  is a different surface.
- No runtime or test reference to the deleted JPG names remains.

### Additional requested cleanup

- Clout and Rumble Ink payout hashes now expire after eight days and write one
  per-user cleanup index in the same transaction as the currency award. Privacy
  deletion validates receipt ownership, removes indexed receipts, scans the
  fixed pre-index migration window plus the recent fallback window, and cannot
  delete another player's receipt through a corrupt index entry.
- Manual `Create Rumble` post creation now validates the subreddit menu target
  and reauthorizes the current Reddit moderator before touching Arena storage.
  Ranking-season administration composes that same live moderator check with
  its separate owner allowlist.
- Package and Devvit production builds now use the same explicit 4 GiB Node heap
  ceiling, closing the local verification OOM without changing the bundle.
- Impact and Edge are no longer Gear effect families; their six items were reassigned across the six supported families.
- Replay now plans and renders six heart icons with full, half, and empty states; numeric health remains available through the accessibility label.
- Draw has one compact two-page tool owner: base colors plus everyday controls
  stay visible, while optional supplies and destructive/history actions share
  one advanced page. Native focus, timer recovery, and active-supply state use
  that same owner rather than parallel canvas-only behavior.
- Responsive boot height, overlay scaling, Draw vertical slack, and uniformly
  scaled stage art now share the 720-wide portrait model without scene-local
  width scaling or vertically stretched backgrounds.
- Shop's stage, closed/open chest art, and Ink token now preload only with Shop,
  deferring **7,526,466 bytes** of image fetch/decode and texture allocation from
  the initial Arena/Draw boot while preserving the exact rendered reward scene.
- Rival Run now has one server-authoritative `SIGNATURE INK` Technique Trial.
  Its canonical reducer counts only the player's immutable Shape Power activation
  events, preserves frozen v1 challenge snapshots, and reuses the existing strip.
- `renderMysteryCosmeticPreview`, `removeRumbleEntrant`, and unused request/slot type aliases were deleted.

## Closed weapon and roguelite data findings

### P0-1 through P0-5 — persisted combat data is migration-safe

- The shipped Scribbit v1 migration now owns a frozen literal Power-Up tuple;
  an exact old-byte to new-byte fixture prevents catalog edits from changing it.
- Power-Up discoveries and Gear merge receipts use versioned envelopes. Missing,
  invalid, and unsupported data are distinct; invalid/future bytes block writes
  and remain unchanged. Legacy valid values migrate without applying today's
  balance policy to historical receipts.
- Power-Up claims write an exact versioned TTL receipt in the same transaction
  as the Scribbit and discovery update. Ambiguous replies replay that receipt,
  while Scribbit removal clears both offers and claim receipts.
- Scribbit schema v4 removes copied reusable Gear ranks from living records.
  Inventory is now their sole durable authority, while birth-attached ranks stay
  with the Scribbit. Returning players migrate once under the Arena player lease.
- Persisted Gear identity now reads through the live catalog plus an explicit
  retired-tombstone registry. Live drops exclude tombstones, so an ID can be
  retired without making old Scribbits unreadable.
- Existing IDs were deliberately not renamed or exposed to players. Stable
  internal IDs are safer than a cosmetic ID swap, and no Ink compensation is
  required because the migration removes no ownership or progress.

### P1-1 — Power-Up behavior has two authorities and no valid-by-construction schema

- `app/src/shared/combat/powerups.ts:98-149` combines 16 trigger names with 22
  optional numeric fields. TypeScript permits meaningless and incomplete
  trigger/parameter combinations.
- `app/src/shared/combat/engine.ts:420-489`, 1372-1405, and 2155-2225 also branch
  directly on persisted Power-Up IDs. The catalog describes behavior, but the
  engine separately decides what each ID actually does.
- **Fix:** keep existing persisted IDs, replace the optional-field bag with a
  discriminated `behavior` union, and dispatch exhaustively by behavior kind.
  Presentation metadata may stay in the catalog; engine behavior must have one
  typed owner.

### Closed P1-2 — Gear technique vocabulary has one source

- Gear Week derives its labels from `ACCESSORY_EFFECTS`, and the balance plan
  uses the same names: True Aim, Paper Guard, Quick Draw, Steady Hands,
  Quickstep, and Focus Cycle.

## Checked and not slop

- Attached held-weapon art and world-space attack marks are intentionally
  separate. `heldweaponpresentation.ts:19-35` consumes the canonical Gear
  loadout, while `roleweaponrenderer.ts:21-25` owns transient battle marks.
- Persisted `accessory` naming and the legacy `upgrades` field are compatibility
  boundaries, not duplicate live systems. `arena.ts:115-121` documents their
  retained role. Do not rename or delete either during this cleanup.

## Remaining P1 work

### P1-1 — bind and throttle battle-clip uploads

- `/api/battle-clip` requires login and rejects declared uploads above 8 MB,
  while the client uploads only after an explicit Share action.
- **Still open:** the request is not bound to an owned battle report, has no
  per-user in-flight or rate guard, and validates the data-URL declaration
  rather than WebM/MP4 container bytes. A signed-in caller can therefore use
  the endpoint as a generic Reddit media uploader.
- **Next cut:** include the report ID, verify report ownership, reuse a bounded
  per-user request guard, validate container signatures, and add route-level
  auth/failure/retry tests before calling sharing production-ready.

## Remaining P2 work

### P2-2 — finish splitting the legacy deterministic harness

- **Current improvement:** `app/scripts/run-test-suites.mjs` discovers `app/tests/**/*.test.mjs`, compiles through `app/tools/tsconfig.tests.json` into an isolated temporary directory, removes that directory after the run, and then runs the legacy harness for compatibility coverage. Focused suites now own battle presentation, capsule presentation, equipment economy, Founder Rival Episode content, semantic-tab behavior/ownership, the Element Payload Guide contract, Arena UI source contracts, the complete Arena mutation/refresh lifecycle matrix, public Legend pagination, Legacy Card paging, Rumble-return presentation, and Legacy-return presentation. The latest cut moved finish labels, hero priority, fallback states, bounded copy, and empty-receipt behavior into `legacy-return-presentation.test.mjs`, then removed its exclusive legacy compile/import wiring.
- **Still open:** the remaining legacy harness is still large and domain-spanning, with older compilation/import wiring for unmigrated areas.
- **Next cut:** compare the remaining versioned Legacy Card expiry/migration block with `legends-contract.test.mjs`, then migrate only uncovered behavior.

## Verification snapshot

- The 2026-07-17 data cleanup added schema and compatibility code; it did not
  deploy or mutate production storage.
- `pnpm run verify`: pass on 2026-07-17.
- Type-check and ESLint: pass.
- Discoverable suites: **521/521 tests pass** across 116 source suites.
- Focused data gate: **92/92 tests pass** across 10 suites, including 64 seeds
  x 250 mutations (16,000 operations).
- Legacy deterministic harness: **171/171 groups pass**.
- Production build: pass in **3,882 ms**; Devvit bundle verification reports
  106 client files and 1,655.4 KiB of shipped images.
- `pnpm run balance:check`: still blocks release with 77 combat-balance flags;
  this is separate from the now-green data compatibility lane.
- Live browser proof: Arena opens the chooser before the first Spar; the selected rival reaches the VS and replay; all three server-scored bouts complete; `NEW RIVAL RUN` rolls to a fresh bout 1/3 slate; the compact modal clears and dims the dock.
- Shop proof: the fifth dock tab opens its dedicated scene, completes a
  server-backed single chest, and routes the confirmed reward into Bag.
- Current Shop proof also covers the simplified Loot screen and the focused
  featured-Gear effect dialog without changing the surrounding user edits.
- Lazy-load proof opens Shop from a fresh Arena and renders the generated stage,
  chest, Ink wallet, controls, and dock with no error-level runtime messages.
- Screenshots: `artifacts/screenshots/rival-run-canonical-entry-final.png`,
  `artifacts/screenshots/rival-run-three-bout-finish-final.png`,
  `artifacts/screenshots/scribbits-shop-lazy-load-verified.jpg`,
  `artifacts/screenshots/scribbits-shop-current-final.png`,
  `artifacts/screenshots/shop-featured-gear-before.png`, and
  `artifacts/screenshots/scribbits-shop-reward-final.png`.

## Next cleanup order

1. Replace the Power-Up optional-field bag with a discriminated behavior model.
2. Finish and rebalance the concurrent projectile/rarity combat work until the
   deterministic role-cycle harness passes again.
3. Resume the battle-clip boundary and legacy-harness cleanup.
