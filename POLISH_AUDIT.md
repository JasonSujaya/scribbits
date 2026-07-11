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

## Completed first-draw iteration

1. The empty canvas now states the product promise before asking for creativity:
   `DRAW IT. WATCH IT FIGHT.` and `DRAW -> WATCH IT FIGHT -> EARN INK`.
2. Sixteen optional Doodle Dares provide four prompts for each Shape Power. The
   selection is deterministic per UTC day and player, and every card explicitly
   allows drawing anything instead.
3. Blank, forming, and ready states progressively reveal the live Shape Power;
   the dormant element and neutral 25-point preview no longer pretend an empty
   canvas is already a fighter.
4. The client and production route share a 1,500-pixel minimum-body rule, closing
   the one-brush-tap submission path without requiring a large or filled drawing.
5. Fresh mobile browser proof covers empty prompt, forming feedback, full draw,
   birth, animated exhibition, Skip, and truthful Inkcast Recap with zero runtime
   errors. A zero-recoil Nib Halo edge case is regression-locked as replayable.

## Completed collection iteration

1. Cosmetic metadata now has one shared 36-item source of truth while vector
   accessory painters remain client-only.
2. The Gallery Collection shows discovered art, locked clues, rarity, accessory
   copies, pen swatches, title badges, progress, and mobile-sized paging.
3. The local mock now derives all 36 production drops, including rarity, from
   the shared catalog.
4. Regression coverage now checks catalog size, unique IDs, every accessory
   painter, and shared/server/client pen parity.
5. The original 28-item 390x844 browser pass proved 13/28 collection state,
   locked and discovered details, all five pages, a server-confirmed Rare pull,
   and persisted 14/28.
6. The same pass proved that the Arena dock remains clickable after camera
   scrolling, the Ink chip no longer covers bracket controls, and first Shape
   Power reveals have stable left/right lanes.
7. Eight cosmetic Shape Power Relics now connect collection progress to combat
   identity without adding stats: two per power with an exact 4 Common, 2 Rare,
   2 Epic allocation. WebGL and Canvas browser passes proved the new 36-item,
   six-page Collection and every new relic painter with zero runtime errors.

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
   runtime console. The deterministic gate now covers 78 simulation groups,
   including expiry/XP race fencing, idempotent Rumble standings, retryable
   and inventory-watched title snapshots, and insertion-stable Legacy cursors.

## Completed return-loop iteration

1. The overnight scouting receipt can now open the backed Scribbit's last
   actually played Rumble bout. The server stores an order-independent featured
   report index during resolution, validates day, ownership, involvement, and
   moderation, and never lets the client select a report or winner.
2. The same immutable server transcript powers the watchable, up-to-25-second
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

## Completed battle-feel and fair-growth iteration

1. Damage events now select a deterministic impact tier from authoritative
   damage/max-HP data. Phaser adds micro-hitstop, camera punch, ink rings,
   particles, scaled damage copy, and a lagging HP-loss bar without changing the
   transcript cursor or result.
2. The shrinking combat bounds now visibly fold inward instead of being scaled
   back to a fixed screen rectangle. Sudden Scribble, shields, powers, knockout,
   and victory receive optional low-volume synthesized cues with mute.
3. Reduced-motion presentation removes new hitstop, shake, and moving impact
   particles while preserving HP, arena, mastery, and outcome truth.
4. Level growth is capped at +1.5% damage over the complete level 1 -> 5 arc.
   Slot-swapped simulations keep max-level equal-build wins at or below 60%
   across balanced and four dominant-stat drawings.
5. Swiss matching uses record first and closest level second, floats odd score
   groups into the adjacent bracket, gives every entrant one fight each round,
   and repairs avoidable rematches. Element and drawing archetype are excluded.
6. Browser proof covers WebGL and Canvas battle paths with exact drawing art,
   mastery copy, power callout, impact damage, arena folds, outcome ceremony,
   and zero captured runtime errors on `localhost:8902`.
7. The theater now exposes one combat model. Turn-beat fallback code and the
   outcome-neutral cheer meter are gone. New reports no longer generate the
   deprecated turn-style projection; old event-only records remain readable as
   clearly labeled archived-result summaries during migration.
8. The live fight now reads as a paper sports broadcast rather than a static
   report: one expanded movement field replaces fixed podiums, drawings render
   larger over moving shadows, mirrored HP bars flank an authoritative countdown,
   and a compact Inkcast ticker replaces the oversized announcer card.
9. Founding opponents no longer collapse into generic round fallback blobs.
   Their deterministic procedural anatomy varies continuously with all four
   stats, while the dominant stat supplies the strongest readable silhouette cue.
10. Every element x Shape Power pairing now has one authored signature identity,
    while transcript-derived dodge, dead-zone, Halo Guard, and element stamps
    expose the simulator's existing counterplay without altering combat math.
