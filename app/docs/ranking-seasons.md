# Ranking seasons

Scribbits ranking seasons are authoritative Devvit server state. The browser can
read the current campaign and leaderboard, but it cannot create a season, change
dates, award points, pause ranking, or finalize results.

## Rules

- Every season is exactly 60 UTC Arena days (`startArenaDay` through
  `startArenaDay + 59`).
- Rumble Clout payouts also award season points in the same Redis transaction.
- The default rule is one season point per Clout. A preauthored `double-clout`
  event awards two season points per Clout.
- Event rules and dates cannot change after their season starts.
- A pause stops ranking for whole Arena days without rewriting earlier scores.
- The nightly job freezes the top 100 after day 60, writes reward receipts, and
  creates the next draft. Scheduling the next draft remains an admin decision.
- Scribbits, equipment, battle records, and lifetime Clout do not reset.

## Owner-only setup

The Devvit menu is moderator-visible, then the server performs a second,
fail-closed authorization check. A caller must be both a current subreddit
moderator and explicitly listed by immutable Reddit account ID.

After the first upload, configure the allowlist from `app/`:

```sh
devvit settings set seasonAdminUserIds t2_your_reddit_account_id
```

Multiple owners use comma-separated IDs. Usernames are intentionally rejected
because they can change. The setting is global and secret.

Authorized owners can use the subreddit menu item **Manage Scribbits seasons**
to create or update a draft, add a preauthored event, schedule, pause, resume,
finalize an ended season, or cancel a future season. Every command requires an
admin reason; destructive or publishing commands also require confirmation.
Both opening and submitting the form repeat the owner and moderator checks.

## Storage and execution

- Catalog: `season:catalog`
- Published schedule: `season:schedule`
- Per-season ranking: `season:{id}:ranking`
- Frozen finals: `season:finals`
- Per-player rewards: `season:{id}:rewards`
- Append-only admin records: `season:admin-audit:*`

Player-data deletion removes the caller from live rankings, reward receipts,
and frozen final snapshots.

Install and upgrade triggers bootstrap Season 1. The `/api/arena`, `/api/season`,
and `/api/season-board` reads also repair a missing bootstrap idempotently. The
nightly scheduler resolves the final Rumble before finalizing that season, so
day 60 points are included exactly once.
