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

## Scheduler link (2026-11-13, evening)
- His lesson scheduler is schedule.tutorwise.ca: a single-file Firebase app (project `tutorwise-os`, Firestore
  `schedulerConfig/main` + `schedulerWeeks/{Monday}`) with the real timetable, attendance, makeup balances and
  billing months. No connector exists for it and the artifact page cannot reach Firestore, so the link is:
  scheduler -> Apps Script in his Google account (`bridge/Code.gs`, `bridge/appsscript.json`, hourly, read-only)
  -> Google Sheet "TutorWise Scheduler Export" -> app (`schedSync()` via the Google Sheets connector) and morning agent.
- The app has the setup steps under Centre > "Link it" (the bridge code is injected into `app/today.html` as
  text blocks; re-run the inject snippet if `bridge/` changes). The session's environment is now "TutorWise HQ"
  with schedule.tutorwise.ca allowed.
- Tested only against a fake Firestore built from the scheduler page's own default data. NOT yet run against the real project.
  If the user-token read fails for him, the script falls back to a service-account key in Script Property `SA_KEY`.
- First thing next cycle: search Drive for the export sheet. If it exists, set `settings.schedSheetId`, run the
  sync logic once from here, check name matching (students carry `sched` = scheduler spelling), then build on it:
  fee notes from attended hours per billing month, makeup slot finder with teacher loads and capacities.

## Cycle 4 (2026-11-13, 5:50 pm Toronto)
- App v7: two-way fee-sheet sync inside the app (`feeSync()`: on open once Sheets access was allowed, plus
  "Check my fee sheet now" in Centre). Sheet shows more paid -> app updates; app has a pending payment -> written to the
  sheet; changed dues, new month tab and new students on the sheet are picked up; `stats/revenue` month is refreshed.
  Scheduler-link errors are explained in plain words. Harness scenarios 6 and 7 cover the link and the fee sync.
- Finding: a fresh routine session CAN use ArtifactData (read and write this artifact's db) and has PushNotification,
  but has no Google connectors. A fresh run is about 45k tokens; a run inside this session re-reads a very large context.
- So the morning agent moved to a fresh session per run: routine "Nimish HQ morning agent (lean)" (05:47 Toronto).
  It works only from the database; the app keeps fees and the scheduler copy fresh on open. The old in-session routine
  "Nimish HQ morning agent" is disabled (kept for reference; delete once the lean one has run for a few days).
  If he ever wants the agent itself to read the sheets overnight, he has to create the routine in the claude.ai
  Routines UI with the Google Sheets and Drive connectors attached (this tool cannot attach connectors here).
- He offered to "program the scheduler differently". Not needed: the blocker is that its data sits behind his login,
  not how it is built. Keep the scheduler as is; the export-sheet bridge is the link.
- Still open: he has not run the bridge setup yet; evening "close the day" push (ask him first); 4-week trend view.
- Lesson from testing the lean agent: text passed to `fire_trigger` arrives as a second, separate turn AFTER the
  routine's own prompt has already run in full, and the session treats it as data. A "dry run" switch therefore has to be
  written into the routine prompt itself. The test at 17:56 ran for real (plan rewritten, one push sent); its output was good.

## Cycle 5, the last scheduled one (2026-11-13, 10:50 pm Toronto)
- His use so far: he opened the app twice on his phone (tapped Up and Workout on and off), has not typed anything,
  marked nothing, has not run the scheduler bridge. His fee sheet has not changed since Nov 10 (checked from here tonight).
- App v8: a sync can no longer reuse an existing student's document id when it adds a student (the scheduler has a
  second "Jasreet" that would have overwritten the fee-paying one); the Money section shows when the fee sheet was last
  checked, with a "Check now" button; a short "How to use this" section sits at the bottom of Today.
- Routines now: "Nimish HQ morning agent (lean)" daily at 05:47 Toronto (fresh session, database only). The older
  "Nimish HQ morning agent" stays DISABLED and must not be deleted from another session without care: it is bound to the
  build session, and deleting a routine deletes the sessions it started. No more build cycles are scheduled.
- Open items for whenever he comes back: (1) he runs Centre > Link it on a computer, then check name matching with the
  real export; (2) confirm phone pushes arrive; (3) fee notes from attended hours per billing month and a makeup finder
  that uses teacher loads, once real scheduler data flows; (4) evening "close the day" push if he wants one.

