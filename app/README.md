## Scribbits Arena

Scribbits Arena is a Devvit Web + Phaser game for Reddit. Players draw a
512x512 creature, the server derives stats from the PNG, and living Scribbits
enter daily community rumbles. The app identity is `scribbits` in
`package.json` and `devvit.json`.

## How to play

1. **Draw:** one Scribbit per UTC day. The live preview explains the mapping:
   filled = Inkquake, jagged = Nib Halo, compact = Smearstep, and colorful =
   Colorburst. The four analyzed traits always normalize to the same 100-point
   budget. Dominant color chooses the element.
2. **Fight:** submission automatically enters tonight's Rumble. A new player's
   first Scribbit also receives an immediate exhibition so the core promise is
   visible in the first session. On WebGL, Phaser 4.2 maps the submitted PNG to
   a 25-vertex **Inkbody** mesh. Its dominant drawing stat selects a visible
   Shape Power: INKQUAKE, NIB HALO, SMEARSTEP, or COLORBURST. The server runs a
   deterministic 20 Hz simulation and stores its winner, sparse events, and
   half-second motion checkpoints. Phaser interpolates that immutable transcript
   into a continuous arena fight without WebSockets or client-side authority.
3. **Collect:** drawing, care, and the first spar win fill the Daily Ink Trail.
   Earned-only Ink opens Mystery Capsules with a discounted daily pull, permanent
   discovery album, collector rank, and visible Epic pity countdown. Rewards are
   cosmetic and never change drawing analysis or combat stats.
4. **Back:** choose another player’s contender before the nightly resolution.
   Champion backers earn 3 Clout; runner-up backers earn 1.
5. **Return:** keep the visible UTC-day streak alive. The scheduler resolves the bracket, crowns the Champion, creates
   the next Rumble post, and comments the real result on the resolved post.
6. **Become a Legend:** Scribbits live for three days. Winning a crown or
   reaching the Belief threshold preserves one in the Gallery.

The game is designed for a short Reddit-feed visit: a lightweight inline card
shows today's forecast and the player's next action, while Phaser loads only in
expanded mode.

## Data and safety

Scribbits stores Reddit identity for attribution and the drawings, battle
history, inventory, streak, and scores required by the game. Drawings are
uploaded through Reddit media hosting; submissions fail closed if that upload
fails. Every community Scribbit card has a **Report** action. Owners have a
two-step **Delete** action, and the Field Guide includes a two-step option to
delete all stored game data.

## Architecture

- `src/shared/arena.ts`: client/server contract and gameplay constants.
- `src/shared/analyzer-core.ts`: deterministic PNG analyzer used by both sides.
- `src/shared/combat`: deterministic fixed-tick combat domain, balance tuning,
  transcript contract, and regression tests.
- `src/server/index.ts`: Hono server entry point.
- `src/server/routes/api.ts`: REST API mounted at `/api`.
- `src/server/core`: Redis-backed domain logic for arena days, Scribbits, ink,
  clout, battles, forecasts, daily jobs, and Reddit result comments.
- `src/client/game.ts`: Phaser bootstrapping.
- `src/client/scenes`: game screens.
- `src/client/lib/inkmesh.ts`: deterministic Mesh2D geometry and stat-driven
  motion rules, kept pure for regression testing.
- `src/client/lib/continuousreplay.ts`: transcript validation and checkpoint
  interpolation used by the live-looking replay.
- `src/client/lib/livesprite.ts`: Phaser Mesh2D Inkbody renderer with a 3x3
  Canvas fallback.
- `src/client/lib`: Phaser UI, API wrapper, drawing canvas, modals, and effects.
- `scripts/dev-mock.mjs`: local mock server for browser UI iteration.
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

## Verification

Run these before handing off changes:

```bash
npm run verify
```

`npm run verify` runs type-check, lint, simulation tests, and build.

`npm run test:sim` covers deterministic analyzer, Inkbody mesh geometry, combat
determinism, payload caps, archetype balance, slot neutrality, battle,
storage, daily job, ink, clout, expiry, and Swiss rumble behavior. It does not
replace route or browser testing.

## Deployment

See `../DEPLOY.md`. First upload/login is interactive; subsequent patch uploads
can use `../deploy.command`.
