# Planner core (private planner engine, no personal data)

The deterministic core of a personal daily planner: records, capture with duplicate matching, a daily
planner that gives a reason for each choice, evening reconciliation, idempotent calendar-write planning, and
bounded AI jobs. Plain Node 20+, no dependencies.

> **This repository is public** and served at tutorwise.ca. Folders starting with `_` are left out of the
> GitHub Pages (Jekyll) build, so this folder is not published to the site, but it **is** visible on GitHub.
> Never commit real tasks, profile data, tokens or calendar exports here. The production record store must live
> in a private store (a database, or a private repo/Drive), and the code should move to a private repo before
> real data or secrets are involved.

```
npm test      # the acceptance tests from the handoff (12 tests)
npm run demo  # prints a morning brief from synthetic records
```

## Modules

| File | Responsibility |
| --- | --- |
| `src/model.js` | Task states, date types, invariants (hard deadline needs evidence; Done needs completion evidence) |
| `src/store.js` | One authoritative record per task, optimistic versioning (stale writers get a `ConflictError`), idempotency keys, activity log. In-memory or an atomically written JSON file; a database adapter has to honour the same interface |
| `src/capture.js` | Raw message → saved records + acknowledgement. Original text kept, duplicates merged with both sources, historical imports quarantined, unknown dates stay unknown |
| `src/planner.js` | `plan()`, `replan()`, `renderBrief()`. Free blocks from calendar + protected time, ~67.5% capacity rule, latest-safe-start with lead time and buffer, explicit tiers with one-sentence reasons, “left out on purpose” list, source freshness |
| `src/reconcile.js` | Evening reconciliation (silence = uncertain, never done) and weekly review (deferred ≥3×, unconfirmed, missing dates, historical queue) |
| `src/calendar.js` | Planner-owned block writes as a draft list of operations; deterministic keys stop duplicates; user-edited or deleted blocks are left alone; no writes when calendar data is stale |
| `src/jobs.js` | Delegated jobs with hard step/cost/time limits enforced in the loop, checkpoints, partial output saved, output state separate from the task state |

## Priority tiers (in order)

1. Must start today (latest safe start reached: remaining effort + external lead time + buffer)
2. Unblocks other items or someone is waiting
3. One reserved block for an agreed personal/long-term goal
4. Latest safe start within 3 days
5. Delay has a named cost
6. Everything else, by slack

Within a tier: items already in this morning's plan stay first (a replan doesn't reshuffle the whole day), then
least slack, then shortest. Historical, unclear, waiting and blocked items are listed with the reason instead of
being planned.

## Not yet built

The language-model parsing step (it proposes `candidates` for `capture()`), a real calendar adapter, the
scheduled runner, delivery and the capture interface. These depend on the account and interface decisions.