## 2026-11-15: first real use, and why it failed (app v9 and v10)
- He typed two messages on his phone: he had just got up, had a personal block that afternoon, wanted his WEEK planned,
  and said what the rest of the day was for. The app ignored the block, gave an ordinary day plan and no week. Causes:
  (1) no notion of blocked time; (2) the "woke" op started its own replan, and the guard in `makePlan` then dropped
  the replan that carried his note; (3) no week plan existed; (4) nothing he said was kept beyond the last 12 messages.
  He then said the app is "a long way from usable": it must learn him, remember what he does and says, and refer back
  by day of the week. He also said phone audio does not work (he uses an iPhone).
- Now in the app:
  - `days/{date}`: one record per day, written through a single queue (`dayWrite`): `ev` (said, did, skip, stuck, up,
    workout, paid, att, busy, open, week), `busy:[{s,e,x}]` blocked time, `sum` (written by the overnight agent).
  - `mem`: learned facts `{x, k: you|pref|pattern|person, d: weekday or null, src, at, on}`. The intake prompt returns
    `remember` / `forget`; the Memory tab lists facts (Forget, Add) and the last days.
  - `recallText()` goes into the intake, day-plan and week-plan prompts: learned facts (today's weekday first),
    earlier days with the same weekday, the last few days. The day plan also gets what he said today (outranks the
    usual preferences), today's blocked time, and today's entry from the week.
  - Ops added: `busy`, `free`, `plan_week`. One replan per message (`re`), and `makePlan` queues a second request
    instead of dropping it. `freeMinutes()` subtracts blocked time; weekends run to 22:00, capped at 300 minutes.
  - `weeks/current`: 7-day layout (`makeWeek()`, "This week" section, "Plan my week"). Uses the "complex" tier, falls
    back to "default".
  - Weekday recall on the home screen: "Last <weekday>: ..." and a one-tap chip that repeats last week's block.
  - Recurring tasks can be planned on their day; Done on one marks the plan, not the task.
  - Sound: on iOS the speaker controls stay hidden unless a silent test utterance actually starts; elsewhere a failed
    attempt hides them. In-app listening and voice still exist only where the platform offers them (desktop).
- Overnight agent prompt now: closes yesterday (`sum`), learns weekday patterns into `mem` (seen twice before it is a
  pattern), keeps `weeks/current` rolling, plans from the week and the weekday's real history, and refers back to the
  same weekday in the brief and the push.
- Checked: harness scenarios 1-9 with mocked capabilities; the six real-style messages run through the new intake
  prompt on a Sonnet-class model gave the right operations; rendering checked against a copy of the real records.
  Not checked on his phone.
- Removed a real first name that had been used as an example inside the intake prompt.
- Open: he has not run Centre > Link it; whether phone pushes arrive is still unconfirmed; on the phone, voice means
  talking to Claude in the chat (this session files what he says there into `days` and `mem`).

## 2026-11-16: his written spec (app v12)
He sent a six-part update: hands-free voice, a daily check-in, instant capture, a calendar, one-off versus recurring,
and a list of things for the day. What changed:
- **One-off rule.** Yesterday's same-weekday reminder (chip, greeting question, the busy part of "Last <weekday>") is
  removed. Nothing repeats unless he says so. Prompts and the overnight agent carry the same rule.
- **Calendar inside the app.** `events/{id}`: `{t, date, s, e, approx, tent, where, n, rep, skip, task}`. Timed events are
  blocked time (`busyOn`). Ops: `event`, `event_change`, `event_cancel`, `show_calendar` (`busy`/`free` still work).
  Clash check against teaching hours and other events (`clashes`). "Calendar · next 3 weeks" section on Today.
  Google Calendar is NOT connected on his account yet (only Drive and Sheets). When it is: read its tool schemas in a
  session, declare it under the `mcp` capability, mirror `events` both ways. Do not guess its argument names.
- **Daily check-in.** "What's on the docket?" (also a chip) makes the assistant ask one question about time, energy,
  place, fixed commitments and what has to get done (op `checkin`, `V.ctx.checkin`, valid 20 minutes). His answer is
  stored as `days/{date}.cx` (op `constraints`), named items get `today` + `todayN` (ops `today`, `add` with
  `today:true`), then the day is planned (up to 6 picks, his order) and spoken (`plan.say`). `facts()` computes done /
  slipping / on track / may-be-forgetting; plans carry `how` and `forgot`, shown under the picks.
- **Capture.** "I need to get X done" is added at once, with at most one question (when, or how long).
- **Projects.** `projects/{id}`: `{name, status, next, n}`; op `project`; listed at the top of Everything.
- **Voice.** No sending on a pause. His turn ends on "you can speak now" (regex `STOP`), a tap, or Space. Hearing: the
  platform's dictation where offered, else the browser's speech recognition (auto-restart when it drops, 7 s start
  timeout, falls back to typing and remembers a refusal for the day). Speaking: the platform voice, else the device
  voice, unlocked by a silent word on the first real tap (the old unlock ran on `pointerdown`, which is not a user
  activation on touch screens, so phones never spoke). Typing path: text that ends with the stop phrase sends itself,
  which makes the phone keyboard's dictation usable without the Send button. Settings has "Check voice".
  Platform dictation can only start from a click or key press, so after a reply he taps or presses Space to answer;
  with the browser recogniser the mic reopens by itself.
- Known limit, unchanged: the Claude mobile apps give a page neither dictation nor the Claude voice, and no microphone.
  Whether the device voice now speaks on his iPhone is unverified until he taps "Check voice".
- Overnight agent prompt: one-off rule, events as blocked time, carry counter for unfinished picks, `how`/`forgot`,
  projects, and the plan is a draft that his check-in replaces.
- Checked: harness scenarios 1-11 (mocked capabilities, including a fake speech recogniser that drops mid-sentence);
  twelve real-style messages and one day plan run through the new prompts on a Sonnet-class model with a copy of the
  real records. Not checked on his phone.

## 2026-11-16, later: mic on the phone, app icon, new look (app v14 and v15)
- **Mic on iPhone: not possible inside the artifact.** The viewer refuses microphone access to pages on every platform
  unless a capability grants it; `dictation` and `tts` resolve null in the Claude mobile apps and no device-mic capability is
  on this account. The browser speech-recognition path stays in the code as a fallback but will be refused the same way.
- **Voice line.** A separate Claude Code session titled "Jarvis line" (Sonnet-class, id kept in `settings/main.voiceLine`,
  not in this repo) acts as the voice front end on the phone: he dictates with Claude's own mic, it reads and writes the
  same database with the same rules as the app (capture, calendar with clash check, one-off rule, check-in, projects)
  and answers in one or two sentences. Tested: a dry-run capture (about 14 s a turn, correct clash and one question)
  and one real pinned write. Where the app has no mic, the brain opens a sheet with a link to it, plus a
  "Talk by voice" chip. Replies there are text, not speech.
- **A real standalone app** (own home-screen icon, own microphone, spoken replies) is possible but leaves Claude: it
  needs hosting, his Firebase for data, a speech-to-text service and a paid model API key behind a small server.
  Not started; his decision.
- **Icon.** Artifact icon set to a brain. `app/icon-1024.png` is a home-screen icon (the app's neural brain in a signal
  ring); on iOS it is applied through a Shortcut that opens the artifact link, since the page cannot set the icon of
  a claude.ai bookmark.
- **New look (v14).** One dark look, Chakra Petch for display type. Home = the core (brighter, instrument ring), one
  line from the assistant, the composer, then "Today's docket": the plan's picks as a checklist (tap the circle to
  finish, tap again to undo, tap a line for Not now / Stuck), fixed times shown in place (calendar events, teaching),
  a line comparing work left with time free, and a progress bar. Under it: done / on track / slipping (opens a
  sheet), "Don't forget", and links to the week and the centre. Tabs: Today, Calendar (week strip + next 3 weeks),
  Tasks (projects, old items, list), Centre (fees, who owes, lessons), More (AI help, Memory, settings, reports).
