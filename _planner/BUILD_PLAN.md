# Build plan: "Today" planner app (no personal data in this file)

Direction change (2026-11-13): the user doesn't want another project to maintain. No new repos, hosting,
API keys or subscriptions. Build it as **one private claude.ai Artifact page** that he opens on his phone:

- `db` capability = the record store (tasks, plans, log). Claude can read/write it from scheduled sessions
  with the ArtifactData tool. No personal data goes in this public repo, ever.
- `dictation` = talk into it; typing always works too.
- `sample` = the page asks Claude to turn a brain dump into tasks and to build today's plan on demand.
- Port the rules from `src/` (dedupe, unknown dates stay unknown, latest safe start, capacity rule,
  reasons for every pick, silence = uncertain, never "done" without his say-so) into the page.

## Screens (phone first)
1. **Today**: the 3 things, why each, first action, what was left out, "Done / Not today / Stuck" buttons.
2. **Dump**: one big box + mic. "Got it: 3 new, 1 merged, 1 question". Updates like "finished X",
   "lost the morning" also go here and update records / replan.
3. **Everything**: by area, with status; quick edit; historical/unconfirmed queue.
4. **Done for the day**: shows what's marked, asks about the rest, can be skipped.
5. **AI help**: jobs Claude can do (drafts, research, plans), saved output, "redo" button, ready-for-review.

## Cycles (each ~5h apart, max 4-5; stop early when it's genuinely useful)
1. Publish the app (Today + Dump + Everything) with db + sample + dictation. Seed his answers. Verify db.
2. Day plan quality: tiers/reasons/capacity in-page; end-of-day check-in; replan; edge cases.
3. AI help: bounded jobs with saved output + redo; first real job from his list.
4. Morning routine: a daily scheduled run writes the plan into the db and pushes a phone notification
   (only after the manual plan works). Weekly review.
5. Polish from his real use; cut anything he doesn't use.

## Status after cycle 1 (2026-11-13)
- Published as a private artifact titled "Nimish HQ" (find it with the Artifact tool's list action). Source: `app/today.html`.
  Republish that same file to update. Capabilities: db (owner-only rules), sample, dictation, tts.
- db collections: `tasks` (t,a,s,p,due,hard,est,next,n,ai,wait,out), `students` (fee{m,due,paid,given}, slots, owed, credit),
  `attendance`, `plans/{YYYY-MM-DD}`, `dumps`, `drafts`, `settings/main`. Seeded from his brain dump and his fee sheet in Drive.
- Direction added by him: he wants agents for the centre's repeating work (fee notes, attendance -> makeups owed ->
  free-slot suggestions -> parent messages, follow-ups). Data sources found: the "2026/2027 Income Calculations" sheet
  in Drive (fees per student per month). No attendance or timetable source exists, so the app is now where those are captured.
  WhatsApp cannot be read from here; messages are drafted for him to send.
- Next: (2) timetable-aware makeup finder + month-end fee-note run from attendance; sync payments from the Drive sheet;
  (3) scheduled morning plan + push; weekly centre report; (4) polish from use.
