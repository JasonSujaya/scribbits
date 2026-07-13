# Slop Audit — Scribbits Arena

_Last audited: 2026-07-13, commit `c1e437f` plus the current dirty worktree. Follow-up fixes are recorded below._

## Summary

The established combat, progression, storage, Legacy paging, and Scribbit-copy ownership boundaries remain substantially stronger than the earlier baseline. The targeted battle-entry and result-return re-audits found three maze/capability paths and one player-facing vocabulary drift; all four are fixed in the current worktree. Verified open totals: **0 P0, 0 P1, 0 P2**.

## Findings

### P0 — duplicate sources of truth

None verified.

### P1 — duplication and unsafe fallback paths

None verified.

### P2 — hygiene and competing import paths

None verified.

## Fixed since the previous audit

The prior report's verified findings remain closed in the current worktree unless reopened above:

- P0: mock submission analysis; mock economy/progression authority.
- P1: typed registry bypasses; modal lifecycle duplication; shared Shape Power guidance; route-owned domain Redis records; Practice/Belief migration fencing; paper-icon drift; public and nightly deletion fencing; workspace bootstrap; release gate divergence; moderation lease; Reddit result-comment reconciliation; rival modal lifecycle.
- P2: duplicate pen type; build warning; no-op storage/random aliases; pagination and card-press duplication; Gallery/Legacy naming drift; dead client symbols; stale drawing-storage plan; retired navigation bitmaps; Practice storage docs; duplicate stable hash; copied Element validator; remaining aliases; duplicated post setup; press-event ownership; duplicated tab accessibility; dead authority exports; Back/Rumble vocabulary; numeric-separator hash bypass; generated type-output drift.
- P1-23: stored reports and Replay now share the version-aware parser in `app/src/shared/combat/transcriptvalidation.ts`; V1/V2 compatibility, malformed server/client parity, legacy event-only reads, pre-write rejection, and preservation of invalid historical bytes have deterministic coverage. `continuousreplay.ts` now owns only report identity binding and interpolation. TypeScript, ESLint, and all 146 deterministic groups pass.
- P1-24: `app/src/shared/progression.ts` now owns level thresholds and Ink Mod acquisition limits. `app/src/shared/combat/upgrades.ts` distinguishes absent migration from malformed present data, while Scribbit and V2 Legacy reads fail closed and preserve invalid stored bytes. Level-up keeps valid authored picks, V1 Legacy remains readable, mock fixtures use the same policy, and all 147 deterministic groups pass.
- P1-25: `app/src/shared/legacycards.ts` now owns Legacy Card projection, deep isolation, V1/V2 and numeric cursor compatibility, strict cursor validation, deterministic ordering, page limits, return previews, and monotonic seen-day policy. Production keeps only Redis index IO in `server/core/legacy.ts`; the local mock imports the same browser-safe policy through `mockRuntime.ts`. Malformed, overlong, control-character, paging, same-day ordering, HTTP parity, and aliasing checks pass in all 151 deterministic groups.
- P2-21: `app/src/shared/arena.ts` now owns the only full-record `cloneScribbit` helper. Storage, battle reports, Rumble entrants and champions, founding opponents, and the browser mock all use it; the three partial local clones and server-core export path are gone. Nested stats, arrays, Ink Mods, care state, Legacy title, Legacy cosmetics, and Legacy upgrades have mutation-isolation coverage. Historical battle-report reads normalize pre-Ink-Mod fighters before strict validation, while new writes remain fail-closed. All 151 deterministic groups pass.
- P2-22: the unused `ScribbitStatKey` alias is removed, and `app/src/shared/combat/upgrades.ts` is the only public Ink Mod import path. The combat barrel no longer republishes the entire upgrade surface; a source guard prevents both dead paths from returning. All 151 deterministic groups pass.
- P2-23 (fixed 2026-07-13 in the current worktree): Arena no longer rebuilds a generic Next Goal dashboard and duplicate owned-Scribbit roster beside its real battle choices. `ArenaHome.ts` now shows exactly one owned fighter at a time, one Champion-or-Spar rival choice, one Fight action, and one compact Rumble Pick door. The calmer rendered paper-and-cork stage owns the high-contrast Arena title instead of layering a second dashboard over the scene. `buildPrimaryAction`, `runNextGoal`, `buildRoster`, and the duplicate challenger modal were deleted; the source guard prevents those surfaces and their generic `CONTINUE THREAD` / `YOUR SCRIBBITS` copy from returning. TypeScript, ESLint, all 151 deterministic groups, the production build, and live localhost proof pass; `/tmp/scribbits-arena-fighter-rival-pick.png` records the current mobile result.
- P1 battle-entry split (fixed 2026-07-13 in the current worktree): `ArenaHome.ts` now owns the complete fighter → Champion/Spar rival → Fight setup. The generic detail modal no longer starts combat, while `MyBattles.ts` remains the single battle-history destination.
- P1 manual Rumble entry (fixed 2026-07-13 in the current worktree): the client API, shared request type, server route, local mock route, and route test for `/api/enter-rumble` are deleted. Draw submission is the only creation-plus-entry owner, so the previous unreachable action and dead-end state cannot recur.
- P2 Back/Pick drift (fixed 2026-07-13 in the current worktree): player-facing UI and product documentation now consistently use `Pick`, `Your Pick`, and `Pick Locked`. The existing `/api/back`, `backScribbit`, and persisted `backed` fields remain only as the compatibility boundary documented in `OVERVIEW.md`.
- Dead generic next-goal surface (fixed 2026-07-13 in the current worktree): `app/src/client/lib/nextgoal.ts` and its unused tests/docs are deleted. The remaining active rivalry action uses the concrete label `FIGHT RIVAL` rather than `CONTINUE THREAD`.
- P1 result-return reconciliation (fixed 2026-07-13 in the current worktree): fresh state-changing fights now keep their result visible and expose the API error when the Arena refresh fails, instead of navigating with stale cached state. Read-only saved replays return immediately without paying the same network wait. A loading fence blocks duplicate refreshes, and a source guard preserves both policies.

