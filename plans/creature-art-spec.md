# Scribbits — Founder Art Direction

Status: the old Higgsfield-to-static-sprite plan is superseded.

Founders now use a deterministic authored Canvas character roster. Their
canonical game identity lives in `app/src/shared/founders.ts`; their twenty
unique silhouettes, palettes, and drawing routines live in
`foundercharacterart.ts`, with texture creation owned by
`proceduraldoodleart.ts`. Missing community images still use the generic
stat-shaped fallback in `proceduraldoodleplan.ts`.

## Shipping rules

- Do not add a parallel `public/creatures` sprite registry.
- Give each founder one recognizable silhouette, prop/anatomy, and palette.
- Keep generation deterministic so Gallery, Scout, Rumble, and Replay agree.
- Render locally at runtime; gameplay cannot depend on a remote image service.
- Keep player drawings visually primary. Founders are authored opponents, not a
  separate collectible-species system.

GPT Image or Higgsfield may produce non-shipping concept boards. A concept only
becomes a runtime asset after an explicit art-direction migration updates the
renderer source of truth, performance budget, accessibility treatment, and
deterministic visual tests together.

## Proof bar

All twenty founders must remain readable in the live mobile Gallery, Scout, and
battle views; the production build and visual regression flow must pass without
a static founder-sprite fallback. Automated coverage must keep the canvas roster
in exact lockstep with the twenty shared founder definitions.
