# Production Data Compatibility Plan

_Reviewed July 17, 2026 against the live Redis code and deployment gate, with
an independent Fable review. This is the implementation plan; product outcomes
belong in `ROADMAP.md`._

## Verdict

**The Scribbit, Gear, and Power-Up migration lane is ready for returning-user
migration, but block upgrading the production installation from this whole
worktree.** The player-owned migration is transactional, preserves old ranks,
and runs when that player next opens Arena. The separate battle-transcript v8
and upgrade-trigger changes still need their reader-first/rollback proof before
this combined worktree is safe to install.

A private `devvit upload` can stage a candidate without changing an installed
subreddit's Redis. Installing/upgrading that candidate is the data-risk boundary
and remains blocked until the current P0 items below pass. Future uploads that
provably do not change stored shapes may use the normal gate.

## What Is Proven Today

- `versionedJson.ts` provides ordered migrations, strict current decoding,
  future-version rejection, and serialization round-trip checks.
- This worktree contains Scribbit schema **v4**, with explicit v0 -> v1 -> v2
  -> v3 -> v4 migrations. V4 removes copied reusable Gear ranks from living
  Scribbits; inventory is their sole durable authority.
- Scribbit writes fail closed and preserve invalid or future-version bytes.
  Optimistic transactions prevent an older concurrent writer from replacing a
  newer record.
- Free Draw records use an explicit v1 codec. Rival Run reads v1 and v2 records
  and has a two-day TTL. Founder Chronicle validates v2 records but has no
  general ordered migration codec.
- Inventory rank migration uses `HSETNX`; Legacy receipt progress is monotonic;
  ambiguous Scribbit transaction replies are accepted only after stored-state
  verification.
- The shipped v1 -> v2 Scribbit migration owns frozen literal inputs and an
  exact historical byte fixture that composes through v3 and v4. It no longer
  imports the live Power-Up catalog.
- V3 reusable Gear ranks are promoted to the player inventory in the same
  optimistic transaction that writes v4. A higher inventory rank wins, corrupt
  inventory blocks the migration without rewriting either record, and an
  ambiguous commit reply is accepted only after both authorities match.
- Retirement watches inventory before freezing a terminal Gear snapshot, so a
  concurrent Forge cannot archive a stale rank.
- Power-Up discoveries and Gear-merge receipts have versioned, fail-closed
  decoders. Unknown discovery IDs survive legacy migration, while invalid or
  future present bytes block mutation without being rewritten.
- Persisted Gear IDs read through the live catalog plus a retired-tombstone
  registry, so retiring an item does not make an old loadout unreadable.
- Persisted Power-Up IDs are separate from the offer pool. Retired cards remain
  readable while disappearing from new offers, and claim receipts recover an
  exact committed response after a lost transaction reply.
- `DURABLE_STORAGE_CONTRACTS` registers the affected key patterns, Redis types,
  reader/writer versions, fixture evidence, indexes, privacy owner, and repair
  policy. `storage-contract-manifest.test.mjs` fails when that reviewed surface
  drifts.
- `pnpm run test:data` executes 16,000 deterministic mutation operations against
  compiled production APIs, then runs the focused schema, economy, lifecycle,
  Power-Up, privacy, manifest, and corruption suites for the same boundary.
- `pnpm run release:check` currently runs verification, the balance gate, and
  Devvit authentication before upload.

## What Is Not Proven Yet

- A rolled-back server can read records written by the new release. Rejecting a
  future version prevents corruption, but it can still make the game unusable
  after rollback.
- The pending battle transcript v8 rollout is rollback-safe. Reports live for
  30 days, while the current production code only accepts v1-v7; after v8 writes
  begin, rolling back would make those reports unreadable.
- Every permanent player-data family is versioned. Durable JSON also exists in
  Founder Chronicle, seasons and rewards, daily-login receipts, and other
  domain stores with domain-specific parsers.
- A sanitized production export from the previous release has not yet been run
  through the fixture suite; the current historical fixtures are checked-in
  deployed shapes plus generated mutation schedules.
- There is a production canary, write kill switch, migration telemetry, or
  automated post-upload data smoke test.
- App upgrade is a read-only preflight. The current upgrade trigger schedules
  mutating Arena maintenance one second later, before any compatibility audit.
- There is a complete enumerable data catalog or restorable snapshot path.
  Devvit Redis cannot globally list unknown keys, and each installation owns a
  separate datastore, so a generic backup cannot be assumed.

