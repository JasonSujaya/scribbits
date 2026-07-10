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

1. Draw today's Scribbit and watch its stats change with every stroke.
2. Fill the Daily Ink Trail through drawing, care, and a first spar win. Spend
   earned Ink on a discounted daily Mystery Capsule.
3. Grow a permanent cosmetic collection with visible collector rank, wearable
   titles, and an honest countdown to the guaranteed Epic pull.
4. The Scribbit enters the nightly asynchronous Rumble automatically.
5. Back another player’s contender. Champion backers earn Clout; finalist backers earn some.
6. Return after the UTC rollover to see the Champion, watch your backed
   Scribbit's last Rumble bout, and see the result comment on the real post.
7. Keep a visible daily play streak and permanent Scout Clout.
8. Keep a Scribbit alive for three days. Every finished run becomes an immutable
   personal Legacy Card; a crown or enough community Belief gives it a gold
   finish and preserves it in the public Hall of Legends.

The first Scribbit immediately receives an exhibition fight, so a new player
sees their drawing come alive before meeting the deeper care, collection, and
scouting systems. Phaser 4.2 turns the submitted PNG into a deforming Inkbody:
its dominant drawing stat controls its breathing and named Shape Power. The
server resolves each 20 Hz fight ahead of time and stores a compact transcript;
the client streams that immutable result as a continuous 15–25 second arena
battle. No WebSocket or client combat authority is required.

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
./mock.command
```

Open `http://localhost:8902/`. Add `?fresh` to test the brand-new-player path.
The verification gate currently covers TypeScript, ESLint, 63 deterministic
simulation groups, and the production build.

## Data and safety

Scribbits stores the Reddit identity needed for attribution plus drawings,
battles, inventory, streak, and scores needed to run the game. New drawings are
uploaded through Reddit media hosting. Player cards provide **Report** and
owner-only, two-step **Delete** controls. The Field Guide also provides a
two-step **Delete all my stored game data** action. The server analyzes the
authoritative base PNG and accepts a decorated PNG only when its changed pixels
stay inside the declared rotated accessory regions and no base pixels are
erased, so cosmetics cannot secretly change combat stats or drawing identity.

Mystery Ink is earned only through play. Capsules use visible 70/25/5 rarity
odds, guarantee an Epic by pull 10, and reveal the actual reward art before a
direct Collection handoff. Discovery, collector progress, pens, and titles
persist across Scribbits; permanent pen/title duplicates redirect within their
rarity while useful accessory copies stack. Mystery Pens are expressive
sidegrades that can change the build split through color, but every drawing
still has exactly the same 100-point stat budget. The Gallery's Collection tab
shows all 28 rewards with discovered art, locked silhouettes, rarity, copies,
pen swatches, title badges, and persistent completion progress.

The Gallery's Legacy Book keeps a private, paginated card for every completed
Scribbit with its submitted art, final level and record, Belief, lifespan,
accessories, and the creator title worn at archive time. Returning players see
new pages before the normal Rumble scouting receipt, and can open the frozen
record without turning retired Scribbits back into combat entities.

The scouting receipt can play the server-selected last bout for the Scribbit a
player backed; the client cannot choose or alter that report. After today's
drawing, one Next Goal card progressively reveals the next useful action and
only the XP, Belief, lifespan, Ink, and collection evidence needed for it.
