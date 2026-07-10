# Scribbits Arena — Submission Package

Deadline: **July 16, 2026 at 08:00 WIB**.

## One-line hook

Draw a creature. Its shape becomes its combat build. Redditors back it. At
midnight the doodle comes alive and fights, with three days to become a Legend.

## Devpost description

Scribbits Arena turns Reddit drawings into living asynchronous fighters. Every
day, each player draws one creature directly inside the post. The server reads
the submitted PNG and normalizes it into a fair 100-point build: large shapes
gain HP, jagged outlines gain attack, small footprints gain speed, and colorful
drawings gain critical chance.

Every drawing enters the nightly community Rumble. Players also get one daily
Back: predict the Champion to earn permanent Scout Clout. Results are published
back into the real Reddit thread, creating a daily conversation around player
art, matchups, weather, and predictions.

Scribbits live for three days. A crown or enough community Belief saves one in
the permanent Hall of Legends. Phaser makes the actual submitted PNG breathe,
lunge, squash, crumple, and celebrate during watchable battle replays.

## Judging story

- **Delightful UX:** feed card identifies the next action; new players start on
  the canvas; live stat feedback explains every stroke; the first submission
  immediately fights.
- **Polish:** portrait layout, paper visual identity, responsive controls,
  deterministic simulation, error states, mobile-safe navigation, UGC
  report/delete controls, and a full verification gate.
- **Reddit-y:** real Reddit identity, player drawings, daily custom posts,
  Belief, Back/Clout competition, and app-authored result comments using actual
  Rumble data.
- **Hook-y:** one daily drawing, a locked prediction, overnight anticipation,
  a visible daily streak, permanent Scout Clout, and a three-day life-or-Legend arc.
- **Phaser:** the player's submitted bitmap is tiled and deformed at runtime for
  breathing, lunges, hit squash, KO crumple, weather effects, camera punches,
  cheering, and replay controls.

## 60-second demo

1. **0–6s:** Show the Scribbits Reddit feed card: “Its shape becomes its stats.”
2. **6–20s:** Draw a pointed, colorful creature; show HP/ATK/SPD/CRIT moving.
3. **20–29s:** Name and submit it; capture the “IT'S ALIVE” reveal.
4. **29–42s:** Show that exact drawing breathing, lunging, and taking a hit in
   its first exhibition.
5. **42–51s:** Back another player’s contender and show the Rumble countdown.
6. **51–60s:** Show the next-day Champion, Clout payout, Legend Gallery, and the
   result comment in the Reddit thread.

## Required links and proof

- [ ] Devvit app listing: `https://developers.reddit.com/apps/scribbits`
- [ ] Public demo subreddit: `<add URL>`
- [ ] Public post running the current build: `<add URL>`
- [ ] Public demo video under one minute: `<add URL>`
- [ ] Current revision uploaded and installed.
- [ ] Mobile and desktop Reddit playtest completed with a fresh account.
- [ ] Draw → submit → first fight → Back → nightly result comment proven.
- [ ] Significant June 17–July 15 updates summarized in the Devpost entry.

## Significant hackathon-period work

- Replaced the earlier catch/collection direction with the current daily
  draw-to-stats Rumble loop.
- Added deterministic server-side PNG analysis and fair stat normalization.
- Added daily Back predictions, Clout payouts, three-day lifecycle, Belief, and
  Legends.
- Added deforming Phaser replay sprites, battle ceremony, weather, cheer meter,
  first-session exhibition, and the living-paper interface.
- Added real Reddit post scheduling and idempotent result comments.
- Added deterministic simulations, mock first-player QA, deployment automation,
  and the submission proof workflow.
