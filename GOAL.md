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
select the fighter's identity and power. Birth stickers and titles never affect
analysis or stats; Mystery Pens can change the normalized split but never add
stat points. Earned reusable Gear adds only bounded Exhibition sidegrades and
never mutates that fixed drawing build.

The retention loop is visible rather than buried: one Next Goal advances entry,
Back, the daily Champion Contract, chest, or care; earned Ink opens a flat-price
Mystery Ink Chest one or ten times, and discovery, collector rank, Epic
pity, wearable titles, and immutable personal Legacy Cards persist after
individual Scribbits fade.
One player-level Founder Rival Thread adds a paced return story without power:
first to two, maximum three battles, one authoritative score beat per Arena day,
and a permanent signed margin when resolved.
After the official daily drawing locks, an ephemeral Four-Power Practice Lab
makes the core drawing-to-fight hook repeatable without rewards or persistence.
The Battle Scrapbook makes the newest 20 server-stored fights worth revisiting
without pretending to be permanent history or adding another progression track.
Rumble Pick stays directly reachable from Arena. Shop owns earned-Ink Mystery
Chests, Bag owns inventory and equipment, and Gallery owns community Legends
and personal Legacy Cards outside the primary dock.

## Scope

- App code lives in `app/`.
- Client/server contract lives in `app/src/shared/arena.ts`.
- Server routes live in `app/src/server/routes/api.ts`.
- Domain logic lives in `app/src/server/core/`.
- Phaser scenes live in `app/src/client/scenes/`.

## Current Ship Gates

- [x] All 26 earned Gear items now resolve into six server-authored Exhibition
      techniques across 1★–5★ and Red★. One lead plus one 25% support per
      category keeps the fixed 100-point drawing build intact, Bag shows the
      frozen active/support rank and exact effect, and Gear Week supplies seven
      visible daily beats. Forge refreshes every living Scribbit wearing that
      reusable Gear before returning. All six ranks now pass the mirrored
      family matrix; simulation tuning softened the 5★ Guard downside, increased
      Rush recovery cost, and capped stacked timing at one tick. The final gate
      passes 126/126 focused
      tests, 181/181 deterministic groups, lint, type-check, production build,
      and fresh 393x852 live renders in
      `artifacts/screenshots/gear-red-star-blade-volley-live.png`,
      `artifacts/screenshots/gear-live-balance-result.png`, and
      `artifacts/screenshots/gear-week-seven-day-content-final.png` (July 14).
- [x] Bag uses a character-first equipment stage with a visible platform,
      eight surrounding slots, category filters below the character, and one
      bounded scrollable inventory tray. Gear tiles are icon-only: strong taupe,
      blue, and purple/gold frames communicate Common, Rare, and Epic rarity,
      while a separate check badge preserves equipped state. Tapping the whole
      tile opens the item's stars, copy count, description, Equip/Unequip action,
      and Forge action without silently replacing a full slot. Every preview is
      measured and centered inside a fixed safe box. The character now floats
      directly on the collage without a large parent paper panel. Equipped and
      inventory Gear now use the exact same 96x96 outer-square renderer, rarity
      frame, and 60x56 preview box; the inventory uses an airier five-column
      square grid.
      A 393x852 WebGL pass proves the same Party Hat at identical outer and icon
      sizes in both places and captures zero console warnings or errors. The
      release gate passes 26 suites / 82 tests,
      180 deterministic groups, lint, type-check, and production build (July 13).
- [x] The persistent dock is Arena, Bag, Draw, Battles, and Shop. Scout and
      Gallery are removed from primary navigation, Bag opens inventory/equipment
      directly, Shop opens earned-Ink Mystery Chests, and Arena retains a compact Rumble Pick
      action. The final release gate passes 16 suites / 50 tests, 176
      deterministic simulation groups, lint, type-check, and production build.
      A clean 393x852 live-browser pass confirms the exact dock order, distinct
      Bag/Shop active states, zero Scout buttons, zero runtime errors, and no
      console warnings or errors (July 14).
