## Scribbits Arena

Scribbits Arena is a Devvit Web + Phaser game for Reddit. Players draw a
512x512 creature, the server derives stats from the PNG, and living Scribbits
enter daily community rumbles. The app identity is `scribbits` in
`package.json` and `devvit.json`.

All main scenes share `lib/appdock.ts`, the generated Craftbox paper stage, the
same five optical-weight code-native navigation icons, and one GPT-generated
hand-cut button family for primary, secondary, Pick, close, and pagination
actions. The dock is Arena, Bag, Draw, Battles, and Shop. It uses a flat
contained active tile, readable labels, and no
micro-badges or protruding cutout. DynaPuff 400/700 is
bundled locally through Fontsource and loaded before Phaser renders text. Shared
heart, clock, Ink, sparkle, and element marks live in `lib/papericons.ts`; scene
copy should keep the default view to one headline, one status, and one action.

Player-facing copy uses the typed catalog and locale runtime documented in
[`docs/localization.md`](docs/localization.md). New UI copy belongs in the
English source catalog and renders through `translate`; `?locale=en-XA` enables
the clipping-focused pseudo-locale.

## Mobile performance

- `lib/theme.ts` disables ambient-only loops on compact, reduced-motion, or
  detected low-power devices; combat motion and authoritative replay timing stay
  enabled.
- `workers/analyzer.worker.ts` runs exact shared analyzer math off the UI thread.
  `drawcanvas.ts` caches pointer bounds for each stroke and pools canvas-based
  undo snapshots instead of allocating 1 MiB pixel arrays per stroke.
- `lib/scribbits.ts` downsamples display textures to a 256px longest edge and
  keeps at most 12 inactive drawing textures. Submitted PNGs remain unchanged.
- Replay caches unchanged HP/clock labels and bounds presentation-only arena
  redraws plus Inkbody deformation to 30 Hz; fighter movement and transcript
  progression remain continuous and server-authored.

## How to play

1. **Draw:** one Scribbit per UTC day. A validated, versioned calendar supplies
   122 shared community themes covering 366 Arena days, with one theme staying
   consistent for each three-day block. New seasons append without moving
   published days, while Practice keeps its separate Shape Power prompts. The Draw screen gives the hero
   canvas most of the page, keeps all eight base colors visible, and puts brush,
   eraser, undo, optional stickers, and unlocked premium pens in one compact tool
   row. One visible `NEXT` action stays disabled until the shared analyzer says
   the drawing is ready; optional paints, brushes, stickers, Clear, and Redo sit
   behind one Tools icon, with a persistent badge when a special supply is
   active. Only then does a focused preview ask for its name and
   confirmation. Exact shape rules stay out of a visible four-stat dashboard. The four analyzed traits still
   normalize to the same 100-point budget, and dominant color still chooses the
   element. After acceptance, `lib/birthceremony.ts` loads that exact submitted
   PNG and unfolds it through `LiveSprite.awaken()`—there is no placeholder egg.
   The final card replaces raw stat totals with one causal receipt such as
   `SHARP EDGES → FIRETIP HALO` / `3 ROTATING QUILLS`, shows one Ink receipt,
   and leads directly to `START FIRST FIGHT`.
