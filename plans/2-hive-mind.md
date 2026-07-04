# Game 2: HIVE MIND

**Pitch:** One decision a day. Your opponent is all of Reddit. Split or steal, guess ⅔ of the average, outbid the crowd — results resolve at midnight, so you HAVE to come back to see if the hive mind betrayed you.

**Tagline:** *"You didn't lose to a game. You lost to 40,000 strangers."*

---

## Why it wins (prize mapping)

| Prize | How we hit it |
|---|---|
| Best App with a Hook ($15K) | Built-in open loop: every play forces a return visit for the reveal |
| Best Retention Mechanics ($3K) | Daily resolution cliffhanger + streaks + rank ladder |
| Best User Contributions ($3K) | Weekly community-submitted dilemmas, voted into rotation |
| Best Use of Phaser ($5K) | Weakest fit — animated reveal ceremony only |

**Differentiation:** near-zero prior art on Devvit. Maximally "Reddit-y" (the community IS the opponent) without being about Reddit. The comment section becomes negotiation and psyops — exactly what judges said wins.

## Core loop

1. Open today's post → one dilemma, e.g. **SPLIT or STEAL** (everyone splits: +10; you steal while most split: +25; too many steal: everyone gets 0)
2. Lock in your choice (10 seconds of gameplay) → see live count of players locked in, NOT their choices
3. Comment thread erupts: promises, lies, alliances, screenshots of "I swear I split"
4. Midnight UTC: animated **Reveal Ceremony** — distribution bar fills up dramatically, your payout lands, rank updates
5. Tomorrow: new dilemma type

## Daily dilemma rotation (7 core types)

- **Split/Steal** — classic prisoner's dilemma vs the crowd average
- **⅔ of Average** — pick 0–100, closest to ⅔ of the mean wins the pot
- **Crowded Door** — pick 1 of 5 doors; the LEAST-picked door pays out
- **The Auction** — bid play-money on a prize; Vickrey rules (winner pays 2nd price)
- **Grim Trigger** — co-op pot grows daily until any 5% defect, then it burns (multi-day tension!)
- **Trust Fall** — pair-matched with one anonymous redditor, classic PD, their username revealed after
- **Hive Poll** — predict what % of players will answer X (Family-Feud-style calibration)

**UGC angle:** submit-a-dilemma form; weekly community vote picks Saturday's "Community Dilemma," creator credited in the post title.

## Retention mechanics

- **The Reveal:** you cannot know your result at play time — structurally guaranteed return visit
- **Multi-day arcs:** Grim Trigger pots span days; app comments daily "The pot is at 34,500. Nobody has defected. Yet."
- **Rank ladder:** Drone → Worker → Scout → Queen's Guard → Hive Lord (shown as user flair)
- **Streak insurance:** miss a day, spend banked honey to preserve streak — soft forgiveness loop
- **Prediction stats:** "You've been betrayed 12 times. You've betrayed 3 times." Persistent identity card, shareable

## Reddit-native features

- Comments ARE the metagame (negotiation, lying, coordination attempts) — zero extra code, maximum judge appeal
- App pins nightly result comment: "68% split. The stealers feast tonight."
- Flair = rank + reputation (e.g. `Hive Lord · 92% cooperator`)
- Subreddit-scale stat lines: "r/gaming players steal 2x more than r/aww players" (viral screenshot material)

## Tech architecture (Devvit Web)

```
client/  Lightweight animated UI (can be plain React/canvas; Phaser for reveal ceremony)
server/
  /api/today          → dilemma config + locked-in count
  /api/lock-choice    → one write per user per day (Redis SETNX)
  /api/reveal/{day}   → distribution + personal payout (post-resolution only)
  /api/submit-dilemma → UGC queue
shared/  dilemma type definitions + payout functions (pure, unit-testable)
```

- **Redis:** `choices:{day}` hash, `pot:global`, sorted sets for honey leaderboard, streak hashes
- **Scheduler:** 00:00 UTC resolve + create tomorrow's post + pin result comment + update flairs
- **Realtime:** live locked-in counter ticking up (social proof, urgency)
- **Anti-cheat trivial:** server-side single write per user, choices hidden until resolution

## 13-day schedule

| Days | Deliverable |
|---|---|
| 1–2 | Scaffold; choice UI + lock-in + Redis writes; Split/Steal end-to-end |
| 3–4 | Resolution cron + payout engine (pure functions, tested) + daily post automation |
| 5–6 | Reveal Ceremony animation (Phaser scene: bar race, payout burst, rank-up) |
| 7–8 | Remaining 5 dilemma types (data-driven configs) + Grim Trigger multi-day state |
| 9–10 | Ranks, flair automation, streak insurance, identity stat card |
| 11 | Dilemma submission form + weekly community vote; mobile polish |
| 12 | Seed subreddit, fake-tension copywriting, playtest with friends |
| 13 | Submission package |

**Risks:** low player count makes crowd games feel dead (mitigate: bots seeding minimum population the first week, honest label "the hive is small but growing"); reveal timing across timezones (mitigate: countdown timer everywhere).

---

## Image generation prompts (GPT Image first, /imageforce fallback)

**Style anchor (append to every prompt):** `bold flat vector illustration with subtle grain texture, near-black charcoal background, electric honey-yellow and warm white with one violet accent, strong geometric shapes, hexagon motif throughout, high contrast, modern editorial game aesthetic like Alto's Odyssey meets a heist poster, NOT generic AI art, no text unless specified`

1. **Key art / splash:**
   `Game key art: one small lone figure silhouette standing before a colossal glowing wall of thousands of hexagonal cells, each hex containing a faceless silhouette, the wall curves around them like an amphitheater of judgment, single shaft of honey-yellow light on the lone figure, ominous but playful mood, 16:9 with clear space top-center for logo, [style anchor]`

2. **Dilemma cards (set of 7):**
   `Set of 7 flat vector game card illustrations on hexagonal frames: two hands shaking with one hand hiding crossed fingers (split/steal), a bell curve with an arrow at two-thirds (average game), five doors with one glowing (crowded door), an auction gavel over coins (auction), a growing pot of gold with a lit fuse (grim trigger), two masked figures back to back (trust fall), a pie chart with an eye (poll), consistent iconographic style, transparent background, [style anchor]`

3. **Reveal Ceremony screen:**
   `Game UI mockup of a dramatic results reveal: giant vertical percentage bar split between SPLIT and STEAL sides filling with honeycomb cells, confetti of hex particles, payout number bursting in the center '+250 🍯', rank badge glowing at bottom, dark UI with honey-yellow data visualization, mobile portrait, [style anchor]`

4. **Rank badge set:**
   `Set of 5 progression rank badges in ascending grandeur: simple hexagon (Drone), hexagon with wings (Worker), hexagon with antenna scope (Scout), ornate hexagon with spears (Queen's Guard), crowned radiant hexagon (Hive Lord), flat vector with gold foil feel, transparent background, [style anchor]`

5. **Subreddit banner + icon:**
   `Wide banner 1920x384: honeycomb lattice stretching across, most cells dark with silhouettes, a few cells glowing yellow revealing choices, one violet traitor cell, cinematic spotlight, [style anchor]` · Icon: `App icon: minimal glowing hexagon containing a single eye, honey-yellow on charcoal, readable at 64px, [style anchor]`
