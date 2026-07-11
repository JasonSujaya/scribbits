# Scribbits Arena

**Draw a creature. Its shape becomes its combat build. Tonight it fights. It has
three days to become a Legend.**

Scribbits Arena is a portrait-first Reddit mini game built with Devvit Web and
Phaser. Every player can draw one Scribbit per day. The submitted PNG is both
the art and the combat identity: filled bodies become Inkquake bruisers,
jagged outlines summon a three-quill Nib Halo, compact shapes Smearstep, and
colorful drawings fire Colorburst. Every drawing still receives the same
100-point stat budget.

## Daily loop

1. Take the optional daily Doodle Dare—or ignore it and draw anything—while
   live feedback turns each stroke into a visible Shape Power.
2. Fill the Daily Ink Trail through drawing, care, and a first spar win. Spend
   earned Ink on a discounted daily Mystery Capsule.
3. Grow a permanent cosmetic collection with visible collector rank, wearable
   titles, and an honest countdown to the guaranteed Epic pull.
4. The Scribbit enters the nightly asynchronous Rumble automatically.
5. Once today's Scribbit locks, use the reward-free Four-Power Practice Lab to
   draw throwaway shapes and immediately watch more server-authored fights.
6. Back another player’s contender. Champion backers earn Clout; finalist backers earn some.
7. Return after the UTC rollover to see the Champion, watch your backed
   Scribbit's last Rumble bout, and see the result comment on the real post.
8. Keep a visible daily play streak and permanent Scout Clout.
9. Keep a Scribbit alive for three days. Every finished run becomes an immutable
   personal Legacy Card; a crown or enough community Belief gives it a gold
   finish and preserves it in the public Hall of Legends.

The first screen states the whole promise—draw, watch it fight, earn Ink—and the
first Scribbit immediately receives an exhibition fight. A new player sees
their drawing come alive before meeting the deeper care, collection, and
scouting systems. Phaser 4.2 turns the submitted PNG into a deforming Inkbody:
its dominant drawing stat controls its breathing and named Shape Power, while
its element gives that power one of sixteen authored signature identities. The
server resolves each 20 Hz fight ahead of time and stores a compact transcript;
the client replays that immutable result as a continuous arena battle capped at
25 seconds. A paper-sports broadcast HUD surrounds one continuous movement
field: large drawings cast moving shadows beneath mirrored HP bars, a fixed-tick
clock, and a compact Inkcast ticker. Transcript-derived presentation hitstop,
lagging HP chunks, impact rings, mastery auras, folding arena walls, and
optional procedural sound add spectacle without changing a single result. At
the bell, an Inkcast Recap reports the transcript's exact finish, final HP,
damage, signature, and biggest or final splat. Only a knockout folds the loser;
a double knockout folds both fighters, while time decisions leave both standing.
Readable dodge, dead-zone, Halo Guard, and elemental cue stamps expose counters
that were already decided by that transcript. Founding opponents use
deterministic stat-shaped mascot art, so their silhouette previews the same
Shape Power the server runs. There is no turn-based player path or
outcome-changing cheer input. No WebSocket or client combat authority is
required.

After any owned exhibition, the player can immediately pick from three
server-authored founding rivals instead of silently rerolling a random rematch.
The daily slate is stable, level-bounded, and power-varied; its cards disclose
each rival's real level, element, Shape Power, signature move, and forecast
status. The server validates the chosen rival against the current slate before
authoring a fresh transcript, so matchup choice adds agency without combat
authority or fake win odds.

The Practice Lab makes the drawing-to-combat hook replayable after the daily
submission locks. Its endpoint accepts only a name and base PNG, re-analyzes the
image on the server, authors a founding rival and complete transcript, and
returns one ephemeral `practice` report. Practice has no Ink, XP, roster slot,
Rumble entry, battle history, media upload, or Legacy card. The client keeps only
a four-power checklist for the current browser session and clears it on exit.

## Repository

- [`app/`](./app): the Devvit application and detailed developer README.
- [`plans/v3-scribbits-arena.md`](./plans/v3-scribbits-arena.md): gameplay plan
  of record.
- [`SUBMISSION.md`](./SUBMISSION.md): Devpost copy, proof checklist, and demo
  video shot list.
- [`GOAL.md`](./GOAL.md): current ship gates and external blockers.

## Verify locally

From `app/` with Node 22+:

```bash
npm install
npm run verify
```

For browser-only iteration without Reddit login:

```bash
../mock.command
```

Open `http://localhost:8902/`. Add `?fresh` to test the brand-new-player path.
The verification gate currently covers TypeScript, ESLint, 78 deterministic
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
