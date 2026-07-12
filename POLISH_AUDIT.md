# Scribbits Arena Polish Audit

This is the handoff document for continuing polish across Codex sessions and
sub-agents. `GOAL.md` remains the ship-gate summary; this file records the
product-quality bar, current evidence, and the next content decision.

## North star

The complete loop should feel obvious and rewarding on a phone:

`draw -> see a distinct power -> watch the fight -> settle one rival beat -> earn Ink -> discover a cosmetic -> archive a Legacy -> return for the Rumble`

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
2. Thirty-two optional Doodle Dares provide eight prompts for each Shape Power,
   plus eight reward-free bonus twists. Every four-day window covers all powers;
   prompts repeat only after 32 days and exact prompt/twist cards after 256. The
   card remains explicitly optional and now exposes an accessible label.
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
   runtime console. The deterministic gate now covers 98 simulation groups,
   including expiry/XP race fencing, idempotent Rumble standings, retryable
   and inventory-watched title snapshots, and insertion-stable Legacy cursors.

## Completed return-loop iteration

1. The overnight scouting receipt can now open the backed Scribbit's last
   actually played Rumble bout. The server stores an order-independent featured
   report index during resolution, validates day, ownership, involvement, and
   moderation, and never lets the client select a report or winner.
2. The same immutable server transcript powers the watchable, up-to-20-second
   Phaser replay. A returning player can watch, skip, or continue without
   changing the already-resolved result or receiving duplicate rewards.
3. Legacy ceremony -> scouting receipt -> replay -> Legacy Book is one truthful
   chain. Each secondary action names its real destination, and standalone
   replays still return to the Arena.
4. After today's drawing, the Arena replaces the broad progress panel with one
   deterministic Next Goal: enter, Back, take the unused Champion Contract, open
   a ready capsule, perform the first available care action, or return after the
   Rumble.
5. The card exposes only useful evidence: XP to next level, Belief/25, days
   left, Ink to capsule, and permanent collection progress. Browser proof
   confirmed capsule-to-care progression and exact server-confirmed care rewards.
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
8. The live fight now reads as a physical paper arena rather than a static
   report, Practice grid, or broadcast dashboard. A full-height torn page,
   localized element stains, irregular truthful bounds, and transcript-triggered
   surges frame one clipping-safe movement field; 232px drawings render over
   moving shadows. Compact numeric-HP and READY/WINDUP/ACTIVE strips flank a
   smaller authoritative clock, while a compact battle-kind/server-lock rail and
   transient commentary margin replace turn cards and the permanent lower third.
   Fighter overlap depth follows screen position, combat reads clear the HUD,
   result actions stay separated, and 4× playback resets before the ceremony.
9. Founding opponents no longer collapse into generic round fallback blobs.
   Their deterministic procedural anatomy varies continuously with all four
   stats, while the dominant stat supplies the strongest readable silhouette cue.
10. Every element x Shape Power pairing now has one authored signature identity.
    Replay uses neutral no-clean-hit copy unless explicit shield or element events
    prove more, so presentation does not invent a dodge, counter, or miss reason.
11. Replay event presentation is split into exhaustive lifecycle, damage/status,
    arena/collision, and battle-flow presenters. Unknown powers fail closed,
    truncated transcripts reconcile from authoritative checkpoints, and fixed
    production/mock transcript hashes guard deterministic drift. A short effect
    schedule may truthfully cross the 20-second bell without invalidating the
    saved replay, while unbounded future schedules still fail validation.
12. Final checkpoints must match authoritative result HP and fighter order.
    Barrier hits carry exact source and activation metadata, so body contact can
    no longer suppress a truthful Shape Power no-clean-hit callout. Legacy
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
    persistence rejection, commentary truth checks, and matchup coverage remain
    in the current deterministic verification gate. Mobile
    WebGL proof covers four genuinely different drawings through the complete
    0/4 -> 4/4 loop, while exact Arena, inventory, and history hashes stay fixed.
21. The transient paper margin now authors deterministic power, miss, hit,
    shield, echo, arena, and late-fight variants from authoritative facts. The
    immutable v1 pack owns 104 globally unique lines across 25 strict banks. A
    replay-scoped author exhausts a bank before reuse, and one shared parser owns
    both validation and rendering so wrong tokens, malformed braces, duplicate
    copy, overlong expansions, invented outcomes, and unsafe miss claims fail
    closed. Colorburst has no premature finish-time miss bank. The content layer
    cannot schedule events or alter combat state. A pure queue now
    selects one strongest candidate per simulation tick, holds it for 900ms of
    wall-clock time, and retains at most two pending beats. Same-tick chains and
    4x playback cannot overwrite every headline; Colorburst no longer claims a
    miss before its delayed echo resolves. Fresh 320x568 WebGL proof renders a
    v1 bank line, reaches 4x, resets result tweens to 1x, and records zero runtime
    or console errors.
