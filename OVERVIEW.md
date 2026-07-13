# Scribbits Arena — Overview

> **AI: read this before writing code.** Before creating any new file, store,
> registry, helper, service, or endpoint: check "One home per thing" below.
> If the concept already has a home, extend that file. If a new home is truly
> needed, explain why before writing a parallel implementation.

_Last verified: 2026-07-13 against commit b2cd09a and the current uncommitted worktree. Update with the app-overview skill._

## What this app is

Scribbits Arena is a portrait Reddit game where each player draws one creature, called a Scribbit, and the drawing's shape becomes its combat build. The server analyzes submissions, owns progression and outcomes, and returns deterministic battle reports; the client presents those reports as lively real-time-looking replays. Each Scribbit has a three-day life that can end as a permanent Legacy Card, while daily Rumbles, Champion fights, care, sparring, cosmetics, and scouting create reasons to return. (`app/src/server/routes/api.ts`, `app/src/client/game.ts`)

## Why it's valuable

The hook is immediate and personal: a player's own drawing visibly changes how a fight unfolds, but cannot buy raw stat power. The critical path is **draw a Scribbit → submit it → watch that exact drawing fight → understand the result**; if any link breaks, the game loses its reason to exist. (`app/src/client/scenes/Draw.ts`, `app/src/server/core/battle.ts`)

## Words we use

| Word                 | Plain meaning                                                   | Lives in code as                  | Do NOT also call it            |
| -------------------- | --------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| Scribbit             | One player-drawn creature                                       | `Scribbit`                        | pet, unit, monster             |
| Shape Power          | The dominant combat ability derived from drawing geometry       | `PrimaryPower`                    | class, skill tree, weapon      |
| Rumble               | The server-resolved nightly competition                         | `rumble`                          | tournament, bracket mode       |
| Spar                 | A server-authored exhibition fight                              | `spar`                            | duel, quick match              |
| Champion Contract    | One daily fight against the current Champion                    | `bossChallenge`                   | boss raid, quest               |
| Pick                 | The player's one daily prediction on another contender          | `backScribbit` transport boundary | Back, Backed, bet, cheer, vote |
| Belief               | Community support attached to a Scribbit                        | `belief`                          | like, heart count, cheer       |
| Ink                  | Earned currency used for Mystery Capsules                       | `myInk`                           | coins, gems, energy            |
| Gear                 | A reusable catalog item equipped as a weapon, armor, shoes, or accessory | `CosmeticGearCatalogEntry` | sticker, Ink Mod               |
| Bag                  | The player's inventory, Gear loadout, pens, and titles          | Gallery `collection` branch       | Ink Kit, Collection screen     |
| Legacy Card          | The frozen record created when a Scribbit's life ends           | `LegacyCard`                      | grave, archive item            |
| Founder Rival Thread | A paced story rivalry with a founding Scribbit                  | `FounderChronicle`                | campaign, questline            |
| Rival Run            | A server-authored three-bout scored challenge                   | `RivalRunState`                   | ladder, gauntlet               |

## The main flows

