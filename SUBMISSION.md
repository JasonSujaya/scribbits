# Scribbits Arena — Submission Package

Deadline: **July 16, 2026 at 08:00 WIB**.

## One-line hook

Draw a creature. Its shape becomes its combat build. Redditors back it. At
midnight the doodle comes alive and fights, with three days to become a Legend.

## Devpost description

Scribbits Arena turns Reddit drawings into living asynchronous fighters. Every
day, each player draws one creature directly inside the post. The server reads
the submitted PNG and normalizes it into a fair 100-point build: large shapes
become Inkquake bruisers, jagged outlines summon a three-quill Nib Halo, compact
footprints Smearstep, and colorful drawings fire Colorburst. Shape changes the
fighter's identity and tactics, never its total stat budget.

Every drawing enters the nightly community Rumble. Players also get one daily
Back: predict the Champion to earn permanent Scout Clout. Results are published
back into the real Reddit thread, creating a daily conversation around player
art, matchups, weather, and predictions.

Scribbits live for three days. Every completed run becomes a frozen card in its
creator's Legacy Book; a crown or enough community Belief gives it a gold finish
and saves it in the public Hall of Legends. Phaser 4.2 maps the actual submitted
PNG onto a 25-vertex Inkbody mesh. The analyzed shape controls how it breathes
and which named Shape Power it performs. Element gives that power one of sixteen
authored signature identities, so the drawing determines numbers, motion, and
battle personality.

The twenty Arena founders are equally authored: one canonical catalog gives each
a stat-shaped body, epithet, challenge, two openings, signature reaction, victory,
defeat, and Rumble line. Their voice appears only in existing presentation beats;
the server transcript still owns every movement, hit, and result.

One founder can become the player's active Rival Thread: a first-to-two series,
maximum three battles, with only one authoritative score beat per Arena day. The
server pins that founder into future choices, ignores same-day farming and
unrelated exhibitions, and writes a permanent signed margin when the thread ends.
It adds relationship and a reason to return without currency or combat power.
Each of the twenty founders has a unique three-page episode. The next title and
scene cue follow the player from Rival Draft to Next Goal, blue-tape margin, and
pre-fight ceremony, while the server score alone decides whether the story is on
Page 1, 2, or 3. That creates 60 named rivalry beats without another database
schema, client-authoritative state, predicted winner, or reward treadmill.
Each page also has two authored endings, producing 120 unique post-bout lines.
Replay selects one only after matching the named page and server Chronicle beat
to the validated transcript winner, then prints the exact new score and whether
the thread continues or its margin is signed.

The current Champion also posts one daily paper Contract. Players choose which
living Scribbit takes the shot, see the Champion's real signature and challenge,
and earn +2 XP only for a win. The server already owns the one-attempt flag; the
client cannot reopen a completed Contract or change its result.

The Scout Notebook makes the overnight prediction loop visible after the receipt
disappears. Its seven paper pages cover tonight and six prior Arena days with the
actual pick drawing, artist, forecast, filed status, Clout/Ink payout, and saved
replay when available. Forty-eight validated field notes rotate without repeating
for the same status inside the week. The server assembles it from existing Back,
payout, forecast, lifetime Clout, and featured-report state; it never substitutes
today's Champion for a missing historical pick and adds no database schema or
reward track.

Once the official daily Scribbit locks, a Four-Power Practice Lab lets judges
draw throwaway shapes and immediately watch more of the same server-authored
combat. Practice re-analyzes the PNG on the server but grants no Ink, XP, roster
slot, Rumble entry, history, or Legacy card; only its browser-session checklist
remembers which powers were tried. The fourth unique discovery lands on a gold
4/4 completion card, while repeats stay replayable without farming a reward or
retriggering the first-completion celebration. Post-completion encores rotate
through all four target powers and fresh prompt cards rather than getting stuck
on one exercise.

## Judging story