2. **Fight:** submission automatically enters tonight's Rumble. A new player's
   exact Scribbit immediately fights one simple server-selected founding NPC so
   the core promise is visible before Arena choices. On WebGL, Phaser 4.2 maps the submitted PNG to
   a 25-vertex **Inkbody** mesh. Its dominant drawing stat selects a visible
   Shape Power: INKQUAKE, NIB HALO, SMEARSTEP, or COLORBURST. The server runs a
   deterministic 20 Hz simulation and stores its winner, bounded timeline, and
   half-second motion checkpoints. Phaser interpolates that immutable transcript
   into a continuous arena fight without WebSockets or client-side authority. A
   fight always ends by 20 seconds; at 15 seconds, Sudden Scribble halves power
   cooldowns while the page completes its inward fold.
   There is no turn-based player path or outcome-changing cheer input;
   transcript-less records render as archived-result summaries.
   The real-time paper arena uses one clipping-safe movement field and 280px
   drawings across ten server-selected stage skins. Local element washes, a
   truthful closing boundary, and transcript-triggered color surges leave the
   combat center readable. The compact HUD keeps one arena label, names, visual
   health bars, a small fixed-tick clock, and large sound/speed/Skip icons; Shape
   Power state appears only while it changes. Real transcript moments appear in a transient paper margin
   instead of a permanent broadcast lower third. A
   presentation-only editorial queue chooses the
   strongest candidate per simulation tick, holds each displayed line for 900ms
   of wall-clock time, and keeps at most two pending beats. It never delays HP,
   Skip, finish, or any other authoritative state.
   The copy itself lives in a versioned shared pack: 104 globally unique lines
   across 25 fact-specific banks. A replay-scoped author deterministically
   exhausts each authored bank before reuse, while strict token, rendered-length,
   global uniqueness, and fact-specific truth validators fail fast on unsafe
   content. The typed authoring layer gives Colorburst no finish-time miss bank
   because its delayed echo may still connect.
   Presentation-only hitstop, HP trails, impact tiers, arena folds, mastery auras,
   and optional procedural sound make authored events land harder.
   Element × Shape Power combinations receive sixteen concise signature names.
   Before every current fight, a mode-specific paper VS card keeps one match or
   Rival-page title, optional story stakes, large fighter art, and two concise
   drawing receipts such as `MORE COLORS → CONE + DELAYED ECHO`. The shared
   receipt plan is derived only from each server-returned fighter and never
   predicts the winner. During
   replay, a power with no proven connection gets neutral no-clean-hit copy;
   shield and element cues appear only when the transcript explicitly proves them.
   Colorburst does not claim a miss at `ability_finished`, because its delayed
   echo can still connect after that event.
   The finish is equally transcript-driven: a compact Inkcast Recap says
   `YOU WON`, `YOU LOST`, or names the spectator winner before the exact verdict,
   duration, final HP, and one Shape-Power lesson such as
   `FINAL SPLAT · THUNDERFOLD · 25 DAMAGE`. Each server-selected arena also has
   one small transcript-scored goal; Replay shows its exact cleared or progress
   state in a dedicated target stamp above the recap without granting a second
   reward or recalculating it in the client. Arena reveals the canonical venue
   name and daily goal before fighter and rival selection, while one info icon
   owns the short venue rule. This replaces the generic `CHOOSE FIGHTER` box
   instead of adding another dashboard. Owned exhibitions promote `CHOOSE A RIVAL` to one
   primary action beside one compact return. When no Rival draft is available,
   tonight's pick becomes the primary; Practice remains reachable from Arena
   instead of competing with the result. Knockouts fold only
   the loser, double knockouts fold both fighters, and time decisions leave both
   standing behind the result card.
   Founding NPCs use deterministic stat-shaped mascot art rather than missing
   bitmap assets; ordinary player-image failures still receive a neutral fallback.
   A frozen shared catalog gives all twenty founders eight unique, bounded story
   strings. Their epithet appears in the compact Rival margin, their opening owns
   the existing pre-`FIGHT!` ticker beat, and their first power and result receive a
   fact-safe reaction, and a founding Rumble champion carries its voice into the
   Reddit result comment. None of this content enters the transcript or combat math.
   Before every Arena Spar—and again after each Rival Run bout—a compact paper
   board offers three server-selected founders. Arena and Replay share that
   controller; birth deliberately uses the server's opponent-less quick spar
   for one simple random first fight. The slate is stable for the UTC day and prioritizes
   close levels and distinct Shape Powers. Each compact card shows drawing,
   element, level, risk, points, a paper info control, and an icon-led SPAR action;
   signature, level comparison, and forecast move behind the info tap. The slate
   response carries its authoritative day
   and forecast so a Replay left open across UTC rollover cannot advertise stale
   matchup or Rival-page rules. A
   chosen `opponentId` is accepted only when it still belongs to that exact
   server-authored slate. An omitted opponent is reserved for the immediate
   post-birth fight.
   Every card remains immediately sparable after today's story beat: the card
   says when its next Rival page unlocks while starting a reward-capped
   exhibition now. This keeps combat replayable without bypassing the server's
   one-story-beat-per-day or one-spar-reward-per-day rules.
   Chosen-rival fights form a server-authored three-bout Rival Run. Each fresh
   bout receives one relative `SAFE +1`, `EVEN +2`, and `BOLD +3` option ranked
   from five deterministic projections through the real combat engine, so level,
   forecast, stats, elements, and Shape Powers all affect risk. Wins add the displayed run points;
   losses add zero but still advance the bout, and fought opponents leave later
   slates so each run changes shape. The committed score and record
   carry through Draft, VS, live HUD, result, and archived replay receipts. A
   completed run explicitly offers `NEW RIVAL RUN`; run score grants no Ink, XP,
   combat power, or extra Founder Chronicle beat. `SIGNATURE INK` is the first
   Technique Trial: it asks for three Shape Power activations and advances only
   from the player fighter's immutable `ability_activated` report events. It
   reuses the challenge strip and result stamp instead of adding another screen.
   Each player can have exactly one active Founder Rival Thread: first to two,
   maximum three qualifying battles, and no more than one authoritative story
   beat per Arena day. The active founder remains pinned across future drafts; a
   Champion Contract advances the same thread only when that founder
   is the Champion. Unrelated founders are exhibitions. A completed series
   becomes a permanent signed margin note with no Ink, stat, or checklist reward.
   Qualifying ceremonies expose only truthful pre-fight stakes—new thread, match
   point, or deciding bout—and the live rail labels the replay RIVAL BOUT or RIVAL
   DECIDER without leaking the stored winner. Pending report receipts repair in
   Arena-day order; retired checklist encounters migrate as archive-only history.
   All twenty founders also have a repo-authored three-page episode: 60 unique
   page titles, 60 founder-specific pre-fight cues, and 120 unique post-bout
   result lines. The current page is derived from the server score and reused by
   Next Goal, Rival Draft, the compact Rival margin, and the VS ceremony. Replay binds
   its result line to the validated transcript winner and server-confirmed
   Chronicle beat.
   Validation bans pre-fight outcome claims and any invented economy reward. No
   episode data is written to Redis.
   The Battles tab is a recent Battle Scrapbook over the newest 20 stored reports,
   not lifetime history. It keeps expired Scribbits in the correct MY WIN/MY LOSS
   perspective through their normalized Reddit artist identity, pins Rumble and
   Champion pages within each day, and keeps matchup, finish, and day on each
   compact row. Each visual row contains only two portraits, one matchup, one
   result line, and a planner-owned code-native `REPLAY` or `VIEW RESULT` action;
   native row and pagination controls retain full labels outside the canvas.
   Replay exposes the exact verdict, duration, and final HP. Old
   result-only records say that motion is unavailable instead of rebuilding it.
   Replay returns to the same Scrapbook page; this view adds no storage, reward,
   or combat authority. Saved motion from the Scrapbook, Scout, or overnight
   receipt opens with one compact portrait matchup ticket. Its result exposes an
   icon-led `REPLAY` utility that restarts the same registry-held transcript with
   no fetch or reward path; only a session watch pass changes, rotating safe
   Inkcast variants while authoritative facts and founder lines stay fixed.
   After today's official Scribbit locks, the Arena also exposes a Four-Power
   Practice Lab. It reuses the analyzer and continuous replay, but not the birth,
   roster, reward, Rumble, history, or Legacy paths. The server alone derives
   the temporary fighter and transcript; the browser keeps only a session
   checklist and clears it when Practice ends. The first fourth-power discovery
   receives a gold 4/4 completion beat; later repeats do not retrigger it. Once
   the checklist is complete, target powers and prompt cards rotate through all
   four drawing identities instead of repeating one encore.
   The current Champion also owns one daily Champion Contract. The Arena projects
   the server's existing daily challenge flag, displays founder or Shape-Power
   identity, and replaces the live CTA with a noninteractive completion stamp
   after use. Its paper-native challenger picker exposes every candidate's level,
   element, and signature; a win grants +2 XP, while a loss grants no XP or Ink.
   Draw also offers an explicit untimed Free Draw path. It reuses the full
   canvas and supplies, saves through `/api/free-drawing`, and stays outside
   Scribbit birth, Rumble entry, rewards, battles, and Legacy. Returning to Draw
   on the same Arena day shows the saved image, name, and one Practice action.
