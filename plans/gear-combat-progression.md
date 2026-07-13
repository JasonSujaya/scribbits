# Gear Combat Progression Goal

## Goal

Ship a server-authoritative, balanced 1★–5★ plus Red★ Gear progression for all
26 current items, show exact effects in Bag, provide seven days of content, and
prove the result through deterministic simulations plus a live mobile render.

## Mode and persistence

- Mode: durable execution goal.
- Active tracker: Codex goal for this task.
- Source of truth: this file and `plans/gear-effects-balance.md`.
- Stop only when code, simulation gates, build, live screenshot, and independent
  reviewer evidence all pass.

## Scope and non-goals

- In scope: earned reusable Gear, Forge ranks, Exhibition/Spar combat, Bag
  effect copy, weapon-style VFX, seven-day Gear Week content, tests, and render.
- Out of scope: paid combat power, mutating the 100-point birth build, permanent
  random Forge rolls, new persistent projectile entities, Rumble/Champion power,
  production deployment, commit, or merge.

## Rank contract

Ranks use the shared curve `0.4 / 0.7 / 1.0 / 1.3 / 1.6 / 2.0%`. The strongest
piece in each category leads; the second is a 25% support. Combined axes cap at
3%, and timing caps at one tick.

## Complete catalog

| Family  | Technique     | Current Gear                                                                                  |
| ------- | ------------- | --------------------------------------------------------------------------------------------- |
| Aim     | Blade Volley  | Tiny Sword; Nib Halo Headband; Eyepatch + Scar; Nib Halo Circlet; Comet Crayon Blade          |
| Guard   | Paper Guard   | Beanie; Snail Shell Backpack; Cape; Inkquake Crater Crown                                     |
| Ready   | First Strike  | Bowtie; Party Hat; Inkquake Rumble Belt; Top Hat                                              |
| Focus   | Orbiting Nibs | Monocle; Round Glasses; Mustache; Headphones                                                  |
| Rush    | Dash Blades   | Smearstep Speed Scarf; Propeller Cap; Smearstep Ink Skates; Dragon Wings; Rocket Eraser Boots |
| Fortune | Lucky Echo    | Flower Crown; Colorburst Rosette; Golden Crown; Colorburst Prism Crown                        |

Each item receives the exact effect for its family at its current forged rank.
Rarity remains a presentation/drop-rate property, so Common Gear can express
every family and Epic is not automatically stronger.

## Agent plan

- Planner: primary agent owns scope, curve, safety gates, and durable docs.
- Researcher: read-only agents audit catalog, combat integration, and render path.
- Coder: primary agent owns source and test changes.
- Reviewer: a separate read-only verifier rejects completion on missing evidence,
  unsafe scope drift, failed simulations, or a misleading render.

## Work checklist

- [x] Audit catalog, rank storage, loadouts, combat authority, VFX, and UI.
- [x] Define all ranks, six techniques, all 26 mappings, and seven content days.
- [x] Freeze equipped Gear into versioned Exhibition combat input.
- [x] Show the exact active/support effect in the Gear detail modal.
- [x] Pass all-rank family, family-covering full-build, determinism, and
      corruption simulations.
- [x] Pass type-check, lint, complete tests, and production build.
- [x] Verify localhost at 393×852 and save a visible screenshot.
- [x] Replace three conflicting baked-text stage images with one generated,
      shared paper stage and verify Blade Volley as three visible blades.
- [x] Resolve every issue from the independent review, including exact tradeoff
      copy, durable Forge refresh, mode validation, and fresh mobile evidence.

## Completion evidence

- `pnpm verify`: 126/126 focused tests, 181/181 deterministic legacy groups,
  TypeScript, ESLint, and the production Vite build pass.
- Gear matrix: six families × all six ranks × four Shape Powers × 600 mirrored
  seeds remains inside the 40–60% gate; two legal family-covering Red★ builds
  stay inside 42–58% against their matching 1★ builds.
- Live renders at 393×852: `artifacts/screenshots/gear-red-star-blade-volley-live.png`
  shows the Red★ three-blade spawn; `artifacts/screenshots/gear-live-balance-result.png`
  proves the played battle reached an authoritative result; and
  `artifacts/screenshots/gear-week-seven-day-content-final.png` proves the
  uncluttered daily title and playable challenge. All captured runtime error
  counters remained at zero.
- Forge refresh is server-awaited, idempotently repairable, and updates every
  living Scribbit wearing the reusable Gear before the API returns.
- Independent review found five correctness/presentation gaps across three
  passes. All five were corrected; the last rejection was only the stale
  screenshot, which the two fresh 393×852 artifacts replace.

## Verification gates

- S1: all 26 Gear items map to one of six complete techniques and all ranks are
  monotonic. Evidence: source validation and tests.
- S2: gear-free v2 transcripts stay usable; active Gear uses validated v3 input,
  changes report identity, and fails closed on malformed values.
- S3: all six families at 1★–5★ and Red★ stay within 40–60% across four powers;
  family-covering full Red★ versus full 1★ stays within 42–58%.
- S4: Bag visibly shows rank plus exact effect and Gear Week day; live WebGL has
  zero runtime/console errors at mobile size.
- S5: every independent-review finding is resolved and reverified against the
  final source, tests, and fresh artifacts.

## Stop and escalation

- Continue while a failing gate has a known corrective action.
- Retry a failing implementation or render at most three focused times.
- Escalate only for missing credentials, an unsafe external write, a material
  product decision, or three repeated failures with no smaller corrective step.
