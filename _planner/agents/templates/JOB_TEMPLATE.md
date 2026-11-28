# <Agent name> — job description

**Team:** Centre | Marketing (lead or sub-agent of `ag_marketing`) | Business
**One-line job:** <what it does, in one sentence a teacher would understand>
**Why it exists:** <what it saves him, or what goes wrong without it>

## Goal
<the single result each run must produce>

## Sources (read-only unless the stage allows otherwise)
- <connector or file>: <exactly what is read, which tool>
- Jarvis database: `projects/<id>` (`n`, `instr`, `nextAsk`), its `queue` items, <other collections>

## Rules
1. <the facts that decide the answer; where a number comes from; what overrides what>
2. His standing instructions (`instr`) override this document where they differ.
3. Never send, post, pay or change records outside a dry run unless the agent is Live and the step says so.

## Steps
1. Read … 2. Work out … 3. Check the data (list the sanity checks) … 4. Report.

## Output
- `agentruns/<RUN_ID>`: title (one line), found (plain summary), changes ("would change" lines), saved.
- `queue`: one item per question (with 2-3 short answer options) or draft (with body). No duplicates of waiting items.

## When
<schedule, or "on demand only">; ETA about <n> minutes.