- Finishing a task whose title mentions a workout also ticks the workout habit.

## 2026-11-16, midday: what real voice use showed (app v16)
He used the app by voice on a computer for twenty minutes. Dictation worked. What went wrong, in his words and in the
log: it kept bringing up items from the old list (fees, a trip, students), it asked "which day?" and "how long?",
it wrote a name the way speech-to-text heard it, it put message drafts into task titles, and it stopped listening
after every answer. He wants "the native talking feature" and a week list that is kept arranged for him.
- **The week list is the plan.** Tasks carry `wk` (that week's Monday), `wkN`, `day`, `pin`, `est`, `carried`, `msg`.
  `layoutWeek()` places open items on days (kept where they are; unfinished days roll forward; new ones fill from
  today up to a per-day target), `applyWeek()` writes changed days and `syncPlan()` writes `plans/{today}` with
  `by:'week'` (picks = items pinned to today). No model call in the shuffling. "Not today" moves an item to the next
  day. The Calendar tab shows the week as a board; tapping an item moves it. `rollWeek()` carries last week's
  leftovers. `weeks/current` and the AI day/week planners are no longer used when a week list exists, and there is no
  automatic AI plan any more.
- **Intake rules.** Whatever he says he has to do goes on the week list (`add` with `week:true`, or `week_add`); never
  ask which day or how long (guess `est`); never raise older-list items; `pin`, `unpin`, `week_remove`, `rebalance`,
  `show_week`; a reply of a few words while he is listing; names spelled as in his records; "no reply needed" is
  honoured. After the model's reply the app itself adds where new items landed (`pinnedSay`).
- **Messages.** A message he has to send is a task with a short title and the wording in `msg`, shown with a Copy
  button. Longer pieces go through `draft` to AI help. Formats he dictates are kept whole as `mem` kind `style`
  (`t` = what it is for) and are passed to both the intake prompt and the drafting prompt.
- **Conversation voice (platform dictation).** One tap opens the mic and it stays open (`V.conv`). A turn ends on a
  pause (`settings.pause`, default 3 s; longer when the sentence is plainly unfinished), on "I'm done", or on a tap.
  Words spoken while it thinks are kept for the next turn. Because the platform voice cannot speak while the platform
  dictation is listening, answers in a conversation use the browser voice, and input is ignored while it speaks
  (plus an echo check against the last answer). "That's all" or "stop listening" ends it. Settings offer the old
  one-answer-at-a-time mode with the platform voice.
- Checked: scenarios 12 (conversation) and 13 (week list) in the harness; eight real-style messages through the new
  intake prompt on a Sonnet-class model with a copy of his records. The conversation loop has not been heard on his
  computer yet: echo handling and the browser voice are the parts to watch.
- **Scheduler.** He wants the assistant to read and edit his lesson scheduler. The clean route is a remote MCP server
  for the scheduler, added to Claude as a custom connector; the app then calls it through the `mcp` capability
  (declare it with the tool list its builder returns; do not guess argument names), and agent sessions get it too.
  A brief for the scheduler's own builder was handed to him. This replaces the Apps Script export idea.

## 2026-11-16, afternoon: the conversation mode failed on his computer (app v18)
- He reported that it never answered on its own (he always had to tap) and that the computer voice "sounds like
  Stephen Hawking"; he wants the original Claude voice back.
- Silence detection had two weak points: it waited for the speech service to settle a phrase (an empty live guess)
  and it treated every live-guess event as new speech, so a re-sent guess kept the clock from running. Now "he
  stopped" means nothing new heard (settled text plus live guess) for the pause time; then the mic is stopped, which
  delivers the last words, and the turn is sent. A stop with no settled text falls back to the last live guess.
- The hands-free conversation mode is switched off (`convOn()` returns false; its code stays). Answers are spoken in
  Claude's voice. The platform's voice cannot play while its dictation listens, and dictation only starts from a
  click or key press, so each turn starts with Space or a tap; Space while it speaks interrupts it. The settings for
  the conversation mode and the computer voice are gone; the pause setting stays.
- The stop phrases accept curly apostrophes. Harness: `run3.js` (live-guess-only speech, re-sent guesses, Space to
  talk, Claude voice). Not yet heard on his computer.

## 2026-11-16, evening: productivity score (app v19, v20)
- He asked for a daily productivity score from what he planned versus what he did, where unplanned work he says was
  just as important still counts.
- `days/{date}.pl` records what was planned: the ids on today's docket with their minutes (`trackPlan()`, run when the
  plan or the day record changes). Items the app moves off today by itself, or that he takes off the week, leave `pl`;
  items he pushes ("Not today") stay and are marked `pushed`. Items already done when they first appear are extras.
