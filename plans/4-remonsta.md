# Game 4: REMONSTA (user's idea, fixed)

**Pitch:** A creature-collecting game where the community IS the ecosystem. Monsters spawn in the daily Wilds post based on the subreddit's collective activity — and every monster in the game was drawn by a redditor. Catch them in a skill minigame, trade in the comments, complete the community Dex together.

**Tagline:** *"Every monster here was made by one of us."*

⚠️ **Identity rule:** zero Pokémon tropes. No balls, no "gotta catch 'em all," original creature designs, original type names. Judges explicitly penalize clones; Devvit rules prohibit others' IP. "Like Pokémon GO" never appears in the submission.

---

## Why it can win (prize mapping)

| Prize | How we hit it |
|---|---|
| Best User Contributions ($3K) | Strongest fit of all 4 plans — the entire monster roster is community-drawn, creators credited on every catch |
| Best App with a Hook ($15K) | Unpredictable spawn windows + collection compulsion + shared Dex goal |
| Best Retention Mechanics ($3K) | Daily spawns, egg streaks, weekend migrations, trading economy |
| Best Use of Phaser ($5K) | Catch minigame, creature animations, habitat scenes |

**vs. the other plans:** stronger than Turf League on cold-start (fun solo from player #1), weaker than Gauntlet on "community behavior is content" — UNLESS the community-designed Dex stays front and center. That's the differentiator; protect it.

## Core loop

1. Open today's **Wilds post** → a Phaser habitat scene with 2–4 monsters currently "out" (spawns rotate on hidden windows through the day)
2. Tap a monster → **catch minigame**: timed lasso arc / shrinking focus ring, difficulty scales with rarity (60 seconds max)
3. Caught → added to your collection; screen credits the artist: *"Emberling #12 — designed by u/scribblequeen (caught 4,203 times)"*
4. Check the **Community Dex**: "r/remonsta has discovered 34/50 species (68%)" — shared completion goal
5. Come back because: spawn windows are unpredictable ("something big stirs after sunset..."), your egg is incubating, and Friday's new community-designed species drops

## The community-as-ecosystem mechanic (replaces GPS)

- **Activity = weather.** Daily comment/upvote volume on the subreddit sets the "climate": quiet day → common spawns; busy day → ecosystem blooms, rare windows open. App announces vaguely: *"The Wilds are restless today."*
- **Collective unlocks:** community Dex milestones (50% discovered) trigger migration events — a legendary appears for 24h, everyone hunts it together, first catcher gets permanent flair credit.
- This makes the community's collective behavior the content — the winning pattern from every past hackathon.

## UGC pipeline (the crown jewel)

1. Weekly **Design-a-Monsta** post: submit a drawing (any skill level — crayon chic encouraged) + name + one-line lore
2. Community upvotes; top 3 get stats/rarity assigned and enter next week's spawn pool
3. Artist credit is permanent and everywhere: catch screen, Dex entry, trade cards
4. MVP ships with 20 dev-made launch species (image-gen'd, style-consistent); pipeline takes over from week 1

**Anti-slop guard:** submitted art is displayed as-is (hand-drawn charm is the aesthetic, like r/alignmentchartFills energy) — no AI-uniformity.

## Retention mechanics

- **Hidden spawn windows:** 4–6/day, rarity-weighted by time + community activity → multiple check-ins, not one
- **Egg streaks:** daily play incubates your egg (hatches day 7 into a streak-exclusive species); miss a day, it cools (grace: 1 freeze/week)
- **Trading:** offer a monster in a comment-anchored trade card; both parties confirm in-app. Duplicate economy drives social negotiation
- **Weekend Migration:** Sat–Sun themed event (swamp species surge) + the weekly new community species Friday drop
- **Flair:** rarest catch + Dex % auto-set as user flair

## Reddit-native features

- Wilds post = daily numbered habit post (auto-created)
- Design submissions + voting = posts/comments doing the content work
- Trades negotiated in comments (comments-as-marketplace, under-exploited per research)
- First-catch and artist credits = status economy
- Community Dex % = subreddit-wide shared goal in the post header

## Tech architecture (Devvit Web + Phaser)

```
client/  Phaser: habitat scene, catch minigame, dex/collection UI, trade cards
server/
  /api/wilds           → current spawns (server decides visibility windows)
  /api/catch-attempt   → server-validated minigame result → award
  /api/dex             → personal + community completion
  /api/trade           → create/accept/cancel offers (atomic Redis transactions)
  /api/submit-design   → UGC queue; /api/design-vote tally
shared/  species schema, rarity tables, spawn-window rules
```

- **Redis:** `species:{id}`, `spawns:{day}` (windows precomputed nightly, hidden from client), per-user collections, `dex:community` counters, trade escrow hashes, egg/streak state
- **Scheduler:** nightly — compute tomorrow's spawn windows from today's activity metrics, create Wilds post, hatch eggs, close design votes (Fri), start migrations (Sat)
- **Realtime:** "3 hunters in the Wilds right now" + live spawn announcements
- **Anti-cheat:** catch results validated server-side (minigame outcome = f(seed, input timings), replayable)

## 13-day schedule

| Days | Deliverable |
|---|---|
| 1–2 | Scaffold; habitat scene + spawn rendering; 6 launch species (image-gen) |
| 3–4 | Catch minigame end-to-end (server-validated) + personal collection/Dex UI |
| 5–6 | Spawn-window engine + activity-as-weather + daily Wilds post cron |
| 7–8 | Remaining 14 launch species; community Dex + first-catch credits + flair |
| 9–10 | Design-a-Monsta pipeline (submit → vote → ingest) + egg streaks |
| 11 | Trading (comment-anchored offers); mobile polish, catch-juice pass |
| 12 | Seed subreddit: launch 20 species, plant 2 community design threads, playtest |
| 13 | Submission package |

**Cut line if behind:** trading ships post-hackathon; UGC pipeline and community Dex never get cut — they're the win condition.

**Risks:** art volume (mitigate: 20 species = 20 images + palette-swap variants); clone perception (mitigate: naming, original mechanics, community-Dex framing everywhere); spawn windows frustrating if too stingy (mitigate: guaranteed 1 common always present).

---

## Image generation prompts (GPT Image first, /imageforce fallback)

**Style anchor (append to every prompt):** `chunky hand-drawn sticker art style with wobbly confident ink outlines, flat sherbet colors with soft paper-grain texture, creatures look like beloved doodles from a talented kid's notebook come alive, warm cream background unless specified, cohesive and charming, deliberately NOT polished-corporate and NOT generic AI creature art, no text unless specified`

1. **Launch species sheet (run 4x with different biomes):**
   `Character sheet of 5 original collectible creature designs for a community monster game, [biome: mossy forest / ember cavern / tidepool / static-cloud sky] theme, each creature a simple bold silhouette with one memorable feature (a snail with a campfire shell, a puddle with sleepy eyes, etc.), front-facing pose plus tiny happy-hop pose, names left blank, transparent background, distinct from any existing franchise creatures, [style anchor]`

2. **Key art / splash:**
   `Game key art: a lush layered wilderness scene at golden hour viewed like a diorama, dozens of charming doodle-creatures peeking from grass, trees, ponds and clouds, one glowing rare creature silhouette half-hidden behind a waterfall, a rope lasso arcing playfully across the sky, sense of "the wild is full and alive", 16:9 with clear top space for logo, [style anchor]`

3. **Catch minigame screen mockup:**
   `Game UI mockup: catch minigame in progress, a chunky doodle-creature bouncing in a meadow clearing, a shrinking dotted focus ring around it, a timing meter with a sweet-spot zone at the bottom, rarity stars top-left, artist credit chip top-right reading style 'design by u/____', mobile portrait, juicy and readable, [style anchor]`

4. **Community Dex screen mockup:**
   `Game UI mockup: a scrapbook-style creature index page, grid of collected creature stickers (some full color, undiscovered ones as gray question-mark silhouettes), big community progress bar reading '34/50 discovered together', small artist credit under each sticker, washi-tape and notebook doodle decorations, mobile portrait, [style anchor]`

5. **Subreddit banner + icon:**
   `Wide banner 1920x384: panoramic doodle wilderness with creatures hiding everywhere rewarding a close look, one lasso flying in from the right edge, warm golden-hour palette, [style anchor]` · Icon: `App icon: one chubby cheerful doodle-creature face (round, big curious eyes, tiny horn nub) on a warm coral circle, bold ink outline, readable at 64px, [style anchor]`
