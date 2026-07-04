# PLAN OF RECORD v3.1 — Scribbits: Draw it. Believe in it. Three days to become a legend.

Supersedes the catch/collect loop (v1) and hatch/vote (v2 draft). Retire catch minigame + spawn windows.

## Core loop
1. **Evening forecast** posted daily ("⛈️ Storm winds tomorrow — storm +15%, moss −10%")
2. Player **draws one scribbit per day** (in-app canvas). The drawing IS the stat sheet.
3. **Morning Rumble**: async auto-battle bracket resolves at 00:00 UTC with the new daily post; watchable Phaser replays
4. Winner is crowned **Champion** = tomorrow's boss (frozen snapshot, anyone can challenge, instant resolve)
5. Scribbits live **3 days** → fade to Sketchbook, or become **Legends** (win a crown OR belief ≥ 25 at expiry)

## Balance invariants (non-negotiable)
- Fixed stat budget: every scribbit's stats sum to exactly 100 — shape decides the split, never the amount (server normalizes)
- Shape→stats (client analyzer, deterministic): ink coverage→chonk(HP) · outline jaggedness→spike(ATK) · smaller footprint→zip(SPD) · distinct hues→charm(crit) · dominant hue→element
- Element triangle: ember>moss>storm>tide>ember (+25% / −25%); forecast adds ±15% to one element
- Battle variance: ±10% dice per hit; charm scales crit chance (max 25%)
- Belief unlocks a 3rd move at 10 belief; never raw stats. Belief dies with the scribbit
- 1 drawing/day + 1 rumble entry/day, server-enforced. Same-record Swiss pairing. NPC founding scribbits backfill odd/thin brackets
- Champion snapshot gains nothing from boss fights; dethroning pays fame only

## Delight requirements (Opus owns)
- Canvas: chunky brushes, element-palette colors, undo, name your creature; stat preview updates LIVE while drawing ("more spikes! it's getting stabby")
- Replay: drawn textures animated (squash/stretch/idle wobble), damage pops, KO dramatics, forecast weather FX
- Death/legend ceremony: fade eulogy card vs Hall of Legends enshrinement
- Everything portrait 720×1280, in-viewport, juicy

## Reddit-native surfaces
Daily numbered post (Rumble results + today's arena) · forecast comment pinned nightly · champion + legend announcements as comments · flair: `⚔️ 3-day streak · 1 Legend` · comments = meta discourse

## Architecture deltas
- Contract: `src/shared/arena.ts` (NEW — source of truth, already written by orchestrator)
- Server: scribbit lifecycle store, submission (media.upload from dataURL; fallback: PNG bytes in redis + GET /api/drawing/:id), battle engine (pure + seeded), rumble/champion/forecast/expiry jobs, belief, legends. Retire /api/wilds, /api/catch*, /api/design* routes (design pipeline morphs into scribbit submission)
- Client: Draw scene, Arena home, Replay scene, Sketchbook/Legends scenes. Retire Habitat/CatchMinigame/CatchResult/Dex
- Founding scribbits: reuse the 20 species as NPC roster (their art = generated sprites when ready)
- Redis: `scribbit:{id}` · `user:{id}:daily:{day}` flags · `rumble:{day}` entries zset · `battles:{day}:{id}` reports · `champion:current` · `legends` zset · `belief:{scribbitId}` voters hash · `forecast:{day}`

## Task split
- **Codex (server)**: everything under Architecture/server + devvit.json + sim unit tests (node script) + daily post copy
- **Opus (client, creative)**: all scenes + client analyzer (shared spec below) + splash refresh
- **Orchestrator**: contract, seams QC, review dispatch, playtest verification, GitHub pushes

## Analyzer spec (deterministic, both sides reference this)
Input: 512×512 canvas ImageData. inkRatio = inked px / total. jaggedness = outline px count / (2·√(π·inkArea)) clamped 1..3. footprint = bbox area ratio. hues = distinct 30°-bucketed hues with >2% coverage. Raw scores: chonk=inkRatio, spike=(jaggedness−1)/2, zip=1−footprint, charm=min(hues,6)/6 → normalize to sum 100, each stat clamped 10..55 then re-normalized. Element = dominant hue bucket → ember(reds/oranges) tide(blues) moss(greens) storm(purples/yellows). Ties → charm order. Server re-normalizes whatever client sends (clamp + sum=100) — client analyzer is UX, server budget is law.

## Definition of done
Gates green · playtest post shows: draw → stats preview → submit → tomorrow's rumble resolves → replay watchable → champion/boss challenge works → lifespan/legend transitions correct (test with shortened day via debug flag) · pushed to GitHub
