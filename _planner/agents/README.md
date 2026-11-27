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
