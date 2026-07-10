# Scribbits Arena

**Draw a creature. Its shape becomes its combat build. Tonight it fights. It has
three days to become a Legend.**

Scribbits Arena is a portrait-first Reddit mini game built with Devvit Web and
Phaser. Every player can draw one Scribbit per day. The submitted PNG is both
the art and the stat sheet: big drawings gain HP, pointy drawings gain attack,
small footprints gain speed, and colorful drawings gain critical chance.

## Daily loop

1. Draw today's Scribbit and watch its stats change with every stroke.
2. The Scribbit enters the nightly asynchronous Rumble automatically.
3. Back another player’s contender. Champion backers earn Clout; finalist backers earn some.
4. Return after the UTC rollover to see the Champion and the result comment on
   the real Reddit Rumble post.
5. Keep a visible daily play streak and permanent Scout Clout.
6. Keep a Scribbit alive for three days. A crown or enough community Belief
   turns it into a permanent Legend.

The first Scribbit immediately receives an exhibition fight, so a new player
sees their drawing come alive before meeting the deeper care, collection, and
scouting systems. Phaser 4.2 turns the submitted PNG into a deforming Inkbody:
its dominant drawing stat controls its breathing and named Shape Power.

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
The verification gate currently covers TypeScript, ESLint, 32 deterministic
simulation groups, and the production build.

## Data and safety

Scribbits stores the Reddit identity needed for attribution plus drawings,
battles, inventory, streak, and scores needed to run the game. New drawings are
uploaded through Reddit media hosting. Player cards provide **Report** and
owner-only, two-step **Delete** controls. The Field Guide also provides a
two-step **Delete all my stored game data** action.
