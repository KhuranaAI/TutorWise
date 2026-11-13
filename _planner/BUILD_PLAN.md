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

## Status after cycle 2 (2026-11-13, overnight)
- App v2 published: makeup finder (quietest free hours from the timetable), tappable wake/workout routine with 7-day
  counts, "From your overnight agent" card (reads `agent/latest`), close-the-day card, monthly fees chart (`stats/revenue`),
  auto-plan on first open of the day. Checked in a local Playwright harness with mock data (light/dark, 400px, no errors).
- Agent layer: `agent/memory` (profile, priorities, rules, sources, log) in the db. A daily routine "Nimish HQ morning agent"
  runs at 05:47 America/Toronto inside the original build session (fresh routine sessions get no Drive connector):
  fee-sheet sync, files unsorted dumps, hygiene flags, writes the day's plan + `agent/latest`, sends a push.
- Drive findings: no current timetable, attendance log or contact list exists. Costs through Aug 2026 are in "Financial Dashboard".
- Not reachable: schedule.tutorwise.ca (outside the session's network allowlist; source not in the accessible repos).
- Next: confirm the 05:47 run worked end to end; import timetable once he dictates it; payment-sync edge cases; weekly review polish.

## Status after cycle 3 (2026-11-13, afternoon): voice-first rebuild
- He opened the app on his phone, found no mic, and asked for: built-in listening, a "brain" animation, spoken replies
  ("Understood, sir"), dark look, and for the app to adapt to his irregular wake times. He also wants to be told
  "it's ready, use it" with almost no explanation.
- App v5: home screen is one voice core (canvas brain: idle / listening / thinking / speaking), a greeting line,
  a text box, and ONE next action. Other things fold into sections. Spoken replies via the `tts` capability, with the
  browser's speechSynthesis as a fallback where `tts` is not offered. Dictation via the `dictation` capability with
  auto-send after about 3 s of silence. Both capabilities are only offered in Chromium desktop tabs and the Claude desktop app's
  main window; on phones (Claude mobile apps, Safari) they resolve null, so he types or uses the keyboard mic there.
- Also: asks "When did you get up today?", plans from the real wake time, payments write to his Google Sheet through the
  `mcp` capability (Google Sheets get_values/update_values) with a stored undo, attendance is one record per student per day,
  task c01 shows a live unpaid total, sections keep their open state across re-renders.
- Verified in a Playwright harness with mocked capabilities and stand-in data: full voice turn, sheet write + undo,
  stuck-context follow-up, attendance dedupe, teach/evening modes, light theme, reduced motion. Not verified on a real phone.

## Backlog for the remaining build cycles (do real work each cycle; do not idle)
1. Fee-sheet sync inside the app: on open (once Sheets consent exists) and from a "Sync with fee sheet" button in Centre.
   Sheet shows more paid -> update app; app shows more -> write; new month tab -> roll fees over.
2. Check whether a fresh routine session can use ArtifactData and PushNotification. If yes, move the morning agent to a
   fresh lean session per run (this session's context is large) and add an evening "close the day" push after teaching.
3. Guided timetable capture: one weekday at a time by voice ("Who comes on Monday?"), offering the stale April grid
   from Drive only as a starting point to confirm.
4. Four-week wake-time and workout trend in "Your week", and a short spoken weekly review.
5. Read his real dumps, marks and habits and tune prompts and layout to what he actually does.
