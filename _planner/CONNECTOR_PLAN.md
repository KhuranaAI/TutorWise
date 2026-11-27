# Jarvis connector: written plan (not started)

Status: plan only. Nothing below is built. The owner must approve it before step 2. No personal data belongs in this
file: the repository is public.

## Goal
Claude's voice and chat, on phone and computer, read and change Jarvis's real records at once, with HQ closed and no
Google Sheet in between. The HQ dashboard and its in-app text box keep working exactly as they do.

## What is true today (checked Nov 27)
- Jarvis's records live in the Artifact database of the HQ page. Reachable from the page, from a Claude Code session
  (ArtifactData) and from scheduled runs; not reachable from a server outside Claude.
- Voice reaches Jarvis through the Google Sheet board (Claude writes a row, HQ applies it while open).
- Custom connectors already work in his voice mode (the Scheduler connector is used that way, write tools included,
  with an approval prompt per write unless "Always allow" is set).
- The HQ page can call a connector it declares, by display name (`mcp` capability). Limits from the runtime docs:
  polling no faster than ~30 s per watch, 64 watches, 1 MiB per call, a call may take up to ~130 s before it fails,
  consent once per connector, and these error codes to design for: needs_reauth, server_not_connected,
  server_unavailable, tool_error, approval_required.
- Claude reaches custom connectors from Anthropic's cloud, so the server must be public HTTPS with OAuth (or fixed
  headers). Plans: Pro and up (support docs).
- The size of the page's database use (counted in `today.html`): 21 collections, about 170 call sites
  (`db.doc` 140, `db.collection` 32), 26 realtime listeners (`onSnapshot`), 5 `where`, 3 `orderBy`, 3 `limit`,
  125 `set`, 84 `update`, 6 `delete`. No one-off reads: every read is a listener. That is a small surface.

## Design
```
voice / chat (phone, computer) --> Jarvis connector (Worker, OAuth, one user) --> Jarvis store (SQLite)
HQ page (Artifact) --mcp capability, display name "Jarvis"--> same connector --> same store
scheduled agents --> same connector (attached when set up) or ArtifactData while the old store is still primary
```
- Store: one generic document table (collection, id, JSON, version, updated_at) plus a change log (sequence number)
  for polling. Same semantics the page already uses: merge update, field delete marker, version pinning, where /
  orderBy / limit / cursor, batch. Migration is then a 1:1 copy and the page needs no new data model.
- Page adapter: a wrapper with the same shape as the page's `db` (doc, collection, where, orderBy, limit, onSnapshot,
  set, update, delete). `onSnapshot` = one full load, then `changes_since(seq)` about every 30 s while the page is
  open and visible. Writes apply to the local copy first (the page already does this), then batch to the connector.
  A setting (`settings.store`: `artifact` | `connector`) chooses; the default stays `artifact`, so the page is
  unchanged until the owner flips it.
- Tools (about ten, small on purpose, because every call adds seconds in voice):
  `jarvis_overview` (today's plan and calendar, due soon, open questions, unsorted notes, last messages, learned
  facts, in one call), `jarvis_search`, `jarvis_add_task`, `jarvis_update_task`, `jarvis_done`, `jarvis_note`,
  `jarvis_add_event`, plus generic `doc_get`, `doc_query`, `doc_write` (field checks per collection), `export_all`.
  Reads carry `readOnlyHint`. The helper tools port the in-app rules (fields set, duplicate check). Generic writes
  may not touch the plan layout fields or `plans/*` and `days/{today}`: the page owns layout until background jobs
  move off it.
- Server instructions (what the voice Claude reads on every chat): Jarvis's written rules condensed from the in-app
  prompt (never invent, 12-hour times, call him sir, never volunteer fees, projects are fillers, weekends are days
  off). Later these become one shared skill used by the app, the connector and the agents.
- Login: single user. The OAuth approval page asks for a passphrase only he knows (stored hashed). Revoking = remove
  the connector in Claude settings and rotate the secret.
- Where records live: the owner's own Cloudflare account (a D1 SQLite database), not a server of ours. Student
  documents and parent contact details stay in the admin system; only Jarvis's own records move.

## Steps (a gate after each; nothing existing is removed or renamed)
0. Two-minute check, owner: in a normal Claude chat, give the HQ artifact link and ask it to read one record from
   the artifact's database. If a chat can already do that, a connector may be unnecessary. Unverified either way.
1. Proof, throwaway: a test connector with three tools and about twenty test records. Owner adds it in Claude
   settings. Measure: voice on phone and on computer (does it feel right, how many approval prompts); HQ page
   reading and writing through it (round trip for 1, 200 and 1,000 records; the page can declare a custom connector
   and the consent flow works); server CPU time per request against the free plan's 10 ms limit.
   Go if the typical page round trip is under about 1.5 s and a full load is under about 5 s. Otherwise plan B: the
   page stays on the Artifact database and only voice and agents use the connector, fed by a one-way copy.
2. Build beside the old: real connector, login, tools, server instructions, migration tool (copy, never move;
   verified by counts and checksums), nightly backup, the page adapter behind the switch (off). Owner tests voice
   against a copy of the records, so nothing real changes.
3. The move, one evening: fresh copy, flip the switch. HQ and voice use the new store. The page keeps writing every
   change to the old store too for 30 days. The Google Sheet inbox stays as a second path for a week.
4. After a week of use and the owner's word: retire the Sheet inbox. Never delete the old store before then.

## What could break
- Voice and the page changing one record together: field-level writes plus version pinning; the adapter re-reads
  and re-applies on a conflict.
- An approval prompt on every voice write: set "Always allow" per Jarvis tool (the owner has met this with the
  Scheduler connector).
- Page feels slow because each call goes through Claude's shell: local-first writes, batching, a cache; step 1
  measures it before anything is committed. Plan B above.
- Connector down or login expired: the page shows its last copy read-only with a banner; voice says it cannot
  reach Jarvis; the Sheet inbox is the backup path during the trial.
- Layout is still computed by the page: voice changes records at once, but the day's timeline and plan refresh when
  HQ opens (or when background jobs later move to scheduled runs). Voice answers "what's next" from the last plan.
- Mobile: the docs disagree on adding connectors from the phone app; the owner's existing voice use of custom
  connectors suggests it works. Confirm in step 1.
- Platform change (connectors and scheduled runs are young features): keep the tool set small and the store portable.

## Cost (estimate; confirm at step 1)
- Cloudflare free plan: 100,000 Worker requests a day, 10 ms CPU per request, D1 5 GB, 5 million rows read and
  100,000 rows written a day. Normal use (a few hundred calls a day) is far below the request and D1 limits.
- Likely $5 a month (Workers Paid), because loading everything at once may exceed 10 ms of CPU. Step 1 measures it.
- No Claude cost beyond the plan: voice and chat use count as normal use; scheduled runs count against the daily run
  allowance. Address: free workers.dev, or a subdomain of the owner's domain.
- Range: $0 to $5 a month.

## Switch back
- Any time before step 4: set `settings.store` to `artifact`. The page returns to the old store, which has every
  change the page made. Changes made only by voice are brought back by one `export_all` and a batch write into the
  artifact database (a few minutes).
- Remove the connector in Claude settings. The Sheet inbox and the in-app text box never stopped working.

## Open questions
- Where do the centre's existing connectors (Scheduler, Billing, Teacher) run? If on one host, Jarvis's may sit beside
  them. Not visible from this repository.
- Whether a normal Claude chat can reach the artifact database directly (step 0).
- Whether the page can declare a custom connector without a directory listing (step 1).
