# Scribbits — Founder Art Direction

Status: the old Higgsfield-to-static-sprite plan is superseded.

Founders now use the same deterministic Inkbody/procedural-doodle renderer as
player Scribbits. Their canonical identity lives in `app/src/shared/founders.ts`;
shape planning and drawing live in `proceduraldoodleplan.ts` and
`proceduraldoodleart.ts`. This keeps every fighter visually honest to the same
stat, element, and Shape Power rules instead of introducing a privileged bitmap
character system.

## Shipping rules

- Do not add a parallel `public/creatures` sprite registry.
- Derive each founder silhouette from its canonical stats and element.
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
battle views; their dominant stat and element must match their procedural form;
the production build and visual regression flow must pass without a static
founder-sprite fallback.