22. The fourth unique Practice power now lands on one gold completion card with
    all four checks and a restrained first-completion burst. Repeated powers after
    4/4 remain replayable but cannot replay the completion celebration.
23. Every current battle path now enters through one mode-specific paper VS
    ceremony. It reveals both exact signatures and one mechanics-not-win-odds card
    from an exhaustive ten-pair Shape Power matrix; deterministic tests cover all
    sixteen ordered combinations. WebGL and Canvas Arena spars keep the larger card
    readable, and an actual Rival Draft choice now receives the ceremony instead of
    bypassing it, all with zero captured runtime errors.
24. The twenty founders are now characters rather than anonymous stat blocks.
    One immutable shared catalog preserves every prior roster value while adding
    160 unique, bounded strings: epithet, challenge, two openings, signature
    reaction, victory, defeat, and Rumble voice per founder. Existing Rival Draft,
    VS, pre-FIGHT ticker, post-recap whitespace, scouting receipt, and Reddit
    result moments carry the content without new persistence, combat events, or
    authority. Default portrait and 320x568 WebGL proof cover the full founder
    spar/rematch loop with reachable actions, no overlap, and empty browser errors;
    reduced motion now keeps the full ceremony reading dwell and skips the draft pop.
25. The existing once-daily boss fight now reads as a complete Champion Contract.
    The server's daily flag reaches `ArenaState`; founder or Shape-Power identity,
    exact signature, honest conditional +2 XP, and a paper challenger picker replace
    the generic always-live CTA. The local mock enforces the same one-shot rule and
    outcome progression. Default and 320x568 WebGL proof cover selection, VS,
    replay/Skip, recap, return, a noninteractive completed stamp, and empty errors.
26. Rival Draft now preserves emotional continuity instead of discarding the prior
    bout. Its header carries the authoritative FINAL/BIGGEST SPLAT, every founder's
    challenge is visible on the card, and full-size FIGHT buttons remain reachable at
    320x568. Narrow quote lanes prevent content from drawing beneath those targets.
27. Founder encounters now have one bounded relationship loop instead of sixty
    stamps. Each player has at most one active best-of-three; only one qualifying
    score beat advances per Arena day, the active founder stays pinned in future
    drafts and quick spar, and unrelated founders remain exhibitions. A resolved
    series becomes a signed margin note with no currency, stat, or checklist reward.
28. The server writes a pending Chronicle projection before the durable battle
    report, then commits the versioned player state transactionally. Arena and Rival
    reads repair ambiguous replies from report provenance; duplicate reports and
    delayed receipts replay in Arena-day order, same-day retries are inert, the v1
    checklist migrates as archive-only history, privacy deletion removes both
    schemas and pending receipts, and the local mock reuses the production reducer. Deterministic coverage and a
    320x568 WebGL run prove the pinned Fernibble decider and visible 2–1 Day 9 margin.
    If a commit succeeds but its reply is lost, the direct response now recovers
    the exact authored beat only after the reloaded Chronicle equals its projection
    and the current report is the latest durable report in that rivalry.
29. Rival Threads now carry founder-specific episode content instead of only a
    generic best-of-three wrapper. Twenty immutable arcs provide exactly three
    ordered pages each, with 60 unique titles, 60 founder-naming scene cues, and
    120 unique post-bout result lines.
    Page selection is derived from the authoritative score and stays consistent
    across Next Goal, Rival Draft, Chronicle margin, and pre-fight stakes. The
    validator fails fast on missing founders, duplicate copy, page-order drift,
    overflow, pre-fight outcome prediction, or reward claims. A pure result
    receipt also requires a matching page, server Chronicle beat, founder/player
    slots, and transcript winner before selecting the appropriate authored line.
    This adds no Redis fields or combat authority. Real 320x568 WebGL runs show
    Fernibble's `LAST LEAF HOME` decider, RIVAL DECIDER replay, and signed result
    receipt with reachable Rivals, Practice, and Arena actions and zero errors.
