# GOAL: Ship Remonsta for Reddit "Games with a Hook" hackathon

**Goal:** Build and submit Remonsta — a Devvit Web + Phaser creature collector where community activity drives spawns and all monsters are community-designed — playable on r/Remonsta before July 16, 2026 8:00am GMT+7.

**Mode:** durable execution goal

**Scope / Non-goals**
- Scope: `app/` (cloned from reddit/devvit-template-phaser), per plans/4-remonsta.md + plans/remonsta-implementation.md
- Non-goals: no Pokémon tropes/IP; no payments; trading is first cut if behind; no publishing without user's devvit login

**Persistence:** this file + git commits. Plans in `plans/`.

**Target output**
- Final: working game (type-check + lint + build pass), uploaded via `devvit upload`, live demo post on r/Remonsta
- Match: core loop playable (open Wilds → catch minigame → Dex updates → community % moves); UGC design pipeline present; artist credits everywhere; mobile-viewport clean
- Evidence: build output, playtest screenshots, demo post link

**Agent plan**
| Role | Owner | Output |
|---|---|---|
| Planner/orchestrator | Fable (main, minimal tokens) | this file, shared contract, sequencing |
| Coder: backend + Devvit wiring | Codex CLI (must verify real Devvit APIs from node_modules/@devvit + developers.reddit.com — never hallucinate APIs) | src/server, devvit.json, src/shared extensions |
| Coder: frontend/Phaser | Opus agent | src/client scenes/UI |
| Reviewer/verifier | Fable + codex review (separate pass) | type-check/lint/build + gameplay verdict fixed/not-fixed |

**Work checklist**
- [x] W1 Scaffold from official template. Evidence: app/ exists, deps pinned
- [x] W2 Shared contract authored (src/shared/remonsta.ts)
- [ ] W3 Backend: species registry (20 launch species), spawn-window engine, server-validated catch, dex, streaks, daily post job, design-submission pipeline. Done when: type-check passes + routes respond in playtest
- [ ] W4 Frontend: Boot/Preloader/Habitat/Catch/Dex scenes vs contract, placeholder art, mobile portrait. Done when: build passes, game playable with local mock
- [ ] W5 Integration + juice polish (Fable). Done when: full loop works in playtest
- [ ] W6 Real creature art (image gen per plan prompts) replaces placeholders
- [ ] W7 User gates: `devvit login`, create r/Remonsta, `devvit upload`, install, demo post
- [ ] W8 Seed subreddit + Devpost submission

**Success criteria**
- [ ] S1 `npm run type-check && npm run lint && npm run build` all pass
- [ ] S2 Core loop verified in playtest with screenshots (catch → dex updates)
- [ ] S3 UGC pipeline: submit design → vote → appears in spawn pool (verified with test data)
- [ ] S4 Demo post live on r/Remonsta (requires user login — escalate)

**Stop/escalate:** stop when S1–S4 pass. Escalate to user for: devvit login/OAuth, subreddit creation, Devpost submission. Max 3 fix attempts per failing check, then escalate.