- `days/{date}.ex` holds his say on extras: `{taskId: {imp:true}}` for done tasks that mattered, and
  `{c...: {t, min, manual:true}}` for work that is on no list (op `credit`). Op `counts` flags a done task.
- `scoreOf(date)`: earned = minutes of planned items done + unplanned items done today at half their minutes (full when
  `imp`) + manual credits; score = earned / planned minutes (120 if nothing was planned), capped at 100. It is stored in
  `days/{date}.score` (debounced `scoreSync()` after each render; written only when it changes). Before teaching ends
  the card says "So far" instead of a verdict. The sheet lists planned items (done, pushed, not yet), extras with a
  "counts fully / half" toggle, the last 7 scores and their average, and "Add something that counted".
- The intake prompt carries a score line and rules for `counts` and `credit`; the overnight agent finalises yesterday's
  score with the same formula (`final:true`) and mentions it in the brief and the push.
- Daily commitments: a recurring task with `daily:true` and `est` goes onto every day's docket (`dailies()`), counts as
  planned work, and its minutes come off each day's budget for the week list. His study block (chemistry, physics,
  grade 12 functions, about 90 minutes a day) was converted from an all-day repeating event into `tasks/d_study`.
- Seeded today's `pl` from the current docket (with the done flags) so today's score is right from the start.