3. **Collect:** drawing, care, and the first spar win fill the Daily Ink Trail.
   Care uses a validated 72-line deck across four Shape Powers, three actions,
   three life days, and two variants. Every Scribbit receives nine distinct
   lifetime care moments, rendered as a mobile paper receipt with its drawing,
   mood, checklist, exact XP delta, and only server-confirmed Ink. Roster cards
   keep only `CARE` and `SPAR`; CARE opens one icon-led Feed/Pat/Train sheet with
   honest DONE states, full mobile targets, drag-safe activation, and a receipt
   that stays focused until keyboard dismissal. The five dock tabs mirror native
   labels and active-page state without covering their canvas artwork.
   Shop opens earned-only Mystery Ink Chests for a flat 5 Ink each, with
   one-open and maximum ten-open actions, permanent discovery, and visible Epic
   pity by open ten. The first completed Rival Run replaces the repeat action
   with one `FIRST GEAR` trail: Arena asks only for the remaining daily Care,
   Shop removes batch and collector clutter, and the first pull is guaranteed
   to be equippable Gear without changing rarity odds. Its reveal opens Bag on
   the exact equipment category. There is no 100-open or auto-repeat action. Birth
   stickers and status rewards are cosmetic; pens are expressive sidegrades that can
   change the normalized build split without adding stat points. Bag
   centers one selected living Scribbit inside eight persistent equipment
   slots: two each for weapon, armor, shoes, and accessory. Tapping discovered
   Gear fills an open matching slot; a full category requires an explicit remove
   before replacement. Gear discovery is reusable across living Scribbits,
   while duplicate copies remain Forge material. Earned reusable Gear resolves
   into at most one bounded Exhibition technique per category, with its exact
   forged-rank effect snapshotted into the deterministic report; permanent pens
   and titles stay in a separate Styles section.
   The 36-item catalog includes eight wearable Shape Power Relics—two per
   power—with no combat hooks.
   Living Scribbits also grow from level 1 to 5, but the full arc adds only 1.5%
   damage and is statistically capped at a 60% equal-build win rate.
4. **Pick:** choose another player’s contender before the nightly resolution.
   Champion backers earn 3 Clout; runner-up backers earn 1.
   Pick entry is the compact `RUMBLE` action in Arena, below the visible
   Scribbit-versus-Champion/Spar matchup and its single `CHOOSE A RIVAL` action.
   It opens the focused eight-contender picker without
   adding a prediction panel to the default stack. Each contender keeps one
   inspect target and one server-planned heart or lock state, and the selected
   card turns gold.
   If the player skipped their Pick but entered an owned Scribbit, the next visit leads
   with that drawing's exact Rumble W/L, committed XP, committed Ink, and a
   server-selected last-bout replay. The client never reconstructs those rewards
   from cumulative totals.
