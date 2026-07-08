# Deploying Scribbits

The repository folder and older planning docs may still say Remonsta. The
current Devvit app identity is Scribbits: `app/devvit.json` uses
`"name": "scribbits"` and `app/package.json` uses `"name": "scribbits"`.

## One-Time Setup

Install Node 22+ with npm once on the machine, then run these from `app/`
before using the automated deploy script:

```bash
npm ci
npx devvit login
npx devvit upload
```

`npx devvit login` is interactive because it authenticates your Reddit account.

The first `npx devvit upload` must also be manual because Reddit can require one-time app registration and Terms of Service confirmation. After `scribbits` appears in `npx devvit apps list`, `deploy.command` can automate future patch uploads.

OpenCode may not inherit a shell with `node`, `npm`, or `npx` on `PATH`. Use the
repo command files instead of `npm run ...`; they resolve Homebrew/nvm/mise/asdf
Node installs and this Mac's Codex bundled Node runtime, then call local
`app/node_modules/.bin` tools directly.

## Automated Deploy

From the repo root, either double-click `deploy.command` on macOS or run:

```bash
./deploy.command
```

The script runs:

```bash
cd app
tsc --build
eslint 'src/**/*.{ts,tsx}'
node scripts/test-battle.mjs
vite build
devvit whoami
devvit apps list
devvit upload --bump patch
devvit view scribbits version
node scripts/sync-devvit-version.mjs X
git add app/package.json app/package-lock.json
git commit -m "chore: deploy vX"
git push
```

The script refuses to run on a dirty git tree unless `ALLOW_DIRTY_DEPLOY=1` is
set. After upload, it reads the latest uploaded Devvit version, syncs that value
into `app/package.json` and `app/package-lock.json`, then reads
`app/package.json` for the commit message. If there are no git changes after
upload, it skips the commit and push.

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

Treat this as a sensitive secret. If the token expires, rerun `npx devvit login`,
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

Then open `http://localhost:8902/`.

## Troubleshooting

Token expiry: rerun `npx devvit login` from `app/`, then rerun `./deploy.command`.

Name conflicts: if `npx devvit upload` says the app name is unavailable or conflicts with another app, update the name in `app/devvit.json` and `app/package.json`, then run the first upload manually again.

Build failures: fix the reported type-check, lint, simulation, or build error before retrying. The script stops before upload when any check fails.

Missing registration: if `deploy.command` says `scribbits` is not registered, run `npx devvit upload` manually once from `app/`, complete Reddit's prompts, then rerun `./deploy.command`.
