# Draw editor polish and collectibles

## Goal

Make the mobile Draw screen readable at a glance: a clear header, a large canvas,
simple stroke controls, truthful live shape stats, and collectible paints/brushes
whose remaining uses are visible before submission.

## Product rules

- The eight base colours and round brush are always available.
- Collectible paints and brush styles are inventory copies, not permanent unlocks.
- A selected collectible is consumed atomically only when a submitted Scribbit
  actually used it; abandoned drawings and Practice Lab never spend copies.
- The client previews the effect, while the server validates ownership and owns
  the decrement during the existing Scribbit submission transaction.
- Drawing shape always splits the same 100-point stat budget. Cosmetics never add
  extra stat points.

## Done means

- Back/title/canvas no longer collide at mobile width.
- Brush style and width are shown as strokes, not ambiguous symbols.
- CHONK, SPIKE, ZIP, and CHARM update after every completed edit and total 100.
- Owned collectible paints/brushes show copy counts and empty items cannot be used.
- Submission consumes used collectible copies exactly once, including recovery.
- Type-check, lint, build, simulation tests, and live browser proof pass.