30. Daily-facing content no longer burns through its variety in the first week.
    Doodle prompts moved into one validated shared catalog with a versioned
    32-day schedule and 256 prompt/twist combinations; Practice consumes the same
    source and its post-4/4 encores rotate through four distinct powers and prompt
    cards instead of pinning one exercise. Public forecast flavor now has 32
    validated nonrepeating lines chosen independently from combat-element RNG,
    and the browser mock imports that production generator. Mobile proof catches
    and fixes Dare/tool overlap, removes duplicated Rival evidence, verifies
    first-stroke disappearance and accessibility, and records zero runtime or
    console errors.
31. Care now feels like looking after the drawn creature instead of tapping one
    of three repeated toasts. A deep-frozen 72-line deck covers four Shape Powers,
    three actions, three life pages, and two stable variants; each Scribbit sees
    nine distinct lifetime moments. The server returns the exact committed Ink
    award, while a short paper receipt shows the drawing, mood, care marks, and
    XP delta. Mobile WebGL proof fits at 320x568 with zero errors. The same audit
    removed a stale element triangle from the Field Guide and replaced it with
    validated fixed-tick payload semantics. A locked nightly Back also removes
    the formerly dead-end loss CTA.
32. Recent battle history is now a Battle Scrapbook instead of a reduced matchup
    list. The newest 20 server reports become paginated pages with fighter art,
    MY WIN/MY LOSS/WATCH perspective, truthful KO/decision/archived finish, exact
    FINAL/BIGGEST SPLAT and HP/duration evidence, and Rumble/Champion priority
    within a day. Artist identity preserves ownership after roster expiry; old
    result-only records never invent motion. Replay returns to the same page. A
    320x568 WebGL run proves paging, an expired-fighter loss, Skip/result/return,
    and zero runtime or console errors without adding persistence or rewards.
33. Scouting now has a visible seven-page home instead of one transient return
    receipt plus a leaderboard. Scout replaces the Field Guide as the fifth tab;
    the Guide remains one tap away. Tonight and six prior days are projected from
    existing Back, payout, forecast, lifetime Clout, visible Scribbit, and featured
    report state into six explicit statuses. Forty-eight frozen authored notes
    provide eight safe variants per status with no same-status repeat in a
    seven-day window. Historical identity never comes from `champion:current`,
    hidden/deleted art stays unavailable, and replay requires the exact visible
    report. A 320x568 WebGL pass proves drawing load, Day 8 Replay, Skip, and return
    to the same tab with zero runtime or console errors. No Redis key, currency,
    title, reward, or combat decision was added.
34. The whole portrait UI now uses one default hierarchy instead of stacking
    explanations. Arena, Draw, Practice, Replay, Battles, Scout, Gallery, Legacy
    Book, Collection, Field Guide, and Mystery Ink give every primary card one
    headline, one current status, and one action. Exact forecasts, payouts, HP, finish reasons,
    odds, moderation, deletion, and server-lock facts remain truthful; secondary
    rules and card metadata move behind deliberate taps. The 320x568 WebGL pass
    covers the fresh Draw, scrolling Arena, seven-day replay/return, five-row
    battle page, six-card Gallery, Legacy Book, Collection, Guide details, and
    reward-free Practice without reintroducing turn cards or cheer input.
35. The first genuinely uncurated mobile run now proves the drawing hook rather
    than another fixture. Before the first mark, the existing compact feedback
    panel visibly maps big, spiky, compact, and colorful drawings to their four
    Shape Powers. A hand-drawn spiral became `Spiral Splat`, was analyzed as a
    Firetip Halo, and fought a normal-speed founder bout. The post-fight strip,
    waiting Rival card, and persistent Next Goal evidence now replace secondary
    metadata with the authoritative 1–0 score and Day 10 return cue. The complete
    320x568 path recorded zero runtime or console errors and added no state,
    currency, reward, endpoint, or rule panel.

## Arena bracket refactor check (July 12)

A broad split of the 2,300-line Phaser scene was rejected during this product
change because it would mix lifecycle risk with the UI overhaul. The bounded
change extracts only bracket ordering and Back-button semantics into a 90-line
pure planner; rendering, async art, input, API calls, receipts, and scene
lifecycle stay in `ArenaHome`.

| Axis | Before | After |
| --- | ---: | ---: |
| Simplicity | 2/5 | 4/5 |
| Naming | 4/5 | 5/5 |
| Readability | 2/5 | 4/5 |
| Coupling | 2/5 | 4/5 |
| Testability | 2/5 | 5/5 |
| Confidence | 4/5 | 5/5 |