1. **A player opens the Reddit post → enters the expanded game → draws a Scribbit that comes alive and fights.** The lightweight splash shows live daily status, while Draw owns the canvas, Dare, name step, submission, and birth ceremony; the server rechecks the PNG before creating the Scribbit or granting durable rewards. (`app/src/client/splash.ts`, `app/src/client/scenes/Draw.ts`)
2. **The server resolves a fight → the player watches a deterministic replay → the result returns to the right scene.** The fixed-tick engine owns outcomes and the arena micro-goal score; Replay only projects the immutable timeline, reports that stored goal state, and stages follow-up actions through the registry. (`app/src/shared/combat/engine.ts`, `app/src/shared/battlearena.ts`, `app/src/client/scenes/Replay.ts`)
3. **A returning player opens Arena → sees today's arena goal → chooses one owned fighter → chooses Champion or Spar → fights.** Arena is the one home for starting living-Scribbit battles; its target-icon headline comes from the canonical daily arena definition. Battles remains replay history, Draw owns creation and Practice, and the generic Scribbit detail modal owns care/inspection rather than combat initiation. (`app/src/shared/battlearena.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/client/scenes/MyBattles.ts`)
4. **A player opens Arena → makes one Rumble Pick → the server locks that daily prediction → the nightly job awards Clout and files a receipt.** Rumble Pick is a compact secondary Arena action, not a fight mode; the client never decides eligibility, placement, or payout. (`app/src/client/scenes/ArenaHome.ts`, `app/src/server/core/clout.ts`, `app/src/server/core/dailyJob.ts`)
5. **A player earns Ink → pulls a Mystery Capsule → opens Bag → equips discovered Gear on a living Scribbit.** Bag centers the selected Scribbit inside two weapon, armor, shoes, and accessory slots; the server persists each loadout, while duplicate copies remain Forge material. Inventory, pity, duplicate handling, titles, Gear, and operation recovery stay server-owned. (`app/src/server/core/inkStore.ts`, `app/src/server/core/scribbit.ts`, `app/src/client/lib/collectionbook.ts`)
6. **A Scribbit reaches the end of its life → the server freezes a Legacy Card → the player can revisit it in Gallery.** Gallery owns public Legends and personal Legacy; Bag owns mutable inventory and equipment. They reuse one orchestration scene without presenting those concepts as the same destination. (`app/src/shared/legacycards.ts`, `app/src/client/scenes/Gallery.ts`)

## One home per thing

| Concern                                                         | The one home                                    | Never                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Shared REST and stored-state shapes                             | `app/src/shared/arena.ts`                       | redefine response shapes in scenes or routes                                                            |
| Full Scribbit deep-copy policy                                  | `app/src/shared/arena.ts`                       | hand-copy nested Scribbit fields in storage, combat, Rumble, founders, or mocks                         |
| Browser API requests and friendly transport errors              | `app/src/client/lib/api.ts`                     | call product endpoints directly from product scenes; splash and debug harnesses are explicit boundaries |
| Public API route composition                                    | `app/src/server/routes/api.ts`                  | add a second public router                                                                              |
| Generic Redis storage contract                                  | `app/src/server/core/storage.ts`                | define storage types inside a gameplay domain                                                           |
| Server migration compatibility windows                          | `app/src/server/core/migrations.ts`             | add feature-local rollout timers or indefinite dual writes                                              |
| Player-data deletion lease and generation                       | `app/src/server/core/dataDeletion.ts`           | invent deletion locks inside individual gameplay features                                               |
| Nightly stale-worker storage fencing                            | `app/src/server/core/nightlyStorageFence.ts`    | run production nightly mutations against raw Redis or a token-only lease                                |
| Cross-scene transient state                                     | `app/src/client/lib/registry.ts`                | introduce ad-hoc registry keys in scenes                                                                |
| Scribbit validation, ownership, lifecycle, and Redis records    | `app/src/server/core/scribbit.ts`               | mutate Scribbit hashes directly from routes                                                             |
| Level thresholds and Ink Mod acquisition policy                 | `app/src/shared/progression.ts`                 | hardcode level or Ink Mod limits in combat, server, or client code                                      |
| Equipment categories, two-slot capacity, and loadout projection | `app/src/shared/equipment.ts`                   | repurpose birth-time `AttachedAccessory` placement data as reusable equipment                           |
| Per-Scribbit loadout ownership, persistence, and mutation        | `app/src/server/core/scribbit.ts`               | store loadout authority in routes, scenes, or the browser                                               |
| Fixed-tick combat outcome                                       | `app/src/shared/combat/engine.ts`               | calculate winners or damage in the client                                                               |
| Battle arena rotation, modifiers, and challenges                | `app/src/shared/battlearena.ts`                 | hardcode arena rules in Replay, routes, or battle storage                                               |
| Battle transcript runtime validation                            | `app/src/shared/combat/transcriptvalidation.ts` | redefine event, checkpoint, fighter, or result validation in storage or Replay                          |
| Battle report assembly                                          | `app/src/server/core/battle.ts`                 | rebuild reports in replay presentation                                                                  |
| Drawing analysis rules                                          | `app/src/shared/analyzer-core.ts`               | trust client-only analysis for submission                                                               |
| Nightly Rumble resolution order                                 | `app/src/server/core/dailyJob.ts`               | resolve or pay Rumbles from client activity                                                             |
| Daily Care and Champion atomic receipts                         | `app/src/server/core/dailyActions.ts`            | split daily claims from their Scribbit, Ink, report, or outcome mutations                               |
| Complete Scribbit removal across all indexes                    | `app/src/server/core/removal.ts`                 | copy battle, Champion, moderation, and Scribbit cleanup into routes or privacy deletion                  |
| Returning-player Rumble receipt composition                     | `app/src/server/core/rumbleReturn.ts`            | project backed and owned return variants independently in routes                                        |
| Ink, capsule, inventory, and title persistence                  | `app/src/server/core/inkStore.ts`               | store cosmetic authority in the browser                                                                 |
| Bag inventory and equipment presentation                       | `app/src/client/lib/collectionbook.ts`           | add inventory or loadout controls to Gallery Legends or Legacy                                          |
| Bag bounded inventory scrolling and semantic item grid          | `app/src/client/lib/baginventorygrid.ts`         | make the whole Bag scene scroll or create a second item-grid input path                                  |
| Legacy Card cursor, projection, ordering, and page policy       | `app/src/shared/legacycards.ts`                 | redefine limits, cursors, or card projection in routes or the local mock                                |
| Legacy Card Redis index and receipt persistence                 | `app/src/server/core/legacy.ts`                 | reconstruct expired Scribbits from current rows or write the index from routes                          |
| Canonical founding Scribbits                                    | `app/src/shared/founders.ts`                    | copy founder stats or identities into UI files                                                          |
| Authored reusable content packs                                 | `app/src/shared/content/`                       | embed parallel content catalogs in scenes                                                               |
| Rival Run challenge catalog and reducers                        | `app/src/shared/rivalrunchallenges.ts`          | recalculate challenge progress in presentation                                                          |
| Canvas-to-DOM accessibility layers                              | `app/src/client/lib/overlay.ts`                 | create unmanaged HTML buttons beside the canvas                                                         |
| Persistent five-tab navigation                                  | `app/src/client/lib/appdock.ts`                 | hand-build another dock in a scene                                                                      |
| Shared paper icons                                              | `app/src/client/lib/papericons.ts`              | use emoji or one-off icon drawing for standard actions                                                  |
| Visual tokens and responsive design constants                   | `app/src/client/lib/theme.ts`                   | introduce scene-local font stacks or touch sizes                                                        |
| Production-like local server fixtures                           | `app/src/server/core/mockRuntime.ts`            | fork product rules inside browser-only mocks                                                            |