5. **Navigate:** the persistent dock is Arena, Bag, Draw, Battles, and Shop.
   Shop owns earned-Ink Mystery Ink Chests. Bag owns inventory, equipment,
   pens, and titles. Gallery owns community Legends and personal Legacy Cards
   outside the primary dock and opens from the top-right Settings menu. The Scout Notebook is also outside the primary
   dock; its scene remains temporarily for older saved-replay returns.
6. **Return:** keep the visible UTC-day streak alive. The scheduler resolves
   the Rumble, crowns the Champion, stores the picked Scribbit's last played
   bout, creates the next Rumble post, and comments the real result on the
   resolved post. New archived pages lead into the scouting receipt, its
   server-selected replay, and then the Legacy Book.
7. **Become a Legend:** Scribbits live for three days. Winning a crown or
   reaching the Belief threshold preserves one in the public Gallery. Every
   completed Scribbit also becomes an immutable card in its creator's private,
   paginated Legacy Book. Gallery keeps Legends and Legacy behind two full-size
   trophy/book tabs with native keyboard navigation. The
   six-card Hall uses drawing-first cards, generated trophy/heart status, and one
   info-led `VIEW`. Every Gallery card and page control has a native keyboard
   target; described detail dialogs trap focus, isolate background actions, and
   return focus to the opening card.

The game is designed for a short Reddit-feed visit: a lightweight inline card
shows today's forecast and the player's next action, while Phaser loads only in
expanded mode.

## Data and safety

Scribbits stores Reddit identity for attribution and the drawings, battle
history, inventory, streak, and scores required by the game. Drawings are
uploaded through Reddit media hosting; submissions fail closed if that upload
fails. The server analyzes an authoritative base PNG, rejects drawings below the
shared minimum-body threshold, and rejects decorated PNGs that change pixels
outside declared accessory regions or erase base pixels.
After media upload, every Redis/player-state effect of Scribbit birth commits in
one transaction. A failed Redis transaction leaves no partial player state; an
ambiguous commit is recovered from the exact Scribbit and index identity. Media
hosting remains external, so a failed post-upload transaction may leave an
unreferenced hosted asset but cannot spend inventory or award progression.
Nightly resolution watches the per-day active-submission registry and cannot
snapshot a Rumble while a committed birth is still being verified or repaired.
Its distributed day claim carries the scheduler's unique operation ID, recovers
an EXEC reply loss by exact readback, fails closed on command errors, and can be
released only by that exact owner.
Practice drawings are returned only inside one ephemeral replay. They are not
uploaded or stored, and the battle store rejects a practice report before its
first Redis operation. The route caps request bytes and uses short-lived Redis
guards for per-user concurrency and request rate; those guards contain no game
progression data.
Every community Scribbit card has a **Report** action. Owners have a
two-step **Delete** action, and the Field Guide includes a two-step option to
delete all stored game data.

## Architecture

In production, the Reddit WebView calls `/api/*` on Reddit's hosted Devvit Node
server. Those stateless requests run the authoritative domain code and persist
installation-scoped state in managed Redis. A battle request computes and
stores the complete result before returning its transcript; Phaser only replays
it. Practice is the explicit exception: `/api/practice-battle` computes the same
authoritative transcript but returns it without media upload, rewards, or battle
persistence. The local `dev-mock.mjs` process substitutes for that hosted
boundary during browser iteration—it is not the production game server.

- `src/shared/arena.ts`: client/server contract and gameplay constants.
- `src/shared/sparreward.ts`: versioned, runtime-validated Spar payout receipt;
  its exact XP/level/Ink transition is persisted inside the existing atomic
  daily-win claim and remains separate from the immutable battle report.
- `src/shared/analyzer-core.ts`: deterministic PNG analyzer used by both sides.
- `src/shared/cosmetics.ts`: authoritative 36-item reward catalog shared by the
  server, client inventory tools, and Gallery Collection.
- `src/shared/equipment.ts`: four equipment categories, two-slot capacity, empty
  loadouts, cloning, validation, and the shared equip/move/unequip projection.
- `src/shared/founders.ts`: one immutable source for all twenty founding Scribbit
  definitions and 160 validated story strings; clients look up presentation by
  the existing `founding-*` ID without adding report or Redis fields.
- `src/shared/content/deterministic.ts`: one stable content hash used by authored
  schedules without consuming or perturbing combat randomness.
- `src/shared/content/carereactions.ts`: validated 72-line care deck covering
  Shape Power, action, three-day lifespan, and two stable per-Scribbit variants.
- `src/shared/content/communitydrawthemes.ts`: append-only official Draw seasons
  with 122 unique themes covering 366 Arena days in stable three-day blocks.
- `src/shared/content/doodledares.ts`: separate validated 32-prompt/eight-twist
  Practice catalog; deterministic selection stores no player state.