- **Delightful UX:** feed card identifies the next action; new players start on
  the canvas with one of 32 optional Doodle Dares, an expressive bonus twist,
  and the clear promise
  “draw → watch it fight → earn Ink”; forming/ready feedback explains every
  stroke; the first submission immediately fights; returning players first see
  newly archived Legacy pages, then get a clear overnight scouting receipt, can
  watch their backed Scribbit's last bout, and receive one focused Next Goal.
  After either exhibition outcome, three server-picked rival cards pair truthful
  build data with memorable founder epithets, visible challenges, and the exact
  previous decisive splat, making “one more fight” an informed continuing story
  instead of a hidden random reroll. One active best-of-three stays pinned across
  days, and its exact score lands on the result before becoming a signed margin.
  Power-specific care notes give each drawing nine distinct moments across its
  three-day life, with a paper receipt showing the exact server-confirmed reward.
  The canonical Scout tab keeps tonight and the prior six days readable after the
  receipt, then returns from a saved Replay to the same dated page.
  A visible post-lock Practice card also lets anyone test all four drawing powers
  without weakening the once-daily official submission.
- **Polish:** portrait layout, a generated Craftbox paper stage, bundled
  DynaPuff, one die-cut navigation family, GPT-generated paper button plates,
  shared paper status icons, responsive controls,
  a progressive-disclosure hierarchy with one headline, status, and action on
  each default card,
  a full-height torn-paper arena with rough truthful bounds, localized element
  stains, transcript-reactive surges, compact HP/Shape Power state strips, a
  smaller fixed-tick clock, and transient paper commentary;
  a versioned 104-line Inkcast pack rotates through 25 fact-specific banks
  without authored repeats before reuse, while prioritized displayed copy retains its 900ms reading
  dwell, twenty coherent founder voices, a winner-first transcript recap with
  truthful KO/time poses and exact duration/final HP, a compact recent Battle
  Scrapbook with server evidence,
  deterministic simulation,
  error states, mobile-safe navigation, UGC report/delete controls, and a full
  verification gate.
- **Mobile performance:** exact drawing analysis runs off the UI thread; pooled
  undo canvases, 256px display art, a 12-texture inactive cache, compact-screen
  ambient suppression, cached HUD labels, and 30 Hz presentation effects keep
  the live 320x568 battle near 59 FPS without changing server authority.
- **Reddit-y:** real Reddit identity, player drawings, daily custom posts,
  Belief, Back/Clout competition, and app-authored result comments using actual
  Rumble data.
- **Hook-y:** one daily drawing, a locked prediction, overnight anticipation,
  a visible daily streak, permanent Scout Clout, a three-day life-or-Legend arc,
  and an earned-only capsule collection with daily discount, collector rank,
  permanent discovery, transparent Epic pity, wearable titles, and a permanent
  Legacy Book. The daily-paced Founder Rival Thread adds a relationship without
  stats or another reward track. A bounded seven-day Scout Notebook turns Back
  results into visible form without another reward track; the newest 20 stored
  fights remain watchable in a truthful Battle Scrapbook. Session-only Practice
  adds replayability without another currency
  or farmable reward. Pens expand expression while the fixed 100-point budget
  prevents purchased or progression-based raw power.
- **Phaser:** WebGL uses Phaser 4.2's new Mesh2D system to deform 25 textured
  vertices from the player's exact PNG. Chonk, Spike, Zip, or Charm selects a
  distinct silhouette move; impacts travel through the mesh, KO folds it, and
  Canvas keeps a 3x3 slice fallback. Tiered hitstop, lagging HP chunks, impact
  rings, folding arena walls, mastery auras, procedural sound, slow motion,
  speed/mute controls, and power-specific vignettes remain Phaser-native
  presentation.
- **Server-authored spectacle:** a deterministic 20 Hz simulation fixes the
  result and stores a bounded transcript. Phaser interpolates it as continuous
  action capped at 20 seconds without WebSockets or client combat authority.
  At 15 seconds, Sudden Scribble halves power cooldowns and finishes folding the
  page inward for a short final rush.
  A mode-specific VS card reveals both signatures and one verified interaction
  from an exhaustive ten-pair Shape Power matrix—mechanics, never win odds.
  Neutral no-clean-hit copy avoids inventing a dodge or counter; shield and
  element cues appear only when the transcript proves them.
  The same transcript owns the final verdict, HP, damage, signature, and decisive
  splat shown by the recap; the client never re-decides who won.

## 60-second demo

1. **0–5s:** Show the Scribbits Reddit feed card: “Its shape becomes its stats.”
2. **5–17s:** Flash the optional Doodle Dare, then draw a pointed, colorful
   creature; show the single status flip from forming to NIB HALO.
3. **17–24s:** Name and submit it; capture the PNG unfolding from an ink blot
   and the “SHAPE POWER” label in the “IT'S ALIVE” reveal.
