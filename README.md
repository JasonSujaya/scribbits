# Scribbits Arena

**Draw a creature. Its shape becomes its combat build. Tonight it fights. It has
three days to become a Legend.**

Scribbits Arena is a portrait-first Reddit mini game built with Devvit Web and
Phaser. Every player can draw one Scribbit per day. The submitted PNG is both
the art and the combat identity: filled bodies become Inkquake bruisers,
jagged outlines summon a three-quill Nib Halo, compact shapes Smearstep, and
colorful drawings fire Colorburst. Every drawing still receives the same
100-point stat budget.

The portrait UI uses progressive disclosure: each default card leads with one
headline, one current status, and one obvious action. Exact rules, telemetry,
privacy controls, and card history remain available behind the relevant tap
instead of competing with the drawing or fight.
Arena home is intentionally not a bracket dashboard: Draw is the hero, Champion
and Rumble are one-action cards, and the full eight-contender choice opens only
after the player taps the three-portrait Rumble preview.

The shared Craftbox shell uses a generated torn-paper stage, bundled DynaPuff,
one die-cut icon family, and GPT-generated hand-cut paper buttons across Arena,
Gallery, Draw, Battles, and Scout.
The active tab is the only coral ticket; hearts, clocks, Ink, and Shape Powers
use shared paper icons instead of emoji or text pretending to be controls.
Compact or detected low-power devices keep that paper art but skip ambient
particles and decorative infinite loops. Drawing analysis runs in a worker,
undo snapshots reuse pooled canvases, and display art is capped at 256px with a
12-texture inactive cache. Battle positions remain continuous while decorative
arena effects and Inkbody deformation update at a bounded 30 Hz.

## Daily loop

1. Take one of 32 optional daily Doodle Dares plus an expressive bonus twist—or
   ignore both and draw anything—while live feedback turns each stroke into a
   visible Shape Power. The screen keeps the Dare inside the canvas and collapses
   ink, premium pens, brush size, erase, and undo into one icon rail; one status
   replaces the former four-stat panel. The exact card does not repeat for 256
   Arena days.
2. Care for the Scribbit across its three-day life and spend earned Ink on a
   discounted daily Mystery Capsule.
3. Grow a permanent cosmetic collection with visible collector rank, wearable
   titles, and an honest countdown to the guaranteed Epic pull.
4. The Scribbit enters the nightly asynchronous Rumble automatically.
5. Continue one Founder Rival Thread through its founder-specific three-page
   episode—first to two, with at most one story beat per Arena day—or take the
   daily Champion Contract for +2 XP on a win.
6. Once today's Scribbit locks, use the reward-free Four-Power Practice Lab to
   draw throwaway shapes and immediately watch more server-authored fights.
7. Back another player’s contender. Champion backers earn 3 Clout; finalist
   backers earn 1.
8. Return after the UTC rollover to see the Champion, watch your backed
   Scribbit's last Rumble bout, and see the result comment on the real post.
9. Open the seven-page Scout Notebook to compare tonight's pick with the prior
   six Arena days, including exact forecasts, filed results, and available replays.
10. Keep a visible daily play streak and permanent Scout Clout.
11. Keep a Scribbit alive for three days. Every finished run becomes an immutable
    personal Legacy Card; a crown or enough community Belief gives it a gold
    finish and preserves it in the public Hall of Legends.

