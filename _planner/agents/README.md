# Agents

Each agent is a scheduled Claude run with one job. It reads and writes Jarvis's records and the centre's connectors; it
never talks to another agent, and the owner only ever talks to Jarvis.

Every agent is built in four stages, never skipping one:

1. **By hand.** The owner and Claude do the job once in a chat with the connectors, dry-run first. Every step, check
   and mistake is noted in the agent's `STAGE1.md`.
2. **Written down.** The notes become a job description (a skill): what to do, in what order, what to check, when to
   stop, what never to do.
3. **Rehearsal.** It runs on a schedule, drafts only, changing nothing outside the approval queue. Repeated until it
   is right twice in a row.
4. **Live.** It runs on its schedule. Nothing reaches a parent or is posted publicly without the owner's approval.

The owner sets up each scheduled run himself, so he can attach the connectors it needs. An agent he ignores for two
weeks is switched off. No names, fees or other personal data belong in this folder: it is a public repository.

## Agent list (status, 2026-11-27)
Each is a project in Jarvis with its four stages as tasks. Paused ones are ideas or waiting their turn.
- Active: Centre Admin (stage 1 pending), Makeup Balance (stage 1 dry run done, rulings pending).
- Paused, in build order: Marketing, Front Desk, Business Advisor, Balance Coach.
- Ideas, paused: Video Editor (raw footage to a finished edit), Carousel Maker (one idea to every slide), Email
  Marketer (newsletters), SEO and AEO (posts that rank on search and in AI answers), AI Sales Rep (enquiries, finding
  customers, a CRM; overlaps Front Desk and Marketing), Personal Content (own channels, reuses the video and carousel
  agents).
Rules that hold for all of them: output waits in the approval queue; nothing is sent, posted or published without the
owner's approval; agents do not talk to each other.

## Families (a plan for about six months out; nothing here is built)
- An agent family belongs to one business: a Marketing agent plus its sub-agents (content makers: video editor,
  carousel maker, email marketer, SEO and AEO). The AI sales rep sits beside Marketing, not under it (marketing finds
  customers, sales converts them); it may merge with Front Desk.
- Sub-agents do not call each other or the Marketing agent. Coordination goes through records: the Marketing agent
  writes a brief per content maker, each content maker reads its brief and puts drafts in the approval queue.
- Write each job description once (as a skill). Each business gets its own instance with a business profile: offer,
  audience, voice, brand colours, channels, approval rules. TutorWise is the first instance; a personal-content family
  would be a second; each later business gets its own.
- Run allowance: scheduled runs count against the plan's daily run allowance. Prefer one scheduled run per family that
  applies its sub-agent skills in turn over many separate schedules; give a sub-agent its own schedule only when it
  needs different connectors or timing.
- Project pages in Jarvis carry this in their notes (`parent` on each sub-agent project); the Projects tab has no
  hierarchy view yet.

## Another idea, pinned
- Lesson Planner (paused, may never happen): plans lessons and makes content for students (worksheets, practice
  questions, outlines) from the owner's instructions or from the notes on each student's file. For the owner first,
  possibly the other teachers later. Separate from the Marketing family. Drafts only; learning documents are read only
  on request. Builds on the lesson notes in the teacher portal, the student files in the admin system and the existing
  reading-comprehension work.

## Talking to an agent (from v75)
Each agent's page in Jarvis has a Talk tab and a message box. What he says there can:
- answer, approve, reject or edit that agent's waiting items (`queue/<id>`, marked `via: 'agent chat'`);
- add a standing instruction: `projects/<agent>.instr` = [{t, at}];
- add a one-off request for the next run: `projects/<agent>.nextAsk` = [{t, at, done?}];
- pause or resume the agent (`status`).
The conversation is kept in the `agentchat` collection ({agent, who: me|agent, text, at, ops}).

**Every run of an agent must first read its `instr` and open `nextAsk` items and follow them**, then mark each `nextAsk`
it handled as `done: true`, saying so in its run summary. The chat never runs the job itself and never sends anything out.

## Record format (what shows on an agent's page)
**Each run → `agentruns/<RUN_ID>`** (RUN_ID like `run_<short>_<UTC yyyymmddhhmm>`, or the one the app passes):
`{agent:"ag_<slug>", at, startedAt, finishedAt, status:"running"|"done"|"failed", kind:"rehearsal"|"live", saved:false|true,
title:"one line", found:"plain summary, under 1200 chars", changes:["would change / changed lines"]}`
→ Output view: one card per run, newest first ("Rehearsal · nothing saved" / "Saved" / "Failed" + found). Runs view: when, kind, status, title.

**Each question or draft → `queue/<id>`:**
`{agent:"ag_<slug>", at, kind:"question" (options: 2-3 short answers → buttons) | "draft" (body → Approve/Edit/Reject/Copy),
title:"one line", rehearsal:true|false, status:"waiting", run:RUN_ID}`
→ top of Output as "Questions for you"; he can also type an answer. Answers land as `status:"answered", answer`.
If he answers in the agent's own chat, that chat writes the same: `{status:"answered", answer, doneAt, via:"agent chat"}`.
Never re-ask an item that is waiting or answered. Pin writes to existing documents with `if_version`.

**Agent chats.** Each active agent has its own Claude chat session that owns its job files (`_planner/agents/<slug>/`)
and dry runs, and takes its open questions to him one at a time. They do not change app code.

## Approve → save (agents that change records, from v80)
- Approve in Jarvis (or "approve" in the agent's Talk) writes `queue/<id>`: `{status:"approved", approvedAt: ISO, doneAt}`.
  Edit writes `{body, edited}`; Reject writes `{status:"rejected", doneAt}`; a typed or chat answer writes `{status:"answered", answer, doneAt, via}`.
- The run that saves an approved draft then writes `{status:"saved", savedAt: ISO, change_id, savedBy: RUN_ID}`, or on
  failure `{status:"failed", error, failedAt}` (leave it for him; never retry silently). It saves exactly the approved
  body (re-check with a dry run first; if the numbers moved since, write a new draft instead of saving).
- If the agent project has `saveOnApprove: true` and a linked `trigger`, the app starts one Run now about a minute after
  his last approval (batched), with REQUEST "Save the drafts he approved…". Its run-now task must be the live version
  (saves allowed only for approved drafts) and must have the connectors attached.