- `src/shared/content/forecastblurbs.ts`: validated 32-day public-copy rotation
  used by production forecast generation and the browser mock without consuming
  combat-element randomness.
- `src/shared/content/founderrivalepisodes.ts`: immutable three-page arcs for all
  twenty founders, with fail-fast completeness, order, uniqueness, length,
  founder-name, pre-fight fact-safety, and post-bout reward-safety validation.
  Runtime page/result selection is a pure lookup from founder ID, authoritative
  bout number, and proven latest winner.
- `src/shared/content/scoutnotes.ts`: 48 immutable, validated status-specific
  Scout Notebook notes with deterministic seven-day no-repeat selection.
- `src/shared/scoutnotebook.ts`: strict immutable projection for the bounded
  seven-page DTO, including contiguous days, exact payout/status invariants,
  valid forecasts/builds, and replay privacy requirements.
- `src/shared/combat`: deterministic fixed-tick combat domain, balance tuning,
  transcript contract, and regression tests.
- `src/shared/progression.ts`: dependency-leaf level thresholds, level lookup,
  and Ink Mod acquisition limits shared by client, server, and combat.
- `src/shared/arena.ts`: shared API and stored-state shapes plus the single
  full-record Scribbit deep-copy policy used by storage, combat, Rumble,
  founders, and the localhost mock.
- `src/shared/combat/upgrades.ts`: the versioned Ink Mod catalog, deterministic
  acquisition, and strict stored-state parsing. Only absent pre-feature data is
  migrated; malformed present arrays fail closed. Every authored mod crosses the
  fixed-tick engine's integer resolution, and Scribbit details reuse the exact
  catalog description instead of showing an unexplained upgrade name.
- `src/shared/combat/selection.ts`: the single dominant-stat and Shape Power
  selector shared by server simulation, birth receipts, Inkbody, and founder art.
- `src/shared/combat/shapepowercontent.ts`: shared names, reveal copy, neutral
  no-clean-hit cues, and the sixteen element-specific signature identities;
  combat numbers remain isolated in `config.ts`.
- `src/shared/combat/elementcontent.ts`: canonical player-facing descriptions of
  Ember afterburn, Tide shove, Moss barrier, and Storm windup. The Field Guide
  consumes this instead of maintaining the retired element triangle.
- `src/shared/combat/resultvalidation.ts`: one KO/double-KO/timeout
  terminal-state gate consumed by the full transcript parser.
- `src/shared/combat/transcriptvalidation.ts`: the one browser-safe, version-aware
  runtime parser for transcript fighters, events, checkpoints, and results. Both
  storage and Replay fail closed through it.
- `src/shared/legacycards.ts`: the browser-safe Legacy Card projection, cursor,
  ordering, page-limit, return-preview, and seen-day policy shared by production
  and the localhost mock.
- `src/server/index.ts`: Hono server entry point.
- `src/server/routes/api.ts`: REST API mounted at `/api`.
- `src/server/core`: Redis-backed domain logic for arena days, Scribbits, ink,
  clout, battles, forecasts, daily jobs, and Reddit result comments.
- `src/server/core/legacy.ts`: personal Legacy Redis indexing, migration, bounded
  index scans, and one-time receipt persistence over immutable retired snapshots.
- `src/server/core/scribbit.ts`: Scribbit lifecycle and ownership plus the atomic
  per-Scribbit Gear equip mutation. It accepts permanent discovery—including
  zero-copy forged unlocks—rejects retired/founding targets, and recovers an
  ambiguous transaction reply by exact readback.
- `src/server/core/battleStore.ts`: battle reports, per-Scribbit history, and
  the ordered featured Rumble report index used by overnight receipts.
- `src/server/core/submission.ts`: the single Redis transaction owner for
  Scribbit birth. It validates watched daily, roster, inventory, and streak
  state, then atomically commits the Scribbit and indexes, Rumble entry, daily
  flags, Ink, streak, and accessory spend. Exact readback reconciles an
  ambiguous transaction reply or per-command error without duplicate rewards
  or consumption. A short per-day active-submission lease makes nightly
  resolution wait until any exact repair finishes; concurrent births keep
  separate lease members instead of sharing a global mutex.
- `src/server/core/founderChronicle.ts`: versioned player-level Rival Thread
  state, the one-beat-per-day reducer, pending projection receipts, transaction
  recovery, v1 checklist migration, and the bounded public Chronicle projection.
  After an ambiguous commit, an immediate episode beat is recovered only when
  the reloaded public state exactly matches its projection and the current report
  is the latest durable report in that thread.
- `src/server/core/practice.ts`: strict PNG-to-ephemeral-replay domain with no
  durable gameplay/replay persistence, media, reward, Rumble, or lifecycle
  dependency. Redis request leases, migration guards, and rate keys protect the
  endpoint without turning Practice into progression state.
- `src/server/core/scoutNotebook.ts`: bounded best-effort assembly over existing
  eight-day Pick records, payout receipts, forecasts, lifetime Clout, and
  30-day featured reports. It never reads `champion:current` for historical
  identity; it may ensure the existing deterministic forecast records but adds
  no Scout-specific persistence.
