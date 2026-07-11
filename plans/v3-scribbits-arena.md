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
- Shape→identity (client preview, server analysis): filled/chonk→Inkquake · jagged/spike→three-quill Nib Halo · compact/zip→Smearstep · colorful/charm→Colorburst · dominant hue→element
- Drawing traits tune health, movement, criticals, and the power kit, but no extreme archetype matchup may exceed 65% over slot-swapped seeded regression fights
- Element payloads change tactics rather than applying an opaque matchup multiplier: ember burns · tide knocks back · moss creates a barrier · storm shortens telegraphs
- Equipped accessories are rendered only after analysis and never affect stats or power selection
- Battles simulate server-side at a fixed 20 Hz; clients receive an immutable bounded transcript with 0.5-second motion checkpoints, not authority
- Continuous arena movement, walls, collisions, one Ink Pressure refresh, arena shrink, and late-fight pressure keep visible fights within roughly 15–25 seconds
- Belief preserves a Scribbit as a permanent Legend at 25; it never adds combat
  stats or hidden moves, and its live count freezes when that Scribbit retires
- 1 drawing/day + 1 rumble entry/day, server-enforced. Same-record Swiss pairing. NPC founding scribbits backfill odd/thin brackets
- Champion snapshot gains nothing from boss fights; dethroning pays fame only

## Delight requirements (Opus owns)

- Canvas: chunky brushes, element-palette colors, undo, name your creature;
  optional deterministic daily Doodle Dare; blank/forming/ready feedback; stat
  preview updates LIVE while drawing; the server enforces the same permissive
  minimum-body threshold as the client
- Replay: drawn textures animated (squash/stretch/idle wobble), damage pops, KO dramatics, forecast weather FX
- Death/legend ceremony: fade eulogy card vs Hall of Legends enshrinement
- Everything portrait 720×1280, in-viewport, juicy

## Reddit-native surfaces

Daily numbered Arena post with the current forecast and Champion · nightly idempotent result comment on the resolved thread, pinned best-effort and carrying the next forecast · Champion announcement in the result comment · Belief Legends preserved in the in-app Gallery · comments prompted around Back predictions

**Post-submission opportunities:** announce every newly preserved Legend in comments and add Reddit user flair such as `⚔️ 3-day streak · 1 Legend`.

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