4. **24–37s:** Flash the mechanics-not-win-odds matchup card, then run the exact
   Mesh2D fight at 2×. Hold on READY → WINDUP → ACTIVE, a reactive paper surge,
   and the transcript-derived recap.
5. **37–43s:** Show a Day 9 Founder margin and 2–1 score, then open Rivals to prove
   the active founder is pinned beside two fresh exhibition choices.
6. **43–49s:** Open Scout, flip from tonight to a filed Day 8 drawing, start its
   saved replay, then return to that same page.
7. **49–55s:** Flash the daily Champion Contract, then cut through the reward-free
   Practice Lab's four checked powers and
   land on its gold 4/4 completion card.
8. **55–60s:** Montage the earned capsule reveal, Collection,
   gold Legacy Card, and real Reddit result comment.

## Required links and proof

- [ ] Devvit app listing: `https://developers.reddit.com/apps/scribbits`
- [ ] Public demo subreddit: `<add URL>`
- [ ] Public post running the current build: `<add URL>`
- [ ] Public demo video under one minute: `<add URL>`
- [ ] Current revision uploaded and installed.
- [ ] Mobile and desktop Reddit playtest completed with a fresh account.
- [ ] Draw → submit → first fight → Back → nightly result comment proven.
- [ ] Significant June 17–July 15 updates summarized in the Devpost entry.

## Significant hackathon-period work

- Replaced the earlier catch/collection direction with the current daily
  draw-to-stats Rumble loop.
- Added deterministic server-side PNG analysis and fair stat normalization.
- Added 32 optional daily Doodle Dares, balanced eight per Shape Power, plus
  eight reward-free twists. The versioned schedule covers every prompt before
  repeating and produces 256 distinct cards. Progressive blank/forming/ready
  feedback and a shared client/server minimum-body gate reject tap-sized submissions.
- Added 32 validated public forecast blurbs on an independent no-repeat rotation.
  App, Reddit post, result comment, and browser mock share that copy without
  changing boosted/nerfed element randomness.
- Added 72 validated care reactions across Shape Power, action, life day, and
  stable variant. The paper receipt shows the exact XP delta and only committed
  Ink; no care flavor can claim a reward or battle result. Replaced the Field
  Guide's retired element triangle with the actual Ember/Tide/Moss/Storm payloads.
- Bound decorated 512x512 PNGs to their authoritative base drawings on the
  server, rejecting changed pixels outside declared accessory regions and any
  attempt to erase base pixels.
- Replaced turn-like battle playback with a server-precomputed 20 Hz transcript:
  continuous wall movement, collisions, HP checkpoints, four persistent Shape
  Powers, element payloads, arena pressure, a 15-second Sudden Scribble rush,
  and a bounded 20-second ceiling.
- Removed the obsolete turn-beat replay fallback and outcome-neutral cheer
  meter. Current battles have one continuous transcript path; transcript-less
  stored reports show an honest archived-result summary instead of reconstructed
  turns.
- Added slot-swapped archetype balance, slot-neutrality, determinism, payload,
  entity-cap, checkpoint-cap, and transcript-cap regression gates.
- Capped the full level 1 -> 5 combat edge at 1.5%, statistically gated
  max-level equal-build wins at 60%, and made growth readable through mastery
  labels and aura marks instead of hidden power.
- Rebuilt Swiss pairing around record then closest level, with fair score-group
  floaters, one fight per entrant per round, and no avoidable rematches. Drawing
  archetype and element stay out of matchmaking so counters remain meaningful.
- Separated authoritative base drawings from decorated display PNGs so equipped
  accessories stay cosmetic and cannot alter combat analysis.
- Promoted Mystery Ink into a visible return loop: daily action progress toward
  a discounted capsule, permanent collection discovery, collector ranks, and a
  tangible item-art reveal with a direct Collection handoff. Capsules disclose
  70/25/5 rarity odds and guarantee an Epic by pull 10; permanent pen/title
  duplicates redirect within rarity while useful accessory copies stack.
  Accessories and titles are cosmetic; pens add expression without raising the
  fixed 100-point stat budget.
- Added a paper-native 36-item Collection book with discovered artwork, locked
  clues, rarity, copy counts, pen swatches, title badges, and persistent progress.
  Eight cosmetic Shape Power Relics tie collection rewards to battle identity
  without adding stats or changing drawing analysis.
- Added a server-selected overnight Rumble replay and one progressive Next Goal
  that advances entry, Back, the unused Champion Contract, capsule, and care
  without exposing the full metagame.