- [x] Bag now has one server-authoritative, per-Scribbit loadout: two slots
      each for weapon, armor, shoes, and accessory. Discovered Gear is reusable,
      duplicate copies remain Forge material, equipped Gear resolves into at
      most one bounded Exhibition technique per category, and localhost proof covers two pets, two weapon slots,
      reload persistence, zero runtime errors, and the 393x852 mobile layout.
      The final release gate passes 15 suites / 46 tests, 176 deterministic
      simulation groups, lint, type-check, and production build (July 13).
- [x] `pnpm verify` passes: TypeScript, ESLint, 176 deterministic simulation
      groups, and the production build (July 13).
- [x] Scribbit birth now has one Redis transaction owner. The primary record,
      owner/alive/expiry indexes, Rumble entry, daily flags, play streak, Ink,
      and accessory spend commit together; exact readback recovers a lost EXEC
      reply without duplicate reward or spend. Rejection, reply-loss, and
      per-command EXEC-error tests fail closed. A bounded per-day active-birth
      lease prevents nightly resolution from snapshotting between a partial EXEC
      and exact repair; the nightly worker also fails closed if its distributed
      claim command itself errors. Media remains an external upload phase that cannot
      partially mutate player state (July 13).
- [x] Production and localhost now share one submission, progression, reward,
      capsule, title, and accessory rules boundary. Repeat daily submissions,
      duplicate care, capsule retries, insufficient Ink, and hard pity have
      regression proof; the typed Phaser registry is the only home for
      cross-scene keys. The slop audit has zero open P0 findings (July 12).
- [x] Birth, Practice, and the live VS ceremony now share one concise Shape
      receipt derived from the server-returned fighter: the visible drawing cue
      maps to its named move and plain combat effect without a raw stat panel.
      The VS screen drops its duplicate mode rail and generic matchup paragraph
      for two causal lines, with fresh 393x852 browser proof (July 13).
- [x] Shared press interactions now self-release their scene-level listeners as
      soon as a Phaser control is destroyed, so Gallery rebuilds cannot retain
      stale tab, dock, or card closures until scene shutdown (July 13).
- [x] The generic Redis storage and transaction contract now has one
      dependency-free server home; 13 domain callers no longer depend on the
      Scribbit module for unrelated infrastructure types (July 12).
- [x] Public routes no longer own Practice guard/rate keys or daily Belief
      receipt records; typed core modules now own those persistence boundaries
      and focused regression tests cover their current behavior (July 12).
- [x] Fresh mobile browser proof covers the optional deterministic Doodle Dare,
      first-run draw -> name -> fight -> Ink promise, the visible disabled/ready
      Next action, full drawing, birth reveal, live paper-broadcast exhibition, Skip, and
      transcript-derived recap with zero captured runtime errors (July 11).
- [x] An uncurated 320x568 browser run hand-drew `Spiral Splat`, produced its
      server-analyzed Firetip Halo, and completed a normal-speed founder fight;
      the current receipt now teaches that shape-to-power cause after drawing
      without a four-power preamble.
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
- [x] Roster cards now expose only two non-overlapping actions: icon-led `CARE`
      and sword-led `SPAR`. CARE opens one compact Feed/Pat/Train picker with
      code-native berry, paw, and dumbbell marks, honest DONE states, native
      accessibility mirrors, generated close control, and 100-design-pixel
      targets. A real 320x568 Train action reaches the existing authoritative
      care receipt with zero runtime errors. Drag-release guards prevent stray
      actions, keyboard receipts wait for dismissal, and all five dock tabs now
      expose native labels plus active-page state (July 12).
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
      turn-like podiums or a broadcast dashboard: ten server-selected stages,
      clipping-safe 280px fighters, localized element washes, a rough truthful
      boundary, transcript-reactive surges, visual HP bars, transient Shape Power
      states, a smaller server clock, a compact arena caption, a
      15-second Sudden Scribble rush, and a transient commentary margin. Every
      replay ends by 20 seconds. Default, chosen-rival, 320x568 WebGL,
      Canvas, reduced-motion, Skip, and instrumented 1x -> 2x -> 4x -> normal-speed
      result paths have zero captured runtime or browser errors (July 11).
