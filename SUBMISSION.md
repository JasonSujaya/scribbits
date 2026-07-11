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

The current Champion also posts one daily paper Contract. Players choose which
living Scribbit takes the shot, see the Champion's real signature and challenge,
and earn +2 XP only for a win. The server already owns the one-attempt flag; the
client cannot reopen a completed Contract or change its result.

Once the official daily Scribbit locks, a Four-Power Practice Lab lets judges
draw throwaway shapes and immediately watch more of the same server-authored
combat. Practice re-analyzes the PNG on the server but grants no Ink, XP, roster
slot, Rumble entry, history, or Legacy card; only its browser-session checklist
remembers which powers were tried. The fourth unique discovery lands on a gold
4/4 completion card, while repeats stay replayable without farming a reward or
retriggering the first-completion celebration.

## Judging story

- **Delightful UX:** feed card identifies the next action; new players start on
  the canvas with an optional daily Doodle Dare and the clear promise
  “draw → watch it fight → earn Ink”; forming/ready feedback explains every
  stroke; the first submission immediately fights; returning players first see
  newly archived Legacy pages, then get a clear overnight scouting receipt, can
  watch their backed Scribbit's last bout, and receive one focused Next Goal.
  After either exhibition outcome, three server-picked rival cards pair truthful
  build data with memorable founder epithets, visible challenges, and the exact
  previous decisive splat, making “one more fight” an informed continuing story
  instead of a hidden random reroll. A visible
  post-lock Practice card also lets anyone test all four drawing powers without
  weakening the once-daily official submission.
- **Polish:** portrait layout, paper visual identity, responsive controls,
  a torn-paper live Inkcast stage with an explicit server-locked rail, numeric HP
  panels, smaller fixed-tick clock, edge ambience, and moving shadows;
  prioritized power-specific Inkcast play-by-play retains its 900ms reading
  dwell, twenty coherent founder voices, a transcript-derived Inkcast Recap with
  truthful KO/time poses, deterministic simulation,
  error states, mobile-safe navigation, UGC report/delete controls, and a full
  verification gate.
- **Reddit-y:** real Reddit identity, player drawings, daily custom posts,
  Belief, Back/Clout competition, and app-authored result comments using actual
  Rumble data.
- **Hook-y:** one daily drawing, a locked prediction, overnight anticipation,
  a visible daily streak, permanent Scout Clout, a three-day life-or-Legend arc,
  and an earned-only capsule collection with daily discount, collector rank,
  permanent discovery, transparent Epic pity, wearable titles, and a permanent
  Legacy Book. Session-only Practice adds replayability without another currency
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
  action capped at 25 seconds without WebSockets or client combat authority.
  A mode-specific VS card reveals both signatures and one verified interaction
  from an exhaustive ten-pair Shape Power matrix—mechanics, never win odds.
  Neutral no-clean-hit copy avoids inventing a dodge or counter; shield and
  element cues appear only when the transcript proves them.
  The same transcript owns the final verdict, HP, damage, signature, and decisive
  splat shown by the recap; the client never re-decides who won.

## 60-second demo

1. **0–5s:** Show the Scribbits Reddit feed card: “Its shape becomes its stats.”
2. **5–17s:** Flash the optional Doodle Dare, then draw a pointed, colorful
   creature; show forming feedback become NIB HALO and the four stats settle.
3. **17–24s:** Name and submit it; capture the PNG unfolding from an ink blot
   and the “SHAPE POWER” label in the “IT'S ALIVE” reveal.
4. **24–37s:** Flash the mechanics-not-win-odds matchup card, then run the exact
   Mesh2D fight at 2×. Hold on the readable Inkcast signature/critical headlines
   and land on the transcript-derived recap.
5. **37–44s:** Open Rivals. Show `LAST BOUT • FINAL SPLAT`, three visible founder
   challenges, and a chosen rematch entering its own VS card.
6. **44–50s:** Flash the daily Champion Contract, paper challenger picker, and
   completed stamp after a 4× server replay.