The first session proves the whole promise—draw, watch it fight, earn Ink—and the
first Scribbit immediately receives an exhibition fight. A new player sees
their drawing come alive before meeting the deeper care, collection, and
scouting systems. Phaser 4.2 turns the submitted PNG into a deforming Inkbody:
its dominant drawing stat controls its breathing and named Shape Power, while
its element gives that power one of sixteen authored signature identities. The
server resolves each 20 Hz fight ahead of time and stores a compact transcript;
the client replays that immutable result as a continuous arena battle capped at
20 seconds. A final Sudden Scribble at 15 seconds halves Shape Power cooldowns
and folds the arena inward for a short, legible finish. A full-height paper
arena now separates combat from the quieter Gallery screens: a torn page,
localized element stains, rough truthful bounds, and transcript-triggered ink
surges keep the center readable. A compact paper rail keeps the battle kind,
server lock, icon controls, fighter names, numeric HP, and Shape Power state
visible as READY → WINDUP → ACTIVE without returning to turn cards.
Transcript facts appear only as a transient paper margin, turning them into
power-specific play-by-play without adding events or changing their order. A
versioned shared Inkcast pack contains 104 globally unique lines across 25 strict
fact banks. For each authored fact, the replay-scoped author walks a deterministic
bank-local rotation and never reuses a line before that bank is exhausted;
founder signature reactions do not consume the normal rotation. Per-bank token contracts, rendered-length checks,
and claim-safety rules reject copy that invents rewards, outcomes, unsupported
miss causes, Ink Pressure timing, or future arena events. The typed authoring
layer excludes Colorburst misses because its delayed echo may still connect. A
bounded editorial queue chooses at most one headline per simulation tick, holds
it for 900ms of wall-clock time, and keeps only two pending beats, so criticals
and signature moments remain readable even at 4× while every visual event still
plays; the queue may omit lower-priority authored candidates for readability.
Transcript-derived
hitstop, lagging HP chunks, impact rings, mastery
auras, folding arena walls, and optional procedural sound add spectacle without
changing a single result. At the bell, a winner-first Inkcast Recap keeps the
exact finish reason, duration, and final HP readable, while
playback-only 2×/4× speed is reset before result controls animate. Only a
knockout folds the loser; a double knockout folds both fighters, while time
decisions leave both standing. The compact payoff immediately says `YOU WON`,
`YOU LOST`, or names the spectator winner, then gives one primary next move;
Rival, Practice, tonight's pick, and the real return destination no longer read
as four equal actions. Those canvas actions, Practice exits, archived returns,
and Rival Draft choices are mirrored by focusable native buttons; critical
targets remain at least 44 CSS pixels in the 320x568 fit and support visible
focus plus Enter/Space without changing battle authority.
Before the bell, a mode-specific VS card reveals both signature moves and one
verified interaction from the exhaustive ten-pair Shape Power matrix—mechanics,
never win odds. Its portrait layout keeps one battle label, one title, one
stakes line, large fighter art, and a two-line mechanics card. Both visible
Halo reduction percentages derive from the same
configuration value the combat engine consumes, and Smearstep's `TWICE` derives
from the same dash count its authoritative schedule consumes, while exact-copy
regressions still lock all ten cards. During replay, neutral no-clean-hit stamps avoid inventing a
dodge or counter; shield and element cues appear only for explicit transcript
events. The twenty founding opponents use deterministic stat-shaped mascot art,
so their silhouette previews the same Shape Power the server runs. One frozen
shared catalog also gives each founder an epithet and seven purpose-specific
voice lines: rival challenge, two openings, first-signature reaction, victory,
defeat, and Rumble copy. Those lines replace existing presentation beats; they
cannot schedule events or affect a result. There is no turn-based player path or
outcome-changing cheer input. No WebSocket or client combat authority is
required.

After any owned exhibition, the player can immediately pick from three
server-authored founding rivals instead of silently rerolling a random rematch.
The daily slate is stable, level-bounded, and power-varied; its cards disclose
each rival's real level, element, Shape Power, signature move, forecast status,
canonical epithet, and challenge line. The draft also carries the previous
transcript's exact FINAL/BIGGEST SPLAT into the next choice. The server validates
the chosen rival against the current slate before authoring a fresh transcript,
so matchup choice adds agency and story continuity without combat authority or
fake win odds.

