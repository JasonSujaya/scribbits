# Slop Audit — Scribbits Arena

_Last updated: 2026-07-13, commit 821474a plus the current dirty worktree._

## Summary

The production authority boundaries are strong across combat, submission analysis, progression, economy, authored content, cosmetics, nightly resolution, Reddit post publication, and privacy deletion. The originally listed findings and the required final three-way adversarial sweep findings are closed. Verified open totals: **0 P0, 0 P1, 0 P2**.

## Final adversarial sweep — closed findings

**P1-18 — Cross-owner moderation bypasses the content owner's mutation/deletion lease** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/routes/api.ts`, `app/src/server/core/dataDeletion.ts`, `app/src/server/core/scribbit.ts`.
- Evidence: report middleware leases the reporter, while threshold removal mutates a different owner through a multi-key cleanup sequence.
- Proposed fix: acquire and hold the owner's canonical player-mutation lease around threshold removal, with concurrent deletion/report coverage.
- Files changed: `app/src/server/core/dataDeletion.ts`, `app/src/server/routes/api.ts`, `app/scripts/api-contract-runtime.mjs`, `app/scripts/api-contract-entry.ts`, and `app/scripts/test-battle.mjs`.
- Proof: request middleware and cross-owner moderation now compose one `runWithPlayerMutationLease` acquire/heartbeat/release boundary. Threshold removal acquires the content owner's lease, revalidates ownership inside it, preserves a saved report when owner deletion is busy, and safely retries the same report after the deletion lock clears. Production Hono tests cover active owner deletion, report-receipt persistence, busy retry, successful cleanup, owner-change revalidation, and release of reporter/owner leases. Direct storage tests preserve an operation error through token takeover and combine it with a thrown release failure. TypeScript, ESLint, all 129 groups, production build, `git diff --check`, and independent strict review pass.

