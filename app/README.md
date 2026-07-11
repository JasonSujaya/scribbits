## Scribbits Arena

Scribbits Arena is a Devvit Web + Phaser game for Reddit. Players draw a
512x512 creature, the server derives stats from the PNG, and living Scribbits
enter daily community rumbles. The app identity is `scribbits` in
`package.json` and `devvit.json`.

## How to play

1. **Draw:** one Scribbit per UTC day. A deterministic optional Doodle Dare
   gives each player/day a lightweight prompt and mechanic hint without forcing
   a build. The first-run strip states the complete promise: draw, watch it
   fight, earn Ink. Blank, forming, and ready feedback progressively reveals the
   mapping: filled = Inkquake, jagged = Nib Halo, compact = Smearstep, and
   colorful = Colorburst. The four analyzed traits always normalize to the same
   100-point budget. Dominant color chooses the element.
2. **Fight:** submission automatically enters tonight's Rumble. A new player's
   first Scribbit also receives an immediate exhibition so the core promise is
   visible in the first session. On WebGL, Phaser 4.2 maps the submitted PNG to
   a 25-vertex **Inkbody** mesh. Its dominant drawing stat selects a visible
   Shape Power: INKQUAKE, NIB HALO, SMEARSTEP, or COLORBURST. The server runs a
   deterministic 20 Hz simulation and stores its winner, bounded timeline, and
   half-second motion checkpoints. Phaser interpolates that immutable transcript
   into a continuous arena fight without WebSockets or client-side authority.
   There is no turn-based player path or outcome-changing cheer input;
   transcript-less records render as archived-result summaries.
   The live Inkcast theater uses one clipping-safe movement field and 220px
   drawings on a deterministic torn-paper stage. Opposing element brush zones
   and edge-only ambient motion leave the combat center quiet. A compact rail
   explicitly pairs LIVE playback with an OUTCOME LOCKED server replay; angled
   fighter panels show names, numeric HP, exact signature powers, mastery, and a
   smaller fixed-tick clock. A high-contrast Inkcast lower third turns real
   transcript moments into varied, power-specific play-by-play. A
   presentation-only editorial queue chooses the
   strongest candidate per simulation tick, holds each displayed line for 900ms
   of wall-clock time, and keeps at most two pending beats. It never delays HP,
   Skip, finish, or any other authoritative state.
   Presentation-only hitstop, HP trails, impact tiers, arena folds, mastery auras,
   and optional procedural sound make authored events land harder.
   Element × Shape Power combinations receive sixteen concise signature names.
   Before every current fight, a mode-specific paper VS card shows both exact
   signatures and one verified interaction from the exhaustive ten-pair Shape
   Power matrix, explicitly framed as mechanics rather than win odds. During
   replay, a power with no proven connection gets neutral no-clean-hit copy;
   shield and element cues appear only when the transcript explicitly proves them.
   Colorburst does not claim a miss at `ability_finished`, because its delayed
   echo can still connect after that event.
   The finish is equally transcript-driven: an Inkcast Recap shows the exact
   verdict, final HP, damage, signature, and decisive splat. Knockouts fold only
   the loser, double knockouts fold both fighters, and time decisions leave both
   standing behind the result card.
   Founding NPCs use deterministic stat-shaped mascot art rather than missing
   bitmap assets; ordinary player-image failures still receive a neutral fallback.
   A frozen shared catalog gives all twenty founders eight unique, bounded story
   strings. Their epithet appears in the VS and Rival Draft, their opening owns the
   existing pre-`FIGHT!` ticker beat, their first power and result receive a
   fact-safe reaction, and a founding Rumble champion carries its voice into the
   Reddit result comment. None of this content enters the transcript or combat math.
   After a win or loss in an owned exhibition, a paper Rival Draft offers three
   server-selected founders. The slate is stable for the UTC day, prioritizes
   close levels and distinct Shape Powers, and exposes real forecast status plus
   canonical founder epithets. The prior transcript's exact decisive-splat recap
   follows the player into the draft, and each founder's authored challenge is
   visible on its card instead of only appearing in a toast. A
   chosen `opponentId` is accepted only when it still belongs to that exact
   server-authored slate; omitted IDs retain the server-random quick-spar path.
   After today's official Scribbit locks, the Arena also exposes a Four-Power
   Practice Lab. It reuses the analyzer and continuous replay, but not the birth,
   roster, reward, Rumble, history, or Legacy paths. The server alone derives
   the temporary fighter and transcript; the browser keeps only a session
   checklist and clears it when Practice ends. The first fourth-power discovery
   receives a gold 4/4 completion beat; later repeats do not retrigger it.
   The current Champion also owns one daily Champion Contract. The Arena projects
   the server's existing daily challenge flag, displays founder or Shape-Power
   identity, and replaces the live CTA with a noninteractive completion stamp
   after use. Its paper-native challenger picker exposes every candidate's level,
   element, and signature; a win grants +2 XP, while a loss grants no XP or Ink.