- [x] Every arena now closes its loop with one server-scored micro-goal. Replay
      renders a dedicated compact target stamp above the recap, so founder story
      copy can coexist with the stored cleared/progress state. The accessibility
      announcement keeps the exact goal without inventing rewards or client-side
      combat truth. Fresh browser proof is captured in
      `artifacts/screenshots/battle-goal-payoff.png` (July 13).
- [x] Arena now reveals the canonical daily micro-goal before the player chooses
      a fighter or rival. The venue name and target goal replace the generic
      `CHOOSE FIGHTER` box, one info icon owns the short venue rule, the accessible
      Fight action includes the arena and goal, and the result closes the same
      server-scored loop. Fresh proof is captured in
      `artifacts/screenshots/arena-venue-polish.png`; 119/119 focused suites and
      182/182 legacy groups pass (July 13).
- [x] Ink Mods now produce measurable fixed-tick effects instead of sub-pixel
      progression. The six existing IDs keep deterministic level assignment and
      the four-mod cap, Scribbit details show each exact effect, and mirrored
      coverage spans all four builds, four elements, and ten arenas while keeping
      full loadouts below the 60% equal-build ceiling. Fresh mobile proof is in
      `artifacts/screenshots/ink-mod-details-final.png` (July 13).
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
      transcript. Its compact result now preserves one memorable Shape Power
      lesson (`FINAL SPLAT` or `WINNER'S SPLAT` plus exact damage) instead of
      discarding that computed truth. Browser proof covers knockout, double knockout, timeout,
      owned loss, WebGL, and Canvas: only KO losers fold, timeout fighters stay
      standing, outcome actions remain usable, and captured runtime errors stay
      at zero (July 13).
- [x] All 20 founding opponents now receive deterministic stat-shaped mascot art.
      Chonk, Spike, Zip, and Charm alter silhouette/anatomy from the same shared
      dominant-stat selector used by birth receipts, Inkbody, replay, and server
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
      VS card now renders the authored page cue, and the existing result recap
      renders the matching authored result line instead of repeating a generic
      score headline. This adds no new panel, persistence, or invented reward.
      A 320x568 WebGL decider result keeps the
      receipt and all actions visible with zero runtime or console errors (July 11).
- [x] The existing once-daily Champion Challenge now has one truthful player-facing
      contract. Arena state projects the server-owned daily flag; founder/community
      identity, exact signature, conditional +2 XP, paper challenger picker, and a
      noninteractive completion stamp replace a stale always-live CTA. Default and
      320x568 WebGL proof cover full-card selection, VS, replay/Skip, result, return,
      completion, and empty browser error logs (July 11).
- [x] Browser proof verifies the Daily Ink Trail, original 5-Ink chest CTA,
      collection/rank/pity overlay, server-confirmed pull ceremony, and persisted
      post-pull progress with no runtime errors on `localhost:8902` (July 10).
- [x] Mystery Ink now presents one clickable hand-drawn chest, a Loot
      banner with real Gear art, visible 70/25/5 odds, and Epic pity by open ten.
      Players can open one or a maximum batch of ten; server-safe retries resume
      the unfinished open, and there is no 100-open or auto-repeat action. A
      disabled Reddit Gold Styles card stays cosmetic-only and coming soon.
      Fresh 393x852 proof covers one-open, ten-open, reveal, Bag return, and zero
      browser warnings or errors (July 13).
- [x] Gallery now exposes four owned items at a time in the renamed Ink Kit,
      with full art, names, counts, and no undiscovered-item wall. Legends and
      Legacy use the same four-card rhythm, and all paging controls sit below
      their card grids instead of floating as an unexplained top-right arrow.
      Fresh 393x852 WebGL proof has zero browser warnings or errors (July 13).
