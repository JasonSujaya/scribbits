# Game 1: THE GAUNTLET ⭐ (recommended)

**Pitch:** Reddit's ever-growing death course. Every day the community adds one new section — built from traps placed by yesterday's survivors. Beat today's section, place your trap, get credited on every death screen you cause tomorrow.

**Tagline:** *"Day 47. The Gauntlet is 47 sections long. It only gets worse."*

---

## Why it wins (prize mapping)

| Prize | How we hit it |
|---|---|
| Best App with a Hook ($15K) | Persistent world that visibly grows daily + "my trap is live tomorrow" appointment mechanic |
| Best Use of Phaser ($5K) | Physics runner, ghost replays, death heatmaps, particle-heavy trap effects |
| Best Retention Mechanics ($3K) | Daily section drop, streak flair, kill credits, weekly leaderboard resets |
| Best User Contributions ($3K) | The level IS user content — every trap placed by a player |

**Differentiation from r/honk (615K, posts-as-levels):** honk is a feed of individual creator levels. The Gauntlet is ONE shared course everyone builds together — exquisite corpse, not a level browser. No example game has a persistent accumulating world.

## Core loop (30 seconds to explain)

1. Open today's post → run the newest section of the course (60–90s, precision auto-runner with jump/dash)
2. Die → death screen credits the trap's creator: *"Killed by u/spez's spike pit (847 kills)"*
3. Beat the section → earn a **Trap Token** → place ONE trap/helper into tomorrow's section slot
4. Tomorrow: new section goes live built from today's placements; you race ghost replays of other redditors

## Retention mechanics

- **Persistent growth:** Day N = N sections. Checkpoints every 5 sections. "How deep did you get?" is the daily comment ritual.
- **Kill credits:** leaderboard of deadliest traps; your trap racking up kills overnight is the reason to check back.
- **Streak flair:** user flair auto-set to `🔥 12-day streak · Depth 34` via Reddit API.
- **Ghosts:** race translucent replays of the top 5 + 5 random players (positions recorded at 10Hz, stored in Redis).
- **Weekly Deep Run:** every Sunday, a full-course marathon from Section 1; survivors get a permanent flair badge.
- **Death heatmap post-game:** where everyone died today, auto-commented by the app each night.

## Reddit-native features

- Daily numbered post auto-created by Scheduler (like Hot and Cold #333) → habit + FOMO
- Comments = strategy + trash-talk about whose trap is BS; app pins "Trap of the Day" comment
- Upvotes on the daily post = community health metric judges see immediately
- Flair as status economy (streak, depth, "Architect" badge for 100+ kills)

## Trap placement (the UGC editor)

Beat the section → simple grid editor (Phaser scene): pick 1 of ~12 trap types (spike pit, crusher, swinging blade, fake floor, wind gust, ice patch) or 3 helper types (spring, checkpoint candle, coin), drag onto tomorrow's section slot. Server validates: max density per cell, must-be-passable check (headless pathability sim before section is finalized at midnight UTC).

**Anti-grief:** each day's section is composed from ~30 randomly selected valid placements weighted by placer streak; nightly bot-run pathability check guarantees completability.

## Tech architecture (Devvit Web + Phaser)

```
client/  Phaser 3 game (runner scene, editor scene, results scene)
server/  Devvit Web endpoints (Node)
  /api/run-start      → today's section data + 10 ghosts
  /api/run-finish     → validate time, store ghost, award trap token
  /api/trap-place     → validate + store placement
  /api/leaderboard    → sorted-set reads
shared/  section schema, trap definitions
```

- **Redis:** `section:{day}` (compiled level JSON), `ghosts:{day}` (top runs), `kills:{trapId}` counters, sorted sets for leaderboards/streaks
- **Scheduler (cron):** 00:00 UTC — compile tomorrow's section from placements, run pathability sim, create daily post, post death-heatmap comment, update flairs
- **Realtime:** live "players in the gauntlet right now" counter on splash
- **Server-authoritative anti-cheat:** finish time sanity-checked against ghost physics bounds

## 13-day schedule

| Days | Deliverable |
|---|---|
| 1–2 | Scaffold from Devvit Phaser template; runner core (move/jump/dash, death, one hardcoded section) |
| 3–4 | Section compiler + trap system (12 traps as data-driven prefabs); Redis schemas |
| 5–6 | Trap placement editor + nightly compile cron + pathability validator |
| 7–8 | Ghosts (record/replay), kill credits, death screens, streak flair |
| 9–10 | Daily post automation, leaderboards, death heatmap, onboarding/splash |
| 11 | Mobile polish (touch controls: tap=jump, hold=dash), juice pass (particles, screenshake, SFX) |
| 12 | Seed subreddit: pre-build sections 1–5 ourselves so day-1 judges see a grown world; playtest |
| 13 | Submission: app listing, demo post, video, Devpost writeup |

**Risks:** trap editor scope (mitigate: grid snap, 12 trap types max); griefing (mitigate: pathability sim); cold start (mitigate: pre-seed 5 sections + bot ghosts).

---

## Image generation prompts (GPT Image first, /imageforce fallback)

**Style anchor (append to every prompt):** `chunky 32px-grid pixel art, rich dark cave palette with glowing amber torchlight and cyan magic accents, crisp pixel clusters, no anti-aliasing blur, cohesive retro-modern indie game style like Celeste meets Spelunky, NOT generic AI art, no text unless specified`

1. **Hero character (Sir Squish, sprite sheet):**
   `Pixel art sprite sheet of a small round gummy-jelly knight character, translucent wobbly cherry-red body with tiny silver helmet and determined eyes, 8 frames: idle, run cycle x3, jump, dash with motion streaks, squish-death splat, victory pose. Side view, transparent background, 64x64 per frame, [style anchor]`

2. **Key art / splash screen:**
   `Video game key art, a tiny gummy-jelly knight with silver helmet stands at the entrance of an impossibly long torch-lit stone gauntlet corridor stretching into darkness, filled with visible spike pits, swinging blades and crushers fading into the distance, dozens of translucent ghost silhouettes of past players running ahead, dramatic amber and cyan lighting, wide 16:9 composition with empty space at top for logo, [style anchor]`

3. **Trap tileset:**
   `Pixel art game tileset sprite sheet on transparent background: spike pit, ceiling crusher block with chains, swinging pendulum blade, crumbling fake floor tile, wind gust vent with air particles, ice patch tile, spring pad, glowing checkpoint candle, gold coin, stone floor/wall/platform tiles in 3 variants, 32x32 grid-aligned, [style anchor]`

4. **Death screen mockup:**
   `Game over UI screen mockup, dark stone background, big pixelated splat of red jelly, headline text 'SPLATTED', subtitle card reading 'Killed by u/TrapMaster99's Spike Pit — 847 victims', ghost replay button and retry button, kill-credit skull icon, mobile portrait layout, [style anchor]`

5. **Subreddit banner + icon:**
   `Wide subreddit banner 1920x384, side-scrolling cross-section of an endless stone gauntlet with numbered sections (1, 2, 3...) each containing a different pixel art trap, tiny gummy knights running/dying/celebrating throughout, torchlight, [style anchor]` · Icon: `App icon, cute round gummy-jelly knight face with silver helmet on dark circular background with amber glow rim, bold and readable at 64px, [style anchor]`
