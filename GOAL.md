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
interpolates it into an arena replay capped at 20 seconds. Drawing choices
select the fighter's identity and power. Accessories and titles never affect
analysis or stats; Mystery Pens can change the normalized split but never add
stat points.

The retention loop is visible rather than buried: one Next Goal advances entry,
Back, the daily Champion Contract, capsule, or care; daily actions fill an Ink
Trail toward the discounted Mystery Capsule; and discovery, collector rank, Epic
pity, wearable titles, and immutable personal Legacy Cards persist after
individual Scribbits fade.
One player-level Founder Rival Thread adds a paced return story without power:
first to two, maximum three battles, one authoritative score beat per Arena day,
and a permanent signed margin when resolved.
After the official daily drawing locks, an ephemeral Four-Power Practice Lab
makes the core drawing-to-fight hook repeatable without rewards or persistence.
The Battle Scrapbook makes the newest 20 server-stored fights worth revisiting
without pretending to be permanent history or adding another progression track.
The seven-page Scout Notebook turns existing Back, forecast, payout, Clout, and
featured-report truth into a visible rolling scouting habit without new storage,
currency, or combat power.

## Scope

- App code lives in `app/`.
- Client/server contract lives in `app/src/shared/arena.ts`.
- Server routes live in `app/src/server/routes/api.ts`.
- Domain logic lives in `app/src/server/core/`.
- Phaser scenes live in `app/src/client/scenes/`.

## Current Ship Gates

- [x] Local equivalent of `npm run verify` passes: TypeScript, ESLint, 98
      simulation groups, and production build (July 12).
- [x] Fresh mobile browser proof covers the optional deterministic Doodle Dare,
      first-run draw -> fight -> Ink promise, blank/forming/ready feedback,
      full drawing, birth reveal, live paper-broadcast exhibition, Skip, and
      transcript-derived recap with zero captured runtime errors (July 11).
- [x] An uncurated 320x568 browser run hand-drew `Spiral Splat`, visibly taught
      the four drawing-to-power mappings before its first mark, produced its
      server-analyzed Firetip Halo, and completed a normal-speed founder fight.
      The immediate result, waiting Rival Draft, and persistent Arena card all
      retain the authoritative 1–0 score and Day 10 return cue with zero runtime
      or console errors (July 12).
- [x] Daily creative content now uses 32 validated Doodle Dares, balanced eight
      per Shape Power, and eight optional twists. Every four-day window covers
      all powers, prompts repeat only after 32 days, and exact cards only after 256. The accessible 320x568 card fits above the tools and disappears on the
      first stroke with zero errors. Public forecast flavor independently
      rotates through 32 validated lines and the mock imports production
      selection instead of maintaining duplicate copy (July 11).
- [x] Care now has 72 validated Shape-Power-specific reactions across all three
      actions and all three life days. One Scribbit gets nine distinct lifetime
      notes; a 320x568 WebGL receipt shows its drawing, mood, care marks, exact XP
      delta, and only server-confirmed Ink with zero runtime or console errors.
      The Field Guide now teaches the real four element payloads and explicitly
      removes the retired hidden triangle (July 11).
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
      slot-neutral. A ten-matchup duration matrix locks the 20-second ceiling and
      prevents cross-power fights from becoming mostly stalled decisions.
- [x] Growth regression caps the complete level 1 -> 5 combat edge at 1.5% and
      keeps max-level equal-build win rates at or below 60% across representative
      drawings; the level remains visible through mastery copy and aura marks.
- [x] Swiss matchmaking pairs record first and closest level second, floats odd
      score groups without skipping fights, gives every entrant one fight per
      round, and avoids repeat opponents when an alternative exists.
- [x] WebGL and Canvas browser proof verify mastery labels, tiered impacts,
      lagging HP loss, visible arena folding, mute control, exact drawing art,
      and zero captured runtime errors on `localhost:8902` (July 11).
- [x] The real-time replay now has a distinct paper arena instead of fixed
      turn-like podiums or a broadcast dashboard: full-height torn paper,
      clipping-safe 232px fighters, localized element stains, a rough truthful
      boundary, transcript-reactive surges, compact numeric-HP/Shape Power state
      strips, a smaller server clock, a compact server-lock label, a
      15-second Sudden Scribble rush, and a transient commentary margin. Every
      replay ends by 20 seconds. Default, chosen-rival, 320x568 WebGL,
      Canvas, reduced-motion, Skip, and instrumented 1x -> 2x -> 4x -> normal-speed
      result paths have zero captured runtime or browser errors (July 11).
- [x] Every current fight path—including a chosen Rival Draft rematch—now runs a
      mode-specific paper VS ceremony with both exact signature moves and one
      verified mechanics card. Deterministic coverage exhausts all sixteen ordered
      Shape Power combinations as ten symmetric pairings, bans win-odds language,
      and WebGL/Canvas proof keeps sampled cards readable with zero runtime errors.
      The two visible `35%` Halo claims now derive from the reduction value the
      engine actually consumes. Smearstep's `TWICE` now derives from the dash
      count its indexed authoritative schedule consumes; a dedicated unchanged
      golden hash, exact ten-card snapshots, direct parity checks, and fresh
      320x568 Ring/Halo and Smearstep ceremonies remain green (July 12).