- Added wearable titles and an immutable personal Legacy Card for every expired
  Scribbit, with its art, final record, Belief, dates, accessories, creator-title
  signature, finish treatment, paginated archive, and one-time return ceremony.
- Consolidated client and server reward metadata into one shared catalog with
  parity tests, preventing rarity, label, and inventory drift.
- Added daily Back predictions, Clout payouts, three-day lifecycle, Belief, and
  Legends.
- Added Phaser 4.2 Mesh2D Inkbody fighters: 25-vertex submitted-PNG deformation,
  deterministic stat-driven Shape Powers, Inkquake rings, orbiting Nib Halo
  quills, Smearstep afterimages, a Colorburst cone/echo, impact ripples, exact
  submitted-drawing birth unfolding, KO folding, and a Canvas-safe 3x3 fallback.
  The first-session payoff uses the player's drawing immediately, then shows one
  truthful Ink receipt before `WATCH FIRST FIGHT`.
- Added sixteen authored element x Shape Power signature identities plus a
  mode-specific pre-fight card backed by an exhaustive ten-pair mechanics matrix.
  It explains interactions without win odds; neutral no-clean-hit copy avoids
  inventing dodge or counter causes when the transcript cannot prove them.
- Added transcript-only impact tiers, micro-hitstop, HP damage trails, visible
  arena shrink, sudden-fight callouts, optional synthesized cues with mute, and
  reduced-motion fallbacks; none can affect the authoritative result.
- Rebuilt the continuous fight as a physical paper arena rather than two
  turn-like podiums or a broadcast dashboard: a full-height deterministic torn
  page, clipping-safe 232px drawings, localized element stains, irregular
  authoritative bounds, reactive power surges, compact numeric-HP and
  READY/WINDUP/ACTIVE strips, a smaller clock, a compact server-lock label, a
  transient paper commentary margin, positional overlap depth, and separated
  post-fight actions. Playback can run at 4×, but
  the result ceremony always returns to normal presentation speed.
- Added a versioned, deterministic Inkcast play-by-play pack for existing battle
  moments: 104 globally unique lines, stable IDs, and 25 fact-specific banks.
  Each replay exhausts a bank before authored reuse; strict shared parsing and
  validation reject wrong tokens, malformed braces, duplicate/overlong copy,
  invented rewards or outcomes, unsafe miss explanations, timing overclaims,
  and future arena events. The typed authoring layer structurally excludes a
  Colorburst miss because its echo may still connect. It cannot add events,
  change their order, or affect the authoritative result.
- Added a pure Inkcast editorial queue: one strongest line per simulation tick,
  900ms wall-clock dwell, and two pending beats. It remains bounded at 4×, clears
  on Skip/finish, and only prioritizes already-authored candidates.
- Added a deterministic Inkcast Recap planner derived only from the validated
  battle transcript. The compact result leads with `YOU WON`, `YOU LOST`, or
  the spectator winner, then exact finish reason, duration, and final HP. One
  primary Rival/pick action and a compact utility row replace four equal-looking
  choices. Critical result, Practice, archived-return, and Rival Draft actions
  remain at least 44 CSS pixels at 320x568 and mirror the canvas with native
  focusable Enter/Space controls, while the validated damage/signature/splat facts still
  feed server-safe follow-on content. KO, double-KO, and timeout poses tell different truths,
  and inconsistent top-level winner/fighter data or impossible terminal finish
  reasons are rejected before storage or replay.
- Rebuilt recent battle history as a Battle Scrapbook for the newest 20 stored
  reports. Pages retain owned win/loss perspective after roster expiry, prioritize
  Rumble and Champion fights within each day, keep matchup/finish/day rows
  compact, expose exact verdict/duration/final HP in Replay, label result-only
  archives honestly, and
  return from Replay to the same page without adding rewards or persistence.
- Added a seven-page Scout Notebook over existing authoritative data: tonight
  plus six prior Arena days, six explicit pick/result states, actual drawing and
  artist snapshots, exact forecast/payout facts, lifetime Clout, privacy-safe
  unavailable states, and replay return to the same day. Its 48 frozen lines are
  validated for completeness, length, uniqueness, finish claims, prediction
  language, and reward promises. It adds no Redis key or reward track.
- Added deterministic stat-shaped art for all 20 founding opponents and one
  shared dominant-stat selector across server combat, drawing preview, replay,
  Inkbody motion, and fallback silhouettes.