- `src/server/core/species.ts`: projects the shared founder definitions into
  runtime Scribbits and owns fair opponent/slate selection and safe cloning.
- `src/client/game.ts`: Phaser bootstrapping.
- `src/client/scenes`: game screens.
- `src/client/lib/caremoment.ts`: pure server-snapshot-to-receipt planning;
  `caremomentoverlay.ts` renders the short paper celebration without owning
  rewards or persistence.
- `src/client/lib/carepicker.ts`: focused paper Feed/Pat/Train choice sheet with
  shared icon buttons, completion states, native controls, and bounded cleanup.
- `src/client/lib/inkmesh.ts`: deterministic Mesh2D geometry and stat-driven
  motion rules, kept pure for regression testing.
- `src/client/lib/continuousreplay.ts`: report-to-transcript identity binding and
  checkpoint interpolation used by the live-looking replay.
- `src/client/lib/battlepresentation.ts`: pure impact, real-time paper-arena
  layout, non-overlapping outcome stack, HP, clock, shrinking-arena, and visible
  mastery plans derived from authoritative data.
- `src/client/lib/overlay.ts`: design-space DOM alignment plus the shared native
  action adapter; `replaypostfightactions.ts`, `replaypracticeoutcome.ts`, and
  `replaysparrivaldraft.ts` keep canvas presentation while exposing matching
  focusable controls and restoring the correct layer after Rival Run errors or
  close.
- `src/client/lib/battlerecap.ts`: pure transcript-to-recap copy and finish
  semantics; `replaybattlerecap.ts` renders that plan without inferring results.
- `src/client/lib/battlejournal.ts`: pure recent-report ordering, historical
  ownership, win/loss/watch perspective, finish, highlight, and summary planning
  for the Battle Scrapbook. It reuses transcript validation and never reconstructs
  archived motion or owns persistence.
- `src/client/lib/savedreplayintro.ts`: sub-second, reduced-motion-safe matchup
  ticket for saved reports; `registry.ts` owns the local saved/fresh mode and
  watch pass, while `replaypostfightactions.ts` owns the replay-again utility.
- `src/client/lib/scoutnotebook.ts`: pure page/summary planning from server
  statuses and payouts; `scenes/ScoutNotebook.ts` renders the paper notebook,
  day tabs, drawing snapshots, and same-day Replay return without deriving wins.
- `src/client/lib/replaybattlebackground.ts`: ten deterministic stage skins,
  including the dedicated Sticker Stadium art, with reduced-motion-safe ambience
  and transcript-triggered power surges; `replaybattlehud.ts` owns names, visual
  health bars, the arena caption, clock, icon controls, and transient commentary.
- `src/client/lib/matchupbrief.ts`: pure mode-title, exact-signature, and
  exhaustive ten-pair Shape Power mechanics planning with no winner prediction;
  `battleceremony.ts` renders the plan before every current battle path.
- `src/shared/content/replaycommentary.ts`: immutable v1 Inkcast content pack,
  stable line IDs, 25 per-fact token contracts, strict shared parser/renderer,
  truth validation, and deterministic bank permutations for all 104 lines.
  Treat v1 IDs, templates, and ordering as immutable; before a v2 pack ships,
  bind its version to stored reports or explicitly accept historical copy drift.
- `src/client/lib/replaycommentary.ts`: replay-scoped transcript-fact-to-copy
  authoring with bank-local occurrence state plus founder voice projection into
  existing replay beats; it cannot schedule events or change combat state.
- `src/client/lib/inkcastqueue.ts`: pure priority, same-tick selection, dwell, and
  two-item pending rules for readable Inkcast cadence at every playback speed.
- `src/client/lib/championchallenge.ts`: pure founder/community Champion
  Contract identity and truthful open/completed copy; the server still owns daily
  use and XP.
- `src/client/lib/sparrivals.ts`: pure rival-card truth planning from server
  Scribbits, forecast, prior-bout recap, and Founder Chronicle state;
  `replaysparrivaldraft.ts` owns the Phaser draft layout.
- `src/client/lib/rivalrunflow.ts`: the one player-facing controller for slate
  fetch, day rollover, chooser lifecycle, selected-rival Spar, report staging,
  and VS ceremony. Arena, Draw, and Replay provide only their return/focus hooks.
- `src/client/lib/replayreward.ts`: compact XP/Ink and level-up copy from the
  fresh server receipt; `replaypostfighteligibility.ts` keeps saved history from
  offering live Rival or Rumble-pick actions.
- `src/client/lib/founderchronicle.ts`: pure active-thread, daily availability,
  score, beat, pre-fight stakes, and transcript-winner-bound result receipt
  planning; `founderchroniclemargin.ts` renders the compact paper overlay.
- `src/client/lib/practicelab.ts`: pure four-power session reducer,
  attempt-aware target/prompt rotation, Practice copy, and one-time 4/4
  completion plan; `registry.ts` owns the session lifetime.