## Data Classes and Required Policy

| Class                       | Current examples                                                                           | Required compatibility policy                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Permanent player authority  | Scribbits and Archived cards, Ink, Gear inventory, daily-login progress, Founder Chronicle | Versioned envelope or explicitly versioned hash fields; frozen fixtures for every shipped version; never silently default malformed present data |
| Durable shared authority    | Champion, season catalog/finals/rewards, Arena-day resolution                              | Versioned and transactionally updated; reader-first rollout; repair/replay path for partial publication                                          |
| Derived indexes             | owner/roster/Legacy indexes, rankings, receipt indexes                                     | Rebuildable from an enumerable authority; invariant tests prove blob/index agreement                                                             |
| TTL gameplay state          | battle reports, Rival Run, offers, operation receipts, venue attempts                      | Read every schema that can remain alive for the maximum TTL; do not remove readers before that TTL passes                                        |
| Cache or presentation state | forecasts and recomputable projections                                                     | Safe to discard only when code proves a deterministic rebuild                                                                                    |

## Required Schema-Change Protocol

1. **Register the storage contract.** Before code changes, record the key
   pattern, Redis type, owner module, durability/TTL, current schema, indexes,
   privacy deletion path, and repair strategy in one checked-in manifest.
2. **Capture old bytes.** Add sanitized byte-for-byte fixtures from every
   previously shipped shape. Synthetic “old” objects are not enough because
   they miss historical optional and malformed fields.
3. **Ship a reader-first release.** Release A must read both schema N and N+1
   while continuing to write N. It contains the pure N -> N+1 migration and the
   new validator, but does not activate N+1 writes.
4. **Exercise a real upgrade.** Seed the test installation with N fixtures,
   install Release A, load every affected screen/API, perform one mutation, and
   verify balances, ownership, indexes, receipts, and exact preserved fields.
5. **Activate writes separately.** Release B enables N+1 writes with a
   server-owned storage flag only after Release A is live and old invocations
   have drained. Multi-key changes use one optimistic transaction or a durable
   outbox/recovery record.
6. **Observe before cleanup.** Count reads by source version, successful
   migrations, invalid records, future-version rejections, and repair attempts.
   Keep old readers for at least the longest affected TTL and one full rollback
   window.
7. **Freeze history.** Never edit a shipped decoder, encoder, or migration.
   Add exactly one pure migration for each next version. Never reuse the mutable
   current encoder, catalog, balance constant, or helper inside an old migration.
   Historical IDs and costs must be literal immutable data owned by that version.

## Clean Authoring Workflow for the Next Schema

Use this sequence for every durable shape, including a one-field change. The
schema author owns the fixture, migration, activation, and recovery work as one
change; a later cleanup must not reconstruct that history from current code.

1. Copy sanitized production bytes into a frozen `N` fixture before editing the
   decoder. Record the key type, indexes, TTL, and authority in the storage
   contract manifest.
2. Add a strict `N+1` decoder and a pure `N -> N+1` migration. The migration may
   import only frozen version-owned constants and helpers. Do not mutate Redis
   from the codec.
3. Add the `N+1` writer behind a server-owned activation flag. Release A reads
   both versions but still writes `N`; Release B changes only the flag after the
   reader and rollback gates pass.
4. Add the new shape and every new mutation to
   `tests/data-mutation-stress.test.mjs`. Model reply loss, a rejected WATCH,
   exact operation replay, malformed present bytes, a future version, wrong
   ownership, and stale indexes. Assert authoritative balances and indexes after
   every operation, not only the returned response.
5. Run `pnpm run test:data` while authoring. Before merge, run the full
   `pnpm run verify` and the installation upgrade/rollback test. A focused pass
   is fast feedback, not release approval.
6. Keep the old reader and frozen fixture until the longest record TTL plus the
   rollback window has elapsed and telemetry shows no `N` reads. Then remove
   obsolete activation code; never edit the shipped migration.

### Mutation stress contract

The focused harness executes 64 deterministic seeds with 250 operations per
seed (16,000 total) against the compiled production codecs and mutation APIs.
It covers v3/v4 migration, inventory-owned reusable ranks, Gear copies and merge
receipts, loadout uniqueness/category validity, legacy Power-Up discovery
upgrades, invalid/future byte preservation, transaction reply loss, rejected
WATCH transactions, wrong owners, and stale roster indexes.

