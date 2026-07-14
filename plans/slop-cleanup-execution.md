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
- Closed five of the six original P2 findings; the only remaining finding is the bounded legacy-harness migration.
- Added 49 discoverable Node suites with 197 passing tests while retaining 168 legacy groups during migration.
- Retired Impact/Edge, consolidated Gear copies, and added full/half/empty Replay hearts.
- Removed the unreferenced Arena, battle, and paper JPG stages; gameplay now has one shared stage owner and Shop has one intentional reward-stage owner.
- Verified the live Arena, Rival Run, and lazy-loaded Shop flows; the latest Shop proof is `artifacts/screenshots/scribbits-shop-lazy-load-verified.jpg`.
- Migrated Founder Rival Episode, semantic-tab, Element Payload Guide, Arena UI, Arena async-lifecycle, generated Mystery Ink chest presentation, public Legend pagination, Legacy Card paging, Rumble-return presentation, and Legacy-return presentation contracts out of the broad harness, including compile/import cleanup where ownership became exclusive.
- Deferred 7,526,466 bytes of Shop-only textures from initial boot and added the server-authoritative `SIGNATURE INK` Rival Run Technique Trial without another screen or reward lane.
- Final gate passed: type-check, ESLint, 197 focused tests, 168 legacy groups, and production build in 4889 ms.

## Remaining follow-up

- Continue migrating the legacy 17k-line harness into focused suites.

## Next command

`./verify.command`
