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
interpolates it into an arena replay capped at 25 seconds. Drawing choices
select the fighter's identity and power. Accessories and titles never affect
analysis or stats; Mystery Pens can change the normalized split but never add
stat points.

The retention loop is visible rather than buried: one Next Goal advances entry,
Back, the daily Champion Contract, capsule, or care; daily actions fill an Ink
Trail toward the discounted Mystery Capsule; and discovery, collector rank, Epic
pity, wearable titles, and immutable personal Legacy Cards persist after
individual Scribbits fade.
After the official daily drawing locks, an ephemeral Four-Power Practice Lab
makes the core drawing-to-fight hook repeatable without rewards or persistence.

## Scope

- App code lives in `app/`.
- Client/server contract lives in `app/src/shared/arena.ts`.
- Server routes live in `app/src/server/routes/api.ts`.
- Domain logic lives in `app/src/server/core/`.
- Phaser scenes live in `app/src/client/scenes/`.

## Current Ship Gates

- [x] Local equivalent of `npm run verify` passes: TypeScript, ESLint, 83
      simulation groups, and production build (July 11).
- [x] Fresh mobile browser proof covers the optional deterministic Doodle Dare,
      first-run draw -> fight -> Ink promise, blank/forming/ready feedback,
      full drawing, birth reveal, live paper-broadcast exhibition, Skip, and
      transcript-derived recap with zero captured runtime errors (July 11).
- [x] Client and server share a 1,500-pixel minimum-body gate, so one brush tap
      cannot submit. Replay validation accepts a truthful zero-damage Nib Halo
      wall ejection during early knockout protection instead of mislabeling the
      complete transcript as an archived result (July 11).
- [x] Fresh-browser mock verifies draw -> submit -> server-authoritative stat
      parity -> first fight -> arena/guide/report flow, plus recent battle history
      (July 10).
- [x] Mobile browser proof verifies Legend and personal Legacy Older/Newer
      navigation, beyond-first-page cards, long-name archival detail, and frozen
      metadata without runtime errors.
- [x] Mobile WebGL proof verifies the 25-vertex Phaser 4.2 Inkbody birth reveal,
      stat-driven Shape Power labels, and battle deformation; code retains the
      established 3x3 Canvas fallback.
- [x] Fresh-browser replay proof verifies continuous transcript interpolation,
      moving fighters, HP updates, Shape Power events, outcome controls, and no
      runtime errors on `localhost:8902` (July 10).
- [x] Balance regression proves all extreme drawing-archetype matchups stay at
      or below 65% over slot-swapped seeded fights; identical builds remain
      slot-neutral and every fight resolves within the bounded pacing window.
- [x] Growth regression caps the complete level 1 -> 5 combat edge at 1.5% and
      keeps max-level equal-build win rates at or below 60% across representative
      drawings; the level remains visible through mastery copy and aura marks.
- [x] Swiss matchmaking pairs record first and closest level second, floats odd
      score groups without skipping fights, gives every entrant one fight per
      round, and avoids repeat opponents when an alternative exists.
- [x] WebGL and Canvas browser proof verify mastery labels, tiered impacts,
      lagging HP loss, visible arena folding, mute control, exact drawing art,
      and zero captured runtime errors on `localhost:8902` (July 11).
- [x] The real-time replay now has a distinct live Inkcast stage instead of fixed
      turn-like podiums or a static practice grid: deterministic torn paper,
      clipping-safe 220px fighters, edge brush ambience, moving shadows, angled
      numeric-HP panels, a smaller server clock, explicit OUTCOME LOCKED copy,
      and a high-contrast lower third. Default, chosen-rival, 320x568 WebGL,
      Canvas, reduced-motion, Skip, and instrumented 1x -> 2x -> 4x -> normal-speed
      result paths have zero captured runtime or browser errors (July 11).
- [x] Every current fight path—including a chosen Rival Draft rematch—now runs a
      mode-specific paper VS ceremony with both exact signature moves and one
      verified mechanics card. Deterministic coverage exhausts all sixteen ordered
      Shape Power combinations as ten symmetric pairings, bans win-odds language,
      and WebGL/Canvas proof keeps sampled cards readable with zero runtime errors
      (July 11).
- [x] The existing Inkcast ticker now selects varied power, hit, miss, shield,
      echo, arena, and late-fight copy deterministically from authoritative facts.
      A pure editorial queue chooses one strongest candidate per simulation tick,
      holds it for 900ms wall-clock, and bounds pending copy at two items, including
      at 4x. It adds no events or combat authority; Colorburst no longer makes a
      false miss claim before its delayed echo, and compact WebGL proof has zero
      captured runtime errors (July 11).
- [x] The post-fight Inkcast Recap now derives its winner, finish reason, final
      HP, damage, signature, and decisive splat only from the validated server
      transcript. Browser proof covers knockout, double knockout, timeout,
      owned loss, WebGL, and Canvas: only KO losers fold, timeout fighters stay
      standing, outcome actions remain usable, and captured runtime errors stay
      at zero (July 11).
- [x] All 20 founding opponents now receive deterministic stat-shaped mascot art.
      Chonk, Spike, Zip, and Charm alter silhouette/anatomy from the same shared
      dominant-stat selector used by drawing preview, Inkbody, replay, and server
      combat; ordinary player-image failures remain neutral (July 11).
