# Deploying Scribbits

## One-Time Setup

Run these from `app/` before using the automated deploy script:

```bash
npx devvit login
npx devvit upload
```

`npx devvit login` is interactive because it authenticates your Reddit account.

The first `npx devvit upload` must also be manual because Reddit can require one-time app registration and Terms of Service confirmation. After `scribbits` appears in `npx devvit apps list`, `deploy.command` can automate future patch uploads.

## Automated Deploy

From the repo root, either double-click `deploy.command` on macOS or run:

```bash
./deploy.command
```

The script runs:

```bash
cd app
npm run type-check
npm run lint
npm run build
npx devvit whoami
npx devvit apps list
npx devvit upload --bump patch
npx devvit view scribbits version
npm version --no-git-tag-version --allow-same-version X
git add -A
git commit -m "chore: deploy vX"
git push
```

After upload, it reads the latest uploaded Devvit version, syncs that value into `app/package.json` and `app/package-lock.json`, then reads `app/package.json` for the commit message. If there are no git changes after upload, it skips the commit and push.

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

## Troubleshooting

Token expiry: rerun `npx devvit login` from `app/`, then rerun `./deploy.command`.

Name conflicts: if `npx devvit upload` says the app name is unavailable or conflicts with another app, update the name in `app/devvit.json` and `app/package.json`, then run the first upload manually again.

Build failures: fix the reported `npm run type-check`, `npm run lint`, or `npm run build` error before retrying. The script stops before upload when any check fails.

Missing registration: if `deploy.command` says `scribbits` is not registered, run `npx devvit upload` manually once from `app/`, complete Reddit's prompts, then rerun `./deploy.command`.
