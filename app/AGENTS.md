You are writing a Devvit web application that will be executed on Reddit.com.

## Tech Stack

- **Frontend**: Phaser, Vite
- **Backend**: Node.js v22 serverless environment (Devvit), Hono
- **Communication**: typed REST contracts in `src/shared/arena.ts` and the
  client wrapper in `src/client/lib/api.ts`

## Layout & Architecture

- `/src/server`: **Backend Code**. This runs in a secure, serverless environment.
  - `index.ts`: Main server entry point.
  - `routes/api.ts`: Hono REST routes mounted at `/api`.
  - `core/`: Redis-backed domain logic for arena days, Scribbits, ink, clout,
    battles, forecasts, and daily jobs.
  - Access `redis`, `reddit`, and `context` here via `@devvit/web/server`.
- `/src/client`: **Frontend Code**. This is executed inside of an iFrame on reddit.com
  - To add an entrypoint, create a HTML file and add to the mapping inside of `devvit.json`
  - Entrypoints:
    - `game.html`: The Phaser game entry point (Expanded View).
    - `splash.html`: The lightweight feed entry point (Inline View). Keep it fast and keep heavy dependencies inside of `game.html`.
- `/src/shared`: **Shared Code**. Code to share between the client and server

## Frontend

### Rules

- Instead of `window.location` or `window.assign`, use `navigateTo` from `@devvit/web/client`

### Limitations

- `window.alert`: Use `showToast` or `showForm` from `@devvit/web/client`
- File downloads: Use clipboard API with `showToast` to confirm
- Geolocation, camera, microphone, and notifications web APIs: No alternatives
- Inline script tags inside of `html` files: Use a script tag and separate js/ts file

## Commands

- From the repository root, `./verify.command` is the supported clean-shell
  verification entry point. It resolves Node/pnpm, installs from
  `pnpm-lock.yaml` when needed, and runs the complete gate.
- `pnpm run type-check`: Check TypeScript types
- `pnpm run lint`: Check the linter
- `pnpm test`: Run discoverable Node suites and the legacy deterministic harness
- `pnpm run test:suites`: Run only discoverable focused suites
- `pnpm run test:sim`: Run only the legacy deterministic harness
- `pnpm run build`: Build client and server bundles

## Code Style

- Prefer type aliases over interfaces when writing typescript
- Prefer named exports over default exports
- Avoid casts. If a browser or Phaser API requires one, keep it local and typed.

## Global Rules

- You may find code that references blocks or `@devvit/public-api` while building a feature. Do NOT use this code as this project is configured to use Devvit web only.
- Whenever you add an endpoint for a new menu item action, ensure that you've added the corresponding mapping to `devvit.json` so that it is properly registered

Docs: https://developers.reddit.com/docs/llms.txt.
