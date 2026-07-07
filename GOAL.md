# GOAL: Ship Scribbits Arena for Reddit "Games with a Hook"

**Current identity:** Scribbits Arena. The repo folder is still named
Remonsta, but `app/devvit.json` and `app/package.json` are the app identity
source of truth: `scribbits`.

**Current plan of record:** `plans/v3-scribbits-arena.md`.

## Product

Scribbits Arena is a Devvit Web + Phaser game where Redditors draw one creature
per day, the drawing becomes its stat sheet, and living Scribbits fight in daily
async rumbles. Community belief can turn a short-lived Scribbit into a Legend.

## Scope

- App code lives in `app/`.
- Client/server contract lives in `app/src/shared/arena.ts`.
- Server routes live in `app/src/server/routes/api.ts`.
- Domain logic lives in `app/src/server/core/`.
- Phaser scenes live in `app/src/client/scenes/`.

## Current Ship Gates

- [ ] `npm run verify`
- [ ] Playtest verifies draw -> submit -> arena refresh -> replay/boss/care/back flows.
- [ ] Devvit upload/install/demo post requires user Reddit login and subreddit access.

## Known Cleanup Priorities

- Keep README/AGENTS/current plan aligned with the actual Hono + Phaser code.
- Reduce route transaction complexity in `src/server/routes/api.ts`.
- Split broad domain files when changes naturally touch them.
- Add route-level tests for rollback and API contract behavior.
- Keep generated logs out of git; store only concise evidence summaries when needed.

## Historical Plans

Older Remonsta catch/Dex/Wilds plans are retained as ideation only. They are not
implementation truth unless explicitly revived.
