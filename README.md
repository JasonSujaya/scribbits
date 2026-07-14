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
Arena home is intentionally not a bracket dashboard: it shows the selected
Scribbit versus the Champion or a Rival placeholder. Champion gets one direct
fight action; Spar gets one `CHOOSE A RIVAL` action that opens three
server-ranked risk choices before any fight. Rumble remains one compact
secondary control.

The shared Craftbox shell uses a generated torn-paper stage, bundled DynaPuff,
one die-cut icon family, and GPT-generated hand-cut paper buttons across Arena,
Bag, Draw, Battles, and Shop.
The active tab is the only coral ticket; hearts, clocks, Ink, and Shape Powers
use shared paper icons instead of emoji or text pretending to be controls.
Compact or detected low-power devices keep that paper art but skip ambient
particles and decorative infinite loops. Drawing analysis runs in a worker,
undo snapshots reuse pooled canvases, and display art is capped at 256px with a
12-texture inactive cache. Battle positions remain continuous while decorative
arena effects and Inkbody deformation update at a bounded 30 Hz.

## Daily loop

1. Draw the shared three-day community theme. Everyone receives the same clear
   brief, each new Scribbit keeps that theme id as its category, and the Rumble
   picker gathers the matching community creations under the theme name. The
   versioned calendar contains 122 unique themes covering 366 Arena days. The
   next season must append before day 367, so published days never remap.
   The screen keeps the theme inside the canvas,
   keeps all eight base colors visible, shows only size, eraser, undo, and Tools
   by default, and keeps collectible paint, brushes, stickers, Clear, and Redo
   one tap away. One visible `NEXT` action enables when the body is valid. Naming follows
   in a focused preview; birth and VS receipts explain the resulting Shape Power
   without restoring the former four-stat panel.
   Players who only want to sketch can choose untimed `FREE DRAW` instead. It
   uses the same large canvas and tools, saves once per Arena day in a separate
   versioned store, and never creates a Rumble entrant or battle reward. The
   Draw destination then shows that day’s saved image with one Practice action.
2. Care for the Scribbit across its three-day life, then open Shop to spend
   earned Ink on one Mystery Ink Chest or a maximum batch of ten.
3. Grow a permanent cosmetic collection with visible collector rank, wearable
   titles, and an honest countdown to the guaranteed Epic pull.
4. The Scribbit enters the nightly asynchronous Rumble automatically.
5. Continue one Founder Rival Thread through its founder-specific three-page
   episode—first to two, with at most one story beat per Arena day—or take the
   daily Champion Contract for +2 XP on a win.
6. Once today's Scribbit locks, use the reward-free Four-Power Practice Lab to
   draw throwaway shapes and immediately watch more server-authored fights.
7. Use the compact Rumble Pick action in Arena to choose another player’s
   contender. Champion picks earn 3 Clout; finalist backers earn 1.
8. Return after the UTC rollover to see the Champion, watch your picked
   Scribbit's last Rumble bout, and see the result comment on the real post.
9. Open Shop for Mystery Ink Chests and Bag to manage equipment, pens, and
   titles. Gallery remains available for community Legends and personal Legacy
   Cards without occupying a primary dock slot.
10. Keep a visible daily play streak and permanent Clout.
11. Keep a Scribbit alive for three days. Every finished run becomes an immutable
    personal Legacy Card; a crown or enough community Belief gives it a gold
    finish and preserves it in the public Hall of Legends.

The first session proves the whole promise—open Home, draw, watch that exact Scribbit fight
one simple random founding rival, then return Home with Arena ready for chosen battles. The birth
fight skips the three-choice Rival Run board so the core hook lands before the
deeper decision layer. The birth receipt says what caused the build and what it does,
for example `SHARP EDGES → FIRETIP HALO` and `3 ROTATING QUILLS`, instead of
showing raw stat totals. Phaser 4.2 turns the submitted PNG into a deforming Inkbody:
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
`YOU LOST`, or names the spectator winner, then names the transcript-proven
`FINAL SPLAT` or `WINNER'S SPLAT` with its Shape Power and damage before giving
one primary next move;
Rival, Practice, tonight's pick, and the real return destination no longer read
as four equal actions. Those canvas actions, Practice exits, archived returns,
and Rival Draft choices are mirrored by focusable native buttons; critical
targets remain at least 44 CSS pixels in the 320x568 fit and support visible
focus plus Enter/Space without changing battle authority.
The first Spar win each UTC day commits one versioned reward receipt in the
same Redis transaction as its XP and Ink. Fresh Replay can therefore celebrate
`+1 XP • +2 INK` or an exact level-up without deriving progression on the
client. Earned Ink Mods now cross the fixed-tick engine's integer resolution,
stay inside the four-mod balance cap, and expose their exact effects only in the
Scribbit detail view. Saved pages keep only Replay plus their truthful return action; they
cannot reopen a live Rival or tonight's pick flow.
Before the bell, a mode-specific VS card keeps one title, optional story stakes,
large fighter art, and two plain causal lines such as
`MORE COLORS → CONE + DELAYED ECHO`. They come from the same immutable Shape
Power content used by birth and replay and never claim win odds. During replay,
neutral no-clean-hit stamps avoid inventing a
dodge or counter; shield and element cues appear only for explicit transcript
events. The twenty founding opponents use deterministic stat-shaped mascot art,
so their silhouette previews the same Shape Power the server runs. One frozen
shared catalog also gives each founder an epithet and seven purpose-specific
voice lines: rival challenge, two openings, first-signature reaction, victory,
defeat, and Rumble copy. Those lines replace existing presentation beats; they
cannot schedule events or affect a result. There is no turn-based player path or
outcome-changing cheer input. No WebSocket or client combat authority is
required.