7. **50–55s:** Cut through the reward-free Practice Lab's four checked powers and
   land on its gold 4/4 completion card.
8. **55–60s:** Montage the scouting receipt, earned capsule reveal, Collection,
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
- Added sixteen optional daily Doodle Dares, a first-run draw/fight/reward
  promise, progressive blank/forming/ready feedback, and a shared client/server
  minimum-body gate that rejects tap-sized submissions.
- Bound decorated 512x512 PNGs to their authoritative base drawings on the
  server, rejecting changed pixels outside declared accessory regions and any
  attempt to erase base pixels.
- Replaced turn-like battle playback with a server-precomputed 20 Hz transcript:
  continuous wall movement, collisions, HP checkpoints, four persistent Shape
  Powers, element payloads, arena pressure, and a bounded 25-second ceiling.
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
  quills, Smearstep afterimages, a Colorburst cone/echo, impact ripples, birth
  unfolding, KO folding, and a Canvas-safe 3x3 fallback.
- Added sixteen authored element x Shape Power signature identities plus a
  mode-specific pre-fight card backed by an exhaustive ten-pair mechanics matrix.
  It explains interactions without win odds; neutral no-clean-hit copy avoids
  inventing dodge or counter causes when the transcript cannot prove them.
- Added transcript-only impact tiers, micro-hitstop, HP damage trails, visible
  arena shrink, sudden-fight callouts, optional synthesized cues with mute, and
  reduced-motion fallbacks; none can affect the authoritative result.
- Rebuilt the continuous fight as a distinct live Inkcast arena rather than two
  turn-like podiums: a deterministic torn page, clipping-safe 220px drawings,
  edge-only brush motion, angled numeric-HP panels, an authoritative compact
  clock, explicit OUTCOME LOCKED copy, a high-contrast lower third, positional
  overlap depth, and separated post-fight actions. Playback can run at 4×, but
  the result ceremony always returns to normal presentation speed.
- Added deterministic, power-specific Inkcast play-by-play for existing battle
  moments. The content bank varies by battle and fact but cannot add events,
  change their order, or affect the authoritative result.
- Added a pure Inkcast editorial queue: one strongest line per simulation tick,
  900ms wall-clock dwell, and two pending beats. It remains bounded at 4×, clears
  on Skip/finish, and suppresses Colorburst's premature miss claim while its echo
  can still connect.
- Added a deterministic Inkcast Recap derived only from the validated battle
  transcript: exact finish reason, final HP, damage, signature, and actual
  decisive splat. KO, double-KO, and timeout poses now tell different truths,
  and inconsistent top-level winner/fighter data or impossible terminal finish
  reasons are rejected before storage or replay.
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
- Promoted the existing daily boss fight into a truthful Champion Contract with
  server-projected completion state, founder/community voice, exact signature,
  conditional +2 XP, a paper challenger picker, and a noninteractive used stamp.
  The mock now enforces the same one-attempt and win/loss/XP behavior.
- Added a server-authoritative Four-Power Practice Lab after the daily drawing
  locks. It re-analyzes throwaway PNGs, returns a required continuous transcript,
  tracks only unique powers in the browser session, and cannot grant rewards,
  enter progression, expose Belief actions, upload media, or reach battle storage.
  The first 4/4 completion now receives one gold payoff without becoming a farm.
- Added the battle ceremony, first-session exhibition, and living-paper
  interface, then simplified the theater to one server-authored combat model.
- Added real Reddit post scheduling and idempotent result comments.
- Made transparent and legacy paper-backed PNGs produce identical
  server-authoritative stats, with automated parity coverage.
- Added report/hide, owner removal, full player-data deletion, Reddit-only
  media hosting, and safety disclosure in the in-game Field Guide.
- Added a visible play streak and a persistent nightly-resolution outbox so
  retries cannot resolve the same Rumble twice.
- Added a clear return receipt for overnight scouting results, truthful
  server-priced capsules, and a paper-native matchup ceremony.
- Added paginated recent battle rendering and server-cursor Legend Gallery
  pagination so players can browse beyond the first 50 entries without silent
  truncation.
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