**P1-19 — Ambiguous Reddit comment failure can duplicate a Rumble result** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/core/post.ts`, `app/src/server/routes/scheduler.ts`.
- Evidence: a thrown submit clears the result-comment claim even when Reddit may have committed, so the outbox retry can submit again.
- Proposed fix: retain ambiguous claims and reconcile an existing result comment before retry, matching the post-creation failure model.
- Files changed: `app/src/server/core/post.ts`, `app/src/server/core/storage.ts`, `app/scripts/api-contract-runtime.mjs`, `app/scripts/api-contract-entry.ts`, and `app/scripts/test-battle.mjs`.
- Proof: result publication now separates recoverable pre-submit `claiming` markers from at-most-once `submitting` markers. Stale claiming rescue uses a shared WATCH compare-and-replace, so concurrent rescuers cannot delete or overwrite one another; submitting and legacy publishing markers never auto-expire into a duplicate. Exact deterministic-body reconciliation restores receipts after committed reply loss or Redis receipt failure. Tests cover lookup failure, ambiguous submit, receipt failure, concurrent stale rescue, and a committed comment pushed outside the enforced 1000-comment listing window; every case submits once or fails closed. TypeScript, ESLint, all 131 groups, production build, `git diff --check`, and independent strict review pass.

**P1-20 — Rival draft owns a parallel modal lifecycle** — ✅ fixed 2026-07-13

- Anchors: `app/src/client/lib/replaysparrivaldraft.ts`, `app/src/client/lib/overlay.ts`.
- Evidence: the draft marks a raw action overlay as a dialog and manually switches nested accessibility without the canonical focus trap, Escape, inerting, initial focus, or opener restoration.
- Proposed fix: compose `CanvasModalOverlay` while retaining the domain renderer.
- Files changed: `app/src/client/lib/replaysparrivaldraft.ts`, `app/src/client/lib/overlay.ts`, `app/src/client/scenes/Replay.ts`, and `app/scripts/test-battle.mjs`.
- Proof: the rival board and nested rival details now compose `CanvasModalOverlay`; direct dialog-role ownership is removed. The canonical lifecycle now has a LIFO modal stack, top-only Escape/Tab handling, immediate-propagation fencing, nested inert restoration, explicit opener capture, and safe focus restoration. Fight loading keeps the dialog and controls reachable, blocks duplicate activation in domain state, and announces progress through aria-live status. Every pre-dialog failure path restores the captured Choose a rival trigger. TypeScript, ESLint, all 132 groups, production build, `git diff --check`, live nested Escape/parent preservation, info-button and opener focus restoration, inert-background proof, zero browser warnings/errors, fresh mobile capture (`/tmp/scribbits-rival-draft-modal-2026-07-13.png`), and independent strict review pass.

**P1-21 — Supported workspace bootstrap still cannot run the documented pnpm gate** — ✅ fixed 2026-07-13

- Anchors: `app/AGENTS.md`, `scripts/node-env.sh`, root `README.md`, `app/package.json`.
- Evidence: docs/bootstrap still prescribe npm or omit the bundled pnpm fallback path after removal of `package-lock.json`; nested pnpm scripts fail unless that path is manually added.
- Proposed fix: make one pnpm bootstrap script/path authoritative and prove the documented command from a clean shell.
- Proof: root `verify.command` sources one shared resolver, requires Node 22.2.0+ and pnpm 11.7.0, finds the bundled Codex fallback, installs from the frozen pnpm lock when needed, and runs the complete gate. The documented command passes from an empty environment with only `/usr/bin:/bin`, all 142 groups, and the production build. Shell syntax, executable permissions, regression guards, and independent strict re-review pass.

**P1-22 — Release automation has divergent gates and a broken post-upload version sync** — ✅ fixed 2026-07-13

- Anchors: `app/package.json`, `.github/workflows/devvit-auto-deploy.yml`, `deploy.command`, `scripts/sync-devvit-version.mjs`, `DEPLOY.md`.
- Evidence: three release paths duplicate different gates, and the documented desktop path reads/stages the deleted npm lock after upload.
- Proposed fix: route every release surface through one verified pnpm release command and remove npm-lock assumptions without uploading during proof.
- Proof: direct, desktop, and CI uploads converge on `pnpm run deploy`; upload and public-publish modes share `release:check`, which runs the complete verification gate and Devvit authentication check. The deleted npm-lock version synchronizer, automatic package mutation, commit, and push are gone. Shell syntax, source guards, all 142 groups, production build, and independent strict review pass. No Devvit upload or publish was run.

**P2-16 — Press event ordering still has parallel owners** — ✅ fixed 2026-07-13

- Anchors: `pressinteraction.ts`, `MyBattles.ts`, `ui.ts`, `Draw.ts`.
- Proposed fix: compose the dependency-free event binder at every matching press/release/activate interaction.
- Proof: app dock tabs, Battle Journal rows, and Draw tool buttons now compose `bindPressInteractionEvents`; structural guards reject direct pointer-order recreation. TypeScript, ESLint, and interaction ordering tests pass.

**P2-17 — Gallery and Scout duplicate tab accessibility control** — ✅ fixed 2026-07-13

- Anchors: `Gallery.ts`, `ScoutNotebook.ts`.
- Proposed fix: extract one semantic tab controller for roles, roving focus, keyboard navigation, restoration, and tabpanel state.
- Proof: `SemanticTabController` now owns list/tab/panel roles, roving tab index, Arrow/Home/End navigation, activation focus restoration, and live panel attributes for both scenes. Unit and structural ownership guards pass.

**P2-18 — Dead and over-exported client/server authority symbols remain** — ✅ fixed 2026-07-13

- Anchors: `nextgoal.ts`, `legacycards.ts`, `scribbit.ts`, `migrations.ts`, combat `types.ts`, and `replaycommentary.ts`.
- Proposed fix: delete unconsumed implementations and make internal-only helpers private; expand export guards across client, server, and shared graphs.
- Proof: the unused Next Goal type, Scribbit battle helper, migration key getter, combat union, and Inkcast count are removed; `legacyEulogy` is private. The guard scans direct and aliased exports across the complete client/server/shared graph.

**P2-19 — Canonical Back/Rumble vocabulary drifts to bet/bracket** — ✅ fixed 2026-07-13

- Anchors: client `api.ts`, `nextgoal.ts`, `legacycards.ts`, and `OVERVIEW.md`.
- Proposed fix: use Back and Rumble vocabulary in comments and user-facing copy, with a lexical guard for retired synonyms in domain copy.
- Proof: player-facing API, goals, Legacy, founder flavor, forecasts, Scout notes, shared contracts, and errors consistently say Back and Rumble. A lexical guard rejects the retired synonyms in those sources.

**P2-20 — Stable hashing has a numeric-separator bypass and duplicate implementation** — ✅ fixed 2026-07-13

- Anchors: `rivalrunchallenges.ts`, `stablehash.ts`, `test-battle.mjs`.
- Proposed fix: compose the shared primitive and harden the ownership guard for numeric separators.
- Proof: Rival Run challenge selection composes `hashStringToUint32`; the ownership guard normalizes numeric separators before scanning while explicitly excluding combat's distinct byte-mixer domain.

**P2-21 — Runtime stat-key order is copied three times** — ✅ fixed 2026-07-13

- Anchors: `analyzer-core.ts`, `scoutnotebook.ts`, combat `config.ts`.
- Proposed fix: give shared code one immutable ordered stat-key catalog.
- Proof: `SCRIBBIT_STAT_KEYS` is the frozen shared catalog used by normalization, Scout projection, combat tie order, and client stat UI; tests reject copied runtime arrays.

**P2-22 — `dailyJob` retains a dead parallel post-publication path** — ✅ fixed 2026-07-13

- Anchors: `dailyJob.ts`, `scheduler.ts`, `post.ts`.
- Proposed fix: remove the uncalled `createPost` option and bespoke check/create/set branch.
- Proof: `dailyJob` no longer imports post keys, accepts a post callback, publishes, or returns obsolete post ids. Scheduler and `post.ts` remain the sole publication path; a source guard locks the boundary.

**P2-23 — Transaction cleanup diagnostics use the wrong lifecycle name** — ✅ fixed 2026-07-13

- Anchors: `dataDeletion.ts`, `storage.ts`.
- Proposed fix: pass operation-specific labels for player mutation, nightly mutation, and deletion cleanup.
- Proof: each acquire/renew/release family now supplies its own deletion, player-mutation, or nightly-mutation label; exact-count guards cover all nine cleanup sites.

**P2-24 — Verification leaves obsolete generated TypeScript artifacts** — ✅ fixed 2026-07-13

- Anchors: `app/dist/types`, `tools/tsconfig.client.json`, package verification scripts.
- Proposed fix: clean type output before compilation and guard generated/source parity.
- Proof: type-check removes `dist/types` before project compilation, eliminating stale Sketchbook/activityfeed/replaybattlerenderer/dex/remonsta artifacts. The test gate checks every generated client/server/shared JavaScript file has a live TypeScript source.

**P2-25 — Founder asset plan contradicts the canonical procedural-art path** — ✅ fixed 2026-07-13

- Anchors: `plans/creature-art-spec.md`, root/app README.
- Proposed fix: mark the old Higgsfield sprite plan superseded or rewrite it around the current procedural founder system.
- Proof: the plan now declares the static-sprite pipeline superseded and documents deterministic Inkbody/procedural rendering, runtime independence from remote image services, and live mobile proof requirements.

**P2-26 — P2-8 export guard covers only the client graph** — ✅ fixed 2026-07-13

- Anchors: `test-battle.mjs`, server/shared dead exports listed in P2-18.
- Proposed fix: extend direct and aliased export ownership checks to server/shared modules while removing the confirmed dead exports.
- Proof: the export guard now walks every TypeScript module under `src`, combines direct declaration exports with named and aliased re-exports, and locks the retired client/server/shared symbols out of the graph.

## Findings and immediate remediation

**P1-10 — The default verification scripts call a package manager that is not available in the supported workspace** — ✅ fixed 2026-07-13

- Anchors: `app/package.json` scripts `test`, `verify`, `deploy`, and `launch`; the repository's documented bundled-runtime workflow in `AGENTS.md` and the current Codex workspace.
- Evidence: with the bundled Node/pnpm runtime on `PATH`, `pnpm test` enters `npm run test:sim` and immediately fails with `sh: npm: command not found`. Direct `pnpm exec` checks pass, so the failure is orchestration drift rather than a product test failure.
- Impact: the canonical test and release gates are not runnable in the environment used to maintain the app. A green sequence of hand-entered commands can diverge from `test`, `verify`, `deploy`, and `launch`.
- Proposed fix: make package scripts package-manager-neutral by invoking the underlying tools directly or consistently using `pnpm`, then prove `pnpm test` and `pnpm verify` end to end. Keep Devvit upload/publish commands explicit and unexecuted during local verification.
- Proof: every nested script now uses pnpm; `pnpm test` and the complete `pnpm verify` pass with the current 142 groups and a production build. No Devvit command was run.

**P2-4 — Project status documents preserve mutually incompatible UI and verification truth** — ✅ fixed 2026-07-13

- Anchors: `GOAL.md:48`, `SUBMISSION.md:246`, `POLISH_AUDIT.md:565`, and this report's current verification record.
- Evidence: `GOAL.md` still presents 107 simulation groups as the current ship gate while the suite now has 116. `SUBMISSION.md` says the mobile Arena displays `PICK A WINNER`, while `POLISH_AUDIT.md` correctly records that section as removed and the current `ArenaHome.ts` renders a compact `TONIGHT'S RUMBLE` preview instead.
- Impact: contributors and submission reviewers can follow stale product copy and stale proof counts, recreating a UI the current source of truth explicitly removed.
- Proposed fix: update the active goal and submission copy from the current implementation and latest verification evidence; keep historical audit notes labeled as historical rather than current product truth.
- Proof: `GOAL.md` and `SUBMISSION.md` describe the current verification gate and the compact Rumble preview rather than the removed `PICK A WINNER` grid.