One founder can become the player's active Rival Thread. It is a server-owned
best-of-three capped at three qualifying battles, and only one score beat can be
written per Arena day. The active founder is pinned into tomorrow's draft and
quick spar; unrelated fights remain exhibitions and cannot replace the thread.
Before a qualifying bout, the paper ceremony names the stakes—new thread, match
point, or deciding bout—and the live rail becomes RIVAL BOUT or RIVAL DECIDER
without revealing the already-authored winner.
Every founder now owns a validated three-page episode with a unique title and
founder-specific scene cue. Page 1 opens the relationship, Page 2 reframes the
rematch, and Page 3 names the decider. The next episode appears consistently in
the Rival Draft, Next Goal, compact Rival margin, and VS ceremony. Page selection is
derived from the authoritative series score, so these 60 authored pages add no
Redis schema, client-owned progression, predicted outcome, or reward promise.
After the fight, the same page closes with one of 120 unique founder-authored
result lines selected from the validated transcript winner. The result receipt
leads with the new server score and whether the thread continues or the margin
is signed; its page title remains visible in the VS ceremony and Rival Draft.
The score and return day persist on the Arena Next Goal card without adding a
new rule panel. None of these surfaces invent Ink, XP, Clout, or another reward.
Every finished series becomes a permanent signed margin note, not currency,
combat power, or a twenty-character checklist. A pending projection receipt lets
Arena reads repair an ambiguous write after the battle report is safely stored;
an immediate response restores the exact episode beat only after the reloaded
Chronicle matches the projection and the current report is its latest durable
source. Delayed receipts replay in Arena-day order and older checklist encounters
migrate as archive-only history.

The Battles tab is a Battle Scrapbook for the newest 20 server-stored reports,
not a permanent career archive. Its compact rows preserve the player's win/loss
perspective even after a Scribbit fades, pin Rumble and Champion pages before
same-day exhibitions, and lead with matchup, finish, and day. Opening a usable
page reveals the exact server verdict, duration, and final HP in Replay. Reports
without a usable transcript are clearly marked as saved results with no motion
replay. Opening a page returns to the same
Scrapbook page and never grants a reward or writes progression.

The fifth app tab is now a Scout Notebook rather than another rules shortcut.
It assembles tonight plus the prior six Arena days from existing server-owned
Back records, payout receipts, forecasts, lifetime Clout, and visible featured
Rumble reports. Each page has one explicit state—open, pending, champion,
finalist, no Clout, or missed—and shows the exact picked drawing, artist,
element, forecast, and filed payout when those facts still exist. Historical identity
comes from the matching report or visible Scribbit record, never from today's
Champion. Hidden or deleted art becomes unavailable, and Replay is offered only
while that exact visible report remains loadable. Forty-eight validated margin
notes rotate without repeating for the same status inside the seven-page window.
Replay returns to the selected day. This rolling view adds no Redis key, reward,
title, or combat authority; the Field Guide remains available as a secondary
button from the Notebook.

The Practice Lab makes the drawing-to-combat hook replayable after the daily
submission locks. Its endpoint accepts only a name and base PNG, re-analyzes the
image on the server, authors a founding rival and complete transcript, and
returns one ephemeral `practice` report. Practice has no Ink, XP, roster slot,
Rumble entry, battle history, media upload, or Legacy card. The client keeps only
a four-power checklist for the current browser session and clears it on exit.
Finding the fourth unique power earns one gold 4/4 completion beat; repeated
drawings keep the checklist truthful and do not replay that first-completion cue.
After 4/4, Practice rotates through all four target powers and fresh prompt cards
instead of pinning the player to one encore.

Care is also authored content rather than three repeating toasts. A validated
72-line deck covers every Shape Power, care action, life day, and variant, so one
Scribbit receives nine distinct lifetime moments. The paper receipt shows its
drawing, new mood, care progress, exact XP delta, and only the Ink award confirmed
by the server. The Field Guide now teaches the live fixed-tick payloads—Ember
afterburn, Tide shove, Moss barrier, and Storm windup—instead of the retired
element triangle.

## Server authority