- [x] Every Arena mutation and refresh continuation now passes through one pure
      activation policy. Stopped-scene responses cannot rebuild destroyed DOM;
      late results schedule a current or next-activation reconciliation, and
      out-of-order same-activation refreshes are ignored. Deterministic runtime
      cases cover all four outcomes (July 13).
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
- [x] Gallery now uses three icon-led 193x100 section tabs with native
      tablist/tabpanel semantics and async-safe Arrow/Home/End focus. The sparse
      2x3 Hall remains, but Legend cards replace emoji and tiny arrows with larger
      drawing/name/status hierarchy, trophy/heart truth, an info-led `VIEW`, and
      100-design-pixel native actions. Every section's cards and paging are
      keyboard reachable; described modal dialogs trap focus, hide background
      actions, restore their trigger, and expose truthful action state. Rebuild
      cleanup and stale-error recovery are WebGL/Canvas-proven across Legends,
      Legacy, and Collection at 320x568 (July 12).
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
      Skip/result/return, and empty runtime and console errors. Rows now show only
      both portraits, one matchup, one result line, and a code-native `REPLAY` or
      `VIEW RESULT` action; planner-owned copy prevents archived/replay drift.
      Native 100-design-pixel row actions and pagination preserve keyboard access
      without stacking invisible overlays (July 12).
- [x] Saved motion from the Scrapbook, Scout, and overnight receipt now opens
      with one compact portrait matchup ticket and offers an icon-led `REPLAY`
      utility beside the truthful return action. Replay-again restarts the exact
      local transcript, increments only a session watch pass, rotates safe
      Inkcast variants while preserving founder truth, and makes no API mutation
      or reward claim. WebGL plus Canvas/reduced-motion proof stays clean at
      320x568 with stable Arena JSON and zero runtime errors (July 12).
- [x] The former Scout fifth-tab implementation rendered tonight
      plus six prior Arena days as explicit open/pending/champion/finalist/
      no-Clout/missed pages using only existing Back, payout, forecast, lifetime
      Clout, visible Scribbit, and featured-report state. Forty-eight validated
      notes rotate without same-status repetition inside seven days; hidden or
      deleted art stays unavailable, historical identity never comes from the
      current Champion, and Replay returns to the selected day. Deterministic
      coverage and a 320x568 WebGL pass prove Day 8 Replay/Skip/return, loaded
      drawings, and empty runtime and console errors without a new Redis key or
      reward track. The July 12 clarity pass replaces cryptic marks with seven
      word-labelled 100x144 day targets, separates seven-day form from lifetime
      Clout, renders one existing authored margin note, and adds native header,
      tab, and action controls with arrow/Home/End navigation and replay busy
      state. WebGL and Canvas/reduced-motion return to the selected day cleanly.
      This historical gate was superseded on July 13 when Scout left primary
      navigation; its scene remains only for saved-replay compatibility.
- [x] A player who entered their own Scribbit but skipped Back now returns to
      one owned-Rumble receipt: exact entrant drawing, daily W/L, committed XP,
      committed Ink, and the server-selected last real bout. Back receipts keep
      their Clout identity, zero-win owned receipts stay factual, and malformed
      or partial payouts fail closed instead of inventing rewards (July 12).
- [x] The 320x568 default hierarchy is now compact across Arena, Draw, Replay,
      Battles, Scout, Gallery, Legacy Book, Collection, Field Guide, Practice,
      and Mystery Ink. Primary cards lead with one headline, one status, and one
      action; rules, moderation, and secondary facts move behind explicit taps
      without changing server authority or rewards (July 12).
