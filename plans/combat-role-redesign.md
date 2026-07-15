# Three-role combat model

This plan replaces the retired four-role draft. New fights expose exactly three
classes:

| Drawing color group        | Role     | Beats    | Weak to  |
| -------------------------- | -------- | -------- | -------- |
| Brown + coral + orange     | Brawler  | Mage     | Longshot |
| Gold + green + blue        | Longshot | Brawler  | Mage     |
| Aqua + purple + pink       | Mage     | Longshot | Brawler  |
| Black + grey + white       | Neutral  | —        | —        |

The matchup edge should matter without deciding the fight by itself. The
balancer must keep each intended edge near 53–62% across deterministic seeds.

## Compatibility

- Stored Scribbits keep their original four raw stats.
- Zip-dominant Scribbits become Longshots in new v7 fights through a battle-local
  stat projection; persisted stats are never rewritten.
- Gunner, Smearstep, and their weapon renderer remain only for archived v4-v6
  transcripts.
- Persisted Gear ids beginning with `smearstep-` stay stable, but their current
  affinity and player-facing copy belong to Longshot.

## Player-facing rule

Every role surface must show the same short rule: Brawler beats Mage, Mage beats
Longshot, Longshot beats Brawler. Draw groups, the Field Guide, rival selection,
the VS ceremony, and replay headers should never require a player to infer the
counter from stats.

`OVERVIEW.md` is the product source of truth. Combat constants live in
`app/src/shared/combat/roles.ts`; balance proof lives in
`artifacts/balancer/role-cycle.md`.
