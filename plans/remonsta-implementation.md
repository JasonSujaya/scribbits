# Remonsta — Implementation Plan

Deadline: **July 16, 2026, 8:00am GMT+7** (~12 days). Submission needs: app listing on developer.reddit.com + a public demo post running the game on **its own subreddit**.

---

## Phase 0 — Project + subreddit setup (day 1, morning)

- [ ] `git init` + repo hygiene (this folder; rename dir to drop the `?` — it breaks tooling)
- [ ] Install Devvit CLI: `npm install -g devvit` → `devvit login` (needs your Reddit account)
- [ ] Scaffold: `npm create devvit@latest` → pick the **Phaser Web template** (or clone Reddit's phaser template repo)
- [ ] `devvit playtest` — auto-creates a private test subreddit for dev iteration (this is where we build daily)
- [ ] **Create the production subreddit: r/Remonsta** (fallbacks: r/RemonstaGame, r/RemonstaWilds)
  - Created from your Reddit account (must be mod). Set to public.
  - This is the game's home — demo post lives here, judges play here.
- [ ] Upload app skeleton: `devvit upload` → app appears on developer.reddit.com (this is the app-listing link)

## Phase 1 — Subreddit identity (day 1 afternoon, parallel with Phase 2)

The subreddit IS part of the submission — judges score "Reddit-y" and polish on it.

- [ ] Generate branding via the image prompts in [4-remonsta.md](4-remonsta.md): banner (1920×384), icon, splash art
- [ ] Sidebar/description: 2-line pitch + how to play
- [ ] Rules: 1) Be kind to artists 2) No trade scamming 3) Spoiler-tag rare spawn locations for 1h
- [ ] User flair templates (app-managed): `🥚 Hatchling`, `Dex 34% · rarest: Emberling`, `🎨 Monsta Artist`, `⭐ First Catch`
- [ ] Post flair: `🌿 Daily Wilds`, `🎨 Design-a-Monsta`, `🔁 Trade`, `📣 News`
- [ ] Pinned: "How to Play" post + "Design-a-Monsta #1" thread (seed UGC from day one)

## Phase 2 — Core game (days 1–4)

### File structure
```
src/
  client/                    # Phaser 3
    scenes/Boot, Habitat, CatchMinigame, Dex, Results
    ui/    creatureCard, artistCredit, progressBar
  server/                    # Devvit Web endpoints
    core/  spawnEngine, catchValidator, dexService, tradeService, streakService
    routes/wilds, catch, dex, trade, designs
    jobs/  nightlyTick, createWildsPost, hatchEggs, closeDesignVote
  shared/
    species.ts               # schema: id, name, artist, rarity, biome, spriteKey, lore
    spawnRules.ts, rarity.ts, apiTypes.ts
assets/  creatures/ (20 launch species), habitats/, ui/
```

### Tasks
- [ ] **Species pipeline**: species schema + JSON registry; generate 20 launch creatures (4 biomes × 5) from image prompts, clean to transparent sprites
- [ ] **Habitat scene**: parallax biome background, renders current spawns from `/api/wilds`, tap-to-engage
- [ ] **Catch minigame**: shrinking focus ring + timing lasso; deterministic outcome = f(server seed, tap timings); rarity scales ring speed/size; juicy success/fail feedback
- [ ] **Server validation**: `/api/catch-attempt` replays timings against seed server-side; award atomically (Redis)
- [ ] **Collection + personal Dex UI**: scrapbook grid, gray silhouettes for undiscovered, artist credit on every entry

### Redis schema
```
species:{id}            hash   (defn + artist + catchCount)
spawns:{yyyymmdd}       json   (windows precomputed nightly, never sent to client wholesale)
user:{id}:collection    hash   speciesId → {count, firstCaughtAt}
user:{id}:egg           hash   {progress, lastPlayed, freezesLeft}
dex:community           hash   speciesId → discovered(0/1); counter for %
firstcatch:{speciesId}  string userId
trade:{tradeId}         hash   escrow state machine: open→accepted→settled/cancelled
lb:catches / lb:dex     zset   leaderboards
```

## Phase 3 — The hook systems (days 5–8)

- [ ] **Spawn-window engine**: nightly job computes tomorrow's 4–6 hidden windows; rarity weights scale with yesterday's subreddit activity (comment + upvote counts via Reddit API) — "activity = weather"; guarantee ≥1 common always visible
- [ ] **Daily Wilds post**: scheduler creates numbered post at 00:00 UTC (`Wilds #12 — The air feels electric today...`), teaser copy hints at rare windows
- [ ] **Community Dex**: shared discovery % in post header UI; milestone triggers (50% → 24h legendary migration event)
- [ ] **First-catch credits**: permanent record + auto-flair
- [ ] **Egg streaks**: daily play adds warmth; hatches day 7 into streak-exclusive species; 1 freeze/week grace
- [ ] **Realtime**: live hunter count + "a rare Emberling appeared!" pushes via Devvit realtime channels

## Phase 4 — UGC pipeline (days 9–10) — THE WIN CONDITION, never cut

- [ ] `/api/submit-design`: form (image upload via Devvit media, name, one-line lore) → moderation queue
- [ ] Weekly Design-a-Monsta post: community upvotes in-app; Friday job closes vote
- [ ] Ingest: top 3 get stats/rarity assigned (rarity tier by vote count), enter next spawn pool
- [ ] Artist credit surfaces: catch screen, Dex entry, trade card, `🎨 Monsta Artist` flair
- [ ] Display submissions as-is (hand-drawn charm = the aesthetic; anti-AI-slop)

## Phase 5 — Trading + polish (day 11)

- [ ] Trading: create offer → app comments a trade card on the Wilds post → counterparty accepts in-app → atomic Redis escrow swap. (First feature cut if behind.)
- [ ] Mobile pass: everything in viewport, touch targets ≥44px, portrait-first
- [ ] Juice pass: catch particles, creature idle wobbles, sound (mutable), haptic-feel tweens
- [ ] Error handling: every endpoint returns friendly failures; offline/retry states in client

## Phase 6 — Seed + submit (days 12–13)

- [ ] Install app on r/Remonsta via developer.reddit.com; create Wilds #1
- [ ] Seed: catch a spread of creatures with test accounts so Dex shows life; plant 3–5 design submissions; recruit friends for genuine comments
- [ ] Self-review vs judging criteria: Delightful UX / Polish / Reddit-y / Hook-y — fix worst gaps
- [ ] Devpost submission: app listing link + r/Remonsta demo post link + 60–90s video
- [ ] Optional: developer satisfaction survey (Feedback prize, $200)

## Testing (throughout, per repo standards)

- Unit: spawn-window math, rarity tables, catch validator (seed replay), trade state machine, egg streak logic — pure functions in `server/core` + `shared`
- Integration: each route against a Redis mock; nightly job idempotency (re-run safe)
- E2E: playtest-subreddit smoke script — open post → catch → Dex updates
- Manual daily: real device mobile check in the Reddit app (judges will judge on phones)

## Cut-line order (if behind schedule)
1. Trading → post-hackathon
2. Migrations/milestone events → fake with copy ("coming when we hit 50%")
3. Egg streaks → simple daily streak counter
4. **Never cut:** UGC pipeline, community Dex, artist credits, daily Wilds post