11. Replay event presentation is split into exhaustive lifecycle, damage/status,
    arena/collision, and battle-flow presenters. Unknown powers fail closed,
    truncated transcripts reconcile from authoritative checkpoints, and fixed
    production/mock transcript hashes guard deterministic drift. A short effect
    schedule may truthfully cross the 25-second bell without invalidating the
    saved replay, while unbounded future schedules still fail validation.
12. Final checkpoints must match authoritative result HP and fighter order.
    Barrier hits carry exact source and activation metadata, so body contact can
    no longer suppress a truthful Shape Power miss/counter callout. Legacy
    metadata-less barrier events remain visual but make no connection claim.
13. Swiss pairing now repairs rematches across completed score groups without
    worsening record quality, then closest-level quality. A deterministic
    postcondition and multi-day six-player regression guard the champion and
    reward path from avoidable repeat pairings.
14. A pure transcript-to-recap planner now owns the post-fight truth: exact
    finish reason, final HP, winner damage, signature identity, and actual
    biggest or terminal hit. The Phaser adapter only renders that plan; it does
    not reinterpret the top-level report or invent tactical explanations. One
    shared result gate rejects mismatched visible fighter IDs and finish reasons
    that contradict terminal HP before storage or live replay can use them.
15. Finish staging now matches the authoritative reason. A knockout folds only
    its loser, a double knockout folds both fighters, and all time decisions
    leave both standing. WebGL and Canvas browser passes cover timeout, owned
    loss, and double knockout with readable actions and zero runtime errors.
16. Returning mock state now counts only alive, unexpired Scribbits toward the
    roster, removing the false ROSTER FULL dead end caused by an archived entry.
17. Exhibition outcomes no longer dead-end on a random invisible rematch. Win
    and loss paths can open a three-card Rival Draft with stat-shaped founder
    art, real level/element/Shape Power/signature/forecast data, and no fake win
    odds. The stable daily slate prioritizes close levels, reaches only one extra
    distance tier for style variety, and rejects off-card choices server-side.
18. Browser and endpoint proof cover loss draft, win draft, exact chosen-rival
    binding, live replay, off-card HTTP 400, production/mock selector parity,
    and zero captured runtime errors.
19. The Four-Power Practice Lab now makes the drawing hook repeatable after the
    official daily Scribbit locks. It has a visible Arena entry, server-decided
    power diagnosis, session-only unique-power checklist, continuous replay,
    explicit repeat/new feedback, and no birth, profile, Belief, or reward UI.
20. Practice accepts only a validated base PNG and name, re-analyzes the image,
    returns a required transcript, and never uploads media or enters roster,
    Rumble, history, rewards, or Legacy. Request size/rate/concurrency guards and
    a pre-storage rejection backstop protect the zero-progression boundary.
    Production/mock parity, art-bound transient IDs, session de-duplication, and
    persistence rejection bring the pure verification gate to 78 groups. Mobile
    WebGL proof covers the complete 0/4 -> fight -> recap -> 1/4 loop with zero
    runtime errors, while exact Arena, inventory, and history hashes stay fixed.

## Current polish gap

The return, collection, title, completed-run, reward-reveal, battle-juice,
founding-content, bounded-growth, chosen-rival, and repeatable-Practice loops now
have truthful homes. All four Shape Powers have distinct transcript-driven
vignettes, sixteen elemental signature identities, production-seeded contracts,
and readable counter stamps.
The paper-broadcast HUD, 4x/Skip flow, transcript-derived Inkcast Recap, truthful
finish poses, archived Canvas summary, first-session stat-shaped founder fight,
and six-page relic collection are browser-proven with zero captured runtime
errors. The Practice Lab adds repeatability without a second progression track:
its checklist is session-only and its reports cannot reach battle storage. The
strongest remaining proof gap is an installed Reddit playtest and a concise demo
capture using organic player drawings rather than curated fixtures. Progression
should stay expressive and collectible rather than add combat power or another
currency.

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

1. Split the 1,900+ line combat engine behind the unchanged `simulateCombat`
   facade when a real balance/content boundary justifies it. Fixed-seed golden
   hashes already protect both production and mock transcripts.
2. Extract pure capsule rules and the legacy receipt codec from `inkStore.ts`
   without changing Redis keys, receipt JSON, or transaction ordering.
3. Add route-level contract coverage for replay authorization, receipt-day
   bounds, hidden fighters, and unavailable/stale featured reports.
4. Split the broad Arena route/scene only at the now-proven receipt, Next Goal,
   bracket, and roster boundaries, preserving the current player flow.
5. If Draw gains another mode, extract its official/practice copy and completion
   choices behind a pure presentation plan before adding more scene branches.

These are sequenced after the current content loop because the shared cosmetic
catalog is the authoritative boundary required by the collection UI. Large
scene or route splits should follow observed feature boundaries rather than line
count alone.
