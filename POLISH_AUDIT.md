# Scribbits Arena Polish Audit

This is the handoff document for continuing polish across Codex sessions and
sub-agents. `GOAL.md` remains the ship-gate summary; this file records the
product-quality bar, current evidence, and the next content decision.

## North star

The complete loop should feel obvious and rewarding on a phone:

`draw -> see a distinct power -> watch the fight -> earn Ink -> discover a cosmetic -> use or display it -> archive a Legacy -> return for the Rumble`

Drawing remains the combat identity. Permanent progression may add expression,
collection status, and reasons to return, but never extra stat budget or enough
power to invalidate the player's drawing choices. Mystery Pens are expressive
sidegrades: their colors can change the 100-point build split, but never its sum.

## Proven foundation

- Server-authored deterministic 20 Hz combat with continuous Phaser playback.
- Four readable drawing powers with bounded pacing and archetype balance gates.
- First-session draw-to-exhibition path proven in the local mobile browser.
- Earned-only Mystery Ink with atomic pulls, permanent discovery, collector
  rank, a visible pity countdown, cosmetic accessories/titles, and expressive
  pen sidegrades that retain the fixed stat budget.
- TypeScript, ESLint, deterministic simulation suite, and production build green
  at the latest completed gate.

## Completed collection iteration

1. Cosmetic metadata now has one shared 28-item source of truth while vector
   accessory painters remain client-only.
2. The Gallery Collection shows discovered art, locked clues, rarity, accessory
   copies, pen swatches, title badges, progress, and mobile-sized paging.
3. The local mock now matches all 28 production drops, including rarity.
4. Regression coverage now checks catalog size, unique IDs, every accessory
   painter, and shared/server/client pen parity.
5. A 390x844 browser pass proved 13/28 collection state, locked and discovered
   details, all five pages, a server-confirmed Rare pull, and persisted 14/28.
6. The same pass proved that the Arena dock remains clickable after camera
   scrolling, the Ink chip no longer covers bracket controls, and first Shape
   Power reveals have stable left/right lanes.

## Completed Legacy iteration

1. Every completed Scribbit receives a versioned, immutable snapshot containing
   its submitted art, final level/XP/record, Belief, dates, accessories, creator
   title metadata, and champion/believed/faded finish.
2. A dedicated personal index supports backward-compatible migration, bounded
   expiry repair, stale-safe cursor pagination, privacy deletion, and strict
   non-combat card DTOs while the public Legend contract remains compatible.
3. The paper-native Legacy Book renders a two-by-two deck, full-color player
   art, graphite/heart-gold/crown-gold finishes, archival detail, dates, frozen
   accessories, creator signatures, and deterministic eulogies.
4. Titles can now be worn or removed from Collection; the equipped title is
   ownership-validated, persists in inventory, and is frozen into the Legacy
   snapshot rather than looked up later.
5. A one-time return ceremony introduces up to three newly archived pages before
   the existing Rumble receipt, with monotonic seen state and no retired combat
   mutation path.
6. Browser proof covered all finish styles, title persistence, two Legacy pages,
   Older/Newer navigation, long-name detail, receipt sequencing, and a clean
   runtime console. The deterministic gate now covers 63 simulation groups,
   including expiry/XP race fencing, idempotent Rumble standings, retryable
   and inventory-watched title snapshots, and insertion-stable Legacy cursors.

## Completed return-loop iteration

1. The overnight scouting receipt can now open the backed Scribbit's last
   actually played Rumble bout. The server stores an order-independent featured
   report index during resolution, validates day, ownership, involvement, and
   moderation, and never lets the client select a report or winner.
2. The same immutable server transcript powers the watchable 15–25 second
   Phaser replay. A returning player can watch, skip, or continue without
   changing the already-resolved result or receiving duplicate rewards.
3. Legacy ceremony -> scouting receipt -> replay -> Legacy Book is one truthful
   chain. Each secondary action names its real destination, and standalone
   replays still return to the Arena.
4. After today's drawing, the Arena replaces the broad progress panel with one
   deterministic Next Goal: enter, Back, open a ready capsule, perform the first
   available care action, or return after the Rumble.
5. The card exposes only useful evidence: XP to next level, Belief/25, days
   left, Ink to capsule, and permanent collection progress. Browser proof
   confirmed capsule-to-care progression and exact +XP/+1 Ink care rewards.
6. Regression coverage now includes retry-safe featured-bout selection and
   purge safety, plus deterministic Next Goal priority, evidence, and
   empty-roster handling.

## Current polish gap

The return, collection, title, completed-run, and reward-reveal loops now have
truthful homes. All four Shape Powers have distinct transcript-driven vignettes
in deterministic coverage; Nib Halo is proven at normal speed in the local
browser. The strongest remaining proof gap is an installed Reddit playtest plus
normal-speed capture of Inkquake, Smearstep, and Colorburst on representative
player drawings. Progression should stay expressive and collectible rather than
add combat power or another currency.

## Completion standard

Do not call the game "super polished" until all of these are evidenced:

- A fresh player understands drawing identity and reaches the first fight.
- A returning player immediately understands the Rumble result and next action.
- Combat is fun to watch at normal speed and every power is visually legible.
- Every earned reward has a visible home and truthful use.
- Collection, life/Legend, scouting, and daily streak loops have no dead ends.
- Mobile browser proof covers draw, battle, reward, collection, and return paths.
- Core domains have clear ownership, bounded files, shared contracts, and tests
  that fail when client/server content drifts.
- Current docs describe actual behavior rather than intended behavior.

Devvit upload is intentionally outside this polish goal.

## Maintainability queue after the collection book

1. Capture golden transcript hashes for fixed combat seeds, then split the
   1,900+ line combat engine behind the unchanged `simulateCombat` facade.
2. Replace the mock's hand-authored battle transcript with the production combat
   facade so browser proof cannot drift from real fights.
3. Extract pure capsule rules and the legacy receipt codec from `inkStore.ts`
   without changing Redis keys, receipt JSON, or transaction ordering.
4. Add route-level contract coverage for replay authorization, receipt-day
   bounds, hidden fighters, and unavailable/stale featured reports.
5. Split the broad Arena route/scene only at the now-proven receipt, Next Goal,
   bracket, and roster boundaries, preserving the current player flow.

These are sequenced after the current content loop because the shared cosmetic
catalog is the authoritative boundary required by the collection UI. Large
scene or route splits should follow observed feature boundaries rather than line
count alone.