**P1-11 — Two bespoke modal surfaces bypass the canonical lifecycle** — ✅ fixed 2026-07-13

- Anchors: `app/src/client/lib/overlay.ts`, `app/src/client/lib/cloutboard.ts`, `app/src/client/lib/founderchroniclemargin.ts`.
- Evidence: Cloutboard and Founder Chronicle independently own scrim, dismissal, controls, and teardown without composing `CanvasModalOverlay`, so they omit its focus trap, Escape behavior, background inerting, focus restoration, and native action layer.
- Proposed fix: keep their domain rendering but route lifecycle and accessibility through `CanvasModalOverlay`.
- Files changed: `app/src/client/lib/cloutboard.ts`, `app/src/client/lib/founderchroniclemargin.ts`, `app/src/client/scenes/ScoutNotebook.ts`.
- Proof: both Phaser presentations now compose `CanvasModalOverlay` without adding a second visible surface. Close/continue controls have native mirrors; Clout loading and result state has an aria-live status; Escape, Tab trapping, Enter/Space, background inerting, initial focus, opener restoration, scene shutdown, and idempotent teardown flow through one owner. Scout also retains one modal handle, blocks duplicate opens, clears it on every close, and destroys it on shutdown. TypeScript, ESLint, 116 groups, and the production build pass. Live 393x852 proof verified one dialog, inert background roots, active initial control, Escape restoration, clean reopen, zero console warnings/errors, and unchanged paper pixels (`/tmp/scribbits-clout-modal-final-2026-07-13.png`, `/tmp/scribbits-founder-modal-2026-07-13.png`). Independent strict review passed after catching and re-verifying the duplicate-open guard.

**P1-12 — CI installs from a stale, conflicting dependency lock** — ✅ fixed 2026-07-13

- Anchors: `app/package.json`, `app/package-lock.json`, `app/pnpm-lock.yaml`, `.github/workflows/devvit-auto-deploy.yml`.
- Evidence: package metadata and pnpm lock resolve Vite 7.3.5, while `package-lock.json` records Vite 8.1.0 and CI still runs `npm ci` against it.
- Proposed fix: make pnpm the one install authority in CI and remove the obsolete npm lock.
- Proof: the workflow now installs pnpm 11.7.0, caches and installs from `pnpm-lock.yaml`, runs all checks through pnpm, and the stale npm lock is removed.

**P1-13 — The canonical verification gate does not execute production route composition** — ✅ fixed 2026-07-13

- Anchors: `app/package.json`, `app/scripts/test-battle.mjs`, `app/scripts/dev-mock.mjs`, `app/src/server/routes/api.ts`.
- Evidence: HTTP contract tests boot only the mock server. Production auth middleware, parsing, status mapping, and composition of the Hono routes have no runtime integration gate.
- Proposed fix: add a production-router harness with stubbed Devvit context and cover representative authenticated, mutating, validation, and failure paths.
- Files changed: `app/src/server/index.ts`, `app/scripts/api-contract-entry.ts`, `app/scripts/api-contract-runtime.mjs`, `app/scripts/api-contract-node-server.mjs`, `app/scripts/test-battle.mjs`.
- Proof: the simulation gate now bundles the real production `src/server/index.ts` entry through Vite SSR, aliasing only the Devvit platform runtime and TCP-listener boundary. It asserts the exact 24 public and 3 internal route inventory, then calls the mounted `/api` app to prove unauthenticated rejection, malformed-body mapping, read-only GET behavior, leased compatibility GET behavior, busy-lock conflict, successful mutation release, handler-failure release, and deletion's inverse lease. Suite-wide exit cleanup is installed before compilation and leaves no temporary harness tree after success or failure. All 118 deterministic groups pass, and independent strict re-review found no remaining composition defect.

**P1-14 — Operational proof is repeated with incompatible current counts** — ✅ fixed 2026-07-13

- Anchors: `README.md`, `app/README.md`, `GOAL.md`, `SLOP-AUDIT.md`.
- Evidence: the documents currently claim 98, 103, 116, and other historical simulation totals without consistently identifying old snapshots as historical.
- Proposed fix: keep one current verification statement and make historical audit evidence explicitly dated.
- Proof: the root README, app README, active goal, and this current audit now agree on 142 deterministic groups; dated proof entries remain historical evidence.

**P1-15 — Stat normalization has two independent algorithms** — ✅ fixed 2026-07-13

- Anchors: `app/src/shared/analyzer-core.ts`, `app/src/server/core/scribbit.ts`.
- Evidence: both enforce the same stat budget and bounds with independent rounding/distribution implementations; neither composes the other.
- Proposed fix: keep one shared normalization algorithm; server parsing should only sanitize unknown input before calling it.
- Files changed: `app/src/shared/analyzer-core.ts`, `app/src/server/core/scribbit.ts`, `app/scripts/test-battle.mjs`.
- Proof: `analyzer-core.ts` now owns the only normalization algorithm and accepts untrusted values directly. Client preview, request compatibility parsing, analyzer submission, and new Scribbit creation all compose it. Finite stored stats remain validated and copied unchanged so historical fights and Legacy Cards cannot drift when balance code changes. Deterministic tests cover exact malformed-input outcomes, tie order, 512 adversarial vectors, budget/bounds/integrality, idempotence, request/create parity, and historical stored-value preservation. TypeScript and all 116 groups pass; an independent strict review found no surviving duplicate or compatibility regression.