When a production mutation API or durable record family is added, the harness
must add an operation for it or document why it is TTL/cache-only and safe to
discard. Lowering the seed or operation count requires an explicit runtime
measurement and review; do not make the gate faster by silently reducing
coverage.

`pnpm run test:data` is the authoring gate, not only the random harness. It
currently discovers 10 focused suites and 92 tests, so a manifest, frozen
fixture, privacy cleanup, or migration regression fails in the same command as
the mutation model.

## Rollback Rule

A code rollback is safe only when the rollback target already understands the
new bytes. That is why Release A must precede Release B. During an incident:

1. Disable affected writes with the server-owned flag.
2. Roll back feature behavior to Release A, not to a build that only reads N.
3. Do not reverse-migrate or lower stored version numbers in place.
4. Repair from authoritative records/outboxes, then re-enable writes.

For destructive or key-moving migrations, first create an enumerable shadow
copy and verify its count/checksum per installation. A deploy is not a backup.

## Gate Before Every Production Upload

- [ ] `./verify.command` passes from a clean shell.
- [ ] `pnpm run test:data` passes all 16,000 deterministic mutation operations;
      the run includes every durable shape changed by the candidate.
- [ ] A storage-contract check fails if persistent key patterns or serializers
      changed without a manifest and fixture update.
- [ ] Every shipped fixture parses or fails closed without mutation; every
      supported migration is deterministic and idempotent at the write boundary.
- [ ] Current code reads N-1/N data, and the rollback target reads every byte the
      candidate release can write.
- [ ] Every idempotency/award receipt has an immutable versioned decoder and an
      invalid present receipt blocks mutation instead of being treated as absent.
- [ ] Mixed-version transaction tests prove an old writer cannot overwrite,
      downgrade, double-award, or partially publish newer state.
- [ ] Blob/index invariants, privacy deletion, and repair paths pass for the
      affected data family.
- [ ] The test installation passes seed -> upgrade -> mutate -> reload ->
      rollback-target -> reload for affected player flows.
- [ ] The release identifies its write-schema activation flag, rollback target,
      observation window, and responsible recovery command.
- [ ] Post-upload canary reads and one reversible mutation succeed before wider
      use; invalid/future-version counters remain zero.
- [ ] A human explicitly approves the production installation upgrade after the
      private upload/canary passes; qualifying pushes do not auto-promote data.

## Implementation Order

1. **Done locally — Freeze the Scribbit v1 -> v2 migration inputs and add exact
   historical input/output byte fixtures.**
2. **P0 — Make transcript v8 a two-release change:** first read v1-v8 while
   writing v7, then activate v8 writes only after the rollback target can read it.
3. **Done locally — Version Gear-merge receipts and preserve unknown Power-Up
   discovery IDs.** Invalid present receipts now block mutation.
4. **Done locally — Build the affected storage contract manifest and release
   compatibility gate.** This turns undocumented Scribbit, inventory, offer,
   discovery, claim-receipt, and merge-receipt changes into a test failure.
5. **P0 — Make upgrade handling preflight-only until compatibility passes; do
   not schedule mutating maintenance one second after upgrade.**
6. **P0 — Split the implemented v3 -> v4 migration into reader-first and
   write-activation releases, then prove the N/N+1/rollback matrix before
   installing it in production.**
7. **P0 — Catalog and protect permanent stores:** Founder Chronicle, seasons,
   daily login, Ink/inventory, and Free Draw.
8. **P1 — Finish the nightly resolution outbox recovery and battle-report/index
   atomic repair already identified by the earlier plan.**
9. **P1 — Add canary telemetry, a write kill switch, and per-install
   snapshot/shadow-copy tooling for destructive migrations.**

## Platform Constraints

- Devvit Redis persists across app versions, while browser `localStorage` does
  not provide that guarantee for Devvit Web updates.
- Redis data is isolated per app installation, and Devvit does not support a
  global key listing. Stable collection indexes are therefore part of the data
  model, not optional maintenance metadata.

References: [Devvit Web persistence](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview),
[Devvit Redis key design](https://developers.reddit.com/docs/capabilities/server/redis),
[Devvit version install/rollback commands](https://developers.reddit.com/docs/guides/tools/devvit_cli),
[Devvit publishing and installation](https://developers.reddit.com/docs/get-started/publish).