- [x] All 20 founders now live in one immutable shared catalog with their exact
      prior IDs/stats/order plus 160 unique, bounded story strings. Rival cards,
      VS epithets, pre-FIGHT openings, first-signature reactions, result quotes,
      and founding-champion Reddit copy reuse existing authoritative moments.
      WebGL proof at default portrait and 320x568 covers ceremony, opening, result,
      Rival Draft, chosen rematch, CTA reachability, and empty browser error logs;
      reduced-motion ceremonies retain the full reading dwell (July 11).
- [x] The existing once-daily Champion Challenge now has one truthful player-facing
      contract. Arena state projects the server-owned daily flag; founder/community
      identity, exact signature, conditional +2 XP, paper challenger picker, and a
      noninteractive completion stamp replace a stale always-live CTA. Default and
      320x568 WebGL proof cover full-card selection, VS, replay/Skip, result, return,
      completion, and empty browser error logs (July 11).
- [x] Browser proof verifies the Daily Ink Trail, discounted capsule CTA,
      collection/rank/pity overlay, server-confirmed pull ceremony, and persisted
      post-pull progress with no runtime errors on `localhost:8902` (July 10).
- [x] Fresh-browser proof verifies the complete earned loop from 0 Ink through
      submission, first spar win, care, a 5-Ink pull, tangible reward-art reveal,
      and persisted 1/28 Collection progress in the original 28-item catalog on
      `localhost:8902` (July 11).
- [x] Deterministic replay coverage verifies four transcript-driven power
      vignettes: Inkquake rings, Nib Halo quills, Smearstep afterimages, and the
      Colorburst cone/echo. Production-seeded local browser proof verifies all
      four at normal speed in WebGL and Canvas with zero captured runtime errors.
- [x] Replay now has one player-facing combat model: the immutable continuous
      transcript. The old turn-beat fallback and cheer/hype input are removed;
      new reports no longer write turn-style projections, while old event-only
      records remain readable as explicit archived-result summaries.
- [x] Mobile browser proof verifies the 28-item Gallery Collection before and
      after a server-confirmed pull, including locked clues, accessory art/counts,
      pen swatches, title badges, paging, and persistent 13/28 -> 14/28 progress
      during the original catalog pass.
- [x] WebGL replay proof verifies all sixteen element x Shape Power signature
      identities and stable left/right combat-read lanes. No-clean-hit copy is
      neutral unless shield or element events explicitly prove more, so replay no
      longer invents dodge or counter causes (July 11).
- [x] Replay validation rejects result/checkpoint contradictions and unbounded or
      partial source metadata, mismatched report/transcript fighter IDs, and
      finish reasons that contradict terminal HP; shielded hits count only for
      the exact authored Shape Power activation that caused them (July 11).
- [x] WebGL and Canvas browser proof verifies the expanded 36-item Collection and
      all eight cosmetic Shape Power Relics, including the Rare/Epic art page,
      with zero captured runtime errors (July 11).
- [x] Mobile browser proof verifies the Arena dock remains clickable after a
      non-zero camera scroll, the Ink chip no longer covers bracket controls, and
      first Shape Power reveals use separate left/right presentation lanes.
- [x] Browser and endpoint proof verify wearable title persistence, immutable
      Legacy snapshots, champion/believed/faded finishes, one-time return ceremony,
      strict non-combat card DTOs, monotonic seen state, and Legacy-before-Rumble
      return sequencing.
- [x] Mobile browser proof verifies server-selected overnight Rumble replay,
      clean outcome controls, Legacy-aware return routing, and deterministic
      Next Goal progression from Back/capsule state into exact care rewards.
- [x] Returning mock state excludes faded or expired Scribbits from the living
      roster, preventing a false ROSTER FULL dead end while preserving immutable
      Legacy entries (July 11).
- [x] Owned exhibition wins and losses now lead into a three-card Rival Draft.
      The stable server slate is level-bounded and Shape-Power-varied; off-card
      opponent IDs fail with 400, chosen rivals bind to the fresh authoritative
      transcript, canonical epithets and challenges remain visible on every card,
      and the exact previous FINAL/BIGGEST SPLAT follows into the next choice. The
      complete compact mobile loop is browser-proven with reachable enlarged FIGHT
      targets and zero captured runtime errors (July 11).
- [x] Four-Power Practice Lab is server-analyzed, reward-free, session-scoped,
      and rejected before battle storage. It has a post-lock Arena entry,
      server-decided power feedback, continuous replay, no profile/Belief path,
      bounded requests, and production/mock parity (July 11).
- [x] Mobile WebGL proof covers locked-day entry and four genuinely different
      drawings through 0/4 -> 4/4: every server power reveal, live Inkcast battle,
      truthful recap, next-untried prompt, and the first-completion gold card.
      Canvas replay proof and both runtime checks stay clean; endpoint proof keeps
      Arena, inventory, and battle-history hashes unchanged with no reward field
      (July 11).
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
- Split the combat engine behind its unchanged public contract when that work
  materially improves balance iteration; fixed-seed golden transcript hashes
  now protect the current facade.

## Historical Plans

Older Remonsta catch/Dex/Wilds plans are retained as ideation only. They are not
implementation truth unless explicitly revived.