**P1-16 — Transaction retry and cleanup policy is copied across domains** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/core/inkStore.ts`, `rivalRun.ts`, `founderChronicle.ts`, `battleStore.ts`, `dataDeletion.ts`, and `nightlyStorageFence.ts`.
- Evidence: at least nine modules repeat transaction discard cleanup and several repeat five-attempt loops with inconsistent cleanup logging.
- Proposed fix: centralize narrow discard/retry mechanics beside `storage.ts` while retaining domain-specific reconciliation.
- Files changed: `app/src/server/core/storage.ts`, `inkStore.ts`, `rivalRun.ts`, `founderChronicle.ts`, `battleStore.ts`, `dataDeletion.ts`, `nightlyStorageFence.ts`, `practice.ts`, `clout.ts`, `scribbit.ts`, `app/scripts/test-battle.mjs`.
- Proof: `storage.ts` now owns the single five-attempt optimistic-transaction budget and one best-effort `DISCARD` policy. Cleanup failures emit one operation-labeled warning without replacing the original error. All nine former local helpers and every copied retry constant are removed, while each domain retains its own conflict interpretation, collision checks, token/epoch fencing, and ambiguous-commit recovery. The 117-group gate directly proves the retry budget, swallowed cleanup failure, diagnostic warning, and repository-wide absence of local generic owners, then re-runs existing exactly-once/reply-loss/race coverage. TypeScript, ESLint, structural search, `git diff --check`, and independent strict review pass.

**P1-17 — Player-mutation fencing depends on a hand-maintained GET-route list** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/routes/api.ts`, `app/src/server/core/legacy.ts`.
- Evidence: middleware separately lists GET suffixes whose loaders repair/write data. A new side-effecting GET can bypass the deletion lease unless two places are updated.
- Proposed fix: make GET handlers read-only or register mutating handlers through one lease-owning wrapper.
- Files changed: `app/src/server/routes/api.ts`, `app/scripts/test-battle.mjs`.
- Proof: non-GET actions still flow through the shared mutation-lease middleware, with deletion retaining the inverse side of the boundary. The five compatibility GETs that repair or migrate player state now register through `registerPlayerMutatingGet`, co-locating the lease with each handler; the detached suffix list and classifier are gone. The ownership test rejects both old symbols, requires all five protected registrations, and rejects direct `api.get` bypasses. TypeScript, ESLint, 116 groups, production build, lease race/heartbeat/reply-loss coverage, structural search, and independent review pass; the remaining GET routes were verified read-only with respect to player state.

**P2-5 — Pagination orchestration is copied across four gallery surfaces** — ✅ fixed 2026-07-13

- Anchors: `collectionbook.ts`, `legacycards.ts`, `MyBattles.ts`, `Gallery.ts`.
- Evidence: each separately owns page text, arrow positions, enabled state, and accessibility rectangles.
- Proposed fix: add one configurable pagination control in `ui.ts`.
- Files changed: `app/src/client/lib/ui.ts`, `app/src/client/lib/collectionbook.ts`, `app/src/client/lib/legacycards.ts`, `app/src/client/scenes/MyBattles.ts`, `app/src/client/scenes/Gallery.ts`, and `app/scripts/test-battle.mjs`.
- Proof: `paperPagination` now owns the page label, paper arrows, enabled/loading visuals, optional unavailable controls, and matching native accessibility rectangles. Collection, Legacy, Battles, and Legends retain only their domain page callbacks and labels. The TypeScript AST guard requires one canonical unaliased import/call per consumer, rejects direct arrow recreation, and rejects direct semantic-overlay recreation including accessor-based calls. TypeScript, ESLint, all 126 groups, production build, `git diff --check`, zero live browser warnings/errors, mobile Gallery and Battles captures (`/tmp/scribbits-paper-pagination-gallery-2026-07-13.png`, `/tmp/scribbits-paper-pagination-battles-2026-07-13.png`), native next/previous page interaction proof, and independent strict review pass.

**P2-6 — Gallery card press animation is duplicated** — ✅ fixed 2026-07-13

- Anchors: `collectionbook.ts`, `legacycards.ts`.
- Evidence: both create transparent hit areas, shrink/restore the card on the same pointer events, and keep near-identical restore helpers.
- Proposed fix: extract one card-interaction helper.
- Files changed: `app/src/client/lib/ui.ts`, `app/src/client/lib/pressinteraction.ts`, `app/src/client/lib/collectionbook.ts`, `app/src/client/lib/legacycards.ts`, and `app/scripts/test-battle.mjs`.
- Proof: `addCardPressInteraction` now owns the transparent hit area and no-hover card press treatment while Collection and Legacy retain only their detail actions, accessibility metadata, hit dimensions, and intentional `0.97 × 0.96` versus `0.97 × 0.97` scales. Dependency-free `bindPressInteractionEvents` owns event order. A mocked runtime test proves exactly one listener for pointerdown, pointerout, and pointerup, no pointerover listener for cards, press/release behavior, and release-before-single-activation order; AST guards reject local pointer wiring and restore helpers. TypeScript, ESLint, all 127 groups, production build, `git diff --check`, zero live browser warnings/errors, drag-out restoration plus single-detail activation on both Collection and Legacy, mobile captures (`/tmp/scribbits-card-press-collection-2026-07-13.png`, `/tmp/scribbits-card-press-legacy-2026-07-13.png`), and independent strict review pass.

**P2-7 — Gallery/Legacy naming has synonym drift** — ✅ fixed 2026-07-13