- `src/client/lib/replaypracticeoutcome.ts`: reward-free Practice outcome actions
  and repeat-safe completion rendering; ephemeral fighter cards never expose
  profile or Belief mutations.
- `src/client/lib/proceduraldoodleplan.ts`: pure deterministic stat-to-silhouette
  geometry for founding mascots, rendered by `proceduraldoodleart.ts`.
- `src/client/lib/battlesound.ts`: optional low-volume procedural battle cues
  with mute and fail-closed WebView audio behavior.
- `src/client/lib/shapepowerpresentation.ts`: transcript-driven Inkquake, Nib
  Halo, Smearstep, and Colorburst presentation plans.
- `src/client/lib/shapepowerrelicart.ts`: vector painters for the eight cosmetic
  Shape Power Relics, joined into the normal accessory renderer.
- `src/client/lib/cosmeticpreview.ts`: shared reward-art preview used by the
  chest ceremony and Bag.
- `src/client/lib/capsulepresentation.ts`: pure collector-rank, ownership-copy,
  batch-price, batch-summary, and portrait-safe prize-action plans. The Mystery
  Ink Shop shows honest odds, matched generated closed/open chest art, a generated
  Ink token on the wallet and exact `×1`/`×10` costs, a paid-order ten-reward
  reveal grid, one compact progress card, and a disabled Reddit Gold Styles preview over a generated
  scrapbook stage; its one player-facing entry lives in `src/client/scenes/Shop.ts`.
  Those four Shop-only textures preload with the Shop scene rather than consuming
  initial game-load decode and texture memory.
- `src/client/lib/appmenu.ts`: shared top-right Settings menu for secondary
  Gallery and Field Guide destinations without consuming a primary dock slot.
- `src/client/lib/arenaasynclifecycle.ts`: pure latest-response policy for Arena
  mutations and refreshes. Responses from a stopped or replaced scene can only
  apply to the current activation or schedule a current/next-entry refresh.
- `src/client/lib/collectionbook.ts`: Archero-inspired Bag with a large staged
  living Scribbit, eight persistent equipment slots, filters below the stage,
  icon-only inventory tiles, tap-for-details Equip/Forge actions, explicit
  removal/full-category feedback, and separate Styles inventory.
- `src/client/lib/cosmeticpreviewfit.ts`: pure bounds-fitting plan that centers
  differently shaped Gear art inside the Bag's fixed item and slot safe boxes.
- `src/client/lib/bagrarity.ts`: one high-contrast common/Rare/Epic border
  system shared by Bag inventory tiles and equipped slots.
- `src/client/lib/baginventorygrid.ts`: one masked, bounded inventory tray whose
  native scroll surface provides touch inertia, wheel and keyboard access while
  keeping the Phaser item grid and scrollbar synchronized.
- `src/client/lib/legacycards.ts`: paper-native Legacy deck, archival detail,
  finish treatments, pagination controls, and return ceremony.
- `src/client/lib/legacyreturnpresentation.ts`: pure hero priority and bounded
  copy for the compact one-time Legacy return.
- `src/client/lib/livesprite.ts`: Phaser Mesh2D Inkbody renderer with a 3x3
  Canvas fallback.
- `src/client/lib`: Phaser UI, API wrapper, drawing canvas, modals, and effects.
- `scripts/build-mock-combat.mjs`: bundles the production battle facade for the
  local browser server without maintaining a second simulator or spar selector.
- `src/server/core/mockRuntime.ts`: explicit bundle boundary exposing production
  combat and founding-rival selection to the local mock.
- `scripts/mock-battle-factory.mjs`: isolates interactive and deterministic
  browser-fixture seeds around that production facade.
- `scripts/dev-mock.mjs`: local Devvit/Redis stand-in for browser UI iteration.
- `scripts/make-test-drawing.mjs`: four trimmed, dominant-stat fixture drawings
  used to prove each production Shape Power in both renderers.
- `tests/**/*.test.mjs`: discoverable Node test suites for focused domain and
  architecture contracts. Each run compiles production sources into an isolated
  temporary directory and removes it afterward.
- `scripts/test-battle.mjs`: legacy deterministic simulation/core regression
  harness retained while its domains move into focused suites.

## Setup

Use Node 22.2.0 or newer with pnpm 11.7.0.

```bash
pnpm install --frozen-lockfile
```

## Development

```bash
pnpm run dev
```

`pnpm run dev` runs Devvit playtest against the subreddit configured in
`devvit.json`. It requires `devvit login`.

If your agent shell cannot see `node` or `pnpm`, use the repo-level
command instead:

```bash
../playtest.command
```

For local browser iteration without Reddit:

```bash
pnpm run build
pnpm run mock
```

Then open the mock server URL printed by the command.

Agent-safe shortcut:

```bash
../mock.command
```