## Not slop (checked and cleared)

- `app/src/client/lib/analyzer.ts` imports `app/src/shared/analyzer-core.ts`; it is the documented client boundary, not a second analyzer.
- `app/src/server/core/battle.ts` composes `app/src/shared/combat/engine.ts`; report assembly and deterministic outcome are separate documented responsibilities.
- `app/src/client/lib/appdock.ts` composes the shared dock renderer in `ui.ts`; route ownership and rendering are distinct.
- Founder Chronicle response fallback is durable post-commit degradation with repair receipts, not a second Chronicle authority.
- Transaction retries and discard behavior converge on `app/src/server/core/storage.ts`.
- The mock composes production combat, analyzer, forecast, founders, cosmetics, Scout, Practice, upgrades, and Legacy policy; Redis index IO correctly remains production-only.

## Not yet verified

- A deep client dead-file and indirection sweep did not finish after one relaunch. The main audit still checked current same-name exports, fallback candidates, the critical draw-to-result path, and live mobile Arena/Draw/Gallery surfaces; no additional client slop was promoted without evidence.
- An independent second-opinion battle-entry sweep did not return after one relaunch; the primary audit still traced and verified the exact Arena, detail-modal, and battle-journal paths above.
- `Replay.ts`, `ArenaHome.ts`, and `ui.ts` remain large. File size alone is not a finding; a later pass must prove a duplicate implementation or maze path before proposing a split.

## Product quality gap fixed during the follow-up pass (not code slop)

- ✅ The normal compact battle result now preserves one transcript-backed drawing lesson: `FINAL SPLAT` or the truthfully scoped `WINNER'S SPLAT`, the exact Shape Power signature, and exact damage. When no verified hit exists it falls back to the existing signature/total-damage truth. The result is also announced to assistive technology. TypeScript and all 147 deterministic groups pass; fresh 393×852 and 320×568 WebGL proofs are saved at `/tmp/scribbits-final-decisive-hit-2026-07-13.png` and `/tmp/scribbits-final-decisive-hit-320x568-2026-07-13.png` with no browser warnings or errors.
- ✅ The ten server-selected arenas now pay off their transcript-scored micro-goals on the result card. Replay shows either the exact cleared goal or exact progress, adds no client-side reward authority, and announces the result accessibly. TypeScript, ESLint, all 151 deterministic groups, production build, and fresh 393×852 WebGL proof pass at 60 FPS with zero runtime errors; `artifacts/scribbits-arena-goal-result.png` records the result.
- ✅ The daily arena goal is no longer hidden until Replay. Arena replaces the redundant `CHOOSE FIGHTER` heading with one readable target-icon goal sourced from `getBattleArenaForDay`; the Fight action exposes the matching arena and goal accessibly. This adds no second catalog or gameplay authority. Live proof is saved at `artifacts/scribbits-arena-daily-goal.png`.