3. **Collect:** drawing, care, and the first spar win fill the Daily Ink Trail.
   Earned-only Ink opens Mystery Capsules with a discounted daily pull, permanent
   discovery album, collector rank, and visible Epic pity countdown. Accessories
   and status rewards are cosmetic; pens are expressive sidegrades that can
   change the normalized build split without adding stat points.
   The 36-item catalog includes eight wearable Shape Power Relics—two per
   power—with no combat hooks.
   Living Scribbits also grow from level 1 to 5, but the full arc adds only 1.5%
   damage and is statistically capped at a 60% equal-build win rate.
4. **Back:** choose another player’s contender before the nightly resolution.
   Champion backers earn 3 Clout; runner-up backers earn 1.
5. **Return:** keep the visible UTC-day streak alive. The scheduler resolves
   the bracket, crowns the Champion, stores the backed Scribbit's last played
   bout, creates the next Rumble post, and comments the real result on the
   resolved post. New archived pages lead into the scouting receipt, its
   server-selected replay, and then the Legacy Book.
6. **Become a Legend:** Scribbits live for three days. Winning a crown or
   reaching the Belief threshold preserves one in the public Gallery. Every
   completed Scribbit also becomes an immutable card in its creator's private,
   paginated Legacy Book.

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
- `src/shared/analyzer-core.ts`: deterministic PNG analyzer used by both sides.
- `src/shared/cosmetics.ts`: authoritative 36-item reward catalog shared by the
  server, client inventory tools, and Gallery Collection.
- `src/shared/founders.ts`: one immutable source for all twenty founding Scribbit
  definitions and 160 validated story strings; clients look up presentation by
  the existing `founding-*` ID without adding report or Redis fields.
- `src/shared/combat`: deterministic fixed-tick combat domain, balance tuning,
  transcript contract, and regression tests.
- `src/shared/combat/selection.ts`: the single dominant-stat and Shape Power
  selector shared by server simulation, drawing preview, Inkbody, and founder art.
- `src/shared/combat/shapepowercontent.ts`: shared names, reveal copy, neutral
  no-clean-hit cues, and the sixteen element-specific signature identities;
  combat numbers remain isolated in `config.ts`.
- `src/shared/combat/resultvalidation.ts`: one KO/double-KO/timeout
  terminal-state gate shared by stored-report parsing and client replay; both
  callers also bind top-level fighters to their transcript slots.
- `src/server/index.ts`: Hono server entry point.
- `src/server/routes/api.ts`: REST API mounted at `/api`.
- `src/server/core`: Redis-backed domain logic for arena days, Scribbits, ink,
  clout, battles, forecasts, daily jobs, and Reddit result comments.
- `src/server/core/legacy.ts`: personal Legacy indexing, migration, cursor
  pagination, and one-time return receipts over immutable retired snapshots.
- `src/server/core/battleStore.ts`: battle reports, per-Scribbit history, and
  the ordered featured Rumble report index used by overnight receipts.
- `src/server/core/practice.ts`: strict PNG-to-ephemeral-replay domain with no
  storage, media, reward, Rumble, or lifecycle dependency.
- `src/server/core/species.ts`: projects the shared founder definitions into
  runtime Scribbits and owns fair opponent/slate selection and safe cloning.
- `src/client/game.ts`: Phaser bootstrapping.
- `src/client/scenes`: game screens.
- `src/client/lib/drawonboarding.ts`: deterministic daily prompts, first-run
  promise copy, and blank/forming/ready draw-feedback plans.
- `src/client/lib/inkmesh.ts`: deterministic Mesh2D geometry and stat-driven
  motion rules, kept pure for regression testing.
- `src/client/lib/continuousreplay.ts`: transcript validation and checkpoint
  interpolation used by the live-looking replay.
- `src/client/lib/battlepresentation.ts`: pure impact, live-broadcast layout,
  non-overlapping outcome stack, HP, clock, shrinking-arena, and visible mastery
  plans derived from authoritative data.
- `src/client/lib/battlerecap.ts`: pure transcript-to-recap copy and finish
  semantics; `replaybattlerecap.ts` renders that plan without inferring results.
- `src/client/lib/replaybattlebackground.ts`: deterministic torn-paper Inkcast
  stage with reduced-motion-safe edge ambience; `replaybattlehud.ts` owns the
  server-locked rail, angled numeric-HP panels, clock, controls, and lower third.
