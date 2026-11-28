# Recipe: building a Jarvis agent

One agent = one job, run by Claude on demand or on a schedule. Agents don't talk to each other; everything they produce
goes to his one "Waiting for you" list; nothing reaches a parent or the public without his approval. Each agent is built
in four stages and moves up only when he says so. Ignored for two weeks = switched off.

## 0. Intake (5 minutes, with him)
Name · team (Centre / Marketing / Business; marketing ones are sub-agents of `ag_marketing`) · one-line job · what it
reads · what it may eventually change · how often · what "right" looks like. Ask at most 5 questions.

## 1. Register it in Jarvis
- `projects/ag_<slug>`: {name:"Agent: <Name>", agent:true, side:true, status:"paused", team, icon?, parent?, n: job
  description (start with "Job: <one line>"), since, up, etaMin}.
- Stage tasks `tasks/tag_<short>_s1..s4` with `proj`, `noq:true`, `s:"ready"` (copy an existing agent's four for the shape):
  s1 "do it once by hand with Claude", s2 "write the job description", s3 "rehearsal until right twice in a row",
  s4 "live on its schedule".
- (The "New agent" button in the Agents tab does this step for him.)

## 2. Stage 1 — by hand
Do the job once in a build session with him watching, read-only (dry runs only). Write `_planner/agents/<slug>/STAGE1.md`:
what was read, what was found, every judgement call he had to make (each becomes a rule). No names, fees or ids in the repo.

## 3. Stage 2 — written down
Fill `templates/JOB_TEMPLATE.md` into `_planner/agents/<slug>/JOB.md` (name-free) and copy the same text into the
project's `n`. Every judgement from stage 1 is a numbered rule. Mark task s1 done only on his word.

## 4. Stage 3 — rehearsal
- Make its run-now task from `templates/RUN_NOW_TEMPLATE.txt` (rehearsal fill-ins, real Jarvis link from settings).
  He creates it in Claude's scheduled tasks himself, with the connectors attached (tasks Claude creates can't take
  connectors). Put the task id in the project's `trigger`.
- He presses Run now (or a schedule fires it). Read each run's `agentruns` doc and queue items with him; fix the job
  description or add rules (`instr`) until it is right twice in a row.

## 5. Stage 4 — live
Only on his word: switch the task text to the live fill-ins, add a schedule if wanted, set the project active.

## Checklist before saying "it's ready"
- [ ] Project, four stage tasks, icon and team show correctly in the Agents tab.
- [ ] JOB.md has no personal data; `n` matches it.
- [ ] Run now produces a finished `agentruns` doc and sensible queue items (or a clear "failed" reason).
- [ ] BUILD_PLAN.md / agents README updated; committed and pushed.
