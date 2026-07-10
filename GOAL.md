# GOAL: Ship Scribbits Arena for Reddit "Games with a Hook"

**Current identity:** Scribbits Arena. `app/devvit.json` and `app/package.json`
use the Devvit app identity `scribbits`.

**Current plan of record:** `plans/v3-scribbits-arena.md`.

## Product

Scribbits Arena is a Devvit Web + Phaser game where Redditors draw one creature
per day, the drawing becomes its combat identity, and living Scribbits fight in
daily async rumbles. Community belief can turn a short-lived Scribbit into a
Legend.

Battles are server-authored but presented as continuous action: a deterministic
20 Hz simulation fixes the winner and emits a bounded transcript, then Phaser
interpolates it into a 15–25 second arena replay. Drawing choices select the
fighter's identity and power; cosmetics never affect analysis or stats.

The retention loop is visible rather than buried: daily actions fill an Ink
Trail toward the discounted Mystery Capsule, while discovery, collector rank,
and Epic pity persist after individual Scribbits fade.

## Scope

- App code lives in `app/`.
- Client/server contract lives in `app/src/shared/arena.ts`.
- Server routes live in `app/src/server/routes/api.ts`.
- Domain logic lives in `app/src/server/core/`.
- Phaser scenes live in `app/src/client/scenes/`.

## Current Ship Gates

- [x] Local equivalent of `npm run verify` passes: TypeScript, ESLint, 41
  simulation groups, and production build (July 10).
- [x] Fresh-browser mock verifies draw -> submit -> server-authoritative stat
  parity -> first fight -> arena/guide/report flow, plus recent battle history
  (July 10).
- [ ] Recheck the current cursor-based Legend Older/Newer controls in a browser;
  raw paging, stale rows, and beyond-first-page behavior pass mock-endpoint and
  core simulation proof, but the refreshed local tab was blocked by the browser
  security policy.
- [x] Mobile WebGL proof verifies the 25-vertex Phaser 4.2 Inkbody birth reveal,
  stat-driven Shape Power labels, and battle deformation; code retains the
  established 3x3 Canvas fallback.
- [x] Fresh-browser replay proof verifies continuous transcript interpolation,
  moving fighters, HP updates, Shape Power events, outcome controls, and no
  runtime errors on `localhost:8902` (July 10).
- [x] Balance regression proves all extreme drawing-archetype matchups stay at
  or below 65% over slot-swapped seeded fights; identical builds remain
  slot-neutral and every fight resolves within the bounded pacing window.
- [x] Browser proof verifies the Daily Ink Trail, discounted capsule CTA,
  collection/rank/pity overlay, server-confirmed pull ceremony, and persisted
  post-pull progress with no runtime errors on `localhost:8902` (July 10).
- [ ] Installed Reddit playtest verifies the same loop plus boss/care/Back and
  the scheduled result comment on mobile and desktop.
- [ ] Devvit upload/install/demo post requires user Reddit login and subreddit access.
- [ ] Add the public subreddit/post URLs and sub-one-minute video to the final
  Devpost entry.

## Known Cleanup Priorities

- Keep README/AGENTS/current plan aligned with the actual Hono + Phaser code.
- Reduce route transaction complexity in `src/server/routes/api.ts`.
- Split broad domain files when changes naturally touch them.
- Add route-level tests for rollback and API contract behavior.
- Keep generated logs out of git; store only concise evidence summaries when needed.

## Historical Plans

Older Remonsta catch/Dex/Wilds plans are retained as ideation only. They are not
implementation truth unless explicitly revived.