- Anchors: `registry.ts`, `Sketchbook.ts`, `appdock.ts`.
- Evidence: user-facing Legacy is internally the `sketchbook` tab in the `Sketchbook` scene reached by the `gallery` dock route.
- Proposed fix: converge on Gallery for the scene and Legacy for the tab, retaining only required migration compatibility.
- Files changed: renamed `app/src/client/scenes/Sketchbook.ts` to `Gallery.ts`; updated `app/src/client/game.ts`, `app/src/client/lib/registry.ts`, `app/src/client/lib/appdock.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/client/scenes/Replay.ts`, `app/src/server/routes/api.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`, `OVERVIEW.md`, `README.md`, and `plans/v3-scribbits-arena.md`.
- Proof: the file, class, Phaser scene key, dock route, replay return type, debug route, and transient registry key now use Gallery; the private tab and its state use Legacy/Legends vocabulary. The old values required no migration because they existed only in Phaser's in-memory registry. Production and mock responses now say active roster instead of sketchbook. A TypeScript lexical scan covers the complete client source family and rejects retired identifiers or exact route/tab literals across identifier casing, quoted strings, and template literals; synthetic bypasses lock each form. TypeScript, ESLint, all 124 groups, production build, clean generated bundle, `git diff --check`, fresh live registry proof (`scenes: ['Gallery']`, `galleryTab: 'collection'`), the 393x852 localhost capture (`/tmp/scribbits-gallery-naming-live-2026-07-13.png`), and independent strict review pass.

**P2-8 — Dead client exports, helpers, and tokens remain** — ✅ fixed 2026-07-13

- Anchors: `api.ts`, `registry.ts`, `scribbits.ts`, `ui.ts`, `theme.ts`, `practicelab.ts`.
- Evidence: repository-wide symbol search found no consumers for `fetchSplash`, four registry lookups, `addFittedDrawing`, `loadDrawings`, `dominantButton`, `SPACE`, `TOP_SAFE`, and `PRACTICE_PROMISE`.
- Proposed fix: remove unused implementations and stop exporting module-private helpers.
- Files changed: `app/src/client/lib/api.ts`, `app/src/client/lib/registry.ts`, `app/src/client/lib/scribbits.ts`, `app/src/client/lib/ui.ts`, `app/src/client/lib/theme.ts`, `app/src/client/lib/practicelab.ts`, and `app/scripts/test-battle.mjs`.
- Proof: eleven unconsumed declarations plus the unused `rosette` implementation are removed. Internal-only registry, drawing, pagination, panel, stat/progress, and Practice helpers/types are module-private while their live public callers remain unchanged. The source guard rejects every retired declaration in its canonical file, scans the complete client TypeScript graph for direct or renamed re-export aliases, and rejects any export declaration whose local name exposes a required private helper; synthetic direct-export and alias bypasses lock both cases. TypeScript, ESLint, all 132 groups, production build, structural source search, `git diff --check`, zero live browser warnings/errors, fresh mobile proof (`/tmp/scribbits-client-cleanup-live-2026-07-13.png`), and independent strict review pass.

**P2-9 — The plan still presents a rejected Redis drawing fallback as valid** — ✅ fixed 2026-07-13

- Anchors: `plans/v3-scribbits-arena.md`, `app/src/shared/arena.ts`, `app/src/server/routes/api.ts`.
- Evidence: plan/type comments describe Redis PNG bytes and `/api/drawing/:id`; production deliberately fails closed through Reddit media hosting and that route exists only in the mock.
- Proposed fix: document the production media boundary and label the mock-only URL explicitly.
- Files changed: `plans/v3-scribbits-arena.md`, `app/src/shared/arena.ts`, `app/src/client/lib/scribbits.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`.
- Proof: the architecture plan, shared contract, client resolver, and mock server now agree that production uploads validated drawings through Reddit media hosting and fails closed; `/api/drawing/:id` is local-mock-only and raw PNGs never enter Redis. The production Hono route inventory rejects a drawing endpoint under every HTTP method. A source-family persistence guard covers both raw image fields, every storage/transaction method able to create arbitrary string data, and arbitrary receiver names; synthetic cases lock direct, transactional, fenced, and aliased-receiver bypasses. TypeScript, ESLint, all 122 groups, the production build, `git diff --check`, and independent strict review pass.

**P2-10 — Retired navigation PNGs are still shipped** — ✅ fixed 2026-07-13

- Anchors: `app/src/client/assets/nav-*.png`, `app/src/client/lib/papericons.ts`, `app/src/client/lib/visualassets.ts`.
- Evidence: the dock uses procedural paper icons, but Vite still copies five unused PNGs totaling about 376 KB.
- Proposed fix: remove the retired files and keep the procedural icon authority.
- Files changed: deleted `app/src/client/assets/nav-arena.png`, `nav-battles.png`, `nav-draw.png`, `nav-gallery.png`, `nav-scout.png`, and `app/scripts/split-nav-icons.mjs`; updated `app/scripts/test-battle.mjs`.
- Proof: the obsolete generator and all five bitmap icons are gone, removing 375,740 source bytes. The procedural `paperDockIcon` path remains the sole dock authority, and the production build contains no navigation bitmap. A recursive asset/source guard rejects common bitmap formats when nav/dock/navigation appears anywhere in a filename or ancestor path; synthetic nested and renamed bypass cases are locked. TypeScript, ESLint, all 123 groups, production build, `git diff --check`, fresh 393x852 localhost proof (`/tmp/scribbits-nav-assets-live-2026-07-13.png`), and independent strict review pass.

**P2-11 — Practice storage documentation contradicts implementation** — ✅ fixed 2026-07-13

- Anchors: `app/README.md`, `app/src/server/core/practice.ts`.
- Evidence: docs say Practice has no storage, while the module owns Redis leases, migration guards, and rate keys.
- Proposed fix: say it has no durable gameplay or replay persistence.
- Proof: `app/README.md` now distinguishes Redis safety leases/guards/rate keys from durable Practice progression or replay state.