## 2026-11-16, night: Jarvis by voice through a shared Google Sheet (app v21)
- Claude's voice mode exists only in normal Claude chats, not in Claude Code sessions (the "Jarvis line" was
  dictation only and is no longer linked from HQ). He confirmed that a normal Claude chat in voice mode can read his
  Google Sheets through his connector, so Jarvis is now: a Claude project "Jarvis" whose instructions point at a
  Google Sheet "Jarvis Board" in his Drive (id in `settings/main.boardSheetId`, not in this repo).
- Tabs: About (Jarvis's operating rules, written once), Today, Week, Calendar, Memory (written by HQ), Inbox (Jarvis
  appends one row per change: time, his words; HQ fills status and answer).
- HQ: `boardSync()` writes the four tabs a few seconds after changes (at most every 20 s, unchanged tabs skipped);
  `inboxPoll()` runs every 40 s while HQ is visible, claims each new row (writes "Working <device>", re-reads it so two
  open copies of HQ don't both apply it), applies it with `applyText()` (the same intake prompt and operations as
  anything he says in HQ, without voice or screen changes), then writes "Done hh:mm" and the reply.
- Limits: changes from Jarvis apply only while HQ is open somewhere; the board is as fresh as HQ's last sync. The
  overnight agent has no Google tools, so it cannot refresh the board.

## 2026-11-17: live scheduler connector (app v22)
- The scheduler's builder shipped a remote MCP connector ("TutorWise Scheduler": get_week, list_students, get_timetable,
  get_makeups, list_teachers, month_summary, find_free_slots, resolve_name, mark_attendance, add_session, move_session,
  cancel_session, set_timetable, undo; writes take dry_run and return a change_id). Replaces the Apps Script export idea.
- HQ: `settings.schedConn:true` makes `schedSync()` call `connSync()`: get_week, list_students and get_timetable fill
  `sched/week` (sessions with status and kind), each student's slots, owed hours and lessons per week. The page declares
  the server with those three read tools only. Writes are not wired into HQ yet; Jarvis (a normal Claude chat with the
  connector) can already call the write tools, per the new About rows on the Jarvis Board.
- Not yet: scheduler writes from HQ's own intake, month totals from month_summary, free-slot search for makeups.
- Schedule editing from HQ (v23): intake ops `sch_attend`, `sch_cancel`, `sch_move`, `sch_add`, `sch_timetable`, `sch_undo`
  call the scheduler's write tools (`schWrite`). Student names are matched locally, else `resolve_name` (only an exact
  match is used; otherwise it answers "did you mean X"). Move and cancel find the session id through `get_week`, and ask
  for a start time when the student has two lessons that day. The scheduler's own summary is appended to the reply, the
  change_id is kept in `S.lastSch`, an Undo toast follows, then `connSync()` refreshes. Weekend and capacity rules are the
  scheduler's own. Not done: dry-run previews, free-slot suggestions for makeups.

## Nov 19 update: chief of staff (v35)
Second script in today.html (source copy: app/brain.js) replaces horizon/dayBudget/layoutWeek/applyWeek/agenda/openPicks
and wraps finishTask/renderToday/renderCal/renderMem. Rolling 7-day plan (pool: week list, items with a day in range,
due within 9 days, critical, chore/person instances) ranked by prio() (his priority, deadline, age, project, deferrals);
timeline(d) places timed items, a focus block for project/long work in the learned peak window, then the rest around
fixed events (with travel buffers) and teaching from the scheduler. Learning (agent/patterns): wake per weekday/weekend,
peak hours from 'did' events, actual/estimate ratio from task.act (measured from Start or the gap since the last finish).
Nightly plan at settings.planAt (21:00; planOnce for tonight), light days (days/{d}.low), day starts (days/{d}.start),
chores (recurring+every), people (collection people), projects, habits/streaks (habits/{date}), notes (note/app/inbox),
Chat tab, What's next, nudges by days-to-due, wins and the weekly review. Runs while the app is open.