The touched scene fell from 2,317 to 2,302 lines. One focused deterministic
group now locks backed-first, roster-owned-second, reverse-source ordering,
deduplication, the eight-card cap, and all four exact Back states. No public
contract changed. TypeScript, ESLint, all 98 simulation groups, production
build, and a real 320x568 Arena interaction pass are green.

## Matchup truth refactor check (July 12)

Two independent challengers rejected a broad shared `MatchupFacts` layer. Their
review found that Smearstep's configured `dashCount` was not yet consumed by the
engine, so binding `TWICE` to it at this stage would have created false
authority. The accepted scope removed only the real duplication: both visible
Halo `35%` claims now format the `areaDamageReductionPermille` value that combat
actually applies.

| Axis | Before | After |
| --- | ---: | ---: |
| Simplicity | 3/5 | 4/5 |
| Naming | 4/5 | 5/5 |
| Readability | 4/5 | 4/5 |
| Coupling | 2/5 | 4/5 |
| Testability | 3/5 | 5/5 |
| Confidence | 3/5 | 5/5 |

`matchupbrief.ts` moves from 263 to 273 lines with one private formatter, no
public API change, no call-site change, and no engine change. Two duplicated
numeric literals are removed. Existing snapshots keep all ten cards byte-for-byte
stable, while two focused assertions bind Ring/Halo and Halo/Cone copy to the
consumed configuration. TypeScript, ESLint, all 98 simulation groups, the
production build, and a real 320x568 Ring/Halo ceremony are green. The
Smearstep follow-up below closes the deliberately deferred `TWICE` authority
gap.

## Smearstep schedule refactor check (July 12)

Two more independent challengers constrained this to a behavior-preserving
combat refactor. Smearstep now computes every dash window from `dashCount`,
`dashTicks`, and `pauseTicks`; rules validation rejects schedules whose
`activeTicks` do not exactly fit that configuration, and fractional timing
values fail closed. Its VS-card `TWICE` label formats the same `dashCount` the
authoritative simulator now schedules.

| Axis | Before | After |
| --- | ---: | ---: |
| Simplicity | 3/5 | 4/5 |
| Naming | 4/5 | 5/5 |
| Readability | 3/5 | 4/5 |
| Coupling | 2/5 | 4/5 |
| Testability | 2/5 | 5/5 |
| Confidence | 3/5 | 5/5 |

`engine.ts` moves from 1,995 to 2,035 lines with two private schedule helpers
and no public API, type, or call-site changes. The former first/second-dash
branches are replaced by one indexed schedule: dash ages remain `[0,5)` and
`[9,14)`, the pause remains `[5,9)`, the first aim remains activation-time,
and the second re-aim remains age 9. A dedicated fixed-seed golden case keeps
the exact transcript hash
`8d573dbde552349906be1200f116a2becc2651552b4e6aa28838988826401e91`,
including mock/production parity. A focused behavior fixture also locks the
activation deadline and proves one hit in each configured window. The count
remains the deliberate literal type `2`; any future widening must account for
the 32-bit hit mask and receive fresh balance and visual review. TypeScript,
ESLint, all 98 simulation groups, the production build, and a real 320x568
Smearstep replay are green.

## Battle-loop hierarchy pass (July 12)

A fresh 320x568 playthrough exposed one remaining presentation break in the
core hook: the VS ceremony stacked story, fighter, and mechanics explanations,
then the compact result named only the winner and gave Rival, Practice, Back,
and Arena equal visual weight. Two independent audits confirmed that the result
needed an immediate viewer-relative verdict and one primary next move.

The VS ceremony now leads with one battle label, one episode/match title, one
authoritative stakes line, larger fighter art, and one two-line mechanics card.
Names, levels, elements, signatures, Rival score, page title, and exact matchup
mechanics remain visible; the duplicate episode cue, founder epithet, and
mechanics caption are gone. The Founder Rival margin similarly uses one title,
one newest-page chip, a combined score/availability line, visual best-of-three
progress, one next-page label, one quote, and one action.

Post-fight cards now say `YOU WON`, `YOU LOST`, or `{WINNER} WON` before the
exact finish reason, duration, and final HP. Owned exhibitions promote
`CHOOSE A RIVAL` to one full-width primary action; Practice, tonight's pick, and
the real return destination share a smaller secondary row. A pure action planner
and one Phaser renderer replace the duplicated win/loss grids and remove the
obsolete loss-offset plan.