**P2-12 — Identical stable hashing is implemented twice** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/core/random.ts`, `app/src/shared/content/deterministic.ts`.
- Evidence: `hashTextToSeed` and `hashContentKey` contain the same FNV-1a implementation.
- Proposed fix: retain domain-facing names over one shared primitive.
- Files changed: `app/src/shared/stablehash.ts`, `app/src/server/core/random.ts`, `app/src/shared/content/deterministic.ts`, `app/src/server/core/mockRuntime.ts`, `app/src/client/lib/replaybattlebackground.ts`, `app/src/client/lib/proceduraldoodleplan.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`.
- Proof: `stablehash.ts` now owns the sole stateless FNV-1a primitive. Gameplay and authored content retain their domain-facing aliases without sharing mutable random-generator state; the local mock and both client presentation consumers also compose the primitive instead of carrying hidden copies. Fixed empty, ASCII, schedule-shaped, and Unicode vectors preserve outputs. A recursive source-family guard covers every TypeScript and MJS file under `src` and `scripts` and requires exactly one FNV offset basis and multiplier. TypeScript, ESLint, all 119 groups, `git diff --check`, temporary-output cleanup, and independent strict review pass.

**P2-13 — The Element runtime validator is copied** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/core/forecast.ts`, `app/src/shared/scoutnotebook.ts`.
- Evidence: forecast parsing and Scout Notebook projection independently encode the same four-value `Element` validator, while other client, combat, founder, and mock paths also carry copied complete lists or unions.
- Proposed fix: give the dependency-free shared layer one immutable Element catalog, derived type, and runtime validator; retain public type compatibility through re-exports.
- Files changed: `app/src/shared/elements.ts`, `app/src/shared/arena.ts`, `app/src/shared/combat/types.ts`, `app/src/shared/combat/engine.ts`, `app/src/shared/scoutnotebook.ts`, `app/src/shared/founders.ts`, `app/src/server/core/forecast.ts`, `app/src/server/core/scribbit.ts`, `app/src/server/core/mockRuntime.ts`, `app/src/client/game.ts`, `app/src/client/lib/livingpaper.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`.
- Proof: `elements.ts` now owns the immutable value list, derived `Element` type, and sole validator. Arena and combat retain compatible public type names while production parsing, combat input validation, stored Scribbits, Scout projection, founder validation, client debug mode, ambient creatures, and the local mock all consume the shared contract. Runtime tests prove every valid and representative invalid value. A recursive source-family guard rejects copied validator declarations, complete Element unions, and complete runtime arrays regardless of value order or single/double quote style; synthetic mutation cases prove each former bypass is caught. TypeScript, ESLint, all 120 groups, the production build, `git diff --check`, and independent strict review pass.
**P2-14 — Remaining no-op aliases create second import paths** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/core/legacy.ts`, `app/src/server/core/privacy.ts`, `app/src/server/core/battle.ts`, `app/src/shared/battle.ts`.
- Evidence: `getLegacyIndexVersionStorageKey` only renames a private key helper, and server Battle re-exports the shared level multiplier unchanged.
- Proposed fix: import the canonical names directly.
- Files changed: `app/src/server/core/legacy.ts`, `app/src/server/core/privacy.ts`, `app/src/server/core/battle.ts`, `app/scripts/test-battle.mjs`.
- Proof: Legacy now exports `getLegacyIndexVersionKey` directly and privacy deletion consumes that canonical name. Server Battle still imports the shared level multiplier for its own simulation work but no longer re-exports it. Runtime tests lock the complete export inventories of both server modules, preventing wildcard, direct, renamed, or wrapper aliases from silently restoring second import paths; source checks also reject the removed Legacy name and require privacy's canonical call. TypeScript, ESLint, all 121 groups, the production build, `git diff --check`, and independent strict review pass.

**P2-15 — Menu and install triggers copy arena-post setup** — ✅ fixed 2026-07-13

- Anchors: `app/src/server/routes/menu.ts`, `app/src/server/routes/triggers.ts`.
- Evidence: both repeat current-day, forecast, champion, and arena-post orchestration.
- Proposed fix: extract one `ensureCurrentArenaPost` operation and keep response formatting in each route.
- Files changed: `app/src/server/core/post.ts`, `app/src/server/routes/menu.ts`, `app/src/server/routes/triggers.ts`, `app/scripts/api-contract-runtime.mjs`, `app/scripts/api-contract-entry.ts`, `app/scripts/test-battle.mjs`.
- Proof: `post.ts` now owns `ensureCurrentArenaPost`; menu and install routes call it once and retain only host-specific response formatting. Scheduler intentionally keeps two explicit-day `getOrCreateArenaPost` calls for current and historical resolution publication. Post creation records a recoverable published marker, reconciles recent Reddit posts by title and `postData.dayNumber`, and keeps claims on ambiguous external or Redis failures, preventing duplicate posts after receipt or marker loss. Production Hono tests cover both route orders, malformed install JSON before side effects, receipt failure, marker failure with Reddit reconciliation, lookup failure, ambiguous submission failure, and concurrent menu/install. TypeScript AST guards preserve exported/local import identity and detect alias bypasses. TypeScript, ESLint, all 132 groups, production build, `git diff --check`, temporary-output cleanup, and independent strict review pass.

## Not slop (checked and cleared)

- `app/src/client/lib/analyzer.ts` is a thin compatibility facade that imports `app/src/shared/analyzer-core.ts`; it does not implement analyzer math. This is the intended client/server shared-analysis boundary in `OVERVIEW.md` under "Drawing analysis rules."
- `app/src/server/core/battle.ts` assembles server reports and imports `simulateCombat` from `app/src/shared/combat/engine.ts`; report assembly and combat outcome are separate responsibilities documented in `OVERVIEW.md`.
- `app/src/client/lib/appdock.ts` composes the shared dock renderer in `ui.ts`; it centralizes tab routes rather than duplicating the dock.
- `app/src/client/splash.html` and `splash.ts` intentionally use native HTML and a direct lightweight request so the Reddit inline view does not load Phaser, as required by `app/AGENTS.md` under "Entrypoints."
- A local mock is intentional, but only while it mirrors production. The mock's imported combat, forecast, founders, cosmetics, Scout, Practice, and narrative modules are healthy fixture composition; P0-1 and P0-2 cover only rules it still reimplements.
- `PlayStreakStorage` is a narrow structural port consumed by Streak only; it stores no competing state and accepts the canonical Redis adapter.

## Fixed since last audit

**P1-9 — Nightly player payouts bypassed the deletion boundary** — ✅ fixed 2026-07-13

- Files changed: `app/src/server/core/dataDeletion.ts`, `app/src/server/core/nightlyStorageFence.ts`, `app/src/server/core/storage.ts`, `app/src/server/core/dailyJob.ts`, `app/src/server/routes/scheduler.ts`, `app/scripts/test-battle.mjs`
- Proof: nightly and deletion acquisition advance one monotonic epoch. One branded `NightlyFencedStorage` checks both the live lease token and epoch, adds both keys to every existing WATCH transaction, and turns every direct mutator into a fenced Redis transaction. Lease expiry without takeover, token replacement, deletion or newer-worker takeover, and heartbeat renewal all fail closed without replaying ambiguous writes. The scheduler uses one lifecycle owner that acquires, heartbeats, supplies fenced storage through resolution and publication receipts, and token-safely releases; production `runNightlyArenaJob` no longer accepts raw storage.
- Verification: TypeScript, ESLint, 116 deterministic groups, table-driven coverage of every ArenaStorage mutator, direct and WATCH/MULTI stale-worker tests, heartbeat-conflict retry, ambiguous EXEC at-most-once proof, resumed full-job rejection, warning-free production build, mock bundle build, `git diff --check`, localhost HTTP 200, and independent strict review pass.

**P2-3 — Storage and random APIs retained no-op aliases** — ✅ fixed 2026-07-13

- Files changed: `app/src/server/core/inkStore.ts`, `app/src/server/core/random.ts`
- Proof: Ink persistence now names the canonical `ArenaStorage` and `ArenaTransaction` contracts directly and capsule selection calls `createMulberry32`; `InkStorage`, `InkTransaction`, and `createSeededNumberGenerator` are gone with no compatibility shim.
- Verification: structural search, TypeScript, ESLint, 113 deterministic groups, warning-free production build, mock bundle build, and `git diff --check` pass.

**P2-2 — Production build emitted an invalid Rollup option warning** — ✅ fixed 2026-07-13

- Files changed: `app/package.json`, `app/pnpm-lock.yaml`, `app/pnpm-workspace.yaml`
- Proof: Vite is aligned to 7.3.5, which satisfies `@devvit/start` 0.13.7 without passing the removed Vite 8 Rollup option. The required local `esbuild` platform setup is explicitly allow-listed beside the existing `protobufjs` compatibility script.
- Verification: clean dependency install and a warning-free production build pass.

**P1-8 — Public player mutations bypassed the deletion boundary** — ✅ fixed 2026-07-13

- Files changed: `app/src/server/core/dataDeletion.ts`, `app/src/server/routes/api.ts`, `app/scripts/test-battle.mjs`
- Proof: one route-wide middleware now acquires an exclusive, heartbeat-renewed player mutation lease for every authenticated non-GET action plus the five GET routes that mutate or repair player records. Deletion watches the same mutation lock before establishing its tombstone and generation; either race order permits exactly one owner. Release and reply-loss recovery are token-safe.
- Verification: TypeScript, ESLint, 113 deterministic groups, production build, symmetric acquisition tests, concurrent WATCH-conflict proof, reply-loss recovery, mutating-GET classifier review, and an independent Hono middleware review pass. P1-9 separately tracks the internal nightly scheduler.

**P1-7 — Standard actions bypassed the paper-icon family with emoji text** — ✅ fixed 2026-07-13

- Files changed: `app/src/client/lib/papericons.ts`, `app/src/client/lib/theme.ts`, `app/src/client/lib/ui.ts`, `app/src/client/lib/scribbits.ts`, `app/src/client/lib/detailmodal.ts`, `app/src/client/lib/collectionbook.ts`, `app/src/client/lib/legacycards.ts`, `app/src/client/lib/stickerdrawer.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/client/scenes/Bestiary.ts`, `app/src/client/scenes/Draw.ts`, `app/src/client/scenes/ScoutNotebook.ts`, and related presentation helpers.
- Proof: mood, care, element, stat, retry, resize, replay, Draw, battle, guide, trophy, lock, privacy, and sparkle states now use the shared cardstock icon family or concise plain labels. `theme.ts` has no emoji fields; platform emoji and raw action-arrow searches are clean. Arena return sheets also remember a session dismissal instead of reopening on every scene visit.
- Verification: TypeScript, ESLint, 112 deterministic groups, production and mock bundle builds, `git diff --check`, structural glyph searches, live 393×852 localhost Draw/Gallery/Arena inspection, and independent icon-family review pass.

**P1-6 — Practice/Belief migration and Belief privacy deletion were unfenced** — ✅ fixed 2026-07-13

- Files changed: `app/src/server/core/migrations.ts`, `app/src/server/core/dataDeletion.ts`, `app/src/server/core/practice.ts`, `app/src/server/core/scribbit.ts`, `app/src/server/core/privacy.ts`, `app/src/server/routes/api.ts`, `app/scripts/test-battle.mjs`
- Proof: Practice and Belief V1 writes now stop after an enforced compatibility window; V1 reads stop after each source TTL drain. Belief captures one immutable player-data generation, WATCHes it with the deletion lock, and aborts if deletion starts before commit. Privacy deletion atomically increments that generation, owns a token-safe lease, renews it continuously and at checkpoints, and verifies ownership before release.
- Verification: TypeScript, ESLint, 112 deterministic groups, production build, migration-boundary tests, an adversarial deletion-starts-before-Belief-commit test, token-safe renewal tests, localhost HTTP 200, and an independent narrow invariant review pass. This closes the Belief race only; P1-8 tracks the broader writer boundary.

**P2-1 — Pen effect type is declared twice** — ✅ fixed 2026-07-12

- Files changed: `app/src/client/lib/drawcanvas.ts`, `app/src/client/lib/pens.ts`
- Proof: DrawCanvas and the client pen catalog now consume `CosmeticPenEffect` directly from the shared cosmetic catalog. Both client `PenEffect` aliases and the copied `solid | rainbow | midnight` union are gone.
- Verification: structural search, TypeScript, ESLint, 107 deterministic groups, production build, mock bundle build, and `git diff --check` pass.

**P1-4 — Public route owns domain Redis records** — ✅ fixed 2026-07-12

- Files changed: `app/src/server/core/practice.ts`, `app/src/server/core/scribbit.ts`, `app/src/server/core/privacy.ts`, `app/src/server/routes/api.ts`, `app/scripts/test-battle.mjs`
- Proof: Practice guard/rate keys and claim/release operations now live in `practice.ts`; daily Belief receipt ownership and its canonical key live in `scribbit.ts`; privacy deletion imports that key. `api.ts` only orchestrates typed core calls and contains no matching Redis key or direct mutation. The cleanup exposed the separate transaction-hardening finding P1-6 above rather than hiding it.
- Verification: TypeScript, ESLint, 107 deterministic groups, production build, mock bundle build, `git diff --check`, structural searches, localhost HTTP 200, and independent ownership/failure-path review.

**P1-3 — Generic server storage contract lives inside Scribbit** — ✅ fixed 2026-07-12

- Files changed: `app/src/server/core/storage.ts`, `app/src/server/core/scribbit.ts`, `app/src/server/core/arenaStore.ts`, `app/src/server/core/battleStore.ts`, `app/src/server/core/clout.ts`, `app/src/server/core/dailyJob.ts`, `app/src/server/core/founderChronicle.ts`, `app/src/server/core/inkStore.ts`, `app/src/server/core/legacy.ts`, `app/src/server/core/moderation.ts`, `app/src/server/core/post.ts`, `app/src/server/core/privacy.ts`, `app/src/server/core/rivalRun.ts`, `app/src/server/core/rumbleReturn.ts`, `app/src/server/core/scoutNotebook.ts`
- Proof: `ArenaStorage`, `ArenaTransaction`, and `SortedSetEntry` now have one dependency-free home in `storage.ts`. All 13 former callers import the generic contract directly; `clout.ts` keeps its Scribbit-specific `CurrentPlayer` import separate, and no compatibility barrel or runtime dependency was introduced.
- Verification: TypeScript, ESLint, 105 deterministic groups, production build, mock bundle build, `git diff --check`, structural searches, localhost HTTP 200, and an independent dependency/import review pass.

**P1-5 — Shape Power guidance is authored in three places** — ✅ fixed 2026-07-12

- Files changed: `app/src/shared/combat/shapepowercontent.ts`, `app/src/shared/combat/index.ts`, `app/src/client/lib/drawonboarding.ts`, `app/src/client/scenes/Draw.ts`, `app/src/client/scenes/Bestiary.ts`, `app/scripts/test-battle.mjs`
- Proof: one shared catalog now owns name-free drawing and Field Guide cue fragments; formatters append the canonical display name. Draw imports the shared drawing cue, while Field Guide derives order through `DOMINANT_STAT_TIE_ORDER` and `PRIMARY_POWER_BY_DOMINANT_STAT`. The copied Draw record, four hardcoded Field Guide names, duplicated dominant-stat mapping, and literal Colorburst Echo fallback are gone.
- Verification: TypeScript, ESLint, 105 deterministic groups, structural searches, production build, mock bundle build, localhost HTTP 200, and independent content review pass.

**P1-2 — Modal lifecycle has parallel implementations** — ✅ fixed 2026-07-12

- Files changed: `app/src/client/lib/overlay.ts`, `app/src/client/lib/carepicker.ts`, `app/src/client/lib/capsulemachine.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/client/scenes/Bestiary.ts`
- Proof: Care, the complete Mystery Ink machine and prize state, and every Field Guide section now compose one `CanvasModalOverlay` lifecycle for dialog semantics, background inertness, focus trapping, Escape, live status, opener restoration, and scene-shutdown cleanup. Feature-specific Phaser scrims, paid-pull reconciliation, prize actions, care availability, and two-tap deletion remain intact. The Capsule has an unconditional teardown path and guards async continuations; Field Guide rows are native-accessible openers and deletion keeps a trapped focus target.
- Verification: TypeScript, ESLint, 104 deterministic groups, production build, mock bundle build, structural searches, localhost HTTP 200, and two independent lifecycle reviews pass. Visual pixels are unchanged; the last verified Arena capture remains `/tmp/scribbits-arena-final.png`.

**P1-1 — Typed registry is bypassed by raw keys** — ✅ fixed 2026-07-12

- Files changed: `app/src/client/lib/registry.ts`, `app/src/client/scenes/ArenaHome.ts`, `app/src/client/game.ts`
- Proof: Arena, Gallery tab, Arena focus, and Rumble-receipt keys now exist only inside `registry.ts`; ArenaHome and the browser debug harness use typed accessors. A repository search finds no direct reads or writes for those keys outside the registry boundary.
- Verification: TypeScript, ESLint, 104 deterministic groups, production build, mock bundle build, and `git diff --check` pass.

**P0-2 — Mock economy and progression are a second rules engine** — ✅ fixed 2026-07-12

- Files changed: `app/src/shared/arena.ts`, `app/src/server/core/scribbit.ts`, `app/src/server/core/inkStore.ts`, `app/src/server/core/dailyJob.ts`, `app/src/server/core/mockRuntime.ts`, `app/src/server/routes/api.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`
- Proof: the mock now imports canonical XP and Ink rewards, level projection, care progression, battle outcomes, Rumble rewards, capsule cost/pity/drop/progress/inventory projection, title equip, accessory consumption, Scribbit creation/cloning, and the cosmetic catalog through `mockRuntime.ts`. Its copied thresholds, reward aliases, capsule selector, inventory reducers, PNG identity readers, TypeScript source transpilation, and legacy clone reducer are gone. Fixture state and in-memory operation receipts remain intentionally local.
- Verification: TypeScript, ESLint, 104 deterministic groups, production build, and mock bundle build pass. HTTP contracts cover one-draw-per-day enforcement, fresh draw/care/capsule progression, duplicate care, idempotent capsule replay, and insufficient Ink; direct bundle coverage proves inventory projections and the hard-pity boundary.

**P0-1 — Mock submission trusts client combat identity** — ✅ fixed 2026-07-12

- Files changed: `app/src/server/core/scribbit.ts`, `app/src/server/routes/api.ts`, `app/src/server/core/mockRuntime.ts`, `app/scripts/dev-mock.mjs`, `app/scripts/test-battle.mjs`
- Proof: Devvit and the local mock now call one `validateAndAnalyzeScribbitSubmission` boundary that validates request shape, decodes both 512px PNGs, verifies rendered/base binding, enforces minimum ink, and overwrites client stats/element with analyzer output. The old mock readers are gone.
- Verification: TypeScript, ESLint, 103 deterministic groups, production build, mock bundle build, and a live forged local POST all pass; the forged `storm`/Charm payload returned an Ember build `{ chonk: 52, spike: 10, zip: 28, charm: 10 }` derived from the submitted red square.

## Not yet verified

- `Replay.ts`, `ArenaHome.ts`, and `ui.ts` remain unusually large. File size alone is not a finding; a later audit should trace whether their internal sections have real duplicate implementations before proposing splits.
- Generated/static asset reachability was not fully audited because the current worktree contains ongoing visual changes and `app/public` is not the active asset root.