- Moved those founders into one immutable shared catalog and added 160 validated,
  unique story strings. Existing Rival Draft, VS, pre-FIGHT, first-signature,
  outcome, scouting, and Reddit-result moments now carry character voice without
  adding Redis state, battle events, or client authority.
- Added a server-authored three-rival draft after owned exhibition wins and
  losses. Cards disclose real level, element, Shape Power, signature, forecast,
  epithet, and challenge; the prior authoritative decisive splat remains in the
  header. Off-card choices fail closed and the local mock imports the production
  selector instead of maintaining a second matchmaker.
- Made Draw canvas-first: the larger page keeps all eight base colors visible,
  separates unlocked premium pens from the base palette, and retains a compact
  brush/eraser/undo/optional-sticker rail. Name and `BRING TO LIFE` reveal only
  after the shared analyzer accepts the drawing; undoing below that same server
  threshold hides and disables them again.
- Added one server-authoritative Founder Rival Thread per player: first to two,
  maximum three qualifying battles, one score beat per Arena day, active-founder
  pinning across Rival Draft and quick spar, same-founder Champion advancement,
  unrelated exhibition protection, pre-fight match-point/decider stakes, and
  permanent signed margins. A versioned transaction plus pending report receipts
  repairs ambiguous writes in Arena-day order; v1 checklist history migrates
  without invented scores, and duplicate reports, privacy deletion, and
  production/mock parity are regression-locked. A lost post-commit reply can
  recover its exact authored beat only after durable state and latest-report
  provenance match the precomputed projection.
- Added twenty validated three-page founder episodes: 60 unique titles and 60
  founder-specific cues shared by Rival Draft, Next Goal, Chronicle margin, and
  the VS ceremony, plus 120 unique result lines bound to the proven latest winner.
  The authoritative series score selects the page; authored content remains
  immutable repo data and adds no Redis state or combat effect. The result strip,
  waiting Rival card, and persistent Arena evidence now keep that server score
  and return day visible without restoring a dense rules panel.
- Promoted the existing daily boss fight into a truthful Champion Contract with
  server-projected completion state, founder/community voice, exact signature,
  conditional +2 XP, a paper challenger picker, and a noninteractive used stamp.
  The mock now enforces the same one-attempt and win/loss/XP behavior.
- Added a server-authoritative Four-Power Practice Lab after the daily drawing
  locks. It re-analyzes throwaway PNGs, returns a required continuous transcript,
  tracks only unique powers in the browser session, and cannot grant rewards,
  enter progression, expose Belief actions, upload media, or reach battle storage.
  The first 4/4 completion now receives one gold payoff without becoming a farm;
  later attempts rotate across all four powers and new prompt cards.
- Added the battle ceremony, first-session exhibition, and living-paper
  interface, then simplified the theater to one server-authored combat model.
- Bound both visible Halo `35%` matchup explanations and Smearstep's `TWICE`
  label to the configuration the combat engine consumes, while retaining exact
  snapshots for all ten cards and an unchanged Smearstep golden transcript.
- Added real Reddit post scheduling and idempotent result comments.
- Made transparent and legacy paper-backed PNGs produce identical
  server-authoritative stats, with automated parity coverage.
- Added report/hide, owner removal, full player-data deletion, Reddit-only
  media hosting, and safety disclosure in the in-game Field Guide.
- Added a visible play streak and a persistent nightly-resolution outbox so
  retries cannot resolve the same Rumble twice.
- Added a clear return receipt for overnight scouting results, truthful
  server-priced capsules, and a paper-native matchup ceremony.
- Added paginated Battle Scrapbook rendering for the server's bounded newest-20
  report window and server-cursor Legend Gallery pagination beyond the first 50
  entries, with each surface stating its real retention boundary.
- Made Belief updates concurrency-safe, kept nightly resolution outbox-idempotent,
  and added atomic capsule operation receipts so ambiguous retries reuse the
  same result instead of charging or rewarding twice.
- Made each nightly Rumble Ink payout and winning-Back Clout/Ink payout commit
  its receipt atomically with the reward, with safe recovery after a lost reply.
- Hardened mobile play with larger draw targets, keyboard submission, safe-area
  handling, landscape suspension, input realignment, reduced-motion support,
  bounded drawing textures, and a 10-step memory-safe undo stack.
- Added deterministic simulations, mock first-player QA, deployment automation,
  and the submission proof workflow.
