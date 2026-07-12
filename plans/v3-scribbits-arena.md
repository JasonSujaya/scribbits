# PLAN OF RECORD v3.1 — Scribbits: Draw it. Believe in it. Three days to become a legend.

Supersedes the catch/collect loop (v1) and hatch/vote (v2 draft). Retire catch minigame + spawn windows.

## Core loop

1. **Evening forecast** posted daily ("⛈️ Storm winds tomorrow — storm +15%, moss −10%")
2. Player **draws one scribbit per day** (in-app canvas). The drawing IS the stat sheet.
3. **Morning Rumble**: async auto-battle bracket resolves at 00:00 UTC with the new daily post; watchable Phaser replays
4. Winner is crowned **Champion** = tomorrow's boss (frozen snapshot, anyone can challenge, instant resolve)
5. Continue one daily-paced **Founder Rival Thread** through its founder-specific three-page episode (first to two) or use the reward-free Four-Power Practice Lab after the official drawing locks
6. Revisit the newest 20 server-stored fights in the **Battle Scrapbook**; it is a recent reel, not permanent career history
7. Read tonight plus six prior Back pages in the **Scout Notebook**; it is a rolling server-truth view, not another reward track or permanent archive
8. Scribbits live **3 days** → become permanent **Legacy Cards**, with qualifying cards also preserved as public **Legends** (win a crown OR Belief ≥ 25 at expiry)

## Balance invariants (non-negotiable)

- Fixed stat budget: every scribbit's stats sum to exactly 100 — shape decides the split, never the amount (server normalizes)
- Shape→identity (client preview, server analysis): filled/chonk→Inkquake · jagged/spike→three-quill Nib Halo · compact/zip→Smearstep · colorful/charm→Colorburst · dominant hue→element
- Drawing traits tune health, movement, criticals, and the power kit, but no extreme archetype matchup may exceed 65% over slot-swapped seeded regression fights
- Element payloads change tactics rather than applying an opaque matchup multiplier: ember burns · tide knocks back · moss creates a barrier · storm shortens telegraphs
- Equipped accessories are rendered only after analysis and never affect stats or power selection
- Battles simulate server-side at a fixed 20 Hz; clients receive an immutable bounded transcript with 0.5-second motion checkpoints, not authority
- Continuous arena movement, walls, collisions, one Ink Pressure refresh, a fold from 14 seconds, and the 15-second Sudden Scribble rush keep every visible fight inside a 20-second ceiling
- Founder Rival Threads are first to two, advance at most once per Arena day, pin the active founder, and grant no combat power or currency; Page 1/2/3 content is derived from that authoritative score rather than stored separately
- Every Rival page closes with founder-specific result copy selected only after its Chronicle beat and transcript winner agree; narrative text cannot grant rewards or alter the report
- Battle Scrapbook pages may display only saved report facts or validated transcript facts; roster expiry cannot erase player perspective, and result-only archives cannot invent replay motion
- Scout Notebook pages may display only the exact Back, payout, forecast, lifetime Clout, visible pick snapshot, and replay availability projected by the server. Historical identity cannot come from `champion:current`; the rolling view adds no Redis key, prediction odds, reward, title, or combat authority
- Inkcast copy is presentation-only and versioned: its shared 25-bank, 104-line pack may describe only supplied transcript facts and exhausts each bank before authored reuse; the readability queue may omit candidates, and the authoring layer cannot claim rewards, outcomes, future events, or a Colorburst miss before echo resolution
- Practice progression is browser-session-only: the first 4/4 discovery can celebrate once, then target powers and prompt cards rotate without granting or storing rewards
- Care flavor is repo-authored and reward-safe: every Scribbit gets nine distinct Shape-Power-specific moments across its three life days, while the receipt renders only server-confirmed XP and Ink
- Belief preserves a Scribbit as a permanent Legend at 25; it never adds combat
  stats or hidden moves, and its live count freezes when that Scribbit retires
- 1 drawing/day + 1 rumble entry/day, server-enforced. Same-record Swiss pairing. NPC founding scribbits backfill odd/thin brackets
- Champion snapshot gains nothing from boss fights; dethroning pays fame only

## Delight requirements (Opus owns)

- Canvas: chunky brushes, element-palette colors, undo, name your creature;
  validated 32-day optional Doodle Dare calendar plus reward-free bonus twist;
  blank/forming/ready feedback; stat
  preview updates LIVE while drawing; the server enforces the same permissive
  minimum-body threshold as the client