Signed-in players can explicitly share a completed, unskipped replay. The
browser records a silent clip of the already-rendering Phaser canvas, uploads
that clip to Reddit media, and opens Reddit's share sheet; a shared link can
show the hosted clip on the Scribbits splash. The stored transcript remains the
authoritative result—the client-rendered video is presentation, not proof.

Before every player-facing Spar—and again after each bout—the player picks from
three server-authored founding rivals instead of receiving a blind random fight.
The daily slate is stable, level-bounded, and power-varied; its cards disclose
each rival's real level, element, Shape Power, signature move, forecast status,
canonical epithet, and challenge line. The draft also carries the previous
transcript's exact FINAL/BIGGEST SPLAT into the next choice. The server validates
the chosen rival against the current slate before authoring a fresh transcript,
so matchup choice adds agency and story continuity without combat authority or
fake win odds.

Each Rival Run lasts exactly three bouts. Every slate offers `SAFE +1`,
`EVEN +2`, and `BOLD +3`; only wins add the displayed points, while losses still
advance the run. Bout and score follow through the chooser, VS receipt, battle,
and result. The third result offers one explicit new-run action and the server
rolls a fresh bout 1/3 slate. The new `SIGNATURE INK` Technique Trial asks for
three Shape Power activations across the run. Progress comes only from the
player fighter's immutable server-authored battle events, so it adds a reason
to watch each drawing's signature without adding power, rewards, or another screen.

One founder can become the player's active Rival Thread. It is a server-owned
best-of-three capped at three qualifying battles, and only one score beat can be
written per Arena day. The active founder is pinned into tomorrow's draft and
future slates; unrelated fights remain exhibitions and cannot replace the thread.
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

The persistent dock is Arena, Bag, Home, Battles, and Shop, with Home centered.
Draw opens from Home's large Draw button instead of occupying a dock tab. Shop
is the one home for earned-Ink Mystery Chests; Bag is the one home for inventory
and equipment; Gallery is the one home for Legends and Legacy Cards and opens
directly from Home. Scout and Gallery are not primary
destinations. The compatibility Notebook scene can still resolve older
saved-replay returns while that legacy path is retired, but the daily Rumble
Pick remains directly reachable from Arena.

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

Each report also records one of ten rotating Battle Arenas. Their small symmetric
modifiers and challenges are selected and scored with the fight on the server;
the replay only renders the stored arena, timeline, and result.

## Repository

- [`app/`](./app): the Devvit application and detailed developer README.
- [`plans/v3-scribbits-arena.md`](./plans/v3-scribbits-arena.md): gameplay plan
  of record.
- [`SUBMISSION.md`](./SUBMISSION.md): Devpost copy, proof checklist, and demo
  video shot list.
- [`GOAL.md`](./GOAL.md): current ship gates and external blockers.
- [`app/docs/ranking-seasons.md`](./app/docs/ranking-seasons.md): season
  lifecycle, ranking policy, administration, and recovery contract.

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
./mock.command
```

Open `http://localhost:8902/`. The default preview starts with an empty roster so
the only Scribbits shown are drawings submitted during that preview. Add
`?fixtures` to opt into the seeded QA roster. The command runs a dedicated Vite
development server, so client saves update immediately without rebuilding or
deleting `dist/client`. Mock backend changes publish only after a successful
build and restart automatically; a failed rebuild keeps the last-good server
running. Running the command again cleanly replaces its previous instance.
Public forecast flavor follows its own validated 32-day no-repeat rotation. It
appears consistently in the app, Reddit post title, and result comment without
sharing randomness with boosted/nerfed combat elements.

The verification gate covers TypeScript, ESLint, every discoverable Node test
suite, the deterministic simulation harness, and the production build.

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
Battle clips upload only after the player taps Share, require a signed-in Reddit
account, and are rejected above 8 MB. Accepted clips leave the app boundary and
are hosted by Reddit media.

Mystery Ink is earned only through play. Shop owns the chest ceremony rather
than competing with the Arena fight or Bag equipment. Chests cost 5 Ink each, use visible 70/25/5
rarity odds, guarantee an Epic by open 10, and reveal the actual reward art in
place. Players can open one or ten at a time; there is no 100-open or auto-repeat
action. A completed first Rival Run now leads through only the Care still needed
for 5 Ink, then opens a simplified first-chest Shop. That first pull preserves
the published rarity odds while guaranteeing equippable Gear, and its reveal
opens Bag on the matching equipment category. The Reddit Gold Styles card is a
disabled cosmetic-only preview. Shop's stage, two chest states, and Ink token
load only when Shop opens, deferring 7,526,466 image bytes from initial game boot.
Discovery, collector progress, pens, and titles
persist across Scribbits; permanent pen/title duplicates redirect within their
rarity while useful accessory copies stack. Mystery Pens are expressive
sidegrades that can change the build split through color, but every drawing
still has exactly the same 100-point stat budget. Bag anchors the selected
Scribbit on a visible equipment platform, keeps filters below that stage, and
shows owned rewards in a bounded scrollable tray of icon-only tiles. Strong
common, Rare, and Epic borders carry rarity at a glance; tapping a tile opens
its name, stars, copies, Forge progress, exact Gear technique, and Equip action.
Earned reusable Gear adds bounded Exhibition sidegrades without adding to the
100-point drawing build or changing analysis; Rumble and Champion remain
Gear-neutral by design. Exhaustive mirrored matchup tests cover all six Gear
effect families and both equipment slots.

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
player picked; the client cannot choose or alter that report. After today's
drawing, one Next Goal card progressively reveals the next useful action and
only the XP, Belief, lifespan, Ink, and collection evidence needed for it.
