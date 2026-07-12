# Deploying Scribbits

The repository folder and older planning docs may still say Remonsta. The
current Devvit app identity is Scribbits: `app/devvit.json` uses
`"name": "scribbits"` and `app/package.json` uses `"name": "scribbits"`.

## One-Time Setup

Run the repository bootstrap once, then authenticate Devvit from `app/`:

```bash
./verify.command
cd app
pnpm exec devvit login
```

`devvit login` is interactive because it authenticates your Reddit account.

The first upload can require one-time app registration and Terms of Service
confirmation. `deploy.command` uses the same canonical release command for the
first upload and every later patch; complete any interactive prompt it opens.

Codex may not inherit a shell with Node or pnpm on `PATH`. The repository command
files resolve Homebrew/nvm/mise/asdf and the bundled Codex runtime, then install
from `app/pnpm-lock.yaml` when needed.

## Automated Deploy

From the repo root, either double-click `deploy.command` on macOS or run:

```bash
./deploy.command
```

The script checks for a clean git tree and then runs one package command:

```bash
cd app
pnpm run deploy
```

`pnpm run deploy` owns the complete release path: full verification, Devvit
authentication check, and a patch upload. The desktop command, CI, and direct
terminal use all call it. The script refuses a dirty git tree unless
`ALLOW_DIRTY_DEPLOY=1` is set. It never edits package metadata, commits, or
pushes after an upload.

To request public review instead of a private test upload, run `pnpm run launch`
from `app/`. It shares the same `release:check` gate and ends with
`devvit publish --bump patch`.

## GitHub Auto Deploy

`.github/workflows/devvit-auto-deploy.yml` uploads a patch build to Devvit on
every push to `master` that changes the app, scripts, or workflow. It also has a
manual `workflow_dispatch` trigger.

Before it can run, add this repository secret in GitHub:

```bash
DEVVIT_TOKEN_B64
```

Create the value locally only after `devvit login` succeeds:

```bash
base64 < ~/.devvit/token | pbcopy
```

Treat this as a sensitive secret. If the token expires, rerun `pnpm exec devvit login`,
replace the GitHub secret, and rerun the workflow.

## Playtest

Use the configured `dev.subreddit` from `app/devvit.json`:

```bash
./playtest.command
```

Or pass a subreddit name:

```bash
./playtest.command scribbits_dev
./playtest.command r/scribbits_dev
```

`devvit playtest` stays running for live reload and log streaming. Press `Ctrl+C` to stop it.

For browser-only iteration without Reddit login, run:

```bash
./mock.command
```

Then open `http://localhost:8902/`. The command keeps `vite build --watch`
running behind the mock server and injects a local reload hook, so saving client
files rebuilds `dist/client` and refreshes the browser automatically.

## Troubleshooting

Token expiry: rerun `pnpm exec devvit login` from `app/`, then rerun `./deploy.command`.

Name conflicts: if `pnpm exec devvit upload` says the app name is unavailable or conflicts with another app, update the name in `app/devvit.json` and `app/package.json`, then rerun the deploy command.

Build failures: fix the reported type-check, lint, simulation, or build error before retrying. The script stops before upload when any check fails.

Registration prompt: complete Reddit's one-time registration and Terms prompts when the deploy command opens them, then rerun it if the CLI asks you to.