That shortcut runs a dedicated Vite development server for immediate client
updates and proxies API requests to the local mock backend. Backend bundles are
rebuilt in staging and published only when successful, so the running game keeps
the last-good server code during an invalid save. Running the shortcut again
replaces its previous instance. Open `http://localhost:8902/?fresh` to exercise
the brand-new-player route with an empty roster and no unlocked metagame items.
For deterministic combat proof, use
`/?debug&spar&power=inkquake&element=storm&seed=2`; swap in `nib_halo`,
`smearstep`, or `colorburst`, and add `&canvas` or `&reduce-motion` for those
fallbacks. Debug builds expose `replayPhase`, `replaySpeed`, and
`replayTweenScale` on the game canvas so 4× playback and the result reset can be
verified without touching combat state.
Use `/?debug&spar&rival-thread&reduce-motion&ceremony` for the deterministic Day
9 deciding-bout ceremony, RIVAL DECIDER rail, and signed 2–1 result margin.

## Verification

Run these before handing off changes:

```bash
pnpm verify
```

`pnpm verify` runs type-check, lint, all discoverable Node suites, the legacy
deterministic harness, and the production build.

Use `pnpm run test:suites` for the focused discoverable suites only, or
`pnpm run test:sim` for the legacy harness only. `pnpm test` runs both and is
the default test gate.

`pnpm run test:sim` covers deterministic analyzer, Inkbody mesh geometry, combat
determinism, payload caps, archetype balance, slot neutrality, battle,
storage, daily job, ink, title equip, immutable Legacy snapshots, personal
Legacy paging/receipts, privacy deletion, expiry repair, and Swiss rumble
behavior. It also covers featured Rumble report selection/purge, Next Goal
priority/evidence, production-backed browser battle contracts, mock seed
isolation, four readable fixture silhouettes, shared dominant-stat parity,
stat-shaped founders, Founder Rival Thread pacing/recovery/migration/mock parity,
the ten-power-matchup duration matrix, and the live paper-arena HUD/clock/outcome
layout. It does not
replace route or browser testing. Recap coverage fixes timeout, knockout,
double-knockout, truncated-timeline, tie-break, decisive-hit copy, and report
fighter binding to the validated server transcript. First-draw coverage locks
the 32-day prompt calendar, 256 unique prompt/twist cards, four-day Shape Power
balance, catalog safety, concise causal receipts, the shared minimum-body gate,
and the valid zero-recoil wall-ejection edge case. Forecast coverage locks 32
nonrepeating public blurbs, reward-safe copy, selection independence from
combat-element randomness, and mock parity.
Care coverage locks all 72 unique lifespan reactions, exact matrix completeness,
claim safety, deterministic selection, nine distinct lifetime moments, truthful
server-confirmed Ink, and the fixed-tick element guide with no hidden triangle.
Rival Draft coverage locks slate stability, clone safety, level bounds, Shape
Power variety, truthful level/power/signature/forecast card planning, prior-bout
highlight continuity, and canonical founder identity. Founder coverage locks the
exact twenty-entry server projection, 160 globally unique bounded story strings,
60 unique three-page episode titles, 60 founder-naming episode cues, 120 unique
outcome-bound result lines, deep-frozen content, production/mock parity,
deterministic voice, one active best-of-three, daily anti-farming, report
provenance, pending-receipt repair, pinned matchmaking, derived page continuity
across client surfaces, and signed resolution margins.
Battle Scrapbook coverage locks recent-day ordering, Rumble/Champion priority,
historical ownership after roster expiry, exact transcript facts, honest archived
fallbacks, immutable plans, and bounded copy. Chronicle coverage also rejects a
projected post-bout beat until durable state and the exact latest report prove the
ambiguous commit completed.
Scout Notebook coverage locks all 48 authored lines, six complete frozen banks,
seven-day no-repeat selection, promise/reward-claim rejection, contiguous
immutable pages, exact champion/finalist payouts, historical report identity,
hidden-fighter privacy, existing mock/production boundaries, and pure client
plans. The running 320x568 flow additionally proves drawing load, Day 8 replay,
Skip, and return to the same selected page with no runtime or console errors.
Practice coverage locks strict request fields, PNG validation, server-derived
stats, required transcripts, mock/production parity, art-bound transient IDs,
session de-duplication, truthful one-time 4/4 completion, post-completion
four-power encore rotation, and rejection before the first battle-storage call.
Inkcast coverage locks the exact 25-bank/104-line v1 pack, deep immutability,
globally unique stable IDs and copy, strict per-bank tokens, malformed-brace and
rendered-length rejection, reward/outcome/miss claim safety, deterministic
bank-local exhaustion before reuse, founder-signature bypass, every template's
maximum-input render, fact-bound damage/critical copy, and Colorburst miss
exclusion. Matchup brief
coverage locks all sixteen ordered Shape Power combinations to ten symmetric,
bounded, unique mechanics explanations with exact signatures and no outcome words.
Inkcast queue coverage locks one strongest candidate per tick, first-signature and
critical priority, 900ms wall-clock dwell, immutable candidates, and a two-item
pending bound. Champion Contract coverage locks founder reuse, four distinct
community challenge voices, truthful conditional +2 XP copy, frozen plans, and no
Ink promise.

## Deployment

See `../DEPLOY.md`. First upload/login is interactive; subsequent patch uploads
can use `../deploy.command`.