- [x] Draw now keeps its 620-pixel canvas as the hero, presents all eight base
      colors in two four-color rows with full touch targets, and shows only
      size, eraser, undo, and one Tools icon by default. Collectible paints,
      brushes, stickers, Clear, and Redo remain one tap away; active special
      supplies stay visibly badged. Failed submission resumes the authoritative
      60-second clock, and the first-birth Rival Run chooser retains native
      keyboard controls plus a return to the birth receipt. Tall phones distribute vertical slack without stretching the
      drawing square or stage art (July 13).
- [x] Arena home now contains one direct battle setup only: a visible
      Scribbit-versus-opponent matchup, Champion/Spar selectors, and one paper
      Champion fight or `CHOOSE A RIVAL` action. The old `PICK A WINNER` grid, modifier strips,
      day/streak copy, and Ink utility are absent from the default stack; Rumble
      is one compact secondary control. Empty rosters get one large pencil-led
      Draw action with no hidden rival controls. Mystery Ink now opens from Shop,
      Champion keeps one lifecycle-safe launcher while every Spar enters the
      shared server-authored Rival Run flow (July 14).
- [x] The Craftbox visual system now gives all five dock scenes one generated
      torn-paper stage, bundled DynaPuff, one optical-weight code-native dock
      icon family, one contained coral active tile, and shared paper status/
      element icons. Arena drops
      the duplicate Ink Trail and Practice cards, locked Draw opens Practice
      directly, and Gallery/Battles/Scout remove explanatory card copy. A live
      320x568 pass covers Arena, Draw-to-Practice, Scout, realtime spar, Skip,
      and the compact result with larger combat type, one four-control Draw rail,
      no visible stat dashboard, 100-design-pixel targets, code-native tool/
      playback icons, and no error-level runtime messages (July 12).
- [x] The five-tab dock now uses a flat 136-design-pixel paper tray, 68-pixel
      monochrome rosette/trophy/pencil/swords/magnifier marks, readable 28-pixel
      labels, and full-slot native targets. The raised ticket, tiny Draw badge,
      padded generated PNGs, and stray cropped fragments are removed from the
      runtime; 320x568 Arena and Gallery proof keeps six Gallery cards, exact
      active-page semantics, zero overflow, and zero runtime errors (July 12).
- [x] Compact mobile performance now keeps combat truth and visible juice while
      removing ambient-only work. Exact drawing analysis runs in a worker;
      pointer bounds and undo snapshots are reused; display art is capped at
      256px with a 12-texture inactive cache; unchanged HUD text is cached; and
      replay-only effects/Inkbody deformation are bounded to 30 Hz. A 320x568
      WebGL battle improves from about 51 to 59 FPS and Draw holds 60 FPS during
      a real stroke, with zero runtime errors (July 12).
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
      Legacy snapshots, champion/believed/faded finishes, strict non-combat card
      DTOs, monotonic seen state, and Legacy-before-Rumble return sequencing. The
      one-time return now leads with one drawing, `LEGEND!` or `MEMORY SAVED`, one
      exact record line, and one icon-led action; a pure planner locks hero
      priority and bounded copy. A 320x568 WebGL pass proves the compact card,
      native action, handoff into the real Rumble receipt, and zero runtime errors
      (July 12).
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
- [x] The three-choice Rival Run board is now the first decision for every
      player-facing Spar: Arena, first birth, and post-fight continuation all
      share one controller for slate fetch, day rollover, selected-opponent
      request, report staging, and VS ceremony. Opponent-less scene calls and
      the blind opening fight are removed. Live mobile proof completes all three
      bouts, reaches the final challenge receipt, and rolls into a fresh bout
      1/3 board; the compact chooser clears the persistent dock (July 14).
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
- Maintain atomic submission and production API contract coverage; do not
  restore route-level best-effort rollback for Redis player state.
- Keep generated logs out of git; store only concise evidence summaries when needed.
- Split the combat engine behind its unchanged public contract when that work
  materially improves balance iteration; fixed-seed golden transcript hashes
  now protect the current facade.

## Historical Plans

Older Remonsta catch/Dex/Wilds plans are retained as ideation only. They are not
implementation truth unless explicitly revived.