The production server is real and is hosted by Reddit through Devvit Web. The
Reddit WebView calls typed `/api/*` routes running in Devvit's Node environment;
installation state lives in managed Redis. The server analyzes submitted PNGs,
selects opponents, simulates the complete fixed-tick fight, stores the winner and
transcript, and only then returns the replay. Phaser streams that precomputed data
locally, so the battle looks real-time without WebSockets, latency-sensitive
inputs, or a client that can change the result. `app/scripts/dev-mock.mjs` is only
the local development stand-in for this hosted boundary.

## Repository

- [`app/`](./app): the Devvit application and detailed developer README.
- [`plans/v3-scribbits-arena.md`](./plans/v3-scribbits-arena.md): gameplay plan
  of record.
- [`SUBMISSION.md`](./SUBMISSION.md): Devpost copy, proof checklist, and demo
  video shot list.
- [`GOAL.md`](./GOAL.md): current ship gates and external blockers.

## Verify locally

From the repository root:

```bash
./verify.command
```

This resolves Node 22.2.0+ and pnpm 11.7.0 (including the Codex bundled runtime), installs
from `app/pnpm-lock.yaml` when needed, and runs the complete gate. With Node and
pnpm already configured, the equivalent command is `cd app && pnpm verify`.

For browser-only iteration without Reddit login:

```bash
../mock.command
```

Open `http://localhost:8902/`. Add `?fresh` to test the brand-new-player path.
Public forecast flavor follows its own validated 32-day no-repeat rotation. It
appears consistently in the app, Reddit post title, and result comment without
sharing randomness with boosted/nerfed combat elements.

The verification gate currently covers TypeScript, ESLint, 142 deterministic
simulation groups, and the production build.

## Data and safety

Scribbits stores the Reddit identity needed for attribution plus drawings,
battles, inventory, streak, and scores needed to run the game. New drawings are
uploaded through Reddit media hosting. Player cards provide **Report** and
owner-only, two-step **Delete** controls. The Field Guide also provides a
two-step **Delete all my stored game data** action. The server analyzes the
authoritative base PNG, rejects tap-sized marks that do not form a body, and
accepts a decorated PNG only when its changed pixels stay inside the declared
rotated accessory regions and no base pixels are erased. Cosmetics cannot
secretly change combat stats or drawing identity.

Practice drawings cross the response boundary only for their replay. They are
not uploaded or stored, and practice reports are rejected before the battle
store's first Redis operation. The route also enforces a bounded request body,
one in-flight request per user, and a short Redis-backed request-rate guard.

Mystery Ink is earned only through play. Capsules use visible 70/25/5 rarity
odds, guarantee an Epic by pull 10, and reveal the actual reward art before a
direct Collection handoff. Discovery, collector progress, pens, and titles
persist across Scribbits; permanent pen/title duplicates redirect within their
rarity while useful accessory copies stack. Mystery Pens are expressive
sidegrades that can change the build split through color, but every drawing
still has exactly the same 100-point stat budget. The Gallery's Collection tab
shows all 36 rewards with discovered art, locked silhouettes, rarity, copies,
pen swatches, title badges, and persistent completion progress. Eight cosmetic
Shape Power Relics connect capsule discovery to the battle fantasy without
adding stats or changing analysis.

Scribbits grow from level 1 to 5, but the complete journey adds only 1.5%
damage. Regression simulations keep a max-level fighter at or below a 60%
equal-build win rate. Rumble matchmaking uses Swiss record first, closest level
second, gives every entrant one fight per round, and avoids repeat opponents
when another match exists. It never matches on element or drawing archetype.

The Gallery's Legacy Book keeps a private, paginated card for every completed
Scribbit with its submitted art, final level and record, Belief, lifespan,
accessories, and the creator title worn at archive time. Returning players see
new pages before the normal Rumble scouting receipt, and can open the frozen
record without turning retired Scribbits back into combat entities.

The scouting receipt can play the server-selected last bout for the Scribbit a
player backed; the client cannot choose or alter that report. After today's
drawing, one Next Goal card progressively reveals the next useful action and
only the XP, Belief, lifespan, Ink, and collection evidence needed for it.
