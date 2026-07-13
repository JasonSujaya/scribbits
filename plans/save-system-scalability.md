# Save System Scalability Goal

## Objective

Make Scribbits saves safe to evolve without corrupting, silently rewriting, or
downgrading existing player data, and prove the boundary with deterministic
tests.

## Implemented Boundary

- `versionedJson.ts` owns ordered JSON migrations, current-schema validation,
  future-version rejection, and serialization round-trip checks.
- Primary `scribbit:{id}` records and `champion:current` use one canonical v1
  serializer. Existing unversioned records are treated as v0 and migrate on the
  next successful write.
- Current v1 records are strict: missing, extra, or normalized-away fields fail
  closed. Unknown future versions are preserved instead of overwritten.
- Lost transaction replies recover only after exact stored-byte verification.
- Lazy inventory migration uses `HSETNX`, so a stale reader cannot downgrade a
  concurrently forged Gear rank.
- Legacy return receipts use optimistic transactions, so concurrent updates
  cannot move the seen cursor backward.

## Future Schema Update Protocol

1. Increment `SCRIBBIT_SCHEMA_VERSION`.
2. Keep every prior encoder, decoder, and migration frozen; add exactly one
   pure migration from the previous version.
3. Add a new explicit current encoder and strict decoder. Never make an older
   migration call the mutable current encoder.
4. Add fixtures for every migration step, the new version, corruption, and an
   unsupported future version.
5. Run `./verify.command`; do not deploy if any old byte fixture is rewritten
   after a failed parse.

## Verification

- [x] Ordered migration, missing migration, throwing migration, invalid version,
  future version, and lossy JSON serialization tests.
- [x] v0 -> v1 Scribbit migration and deterministic current round trip.
- [x] Strict current-schema and future-byte preservation tests.
- [x] Lost `EXEC` reply recovery test.
- [x] Champion serializer parity test.
- [x] Concurrent Gear-rank migration and Legacy receipt tests.
- [x] Full clean-shell release gate: type-check, lint, 94 focused tests, 180
  deterministic groups, and production build all pass (July 13, 2026).
- [x] Independent reviewer verdict: `FIXED` after the frozen v0 -> v1 migration,
  simulated v2 chain, and guarded Champion writes were re-reviewed.

## Next Save Boundaries

The next adoption should be the nightly resolved-day recovery outbox. After
that, make battle-report blob and index repair atomic and prune expired report
IDs from long-lived user indexes. These are follow-up hardening tasks, not
silent blockers to the primary player-save boundary completed here.