- Care: a short paper-native reaction receipt with the actual drawing,
  power-specific behavior, mood transition, and truthful server-confirmed payout
- Replay: full-height paper arena, drawn textures animated (squash/stretch/idle wobble), readable READY/WINDUP/ACTIVE power states, damage pops, 15-second Sudden Scribble, truthful time/KO verdicts, forecast FX, a transient 900ms Inkcast margin backed by no-repeat fact banks, and return to the originating Battle Scrapbook page
- Battle Scrapbook: newest-20 server reel with fighter art, compact matchup/finish/day rows, owned win/loss perspective, exact verdict/duration/final HP in Replay, honest archived results, and Rumble/Champion priority within a day
- Scout Notebook: canonical fifth tab with seven dated pages, actual pick art/artist/element, exact forecast and filed payout, 48 validated no-repeat notes, privacy-safe unavailable states, and Replay return to the selected day; Field Guide remains secondary
- Death/legend ceremony: fade eulogy card vs Hall of Legends enshrinement
- Everything portrait 720×1280, in-viewport, juicy

## Reddit-native surfaces

Daily numbered Arena post with the current forecast and Champion · nightly idempotent result comment on the resolved thread, pinned best-effort and carrying the next forecast · Champion announcement in the result comment · Belief Legends preserved in the in-app Gallery · comments prompted around Back predictions

**Post-submission opportunities:** announce every newly preserved Legend in comments and add Reddit user flair such as `⚔️ 3-day streak · 1 Legend`.

## Architecture deltas

- Contract: `src/shared/arena.ts` is the source of truth; immutable founder voice, Rival episodes, Doodle Dares, forecast flavor, Scout notes, and versioned Inkcast banks live under `src/shared/` and `src/shared/content/`
- Server: Scribbit lifecycle store; submission uploads validated drawing data URLs through Reddit `media.upload` and fails closed when hosting fails. Production never stores raw PNG bytes in Redis and exposes no drawing-byte endpoint. `/api/drawing/:id` is a local-mock-only fixture route. The server also owns the pure seeded battle engine, rumble/champion/forecast/expiry jobs, Belief, Legends, and a bounded Scout Notebook projection over existing Back/payout/report/forecast keys with no Scout-specific storage. Retire `/api/wilds`, `/api/catch*`, and `/api/design*` routes (the design pipeline becomes Scribbit submission)
- Client: Draw scene, Arena home, Replay scene, Battle Scrapbook, Scout Notebook, and one Gallery scene with Legends, Legacy, and Collection tabs. Retire Habitat/CatchMinigame/CatchResult/Dex
- Founding Scribbits: the 20 authored NPCs use the canonical deterministic procedural-doodle renderer.
- Redis: `scribbit:{id}` · `user:{id}:daily:{day}` flags · `user:{id}:founder-chronicle:v2` + pending receipt hash · `rumble:{day}` entries zset · `battles:{day}:{id}` reports · `champion:current` · `legends` zset · `belief:{scribbitId}` voters hash · `forecast:{day}`

## Task split

- **Codex (server)**: everything under Architecture/server + devvit.json + sim unit tests (node script) + daily post copy
- **Opus (client, creative)**: all scenes + client analyzer (shared spec below) + splash refresh
- **Orchestrator**: contract, seams QC, review dispatch, playtest verification, GitHub pushes

## Analyzer spec (deterministic, both sides reference this)

Input: 512×512 canvas ImageData. inkRatio = inked px / total. jaggedness = outline px count / (2·√(π·inkArea)) clamped 1..3. footprint = bbox area ratio. hues = distinct 30°-bucketed hues with >2% coverage. Raw scores: chonk=inkRatio, spike=(jaggedness−1)/2, zip=1−footprint, charm=min(hues,6)/6 → normalize to sum 100, each stat clamped 10..55 then re-normalized. Element = dominant hue bucket → ember(reds/oranges) tide(blues) moss(greens) storm(purples/yellows). Ties → charm order. Server re-normalizes whatever client sends (clamp + sum=100) — client analyzer is UX, server budget is law.

## Definition of done

Gates green · playtest post shows: draw → stats preview → submit → 20-second server replay → Rival Thread stakes/result → Battle Scrapbook return → Scout Notebook day/replay return → tomorrow's rumble resolves → champion challenge works → Practice remains reward-free → lifespan/legend transitions correct (test with shortened day via debug flag) · pushed to GitHub