Every critical result, Practice, archived-result, and Rival Draft action now
uses a 100-design-pixel target, which stays at least 44 CSS pixels in the
320x568 Reddit fit. Canvas art remains the visual surface while one shared DOM
adapter mirrors each action as a focusable native button with an exact accessible
name, focus outline, and single-fire Enter/Space path. Opening the Rival Draft
hides the result controls; closing it or recovering from a failed request restores
them instead of leaving an invisible keyboard dead end.

TypeScript, ESLint, all 98 simulation groups, and the production build are
green. A real normal-speed 320x568 Fernibble decider proves the compact Rival
VS, `YOU WON` result, signed-margin strip, action hierarchy, native result and
Rival Draft controls, close-and-restore lifecycle, keyboard Arena return,
archived-result return, and resolved margin with zero runtime or console errors.
No combat event, result, reward, route, stored field, or authority boundary
changed.

## Current polish gap

The return, collection, title, completed-run, reward-reveal, battle-juice,
founding-content, bounded-growth, Founder Rival Thread, and repeatable-Practice
loops now have truthful homes. All four Shape Powers have distinct
transcript-driven vignettes, sixteen elemental signature identities,
production-seeded contracts, verified pre-fight matchup briefs,
transcript-bounded combat callouts, twenty canonical founder voice packs, and
twenty three-page Rival episodes. Champion Contracts now have truthful open and
completed states, and the Inkcast editorial queue makes authored moments
readable at 1x–4x. Its 104-line shared pack now rotates without authored repeats
inside a bank and rejects copy that outruns the transcript.
The live paper-arena HUD, 4x/Skip/result-speed handoff, transcript-derived Inkcast
Recap, truthful finish poses, reduced-motion and Canvas fallbacks, chosen-rival
loop, first-session stat-shaped founder fight,
and six-page relic collection are browser-proven with zero captured runtime
errors. The Practice Lab adds repeatability without a second progression track:
its checklist is session-only, its first 4/4 payoff is now browser-proven, and
its encores rotate after completion while its reports cannot reach battle
storage.
Care now has a complete three-day personality arc and a truthful server receipt,
the in-game rules teach the combat model that actually runs, and the Battle
Scrapbook gives recent authoritative fights a replayable home. The Scout
Notebook now turns existing server truth into a bounded seven-day return habit.

The strongest remaining product gap is the player's own overnight Rumble
payoff: the existing return receipt explains a backed contender, but does not
yet lead with the owned entrant's W/L, XP, and exact Rumble Ink when no Back was
made. The strongest external proof gap remains an installed Reddit playtest and
a concise demo capture using organic player drawings rather than curated
fixtures. Progression should stay expressive and collectible rather than add
combat power or another currency. Do not add another progression subsystem
before the installed playtest; the next content decision should come from
whether players can name their active rival, current score, and reason to return
after one organic session.
The organic playtest should now test whether players can explain both the active
Rival score and their seven-day scouting form. Do not expand the Notebook into a
permanent career database, prediction market, or reward currency before that
evidence exists.

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

1. Treat Inkcast v1 IDs, templates, and ordering as immutable. Before v2, bind a
   pack version to stored reports or explicitly accept historical copy drift;
   add authoritative outcome metadata before any timing-specific copy instead of
   asking clients to infer delayed follow-up outcomes.
2. The Halo reduction and Smearstep dash-count copy now derive from the exact
   combat configuration the engine consumes. Smearstep's indexed schedule keeps
   its golden transcript unchanged. Keep echo, dead-zone, and recoil claims
   backed by focused behavior fixtures rather than a second presentation-only
   rules table.
3. Split the 1,900+ line combat engine behind the unchanged `simulateCombat`
   facade when a real balance/content boundary justifies it. Fixed-seed golden
   hashes already protect both production and mock transcripts.
4. Extract pure capsule rules and the legacy receipt codec from `inkStore.ts`
   without changing Redis keys, receipt JSON, or transaction ordering.
5. Add route-level contract coverage for replay authorization, receipt-day
   bounds, hidden fighters, and unavailable/stale featured reports.
6. Split the broad Arena route/scene only at the now-proven receipt, Next Goal,
   bracket, and roster boundaries, preserving the current player flow.
7. If Draw gains another mode, extract its official/practice copy and completion
   choices behind a pure presentation plan before adding more scene branches.

These are sequenced after the current content loop because the shared cosmetic
catalog is the authoritative boundary required by the collection UI. Large
scene or route splits should follow observed feature boundaries rather than line
count alone.