- [x] The transient paper commentary margin selects varied power, hit, miss, shield,
      echo, arena, and late-fight copy deterministically from authoritative facts.
      Its versioned shared pack has 104 globally unique lines in 25 strict banks;
      a replay-scoped author exhausts each bank before reuse, founder signatures
      do not consume generic variants, and the shared parser rejects wrong tokens,
      malformed braces, overlong rendered lines, duplicate copy, invented outcomes,
      and unsafe miss causes.
      A pure editorial queue chooses one strongest candidate per simulation tick,
      holds it for 900ms wall-clock, and bounds pending copy at two items, including
      at 4x. It adds no events or combat authority; Colorburst no longer makes a
      false miss claim before its delayed echo. Fresh 320x568 WebGL proof shows a
      v1 bank line in the live margin, verifies 1x -> 2x -> 4x plus normal-speed
      result tweens, and captures zero runtime or console errors (July 11).
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
- [x] Founder encounters now form one server-authoritative Rival Thread instead
      of a checklist: first to two, maximum three qualifying battles, one score
      beat per Arena day, active-founder pinning in draft and quick spar, unrelated
      exhibition protection, pre-fight match-point/decider stakes, permanent signed
      margins, Arena-day-ordered pending repair, v1 archive-only migration, and
      privacy deletion. Deterministic production/mock coverage plus 320x568 WebGL
      proof verifies the deciding-bout ceremony, RIVAL DECIDER rail, 2–1 margin,
      exact result CTA, and zero runtime errors. Ambiguous post-commit replies now
      recover that exact result beat only after durable state and latest-report
      provenance agree (July 11).
- [x] Every founder Rival Thread now unfolds through one validated three-page
      episode. The 20 immutable arcs provide 60 unique titles and 60
      founder-specific cues; Page 1/2/3 is derived from the server-owned series
      score and appears in Next Goal, Rival Draft, the Chronicle margin, and the
      pre-fight ceremony without new Redis state or outcome/reward claims.
      A 320x568 WebGL Fernibble decider proves `LAST LEAF HOME`, the RIVAL
      DECIDER rail, and zero captured runtime or console errors (July 11).
- [x] Every named Rival page now pays off after the battle through one of 120
      unique founder-authored result lines. A pure receipt planner requires the
      pre-fight page, matching server Chronicle beat, named founder slot, owned
      fighter slot, and validated transcript winner before showing copy. The
      result card exposes the new score and signed/continuing state without new
      persistence or invented rewards. A 320x568 WebGL decider result keeps the
      receipt and all actions visible with zero runtime or console errors (July 11).
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
- [x] The Battles tab is now a mobile Battle Scrapbook for the newest 20 stored
      reports. It preserves MY WIN/MY LOSS after roster expiry, pins Rumble and
      Champion pages within a day, keeps matchup/finish/day rows compact and
      exposes the exact verdict, duration, and final HP in Replay,
      labels transcript-less records honestly, and returns from Replay to the same
      page. A 320x568 WebGL pass covers paging, an expired-fighter loss replay,
      Skip/result/return, and empty runtime and console errors (July 11).
- [x] Scout is now the canonical fifth tab. Its paper Notebook renders tonight
      plus six prior Arena days as explicit open/pending/champion/finalist/
      no-Clout/missed pages using only existing Back, payout, forecast, lifetime
      Clout, visible Scribbit, and featured-report state. Forty-eight validated
      notes rotate without same-status repetition inside seven days; hidden or
      deleted art stays unavailable, historical identity never comes from the
      current Champion, and Replay returns to the selected day. Deterministic
      coverage and a 320x568 WebGL pass prove Day 8 Replay/Skip/return, loaded
      drawings, and empty runtime and console errors without a new Redis key or
      reward track (July 11).
- [x] The 320x568 default hierarchy is now compact across Arena, Draw, Replay,
      Battles, Scout, Gallery, Legacy Book, Collection, Field Guide, Practice,
      and Mystery Ink. Primary cards lead with one headline, one status, and one
      action; rules, moderation, and secondary facts move behind explicit taps
      without changing server authority or rewards (July 12).
- [x] The central battle payoff now has one visual hierarchy. The 320x568 VS
      ceremony keeps names, levels, elements, signatures, Rival stakes/page, and
      exact matchup mechanics while removing three duplicate explanations and
      enlarging both drawings. Results lead with `YOU WON`, `YOU LOST`, or the
      spectator winner, preserve exact finish/duration/final HP, promote
      `CHOOSE A RIVAL` to the single primary action, and demote Practice, pick,
      and return to one compact row. One pure planner and shared renderer keep
      win/loss branches aligned. A normal-speed Fernibble decider proves VS,
      result, compact signed margin, native result/Rival/archived controls,
      Rival-close restoration, and keyboard Arena return at 320x568. Every
      critical replay action retains a 100-design-pixel/44-CSS-pixel target with
      zero runtime or console errors (July 12).
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
      bounded requests, production/mock parity, and attempt-aware encores that
      rotate through all four powers after 4/4 instead of pinning one prompt
      (July 11).
- [x] Mobile WebGL proof covers locked-day entry and four genuinely different
      drawings through 0/4 -> 4/4: every server power reveal, live paper-arena battle,
      truthful recap, next-untried prompt, and the first-completion gold card.
      Canvas replay proof and both runtime checks stay clean; endpoint proof keeps
      Arena, inventory, and battle-history hashes unchanged with no reward field
      (July 11). Deterministic regressions also lock four distinct post-4/4 target
      powers and prompt cards.
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
