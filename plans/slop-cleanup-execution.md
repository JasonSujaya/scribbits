# Slop cleanup execution

## Goal

Close every verified P0/P1 finding in `SLOP-AUDIT.md`, remove safe P2 debris, and replace the hand-maintained test build graph with discoverable automated suites.

## Baseline

- Worktree is intentionally dirty and contains unrelated user work; preserve it.
- Starting audit: 2 P0, 6 P1, 6 P2.

## Done means

- Shared equipment categories drive the live Ink Kit and one gear style renders once.
- Ink keys have one owner.
- Care and Champion retries cannot double-apply committed progression.
- The default verification command runs discoverable, isolated test suites plus any remaining legacy suite.
- Verified P1 workflows use their canonical owners.
- Frontend changes are proven in the running mobile flow with a screenshot.
- Type-check, lint, deterministic tests, and production build all pass.
- `SLOP-AUDIT.md` matches the final worktree.

## Completed

- Closed all P0 and P1 findings.
- Closed four P2 findings and the safe code portion of the remaining dead-debris finding.
- Added 10 discoverable Node suites with 29 passing tests while retaining 176 legacy groups during migration.
- Retired Impact/Edge, consolidated Gear copies, and added full/half/empty Replay hearts.
- Verified the live mobile Ink Kit with zero runtime errors and saved `artifacts/scribbits-ink-kit-cleanup-verified.png`.
- Final gate passed: type-check, ESLint, 29 focused tests, 176 legacy groups, and production build.

## Remaining follow-up

- Continue migrating the legacy 17k-line harness into focused suites.
- Confirm whether the untracked `app/src/client/assets/scribbits-arena-stage.jpg` is intentional artwork before wiring or deleting it.

## Next command

`./verify.command`
