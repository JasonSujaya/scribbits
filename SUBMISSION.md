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

Scribbits live for three days. A crown or enough community Belief saves one in
the permanent Hall of Legends. Phaser 4.2 maps the actual submitted PNG onto a
25-vertex Inkbody mesh. The analyzed shape controls how it breathes and which
named Shape Power it performs, so the drawing determines both numbers and motion.

## Judging story

- **Delightful UX:** feed card identifies the next action; new players start on
  the canvas; live stat feedback explains every stroke; the first submission
  immediately fights; returning players get a clear overnight scouting receipt.
- **Polish:** portrait layout, paper visual identity, responsive controls,
  deterministic simulation, error states, mobile-safe navigation, UGC
  report/delete controls, and a full verification gate.
- **Reddit-y:** real Reddit identity, player drawings, daily custom posts,
  Belief, Back/Clout competition, and app-authored result comments using actual
  Rumble data.
- **Hook-y:** one daily drawing, a locked prediction, overnight anticipation,
  a visible daily streak, permanent Scout Clout, a three-day life-or-Legend arc,
  and an earned-only capsule collection with daily discount, collector rank,
  permanent discovery, and transparent Epic pity.
- **Phaser:** WebGL uses Phaser 4.2's new Mesh2D system to deform 25 textured
  vertices from the player's exact PNG. Chonk, Spike, Zip, or Charm selects a
  distinct silhouette move; impacts travel through the mesh, KO folds it, and
  Canvas keeps a 3x3 slice fallback. Replay timing, particles, camera shake,
  slow motion, cheering, and controls remain Phaser-native.
- **Server-authored spectacle:** a deterministic 20 Hz simulation fixes the
  result and stores a bounded transcript. Phaser interpolates it as continuous
  15–25 second action without WebSockets or client combat authority.

## 60-second demo

1. **0–6s:** Show the Scribbits Reddit feed card: “Its shape becomes its stats.”
2. **6–20s:** Draw a pointed, colorful creature; show Chonk/Spike/Zip/Charm
   moving and NIB HALO becoming its live Shape Power.
3. **20–29s:** Name and submit it; capture the PNG unfolding from an ink blot
   and the “SHAPE POWER” label in the “IT'S ALIVE” reveal.
4. **29–42s:** Show that exact Mesh2D drawing bouncing continuously around the
   arena, performing its named power, taking visible damage, and folding on KO.
5. **42–51s:** Back another player’s contender and show the Rumble countdown.
6. **51–60s:** Show the next-day Champion, Clout payout, Legend Gallery, and the
   result comment in the Reddit thread.

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
- Replaced turn-like battle playback with a server-precomputed 20 Hz transcript:
  continuous wall movement, collisions, HP checkpoints, four persistent Shape
  Powers, element payloads, arena pressure, and bounded 15–25 second pacing.
- Added slot-swapped archetype balance, slot-neutrality, determinism, payload,
  entity-cap, checkpoint-cap, and transcript-cap regression gates.
- Separated authoritative base drawings from decorated display PNGs so equipped
  accessories stay cosmetic and cannot alter combat analysis.
- Promoted Mystery Ink into a visible return loop: daily action progress toward
  a discounted capsule, permanent collection discovery, collector ranks, and a
  truthful guaranteed-Epic countdown—all cosmetic, with no paid power.
- Added daily Back predictions, Clout payouts, three-day lifecycle, Belief, and
  Legends.
- Added Phaser 4.2 Mesh2D Inkbody fighters: 25-vertex submitted-PNG deformation,
  deterministic stat-driven Shape Powers, impact ripples, birth unfolding, KO
  folding, and a Canvas-safe 3x3 fallback.
- Added the battle ceremony, weather, cheer meter, first-session exhibition,
  and the living-paper interface.
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
- Hardened mobile play with larger draw targets, keyboard submission, safe-area
  handling, landscape suspension, input realignment, reduced-motion support,
  bounded drawing textures, and a 10-step memory-safe undo stack.
- Added deterministic simulations, mock first-player QA, deployment automation,
  and the submission proof workflow.
