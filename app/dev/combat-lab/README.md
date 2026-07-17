# Combat Lab

This is a developer-only browser harness around the authoritative
`simulateCombat` function. It is deliberately outside `src/client`, uses its
own Vite config, and builds into this folder rather than the Devvit `dist`
bundle.

From `app/`:

```sh
pnpm run combat:lab
pnpm run combat:lab:type-check
pnpm run combat:lab:build
```

Open `http://127.0.0.1:8912`. Role choices apply a legal baseline, while the
raw stat fields remain editable. Power-Up choices use the live catalog and
validation rules. Event summaries and timeline rows enumerate the transcript
generically, so newly introduced event kinds appear without Combat Lab changes.

`pnpm run build` runs the production exclusion verifier. The focused verifier
can also be run with `pnpm run test:combat-lab:exclusion` after a production
build.
