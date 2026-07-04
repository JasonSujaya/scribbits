# Game 3: TURF LEAGUE

**Pitch:** Subreddit vs subreddit territory war. Every day one shared challenge; your score fights for your faction's hexes on a persistent world map. "We're 2 points behind r/rival" is a stronger pull than any personal streak.

**Tagline:** *"Your karma means nothing here. Your tribe means everything."*

---

## Why it wins (prize mapping)

| Prize | How we hit it |
|---|---|
| Best App with a Hook ($15K) | Tribal identity — Reddit's strongest force, unweaponized by any past winner |
| Best Retention Mechanics ($3K) | Daily battles + weekly seasons + territory decay if your team goes quiet |
| Best Use of Phaser ($5K) | Hex map with conquest animations + the daily minigame arena |
| Best User Contributions ($3K) | Weakest fit — factions vote on strategy, but content is dev-made |

**Differentiation:** none of the 10 example games do team/faction play at subreddit scale. Risk: needs population to feel alive (see mitigation).

## Core loop

1. Open the daily post → pick your faction once (first launch): join a Banner (4 factions at launch, e.g. 🔥 Emberkin, 🌊 Tidecallers, 🌿 Rootborn, ⚡ Stormveil)
2. Play today's 60-second skill minigame (same for everyone — rotating pool)
3. Your score converts to **War Points** for your faction, weighted toward the hex your faction targeted
4. Map updates live: hexes flip when a faction's daily points exceed the defender's
5. Nightly recap post: map delta, MVP players per faction, tomorrow's contested hexes
6. Sunday: season scoring, winning faction gets crown flair + map monument

## Daily minigame rotation (Phaser, all 60s, skill-based)

- **Volley** — timing-based artillery lobs at moving targets
- **Line Rush** — draw a path through a hazard field, speed-scored
- **Stack** — precision tower stacking (tap timing)
- **Echo** — repeat a growing pattern under time pressure
- **Harvest** — frantic collect-and-dodge

Same seed for all players each day → fair, comparable, spectator-friendly. Pool grows post-launch.

## Retention mechanics

- **Faction pull:** you're letting your team down if you skip; daily contribution shown on faction roster
- **Territory decay:** undefended hexes lose 10%/day — teams must show up daily or visibly bleed on the map
- **War Council:** each faction's pinned comment thread votes tomorrow's target hex (top-upvoted hex wins) — comments as game input
- **Personal arc:** rank within faction (Recruit → Champion → Warlord), MVP mentions in nightly recap
- **Seasons:** weekly reset of points but NOT map — territory persists, grudges accumulate
- **Monuments:** season winners get a permanent statue hex with their faction name + top 3 players engraved

## Reddit-native features

- Faction = flair (auto-set, colored): instant visible tribal identity in every comment thread
- War Council = top-comment-decides-strategy (votes-as-input, under-exploited per research)
- Nightly recap post written like a war dispatch (meme-able, screenshot-able)
- Cross-subreddit ambition post-hackathon: factions could map to real subreddits

## Tech architecture (Devvit Web + Phaser)

```
client/  Phaser: hex map scene (pan/zoom, conquest anims) + minigame scenes
server/
  /api/map            → hex ownership + today's contested hexes
  /api/join-faction   → one-time faction assignment (balanced: nudge toward smallest)
  /api/play-start     → daily seed + minigame id
  /api/play-finish    → server-validated score → war points
  /api/council-vote   → target hex voting
shared/  hex grid math, scoring tables, faction defs
```

- **Redis:** `map:hexes` hash, `warpoints:{day}:{faction}` sorted sets, faction rosters, personal ranks
- **Scheduler:** 00:00 UTC — resolve battles, flip hexes, apply decay, create daily post + recap comment, set flairs
- **Realtime:** live war-point ticker during the day ("🔥 12,405 vs 🌊 11,980")
- **Balance:** new players nudged to underdog faction; score normalization by faction size (avg of top 50% contributors, not raw sum — big faction ≠ auto-win)

## 13-day schedule

| Days | Deliverable |
|---|---|
| 1–2 | Scaffold; hex map render + ownership state + faction join flow |
| 3–4 | Minigame #1 (Volley) end-to-end: seed, play, server-scored war points |
| 5–6 | Battle resolution cron, hex flipping + decay, daily post automation |
| 7–8 | Minigames #2–3, War Council voting, live point ticker |
| 9–10 | Ranks, flair automation, nightly war dispatch, season logic + monuments |
| 11 | Minigames #4–5 if time; mobile polish, conquest animation juice |
| 12 | Seed subreddit with 4 faction intro posts; recruit playtesters into different factions |
| 13 | Submission package |

**Risks:** cold-start is CRITICAL — 4 factions × few players = dead map (mitigate: launch with 2 factions and split to 4 at scale; bot minimum-garrison so hexes always contest). Score normalization must be visibly fair or comments turn toxic. This is the highest-risk, highest-ceiling pick of the three.

---

## Image generation prompts (GPT Image first, /imageforce fallback)

**Style anchor (append to every prompt):** `painterly stylized game art with clean graphic shapes, rich saturated faction colors (ember orange, deep teal, moss green, storm violet) on parchment-and-slate neutrals, torn banner and wax seal motifs, board-game-meets-tactics-game aesthetic like Polytopia meets Northgard, NOT generic AI art, no text unless specified`

1. **Key art / splash:**
   `Game key art: dramatic aerial view of a hexagonal territory map mid-war, four armies of tiny stylized banner-carriers converging on a glowing contested center hex, each army trailing its faction color (ember orange, teal, moss green, violet), war banners whipping in wind, torn edges of the map curling like parchment, 16:9 with clear top space for logo, [style anchor]`

2. **Faction crests (set of 4):**
   `Set of 4 faction crest emblems on tattered banner shields: a rising flame with sparks (Emberkin, ember orange), a curling wave with trident tips (Tidecallers, deep teal), a great tree with root ring (Rootborn, moss green), a jagged lightning bolt in a storm ring (Stormveil, violet), consistent heraldic style, transparent background, crisp at small flair size, [style anchor]`

3. **Hex map screen mockup:**
   `Strategy game UI mockup: hexagonal world map with territories tinted in four faction colors, one contested hex glowing white-hot with crossed-swords icon, live score ticker at top reading two faction tallies, bottom bar with PLAY TODAY'S BATTLE button, decay cracks on neglected hexes, small monument statue on one golden hex, mobile portrait, [style anchor]`

4. **Minigame arena (Volley):**
   `Game scene: stylized artillery minigame, a lone catapult on a cliff edge in faction colors lobbing a glowing projectile in a dotted arc toward floating target rings over a canyon, timing meter UI at bottom, painterly clouds, dynamic and readable, [style anchor]`

5. **Subreddit banner + icon:**
   `Wide banner 1920x384: panoramic hex battlefield at dawn, four faction banners planted left to right, contested glowing hex at center, war horns and birds silhouetted, [style anchor]` · Icon: `App icon: single hexagon quartered into four faction colors with crossed banners over it, bold and readable at 64px, [style anchor]`
