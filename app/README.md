## Scribbits Arena

Scribbits Arena is a Devvit Web + Phaser game for Reddit. Players draw a
512x512 creature, the server derives stats from the PNG, and living Scribbits
enter daily community rumbles. The repository folder is still named Remonsta,
but the current app identity is `scribbits` in `package.json` and `devvit.json`.

## Architecture

- `src/shared/arena.ts`: client/server contract and gameplay constants.
- `src/shared/analyzer-core.ts`: deterministic PNG analyzer used by both sides.
- `src/server/index.ts`: Hono server entry point.
- `src/server/routes/api.ts`: REST API mounted at `/api`.
- `src/server/core`: Redis-backed domain logic for arena days, Scribbits, ink,
  clout, battles, forecasts, and daily jobs.
- `src/client/game.ts`: Phaser bootstrapping.
- `src/client/scenes`: game screens.
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

## Verification

Run these before handing off changes:

```bash
npm run verify
```

`npm run verify` runs type-check, lint, simulation tests, and build.

`npm run test:sim` covers deterministic analyzer, battle, storage, daily job,
ink, clout, expiry, and Swiss rumble behavior. It does not replace route or
browser testing.

## Deployment

See `../DEPLOY.md`. First upload/login is interactive; subsequent patch uploads
can use `../deploy.command`.