## Expected user behavior

Players draw in portrait, watch server-authored fights, make one meaningful daily Pick from Arena, care for living Scribbits, manage equipment in Bag, and browse Legends or Legacy in Gallery. Discovered Gear is a reusable account unlock that may be equipped on multiple living Scribbits; loose copies are Forge material, not a second ownership requirement. Players may ignore optional Dares, cosmetics, and story threads without breaking the critical path. A player never edits stats, chooses a winner, repeats an irreversible daily Pick, or needs to understand Redis, UTC storage keys, battle seeds, or replay internals. (`app/src/client/scenes/Draw.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/server/core/scribbit.ts`)

## Not built yet

- There is no synchronous networked PvP transport; combat is server-resolved and then streamed from an immutable report as a replay. (`app/src/server/core/battle.ts`, `app/src/client/scenes/Replay.ts`)
- Loadouts are persisted and displayed, and an equipped weapon selects its cosmetic battle-effect family. Gear does not change combat math or deterministic transcripts; armor, shoes, and accessories are presentation-only, and the submitted body PNG is not repainted around newly equipped pieces. Birth-time accessories remain a separate consumed, baked-image system. (`app/src/shared/equipment.ts`, `app/src/client/lib/weaponfxpresentation.ts`, `app/src/server/core/submission.ts`)
- Scout Notebook is no longer a primary navigation destination. Its scene and API remain temporarily for saved-replay compatibility and can be removed after those return paths no longer reference it. (`app/src/client/scenes/ScoutNotebook.ts`, `app/src/server/core/scoutNotebook.ts`)
- Remaining cleanup opportunities are tracked in `SLOP-AUDIT.md`; none is a second gameplay authority path.