- `src/client/lib/matchupbrief.ts`: pure mode-title, exact-signature, and exhaustive
  ten-pair Shape Power mechanics planning with no winner prediction;
  `battleceremony.ts` renders the plan before every current battle path.
- `src/client/lib/replaycommentary.ts`: pure deterministic transcript-fact-to-copy
  authoring plus founder voice projection into existing replay beats; it cannot
  schedule events or change combat state.
- `src/client/lib/inkcastqueue.ts`: pure priority, same-tick selection, dwell, and
  two-item pending rules for readable Inkcast cadence at every playback speed.
- `src/client/lib/championchallenge.ts`: pure founder/community Champion Contract
  identity and truthful open/completed copy; the server still owns daily use and XP.
- `src/client/lib/sparrivals.ts`: pure rival-card truth planning from server
  Scribbits, forecast, and prior-bout recap; `replaysparrivaldraft.ts` owns the
  Phaser draft layout.
- `src/client/lib/practicelab.ts`: pure four-power session reducer, deterministic
  prompt selection, Practice copy, and one-time 4/4 completion plan; `registry.ts`
  owns the session lifetime.
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
  capsule ceremony and Collection.
- `src/client/lib/collectionbook.ts`: paper-native discovery album, paging, and
  reward detail presentation.
- `src/client/lib/legacycards.ts`: paper-native Legacy deck, archival detail,
  finish treatments, pagination controls, and return ceremony.
- `src/client/lib/nextgoal.ts`: pure deterministic post-draw action priority and
  compact XP, Belief, lifespan, Ink, and collection evidence.
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
- `scripts/test-battle.mjs`: deterministic simulation/core regression checks.

## Setup

Use Node 22 or newer.

```bash
npm install
```

## Development

```bash
npm run dev
```

`npm run dev` runs Devvit playtest against the subreddit configured in
`devvit.json`. It requires `devvit login`.

If your agent shell cannot see `node`, `npm`, or `npx`, use the repo-level
command instead:

```bash
../playtest.command
```

For local browser iteration without Reddit:

```bash
npm run build
npm run mock
```

Then open the mock server URL printed by the command.

Agent-safe shortcut:

```bash
../mock.command
```

That shortcut runs a watch build beside the mock server and auto-refreshes the
browser after rebuilds. Open `http://localhost:8902/?fresh` to exercise the
brand-new-player route with an empty roster and no unlocked metagame items.
For deterministic combat proof, use
`/?debug&spar&power=inkquake&element=storm&seed=2`; swap in `nib_halo`,
`smearstep`, or `colorburst`, and add `&canvas` or `&reduce-motion` for those
fallbacks. Debug builds expose `replayPhase`, `replaySpeed`, and
`replayTweenScale` on the game canvas so 4× playback and the result reset can be
verified without touching combat state.

## Verification

Run these before handing off changes:

```bash
npm run verify
```

`npm run verify` runs type-check, lint, 83 simulation groups, and build.

`npm run test:sim` covers deterministic analyzer, Inkbody mesh geometry, combat
determinism, payload caps, archetype balance, slot neutrality, battle,
storage, daily job, ink, title equip, immutable Legacy snapshots, personal
Legacy paging/receipts, privacy deletion, expiry repair, and Swiss rumble
behavior. It also covers featured Rumble report selection/purge, Next Goal
priority/evidence, production-backed browser battle contracts, mock seed
isolation, four readable fixture silhouettes, shared dominant-stat parity,
stat-shaped founders, and the live Inkcast HUD/clock/outcome layout. It does not
replace route or browser testing. Recap coverage fixes timeout, knockout,
double-knockout, truncated-timeline, tie-break, decisive-hit copy, and report
fighter binding to the validated server transcript. First-draw coverage locks
daily Dare determinism, all four prompt families, live feedback phases, the
shared minimum-body gate, and the valid zero-recoil wall-ejection edge case.
Rival Draft coverage locks slate stability, clone safety, level bounds, Shape
Power variety, truthful level/power/signature/forecast card planning, prior-bout
highlight continuity, and canonical founder identity. Founder coverage locks the
exact twenty-entry server projection,
160 globally unique bounded story strings, deep-frozen content, production/mock
parity, deterministic opening/signature/outcome selection, and Rumble comment voice.
Practice coverage locks strict request fields, PNG validation, server-derived
stats, required transcripts, mock/production parity, art-bound transient IDs,
session de-duplication, truthful one-time 4/4 completion, and rejection before
the first battle-storage call. Inkcast coverage locks deterministic variation,
fact-bound damage/critical copy, input immutability, token safety, and
representative rendered-line bounds without invented miss reasons. Matchup brief
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
