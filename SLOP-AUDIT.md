# Slop Audit — Scribbits Arena

_Last audited: 2026-07-13, commit `614bac1` plus the current dirty worktree. Report only; production code was not changed during this audit._

## Summary

The established combat, progression, and storage ownership boundaries remain substantially stronger than the earlier baseline. The transcript authority split found in P1-23 is now closed; the remaining Ink Mod and mock-only Legacy paths leave **2 P1** and **2 P2** findings. Verified open totals: **0 P0, 2 P1, 2 P2**.

## Findings

### P0 — duplicate sources of truth

None verified.

### P1 — duplication and unsafe fallback paths

**P1-24 — Malformed Ink Mod authority is silently repaired or deleted** (`certain`)

- Files: `app/src/shared/combat/upgrades.ts`, `app/src/server/core/scribbit.ts`, `app/src/shared/arena.ts`.
- Proof: malformed present entries are skipped; living levelled records then deterministically regenerate different mods while V2 Legacy records silently lose them. The module also copies level/acquisition limits instead of deriving them from canonical progression.
- Fix direction: distinguish absent pre-feature data from malformed present data, migrate only the former, fail or quarantine the latter, and derive limits from one dependency-free progression contract. Rough size: ~120–220 LOC plus tests.

**P1-25 — The local mock owns a divergent Legacy paging contract** (`certain`)

- Files: `app/src/server/core/legacy.ts`, `app/src/server/routes/api.ts`, `app/scripts/dev-mock.mjs`.
- Proof: production and mock separately implement V1/V2 cursor parsing, cursor encoding, card projection, the 24-card page limit, and three-card return preview; the mock omits production cursor/member/control-character checks.
- Fix direction: extract one dependency-free Legacy paging codec, limits, and projection contract for production and `mockRuntime`. Rough size: ~150–250 LOC consolidated.

### P2 — hygiene and competing import paths

**P2-21 — Scribbit cloning has four owners** (`certain`)

- Files: `app/src/server/core/scribbit.ts`, `app/src/server/core/battle.ts`, `app/src/server/core/rumble.ts`, `app/src/server/core/species.ts`.
- Proof: the Ink Mod change required four copy-body edits; three local variants clone the same arrays but omit the canonical clone's deep Legacy handling.
- Fix direction: keep one dependency-free Scribbit clone/snapshot helper and use an explicit projection when battle snapshots intentionally exclude fields. Rough size: ~50–90 LOC removable.

**P2-22 — Shared combat exposes dead and competing public paths** (`certain`)

- Files: `app/src/shared/arena.ts`, `app/src/shared/combat/index.ts`, `app/src/shared/combat/upgrades.ts`.
- Proof: `ScribbitStatKey` has no repository consumer, while the combat barrel re-exports the full Ink Mod surface even though all consumers import the submodule directly.
- Fix direction: remove the dead type and choose one import surface for Ink Mods. Rough size: ~20 LOC removable.

## Fixed since the previous audit

The prior report's verified findings remain closed in the current worktree unless reopened above:

- P0: mock submission analysis; mock economy/progression authority.
- P1: typed registry bypasses; modal lifecycle duplication; shared Shape Power guidance; route-owned domain Redis records; Practice/Belief migration fencing; paper-icon drift; public and nightly deletion fencing; workspace bootstrap; release gate divergence; moderation lease; Reddit result-comment reconciliation; rival modal lifecycle.
- P2: duplicate pen type; build warning; no-op storage/random aliases; pagination and card-press duplication; Gallery/Legacy naming drift; dead client symbols; stale drawing-storage plan; retired navigation bitmaps; Practice storage docs; duplicate stable hash; copied Element validator; remaining aliases; duplicated post setup; press-event ownership; duplicated tab accessibility; dead authority exports; Back/Rumble vocabulary; numeric-separator hash bypass; generated type-output drift.
- P1-23: stored reports and Replay now share the version-aware parser in `app/src/shared/combat/transcriptvalidation.ts`; V1/V2 compatibility, malformed server/client parity, legacy event-only reads, pre-write rejection, and preservation of invalid historical bytes have deterministic coverage. `continuousreplay.ts` now owns only report identity binding and interpolation. TypeScript, ESLint, and all 146 deterministic groups pass.

## Not slop (checked and cleared)

- `app/src/client/lib/analyzer.ts` imports `app/src/shared/analyzer-core.ts`; it is the documented client boundary, not a second analyzer.
- `app/src/server/core/battle.ts` composes `app/src/shared/combat/engine.ts`; report assembly and deterministic outcome are separate documented responsibilities.
- `app/src/client/lib/appdock.ts` composes the shared dock renderer in `ui.ts`; route ownership and rendering are distinct.
- Founder Chronicle response fallback is durable post-commit degradation with repair receipts, not a second Chronicle authority.
- Transaction retries and discard behavior converge on `app/src/server/core/storage.ts`.
- The mock composes production combat, analyzer, forecast, founders, cosmetics, Scout, Practice, and upgrade behavior; only Legacy paging survived verification as a parallel implementation.

## Not yet verified

- A deep client dead-file and indirection sweep did not finish after one relaunch. The main audit still checked current same-name exports, fallback candidates, the critical draw-to-result path, and live mobile Arena/Draw/Gallery surfaces; no additional client slop was promoted without evidence.
- `Replay.ts`, `ArenaHome.ts`, and `ui.ts` remain large. File size alone is not a finding; a later pass must prove a duplicate implementation or maze path before proposing a split.

## Product quality gap fixed during the follow-up pass (not code slop)

- ✅ The normal compact battle result now preserves one transcript-backed drawing lesson: `FINAL SPLAT` or the truthfully scoped `WINNER'S SPLAT`, the exact Shape Power signature, and exact damage. When no verified hit exists it falls back to the existing signature/total-damage truth. The result is also announced to assistive technology. TypeScript and all 146 deterministic groups pass; fresh 393×852 and 320×568 WebGL proofs are saved at `/tmp/scribbits-final-decisive-hit-2026-07-13.png` and `/tmp/scribbits-final-decisive-hit-320x568-2026-07-13.png` with no browser warnings or errors.
